import * as React from "react";
import { cn } from "@/lib/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      type = "text",
      label,
      error,
      helperText,
      leftIcon,
      rightIcon,
      disabled,
      required,
      id,
      ...props
    },
    ref
  ) => {
    const generatedId = React.useId();
    const inputId = id ?? generatedId;

    return (
      <div className="w-full flex flex-col gap-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className="font-label-md text-label-md text-text-primary font-semibold flex items-center gap-1"
          >
            <span>{label}</span>
            {required && <span className="text-primary-container">*</span>}
          </label>
        )}

        <div className="relative flex items-center w-full">
          {leftIcon && (
            <div className="absolute left-3.5 flex items-center pointer-events-none text-text-secondary">
              {leftIcon}
            </div>
          )}

          <input
            ref={ref}
            id={inputId}
            type={type}
            disabled={disabled}
            required={required}
            className={cn(
              "w-full h-12 bg-card-surface border-[1.5px] border-border-hairline rounded-xl px-3.5 font-body-md text-body-md text-text-primary placeholder:text-text-secondary transition-colors duration-150 focus:border-text-primary focus:outline-none disabled:opacity-50 disabled:bg-surface-container-low disabled:cursor-not-allowed",
              leftIcon && "pl-11",
              rightIcon && "pr-11",
              error && "border-error focus:border-error ring-1 ring-error/20",
              className
            )}
            {...props}
          />

          {rightIcon && (
            <div className="absolute right-3.5 flex items-center text-text-secondary">
              {rightIcon}
            </div>
          )}
        </div>

        {error ? (
          <p className="font-body-sm text-body-sm text-error flex items-center gap-1 mt-0.5" role="alert">
            <span>⚠</span>
            <span>{error}</span>
          </p>
        ) : helperText ? (
          <p className="font-body-sm text-body-sm text-text-secondary mt-0.5">
            {helperText}
          </p>
        ) : null}
      </div>
    );
  }
);

Input.displayName = "Input";
