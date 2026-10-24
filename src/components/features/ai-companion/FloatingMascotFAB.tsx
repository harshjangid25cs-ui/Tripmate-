"use client";

import React, { useState, useEffect, useCallback } from "react";
import { usePathname } from "next/navigation";
import { MascotCharacter, type MascotState } from "./MascotCharacter";
import { VoiceDrawerSheet } from "./VoiceDrawerSheet";
import { useRealtimeTableSync } from "@/lib/supabase/use-realtime-sync";

export interface FloatingMascotFABProps {
  initialState?: MascotState;
  showTooltip?: boolean;
}

export function FloatingMascotFAB({
  initialState = "idle",
  showTooltip = true,
}: FloatingMascotFABProps) {
  const pathname = usePathname() || "";
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [mascotState, setMascotState] = useState<MascotState>(initialState);
  const [showSpeechBubble, setShowSpeechBubble] = useState<boolean>(showTooltip);
  const [hasTransactionUpdate, setHasTransactionUpdate] = useState<boolean>(false);
  const [isJolting, setIsJolting] = useState<boolean>(false);

  // Auto-collapse speech bubble pill after 3 seconds or on first user scroll
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowSpeechBubble(false);
    }, 3000);

    const handleScroll = () => {
      setShowSpeechBubble(false);
    };

    window.addEventListener("scroll", handleScroll, { passive: true, once: true });

    return () => {
      clearTimeout(timer);
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  // Listen for real-time table sync updates on bookings, payments, and bank inbox
  useRealtimeTableSync(["trips", "payments", "bank_messages_inbox"], {
    onEvent: useCallback(() => {
      // Trigger an active pulse / jolt to attract user attention
      setIsJolting(true);
      setHasTransactionUpdate(true);
      setMascotState("guiding");

      const timer = setTimeout(() => {
        setIsJolting(false);
        setMascotState("idle");
      }, 3000);

      return () => clearTimeout(timer);
    }, []),
  });

  // Automatically exclude on all admin routes
  if (pathname.startsWith("/admin")) {
    return null;
  }

  const handleOpenSheet = () => {
    setShowSpeechBubble(false);
    setHasTransactionUpdate(false);
    setIsOpen((prev) => !prev);
  };

  const handleDrawerClose = () => {
    setIsOpen(false);
    setMascotState("idle");
  };

  return (
    <>
      {/* Floating Action Button Container */}
      <aside
        aria-label="TripMate AI Mascot Assistant"
        className="fixed bottom-20 md:bottom-8 right-4 md:right-8 z-[100] select-none flex flex-col items-end gap-2 pointer-events-none"
      >
        {/* Micro alert / speech bubble pill on mount or hover */}
        {(showSpeechBubble || hasTransactionUpdate) && !isOpen && (
          <div
            className={`pointer-events-auto flex items-center gap-1.5 bg-[#1F1F1E] text-[#FFFFFF] text-xs font-medium px-3 py-1.5 rounded-full shadow-lg whitespace-nowrap animate-in fade-in duration-200 cursor-pointer ${
              hasTransactionUpdate ? "ring-2 ring-[#FF5E1E]" : ""
            }`}
            onClick={handleOpenSheet}
            role="status"
          >
            <span>
              {hasTransactionUpdate
                ? "Booking update received! Tap to view 🔔"
                : "बोलकर प्लान करें / Ask Matey 🎙️"}
            </span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setShowSpeechBubble(false);
                setHasTransactionUpdate(false);
              }}
              className="text-[#EBE9E4] hover:text-[#FFFFFF] ml-1 text-sm leading-none"
              title="Dismiss prompt"
              aria-label="Dismiss prompt"
            >
              ×
            </button>
          </div>
        )}

        {/* Circular Mascot FAB (64px mobile / 72px desktop) */}
        <button
          type="button"
          onClick={handleOpenSheet}
          data-testid="matey-floating-fab"
          aria-expanded={isOpen}
          aria-haspopup="dialog"
          title="TripMate AI Mascot Matey"
          className={`pointer-events-auto w-16 h-16 md:w-[72px] md:h-[72px] rounded-full bg-[#FFFFFF] border-2 border-[#1F1F1E] shadow-xl hover:scale-105 active:scale-95 transition-transform duration-200 select-none cursor-pointer flex items-center justify-center overflow-visible relative ${
            isJolting ? "animate-bounce ring-4 ring-[#FF5E1E]/50" : ""
          }`}
        >
          {/* Active notification dot if background transaction updated */}
          {hasTransactionUpdate && (
            <span
              className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#FF5E1E] border-2 border-[#FFFFFF] z-30 animate-pulse"
              title="New update"
            />
          )}

          {/* Render 3D plush mascot character */}
          <MascotCharacter
            state={isOpen ? (mascotState === "idle" ? "guiding" : mascotState) : mascotState}
            size={56}
            showSpeechBubble={false}
          />
        </button>
      </aside>

      {/* Expandable Conversation Drawer Sheet */}
      <VoiceDrawerSheet
        isOpen={isOpen}
        onClose={handleDrawerClose}
        externalMascotState={mascotState}
        onStateChange={(state) => setMascotState(state)}
      />
    </>
  );
}
