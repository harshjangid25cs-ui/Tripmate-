"use client";

import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { AdminService } from "@/lib/admin/admin-service";
import { useAdmin } from "@/lib/admin/admin-context";
import { useRealtimeTableSync } from "@/lib/supabase/use-realtime-sync";
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
  Settings2,
  Code2,
  ChevronDown,
  ChevronUp,
  Calendar,
  Receipt,
  RotateCw,
} from "lucide-react";
import {
  adminVerifyUpiPaymentAction,
  adminIngestManualBankMessageAction,
  adminConfirmBankInboxPaymentAction,
  adminToggleBankAutoConfirmAction,
  adminUpdateBankAlertConfigAction,
  fetchLatestBankInboxAndPaymentsAction,
} from "@/lib/actions/admin-ops";

export const sortByLatestTimestamp = <T extends { created_at?: string | null; confirmed_at?: string | null }>(
  items: T[]
): T[] =>
  [...items].sort((a, b) => {
    const timeB = new Date(b.created_at || b.confirmed_at || 0).getTime();
    const timeA = new Date(a.created_at || a.confirmed_at || 0).getTime();
    return timeB - timeA; // Strictly newest date & time at index 0 (TOP)
  });

export function formatIstTimestamp(timestamp?: string | null): string {
  if (!timestamp) return "—";
  const d = new Date(timestamp);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
}

export function isJustNow(timestamp?: string | null): boolean {
  if (!timestamp) return false;
  const t = new Date(timestamp).getTime();
  if (isNaN(t)) return false;
  const diff = Date.now() - t;
  return diff >= 0 && diff < 5 * 60 * 1000;
}

export function PaymentsView() {
  const { currentAdmin, hasPermission, toast, refreshOperationalData } = useAdmin();
  const router = useRouter();
  const bankStreamContainerRef = useRef<HTMLDivElement>(null);
  const [isRefreshingLatest, setIsRefreshingLatest] = useState(false);

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
  const [dateFilter, setDateFilter] = useState<"1m" | "3m" | "6m" | "all">("1m");
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

  // Channel Ingestion Settings State
  const [bankAlertEmail, setBankAlertEmail] = useState(pricing.bank_alert_email || "tripmateoffical007@gmail.com");
  const [bankAlertPhone, setBankAlertPhone] = useState(pricing.bank_alert_phone || "9664340734");
  const [isEditingChannels, setIsEditingChannels] = useState(false);
  const [isSavingChannels, setIsSavingChannels] = useState(false);
  const [showSetupGuide, setShowSetupGuide] = useState(false);
  const [copiedScript, setCopiedScript] = useState(false);
  const [copiedSmsFormat, setCopiedSmsFormat] = useState(false);

  // Live Webhook Status & Diagnostics State
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(() => new Date());
  const [isTestingWebhook, setIsTestingWebhook] = useState(false);

  const canExport = hasPermission("payments_export");

  // Dedicated direct live fetch action for instantaneous DB updates
  const fetchLatest = useCallback(async (showToast = false) => {
    try {
      const res = await fetchLatestBankInboxAndPaymentsAction();
      if (res.ok) {
        if (res.bankInbox) {
          setBankInbox(res.bankInbox);
        }
        if (res.payments) {
          setPayments(res.payments);
        }
        AdminService.hydrateOperationalData({
          bankMessagesInbox: res.bankInbox,
          payments: res.payments,
        });
        setLastSyncTime(new Date());
        if (showToast) {
          toast("Latest bank alerts and payments synchronized", "success");
        }
      }
    } catch {
      // Non-blocking fallback
    }
  }, [toast]);

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

  // Synchronize state with AdminService on mount
  useEffect(() => {
    setBankInbox(AdminService.getBankMessagesInbox());
    setPayments(AdminService.getPayments());
  }, []);

  // Lightweight 5-second automatic polling fallback in addition to Realtime
  useEffect(() => {
    void fetchLatest();

    const intervalId = setInterval(() => {
      void fetchLatest();
    }, 5000);

    return () => clearInterval(intervalId);
  }, [fetchLatest]);

  const refreshAll = async () => {
    setPayments(AdminService.getPayments());
    setBankInbox(AdminService.getBankMessagesInbox());
    setBookings(AdminService.getBookings());
    setPricing(AdminService.getPricing());
    await refreshOperationalData();
  };

  // Instant Supabase Realtime synchronization for PaymentsView
  useRealtimeTableSync(["bank_messages_inbox", "payments", "trips"], {
    onEvent: () => {
      void fetchLatest();
      refreshAll();
    },
    debounceMs: 300,
  });

  const handleRefreshLatest = async () => {
    setIsRefreshingLatest(true);
    try {
      await fetchLatest();
      await refreshAll();
      router.refresh();
      if (bankStreamContainerRef.current) {
        bankStreamContainerRef.current.scrollTop = 0;
      }
      toast("Refreshed latest bank alerts and payment transactions", "success");
    } finally {
      setIsRefreshingLatest(false);
    }
  };

  useEffect(() => {
    if (pricing.bank_alert_email) setBankAlertEmail(pricing.bank_alert_email);
    if (pricing.bank_alert_phone) setBankAlertPhone(pricing.bank_alert_phone);
  }, [pricing.bank_alert_email, pricing.bank_alert_phone]);

  const handleSaveBankAlertConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingChannels(true);
    try {
      const res = await adminUpdateBankAlertConfigAction({
        bankAlertEmail,
        bankAlertPhone,
      });
      if (res.ok) {
        toast("Bank alert email and phone configuration updated successfully", "success");
        setIsEditingChannels(false);
        await refreshAll();
      } else {
        toast(res.error || "Failed to update configuration", "error");
      }
    } catch {
      toast("Error saving bank alert configuration", "error");
    } finally {
      setIsSavingChannels(false);
    }
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
        receivedAt: new Date().toISOString(),
      });

      if (res.ok) {
        toast(res.message || "Bank payment verified and ingested!", "success");
        setPasteBody("");
        setPasteSender("");
        setPasteSubject("");
        await fetchLatest();
        await refreshAll();
        if (bankStreamContainerRef.current) {
          bankStreamContainerRef.current.scrollTop = 0;
        }
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
    // Always generate brand-new unique 12-digit UTR and fresh timestamp so it immediately lands at Row #1
    const randomUtr = Date.now().toString().slice(-12);
    const nowTimestamp = new Date().toISOString();

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
        receivedAt: nowTimestamp,
      });

      if (res.ok) {
        toast(res.message || "Simulated Bank alert ingested successfully!", "success");
        setPasteBody("");
        setPasteSender("");
        setPasteSubject("");
        await fetchLatest();
        await refreshAll();
        if (bankStreamContainerRef.current) {
          bankStreamContainerRef.current.scrollTop = 0;
        }
      } else {
        toast(res.error || "Simulation rejected", "error");
      }
    } catch {
      toast("Error running simulation", "error");
    } finally {
      setIsIngestingManual(false);
    }
  };

  // Real HTTP Webhook Roundtrip Test
  const handleTestWebhookRoundtrip = async () => {
    setIsTestingWebhook(true);
    try {
      const testUtr = Date.now().toString().slice(-12);
      const testAmount = 2499;
      const secret = pricing.bank_webhook_secret || "tm_internal_bank_secret_2026";
      const payload = {
        sender: "FamPay Alerts <no-reply@fampay.in>",
        subject: `Payment Received: INR ${testAmount.toLocaleString("en-IN")} credited to your account`,
        body: `Payment of INR ${testAmount}.00 received from live_test@upi via FamPay. UPI Ref: ${testUtr}. Note: TM-TEST. Live diagnostic roundtrip test successful.`,
        receivedAt: new Date().toISOString(),
      };

      const res = await fetch("/api/webhooks/bank-email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-webhook-secret": secret,
        },
        body: JSON.stringify(payload),
      });

      const json = (await res.json()) as { ok?: boolean; error?: string; reason?: string };

      if (res.ok && json.ok) {
        await fetchLatest();
        await refreshAll();
        if (bankStreamContainerRef.current) {
          bankStreamContainerRef.current.scrollTop = 0;
        }
        toast(`⚡ Webhook Roundtrip Verified! 100% Connected. Transaction (UTR: ${testUtr}) at Row #1.`, "success");
      } else {
        toast(`Webhook failed (HTTP ${res.status}): ${json.error || json.reason || "Check secret or payload"}`, "error");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Network error testing webhook";
      toast(`Webhook roundtrip test failed: ${msg}`, "error");
    } finally {
      setIsTestingWebhook(false);
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

  // Date cutoff calculation
  const getDateCutoff = (filter: "1m" | "3m" | "6m" | "all"): number => {
    const now = Date.now();
    if (filter === "1m") return now - 30 * 24 * 60 * 60 * 1000;
    if (filter === "3m") return now - 90 * 24 * 60 * 60 * 1000;
    if (filter === "6m") return now - 180 * 24 * 60 * 60 * 1000;
    return 0; // "all"
  };

  const cutoff = getDateCutoff(dateFilter);

  // 1. Arrange latest payments on top in decreasing chronological order
  const sortedPayments = useMemo(() => {
    return sortByLatestTimestamp(payments);
  }, [payments]);

  // 2. Filter payments by selected date range (1 month default)
  const filteredPayments = useMemo(() => {
    return sortedPayments.filter((p) => {
      if (cutoff === 0) return true;
      if (!p.created_at) return true;
      const t = new Date(p.created_at).getTime();
      return !isNaN(t) && t >= cutoff;
    });
  }, [sortedPayments, cutoff]);

  // 3. Arrange latest bank alerts on top in decreasing chronological order
  const sortedBankInbox = useMemo(() => {
    return sortByLatestTimestamp(bankInbox);
  }, [bankInbox]);

  // 4. Filter bank alerts by channel and selected date range
  const filteredBankInbox = useMemo(() => {
    return sortedBankInbox.filter((item) => {
      if (channelFilter === "sms" && item.channel !== "sms") return false;
      if (channelFilter === "gmail" && item.channel !== "gmail") return false;
      if (
        channelFilter === "pending" &&
        !(item.verification_state === "ready_to_confirm" || item.verification_state === "unmatched")
      )
        return false;
      if (channelFilter === "confirmed" && item.verification_state !== "confirmed") return false;

      if (cutoff !== 0 && item.created_at) {
        const t = new Date(item.created_at).getTime();
        if (!isNaN(t) && t < cutoff) return false;
      }
      return true;
    });
  }, [sortedBankInbox, channelFilter, cutoff]);

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
      for (const p of filteredPayments) {
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
            <span>Invoices & Ledger ({filteredPayments.length})</span>
          </button>
        </div>
      </div>

      {/* Date Range Filter Bar (1 Month default, 3 Months, 6 Months, All Time) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-border-hairline bg-card-surface px-4 py-3 shadow-xs">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-primary-container" />
          <span className="text-xs font-black uppercase tracking-wider text-text-primary">
            Payment Period:
          </span>
          <span className="text-[11px] text-text-secondary">
            (Arranged Latest on Top ↓)
          </span>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            type="button"
            onClick={() => setDateFilter("1m")}
            className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-all border ${
              dateFilter === "1m"
                ? "bg-primary-container text-white border-primary-container shadow-xs"
                : "bg-surface text-text-secondary border-border-hairline hover:text-text-primary hover:bg-card-surface"
            }`}
          >
            1 Month (Default)
          </button>
          <button
            type="button"
            onClick={() => setDateFilter("3m")}
            className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-all border ${
              dateFilter === "3m"
                ? "bg-primary-container text-white border-primary-container shadow-xs"
                : "bg-surface text-text-secondary border-border-hairline hover:text-text-primary hover:bg-card-surface"
            }`}
          >
            3 Months
          </button>
          <button
            type="button"
            onClick={() => setDateFilter("6m")}
            className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-all border ${
              dateFilter === "6m"
                ? "bg-primary-container text-white border-primary-container shadow-xs"
                : "bg-surface text-text-secondary border-border-hairline hover:text-text-primary hover:bg-card-surface"
            }`}
          >
            6 Months
          </button>
          <button
            type="button"
            onClick={() => setDateFilter("all")}
            className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-all border ${
              dateFilter === "all"
                ? "bg-primary-container text-white border-primary-container shadow-xs"
                : "bg-surface text-text-secondary border-border-hairline hover:text-text-primary hover:bg-card-surface"
            }`}
          >
            All Time
          </button>
        </div>
      </div>

      {/* SUB-TAB 1: BANK SMS & GMAIL VERIFICATION HUB */}
      {activeSubTab === "bank_hub" && (
        <div className="space-y-6">
          {/* Live Webhook Diagnostic Status Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-border-hairline bg-[#FFFFFF] px-4 py-3 shadow-xs">
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-1.5">
                <div className="h-2.5 w-2.5 rounded-full bg-emerald-600 animate-pulse" />
                <span className="text-xs font-black text-text-primary tracking-tight">
                  Bank Hub Pipeline: LIVE
                </span>
              </div>

              <div className="h-4 w-px bg-border-hairline hidden sm:block" />

              <div className="flex items-center gap-1.5 text-xs text-text-secondary">
                <span className="font-bold text-text-primary">{bankInbox.length}</span>
                <span>Total Bank Alerts in DB</span>
              </div>

              <div className="h-4 w-px bg-border-hairline hidden sm:block" />

              <div className="flex items-center gap-1.5 text-xs text-text-secondary">
                <span>Last Synced:</span>
                <span className="font-mono font-bold text-text-primary">
                  {lastSyncTime
                    ? lastSyncTime.toLocaleTimeString("en-IN", { timeZone: "Asia/Kolkata", hour12: false }) + " IST"
                    : "Syncing..."}
                </span>
              </div>
            </div>

            <button
              type="button"
              disabled={isTestingWebhook}
              onClick={handleTestWebhookRoundtrip}
              className="flex items-center gap-1.5 rounded-xl border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 text-xs font-bold text-emerald-900 transition-colors shadow-xs disabled:opacity-50"
            >
              <Zap className={`h-3.5 w-3.5 text-emerald-700 ${isTestingWebhook ? "animate-spin" : ""}`} />
              <span>{isTestingWebhook ? "Verifying Roundtrip..." : "⚡ Test Live Webhook Roundtrip"}</span>
            </button>
          </div>

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

          {/* Active Ingestion Channels & Setup Bar */}
          <div className="rounded-2xl border border-border-hairline bg-card-surface p-4 shadow-xs">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-border-hairline">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-primary-container text-white">
                  <Smartphone className="h-4 w-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-xs font-black text-text-primary tracking-tight">
                      Bank Tracking Channels & KYC Ingestion
                    </h3>
                    <span className="rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 px-2 py-0.2 text-[9px] font-black uppercase">
                      Active
                    </span>
                  </div>
                  <p className="text-[11px] text-text-secondary">
                    Directly linked to your merchant bank account & SIM card. Easily customize for separate bank inboxes.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => setIsEditingChannels(!isEditingChannels)}
                  className="flex items-center gap-1.5 rounded-xl border border-border-hairline bg-surface hover:bg-surface-container-low px-3 py-1.5 text-xs font-bold text-text-primary transition-colors shadow-xs"
                >
                  <Settings2 className="h-3.5 w-3.5" />
                  <span>{isEditingChannels ? "Cancel" : "Configure Separate Bank Email / Phone"}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowSetupGuide(!showSetupGuide)}
                  className="flex items-center gap-1.5 rounded-xl border border-border-hairline bg-primary-container text-white px-3 py-1.5 text-xs font-bold transition-colors shadow-xs"
                >
                  <Code2 className="h-3.5 w-3.5" />
                  <span>{showSetupGuide ? "Hide Setup Guide" : "1-Click Setup Guide & Scripts"}</span>
                  {showSetupGuide ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                </button>
              </div>
            </div>

            {/* Display / Edit Form */}
            {isEditingChannels ? (
              <form onSubmit={handleSaveBankAlertConfig} className="pt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-text-primary mb-1">
                    Separate Bank / FamPay Alert Gmail
                  </label>
                  <input
                    type="email"
                    required
                    value={bankAlertEmail}
                    onChange={(e) => setBankAlertEmail(e.target.value)}
                    placeholder="e.g. finance@tripmate.in or your.personal@gmail.com"
                    className="w-full rounded-xl border border-border-hairline bg-surface px-3 py-2 text-xs font-mono text-text-primary focus:border-primary-container focus:outline-hidden"
                  />
                  <p className="text-[10px] text-text-secondary mt-1">
                    Where your bank/FamPay sends transaction alert emails. Does NOT need to be your admin login.
                  </p>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-text-primary mb-1">
                    Bank Registered Mobile Number (SMS Alerts)
                  </label>
                  <div className="flex items-center gap-2">
                    <span className="rounded-xl border border-border-hairline bg-surface px-3 py-2 text-xs font-mono text-text-secondary">
                      +91
                    </span>
                    <input
                      type="tel"
                      required
                      value={bankAlertPhone}
                      onChange={(e) => setBankAlertPhone(e.target.value)}
                      placeholder="10-digit mobile number"
                      className="w-full rounded-xl border border-border-hairline bg-surface px-3 py-2 text-xs font-mono text-text-primary focus:border-primary-container focus:outline-hidden"
                    />
                  </div>
                  <p className="text-[10px] text-text-secondary mt-1">
                    Mobile SIM card receiving AX-FAMPAY, SBIBNK, or HDFCBK credit SMS.
                  </p>
                </div>

                <div className="sm:col-span-2 flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setIsEditingChannels(false)}
                    className="rounded-xl border border-border-hairline bg-surface px-3.5 py-1.5 text-xs font-bold text-text-secondary hover:text-text-primary"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSavingChannels}
                    className="rounded-xl bg-primary-container px-4 py-1.5 text-xs font-bold text-white shadow-xs hover:opacity-90 disabled:opacity-50"
                  >
                    {isSavingChannels ? "Saving..." : "Save Bank Channels"}
                  </button>
                </div>
              </form>
            ) : (
              <div className="pt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {/* Mobile Card */}
                <div className="rounded-xl border border-border-hairline bg-surface p-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-bold text-text-secondary uppercase tracking-wider">
                      Bank SMS Phone
                    </span>
                    <span className="rounded bg-sky-50 border border-sky-200 text-sky-800 text-[9px] font-black px-1.5 py-0.2">
                      📱 SIM CARD
                    </span>
                  </div>
                  <div className="text-sm font-black font-mono text-text-primary">
                    +91 {pricing.bank_alert_phone || "9664340734"}
                  </div>
                  <div className="text-[10px] text-text-secondary mt-1">
                    Receives incoming credit alerts (AX-FAMPAY, SBIBNK, etc.)
                  </div>
                </div>

                {/* Gmail Card */}
                <div className="rounded-xl border border-border-hairline bg-surface p-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-bold text-text-secondary uppercase tracking-wider">
                      Bank Alert Gmail
                    </span>
                    <span className="rounded bg-amber-50 border border-amber-200 text-amber-800 text-[9px] font-black px-1.5 py-0.2">
                      ✉️ GMAIL INBOX
                    </span>
                  </div>
                  <div className="text-sm font-black font-mono text-text-primary truncate">
                    {pricing.bank_alert_email || "tripmateoffical007@gmail.com"}
                  </div>
                  <div className="text-[10px] text-text-secondary mt-1">
                    Receives FamPay / Bank payment confirmation emails
                  </div>
                </div>

                {/* UPI QR VPA */}
                <div className="rounded-xl border border-border-hairline bg-surface p-3 sm:col-span-2 lg:col-span-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-bold text-text-secondary uppercase tracking-wider">
                      Active Payee UPI VPA
                    </span>
                    <span className="rounded bg-emerald-50 border border-emerald-200 text-emerald-800 text-[9px] font-black px-1.5 py-0.2">
                      ⚡ PAYEE VPA
                    </span>
                  </div>
                  <div className="text-sm font-black font-mono text-text-primary">
                    {pricing.merchant_upi_vpa || "9664340734@fam"}
                  </div>
                  <div className="text-[10px] text-text-secondary mt-1">
                    Target UPI QR destination for customers on checkout
                  </div>
                </div>
              </div>
            )}

            {/* Expandable Setup Guide & Scripts */}
            {showSetupGuide && (
              <div className="mt-4 pt-4 border-t border-border-hairline space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* SMS Setup Instructions */}
                  <div className="rounded-xl border border-border-hairline bg-surface p-3.5 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="rounded bg-sky-50 border border-sky-200 text-sky-800 px-1.5 py-0.5 text-[10px] font-black">
                          📱 Mobile SMS Setup
                        </span>
                        <span className="text-xs font-bold text-text-primary">Android Forwarder</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          const conf = JSON.stringify(
                            {
                              url: `${typeof window !== "undefined" ? window.location.origin : "https://tripmate.in"}/api/webhooks/bank-sms`,
                              headers: { "x-sms-secret": "tm_internal_bank_secret_2026" },
                              body: { sender: "%from%", message: "%text%" },
                            },
                            null,
                            2
                          );
                          void navigator.clipboard.writeText(conf);
                          setCopiedSmsFormat(true);
                          setTimeout(() => setCopiedSmsFormat(false), 2000);
                        }}
                        className="flex items-center gap-1 rounded bg-surface hover:bg-surface-container-low border border-border-hairline px-2 py-1 text-[10px] font-bold text-text-primary shadow-xs"
                      >
                        {copiedSmsFormat ? <Check className="h-3 w-3 text-emerald-700" /> : <Copy className="h-3 w-3" />}
                        <span>{copiedSmsFormat ? "Copied" : "Copy Config"}</span>
                      </button>
                    </div>

                    <ol className="text-[11px] text-text-secondary space-y-1.5 list-decimal pl-4">
                      <li>Install any free <strong>SMS Forwarder</strong> app on phone <strong>+91 {pricing.bank_alert_phone || "9664340734"}</strong>.</li>
                      <li>Set Target Webhook URL: <code className="bg-card-surface px-1 py-0.5 rounded border border-border-hairline text-text-primary font-mono text-[10px]">{typeof window !== "undefined" ? window.location.origin : "https://tripmate.in"}/api/webhooks/bank-sms</code></li>
                      <li>Set HTTP Header: <code className="bg-card-surface px-1 py-0.5 rounded border border-border-hairline text-text-primary font-mono text-[10px]">x-sms-secret: tm_internal_bank_secret_2026</code></li>
                      <li>Payload Template: <code className="bg-card-surface px-1 py-0.5 rounded border border-border-hairline text-text-primary font-mono text-[10px]">&#123;&quot;sender&quot;: &quot;%from%&quot;, &quot;message&quot;: &quot;%text%&quot;&#125;</code></li>
                    </ol>
                  </div>

                  {/* Gmail Setup Instructions */}
                  <div className="rounded-xl border border-border-hairline bg-surface p-3.5 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="rounded bg-amber-50 border border-amber-200 text-amber-800 px-1.5 py-0.5 text-[10px] font-black">
                          ✉️ Gmail Cloud Setup
                        </span>
                        <span className="text-xs font-bold text-text-primary">Google Apps Script</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          const script = `/**
 * TripMate Bank & FamPay Gmail Forwarder
 * Runs inside ${pricing.bank_alert_email || "tripmateoffical007@gmail.com"}
 */
const TRIPMATE_WEBHOOK_URL = "${typeof window !== "undefined" ? window.location.origin : "https://tripmate.in"}/api/webhooks/bank-email";
const WEBHOOK_SECRET = "tm_internal_bank_secret_2026";

function forwardBankEmailsToTripMate() {
  // Only inspect unread emails from recognized bank/fintech domains with credit/payment subjects
  const query = 'is:unread (from:fampay.in OR from:famapp.in OR from:hdfcbank.net OR from:sbi.co.in OR from:icicibank.com OR from:axisbank.com OR from:kotak.com) (subject:"credited" OR subject:"received" OR subject:"credit" OR subject:"payment")';
  const threads = GmailApp.search(query, 0, 10);
  Logger.log("Found " + threads.length + " unread bank credit threads.");

  for (let i = 0; i < threads.length; i++) {
    const msgs = threads[i].getMessages();
    for (let j = 0; j < msgs.length; j++) {
      const msg = msgs[j];
      if (msg.isUnread()) {
        const payload = {
          from: msg.getFrom(),
          subject: msg.getSubject(),
          body: msg.getPlainBody() || msg.getBody()
        };
        const options = {
          method: "post",
          contentType: "application/json",
          headers: { "x-webhook-secret": WEBHOOK_SECRET },
          payload: JSON.stringify(payload),
          muteHttpExceptions: true
        };
        try {
          const resp = UrlFetchApp.fetch(TRIPMATE_WEBHOOK_URL, options);
          const statusCode = resp.getResponseCode();
          // Log only the HTTP status code to prevent exposing UTR/transaction payload in plain text
          Logger.log("TripMate Forward Status: " + statusCode + (statusCode === 200 ? " (Success)" : " (Check payload)"));
          if (statusCode === 200) msg.markRead();
        } catch (e) {
          Logger.log("Fetch error (network): " + e);
        }
      }
    }
  }
}`;
                          void navigator.clipboard.writeText(script);
                          setCopiedScript(true);
                          setTimeout(() => setCopiedScript(false), 2000);
                        }}
                        className="flex items-center gap-1 rounded bg-surface hover:bg-surface-container-low border border-border-hairline px-2 py-1 text-[10px] font-bold text-text-primary shadow-xs"
                      >
                        {copiedScript ? <Check className="h-3 w-3 text-emerald-700" /> : <Copy className="h-3 w-3" />}
                        <span>{copiedScript ? "Copied" : "Copy Google Script"}</span>
                      </button>
                    </div>

                    <ol className="text-[11px] text-text-secondary space-y-1.5 list-decimal pl-4">
                      <li>Log into <strong>{pricing.bank_alert_email || "tripmateoffical007@gmail.com"}</strong>.</li>
                      <li>Go to <strong>script.google.com</strong> &gt; click <strong>New Project</strong>.</li>
                      <li>Press <strong>Ctrl+A</strong> to delete default template, paste copied script &gt; Click <strong>Save (Floppy icon)</strong>.</li>
                      <li>Click <strong>Triggers (Clock icon on left)</strong> &gt; Add Trigger: run function <strong>forwardBankEmailsToTripMate</strong> every 1 minute. Free forever!</li>
                    </ol>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* PANEL 1: Live Bank SMS & Gmail Feeds (Left Column, 7 cols) */}
            <div className="lg:col-span-7">
              <div className="rounded-xl border border-[#E5E3DF] bg-[#FFFFFF] shadow-xs overflow-hidden flex flex-col">
                <div className="px-4 py-3 border-b border-[#E5E3DF] bg-[#FFFFFF] shrink-0 flex items-center justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-emerald-700 animate-pulse" />
                    <span className="text-xs font-bold text-[#1F1F1E] uppercase tracking-wider">
                      Live Verified Bank Stream
                    </span>
                    <span className="rounded-full bg-[#1F1F1E] px-2 py-0.5 text-[11px] font-bold text-white">
                      {filteredBankInbox.length}
                    </span>
                    <span className="rounded-full bg-[#1F1F1E] text-white px-2 py-0.5 text-[10px] font-bold flex items-center gap-1">
                      <span>Latest First ↓ (Live)</span>
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={isRefreshingLatest}
                      onClick={handleRefreshLatest}
                      className="flex items-center gap-1.5 rounded-lg border border-[#E5E3DF] bg-[#FBF9F5] hover:bg-[#EBE9E4] px-2.5 py-1 text-xs font-bold text-[#1F1F1E] transition-colors shadow-xs disabled:opacity-50"
                      title="Fetch newest bank transactions and scroll to top"
                    >
                      <RotateCw className={`h-3 w-3 text-[#1F1F1E] ${isRefreshingLatest ? "animate-spin" : ""}`} />
                      <span>↻ Refresh Latest</span>
                    </button>
                    <span className="text-xs text-[#6E6D68]">Up to 5 visible · scroll inside box</span>
                  </div>
                </div>

                {filteredBankInbox.length === 0 ? (
                  <div className="p-8 text-center bg-[#FBF9F5]">
                    <Smartphone className="h-8 w-8 text-text-secondary mx-auto mb-2 opacity-50" />
                    <h3 className="text-xs font-bold text-text-primary">No Bank Alerts in this filter</h3>
                    <p className="text-[11px] text-text-secondary mt-1 max-w-sm mx-auto">
                      Use the 1-Click Simulator on the right to test incoming FamPay SMS or Bank Gmail alerts right now!
                    </p>
                  </div>
                ) : (
                  <div ref={bankStreamContainerRef} className="max-h-[380px] overflow-y-auto custom-scrollbar admin-scroll p-4 space-y-3 overscroll-contain">
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

                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-[10px] text-text-secondary font-mono bg-[#FBF9F5] px-2 py-0.5 rounded border border-[#E5E3DF]">
                              {formatIstTimestamp(item.created_at)}
                            </span>
                            {isJustNow(item.created_at) && (
                              <span className="rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300 px-2 py-0.2 text-[9px] font-black uppercase tracking-wider animate-pulse">
                                NEW • Just now
                              </span>
                            )}
                          </div>
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

              <div className="px-4 py-2.5 border-t border-[#E5E3DF] bg-[#FBF9F5] text-xs text-[#6E6D68] shrink-0 flex items-center justify-between">
                <span>Showing {filteredBankInbox.length} bank &amp; UPI messages (scroll inside box for more)</span>
                <span className="font-mono text-[11px] text-[#8C8A85]">Auto/Manual Ingestion</span>
              </div>
            </div>
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
                      <span className="font-bold text-text-primary">Simulate Incoming FamPay SMS</span>
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
                      <span className="font-bold text-text-primary">Simulate Incoming SBI SMS</span>
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
                      <span className="font-bold text-text-primary">Simulate Incoming Bank Gmail</span>
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

          <div className="rounded-xl border border-[#E5E3DF] bg-[#FFFFFF] shadow-xs overflow-hidden flex flex-col">
            <div className="px-4 py-3 border-b border-[#E5E3DF] bg-[#FFFFFF] shrink-0 flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-[#1F1F1E] uppercase tracking-wider">Financial Transactions Ledger</span>
                <span className="rounded-full bg-[#1F1F1E] px-2 py-0.5 text-[11px] font-bold text-white">
                  {filteredPayments.length}
                </span>
                <span className="rounded-full bg-[#1F1F1E] text-white px-2 py-0.5 text-[10px] font-bold">
                  Latest First ↓
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={isRefreshingLatest}
                  onClick={handleRefreshLatest}
                  className="flex items-center gap-1.5 rounded-lg border border-[#E5E3DF] bg-[#FBF9F5] hover:bg-[#EBE9E4] px-2.5 py-1 text-xs font-bold text-[#1F1F1E] transition-colors shadow-xs disabled:opacity-50"
                  title="Fetch newest payments and scroll to top"
                >
                  <RotateCw className={`h-3 w-3 text-[#1F1F1E] ${isRefreshingLatest ? "animate-spin" : ""}`} />
                  <span>↻ Refresh Latest</span>
                </button>
                <span className="text-xs text-[#6E6D68]">Up to 5 visible · scroll inside table</span>
              </div>
            </div>

            <div className="overflow-y-auto overflow-x-auto max-h-[360px] custom-scrollbar admin-scroll overscroll-contain">
              <table className="w-full text-left text-xs">
                <thead className="sticky top-0 z-10 bg-[#FBF9F5] border-b border-[#E5E3DF]">
                  <tr className="text-[10px] font-extrabold uppercase tracking-wider text-[#6E6D68]">
                    <th className="py-2.5 px-4">Invoice Number</th>
                    <th className="py-2.5 px-4">Booking Ref</th>
                    <th className="py-2.5 px-4">Customer / Company</th>
                    <th className="py-2.5 px-4">Total Amount</th>
                    <th className="py-2.5 px-4">GST Breakdown</th>
                    <th className="py-2.5 px-4">Method</th>
                    <th className="py-2.5 px-4">12-Digit UTR</th>
                    <th className="py-2.5 px-4">UTR Verification</th>
                    <th className="py-2.5 px-4 text-right">Payment Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E3DF]">
                  {filteredPayments.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-12 text-center">
                        <div className="flex flex-col items-center justify-center space-y-2">
                          <Receipt className="h-8 w-8 text-text-secondary/40" />
                          <p className="text-xs font-bold text-text-primary">
                            No payment transactions found in {dateFilter === "1m" ? "the last 1 month" : dateFilter === "3m" ? "the last 3 months" : dateFilter === "6m" ? "the last 6 months" : "the financial ledger"}
                          </p>
                          <p className="text-[11px] text-text-secondary">
                            Try expanding the date filter or switch to &quot;All Time&quot; to review historical records.
                          </p>
                          {dateFilter !== "all" && payments.length > 0 && (
                            <button
                              type="button"
                              onClick={() => setDateFilter("all")}
                              className="mt-2 rounded-xl bg-surface px-3 py-1.5 text-xs font-bold text-primary-container border border-border-hairline hover:bg-card-surface transition-colors shadow-xs"
                            >
                              Show All Time ({payments.length} total)
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ) :
                    filteredPayments.map((p) => (
                      <tr key={p.id} className="hover:bg-surface-container-low/40">
                        <td className="py-3.5 font-mono">
                          <span className="font-bold text-text-primary block">{p.invoice_number}</span>
                          <span className="text-[10px] text-text-secondary block font-mono">
                            {formatIstTimestamp(p.created_at)}
                          </span>
                          {isJustNow(p.created_at) && (
                            <span className="rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300 px-1.5 py-0.2 text-[9px] font-black uppercase tracking-wider inline-block mt-0.5 animate-pulse">
                              NEW • Just now
                            </span>
                          )}
                        </td>
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

            <div className="px-4 py-2.5 border-t border-[#E5E3DF] bg-[#FBF9F5] text-xs text-[#6E6D68] shrink-0 flex items-center justify-between">
              <span>Showing {filteredPayments.length} of {payments.length} transactions (scroll inside box for more)</span>
              <span className="font-mono text-[11px] text-[#8C8A85]">GST Compliance §3.A</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
