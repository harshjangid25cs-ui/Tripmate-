"use client";

import React, { useState, useEffect } from "react";
import { AdminService } from "@/lib/admin/admin-service";
import { useAdmin } from "@/lib/admin/admin-context";
import type { IdReviewItem } from "@/lib/admin/types";
import {
  XCircle,
  Eye,
  Clock,
  ShieldAlert,
} from "lucide-react";

export function DocumentsView() {
  const { currentAdmin, hasPermission, requestReasonModal, toast } = useAdmin();
  const [reviews, setReviews] = useState<IdReviewItem[]>(() => AdminService.getIdReviews());
  const [activePreview, setActivePreview] = useState<IdReviewItem | null>(null);
  const [previewSecondsLeft, setPreviewSecondsLeft] = useState<number>(60);

  // Reject dialog state
  const [rejectingItem, setRejectingItem] = useState<IdReviewItem | null>(null);
  const [reasonCode, setReasonCode] = useState<
    "blurry" | "name_mismatch" | "expired" | "wrong_document_type" | "incomplete" | "other"
  >("blurry");
  const [rejectNote, setRejectNote] = useState("");

  const canReview = hasPermission("review_id_docs");
  const canView = hasPermission("view_id_docs");

  const refresh = () => setReviews(AdminService.getIdReviews());

  // 60-second expiring preview timer (§3.E, §8.4, §11 A18)
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (activePreview && previewSecondsLeft > 0) {
      timer = setInterval(() => {
        setPreviewSecondsLeft((prev) => {
          if (prev <= 1) {
            setActivePreview(null);
            toast("Temporary document access link has expired (60s security timeout)", "info");
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [activePreview, previewSecondsLeft, toast]);

  const handleOpenPreview = (item: IdReviewItem) => {
    if (!canView) {
      toast("Restricted: Role does not have permission to view ID documents", "error");
      return;
    }

    // Log document access to id_document_access_log (§8.4)
    AdminService.writeAudit(
      currentAdmin,
      "view_id_document",
      "id_document",
      item.passenger_id,
      null,
      { passenger_name: item.passenger_name, booking_ref: item.booking_ref },
      "Operator viewed customer ID verification document (60s signed link)"
    );

    setActivePreview(item);
    setPreviewSecondsLeft(60);
    toast("60-second secure temporary preview link generated", "info");
  };

  const handleApprove = (item: IdReviewItem) => {
    if (!canReview) {
      toast("Ops Manager, Support Agent, or Super Admin role required", "error");
      return;
    }

    requestReasonModal(
      "Approve Government ID",
      `Confirm identity verification for ${item.passenger_name} (${item.booking_ref}). Passenger status will become 'approved'.`,
      () => {
        const res = AdminService.reviewIdDocument(currentAdmin, item.id, "approved");
        if (res.ok) {
          toast(`ID for ${item.passenger_name} approved!`, "success");
          setActivePreview(null);
          refresh();
        } else {
          toast(res.error || "Approval failed", "error");
        }
      }
    );
  };

  const handleConfirmReject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectingItem) return;
    if (!rejectNote.trim()) {
      toast("Please provide an explanatory note for the customer", "error");
      return;
    }

    const res = AdminService.reviewIdDocument(
      currentAdmin,
      rejectingItem.id,
      "rejected",
      reasonCode,
      rejectNote.trim()
    );

    if (res.ok) {
      toast(
        `ID rejected. Customer emailed correction request with link to /trips/${rejectingItem.trip_id}/documents`,
        "success"
      );
      setRejectingItem(null);
      setRejectNote("");
      setActivePreview(null);
      refresh();
    } else {
      toast(res.error || "Rejection failed", "error");
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-text-primary tracking-tight">
            Traveller ID Verification Queue
          </h1>
          <p className="text-xs text-text-secondary">
            Review submitted government IDs, generate short-lived links, and dispatch correction emails (§3.E, §8.4)
          </p>
        </div>

        <div className="flex items-center gap-2 rounded-xl bg-amber-50 px-3.5 py-1.5 border border-amber-300 text-xs font-bold text-amber-900">
          <ShieldAlert className="h-4 w-4 text-amber-700" />
          <span>60-Second Short-Lived Access Enforced</span>
        </div>
      </div>

      {/* Review Queue Table */}
      <div className="rounded-2xl border border-border-hairline bg-card-surface p-6 shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-border-hairline text-[10px] font-extrabold uppercase tracking-wider text-text-secondary">
                <th className="py-2.5">Booking Ref</th>
                <th className="py-2.5">Passenger Name</th>
                <th className="py-2.5">Customer Contact</th>
                <th className="py-2.5">Document Type</th>
                <th className="py-2.5">Submitted (IST)</th>
                <th className="py-2.5">Review Status</th>
                <th className="py-2.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-hairline">
              {reviews.map((item) => (
                <tr key={item.id} className="hover:bg-surface-container-low/40">
                  <td className="py-3.5">
                    <span className="font-mono font-bold text-text-primary bg-surface px-2 py-0.5 rounded-lg border border-border-hairline">
                      {item.booking_ref}
                    </span>
                  </td>

                  <td className="py-3.5 font-bold text-text-primary">{item.passenger_name}</td>

                  <td className="py-3.5">
                    <p className="text-text-primary font-medium">{item.customer_name}</p>
                    <p className="text-[11px] text-text-secondary">{item.customer_email}</p>
                  </td>

                  <td className="py-3.5 font-medium text-text-secondary">{item.doc_type}</td>

                  <td className="py-3.5 text-text-secondary font-medium font-mono">
                    {new Date(item.submitted_at).toLocaleDateString([], {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </td>

                  <td className="py-3.5">
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-[10px] font-extrabold uppercase border ${
                        item.status === "approved"
                          ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                          : item.status === "rejected"
                          ? "bg-rose-50 text-rose-800 border-rose-200"
                          : "bg-amber-50 text-amber-900 border-amber-300"
                      }`}
                    >
                      {item.status}
                    </span>
                    {item.reject_reason && (
                      <span className="block text-[10px] text-rose-700 truncate max-w-xs mt-0.5">
                        {item.reject_reason}
                      </span>
                    )}
                  </td>

                  <td className="py-3.5 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => handleOpenPreview(item)}
                        disabled={!canView}
                        className="flex items-center gap-1 rounded-xl border border-border-hairline bg-surface px-3 py-1.5 text-xs font-bold text-text-primary hover:bg-card-surface disabled:opacity-40"
                      >
                        <Eye className="h-3.5 w-3.5 text-text-secondary" />
                        <span>View (60s)</span>
                      </button>

                      {item.status === "pending" && canReview && (
                        <>
                          <button
                            type="button"
                            onClick={() => handleApprove(item)}
                            className="rounded-xl bg-emerald-700 hover:bg-emerald-800 px-3 py-1.5 text-xs font-bold text-white shadow-xs"
                          >
                            Approve
                          </button>
                          <button
                            type="button"
                            onClick={() => setRejectingItem(item)}
                            className="rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 px-3 py-1.5 text-xs font-bold"
                          >
                            Reject
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 60-Second Temporary Document Viewer Modal (§3.E, §8.4) */}
      {activePreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-2xl rounded-2xl bg-card-surface p-6 shadow-xl border border-border-hairline">
            {/* Countdown Header */}
            <div className="flex items-center justify-between pb-3 border-b border-border-hairline">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-black text-text-primary">
                    ID Document: {activePreview.passenger_name}
                  </h3>
                  <span className="rounded-md bg-surface border border-border-hairline px-2 py-0.5 text-[10px] font-mono text-text-secondary">
                    {activePreview.doc_type}
                  </span>
                </div>
                <p className="text-[11px] text-text-secondary mt-0.5">
                  Booking Ref: {activePreview.booking_ref} · Access Logged in Immutable Audit
                </p>
              </div>

              {/* Countdown Pill */}
              <div className="flex items-center gap-2 rounded-xl bg-amber-50 px-3 py-1 border border-amber-300 text-xs font-mono font-bold text-amber-900">
                <Clock className="h-3.5 w-3.5 animate-spin text-amber-700" />
                <span>Expires in {previewSecondsLeft}s</span>
              </div>
            </div>

            {/* Document Image Frame */}
            <div className="mt-4 flex flex-col items-center justify-center rounded-xl bg-surface-dark p-4 min-h-[300px] border border-border-hairline">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={activePreview.doc_url}
                alt="Government ID"
                className="max-h-[360px] w-auto rounded-xl object-contain shadow-md"
              />
              <p className="mt-3 text-[10px] text-slate-400">
                Private Vault Link • No document data or ID number is ever emailed or cached
              </p>
            </div>

            {/* Actions Footer */}
            <div className="mt-5 flex items-center justify-between pt-3 border-t border-border-hairline">
              <button
                type="button"
                onClick={() => setActivePreview(null)}
                className="rounded-xl border border-border-hairline bg-surface px-4 py-2 text-xs font-bold text-text-primary hover:bg-card-surface"
              >
                Close Link
              </button>

              {activePreview.status === "pending" && canReview && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setRejectingItem(activePreview);
                      setActivePreview(null);
                    }}
                    className="rounded-xl bg-rose-50 text-rose-700 border border-rose-200 px-4 py-2 text-xs font-bold hover:bg-rose-100"
                  >
                    Reject ID
                  </button>
                  <button
                    type="button"
                    onClick={() => handleApprove(activePreview)}
                    className="rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white px-5 py-2 text-xs font-bold shadow-xs"
                  >
                    Approve ID
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Reject & Send Correction Email Modal (W4 §4) */}
      {rejectingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-lg rounded-2xl bg-card-surface p-6 shadow-xl border border-border-hairline">
            <div className="flex items-center justify-between pb-3 border-b border-border-hairline">
              <h3 className="text-base font-black text-rose-800 flex items-center gap-2">
                <XCircle className="h-5 w-5 text-rose-700" />
                Reject ID for {rejectingItem.passenger_name}
              </h3>
              <button
                type="button"
                onClick={() => setRejectingItem(null)}
                className="text-text-secondary hover:text-text-primary rounded-lg p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleConfirmReject} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-bold text-text-secondary mb-1">
                  Rejection Reason Code (W4 §4)
                </label>
                <select
                  value={reasonCode}
                  onChange={(e) =>
                    setReasonCode(
                      e.target.value as
                        | "blurry"
                        | "name_mismatch"
                        | "expired"
                        | "wrong_document_type"
                        | "incomplete"
                        | "other"
                    )
                  }
                  className="w-full rounded-xl border border-border-hairline bg-surface p-2.5 text-xs font-bold text-text-primary focus:bg-card-surface"
                >
                  <option value="blurry">Blurry / Unreadable Photo</option>
                  <option value="name_mismatch">Name Does Not Match Traveller Ticket</option>
                  <option value="expired">Document is Expired</option>
                  <option value="wrong_document_type">Wrong Document Type (Need Govt Photo ID)</option>
                  <option value="incomplete">Incomplete / Cut Off Document</option>
                  <option value="other">Other Issue</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-text-secondary mb-1">
                  Explanatory Note for Customer <span className="text-rose-600">*</span>
                </label>
                <textarea
                  rows={3}
                  value={rejectNote}
                  onChange={(e) => setRejectNote(e.target.value)}
                  placeholder="e.g. The photo was too blurry to verify date of birth. Please upload a clear color photo..."
                  className="w-full rounded-xl border border-border-hairline bg-surface p-2.5 text-xs text-text-primary focus:bg-card-surface"
                  required
                />
              </div>

              <div className="rounded-xl bg-surface p-3 border border-border-hairline text-[11px] text-text-secondary space-y-1">
                <p className="font-bold text-text-primary">Security Guarantee (§8.4):</p>
                <p>
                  Customer {rejectingItem.customer_email} will receive an automated correction request with a direct link to <code className="bg-card-surface border border-border-hairline px-1 rounded">/trips/{rejectingItem.trip_id}/documents</code>. No ID number or image is included in emails.
                </p>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-border-hairline">
                <button
                  type="button"
                  onClick={() => setRejectingItem(null)}
                  className="rounded-xl border border-border-hairline bg-surface px-4 py-2 text-xs font-bold text-text-primary hover:bg-card-surface"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-rose-700 hover:bg-rose-800 px-5 py-2 text-xs font-bold text-white shadow-xs"
                >
                  Confirm Reject & Dispatch Email
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
