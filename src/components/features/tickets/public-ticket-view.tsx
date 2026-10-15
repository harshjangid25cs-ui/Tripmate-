"use client";

import * as React from "react";
import Link from "next/link";
import { formatDateRange } from "@/lib/format";
import type { PublicTicketResult } from "@/lib/data/commercial-types";

interface PublicTicketViewProps {
  ticket: PublicTicketResult | null;
  ticketCode: string;
}

export function PublicTicketView({ ticket, ticketCode }: PublicTicketViewProps) {
  const [copied, setCopied] = React.useState(false);

  if (!ticket) {
    return (
      <div className="bg-surface font-body-md text-text-primary min-h-screen flex flex-col items-center justify-center p-6 text-center antialiased">
        <div className="w-16 h-16 rounded-full bg-surface-container flex items-center justify-center text-text-secondary mb-4 border border-border-hairline">
          <span className="material-symbols-outlined text-[32px]">confirmation_number</span>
        </div>
        <h1 className="font-headline-sm text-xl font-bold text-text-primary">
          Ticket Not Found
        </h1>
        <p className="font-body-md text-xs text-text-secondary mt-1.5 max-w-xs leading-relaxed">
          The requested pass code <code className="font-mono text-primary font-bold">{ticketCode}</code> could not be found or has expired.
        </p>
        <Link
          href="/home"
          className="mt-6 px-6 py-2.5 rounded-xl bg-primary-container text-on-primary font-label-md text-xs font-bold uppercase tracking-wider shadow-sm hover:bg-primary transition-colors"
        >
          Return to Tripmate
        </Link>
      </div>
    );
  }

  const handleCopy = () => {
    if (typeof window !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const datesFormatted =
    ticket.start_date && ticket.end_date
      ? formatDateRange(ticket.start_date, ticket.end_date)
      : "Upcoming Trip";

  const departureTime = ticket.booking_time
    ? ticket.booking_time.slice(0, 5) + " IST"
    : "07:30 AM IST";

  return (
    <div className="bg-surface font-body-md text-text-primary min-h-screen flex flex-col items-center justify-center p-4 sm:p-6 antialiased">
      {/* Ticket Pass Card */}
      <article className="w-full max-w-sm bg-card-surface rounded-2xl shadow-xl border border-border-hairline overflow-hidden flex flex-col">
        {/* Top Header Strip */}
        <div className="p-5 pb-4 border-b border-border-hairline bg-surface-container-low flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-primary-container flex items-center justify-center text-on-primary font-bold text-xs shadow-sm">
              M
            </div>
            <div>
              <span className="font-title-md text-xs font-bold text-text-primary tracking-tight block">
                Tripmate Enterprise
              </span>
              <span className="font-body-sm text-[10px] text-text-secondary">
                {ticket.company_name}
              </span>
            </div>
          </div>

          <span className="font-label-badge text-[9px] px-2 py-0.5 rounded-full bg-success-green/15 text-success-green font-bold uppercase tracking-wider">
            Verified Pass
          </span>
        </div>

        {/* Boarding Pass Hero */}
        <div className="p-6 flex flex-col items-center text-center">
          {/* Passenger Name & Seat */}
          <div className="flex flex-col items-center gap-1 mb-4">
            <div className="w-14 h-14 rounded-2xl bg-primary-container text-on-primary font-headline-md text-xl font-extrabold flex items-center justify-center shadow-md">
              {ticket.seat_label}
            </div>
            <span className="font-label-badge text-[10px] uppercase tracking-wider text-text-secondary mt-1 font-bold">
              Seat Assignment
            </span>
            <h2 className="font-headline-sm text-lg font-extrabold text-text-primary mt-0.5">
              {ticket.passenger_name}
            </h2>
            {ticket.designation && (
              <span className="font-body-sm text-xs text-text-secondary">
                {ticket.designation}
              </span>
            )}
          </div>

          {/* Large Scannable QR Code SVG */}
          <div className="w-44 h-44 bg-surface-container-low rounded-2xl p-4 flex flex-col items-center justify-center mb-4 border border-border-hairline shadow-inner">
            <svg
              className="w-36 h-36 text-text-primary"
              fill="currentColor"
              viewBox="0 0 100 100"
              aria-label="Ticket QR code"
            >
              <path d="M10 10h30v30H10zM15 15v20h20V15zM20 20h10v10H20zM60 10h30v30H60zM65 15v20h20V15zM70 20h10v10H70zM10 60h30v30H10zM15 65v20h20V65zM20 70h10v10H20zM60 60h10v10H60zM75 60h15v10H75zM60 75h15v15H60zM80 80h10v10H80z" />
            </svg>
          </div>

          {/* Ticket Code */}
          <div className="font-mono text-xs font-bold text-text-secondary bg-surface-container-low px-3 py-1 rounded-full border border-border-hairline mb-5">
            {ticket.ticket_code}
          </div>

          {/* Trip Details Grid */}
          <div className="w-full grid grid-cols-2 gap-3 text-left p-3.5 rounded-xl bg-surface-container-low border border-border-hairline text-xs">
            <div>
              <span className="font-label-badge text-[9px] uppercase text-text-secondary block">
                Route
              </span>
              <span className="font-bold text-text-primary block truncate">
                {ticket.from_location} ↔ {ticket.to_location}
              </span>
            </div>

            <div>
              <span className="font-label-badge text-[9px] uppercase text-text-secondary block">
                Dates
              </span>
              <span className="font-bold text-text-primary block truncate">
                {datesFormatted}
              </span>
            </div>

            <div>
              <span className="font-label-badge text-[9px] uppercase text-text-secondary block">
                Reporting
              </span>
              <span className="font-bold text-text-primary block truncate">
                {departureTime}
              </span>
            </div>

            <div>
              <span className="font-label-badge text-[9px] uppercase text-text-secondary block">
                Fleet Coach
              </span>
              <span className="font-bold text-text-primary block truncate">
                {ticket.vehicle_name}
              </span>
            </div>
          </div>
        </div>

        {/* Card Footer Actions */}
        <div className="p-4 bg-surface-container-low border-t border-border-hairline flex items-center justify-between gap-2">
          <div className="text-[10px] text-text-secondary">
            Ref: <span className="font-mono font-bold text-text-primary">{ticket.booking_ref}</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopy}
              className="px-3 py-1.5 rounded-lg bg-card-surface hover:bg-surface text-text-primary border border-border-hairline text-xs font-semibold flex items-center gap-1 active:scale-95 transition-all"
            >
              <span className="material-symbols-outlined text-[14px]">
                {copied ? "check" : "content_copy"}
              </span>
              <span>{copied ? "Copied" : "Share"}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                if (typeof window !== "undefined") window.print();
              }}
              className="p-1.5 rounded-lg bg-card-surface hover:bg-surface text-text-secondary border border-border-hairline active:scale-95 transition-all"
              title="Print Pass"
            >
              <span className="material-symbols-outlined text-[16px]">print</span>
            </button>
          </div>
        </div>
      </article>

      {/* Security Privacy Notice */}
      <p className="mt-4 text-center text-[10px] text-text-secondary max-w-xs">
        Authorized employee boarding pass. Present QR code to coach marshal upon boarding.
      </p>
    </div>
  );
}
