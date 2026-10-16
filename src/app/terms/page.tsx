import React from "react";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms & Conditions - TripMate India",
  description: "Official legal terms of service, platform usage guidelines, booking agreements, and operator liability policies.",
};

export default function TermsPage() {
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
          <span className="text-xs font-bold uppercase tracking-wider text-primary-600">Legal Agreements</span>
          <h1 className="text-3xl font-black text-slate-900 mt-1">Terms and Conditions of Service</h1>
          <p className="text-xs text-slate-500 mt-1">Last Updated: October 16, 2026 • Commercial Entity: TripMate Technologies Pvt Ltd</p>
        </div>

        <section className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4 text-xs leading-relaxed">
          <h2 className="text-sm font-bold text-slate-900">1. Acceptance of Terms</h2>
          <p>
            By accessing, browsing, or booking travel circuits, vehicle charters, and hospitality stays via TripMate (the &quot;Platform&quot;), you acknowledge and agree to be legally bound by these Terms and Conditions (&quot;Terms&quot;), our Privacy Policy, and our Cancellation &amp; Refund Policy.
          </p>

          <h2 className="text-sm font-bold text-slate-900">2. Description of Platform Services</h2>
          <p>
            TripMate acts as a commercial technology aggregator connecting verified travelers with licensed transport carriers, certified tour operators, and approved hospitality partners across Rajasthan and northern India.
          </p>

          <h2 className="text-sm font-bold text-slate-900">3. Booking Confirmation &amp; Payments</h2>
          <p>
            All bookings are finalized upon successful payment authorization through authorized payment aggregators (including Razorpay India). All fares are quoted in Indian Rupees (INR) and are inclusive of applicable Goods and Services Tax (GST) at statutory rates.
          </p>

          <h2 className="text-sm font-bold text-slate-900">4. Passenger Verification &amp; Mandatory ID Compliance</h2>
          <p>
            In compliance with Indian Department of Tourism directives, every adult traveler must present a valid government-issued photo identification (Aadhaar Card, Passport, Voter ID, or Driving License) prior to boarding any charter vehicle or checking into partner accommodations.
          </p>

          <h2 className="text-sm font-bold text-slate-900">5. Limitation of Liability</h2>
          <p>
            TripMate exercises due diligence in selecting licensed fleet operators and verified hotels. However, TripMate shall not be liable for force majeure events including acts of God, unexpected roadblocks, extreme weather disruptions, or government restrictions.
          </p>

          <h2 className="text-sm font-bold text-slate-900">6. Governing Law &amp; Jurisdiction</h2>
          <p>
            These Terms are governed by and construed in accordance with the laws of India. Any disputes arising hereunder shall be subject to the exclusive jurisdiction of the competent courts in Jaipur, Rajasthan, India.
          </p>
        </section>

        <div className="text-center text-xs text-slate-500 pt-4">
          <p>© 2026 TripMate Technologies Pvt Ltd. All rights reserved.</p>
        </div>
      </main>
    </div>
  );
}
