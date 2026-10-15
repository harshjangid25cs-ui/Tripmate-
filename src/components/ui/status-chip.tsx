import * as React from "react";
import { cn } from "@/lib/utils";

export type StatusType =
  // Trip statuses
  | "draft"
  | "confirmed"
  | "in_progress"
  | "completed"
  | "cancelled"
  // Commercial approval statuses
  | "pending_approval"
  | "approved"
  | "rejected"
  // Payment statuses
  | "pending"
  | "successful"
  | "failed"
  | "refunded"
  // Passenger / Ticket statuses
  | "issued"
  | "pending_assignment"
  // Scarcity & marketing badges
  | "scarce"
  | "popular"
  | "verified";

interface StatusConfig {
  label: string;
  bgClass: string;
  textClass: string;
  borderClass: string;
  dotClass?: string;
}

const statusColorMap: Record<StatusType, StatusConfig> = {
  // Trips
  draft: {
    label: "Draft",
    bgClass: "bg-surface-container",
    textClass: "text-text-secondary",
    borderClass: "border-border-hairline",
    dotClass: "bg-text-secondary",
  },
  confirmed: {
    label: "Confirmed",
    bgClass: "bg-success-green-bg",
    textClass: "text-success-green",
    borderClass: "border-success-green/20",
    dotClass: "bg-success-green",
  },
  in_progress: {
    label: "Ongoing",
    bgClass: "bg-primary-fixed",
    textClass: "text-primary-container",
    borderClass: "border-primary-container/20",
    dotClass: "bg-primary-container",
  },
  completed: {
    label: "Completed",
    bgClass: "bg-secondary-container",
    textClass: "text-secondary",
    borderClass: "border-secondary/20",
    dotClass: "bg-secondary",
  },
  cancelled: {
    label: "Cancelled",
    bgClass: "bg-error-container",
    textClass: "text-error",
    borderClass: "border-error/20",
    dotClass: "bg-error",
  },

  // Commercial Approval
  pending_approval: {
    label: "Pending Approval",
    bgClass: "bg-urgency-amber-bg",
    textClass: "text-urgency-amber",
    borderClass: "border-urgency-amber/20",
    dotClass: "bg-urgency-amber",
  },
  approved: {
    label: "Approved",
    bgClass: "bg-success-green-bg",
    textClass: "text-success-green",
    borderClass: "border-success-green/20",
    dotClass: "bg-success-green",
  },
  rejected: {
    label: "Rejected",
    bgClass: "bg-error-container",
    textClass: "text-error",
    borderClass: "border-error/20",
    dotClass: "bg-error",
  },

  // Payments
  pending: {
    label: "Payment Pending",
    bgClass: "bg-urgency-amber-bg",
    textClass: "text-urgency-amber",
    borderClass: "border-urgency-amber/20",
    dotClass: "bg-urgency-amber",
  },
  successful: {
    label: "Paid",
    bgClass: "bg-success-green-bg",
    textClass: "text-success-green",
    borderClass: "border-success-green/20",
    dotClass: "bg-success-green",
  },
  failed: {
    label: "Payment Failed",
    bgClass: "bg-error-container",
    textClass: "text-error",
    borderClass: "border-error/20",
    dotClass: "bg-error",
  },
  refunded: {
    label: "Refunded",
    bgClass: "bg-secondary-container",
    textClass: "text-secondary",
    borderClass: "border-secondary/20",
    dotClass: "bg-secondary",
  },

  // Ticket Allocation
  issued: {
    label: "Ticket Issued",
    bgClass: "bg-success-green-bg",
    textClass: "text-success-green",
    borderClass: "border-success-green/20",
    dotClass: "bg-success-green",
  },
  pending_assignment: {
    label: "Pending Details",
    bgClass: "bg-urgency-amber-bg",
    textClass: "text-urgency-amber",
    borderClass: "border-urgency-amber/20",
    dotClass: "bg-urgency-amber",
  },

  // Urgency & Badges
  scarce: {
    label: "High Demand",
    bgClass: "bg-urgency-amber",
    textClass: "text-white",
    borderClass: "border-transparent",
  },
  popular: {
    label: "Trending",
    bgClass: "bg-primary-container",
    textClass: "text-white",
    borderClass: "border-transparent",
  },
  verified: {
    label: "100% Verified",
    bgClass: "bg-surface-dark",
    textClass: "text-white",
    borderClass: "border-transparent",
  },
};

export interface StatusChipProps extends React.HTMLAttributes<HTMLSpanElement> {
  status: StatusType;
  customLabel?: string;
  showDot?: boolean;
  size?: "sm" | "md";
}

export function StatusChip({
  status,
  customLabel,
  showDot = true,
  size = "md",
  className,
  ...props
}: StatusChipProps) {
  const config = statusColorMap[status] ?? statusColorMap.draft;
  const label = customLabel ?? config.label;

  const sizeClasses = {
    sm: "px-2 py-0.5 text-body-sm font-medium gap-1",
    md: "px-2.5 py-1 text-label-md font-semibold gap-1.5",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border tracking-wide select-none",
        config.bgClass,
        config.textClass,
        config.borderClass,
        sizeClasses[size],
        className
      )}
      {...props}
    >
      {showDot && config.dotClass && (
        <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", config.dotClass)} />
      )}
      <span>{label}</span>
    </span>
  );
}
