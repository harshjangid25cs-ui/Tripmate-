import React from "react";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy - TripMate India",
  description: "Comprehensive privacy disclosures detailing data collection, DPDP Act 2023 compliance, payment tokenization, and retention guidelines.",
};

export default function PrivacyPolicyPage() {
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
          <span className="text-xs font-bold uppercase tracking-wider text-primary-600">Data Protection</span>
          <h1 className="text-3xl font-black text-slate-900 mt-1">Privacy &amp; Data Protection Policy</h1>
          <p className="text-xs text-slate-500 mt-1">Effective Date: October 16, 2026 • Digital Personal Data Protection (DPDP) Act 2023 Compliant</p>
        </div>

        <section className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4 text-xs leading-relaxed">
          <h2 className="text-sm font-bold text-slate-900">1. Information We Collect</h2>
          <p>
            When you create an account or reserve travel services on TripMate, we collect necessary personal identifiers: your full legal name, email address, 10-digit Indian mobile number, and traveler roster details.
          </p>

          <h2 className="text-sm font-bold text-slate-900">2. Payment Security &amp; Tokenization</h2>
          <p>
            TripMate strictly adheres to RBI card storage guidelines and PCI-DSS standards. We never store credit or debit card numbers, CVVs, or NetBanking passwords on our servers. All financial transactions are securely processed via Razorpay Software Private Limited using 256-bit SSL encryption.
          </p>

          <h2 className="text-sm font-bold text-slate-900">3. Purpose of Processing</h2>
          <p>
            Your information is processed exclusively to: generate GST-compliant tax invoices, coordinate chauffeur and fleet dispatch, provide instant booking updates via SMS/Email, and satisfy state tourist security regulations.
          </p>

          <h2 className="text-sm font-bold text-slate-900">4. Data Sharing &amp; Third Parties</h2>
          <p>
            We do not sell, rent, or trade your personal data. Roster details are shared only with the assigned transport chauffeur and booked hotel partner for guest check-in verification.
          </p>

          <h2 className="text-sm font-bold text-slate-900">5. Data Retention &amp; Passenger Rights</h2>
          <p>
            You have the right to request access to, correction of, or erasure of your personal data by contacting our designated Grievance Officer at <a href="mailto:grievance@tripmate.in" className="text-primary-600 font-bold hover:underline">grievance@tripmate.in</a>.
          </p>
        </section>

        <div className="text-center text-xs text-slate-500 pt-4">
          <p>© 2026 TripMate Technologies Pvt Ltd. All rights reserved.</p>
        </div>
      </main>
    </div>
  );
}
