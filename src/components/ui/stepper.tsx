import * as React from "react";
import { cn } from "@/lib/utils";

export interface StepperProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  label?: string;
  className?: string;
  disabled?: boolean;
}

export function Stepper({
  value,
  onChange,
  min = 1,
  max = 100,
  step = 1,
  label,
  className,
  disabled = false,
}: StepperProps) {
  const canDecrement = value > min && !disabled;
  const canIncrement = value < max && !disabled;

  const handleDecrement = () => {
    if (canDecrement) {
      onChange(Math.max(min, value - step));
    }
  };

  const handleIncrement = () => {
    if (canIncrement) {
      onChange(Math.min(max, value + step));
    }
  };

  return (
    <div className={cn("flex items-center justify-between gap-3", className)}>
      {label && (
        <span className="font-label-md text-label-md text-text-primary font-semibold">
          {label}
        </span>
      )}

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={handleDecrement}
          disabled={!canDecrement}
          aria-label="Decrease quantity"
          className="w-9 h-9 rounded-xl bg-card-surface border border-border-hairline text-text-primary font-bold text-lg flex items-center justify-center transition-all hover:bg-surface-container disabled:opacity-40 disabled:cursor-not-allowed active:scale-95 shadow-sm"
        >
          −
        </button>

        <span className="w-10 text-center font-bold text-headline-sm text-text-primary tabular-nums">
          {value}
        </span>

        <button
          type="button"
          onClick={handleIncrement}
          disabled={!canIncrement}
          aria-label="Increase quantity"
          className="w-9 h-9 rounded-xl bg-card-surface border border-border-hairline text-text-primary font-bold text-lg flex items-center justify-center transition-all hover:bg-surface-container disabled:opacity-40 disabled:cursor-not-allowed active:scale-95 shadow-sm"
        >
          +
        </button>
      </div>
    </div>
  );
}
