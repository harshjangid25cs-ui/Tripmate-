"use client";

import * as React from "react";
import Image from "next/image";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

interface PwaInstallContextType {
  isStandalone: boolean;
  canInstall: boolean;
  isIos: boolean;
  triggerInstall: () => Promise<void>;
  showIosModal: boolean;
  setShowIosModal: (show: boolean) => void;
}

const PwaInstallContext = React.createContext<PwaInstallContextType | null>(null);

export function usePwaInstall(): PwaInstallContextType {
  const context = React.useContext(PwaInstallContext);
  if (!context) {
    return {
      isStandalone: false,
      canInstall: false,
      isIos: false,
      triggerInstall: async () => {},
      showIosModal: false,
      setShowIosModal: () => {},
    };
  }
  return context;
}

export function PwaInstallManager({ children }: { children?: React.ReactNode }) {
  const [deferredPrompt, setDeferredPrompt] = React.useState<BeforeInstallPromptEvent | null>(null);
  const [isStandalone, setIsStandalone] = React.useState(false);
  const [isIos, setIsIos] = React.useState(false);
  const [showIosModal, setShowIosModal] = React.useState(false);
  const [mounted, setMounted] = React.useState(false);

  // 1. Safe Service Worker Registration
  React.useEffect(() => {
    if (typeof window === "undefined") return;

    if ("serviceWorker" in navigator) {
      const registerSw = () => {
        navigator.serviceWorker
          .register("/sw.js", { scope: "/" })
          .then((reg) => {
            if (process.env.NODE_ENV !== "production") {
              console.log("[TripMate PWA] Service Worker registered:", reg.scope);
            }
          })
          .catch((err) => {
            console.warn("[TripMate PWA] Service Worker registration failed:", err);
          });
      };

      if (document.readyState === "complete") {
        registerSw();
      } else {
        window.addEventListener("load", registerSw);
        return () => window.removeEventListener("load", registerSw);
      }
    }
  }, []);

  // 2. Install Prompt & Standalone Mode Detection
  React.useEffect(() => {
    if (typeof window === "undefined") return;

    setMounted(true);

    const ua = window.navigator.userAgent.toLowerCase();
    const isIosDevice =
      /iphone|ipad|ipod/.test(ua) && !(window as unknown as { MSStream?: unknown }).MSStream;
    setIsIos(isIosDevice);

    const checkStandalone = () => {
      const isDisplayStandalone = window.matchMedia("(display-mode: standalone)").matches;
      const isNavigatorStandalone =
        (window.navigator as unknown as { standalone?: boolean }).standalone === true;
      setIsStandalone(Boolean(isDisplayStandalone || isNavigatorStandalone));
    };

    checkStandalone();

    const mediaQuery = window.matchMedia("(display-mode: standalone)");
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener("change", checkStandalone);
    } else {
      mediaQuery.addListener(checkStandalone);
    }

    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setDeferredPrompt(null);
      setIsStandalone(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstall);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
      window.removeEventListener("appinstalled", handleAppInstalled);
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener("change", checkStandalone);
      } else {
        mediaQuery.removeListener(checkStandalone);
      }
    };
  }, []);

  const triggerInstall = React.useCallback(async () => {
    if (deferredPrompt) {
      try {
        await deferredPrompt.prompt();
        const choice = await deferredPrompt.userChoice;
        if (choice.outcome === "accepted") {
          setDeferredPrompt(null);
        }
      } catch (err) {
        console.warn("[TripMate PWA] Install prompt error:", err);
      }
      return;
    }

    if (isIos) {
      setShowIosModal(true);
      return;
    }

    // Fallback: On Chromium/Android where prompt hasn't fired yet or desktop browser
    setShowIosModal(true);
  }, [deferredPrompt, isIos]);

  const canInstall = mounted && !isStandalone;

  const value = React.useMemo<PwaInstallContextType>(
    () => ({
      isStandalone,
      canInstall,
      isIos,
      triggerInstall,
      showIosModal,
      setShowIosModal,
    }),
    [isStandalone, canInstall, isIos, triggerInstall, showIosModal]
  );

  return (
    <PwaInstallContext.Provider value={value}>
      {children}

      {/* iOS & Browser "Add to Home Screen" Instruction Modal */}
      {showIosModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="pwa-install-modal-title"
          className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4 bg-[#1F1F1E]/60 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setShowIosModal(false)}
        >
          <div
            className="w-full max-w-sm rounded-3xl bg-[#FFFFFF] border border-[#EBE9E4] p-6 shadow-2xl text-[#1F1F1E] animate-in fade-in duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-[#EBE9E4]">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-[#FF5E1E] flex items-center justify-center text-[#FFFFFF] shadow-sm overflow-hidden shrink-0">
                  <Image
                    src="/icons/icon-192x192.png"
                    alt="TripMate Icon"
                    width={44}
                    height={44}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div>
                  <h3 id="pwa-install-modal-title" className="text-base font-extrabold tracking-tight text-[#1F1F1E]">
                    Install TripMate
                  </h3>
                  <p className="text-xs text-[#1F1F1E]/70 font-medium">
                    Native Fullscreen App Experience
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowIosModal(false)}
                aria-label="Close"
                className="w-8 h-8 rounded-full flex items-center justify-center text-[#1F1F1E]/60 hover:text-[#1F1F1E] hover:bg-[#EBE9E4] transition-colors"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            {/* Step-by-Step Instructions */}
            <div className="py-4 space-y-3.5 text-xs">
              <p className="text-xs font-semibold text-[#1F1F1E] bg-[#FBF9F5] p-3 rounded-2xl border border-[#EBE9E4]">
                Tap Share (↑) at the bottom of Safari, then tap &apos;Add to Home Screen ➕&apos; to install TripMate.
              </p>

              <div className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-[#1F1F1E] text-[#FFFFFF] flex items-center justify-center text-[11px] font-bold shrink-0 mt-0.5">
                  1
                </span>
                <p className="text-text-secondary leading-snug">
                  Tap the <strong className="text-[#1F1F1E]">Share icon</strong>{" "}
                  <span className="material-symbols-outlined align-middle text-[16px] text-[#FF5E1E]">
                    ios_share
                  </span>{" "}
                  in the Safari toolbar at the bottom of your screen.
                </p>
              </div>

              <div className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-[#1F1F1E] text-[#FFFFFF] flex items-center justify-center text-[11px] font-bold shrink-0 mt-0.5">
                  2
                </span>
                <p className="text-text-secondary leading-snug">
                  Scroll down and tap{" "}
                  <strong className="text-[#1F1F1E]">Add to Home Screen ➕</strong>.
                </p>
              </div>

              <div className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-[#1F1F1E] text-[#FFFFFF] flex items-center justify-center text-[11px] font-bold shrink-0 mt-0.5">
                  3
                </span>
                <p className="text-text-secondary leading-snug">
                  Tap <strong className="text-[#1F1F1E]">Add</strong> in the top-right corner to place TripMate directly on your home screen.
                </p>
              </div>
            </div>

            {/* Action Button */}
            <button
              type="button"
              onClick={() => setShowIosModal(false)}
              className="w-full py-3 rounded-full bg-[#FF5E1E] text-[#FFFFFF] text-xs font-bold shadow-sm hover:opacity-95 active:scale-98 transition-transform text-center"
            >
              Got it, thanks!
            </button>
          </div>
        </div>
      )}
    </PwaInstallContext.Provider>
  );
}

/**
 * 1-Tap "Download App" button for Headers, Navbars & Profile screens
 */
export function PwaInstallButton({ className = "" }: { className?: string }) {
  const { canInstall, isStandalone, triggerInstall } = usePwaInstall();

  // Automatically hide when running in standalone mode or on server render before hydration
  if (isStandalone || !canInstall) {
    return null;
  }

  return (
    <button
      type="button"
      onClick={triggerInstall}
      aria-label="Install TripMate App"
      className={`bg-[#1F1F1E] text-[#FFFFFF] hover:bg-[#FF5E1E] text-xs font-semibold px-3 py-1.5 rounded-full border border-[#1F1F1E] transition-colors flex items-center gap-1.5 shrink-0 select-none cursor-pointer ${className}`}
    >
      <span>📲</span>
      <span>Install App</span>
    </button>
  );
}
