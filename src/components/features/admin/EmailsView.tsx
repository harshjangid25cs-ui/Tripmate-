"use client";

import React, { useState } from "react";
import { AdminService } from "@/lib/admin/admin-service";
import { useAdmin } from "@/lib/admin/admin-context";
import type { EmailLogEntry } from "@/lib/admin/types";
import { Send } from "lucide-react";

export function EmailsView() {
  const { currentAdmin, hasPermission, toast } = useAdmin();
  const [emails, setEmails] = useState<EmailLogEntry[]>(() => AdminService.getEmailLogs());
  const [isComposing, setIsComposing] = useState(false);
  const [recipient, setRecipient] = useState("");
  const [subject, setSubject] = useState("");
  const [template, setTemplate] = useState<EmailLogEntry["template"]>("custom_message");
  const [bodyText, setBodyText] = useState("");
  const [bookingRef, setBookingRef] = useState("");

  const canSend = hasPermission("send_email");
  const refresh = () => setEmails(AdminService.getEmailLogs());

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!recipient.trim() || !subject.trim() || !bodyText.trim()) {
      toast("All fields are required", "error");
      return;
    }

    AdminService.sendEmail(
      currentAdmin,
      recipient.trim(),
      template,
      subject.trim(),
      bodyText.trim(),
      bookingRef.trim() || undefined
    );

    toast(`Email dispatched to ${recipient}`, "success");
    setIsComposing(false);
    setRecipient("");
    setSubject("");
    setBodyText("");
    setBookingRef("");
    refresh();
  };

  return (
    <div className="space-y-6 animate-in fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight">Direct Email & Dispatch Log</h1>
          <p className="text-xs text-slate-500">
            Audit trail of outbound passenger communications, ID correction notices, and booking updates (§3.E, §9)
          </p>
        </div>

        {canSend && (
          <button
            type="button"
            onClick={() => setIsComposing(true)}
            className="flex items-center gap-2 rounded-2xl bg-primary-600 hover:bg-primary-700 px-4 py-2 text-xs font-bold text-white shadow-sm"
          >
            <Send className="h-4 w-4" />
            <span>Compose Direct Email</span>
          </button>
        )}
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                <th className="py-2.5">Recipient</th>
                <th className="py-2.5">Template / Key</th>
                <th className="py-2.5">Subject</th>
                <th className="py-2.5">Booking Ref</th>
                <th className="py-2.5">Sent By</th>
                <th className="py-2.5">Dispatched At (IST)</th>
                <th className="py-2.5 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {emails.map((em) => (
                <tr key={em.id} className="hover:bg-slate-50/50">
                  <td className="py-3.5 font-bold text-slate-900">{em.to_email}</td>
                  <td className="py-3.5">
                    <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-mono font-bold text-slate-700">
                      {em.template}
                    </span>
                  </td>
                  <td className="py-3.5 text-slate-700 max-w-xs truncate">{em.subject}</td>
                  <td className="py-3.5 font-mono text-slate-500">{em.related_booking_ref || "—"}</td>
                  <td className="py-3.5 text-slate-600">{em.sent_by}</td>
                  <td className="py-3.5 text-slate-500">
                    {new Date(em.created_at).toLocaleDateString([], {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </td>
                  <td className="py-3.5 text-right">
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold uppercase ${
                        em.status === "sent"
                          ? "bg-emerald-100 text-emerald-800"
                          : em.status === "failed"
                          ? "bg-rose-100 text-rose-800"
                          : "bg-slate-100 text-slate-700"
                      }`}
                    >
                      {em.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {isComposing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h2 className="text-lg font-black text-slate-900">Compose Direct Email</h2>
              <button
                type="button"
                onClick={() => setIsComposing(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSend} className="mt-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">To Email</label>
                  <input
                    type="email"
                    value={recipient}
                    onChange={(e) => setRecipient(e.target.value)}
                    placeholder="customer@domain.com"
                    className="w-full rounded-xl border border-slate-300 p-2 text-xs"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Template Key</label>
                  <select
                    value={template}
                    onChange={(e) => setTemplate(e.target.value as EmailLogEntry["template"])}
                    className="w-full rounded-xl border border-slate-300 p-2 text-xs font-bold"
                  >
                    <option value="custom_message">custom_message</option>
                    <option value="booking_updated">booking_updated</option>
                    <option value="booking_cancelled_by_admin">booking_cancelled_by_admin</option>
                    <option value="id_correction_request">id_correction_request</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Subject</label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="e.g. Important Update Regarding Your TripMate Reservation"
                  className="w-full rounded-xl border border-slate-300 p-2 text-xs font-bold"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Related Booking Ref (Opt)</label>
                <input
                  type="text"
                  value={bookingRef}
                  onChange={(e) => setBookingRef(e.target.value.toUpperCase())}
                  placeholder="TM-######"
                  className="w-full rounded-xl border border-slate-300 p-2 text-xs font-mono uppercase"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Message Body</label>
                <textarea
                  rows={4}
                  value={bodyText}
                  onChange={(e) => setBodyText(e.target.value)}
                  placeholder="Plain-text message (HTML tags will be escaped automatically per §8.5)..."
                  className="w-full rounded-xl border border-slate-300 p-2.5 text-xs focus:ring-2 focus:ring-primary-500/20"
                  required
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsComposing(false)}
                  className="rounded-xl border border-slate-300 px-4 py-2 text-xs font-bold text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-primary-600 hover:bg-primary-700 px-5 py-2 text-xs font-bold text-white shadow-sm"
                >
                  Send & Audit
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
