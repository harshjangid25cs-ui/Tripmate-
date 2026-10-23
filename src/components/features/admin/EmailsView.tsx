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
          <h1 className="text-xl font-black text-text-primary tracking-tight">Direct Email & Dispatch Log</h1>
          <p className="text-xs text-text-secondary">
            Audit trail of outbound passenger communications, ID correction notices, and booking updates (§3.E, §9)
          </p>
        </div>

        {canSend && (
          <button
            type="button"
            onClick={() => setIsComposing(true)}
            className="flex items-center gap-2 rounded-xl bg-primary-container hover:bg-primary-container/90 px-4 py-2 text-xs font-bold text-white shadow-xs"
          >
            <Send className="h-4 w-4" />
            <span>Compose Direct Email</span>
          </button>
        )}
      </div>

      <div className="rounded-xl border border-[#E5E3DF] bg-[#FFFFFF] shadow-xs overflow-hidden flex flex-col">
        <div className="px-4 py-3 border-b border-[#E5E3DF] bg-[#FFFFFF] shrink-0 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-[#1F1F1E] uppercase tracking-wider">Outbound Dispatch Log</span>
            <span className="rounded-full bg-[#1F1F1E] px-2 py-0.5 text-[11px] font-bold text-white">
              {emails.length}
            </span>
          </div>
          <span className="text-xs text-[#6E6D68]">Up to 5 visible · scroll inside table</span>
        </div>

        <div className="overflow-y-auto overflow-x-auto max-h-[360px] custom-scrollbar admin-scroll overscroll-contain">
          <table className="w-full text-left text-xs">
            <thead className="sticky top-0 z-10 bg-[#FBF9F5] border-b border-[#E5E3DF]">
              <tr className="text-[10px] font-extrabold uppercase tracking-wider text-[#6E6D68]">
                <th className="py-2.5 px-4">Recipient</th>
                <th className="py-2.5 px-4">Template / Key</th>
                <th className="py-2.5 px-4">Subject</th>
                <th className="py-2.5 px-4">Booking Ref</th>
                <th className="py-2.5 px-4">Sent By</th>
                <th className="py-2.5 px-4">Dispatched At (IST)</th>
                <th className="py-2.5 px-4 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E3DF]">
              {emails.map((em) => (
                <tr key={em.id} className="hover:bg-surface-container-low/40">
                  <td className="py-3.5 px-4 font-bold text-text-primary">{em.to_email}</td>
                  <td className="py-3.5 px-4">
                    <span className="rounded bg-surface border border-border-hairline px-1.5 py-0.5 text-[10px] font-mono font-bold text-text-secondary">
                      {em.template}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-text-primary max-w-xs truncate">{em.subject}</td>
                  <td className="py-3.5 px-4 font-mono text-primary-container font-bold">{em.related_booking_ref || "—"}</td>
                  <td className="py-3.5 px-4 text-text-secondary">{em.sent_by}</td>
                  <td className="py-3.5 px-4 text-text-secondary font-mono">
                    {new Date(em.created_at).toLocaleDateString([], {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold uppercase border ${
                        em.status === "sent"
                          ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                          : em.status === "failed"
                          ? "bg-rose-50 text-rose-800 border-rose-200"
                          : "bg-surface text-text-secondary border-border-hairline"
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

        <div className="px-4 py-2.5 border-t border-[#E5E3DF] bg-[#FBF9F5] text-xs text-[#6E6D68] shrink-0 flex items-center justify-between">
          <span>Showing {emails.length} dispatched communications (scroll inside box for more)</span>
          <span className="font-mono text-[11px] text-[#8C8A85]">Email Service §3.E</span>
        </div>
      </div>

      {isComposing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-lg rounded-2xl bg-card-surface p-6 shadow-xl border border-border-hairline">
            <div className="flex items-center justify-between pb-3 border-b border-border-hairline">
              <h2 className="text-lg font-black text-text-primary">Compose Direct Email</h2>
              <button
                type="button"
                onClick={() => setIsComposing(false)}
                className="text-text-secondary hover:text-text-primary rounded-lg p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSend} className="mt-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-text-secondary mb-1">To Email</label>
                  <input
                    type="email"
                    value={recipient}
                    onChange={(e) => setRecipient(e.target.value)}
                    placeholder="customer@domain.com"
                    className="w-full rounded-xl border border-border-hairline bg-surface p-2 text-xs text-text-primary focus:bg-card-surface"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-text-secondary mb-1">Template Key</label>
                  <select
                    value={template}
                    onChange={(e) => setTemplate(e.target.value as EmailLogEntry["template"])}
                    className="w-full rounded-xl border border-border-hairline bg-surface p-2 text-xs font-bold text-text-primary focus:bg-card-surface"
                  >
                    <option value="custom_message">custom_message</option>
                    <option value="booking_updated">booking_updated</option>
                    <option value="booking_cancelled_by_admin">booking_cancelled_by_admin</option>
                    <option value="id_correction_request">id_correction_request</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-text-secondary mb-1">Subject</label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="e.g. Important Update Regarding Your TripMate Reservation"
                  className="w-full rounded-xl border border-border-hairline bg-surface p-2 text-xs font-bold text-text-primary focus:bg-card-surface"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-text-secondary mb-1">Related Booking Ref (Opt)</label>
                <input
                  type="text"
                  value={bookingRef}
                  onChange={(e) => setBookingRef(e.target.value.toUpperCase())}
                  placeholder="TM-######"
                  className="w-full rounded-xl border border-border-hairline bg-surface p-2 text-xs font-mono uppercase text-text-primary focus:bg-card-surface"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-text-secondary mb-1">Message Body</label>
                <textarea
                  rows={4}
                  value={bodyText}
                  onChange={(e) => setBodyText(e.target.value)}
                  placeholder="Plain-text message (HTML tags will be escaped automatically per §8.5)..."
                  className="w-full rounded-xl border border-border-hairline bg-surface p-2.5 text-xs text-text-primary focus:bg-card-surface"
                  required
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-border-hairline">
                <button
                  type="button"
                  onClick={() => setIsComposing(false)}
                  className="rounded-xl border border-border-hairline bg-surface px-4 py-2 text-xs font-bold text-text-primary hover:bg-card-surface"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-primary-container hover:bg-primary-container/90 px-5 py-2 text-xs font-bold text-white shadow-xs"
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
