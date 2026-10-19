import * as React from "react";
import { cn } from "@/lib/utils";

export type NavTabId = "home" | "trips" | "commercial" | "profile";

export interface BottomNavProps {
  activeTab: NavTabId;
  onChangeTab?: (tab: NavTabId) => void;
  onPrefetchTab?: (tab: NavTabId) => void;
  className?: string;
}

export function BottomNav({ activeTab, onChangeTab, onPrefetchTab, className }: BottomNavProps) {
  const tabs: Array<{ id: NavTabId; label: string; icon: string }> = [
    { id: "home", label: "Home", icon: "explore" },
    { id: "trips", label: "Recent Trips", icon: "luggage" },
    { id: "commercial", label: "Commercial", icon: "directions_bus" },
    { id: "profile", label: "Profile", icon: "person" },
  ];

  return (
    <nav
      aria-label="Bottom Navigation"
      className={cn(
        "fixed bottom-4 left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-md z-50",
        "bg-white/85 backdrop-blur-xl border border-white/50 rounded-3xl shadow-glass-light px-3 py-2",
        className
      )}
    >
      <div className="flex items-center justify-around">
        {tabs.map((tab) => {
          const isActive = tab.id === activeTab;
          return (
            <button
              key={tab.id}
              type="button"
              aria-label={tab.label}
              aria-current={isActive ? "page" : undefined}
              onClick={() => onChangeTab?.(tab.id)}
              onMouseEnter={() => onPrefetchTab?.(tab.id)}
              onTouchStart={() => onPrefetchTab?.(tab.id)}
              onFocus={() => onPrefetchTab?.(tab.id)}
              className={cn(
                "flex flex-col items-center justify-center py-1 px-3 rounded-2xl select-none transition-transform duration-100 ease-out active:scale-90 will-change-transform",
                isActive
                  ? "text-primary-container font-bold"
                  : "text-text-secondary hover:text-text-primary font-medium"
              )}
            >
              <span className="material-symbols-outlined text-[24px]">
                {tab.icon}
              </span>
              <span className="font-label-badge text-label-badge mt-0.5 tracking-tight">
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
