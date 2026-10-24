"use client";

import { useState, useRef, useCallback, useEffect } from "react";

export interface UseVoiceRecordingReturn {
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<Blob>;
  isRecording: boolean;
  audioLevel: number; // 0 to 100 for audio visualizer
  hasPermission: boolean;
  error: string | null;
}

export function useVoiceRecording(): UseVoiceRecordingReturn {
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [audioLevel, setAudioLevel] = useState<number>(0);
  const [hasPermission, setHasPermission] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const mediaStreamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Cleanup helper
  const cleanupAudio = useCallback(() => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }

    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }

    if (audioContextRef.current && audioContextRef.current.state !== "closed") {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }

    analyserRef.current = null;
    mediaRecorderRef.current = null;
    setAudioLevel(0);
  }, []);

  // Monitor audio volume in real-time for waveform visualizer
  const monitorVolume = useCallback(() => {
    if (!analyserRef.current) return;

    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
    analyserRef.current.getByteFrequencyData(dataArray);

    // Compute average frequency amplitude
    let sum = 0;
    for (let i = 0; i < dataArray.length; i++) {
      sum += dataArray[i] ?? 0;
    }
    const average = dataArray.length > 0 ? sum / dataArray.length : 0;
    // Normalize to 0-100 range
    const normalized = Math.min(100, Math.round((average / 128) * 100));

    setAudioLevel(normalized);

    animFrameRef.current = requestAnimationFrame(monitorVolume);
  }, []);

  const startRecording = useCallback(async (): Promise<void> => {
    setError(null);
    const mediaDevices = typeof navigator !== "undefined" ? navigator.mediaDevices : undefined;
    if (typeof window === "undefined" || !mediaDevices?.getUserMedia) {
      setError("Audio recording is not supported in this environment.");
      setHasPermission(false);
      return;
    }

    try {
      // 16kHz mono audio optimized for STT pipeline
      const stream = await mediaDevices.getUserMedia({
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          noiseSuppression: true,
          echoCancellation: true,
        },
      });

      mediaStreamRef.current = stream;
      setHasPermission(true);

      // Setup Web Audio API Analyser
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        const audioContext = new AudioCtx({ sampleRate: 16000 });
        const analyser = audioContext.createAnalyser();
        analyser.fftSize = 64;
        analyser.smoothingTimeConstant = 0.5;

        const source = audioContext.createMediaStreamSource(stream);
        source.connect(analyser);

        audioContextRef.current = audioContext;
        analyserRef.current = analyser;
        animFrameRef.current = requestAnimationFrame(monitorVolume);
      }

      // Initialize MediaRecorder
      let mimeType = "audio/webm;codecs=opus";
      if (typeof MediaRecorder !== "undefined" && !MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = MediaRecorder.isTypeSupported("audio/mp4")
          ? "audio/mp4"
          : MediaRecorder.isTypeSupported("audio/ogg")
          ? "audio/ogg"
          : "";
      }

      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      audioChunksRef.current = [];

      recorder.ondataavailable = (event: BlobEvent) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current = recorder;
      recorder.start(100);
      setIsRecording(true);
    } catch (err: unknown) {
      console.warn("[useVoiceRecording] Microphone access failed or denied:", err);
      setHasPermission(false);
      setIsRecording(false);
      setError("Microphone permission denied or device unavailable.");
      cleanupAudio();
    }
  }, [cleanupAudio, monitorVolume]);

  const stopRecording = useCallback((): Promise<Blob> => {
    return new Promise((resolve) => {
      const recorder = mediaRecorderRef.current;

      if (!recorder || recorder.state === "inactive") {
        cleanupAudio();
        setIsRecording(false);
        // Fallback empty audio blob
        resolve(new Blob([], { type: "audio/webm" }));
        return;
      }

      recorder.onstop = () => {
        const mimeType = recorder.mimeType || "audio/webm";
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        cleanupAudio();
        setIsRecording(false);
        resolve(audioBlob);
      };

      try {
        recorder.stop();
      } catch {
        cleanupAudio();
        setIsRecording(false);
        resolve(new Blob([], { type: "audio/webm" }));
      }
    });
  }, [cleanupAudio]);

  // Clean up on component unmount
  useEffect(() => {
    return () => {
      cleanupAudio();
    };
  }, [cleanupAudio]);

  return {
    startRecording,
    stopRecording,
    isRecording,
    audioLevel,
    hasPermission,
    error,
  };
}
