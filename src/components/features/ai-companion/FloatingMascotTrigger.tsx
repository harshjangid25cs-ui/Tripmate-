"use client";

import React, { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { MascotAvatar } from "./MascotAvatar";
import { VoiceAssistantSheet } from "./VoiceAssistantSheet";

export function FloatingMascotTrigger() {
  const pathname = usePathname() || "";
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [showSpeechBubble, setShowSpeechBubble] = useState<boolean>(true);

  // Auto-collapse speech bubble pill after 2.5 seconds or on first scroll
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowSpeechBubble(false);
    }, 2500);

    const handleScroll = () => {
      setShowSpeechBubble(false);
    };

    window.addEventListener("scroll", handleScroll, { passive: true, once: true });

    return () => {
      clearTimeout(timer);
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  // Automatically exclude on admin routes
  if (pathname.startsWith("/admin")) {
    return null;
  }

  const handleOpenSheet = () => {
    setShowSpeechBubble(false);
    setIsOpen((prev) => !prev);
  };

  return (
    <>
      {/* Floating Action Button Container */}
      <aside
        aria-label="TripMate Voice AI Companion"
        className="fixed bottom-20 md:bottom-6 right-4 md:right-6 z-40 select-none flex flex-col items-end gap-2 pointer-events-none"
      >
        {/* Dismissible / Auto-collapsing Speech Bubble Pill */}
        {showSpeechBubble && !isOpen && (
          <div
            className="pointer-events-auto flex items-center gap-1.5 bg-[#1F1F1E] text-[#FFFFFF] text-xs font-medium px-3 py-1.5 rounded-full shadow-md whitespace-nowrap animate-in fade-in duration-200 cursor-pointer"
            onClick={handleOpenSheet}
            role="status"
          >
            <span>बोलकर प्लान करें / Ask Matey 🎙️</span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setShowSpeechBubble(false);
              }}
              className="text-[#EBE9E4] hover:text-[#FFFFFF] ml-1 text-sm leading-none"
              title="Dismiss prompt"
              aria-label="Dismiss prompt"
            >
              ×
            </button>
          </div>
        )}

        {/* Circular Mascot FAB */}
        <button
          type="button"
          onClick={handleOpenSheet}
          data-testid="matey-floating-trigger"
          aria-expanded={isOpen}
          aria-haspopup="dialog"
          title="TripMate Voice AI Companion Matey"
          className="pointer-events-auto w-16 h-16 rounded-full bg-[#FFFFFF] border-2 border-[#1F1F1E] shadow-lg flex items-center justify-center hover:scale-105 active:scale-95 transition-transform duration-200 cursor-pointer overflow-hidden p-1 relative"
        >
          <MascotAvatar state={isOpen ? "speaking" : "idle"} size={52} />
        </button>
      </aside>

      {/* Voice Assistant Dialog / Sheet */}
      <VoiceAssistantSheet isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
}
