import React from "react";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Cancellation & Refund Policy - TripMate India",
  description: "Official cancellation terms, 48-hour 100% refund policy, calculation schedules, and turnaround times.",
};

export default function RefundPolicyPage() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 antialiased">
      <header className="border-b border-slate-200 bg-white">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/home" className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
            <span className="w-7 h-7 rounded-lg bg-slate-900 text-white flex items-center justify-center text-xs font-bold">TM</span>
            <span>TripMate</span>
          </Link>
          <Link href="/login" className="text-xs font-bold text-slate-600 hover:text-slate-900">
            Back to Sign In
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-10 space-y-8">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">Fair &amp; Transparent</span>
          <h1 className="text-3xl font-black text-slate-900 mt-1">Cancellation &amp; Refund Policy</h1>
          <p className="text-xs text-slate-500 mt-1">Directly Enforced by Database Smart Rules (§7, §8) • Last Updated: October 16, 2026</p>
        </div>

        <section className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-5 text-xs leading-relaxed">
          <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-4">
            <h3 className="font-bold text-emerald-900 text-sm">48-Hour Full Refund Guarantee</h3>
            <p className="text-emerald-800 mt-1 leading-relaxed">
              Any booking cancelled <strong>48 hours or more</strong> prior to the designated trip start date is entitled to a <strong>100% full refund</strong> of the total booking value, credited directly to the original payment source.
            </p>
          </div>

          <h2 className="text-sm font-bold text-slate-900">1. Tiered Cancellation Schedule</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border border-slate-200 rounded-xl overflow-hidden">
              <thead className="bg-slate-100 text-slate-700 font-bold">
                <tr>
                  <th className="p-3 border-b border-slate-200">Cancellation Window</th>
                  <th className="p-3 border-b border-slate-200">Refund Percentage</th>
                  <th className="p-3 border-b border-slate-200">Deduction / Terms</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                <tr>
                  <td className="p-3 font-semibold">≥ 48 Hours before departure</td>
                  <td className="p-3 text-emerald-700 font-bold">100% Refund</td>
                  <td className="p-3 text-slate-500">Zero cancellation fee</td>
                </tr>
                <tr>
                  <td className="p-3 font-semibold">24 to 48 Hours before departure</td>
                  <td className="p-3 text-amber-700 font-bold">50% Refund</td>
                  <td className="p-3 text-slate-500">50% fleet lock-in retention</td>
                </tr>
                <tr>
                  <td className="p-3 font-semibold">&lt; 24 Hours before departure</td>
                  <td className="p-3 text-rose-700 font-bold">No Refund (0%)</td>
                  <td className="p-3 text-slate-500">Non-refundable due to driver &amp; hotel lock</td>
                </tr>
              </tbody>
            </table>
          </div>

          <h2 className="text-sm font-bold text-slate-900">2. Processing Time &amp; Method</h2>
          <p>
            Once a cancellation request is submitted through your TripMate account, the refund is initiated automatically by our database triggers. Funds are credited back to your original source (UPI, Credit/Debit Card, or NetBanking account) within <strong>5 to 7 banking days</strong> through Razorpay.
          </p>

          <h2 className="text-sm font-bold text-slate-900">3. Operator Initiated Cancellations</h2>
          <p>
            In the rare event that TripMate or an approved carrier cancels a circuit due to unforeseen security or mechanical disruptions, the customer will receive an immediate 100% full refund or alternative circuit rebooking at no additional fee.
          </p>
        </section>

        <div className="text-center text-xs text-slate-500 pt-4">
          <p>© 2026 TripMate Technologies Pvt Ltd. All rights reserved.</p>
        </div>
      </main>
    </div>
  );
}
