import React from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { Mail, Phone, MapPin, ShieldCheck, Clock } from "lucide-react";

export const metadata: Metadata = {
  title: "Contact & Merchant Support - TripMate India",
  description: "Official registered office address, 24/7 passenger support helpline, and grievance officer contact details.",
};

export default function ContactPage() {
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
          <span className="text-xs font-bold uppercase tracking-wider text-primary-600">Merchant Information</span>
          <h1 className="text-3xl font-black text-slate-900 mt-1">Contact Us &amp; Merchant Details</h1>
          <p className="text-xs text-slate-500 mt-1">Official Support &amp; Grievance Redressal Mechanism</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4 text-xs">
            <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
              <MapPin className="h-4 w-4 text-primary-600" />
              <span>Registered Office &amp; HQ</span>
            </div>
            <p className="leading-relaxed text-slate-600">
              <strong>TripMate Technologies Private Limited</strong><br />
              Plot No. 42, Tonk Road, Bapu Nagar,<br />
              Jaipur, Rajasthan 302015, India<br />
              CIN: U63090RJ2026PTC089124
            </p>
            <div className="pt-2 border-t border-slate-100 flex items-center gap-2 text-slate-500">
              <Clock className="h-3.5 w-3.5" />
              <span>Mon – Sat: 09:00 AM – 07:00 PM IST</span>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4 text-xs">
            <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
              <Phone className="h-4 w-4 text-primary-600" />
              <span>Customer Care &amp; Booking Support</span>
            </div>
            <p className="leading-relaxed text-slate-600">
              For general enquiries, booking amendments, or roadside concierge assistance:
            </p>
            <div className="space-y-1.5 pt-1">
              <div className="flex items-center gap-2 text-slate-900 font-semibold">
                <Phone className="h-3.5 w-3.5 text-slate-400" />
                <a href="tel:+918000123456" className="hover:underline">+91 8000 123 456</a>
              </div>
              <div className="flex items-center gap-2 text-slate-900 font-semibold">
                <Mail className="h-3.5 w-3.5 text-slate-400" />
                <a href="mailto:support@tripmate.in" className="hover:underline">support@tripmate.in</a>
              </div>
            </div>
          </div>
        </div>

        <section className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-3 text-xs leading-relaxed">
          <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
            <ShieldCheck className="h-4 w-4 text-emerald-600" />
            <span>Designated Grievance Officer</span>
          </div>
          <p className="text-slate-600">
            In accordance with the Information Technology Act 2000 and DPDP Act 2023, the details of our Grievance Officer are published below:
          </p>
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1 text-slate-700">
            <p><strong>Name:</strong> Harsh Kumar (Director of Customer Operations)</p>
            <p><strong>Email:</strong> <a href="mailto:grievance@tripmate.in" className="text-primary-600 font-bold hover:underline">grievance@tripmate.in</a></p>
            <p><strong>Address:</strong> TripMate Technologies Pvt Ltd, Plot No. 42, Tonk Road, Jaipur, Rajasthan 302015</p>
            <p><strong>Response Time:</strong> Acknowledgment within 24 hours; resolution within 15 working days.</p>
          </div>
        </section>

        <div className="text-center text-xs text-slate-500 pt-4">
          <p>© 2026 TripMate Technologies Pvt Ltd. All rights reserved.</p>
        </div>
      </main>
    </div>
  );
}
