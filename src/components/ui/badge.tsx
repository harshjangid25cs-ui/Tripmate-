import * as React from "react";
import { cn } from "@/lib/utils";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "urgency" | "brand" | "neutral" | "success" | "dark" | "outline";
  size?: "sm" | "md";
}

export function Badge({
  variant = "neutral",
  size = "md",
  className,
  children,
  ...props
}: BadgeProps) {
  const variantStyles = {
    urgency: "bg-urgency-amber text-white border-transparent",
    brand: "bg-primary-container text-white border-transparent",
    neutral: "bg-surface-container text-text-primary border-border-hairline",
    success: "bg-success-green text-white border-transparent",
    dark: "bg-surface-dark text-white border-transparent",
    outline: "bg-white text-text-primary border-border-hairline",
  };

  const sizeStyles = {
    sm: "px-2 py-0.5 text-label-badge font-bold",
    md: "px-2.5 py-1 text-label-md font-semibold",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border tracking-wide select-none shadow-sm",
        variantStyles[variant],
        sizeStyles[size],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}
