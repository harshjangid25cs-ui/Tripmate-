"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import { MascotAvatar, MascotState } from "./MascotAvatar";
import { useVoiceRecording } from "@/lib/hooks/use-voice-recording";
import type { EvonAction } from "@/lib/ai/evon-router";

export interface MessageItem {
  id: string;
  sender: "user" | "assistant";
  text: string;
  action?: EvonAction;
  timestamp: number;
}

interface VoiceAssistantSheetProps {
  isOpen: boolean;
  onClose: () => void;
}

export function VoiceAssistantSheet({ isOpen, onClose }: VoiceAssistantSheetProps) {
  const router = useRouter();
  const pathname = usePathname() || "";

  const [mascotState, setMascotState] = useState<MascotState>("idle");
  const [preferredLang, setPreferredLang] = useState<"Hinglish" | "EN">("Hinglish");
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [textInput, setTextInput] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  const [messages, setMessages] = useState<MessageItem[]>([
    {
      id: "initial-matey",
      sender: "assistant",
      text: "Namaste! Main Matey hoon, aapka TripMate voice companion. Bolkar cab, hotel ya circuit plan karein!",
      action: {
        type: "NAVIGATE_OR_FILTER",
        targetUrl: "/destinations/jaipur",
        label: "Explore Jaipur Circuit",
      },
      timestamp: Date.now(),
    },
  ]);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);

  const {
    startRecording,
    stopRecording,
    isRecording,
    audioLevel,
    hasPermission,
    error: recordingError,
  } = useVoiceRecording();

  // Scroll message canvas to bottom when new messages appear
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isProcessing]);

  // Sync mascot state with recording state
  useEffect(() => {
    if (isRecording) {
      setMascotState("listening");
    } else if (isProcessing) {
      setMascotState("thinking");
    }
  }, [isRecording, isProcessing]);

  // Stop playing audio helper
  const stopCurrentAudio = useCallback(() => {
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current.currentTime = 0;
      currentAudioRef.current = null;
    }
  }, []);

  // Clean up audio playback when component unmounts or sheet closes
  useEffect(() => {
    if (!isOpen) {
      stopCurrentAudio();
      setMascotState("idle");
    }
  }, [isOpen, stopCurrentAudio]);

  // Process user voice or text input through /api/ai/voice pipeline
  const processQuery = useCallback(
    async (audioBlob?: Blob, fallbackText?: string) => {
      stopCurrentAudio();
      setIsProcessing(true);
      setMascotState("thinking");

      try {
        const formData = new FormData();
        if (audioBlob && audioBlob.size > 0) {
          formData.append("audio", audioBlob, "user_recording.webm");
        }
        if (fallbackText) {
          formData.append("text", fallbackText);
        }

        formData.append("currentPath", pathname);
        formData.append("language", preferredLang === "Hinglish" ? "code-mixed" : "en-IN");

        const res = await fetch("/api/ai/voice", {
          method: "POST",
          body: formData,
        });

        if (!res.ok) {
          throw new Error(`API returned status ${res.status}`);
        }

        const data = await res.json();

        // Append user voice message
        const userMsg: MessageItem = {
          id: `user-${Date.now()}`,
          sender: "user",
          text: data.transcript || fallbackText || "🎙️ Voice message",
          timestamp: Date.now(),
        };

        // Append assistant response message
        const assistantMsg: MessageItem = {
          id: `matey-${Date.now() + 1}`,
          sender: "assistant",
          text: data.replyText,
          action: data.action,
          timestamp: Date.now() + 1,
        };

        setMessages((prev) => [...prev, userMsg, assistantMsg]);

        // Audio playback
        if (data.audioBase64 && !isMuted) {
          setMascotState("speaking");
          const audio = new Audio(`data:audio/wav;base64,${data.audioBase64}`);
          currentAudioRef.current = audio;

          audio.onended = () => {
            setMascotState("idle");
            currentAudioRef.current = null;
          };

          audio.onerror = () => {
            setMascotState("idle");
            currentAudioRef.current = null;
          };

          try {
            await audio.play();
          } catch (audioErr) {
            console.warn("[VoiceAssistant] Autoplay prevented:", audioErr);
            setMascotState("idle");
          }
        } else {
          setMascotState("idle");
        }
      } catch (err) {
        console.error("[VoiceAssistant] Processing error:", err);
        setMessages((prev) => [
          ...prev,
          {
            id: `error-${Date.now()}`,
            sender: "assistant",
            text: "Maaf kijiye, main abhi connect nahi kar paya. Kripya dobara koshish karein.",
            timestamp: Date.now(),
          },
        ]);
        setMascotState("idle");
      } finally {
        setIsProcessing(false);
      }
    },
    [pathname, preferredLang, isMuted, stopCurrentAudio]
  );

  // Toggle microphone recording
  const handleMicClick = async () => {
    if (isRecording) {
      const audioBlob = await stopRecording();
      await processQuery(audioBlob);
    } else {
      stopCurrentAudio();
      await startRecording();
    }
  };

  // Quick prompt chip click
  const handleQuickPrompt = async (promptText: string) => {
    if (isRecording) {
      await stopRecording();
    }
    await processQuery(undefined, promptText);
  };

  // Handle text input submission
  const handleTextSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!textInput.trim() || isProcessing) return;
    const prompt = textInput.trim();
    setTextInput("");
    await processQuery(undefined, prompt);
  };

  // 1-Click Action Card navigation
  const handleActionClick = (action: EvonAction) => {
    stopCurrentAudio();
    if (action.targetUrl) {
      router.push(action.targetUrl);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Mobile Backdrop */}
      <div
        className="fixed inset-0 bg-[#1F1F1E]/40 z-40 md:hidden backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Floating Dialog (Desktop) / Bottom-Sheet (Mobile) */}
      <div
        className="fixed z-50 bg-[#FFFFFF] border-2 border-[#1F1F1E] flex flex-col overflow-hidden shadow-2xl transition-all duration-300
          inset-x-0 bottom-0 max-h-[85vh] rounded-t-2xl
          md:inset-auto md:bottom-24 md:right-6 md:w-[400px] md:h-[560px] md:rounded-2xl"
        role="dialog"
        aria-modal="true"
        aria-label="TripMate Voice Assistant Matey"
      >
        {/* Header Bar */}
        <div className="shrink-0 px-4 py-3 border-b border-[#EBE9E4] bg-[#FBF9F5] flex items-center justify-between select-none">
          {/* Left: Mascot thumbnail & Status */}
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full bg-[#FFFFFF] border border-[#1F1F1E] flex items-center justify-center p-0.5 shadow-sm">
              <MascotAvatar state={mascotState} size="sm" showRings={false} />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-sm text-[#1F1F1E]">Matey</span>
                <span className="text-[10px] bg-[#FF5E1E] text-white px-1.5 py-0.2 rounded-full font-medium">
                  TripMate AI
                </span>
              </div>
              <div className="flex items-center gap-1 text-[11px] text-[#5A5956]">
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    mascotState === "listening"
                      ? "bg-[#FF5E1E] animate-ping"
                      : mascotState === "speaking"
                      ? "bg-[#2563EB] animate-pulse"
                      : "bg-[#16A34A]"
                  }`}
                />
                <span>
                  {mascotState === "listening"
                    ? "Listening in Hindi / English..."
                    : mascotState === "thinking"
                    ? "Matey is thinking..."
                    : mascotState === "speaking"
                    ? "Matey speaking..."
                    : "Listening in Hindi / English"}
                </span>
              </div>
            </div>
          </div>

          {/* Right: Controls (Language, Mute, Close) */}
          <div className="flex items-center gap-1.5">
            {/* Language Switcher */}
            <button
              type="button"
              onClick={() => setPreferredLang((prev) => (prev === "Hinglish" ? "EN" : "Hinglish"))}
              className="text-xs font-medium px-2 py-1 rounded-md border border-[#EBE9E4] bg-[#FFFFFF] text-[#1F1F1E] hover:bg-[#FBF9F5] transition-colors"
              title="Toggle preferred response language"
            >
              {preferredLang === "Hinglish" ? "Hinglish" : "EN"}
            </button>

            {/* Audio Mute Toggle */}
            <button
              type="button"
              onClick={() => setIsMuted((prev) => !prev)}
              className="w-8 h-8 rounded-md flex items-center justify-center border border-[#EBE9E4] bg-[#FFFFFF] text-[#1F1F1E] hover:bg-[#FBF9F5] transition-colors"
              title={isMuted ? "Unmute Voice" : "Mute Voice"}
              aria-label={isMuted ? "Unmute Voice" : "Mute Voice"}
            >
              <span className="material-symbols-outlined text-[18px]">
                {isMuted ? "volume_off" : "volume_up"}
              </span>
            </button>

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-md flex items-center justify-center border border-[#EBE9E4] bg-[#FFFFFF] text-[#1F1F1E] hover:bg-[#FBF9F5] transition-colors"
              title="Close Assistant"
              aria-label="Close Assistant"
            >
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>
          </div>
        </div>

        {/* Message & Conversation Canvas */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 overscroll-contain bg-[#FFFFFF]">
          {messages.map((msg) => (
            <div key={msg.id} className="flex flex-col space-y-1.5">
              {msg.sender === "user" ? (
                // User Voice Transcript Bubble
                <div className="bg-[#1F1F1E] text-[#FFFFFF] ml-auto rounded-2xl rounded-tr-sm px-4 py-2.5 max-w-[85%] text-sm shadow-sm">
                  <p className="leading-relaxed">{msg.text}</p>
                </div>
              ) : (
                // Assistant Bubble
                <div className="mr-auto max-w-[92%] space-y-2">
                  <div className="bg-[#FBF9F5] border border-[#EBE9E4] text-[#1F1F1E] rounded-2xl rounded-tl-sm px-4 py-3 text-sm shadow-sm leading-relaxed">
                    <p>{msg.text}</p>
                  </div>

                  {/* Interactive Action Card */}
                  {msg.action && (
                    <div className="bg-[#FFFFFF] border-2 border-[#1F1F1E] rounded-xl p-3 shadow-md flex items-center justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-semibold text-[#1F1F1E] truncate">
                          {msg.action.metadata?.title || msg.action.label}
                        </div>
                        {msg.action.metadata?.price && (
                          <div className="text-xs text-[#FF5E1E] font-medium">
                            ₹{msg.action.metadata.price.toLocaleString("en-IN")}
                          </div>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => handleActionClick(msg.action!)}
                        className="shrink-0 bg-[#FF5E1E] hover:bg-[#E04D12] text-white text-xs font-semibold px-3 py-1.5 rounded-lg active:scale-95 transition-all shadow-sm flex items-center gap-1 cursor-pointer"
                      >
                        <span>{msg.action.label}</span>
                        <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}

          {/* Thinking / Processing indicator */}
          {isProcessing && (
            <div className="bg-[#FBF9F5] border border-[#EBE9E4] text-[#1F1F1E] rounded-2xl rounded-tl-sm px-4 py-2.5 mr-auto text-xs flex items-center gap-2 text-[#5A5956]">
              <span className="w-2 h-2 rounded-full bg-[#FF5E1E] animate-bounce" />
              <span className="w-2 h-2 rounded-full bg-[#1F1F1E] animate-bounce" style={{ animationDelay: "150ms" }} />
              <span className="w-2 h-2 rounded-full bg-[#FF5E1E] animate-bounce" style={{ animationDelay: "300ms" }} />
              <span>Thinking & checking real-time availability...</span>
            </div>
          )}

          {/* Mic permission warning */}
          {!hasPermission && (
            <div className="bg-[#FEF2F2] border border-[#F87171] text-[#991B1B] rounded-xl p-2.5 text-xs">
              <p className="font-medium">Microphone access denied.</p>
              <p className="text-[11px] text-[#B91C1C]">
                {recordingError || "Please allow microphone permissions in browser settings or use text prompts below."}
              </p>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Bottom Voice Control Bar */}
        <div className="shrink-0 p-3.5 border-t border-[#EBE9E4] bg-[#FFFFFF] flex flex-col items-center gap-2.5 select-none">
          {/* Quick Prompt Chips */}
          <div className="w-full flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs">
            <button
              type="button"
              onClick={() => handleQuickPrompt("3-day Jaipur circuit")}
              className="shrink-0 bg-[#FBF9F5] hover:bg-[#EBE9E4] border border-[#EBE9E4] text-[#1F1F1E] rounded-full px-2.5 py-1 text-[11px] transition-colors"
            >
              3-day Jaipur circuit
            </button>
            <button
              type="button"
              onClick={() => handleQuickPrompt("Check my booking TM-492011")}
              className="shrink-0 bg-[#FBF9F5] hover:bg-[#EBE9E4] border border-[#EBE9E4] text-[#1F1F1E] rounded-full px-2.5 py-1 text-[11px] transition-colors"
            >
              Check my booking TM-492011
            </button>
            <button
              type="button"
              onClick={() => handleQuickPrompt("Affordable cab to Pushkar")}
              className="shrink-0 bg-[#FBF9F5] hover:bg-[#EBE9E4] border border-[#EBE9E4] text-[#1F1F1E] rounded-full px-2.5 py-1 text-[11px] transition-colors"
            >
              Affordable cab to Pushkar
            </button>
          </div>

          {/* Realtime dynamic SVG Audio Frequency Visualizer (5 active vertical bars) */}
          <div className="h-6 flex items-center justify-center gap-1" aria-hidden="true">
            {[0.6, 1.2, 0.9, 1.4, 0.7].map((factor, idx) => {
              const baseHeight = 4;
              const dynamicHeight = isRecording
                ? Math.max(4, Math.min(24, Math.round((audioLevel / 100) * 22 * factor)))
                : baseHeight;
              return (
                <div
                  key={idx}
                  className="w-1.5 rounded-full transition-all duration-75 bg-[#FF5E1E]"
                  style={{ height: `${dynamicHeight}px` }}
                />
              );
            })}
          </div>

          {/* Centered Large 64px Push to Talk or Toggle Mic Button */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleMicClick}
              disabled={isProcessing}
              data-testid="matey-mic-button"
              className={`w-16 h-16 rounded-full flex items-center justify-center shadow-lg transition-transform active:scale-95 cursor-pointer ${
                isRecording
                  ? "bg-[#1F1F1E] text-white ring-4 ring-[#FF5E1E]/50"
                  : "bg-[#FF5E1E] text-white hover:bg-[#E04D12]"
              }`}
              title={isRecording ? "Stop listening" : "Tap to speak with Matey"}
              aria-label={isRecording ? "Stop listening" : "Tap to speak with Matey"}
            >
              <span className="material-symbols-outlined text-[32px]">
                {isRecording ? "stop" : "mic"}
              </span>
            </button>
          </div>

          <div className="text-[11px] text-[#5A5956] font-medium">
            {isRecording ? "Listening... Tap to stop" : "Tap microphone to speak"}
          </div>

          {/* Optional Quick Text Input */}
          <form onSubmit={handleTextSubmit} className="w-full flex items-center gap-1.5 mt-1">
            <input
              type="text"
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              placeholder="Or type a question (e.g. Innova cab price)..."
              disabled={isProcessing}
              className="flex-1 bg-[#FBF9F5] border border-[#EBE9E4] rounded-lg px-3 py-1.5 text-xs text-[#1F1F1E] focus:outline-none focus:border-[#1F1F1E]"
            />
            <button
              type="submit"
              disabled={!textInput.trim() || isProcessing}
              className="w-8 h-8 rounded-lg bg-[#1F1F1E] text-white flex items-center justify-center hover:bg-[#333332] disabled:opacity-40 transition-colors"
              title="Send text query"
              aria-label="Send text query"
            >
              <span className="material-symbols-outlined text-[16px]">send</span>
            </button>
          </form>
        </div>
      </div>
    </>
  );
}
