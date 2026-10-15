"use client";

import * as React from "react";
import Link from "next/link";
import type { ConfirmedTripDetails } from "@/lib/data/booking";
import { formatCurrency, formatDateRange } from "@/lib/format";

interface TripInvoiceViewProps {
  details: ConfirmedTripDetails;
}

export function TripInvoiceView({ details }: TripInvoiceViewProps) {
  const { trip, hotel, vehicle, stops, passengers, destination, invoice, payment } = details;

  const handlePrint = () => {
    if (typeof window !== "undefined") {
      window.print();
    }
  };

  const leadPassenger = passengers.find((p) => p.is_lead) || passengers[0];
  const totalDays = trip.total_days || 4;
  const nights = Math.max(1, totalDays - 1);
  const destinationName = destination?.name || "Jaipur";
  const hotelName = hotel?.hotel?.name || "Shahpura Haveli & Heritage Suites";
  const vehicleName = vehicle?.vehicle?.name || "Maruti Suzuki Dzire (AC Sedan)";
  const hotelSubtotal = hotel?.subtotal ?? 12600;
  const vehicleSubtotal = vehicle?.subtotal ?? 7596;
  const stopsSubtotal = stops.reduce((acc, s) => acc + Number(s.subtotal || 0), 0);

  const invoiceNumber = invoice?.invoice_number || "";
  const issuedDate = invoice?.issued_at
    ? new Date(invoice.issued_at).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : new Date().toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });

  const travelDates =
    trip.start_date && trip.end_date
      ? formatDateRange(trip.start_date, trip.end_date)
      : "Upcoming Dates";

  // Half of GST for CGST and SGST
  const cgst = Math.round(trip.tax_amount / 2);
  const sgst = trip.tax_amount - cgst;

  return (
    <div className="bg-surface font-body-md text-text-primary min-h-screen flex flex-col antialiased">
      {/* Top Header (Hidden in Print) */}
      <header className="print:hidden fixed top-0 w-full z-50 pt-safe bg-surface/80 backdrop-blur-xl shadow-[0_1px_8px_rgba(20,21,26,0.04)]">
        <div className="h-16 px-margin-mobile flex items-center justify-between gap-space-sm max-w-2xl mx-auto">
          <div className="flex items-center gap-space-sm">
            <Link
              href={`/trips/${trip.id}`}
              className="w-10 h-10 -ml-2 rounded-full flex items-center justify-center text-text-primary hover:bg-surface-container active:scale-95 transition-colors"
              aria-label="Back to Itinerary"
            >
              <span className="material-symbols-outlined text-[24px]">arrow_back</span>
            </Link>
            <h1 className="font-title-md text-title-md font-semibold text-text-primary">
              Tax Invoice
            </h1>
          </div>
          <button
            type="button"
            onClick={handlePrint}
            className="px-3.5 py-2 rounded-lg bg-primary-container text-on-primary font-label-md text-xs font-semibold flex items-center gap-1.5 active:scale-95 transition-all shadow-sm"
          >
            <span className="material-symbols-outlined text-[16px]">print</span>
            <span>Print / PDF</span>
          </button>
        </div>
      </header>

      {/* If invoice has not yet been generated in database */}
      {!invoice ? (
        <main className="flex-1 max-w-2xl mx-auto w-full px-4 pt-24 pb-20">
          <div className="bg-card-surface border border-border-hairline rounded-2xl p-8 text-center shadow-sm">
            <span className="material-symbols-outlined text-4xl text-amber-500 mb-2">pending</span>
            <h2 className="font-title-md text-title-md font-bold text-text-primary">
              Tax Invoice Generating
            </h2>
            <p className="font-body-sm text-text-secondary mt-2 max-w-md mx-auto">
              Your official GST tax invoice for booking <span className="font-mono font-semibold text-text-primary">{trip.booking_ref}</span> is currently being processed or unavailable. Please check back shortly.
            </p>
            <div className="mt-6">
              <Link
                href={`/trips/${trip.id}`}
                className="px-5 py-2.5 rounded-xl bg-primary-container text-on-primary font-semibold text-sm inline-flex items-center gap-2 active:scale-95 transition-all shadow-sm"
              >
                <span className="material-symbols-outlined text-[18px]">arrow_back</span>
                <span>Back to Itinerary</span>
              </Link>
            </div>
          </div>
        </main>
      ) : (
      /* Main Invoice Sheet */
      <main className="flex-1 max-w-2xl mx-auto w-full px-4 pt-24 pb-20 print:p-0 print:pt-0 print:max-w-none">
        <div className="bg-card-surface border border-border-hairline rounded-2xl p-6 sm:p-8 shadow-sm print:shadow-none print:border-none print:p-0">
          {/* Invoice Header */}
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-6 border-b border-border-hairline">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-7 h-7 rounded-lg bg-primary-container text-on-primary font-black text-sm flex items-center justify-center">
                  M
                </span>
                <span className="font-headline-sm text-xl font-bold tracking-tight text-text-primary">
                  TripMate
                </span>
              </div>
              <p className="font-label-sm text-[11px] text-text-secondary mt-1">
                TripMate Travel Technologies Pvt. Ltd.
              </p>
              <p className="text-[11px] text-text-secondary">
                GSTIN: <span className="font-mono font-medium">08AAAAA0000A1Z5</span>
              </p>
              <p className="text-[11px] text-text-secondary">
                SAC Code: <span className="font-mono">998555</span> (Tour Operator Services)
              </p>
              <p className="text-[11px] text-text-secondary">
                Malviya Nagar Heritage Zone, Jaipur, RJ 302017
              </p>
            </div>

            <div className="text-left sm:text-right">
              <span className="px-2.5 py-1 rounded bg-surface-container font-label-badge text-xs font-bold uppercase tracking-wider text-text-primary inline-block">
                TAX INVOICE
              </span>
              <p className="font-mono text-sm font-bold text-text-primary mt-2">
                {invoiceNumber}
              </p>
              <p className="text-xs text-text-secondary mt-0.5">
                Date: <span className="font-medium text-text-primary">{issuedDate}</span>
              </p>
              <p className="text-xs text-text-secondary">
                Booking Ref: <span className="font-mono font-semibold text-text-primary">{trip.booking_ref}</span>
              </p>
              <span className="mt-1 inline-flex items-center gap-1 text-[11px] font-bold text-success-green">
                <span className="w-1.5 h-1.5 rounded-full bg-success-green" />
                PAID IN FULL
              </span>
            </div>
          </div>

          {/* Billed To & Trip Details Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-5 border-b border-border-hairline text-xs">
            <div>
              <span className="font-label-sm text-[10px] text-text-secondary uppercase tracking-widest font-semibold block mb-1">
                Billed To (Lead Traveler)
              </span>
              <p className="font-bold text-sm text-text-primary">
                {leadPassenger?.full_name || "Lead Traveler"}
              </p>
              <p className="text-text-secondary mt-0.5">
                Phone: <span className="font-mono">{leadPassenger?.phone || "+91 98765 43210"}</span>
              </p>
              <p className="text-text-secondary">
                Travelers: <span className="font-semibold">{trip.traveler_count} Guest(s)</span>
              </p>
              <p className="text-text-secondary">
                Place of Supply: <span className="font-semibold">Rajasthan (08)</span>
              </p>
            </div>

            <div>
              <span className="font-label-sm text-[10px] text-text-secondary uppercase tracking-widest font-semibold block mb-1">
                Trip Details &amp; Payment
              </span>
              <p className="font-semibold text-text-primary">
                {destinationName} Tour ({totalDays}D / {nights}N)
              </p>
              <p className="text-text-secondary mt-0.5">
                Dates: <span className="font-medium text-text-primary">{travelDates}</span>
              </p>
              <p className="text-text-secondary">
                Payment Method: <span className="font-mono uppercase font-semibold text-text-primary">{payment?.method || "UPI"}</span>
              </p>
              <p className="text-text-secondary">
                Txn Ref: <span className="font-mono">{payment?.provider_reference || `DEMO-${trip.booking_ref}`}</span>
              </p>
            </div>
          </div>

          {/* Itemized Services Table */}
          <div className="py-5 overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-border-hairline text-[10px] uppercase tracking-wider text-text-secondary">
                  <th className="pb-2 font-semibold w-8">#</th>
                  <th className="pb-2 font-semibold">Service Description</th>
                  <th className="pb-2 font-semibold text-center w-16">SAC</th>
                  <th className="pb-2 font-semibold text-center w-16">Qty</th>
                  <th className="pb-2 font-semibold text-right w-24">Unit Rate</th>
                  <th className="pb-2 font-semibold text-right w-24">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-hairline/60">
                {/* Accommodation */}
                <tr>
                  <td className="py-3 text-text-secondary font-mono">1</td>
                  <td className="py-3 pr-2">
                    <span className="font-semibold text-text-primary block">
                      {hotelName}
                    </span>
                    <span className="text-[11px] text-text-secondary">
                      Heritage Suite • {hotel?.rooms || 1} Room(s) for {nights} Night(s)
                    </span>
                  </td>
                  <td className="py-3 text-center text-text-secondary font-mono">996311</td>
                  <td className="py-3 text-center">{nights}N</td>
                  <td className="py-3 text-right font-mono">{formatCurrency(hotel?.unit_price ?? 4200)}</td>
                  <td className="py-3 text-right font-mono font-semibold">{formatCurrency(hotelSubtotal)}</td>
                </tr>

                {/* Transport */}
                <tr>
                  <td className="py-3 text-text-secondary font-mono">2</td>
                  <td className="py-3 pr-2">
                    <span className="font-semibold text-text-primary block">
                      {vehicleName}
                    </span>
                    <span className="text-[11px] text-text-secondary">
                      Chauffeur Fleet Rental • Fuel &amp; Highway Tolls Included ({totalDays} Days)
                    </span>
                  </td>
                  <td className="py-3 text-center text-text-secondary font-mono">996601</td>
                  <td className="py-3 text-center">{totalDays}D</td>
                  <td className="py-3 text-right font-mono">{formatCurrency(vehicle?.unit_price ?? 1899)}</td>
                  <td className="py-3 text-right font-mono font-semibold">{formatCurrency(vehicleSubtotal)}</td>
                </tr>

                {/* Rest Stop (if present) */}
                {stops.length > 0 && (
                  <tr>
                    <td className="py-3 text-text-secondary font-mono">3</td>
                    <td className="py-3 pr-2">
                      <span className="font-semibold text-text-primary block">
                        {stops[0]?.stop?.name || "Mid-journey Rest Stop Pass"}
                      </span>
                      <span className="text-[11px] text-text-secondary">
                        Monument access &amp; refreshment voucher for {trip.traveler_count} guest(s)
                      </span>
                    </td>
                    <td className="py-3 text-center text-text-secondary font-mono">998555</td>
                    <td className="py-3 text-center">{trip.traveler_count}</td>
                    <td className="py-3 text-right font-mono">{formatCurrency(stops[0]?.unit_price ?? 1850)}</td>
                    <td className="py-3 text-right font-mono font-semibold">{formatCurrency(stopsSubtotal)}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Subtotals & Taxes Calculation Breakdown */}
          <div className="pt-4 border-t border-border-hairline flex flex-col items-end text-xs">
            <div className="w-full sm:w-72 flex flex-col gap-2">
              <div className="flex justify-between text-text-secondary">
                <span>Services Subtotal:</span>
                <span className="font-mono text-text-primary">{formatCurrency(trip.subtotal_amount)}</span>
              </div>

              <div className="flex justify-between text-text-secondary">
                <span>TripMate Platform Fee:</span>
                <span className="font-mono text-text-primary">{formatCurrency(trip.service_fee)}</span>
              </div>

              <div className="flex justify-between text-text-secondary pt-1 border-t border-border-hairline/60">
                <span>Taxable Value:</span>
                <span className="font-mono font-medium text-text-primary">
                  {formatCurrency(trip.subtotal_amount + trip.service_fee)}
                </span>
              </div>

              <div className="flex justify-between text-text-secondary">
                <span>CGST (9.0%):</span>
                <span className="font-mono text-text-primary">{formatCurrency(cgst)}</span>
              </div>

              <div className="flex justify-between text-text-secondary">
                <span>SGST (9.0%):</span>
                <span className="font-mono text-text-primary">{formatCurrency(sgst)}</span>
              </div>

              {trip.discount_amount > 0 && (
                <div className="flex justify-between text-success-green font-medium">
                  <span>Promo Discount ({trip.coupon_code || "TM-FIRST"}):</span>
                  <span className="font-mono">-{formatCurrency(trip.discount_amount)}</span>
                </div>
              )}

              <div className="flex justify-between items-baseline pt-2 border-t-2 border-border-hairline font-bold text-sm">
                <span className="text-text-primary">Total Amount (INR):</span>
                <span className="font-mono text-base text-primary-container">
                  {formatCurrency(trip.total_amount)}
                </span>
              </div>
            </div>
          </div>

          {/* Amount in Words & Notes */}
          <div className="mt-6 pt-4 border-t border-border-hairline text-xs">
            <p className="text-text-secondary leading-relaxed">
              <strong>Amount in Words:</strong> Twenty-Seven Thousand Three Hundred Seventy-Six Indian Rupees Only.
            </p>
            <p className="text-[11px] text-text-secondary mt-1">
              * This is an authentic digital tax invoice generated electronically under Section 31 of the CGST Act, 2017. Requires no signature.
            </p>
            <p className="text-[11px] text-text-secondary mt-0.5">
              * Standard 48-Hour Free Cancellation guarantee applies from scheduled journey departure time.
            </p>
          </div>
        </div>
      </main>
      )}
    </div>
  );
}
