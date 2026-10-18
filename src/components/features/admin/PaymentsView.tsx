"use client";

import React, { useState } from "react";
import { AdminService } from "@/lib/admin/admin-service";
import { useAdmin } from "@/lib/admin/admin-context";
import type { PaymentInvoiceRecord } from "@/lib/admin/types";
import { Download, FileSpreadsheet, CheckCircle2, XCircle } from "lucide-react";
import { adminVerifyUpiPaymentAction } from "@/lib/actions/admin-ops";

export function PaymentsView() {
  const { currentAdmin, hasPermission, toast, refreshOperationalData } = useAdmin();
  const [payments, setPayments] = useState<PaymentInvoiceRecord[]>(() => AdminService.getPayments());
  const [processingId, setProcessingId] = useState<string | null>(null);

  const canExport = hasPermission("payments_export");
  const refresh = () => setPayments(AdminService.getPayments());

  const handleVerifyUpi = async (paymentId: string, status: "verified" | "rejected") => {
    setProcessingId(paymentId);
    try {
      AdminService.verifyUpiPayment(currentAdmin, paymentId, status);
      const res = await adminVerifyUpiPaymentAction({
        paymentId,
        status,
        notes: status === "verified" ? "UTR verified by admin" : "Fake UTR rejected by admin",
      });

      if (res.ok) {
        toast(
          status === "verified"
            ? "12-Digit UTR verified successfully"
            : "Fake UTR rejected and booking cancelled",
          status === "verified" ? "success" : "info"
        );
      } else {
        toast(res.error || "Failed to update verification status on server", "error");
      }
      refresh();
      await refreshOperationalData();
    } catch {
      toast("Error verifying UTR", "error");
    } finally {
      setProcessingId(null);
    }
  };

  const exportCsv = (type: "payments" | "bookings" | "coupons") => {
    if (!canExport) {
      toast("Restricted: Finance Manager or Super Admin role required", "error");
      return;
    }

    let csvContent = "";
    let filename = "";

    if (type === "payments") {
      csvContent = "InvoiceNumber,BookingRef,Customer,Amount,GSTAmount,Method,UTRNumber,VerificationStatus,Status,Timestamp\n";
      for (const p of payments) {
        csvContent += `"${p.invoice_number}","${p.booking_ref}","${p.customer_name}",${p.amount},${p.gst_amount},"${p.method}","${p.utr_number || ""}","${p.verification_status || ""}","${p.status}","${p.created_at}"\n`;
      }
      filename = `tripmate-payments-${new Date().toISOString().slice(0, 10)}.csv`;
    } else if (type === "bookings") {
      const bookings = AdminService.getBookings();
      csvContent = "BookingRef,Customer,Kind,Destination,Days,TotalAmount,Status,CreatedAt\n";
      for (const b of bookings) {
        csvContent += `"${b.booking_ref}","${b.customer_name}","${b.kind}","${b.destination_name}",${b.days},${b.total_amount},"${b.status}","${b.created_at}"\n`;
      }
      filename = `tripmate-bookings-${new Date().toISOString().slice(0, 10)}.csv`;
    } else {
      const redemptions = AdminService.getCouponRedemptions();
      csvContent = "Code,TripId,UserEmail,DiscountAmount,Timestamp\n";
      for (const r of redemptions) {
        csvContent += `"${r.coupon_code}","${r.trip_id}","${r.user_email}",${r.discount_amount},"${r.created_at}"\n`;
      }
      filename = `tripmate-coupon-redemptions-${new Date().toISOString().slice(0, 10)}.csv`;
    }

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Audit the CSV export (§3.A)
    AdminService.writeAudit(
      currentAdmin,
      "export_csv",
      type,
      "all",
      null,
      { file: filename },
      `Operator generated server-side CSV export of ${type}`
    );

    toast(`Exported ${filename} successfully`, "success");
  };

  return (
    <div className="space-y-6 animate-in fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-text-primary tracking-tight">
            Payments, Invoices & Financial Reports
          </h1>
          <p className="text-xs text-text-secondary">
            GST-compliant invoices, gateway transactions, and role-audited CSV exports (§3.A, §3.C)
          </p>
        </div>

        {canExport && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => exportCsv("bookings")}
              className="flex items-center gap-1.5 rounded-xl border border-border-hairline bg-surface px-3 py-2 text-xs font-bold text-text-primary hover:bg-card-surface shadow-xs"
            >
              <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-700" />
              <span>Export Bookings</span>
            </button>
            <button
              type="button"
              onClick={() => exportCsv("payments")}
              className="flex items-center gap-1.5 rounded-xl bg-primary-container hover:bg-primary-container/90 px-3 py-2 text-xs font-bold text-white shadow-xs"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Export Invoices</span>
            </button>
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-border-hairline bg-card-surface p-6 shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-border-hairline text-[10px] font-extrabold uppercase tracking-wider text-text-secondary">
                <th className="py-2.5">Invoice Number</th>
                <th className="py-2.5">Booking Ref</th>
                <th className="py-2.5">Customer / Company</th>
                <th className="py-2.5">Total Amount</th>
                <th className="py-2.5">GST Breakdown</th>
                <th className="py-2.5">Method</th>
                <th className="py-2.5">12-Digit UTR</th>
                <th className="py-2.5">UTR Verification</th>
                <th className="py-2.5 text-right">Payment Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-hairline">
              {payments.map((p) => (
                <tr key={p.id} className="hover:bg-surface-container-low/40">
                  <td className="py-3.5 font-mono font-bold text-text-primary">{p.invoice_number}</td>
                  <td className="py-3.5 font-mono font-bold text-primary-container">{p.booking_ref}</td>
                  <td className="py-3.5 font-semibold text-text-primary">{p.customer_name}</td>
                  <td className="py-3.5 font-black text-text-primary font-mono">
                    ₹{p.amount.toLocaleString("en-IN")}
                  </td>
                  <td className="py-3.5 text-text-secondary font-mono">
                    ₹{p.gst_amount.toLocaleString("en-IN")} (18%)
                  </td>
                  <td className="py-3.5 uppercase font-mono text-text-secondary text-[10px]">
                    {p.method}
                  </td>
                  <td className="py-3.5 font-mono text-xs">
                    {p.utr_number ? (
                      <div className="flex flex-col gap-0.5">
                        <span className="font-bold text-text-primary tracking-wider tabular-nums bg-surface px-2 py-0.5 rounded border border-border-hairline inline-block w-fit">
                          {p.utr_number}
                        </span>
                        {p.payer_vpa && (
                          <span className="text-[10px] text-text-secondary truncate max-w-[140px]">
                            {p.payer_vpa}
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-text-secondary text-[11px]">—</span>
                    )}
                  </td>
                  <td className="py-3.5">
                    {p.utr_number ? (
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase border ${
                            p.verification_status === "verified"
                              ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                              : p.verification_status === "rejected"
                              ? "bg-rose-50 text-rose-800 border-rose-300"
                              : "bg-amber-50 text-amber-800 border-amber-300"
                          }`}
                        >
                          {p.verification_status === "pending_verification"
                            ? "Pending Review"
                            : p.verification_status === "rejected"
                            ? "Rejected"
                            : "Verified"}
                        </span>

                        {p.verification_status === "pending_verification" && (
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              disabled={processingId === p.id}
                              onClick={() => handleVerifyUpi(p.id, "verified")}
                              className="p-1 rounded bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-300 text-[10px] font-bold flex items-center gap-0.5 disabled:opacity-50"
                              title="Verify 12-Digit UTR"
                            >
                              <CheckCircle2 className="h-3 w-3" />
                              <span>Verify</span>
                            </button>
                            <button
                              type="button"
                              disabled={processingId === p.id}
                              onClick={() => handleVerifyUpi(p.id, "rejected")}
                              className="p-1 rounded bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-300 text-[10px] font-bold flex items-center gap-0.5 disabled:opacity-50"
                              title="Reject Fake UTR (Cancel Booking)"
                            >
                              <XCircle className="h-3 w-3" />
                              <span>Reject</span>
                            </button>
                          </div>
                        )}
                      </div>
                    ) : (
                      <span className="text-text-secondary text-[11px]">—</span>
                    )}
                  </td>
                  <td className="py-3.5 text-right">
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-[10px] font-extrabold uppercase border ${
                        p.status === "completed"
                          ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                          : p.status === "refunded"
                          ? "bg-rose-50 text-rose-800 border-rose-200"
                          : "bg-surface text-text-secondary border-border-hairline"
                      }`}
                    >
                      {p.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
