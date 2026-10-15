import * as React from "react";
import { cn } from "@/lib/utils";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "dark" | "danger" | "amber";
  size?: "sm" | "md" | "lg" | "icon";
  fullWidth?: boolean;
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "primary",
      size = "md",
      fullWidth = false,
      loading = false,
      leftIcon,
      rightIcon,
      disabled,
      children,
      type = "button",
      ...props
    },
    ref
  ) => {
    const baseStyles =
      "inline-flex items-center justify-center font-bold transition-all focus:outline-none disabled:opacity-50 disabled:pointer-events-none active:scale-[0.98]";

    const variantStyles = {
      primary:
        "bg-primary-container hover:bg-primary-hover text-white shadow-sm border border-transparent",
      secondary:
        "bg-surface hover:bg-white text-text-primary border border-border-hairline hover:border-text-primary shadow-sm",
      outline:
        "bg-white hover:bg-surface-container text-text-primary border border-border-hairline shadow-sm",
      ghost:
        "bg-transparent hover:bg-surface-container text-text-primary border border-transparent",
      dark:
        "bg-surface-dark hover:bg-surface-dark/90 text-white border border-transparent shadow-sm",
      danger:
        "bg-error hover:bg-error/90 text-white border border-transparent shadow-sm",
      amber:
        "bg-urgency-amber hover:bg-urgency-amber/90 text-white border border-transparent shadow-sm",
    };

    const sizeStyles = {
      sm: "h-9 px-3 rounded-lg text-label-md gap-1.5",
      md: "h-11 px-5 rounded-xl text-label-lg gap-2",
      lg: "h-14 px-6 rounded-xl text-title-md gap-2.5",
      icon: "h-11 w-11 rounded-full p-0 flex items-center justify-center",
    };

    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled || loading}
        className={cn(
          baseStyles,
          variantStyles[variant],
          sizeStyles[size],
          fullWidth && "w-full",
          className
        )}
        {...props}
      >
        {loading ? (
          <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
        ) : (
          leftIcon
        )}
        <span>{children}</span>
        {!loading && rightIcon}
      </button>
    );
  }
);

Button.displayName = "Button";
