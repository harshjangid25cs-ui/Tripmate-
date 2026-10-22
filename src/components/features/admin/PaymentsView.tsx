"use client";

import React, { useState, useEffect } from "react";
import { AdminService } from "@/lib/admin/admin-service";
import { useAdmin } from "@/lib/admin/admin-context";
import type { PaymentInvoiceRecord, BankMessageInboxRecord, BookingAdmin } from "@/lib/admin/types";
import {
  Download,
  FileSpreadsheet,
  CheckCircle2,
  XCircle,
  Smartphone,
  Mail,
  Shield,
  Zap,
  Sparkles,
  Send,
  Building2,
  AlertCircle,
  Check,
  Copy,
} from "lucide-react";
import {
  adminVerifyUpiPaymentAction,
  adminIngestManualBankMessageAction,
  adminConfirmBankInboxPaymentAction,
  adminToggleBankAutoConfirmAction,
} from "@/lib/actions/admin-ops";

export function PaymentsView() {
  const { currentAdmin, hasPermission, toast, refreshOperationalData } = useAdmin();

  // Sub-tab: "bank_hub" (default) or "invoices"
  const [activeSubTab, setActiveSubTab] = useState<"bank_hub" | "invoices">("bank_hub");

  // Invoices & payments state
  const [payments, setPayments] = useState<PaymentInvoiceRecord[]>(() => AdminService.getPayments());
  const [processingId, setProcessingId] = useState<string | null>(null);

  // Bank Messages Inbox state
  const [bankInbox, setBankInbox] = useState<BankMessageInboxRecord[]>(() =>
    AdminService.getBankMessagesInbox()
  );
  const [bookings, setBookings] = useState<BookingAdmin[]>(() => AdminService.getBookings());
  const [pricing, setPricing] = useState(() => AdminService.getPricing());

  // Filter & Control state for Bank Hub
  const [channelFilter, setChannelFilter] = useState<"all" | "sms" | "gmail" | "pending" | "confirmed">("all");
  const [isAutoConfirming, setIsAutoConfirming] = useState<boolean>(() => pricing.bank_auto_confirm ?? true);
  const [togglingAutoConfirm, setTogglingAutoConfirm] = useState(false);

  // Manual Console state
  const [pasteChannel, setPasteChannel] = useState<"sms" | "gmail">("sms");
  const [pasteSender, setPasteSender] = useState("");
  const [pasteSubject, setPasteSubject] = useState("");
  const [pasteBody, setPasteBody] = useState("");
  const [isIngestingManual, setIsIngestingManual] = useState(false);
  const [selectedTripOverrides, setSelectedTripOverrides] = useState<Record<string, string>>({});
  const [copiedUtr, setCopiedUtr] = useState<string | null>(null);

  const canExport = hasPermission("payments_export");

  // Subscribe to live AdminService updates
  useEffect(() => {
    const unsubscribe = AdminService.subscribe(() => {
      setPayments(AdminService.getPayments());
      setBankInbox(AdminService.getBankMessagesInbox());
      setBookings(AdminService.getBookings());
      setPricing(AdminService.getPricing());
    });
    return unsubscribe;
  }, []);

  const refreshAll = async () => {
    setPayments(AdminService.getPayments());
    setBankInbox(AdminService.getBankMessagesInbox());
    setBookings(AdminService.getBookings());
    setPricing(AdminService.getPricing());
    await refreshOperationalData();
  };

  // Toggle Auto-Confirm Mode
  const handleToggleAutoConfirm = async () => {
    const nextState = !isAutoConfirming;
    setTogglingAutoConfirm(true);
    try {
      const res = await adminToggleBankAutoConfirmAction({ bankAutoConfirm: nextState });
      if (res.ok) {
        setIsAutoConfirming(nextState);
        toast(
          nextState
            ? "⚡ Bank Hub set to AUTO-CONFIRM matched payments"
            : "🛡️ Bank Hub set to MANUAL ADMIN CONFIRMATION",
          "success"
        );
        await refreshAll();
      } else {
        toast(res.error || "Failed to update auto-confirm settings", "error");
      }
    } catch {
      toast("Error updating auto-confirm settings", "error");
    } finally {
      setTogglingAutoConfirm(false);
    }
  };

  // 1-Click Confirm from Bank Hub
  const handleConfirmBankMessage = async (inboxId: string, defaultMatchedTripId?: string | null) => {
    const targetTripId = selectedTripOverrides[inboxId] || defaultMatchedTripId;
    if (!targetTripId) {
      toast("Please select a pending trip to link this payment to", "error");
      return;
    }

    setProcessingId(inboxId);
    try {
      const res = await adminConfirmBankInboxPaymentAction({
        inboxId,
        tripId: targetTripId,
      });

      if (res.ok) {
        toast(
          "Payment confirmed! Trip marked confirmed & GST invoice issued.",
          "success"
        );
        await refreshAll();
      } else {
        toast(res.error || "Failed to confirm payment", "error");
      }
    } catch {
      toast("Error confirming payment", "error");
    } finally {
      setProcessingId(null);
    }
  };

  // Manual Paste & Verify
  const handleIngestManual = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!pasteBody.trim()) {
      toast("Please paste or type the bank message content", "error");
      return;
    }

    setIsIngestingManual(true);
    try {
      const res = await adminIngestManualBankMessageAction({
        channel: pasteChannel,
        sender: pasteSender.trim() || (pasteChannel === "sms" ? "Bank SMS" : "FamPay Alert"),
        subject: pasteSubject.trim() || undefined,
        rawBody: pasteBody.trim(),
      });

      if (res.ok) {
        toast(res.message || "Bank payment verified and ingested!", "success");
        setPasteBody("");
        setPasteSender("");
        setPasteSubject("");
        await refreshAll();
      } else {
        toast(res.error || "Validation rejected message", "error");
      }
    } catch {
      toast("Network error submitting bank message", "error");
    } finally {
      setIsIngestingManual(false);
    }
  };

  // Built-in 1-Click Test Simulations
  const handleRunSimulation = async (type: "fampay_sms" | "sbi_sms" | "fampay_email") => {
    // Find a pending trip to simulate exact amount, or fallback to 31624
    const pendingTrip = bookings.find((b) => b.status === "pending_approval" || (b.status as string) === "draft");
    const amount = pendingTrip ? pendingTrip.total_amount : 31624;
    const ref = pendingTrip ? pendingTrip.booking_ref : "TM-492011";
    const randomUtr = Math.floor(100000000000 + Math.random() * 900000000000).toString();

    let text = "";
    let channel: "sms" | "gmail" = "sms";
    let sender = "";
    let subject = "";

    if (type === "fampay_sms") {
      channel = "sms";
      sender = "AX-FAMPAY";
      text = `Hey! Received Rs.${amount.toLocaleString("en-IN")}.00 from rahul@paytm via UPI. Ref: ${randomUtr}. Note: ${ref}. Check FamPay app for balance.`;
    } else if (type === "sbi_sms") {
      channel = "sms";
      sender = "AD-SBIUPI";
      text = `Dear SBI UPI User, A/C 9876 credited by Rs ${amount.toFixed(2)} on 23Oct26 transfer from HARSH KUMAR Ref No ${randomUtr} - SBI. Ref: ${ref}`;
    } else {
      channel = "gmail";
      sender = "FamPay <no-reply@fampay.in>";
      subject = `Payment Received on FamPay: ₹${amount.toLocaleString("en-IN")}`;
      text = `You received ₹${amount.toLocaleString("en-IN")}.00 from user@okhdfcbank via UPI. UPI Transaction ID / UTR: ${randomUtr}. Note: ${ref}.`;
    }

    setPasteChannel(channel);
    setPasteSender(sender);
    setPasteSubject(subject);
    setPasteBody(text);

    setIsIngestingManual(true);
    try {
      const res = await adminIngestManualBankMessageAction({
        channel,
        sender,
        subject: subject || undefined,
        rawBody: text,
      });

      if (res.ok) {
        toast(res.message || "Simulated Bank alert ingested successfully!", "success");
        setPasteBody("");
        setPasteSender("");
        setPasteSubject("");
        await refreshAll();
      } else {
        toast(res.error || "Simulation rejected", "error");
      }
    } catch {
      toast("Error running simulation", "error");
    } finally {
      setIsIngestingManual(false);
    }
  };

  // Legacy UTR verification action
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
      await refreshAll();
    } catch {
      toast("Error verifying UTR", "error");
    } finally {
      setProcessingId(null);
    }
  };

  // CSV Export helper
  const exportCsv = (type: "payments" | "bookings" | "coupons") => {
    if (!canExport) {
      toast("Restricted: Finance Manager or Super Admin role required", "error");
      return;
    }

    let csvContent = "";
    let filename = "";

    if (type === "payments") {
      csvContent =
        "InvoiceNumber,BookingRef,Customer,Amount,GSTAmount,Method,UTRNumber,VerificationStatus,Status,Timestamp\n";
      for (const p of payments) {
        csvContent += `"${p.invoice_number}","${p.booking_ref}","${p.customer_name}",${p.amount},${p.gst_amount},"${p.method}","${p.utr_number || ""}","${p.verification_status || ""}","${p.status}","${p.created_at}"\n`;
      }
      filename = `tripmate-payments-${new Date().toISOString().slice(0, 10)}.csv`;
    } else if (type === "bookings") {
      const bks = AdminService.getBookings();
      csvContent = "BookingRef,Customer,Kind,Destination,Days,TotalAmount,Status,CreatedAt\n";
      for (const b of bks) {
        csvContent += `"${b.booking_ref}","${b.customer_name}","${b.kind}","${b.destination_name}",${b.days},${b.total_amount},"${b.status}","${b.created_at}"\n`;
      }
      filename = `tripmate-bookings-${new Date().toISOString().slice(0, 10)}.csv`;
    }

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast(`Exported ${filename} successfully`, "success");
  };

  // Filtered Bank Inbox list
  const filteredBankInbox = bankInbox.filter((item) => {
    if (channelFilter === "sms") return item.channel === "sms";
    if (channelFilter === "gmail") return item.channel === "gmail";
    if (channelFilter === "pending") return item.verification_state === "ready_to_confirm" || item.verification_state === "unmatched";
    if (channelFilter === "confirmed") return item.verification_state === "confirmed";
    return true;
  });

  const pendingConfirmationCount = bankInbox.filter(
    (b) => b.verification_state === "ready_to_confirm" || b.verification_state === "unmatched"
  ).length;

  const copyToClipboard = (text: string) => {
    void navigator.clipboard.writeText(text);
    setCopiedUtr(text);
    setTimeout(() => setCopiedUtr(null), 2000);
  };

  const draftBookings = bookings.filter((b) => b.status === "pending_approval" || (b.status as string) === "draft");

  return (
    <div className="space-y-6 animate-in fade-in">
      {/* View Header with Sub-Tab Navigation */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border-hairline pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded-md bg-primary-container px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-white">
              FINTECH CORE
            </span>
            <span className="text-xs font-bold text-text-secondary">Zero-Fee UPI Reconciliation</span>
          </div>
          <h1 className="text-2xl font-black text-text-primary tracking-tight mt-1">
            Bank SMS & Payment Verification Hub
          </h1>
          <p className="text-xs text-text-secondary">
            Live real-time feed of Bank SMS & FamPay Gmail alerts, automatic trip matching, and 1-click confirmation.
          </p>
        </div>

        {/* Sub-Tab Navigation Pills */}
        <div className="flex items-center gap-1.5 rounded-xl border border-border-hairline bg-surface p-1">
          <button
            type="button"
            onClick={() => setActiveSubTab("bank_hub")}
            className={`flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-bold transition-all ${
              activeSubTab === "bank_hub"
                ? "bg-primary-container text-white shadow-xs"
                : "text-text-secondary hover:text-text-primary"
            }`}
          >
            <Smartphone className="h-3.5 w-3.5" />
            <span>Bank SMS & Gmail Hub</span>
            {pendingConfirmationCount > 0 && (
              <span className="rounded-full bg-amber-400 text-stone-900 px-1.5 py-0.2 text-[10px] font-black">
                {pendingConfirmationCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab("invoices")}
            className={`flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-bold transition-all ${
              activeSubTab === "invoices"
                ? "bg-primary-container text-white shadow-xs"
                : "text-text-secondary hover:text-text-primary"
            }`}
          >
            <FileSpreadsheet className="h-3.5 w-3.5" />
            <span>Invoices & Ledger ({payments.length})</span>
          </button>
        </div>
      </div>

      {/* SUB-TAB 1: BANK SMS & GMAIL VERIFICATION HUB */}
      {activeSubTab === "bank_hub" && (
        <div className="space-y-6">
          {/* Top Control Bar */}
          <div className="rounded-2xl border border-border-hairline bg-card-surface p-4 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            {/* Auto-Confirm Mode Switcher */}
            <div className="flex items-center gap-3">
              <div
                className={`p-2.5 rounded-xl border ${
                  isAutoConfirming
                    ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                    : "bg-amber-50 border-amber-200 text-amber-800"
                }`}
              >
                {isAutoConfirming ? <Zap className="h-5 w-5" /> : <Shield className="h-5 w-5" />}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black text-text-primary">
                    {isAutoConfirming ? "⚡ Auto-Confirm Matched Payments" : "🛡️ Manual Admin Confirm in Hub"}
                  </span>
                  <span
                    className={`rounded-full px-2 py-0.2 text-[10px] font-extrabold uppercase border ${
                      isAutoConfirming
                        ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                        : "bg-amber-50 text-amber-800 border-amber-200"
                    }`}
                  >
                    {isAutoConfirming ? "ACTIVE" : "STANDBY"}
                  </span>
                </div>
                <p className="text-[11px] text-text-secondary mt-0.5">
                  {isAutoConfirming
                    ? "Incoming SMS/Gmail alerts with matching ₹ amounts automatically confirm trips in <3 seconds."
                    : "Incoming alerts are queued in this Hub for 1-click Admin verification before issuing tickets."}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              <button
                type="button"
                disabled={togglingAutoConfirm}
                onClick={handleToggleAutoConfirm}
                className="flex items-center gap-1.5 rounded-xl border border-border-hairline bg-surface hover:bg-surface-container-low px-3 py-1.5 text-xs font-bold text-text-primary shadow-xs disabled:opacity-50"
              >
                <span>Switch to {isAutoConfirming ? "Manual Admin Confirm" : "Auto-Confirm"}</span>
              </button>

              {/* Filter Pills */}
              <div className="flex items-center gap-1 rounded-xl border border-border-hairline bg-surface p-1">
                {(
                  [
                    { id: "all", label: "All Alerts" },
                    { id: "sms", label: "📱 SMS" },
                    { id: "gmail", label: "✉️ Gmail" },
                    { id: "pending", label: "⏳ Needs Confirm" },
                    { id: "confirmed", label: "✓ Confirmed" },
                  ] as const
                ).map((pill) => (
                  <button
                    key={pill.id}
                    type="button"
                    onClick={() => setChannelFilter(pill.id)}
                    className={`rounded-lg px-2.5 py-1 text-[11px] font-bold transition-all ${
                      channelFilter === pill.id
                        ? "bg-text-primary text-surface"
                        : "text-text-secondary hover:text-text-primary"
                    }`}
                  >
                    {pill.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* PANEL 1: Live Bank SMS & Gmail Feeds (Left Column, 7 cols) */}
            <div className="lg:col-span-7 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-emerald-700 animate-pulse" />
                  <h2 className="text-sm font-black text-text-primary tracking-tight uppercase">
                    Live Verified Bank Stream ({filteredBankInbox.length})
                  </h2>
                </div>
                <span className="text-[11px] text-text-secondary">Strict Bank/UPI signatures only</span>
              </div>

              {filteredBankInbox.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-border-hairline bg-surface p-8 text-center">
                  <Smartphone className="h-8 w-8 text-text-secondary mx-auto mb-2 opacity-50" />
                  <h3 className="text-xs font-bold text-text-primary">No Bank Alerts in this filter</h3>
                  <p className="text-[11px] text-text-secondary mt-1 max-w-sm mx-auto">
                    Use the 1-Click Simulator on the right to test incoming FamPay SMS or Bank Gmail alerts right now!
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredBankInbox.map((item) => {
                    const matchedBooking = bookings.find((b) => b.id === item.matched_trip_id);
                    const isConfirmed = item.verification_state === "confirmed";

                    return (
                      <div
                        key={item.id}
                        className="rounded-2xl border border-border-hairline bg-card-surface p-4 shadow-xs transition-all hover:border-text-primary/20 space-y-3"
                      >
                        {/* Header: Channel, Bank Name, Timestamp */}
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span
                              className={`flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-black uppercase tracking-wider ${
                                item.channel === "sms"
                                  ? "bg-sky-50 text-sky-800 border border-sky-200"
                                  : "bg-amber-50 text-amber-800 border border-amber-200"
                              }`}
                            >
                              {item.channel === "sms" ? <Smartphone className="h-3 w-3" /> : <Mail className="h-3 w-3" />}
                              <span>{item.channel === "sms" ? "BANK SMS" : "GMAIL ALERT"}</span>
                            </span>

                            <span className="flex items-center gap-1 rounded-md bg-surface px-2 py-0.5 text-[10px] font-bold text-text-primary border border-border-hairline">
                              <Building2 className="h-2.5 w-2.5 text-text-secondary" />
                              <span>{item.sender}</span>
                            </span>
                          </div>

                          <span className="text-[10px] text-text-secondary font-mono">
                            {new Date(item.created_at).toLocaleTimeString("en-IN", {
                              hour: "2-digit",
                              minute: "2-digit",
                              second: "2-digit",
                            })}
                          </span>
                        </div>

                        {/* Financial Attributes: Amount & 12-Digit UTR */}
                        <div className="flex items-baseline justify-between gap-4 border-y border-border-hairline/60 py-2">
                          <div>
                            <span className="text-[10px] font-extrabold uppercase tracking-wider text-text-secondary block">
                              Credited Amount
                            </span>
                            <span className="text-xl font-black text-text-primary tabular-nums font-mono">
                              ₹{item.amount.toLocaleString("en-IN")}
                            </span>
                          </div>

                          <div className="text-right">
                            <span className="text-[10px] font-extrabold uppercase tracking-wider text-text-secondary block">
                              12-Digit UPI UTR
                            </span>
                            <div className="flex items-center gap-1 justify-end">
                              <span className="font-mono text-xs font-bold text-text-primary tracking-wider bg-surface px-2 py-0.5 rounded border border-border-hairline tabular-nums">
                                {item.utr_number}
                              </span>
                              <button
                                type="button"
                                onClick={() => copyToClipboard(item.utr_number)}
                                className="p-1 rounded hover:bg-surface text-text-secondary hover:text-text-primary transition-colors"
                                title="Copy 12-digit UTR"
                              >
                                {copiedUtr === item.utr_number ? (
                                  <Check className="h-3 w-3 text-emerald-700" />
                                ) : (
                                  <Copy className="h-3 w-3" />
                                )}
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Raw Monospace Snippet Box */}
                        <div className="rounded-xl border border-border-hairline bg-surface-container-low/50 p-2.5">
                          {item.subject && (
                            <div className="text-[11px] font-bold text-text-primary mb-1 truncate">
                              Subj: {item.subject}
                            </div>
                          )}
                          <p className="font-mono text-[11px] text-text-secondary leading-relaxed break-all">
                            {item.raw_body}
                          </p>
                          {item.payer_vpa && (
                            <div className="mt-1 text-[10px] font-bold text-text-primary">
                              Payer VPA: <span className="font-mono text-primary-container">{item.payer_vpa}</span>
                            </div>
                          )}
                        </div>

                        {/* Matched Booking Box & Action */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                          <div className="text-xs">
                            {matchedBooking ? (
                              <div className="flex items-center gap-2">
                                <span className="rounded bg-primary-container/10 px-1.5 py-0.5 font-mono text-[10px] font-bold text-primary-container border border-primary-container/20">
                                  {matchedBooking.booking_ref}
                                </span>
                                <span className="font-semibold text-text-primary truncate max-w-[180px]">
                                  {matchedBooking.customer_name}
                                </span>
                                <span className="text-[10px] text-text-secondary">
                                  ({matchedBooking.destination_name} · ₹{matchedBooking.total_amount.toLocaleString("en-IN")})
                                </span>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1.5">
                                <AlertCircle className="h-3.5 w-3.5 text-amber-600" />
                                <span className="text-[11px] text-text-secondary">Unmatched booking. Link to:</span>
                                <select
                                  value={selectedTripOverrides[item.id] || ""}
                                  onChange={(e) =>
                                    setSelectedTripOverrides((prev) => ({
                                      ...prev,
                                      [item.id]: e.target.value,
                                    }))
                                  }
                                  className="text-[11px] font-bold rounded-lg border border-border-hairline bg-surface px-2 py-1 text-text-primary"
                                >
                                  <option value="">Select Pending Trip...</option>
                                  {draftBookings.map((b) => (
                                    <option key={b.id} value={b.id}>
                                      {b.booking_ref} - {b.customer_name} (₹{b.total_amount})
                                    </option>
                                  ))}
                                </select>
                              </div>
                            )}
                          </div>

                          <div>
                            {isConfirmed ? (
                              <span className="flex items-center gap-1.5 rounded-xl bg-emerald-50 px-3 py-1.5 text-xs font-black text-emerald-800 border border-emerald-300">
                                <CheckCircle2 className="h-3.5 w-3.5" />
                                <span>Payment Confirmed</span>
                              </span>
                            ) : (
                              <button
                                type="button"
                                disabled={processingId === item.id}
                                onClick={() => handleConfirmBankMessage(item.id, item.matched_trip_id)}
                                className="flex items-center gap-1.5 rounded-xl bg-primary-container hover:bg-primary-container/90 px-3.5 py-1.5 text-xs font-black text-white shadow-xs disabled:opacity-50 transition-colors"
                              >
                                <Check className="h-3.5 w-3.5" />
                                <span>Confirm Payment & Issue Voucher</span>
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* PANEL 2: Internal Paste Console & 1-Click Live Simulator (Right Column, 5 cols) */}
            <div className="lg:col-span-5 space-y-4">
              {/* Internal Paste Console */}
              <div className="rounded-2xl border border-border-hairline bg-card-surface p-5 shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Send className="h-4 w-4 text-primary-container" />
                    <h2 className="text-xs font-black uppercase tracking-wider text-text-primary">
                      Paste Bank SMS / FamPay Email
                    </h2>
                  </div>
                  <span className="text-[10px] text-text-secondary">Self-Contained in /admin</span>
                </div>

                <p className="text-[11px] text-text-secondary leading-relaxed">
                  Paste raw Bank SMS or FamPay alert text below. The gatekeeper verifies the sender and amount, matches the booking, and records it immediately.
                </p>

                <form onSubmit={handleIngestManual} className="space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold text-text-secondary">Channel:</span>
                    <div className="flex rounded-lg border border-border-hairline bg-surface p-0.5">
                      <button
                        type="button"
                        onClick={() => setPasteChannel("sms")}
                        className={`rounded px-2.5 py-1 text-[11px] font-bold ${
                          pasteChannel === "sms" ? "bg-text-primary text-surface" : "text-text-secondary"
                        }`}
                      >
                        📱 SMS
                      </button>
                      <button
                        type="button"
                        onClick={() => setPasteChannel("gmail")}
                        className={`rounded px-2.5 py-1 text-[11px] font-bold ${
                          pasteChannel === "gmail" ? "bg-text-primary text-surface" : "text-text-secondary"
                        }`}
                      >
                        ✉️ Gmail
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      placeholder={pasteChannel === "sms" ? "Sender (e.g. AX-FAMPAY)" : "Sender (e.g. no-reply@fampay.in)"}
                      value={pasteSender}
                      onChange={(e) => setPasteSender(e.target.value)}
                      className="w-full rounded-xl border border-border-hairline bg-surface px-3 py-2 text-xs font-mono text-text-primary placeholder:text-text-secondary/50 focus:outline-hidden focus:border-text-primary"
                    />

                    {pasteChannel === "gmail" && (
                      <input
                        type="text"
                        placeholder="Subject Line"
                        value={pasteSubject}
                        onChange={(e) => setPasteSubject(e.target.value)}
                        className="w-full rounded-xl border border-border-hairline bg-surface px-3 py-2 text-xs text-text-primary placeholder:text-text-secondary/50 focus:outline-hidden focus:border-text-primary"
                      />
                    )}
                  </div>

                  <textarea
                    rows={4}
                    placeholder="Paste raw bank SMS or FamPay credit text here..."
                    value={pasteBody}
                    onChange={(e) => setPasteBody(e.target.value)}
                    className="w-full rounded-xl border border-border-hairline bg-surface p-3 font-mono text-xs text-text-primary placeholder:text-text-secondary/50 focus:outline-hidden focus:border-text-primary leading-relaxed"
                  />

                  <button
                    type="submit"
                    disabled={isIngestingManual || !pasteBody.trim()}
                    className="w-full flex items-center justify-center gap-2 rounded-xl bg-primary-container hover:bg-primary-container/90 py-2.5 text-xs font-black text-white shadow-xs disabled:opacity-50 transition-colors"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    <span>{isIngestingManual ? "Verifying with Gatekeeper..." : "Parse & Verify in System"}</span>
                  </button>
                </form>
              </div>

              {/* 1-Click Live Simulator Box */}
              <div className="rounded-2xl border border-border-hairline bg-card-surface p-5 shadow-xs space-y-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-emerald-700" />
                  <h3 className="text-xs font-black uppercase tracking-wider text-text-primary">
                    1-Click Live Simulators
                  </h3>
                </div>
                <p className="text-[11px] text-text-secondary">
                  Trigger pre-configured authentic credit alerts matched to active draft trips with real 12-digit UTRs:
                </p>

                <div className="space-y-2 pt-1">
                  <button
                    type="button"
                    disabled={isIngestingManual}
                    onClick={() => handleRunSimulation("fampay_sms")}
                    className="w-full flex items-center justify-between rounded-xl border border-border-hairline bg-surface hover:bg-surface-container-low p-2.5 text-left text-xs transition-colors shadow-xs"
                  >
                    <div className="flex items-center gap-2">
                      <span className="rounded bg-sky-50 px-1.5 py-0.5 text-[10px] font-black text-sky-800 border border-sky-200">
                        📱 SMS
                      </span>
                      <span className="font-bold text-text-primary">FamPay Credit SMS</span>
                    </div>
                    <span className="text-[10px] font-mono text-primary-container font-black">9664340734@fam</span>
                  </button>

                  <button
                    type="button"
                    disabled={isIngestingManual}
                    onClick={() => handleRunSimulation("sbi_sms")}
                    className="w-full flex items-center justify-between rounded-xl border border-border-hairline bg-surface hover:bg-surface-container-low p-2.5 text-left text-xs transition-colors shadow-xs"
                  >
                    <div className="flex items-center gap-2">
                      <span className="rounded bg-sky-50 px-1.5 py-0.5 text-[10px] font-black text-sky-800 border border-sky-200">
                        📱 SMS
                      </span>
                      <span className="font-bold text-text-primary">SBI UPI Credit SMS</span>
                    </div>
                    <span className="text-[10px] font-mono text-text-secondary font-bold">State Bank</span>
                  </button>

                  <button
                    type="button"
                    disabled={isIngestingManual}
                    onClick={() => handleRunSimulation("fampay_email")}
                    className="w-full flex items-center justify-between rounded-xl border border-border-hairline bg-surface hover:bg-surface-container-low p-2.5 text-left text-xs transition-colors shadow-xs"
                  >
                    <div className="flex items-center gap-2">
                      <span className="rounded bg-amber-50 px-1.5 py-0.5 text-[10px] font-black text-amber-800 border border-amber-200">
                        ✉️ GMAIL
                      </span>
                      <span className="font-bold text-text-primary">FamPay Transaction Alert</span>
                    </div>
                    <span className="text-[10px] font-mono text-text-secondary font-bold">Gmail</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 2: INVOICES & RECONCILIATION LEDGER */}
      {activeSubTab === "invoices" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-black text-text-primary tracking-tight">
                GST-Compliant Invoices & Financial Ledger
              </h2>
              <p className="text-xs text-text-secondary">
                Official billing ledger, sequence-numbered GST invoices, and role-audited exports (§3.A, §3.C)
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
      )}
    </div>
  );
}
