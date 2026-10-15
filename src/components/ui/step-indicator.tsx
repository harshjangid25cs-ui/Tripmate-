import * as React from "react";
import { cn } from "@/lib/utils";

export interface StepItem {
  id: string | number;
  label: string;
  description?: string;
}

export interface StepIndicatorProps {
  steps: StepItem[];
  currentStep: number; // 1-indexed (e.g. 1, 2, 3, 4)
  flowName?: string;
  className?: string;
  variant?: "segments" | "bullets";
}

export function StepIndicator({
  steps,
  currentStep,
  flowName,
  className,
  variant = "segments",
}: StepIndicatorProps) {
  const currentStepItem = steps[currentStep - 1] ?? steps[0];
  const totalSteps = steps.length;

  return (
    <div className={cn("w-full flex flex-col gap-2", className)}>
      {/* Step Header info */}
      <div className="flex items-center justify-between text-body-sm">
        <div className="flex items-center gap-1.5 font-bold">
          <span className="text-primary-container">
            Step {currentStep} of {totalSteps}
          </span>
          {currentStepItem && (
            <>
              <span className="text-border-hairline">•</span>
              <span className="text-text-primary">{currentStepItem.label}</span>
            </>
          )}
        </div>
        {flowName && (
          <span className="text-text-secondary text-body-sm hidden sm:inline">
            {flowName}
          </span>
        )}
      </div>

      {variant === "segments" ? (
        /* Segmented Track */
        <div className="grid w-full gap-1.5" style={{ gridTemplateColumns: `repeat(${totalSteps}, minmax(0, 1fr))` }}>
          {steps.map((step, idx) => {
            const stepNum = idx + 1;
            const isCompleted = stepNum < currentStep;
            const isCurrent = stepNum === currentStep;

            return (
              <div
                key={step.id}
                className={cn(
                  "h-1.5 rounded-full transition-all duration-300",
                  isCompleted && "bg-primary-container",
                  isCurrent && "bg-primary-container ring-2 ring-primary-fixed",
                  stepNum > currentStep && "bg-surface-container-high"
                )}
                title={`Step ${stepNum}: ${step.label}`}
              />
            );
          })}
        </div>
      ) : (
        /* Bullets with labels */
        <div className="flex items-center justify-between relative mt-2">
          <div className="absolute left-0 top-3.5 h-0.5 w-full bg-surface-container-high -z-0" />
          {steps.map((step, idx) => {
            const stepNum = idx + 1;
            const isCompleted = stepNum < currentStep;
            const isCurrent = stepNum === currentStep;

            return (
              <div key={step.id} className="flex flex-col items-center gap-1 z-10 bg-surface px-1">
                <div
                  className={cn(
                    "w-7 h-7 rounded-full flex items-center justify-center text-label-badge font-bold transition-all",
                    isCompleted && "bg-primary-container text-white",
                    isCurrent && "bg-primary-container text-white ring-4 ring-primary-fixed",
                    stepNum > currentStep && "bg-surface-container text-text-secondary border border-border-hairline"
                  )}
                >
                  {isCompleted ? "✓" : stepNum}
                </div>
                <span
                  className={cn(
                    "text-body-sm font-medium",
                    isCurrent ? "text-text-primary font-bold" : "text-text-secondary"
                  )}
                >
                  {step.label}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
