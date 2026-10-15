import * as React from "react";
import { cn } from "@/lib/utils";
import { StatusChip } from "./status-chip";

export interface TicketPassenger {
  id: string;
  name?: string;
  seatNumber: string;
  phone?: string;
  role?: string; // e.g. "EXEC", "TEAM"
  ticketCode?: string; // e.g. "TM-COMM-8910-A"
  isIssued: boolean;
}

export interface TicketTableProps {
  passengers: TicketPassenger[];
  totalSeats?: number;
  onViewTicket?: (passenger: TicketPassenger) => void;
  onCopyLink?: (passenger: TicketPassenger) => void;
  onAssignPassenger?: (passenger: TicketPassenger) => void;
  className?: string;
}

export function TicketTable({
  passengers,
  totalSeats,
  onViewTicket,
  onCopyLink,
  onAssignPassenger,
  className,
}: TicketTableProps) {
  const issuedCount = passengers.filter((p) => p.isIssued).length;
  const total = totalSeats ?? passengers.length;

  return (
    <div
      className={cn(
        "w-full bg-card-surface border border-border-hairline rounded-2xl p-space-md shadow-sm flex flex-col gap-space-sm",
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between pb-1 border-b border-border-hairline">
        <div>
          <h3 className="font-headline-sm text-headline-sm text-text-primary">
            Passenger Tickets
          </h3>
          <p className="font-body-sm text-body-sm text-text-secondary">
            Boarding passes & QR check-in codes
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-label-badge text-label-badge px-2 py-0.5 rounded-full bg-surface-container-high text-text-secondary font-bold">
            {issuedCount} OF {total} ISSUED
          </span>
        </div>
      </div>

      {/* Passenger List */}
      <div className="flex flex-col gap-2 pt-1">
        {passengers.map((p) => (
          <div
            key={p.id}
            className="p-3 rounded-xl bg-surface-container-low border border-border-hairline/60 flex items-center justify-between gap-3 transition-colors hover:bg-surface-container"
          >
            {/* Info */}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="font-title-md text-title-md text-text-primary truncate">
                  {p.name || "Unassigned Passenger"}
                </span>
                {p.role && (
                  <span className="font-label-badge text-label-badge px-1.5 py-0.5 rounded bg-urgency-amber-bg text-urgency-amber font-bold">
                    {p.role}
                  </span>
                )}
                <StatusChip
                  status={p.isIssued ? "issued" : "pending_assignment"}
                  size="sm"
                  showDot={false}
                />
              </div>
              <div className="flex items-center gap-2 mt-0.5 text-body-sm text-text-secondary font-mono">
                <span className="font-semibold text-text-primary">Seat {p.seatNumber}</span>
                {p.phone && <span>• {p.phone}</span>}
                {p.ticketCode && <span>• Ref: {p.ticketCode}</span>}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1.5 shrink-0">
              {p.isIssued ? (
                <>
                  {onViewTicket && (
                    <button
                      type="button"
                      onClick={() => onViewTicket(p)}
                      className="h-8 px-2.5 rounded-lg bg-card-surface border border-border-hairline text-text-primary font-label-md text-label-md flex items-center gap-1 shadow-sm hover:border-text-primary transition-all active:scale-95"
                    >
                      <span className="text-primary-container text-[14px]">🎫</span>
                      <span>Ticket</span>
                    </button>
                  )}
                  {onCopyLink && (
                    <button
                      type="button"
                      onClick={() => onCopyLink(p)}
                      title="Copy Public Ticket Link"
                      className="h-8 w-8 rounded-lg bg-card-surface border border-border-hairline text-text-secondary flex items-center justify-center shadow-sm hover:text-text-primary transition-all active:scale-95"
                    >
                      📋
                    </button>
                  )}
                </>
              ) : (
                onAssignPassenger && (
                  <button
                    type="button"
                    onClick={() => onAssignPassenger(p)}
                    className="h-8 px-3 rounded-lg bg-primary-container text-white font-label-md text-label-md flex items-center gap-1 shadow-sm hover:bg-primary-hover transition-all active:scale-95"
                  >
                    + Assign
                  </button>
                )
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
