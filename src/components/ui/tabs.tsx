import * as React from "react";
import { cn } from "@/lib/utils";

export interface TabItem {
  id: string;
  label: string;
  count?: number;
  icon?: React.ReactNode;
}

export interface TabsProps {
  items: TabItem[];
  activeId: string;
  onChange: (id: string) => void;
  variant?: "chips" | "segmented";
  className?: string;
}

export function Tabs({
  items,
  activeId,
  onChange,
  variant = "chips",
  className,
}: TabsProps) {
  if (variant === "segmented") {
    return (
      <div
        className={cn(
          "flex items-center p-1 bg-surface-container-low rounded-xl border border-border-hairline gap-1",
          className
        )}
      >
        {items.map((item) => {
          const isActive = item.id === activeId;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onChange(item.id)}
              className={cn(
                "flex-1 h-9 px-3 rounded-lg text-label-md font-semibold flex items-center justify-center gap-1.5 transition-all select-none",
                isActive
                  ? "bg-card-surface text-text-primary shadow-sm border border-border-hairline"
                  : "text-text-secondary hover:text-text-primary"
              )}
            >
              {item.icon}
              <span>{item.label}</span>
              {item.count !== undefined && (
                <span
                  className={cn(
                    "text-label-badge px-1.5 py-0.2 rounded-full",
                    isActive ? "bg-surface-container text-text-primary" : "bg-surface-container-high text-text-secondary"
                  )}
                >
                  {item.count}
                </span>
              )}
            </button>
          );
        })}
      </div>
    );
  }

  // Chips style (Filter Chips / Day Switcher per DESIGN.md §6)
  return (
    <div className={cn("flex items-center gap-2 overflow-x-auto scrollbar-none py-1", className)}>
      {items.map((item) => {
        const isActive = item.id === activeId;
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onChange(item.id)}
            className={cn(
              "h-9 px-4 rounded-full text-label-md font-semibold flex items-center gap-1.5 whitespace-nowrap transition-all select-none border",
              isActive
                ? "bg-text-primary text-white border-text-primary shadow-sm"
                : "bg-card-surface text-text-primary border-border-hairline hover:bg-surface-container"
            )}
          >
            {item.icon}
            <span>{item.label}</span>
            {item.count !== undefined && (
              <span
                className={cn(
                  "text-label-badge px-1.5 py-0.2 rounded-full",
                  isActive ? "bg-white/20 text-white" : "bg-surface-container text-text-secondary"
                )}
              >
                {item.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
