"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import { MascotCharacter, type MascotState } from "./MascotCharacter";
import { useVoiceRecording } from "@/lib/hooks/use-voice-recording";
import type { EvonAction } from "@/lib/ai/evon-router";
import {
  createInitialSessionState,
  type VoiceBookingSessionState,
} from "@/lib/ai/travel-agent-state";

export interface MessageItem {
  id: string;
  sender: "user" | "assistant";
  text: string;
  action?: EvonAction;
  timestamp: number;
}

export interface VoiceDrawerSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onStateChange?: (state: MascotState) => void;
  externalMascotState?: MascotState;
}

export function VoiceDrawerSheet({
  isOpen,
  onClose,
  onStateChange,
  externalMascotState,
}: VoiceDrawerSheetProps) {
  const router = useRouter();
  const pathname = usePathname() || "";

  const [mascotState, setInternalMascotState] = useState<MascotState>("idle");
  const [preferredLang, setPreferredLang] = useState<"Hinglish" | "EN">("Hinglish");
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [continuousCallMode, setContinuousCallMode] = useState<boolean>(false);
  const [textInput, setTextInput] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [sessionState, setSessionState] = useState<VoiceBookingSessionState>(
    createInitialSessionState()
  );

  // Sync external state if provided
  useEffect(() => {
    if (externalMascotState) {
      setInternalMascotState(externalMascotState);
    }
  }, [externalMascotState]);

  const updateMascotState = useCallback(
    (newState: MascotState) => {
      setInternalMascotState(newState);
      onStateChange?.(newState);
    },
    [onStateChange]
  );

  const [messages, setMessages] = useState<MessageItem[]>([
    {
      id: "initial-matey",
      sender: "assistant",
      text: "Namaste! Main Matey hoon, aapka TripMate travel agent. Bataiye, agli chhuttiyon mein kahan chalna hai aur kitne din ka plan hai?",
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

  // Sync mascot state with recording & processing states
  useEffect(() => {
    if (isRecording) {
      updateMascotState("listening");
    } else if (isProcessing) {
      updateMascotState("guiding");
    }
  }, [isRecording, isProcessing, updateMascotState]);

  // Helper to stop any current audio playback
  const stopCurrentAudio = useCallback(() => {
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current.currentTime = 0;
      currentAudioRef.current = null;
    }
  }, []);

  // Clean up audio playback when drawer closes or unmounts
  useEffect(() => {
    if (!isOpen) {
      stopCurrentAudio();
      updateMascotState("idle");
    }
  }, [isOpen, stopCurrentAudio, updateMascotState]);

  // Trigger temporary success state for 2 seconds
  const triggerSuccessState = useCallback(() => {
    updateMascotState("success");
    const timer = setTimeout(() => {
      updateMascotState("idle");
    }, 2000);
    return () => clearTimeout(timer);
  }, [updateMascotState]);

  // Process user voice or text input through /api/ai/voice pipeline
  const processQuery = useCallback(
    async (audioBlob?: Blob, fallbackText?: string) => {
      stopCurrentAudio();
      setIsProcessing(true);
      updateMascotState("guiding");

      try {
        const formData = new FormData();
        if (audioBlob && audioBlob.size > 0) {
          formData.append("audio", audioBlob, "user_recording.webm");
        }
        if (fallbackText) {
          formData.append("textOverride", fallbackText);
        }

        formData.append("currentPath", pathname);
        formData.append("language", preferredLang === "Hinglish" ? "code-mixed" : "en-IN");
        formData.append("sessionState", JSON.stringify(sessionState));

        const res = await fetch("/api/ai/voice", {
          method: "POST",
          body: formData,
        });

        if (!res.ok) {
          throw new Error(`API returned status ${res.status}`);
        }

        const data = await res.json();

        // Update session state
        if (data.updatedSessionState) {
          setSessionState(data.updatedSessionState);
        }

        // Live Background UI Sync / Navigation
        if (data.uiAction?.targetUrl) {
          if (data.uiAction.autoNavigate) {
            router.push(data.uiAction.targetUrl);
          } else {
            router.refresh();
          }
        }

        // Append user message
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

        // Trigger reaction
        if (data.mascotState === "success") {
          triggerSuccessState();
        }

        // Audio playback
        if (data.audioBase64 && !isMuted) {
          updateMascotState(data.mascotState === "success" ? "success" : "guiding");
          const audio = new Audio(`data:audio/wav;base64,${data.audioBase64}`);
          currentAudioRef.current = audio;

          audio.onended = () => {
            currentAudioRef.current = null;
            if (continuousCallMode) {
              // Soft transition back into listening for continuous agent call mode
              setTimeout(async () => {
                try {
                  updateMascotState("listening");
                  await startRecording();
                } catch {
                  updateMascotState("idle");
                }
              }, 400);
            } else {
              updateMascotState("idle");
            }
          };

          audio.onerror = () => {
            updateMascotState("idle");
            currentAudioRef.current = null;
          };

          try {
            await audio.play();
          } catch (audioErr) {
            console.warn("[VoiceDrawer] Autoplay prevented:", audioErr);
            updateMascotState("idle");
          }
        }
      } catch (err) {
        console.error("[VoiceDrawer] Processing error:", err);
        setMessages((prev) => [
          ...prev,
          {
            id: `error-${Date.now()}`,
            sender: "assistant",
            text: "Maaf kijiye, main abhi connect nahi kar paya. Kripya dobara koshish karein.",
            timestamp: Date.now(),
          },
        ]);
        updateMascotState("idle");
      } finally {
        setIsProcessing(false);
      }
    },
    [
      pathname,
      preferredLang,
      sessionState,
      isMuted,
      continuousCallMode,
      router,
      startRecording,
      stopCurrentAudio,
      triggerSuccessState,
      updateMascotState,
    ]
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

  // Quick prompt chip or context card click
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
    triggerSuccessState();
    if (action.targetUrl) {
      router.push(action.targetUrl);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Mobile Backdrop */}
      <div
        className="fixed inset-0 bg-[#1F1F1E]/40 z-[115] md:hidden backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Sliding Bottom Sheet (Mobile) & Floating Dialog (Desktop) */}
      <div
        className="fixed z-[120] bg-[#FFFFFF] border-t-2 md:border-2 border-[#1F1F1E] flex flex-col overflow-hidden shadow-2xl transition-transform duration-300
          inset-x-0 bottom-0 h-[560px] rounded-t-3xl
          md:inset-auto md:bottom-24 md:right-6 md:w-[420px] md:h-[600px] md:rounded-2xl"
        role="dialog"
        aria-modal="true"
        aria-label="TripMate AI Companion Matey"
        data-testid="voice-drawer-sheet"
      >
        {/* Mobile Pull Handle */}
        <div className="w-10 h-1 bg-[#EBE9E4] rounded-full mx-auto my-2 md:hidden shrink-0" />

        {/* Header Bar */}
        <div className="shrink-0 px-4 py-2.5 border-b border-[#EBE9E4] bg-[#FBF9F5] flex items-center justify-between select-none">
          {/* Left: Mascot thumbnail & Status Tag */}
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full bg-[#FFFFFF] border border-[#1F1F1E] flex items-center justify-center p-0.5 shadow-sm overflow-visible">
              <MascotCharacter
                state={mascotState}
                size={34}
                showRings={false}
                showSpeechBubble={false}
              />
            </div>
            <div>
              <div className="font-bold text-sm text-[#1F1F1E]">
                <span>Your TripMate</span> <span className="text-xs font-normal text-[#5A5956]">• Matey</span>
              </div>
              <div className="flex items-center gap-1.5 text-[11px] text-[#5A5956]">
                <span className="w-2 h-2 rounded-full bg-[#16A34A] inline-block" />
                <span className="font-medium text-[#16A34A]">Live Agent</span>
                <span>•</span>
                <span>{continuousCallMode ? "Call Active" : "Online"}</span>
              </div>
            </div>
          </div>

          {/* Right: Controls (Continuous Mode, Language, Audio, Close) */}
          <div className="flex items-center gap-1.5">
            {/* Continuous Agent Call Mode Toggle */}
            <button
              type="button"
              onClick={() => setContinuousCallMode((prev) => !prev)}
              className={`text-xs font-semibold px-2 py-1 rounded-md border transition-colors flex items-center gap-1 ${
                continuousCallMode
                  ? "bg-[#1F1F1E] text-white border-[#1F1F1E]"
                  : "bg-[#FFFFFF] text-[#1F1F1E] border-[#EBE9E4] hover:bg-[#FBF9F5]"
              }`}
              title="Continuous call mode: automatically listens when Matey finishes speaking"
            >
              <span>📞</span>
              <span className="hidden sm:inline">Call</span>
            </button>

            <button
              type="button"
              onClick={() => setPreferredLang((prev) => (prev === "Hinglish" ? "EN" : "Hinglish"))}
              className="text-xs font-semibold px-2 py-1 rounded-md border border-[#EBE9E4] bg-[#FFFFFF] text-[#1F1F1E] hover:bg-[#FBF9F5] transition-colors"
              title="Toggle language"
            >
              {preferredLang === "Hinglish" ? "Hinglish" : "EN"}
            </button>

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

            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-md flex items-center justify-center border border-[#EBE9E4] bg-[#FFFFFF] text-[#1F1F1E] hover:bg-[#FBF9F5] transition-colors text-lg font-bold"
              title="Close drawer"
              aria-label="Close drawer"
            >
              ×
            </button>
          </div>
        </div>

        {/* Live Trip Draft Receipt Card */}
        <div
          data-testid="live-trip-receipt-card"
          className="shrink-0 bg-[#FBF9F5] border-b border-[#EBE9E4] px-4 py-2.5 flex flex-col gap-1.5 select-none"
        >
          <div className="flex items-center justify-between text-[11px] font-bold text-[#1F1F1E]">
            <span className="flex items-center gap-1">
              <span>📋</span>
              <span>Live Trip Draft</span>
            </span>
            <span className="text-[#FF5E1E] font-bold">
              {sessionState.totalEstimatedPrice
                ? `₹${sessionState.totalEstimatedPrice.toLocaleString("en-IN")}`
                : "Estimating ₹..."}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-1.5 text-[11px]">
            {/* Destination Slot */}
            <div
              className={`px-2 py-1 rounded border transition-colors flex items-center gap-1.5 ${
                sessionState.destinationName
                  ? "bg-[#FFFFFF] border-[#1F1F1E] text-[#1F1F1E] font-medium"
                  : "bg-[#FFFFFF] border-[#EBE9E4] text-[#6B7280]"
              }`}
            >
              <span>📍</span>
              <span className="truncate">{sessionState.destinationName || "Destination"}</span>
            </div>

            {/* Days & Travelers Slot */}
            <div
              className={`px-2 py-1 rounded border transition-colors flex items-center gap-1.5 ${
                sessionState.durationDays
                  ? "bg-[#FFFFFF] border-[#1F1F1E] text-[#1F1F1E] font-medium"
                  : "bg-[#FFFFFF] border-[#EBE9E4] text-[#6B7280]"
              }`}
            >
              <span>📅</span>
              <span className="truncate">
                {sessionState.durationDays ? `${sessionState.durationDays} Days` : "Days"} •{" "}
                {sessionState.travelerCount ? `${sessionState.travelerCount} Pax` : "Pax"}
              </span>
            </div>

            {/* Hotel Slot */}
            <div
              className={`px-2 py-1 rounded border transition-colors flex items-center gap-1.5 ${
                sessionState.selectedHotelName
                  ? "bg-[#FFFFFF] border-[#1F1F1E] text-[#1F1F1E] font-medium"
                  : "bg-[#FFFFFF] border-[#EBE9E4] text-[#6B7280]"
              }`}
            >
              <span>🏨</span>
              <span className="truncate">{sessionState.selectedHotelName || "Hotel"}</span>
            </div>

            {/* Vehicle Slot */}
            <div
              className={`px-2 py-1 rounded border transition-colors flex items-center gap-1.5 ${
                sessionState.selectedVehicleName
                  ? "bg-[#FFFFFF] border-[#1F1F1E] text-[#1F1F1E] font-medium"
                  : "bg-[#FFFFFF] border-[#EBE9E4] text-[#6B7280]"
              }`}
            >
              <span>🚗</span>
              <span className="truncate">{sessionState.selectedVehicleName || "Cab"}</span>
            </div>
          </div>

          {/* Checkout CTA banner if trip is ready */}
          {sessionState.currentStage === "ready_for_checkout" && sessionState.tripId && (
            <button
              type="button"
              onClick={() => router.push(`/book/${sessionState.tripId}/checkout`)}
              className="w-full bg-[#FF5E1E] hover:bg-[#E04D12] text-white text-xs font-bold py-1.5 px-3 rounded-lg shadow-sm active:scale-95 transition-all flex items-center justify-center gap-1 mt-0.5 cursor-pointer"
            >
              <span>Proceed to Checkout (₹{sessionState.totalEstimatedPrice?.toLocaleString("en-IN")})</span>
              <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
            </button>
          )}
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
                        <div className="text-xs font-bold text-[#1F1F1E] truncate">
                          {msg.action.metadata?.title || msg.action.label}
                        </div>
                        {msg.action.metadata?.price && (
                          <div className="text-xs text-[#FF5E1E] font-bold">
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

          {/* Quick Context Card */}
          <div
            onClick={() => handleQuickPrompt("Explore Jaipur 3 days itinerary with Innova cab")}
            className="bg-[#FFFFFF] border border-[#EBE9E4] rounded-xl p-3 shadow-sm hover:border-[#1F1F1E] transition-colors cursor-pointer flex items-center gap-3 select-none"
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                handleQuickPrompt("Explore Jaipur 3 days itinerary with Innova cab");
              }
            }}
          >
            <div className="w-12 h-12 rounded-lg bg-[#FAF9F7] border border-[#EBE9E4] overflow-hidden shrink-0 flex items-center justify-center">
              <span className="material-symbols-outlined text-[#1F1F1E] text-2xl">fort</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-bold text-xs text-[#1F1F1E] truncate">
                Want to explore Jaipur?
              </div>
              <div className="text-[11px] text-[#6B7280] line-clamp-1">
                I can find places, estimate costs or build its itinerary.
              </div>
            </div>
            <span className="material-symbols-outlined text-[#1F1F1E] text-lg shrink-0">
              chevron_right
            </span>
          </div>

          {/* Actionable Shortcut Chips */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar text-xs select-none">
            <button
              type="button"
              onClick={() => handleQuickPrompt("Hum 4 log Jaipur 3 din ke liye jana chahte hain")}
              className="shrink-0 bg-[#FBF9F5] hover:bg-[#EBE9E4] border border-[#EBE9E4] text-[#1F1F1E] font-medium rounded-full px-3 py-1.5 text-xs transition-colors flex items-center gap-1.5"
            >
              <span>📍</span>
              <span>4 log Jaipur 3 din</span>
            </button>
            <button
              type="button"
              onClick={() => handleQuickPrompt("Shahpura Haveli aur Innova lock kar do")}
              className="shrink-0 bg-[#FBF9F5] hover:bg-[#EBE9E4] border border-[#EBE9E4] text-[#1F1F1E] font-medium rounded-full px-3 py-1.5 text-xs transition-colors flex items-center gap-1.5"
            >
              <span>🏨</span>
              <span>Shahpura Haveli + Innova</span>
            </button>
            <button
              type="button"
              onClick={() => handleQuickPrompt("Payment pe le chalo checkout kar do")}
              className="shrink-0 bg-[#FBF9F5] hover:bg-[#EBE9E4] border border-[#EBE9E4] text-[#1F1F1E] font-medium rounded-full px-3 py-1.5 text-xs transition-colors flex items-center gap-1.5"
            >
              <span>💳</span>
              <span>Checkout now</span>
            </button>
          </div>

          {/* Thinking / Guiding indicator */}
          {isProcessing && (
            <div className="bg-[#FBF9F5] border border-[#EBE9E4] text-[#1F1F1E] rounded-2xl rounded-tl-sm px-4 py-2.5 mr-auto text-xs flex items-center gap-2 text-[#5A5956]">
              <span className="w-2 h-2 rounded-full bg-[#FF5E1E] animate-bounce" />
              <span className="w-2 h-2 rounded-full bg-[#1F1F1E] animate-bounce" style={{ animationDelay: "150ms" }} />
              <span className="w-2 h-2 rounded-full bg-[#FF5E1E] animate-bounce" style={{ animationDelay: "300ms" }} />
              <span>Matey is checking real-time travel recommendations...</span>
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

        {/* Bottom Control & Input Bar */}
        <div className="shrink-0 p-3 border-t border-[#EBE9E4] bg-[#FFFFFF] flex flex-col gap-2 select-none">
          {/* Dynamic Audio Frequency Visualizer (5 bars) when recording */}
          {isRecording && (
            <div className="h-5 flex items-center justify-center gap-1" aria-hidden="true">
              {[0.6, 1.2, 0.9, 1.4, 0.7].map((factor, idx) => {
                const baseHeight = 4;
                const dynamicHeight = Math.max(
                  baseHeight,
                  Math.min(20, Math.round((audioLevel / 100) * 18 * factor))
                );
                return (
                  <div
                    key={idx}
                    className="w-1.5 rounded-full transition-all duration-75 bg-[#FF5E1E]"
                    style={{ height: `${dynamicHeight}px` }}
                  />
                );
              })}
            </div>
          )}

          {/* Text and Voice Entry Bar */}
          <form onSubmit={handleTextSubmit} className="flex items-center gap-2">
            {/* Microphone Toggle Button */}
            <button
              type="button"
              onClick={handleMicClick}
              disabled={isProcessing}
              data-testid="matey-mic-toggle"
              className={`w-9 h-9 rounded-full flex items-center justify-center transition-transform active:scale-95 shrink-0 ${
                isRecording
                  ? "bg-[#1F1F1E] text-white ring-2 ring-[#FF5E1E]"
                  : "bg-[#FBF9F5] border border-[#EBE9E4] text-[#1F1F1E] hover:bg-[#EBE9E4]"
              }`}
              title={isRecording ? "Stop recording" : "Speak to Matey"}
              aria-label={isRecording ? "Stop recording" : "Speak to Matey"}
            >
              <span className="material-symbols-outlined text-[20px]">
                {isRecording ? "stop" : "mic"}
              </span>
            </button>

            {/* Pill Text Input */}
            <div className="flex-1 bg-[#FBF9F5] border border-[#EBE9E4] rounded-full px-3.5 py-1.5 flex items-center gap-2 focus-within:border-[#1F1F1E] transition-colors">
              <input
                type="text"
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                placeholder="Ask anything about your trip..."
                disabled={isProcessing}
                className="flex-1 bg-transparent text-xs text-[#1F1F1E] focus:outline-none placeholder:text-[#6B7280]"
              />
            </div>

            {/* Red / Orange Circular Submit Button */}
            <button
              type="submit"
              disabled={!textInput.trim() || isProcessing}
              data-testid="matey-send-button"
              className="w-9 h-9 rounded-full bg-[#FF5E1E] hover:bg-[#E04D12] text-white flex items-center justify-center disabled:opacity-40 active:scale-95 transition-all shadow-sm shrink-0 cursor-pointer"
              title="Send message"
              aria-label="Send message"
            >
              <span className="material-symbols-outlined text-[18px]">send</span>
            </button>
          </form>
        </div>
      </div>
    </>
  );
}
