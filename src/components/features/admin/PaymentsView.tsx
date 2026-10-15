"use client";

import React, { useState } from "react";
import { AdminService } from "@/lib/admin/admin-service";
import { useAdmin } from "@/lib/admin/admin-context";
import type { PaymentInvoiceRecord } from "@/lib/admin/types";
import { Download, FileSpreadsheet } from "lucide-react";

export function PaymentsView() {
  const { currentAdmin, hasPermission, toast } = useAdmin();
  const [payments] = useState<PaymentInvoiceRecord[]>(() => AdminService.getPayments());

  const canExport = hasPermission("payments_export");

  const exportCsv = (type: "payments" | "bookings" | "coupons") => {
    if (!canExport) {
      toast("Restricted: Finance Manager or Super Admin role required", "error");
      return;
    }

    let csvContent = "";
    let filename = "";

    if (type === "payments") {
      csvContent = "InvoiceNumber,BookingRef,Customer,Amount,GSTAmount,Method,Status,Timestamp\n";
      for (const p of payments) {
        csvContent += `"${p.invoice_number}","${p.booking_ref}","${p.customer_name}",${p.amount},${p.gst_amount},"${p.method}","${p.status}","${p.created_at}"\n`;
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
          <h1 className="text-xl font-black text-slate-900 tracking-tight">
            Payments, Invoices & Financial Reports
          </h1>
          <p className="text-xs text-slate-500">
            GST-compliant invoices, gateway transactions, and role-audited CSV exports (§3.A, §3.C)
          </p>
        </div>

        {canExport && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => exportCsv("bookings")}
              className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 shadow-xs"
            >
              <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600" />
              <span>Export Bookings</span>
            </button>
            <button
              type="button"
              onClick={() => exportCsv("payments")}
              className="flex items-center gap-1.5 rounded-xl bg-primary-600 hover:bg-primary-700 px-3 py-2 text-xs font-bold text-white shadow-xs"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Export Invoices</span>
            </button>
          </div>
        )}
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                <th className="py-2.5">Invoice Number</th>
                <th className="py-2.5">Booking Ref</th>
                <th className="py-2.5">Customer / Company</th>
                <th className="py-2.5">Total Amount</th>
                <th className="py-2.5">GST Breakdown</th>
                <th className="py-2.5">Method</th>
                <th className="py-2.5 text-right">Payment Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {payments.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50/50">
                  <td className="py-3.5 font-mono font-bold text-slate-900">{p.invoice_number}</td>
                  <td className="py-3.5 font-mono font-bold text-primary-600">{p.booking_ref}</td>
                  <td className="py-3.5 font-semibold text-slate-800">{p.customer_name}</td>
                  <td className="py-3.5 font-black text-slate-900 font-mono">
                    ₹{p.amount.toLocaleString("en-IN")}
                  </td>
                  <td className="py-3.5 text-slate-600">
                    ₹{p.gst_amount.toLocaleString("en-IN")} (18%)
                  </td>
                  <td className="py-3.5 uppercase font-mono text-slate-500 text-[10px]">
                    {p.method}
                  </td>
                  <td className="py-3.5 text-right">
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-[10px] font-extrabold uppercase ${
                        p.status === "completed"
                          ? "bg-emerald-100 text-emerald-800"
                          : p.status === "refunded"
                          ? "bg-rose-100 text-rose-800"
                          : "bg-slate-100 text-slate-700"
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
