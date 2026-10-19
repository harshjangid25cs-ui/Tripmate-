"use client";

import React, { useState, useEffect } from "react";
import { AdminService } from "@/lib/admin/admin-service";
import { useAdmin } from "@/lib/admin/admin-context";
import { Coins, Plus, Calculator, QrCode } from "lucide-react";
import { buildUpiPaymentUri, generateUpiQrDataUrl } from "@/lib/payments/upi-qr";

export function PricingView() {
  const { currentAdmin, hasPermission, requestReasonModal, toast } = useAdmin();
  const [pricing, setPricing] = useState(() => AdminService.getPricing());
  const [refundRules, setRefundRules] = useState(() => AdminService.getRefundRules());

  // Merchant UPI Gateway state
  const [merchantVpa, setMerchantVpa] = useState(pricing.merchant_upi_vpa || "tripmate@upi");
  const [merchantPayeeName, setMerchantPayeeName] = useState(pricing.merchant_payee_name || "TripMate Travels");
  const [activeGateway, setActiveGateway] = useState<"auto" | "direct_upi_utr" | "razorpay" | "demo">(
    pricing.active_payment_gateway || "auto"
  );
  const [upiAutoConfirm, setUpiAutoConfirm] = useState(pricing.upi_auto_confirm ?? true);
  const [previewQrUrl, setPreviewQrUrl] = useState<string | null>(null);

  // Generate live test-scan QR code for Superadmin
  useEffect(() => {
    const testUri = buildUpiPaymentUri({
      vpa: merchantVpa,
      payeeName: merchantPayeeName,
      amount: 1000,
      transactionNote: "TripMate Admin QR Test",
      transactionRef: "TM-ADMIN-TEST",
    });
    let active = true;
    generateUpiQrDataUrl(testUri, { size: 180 }).then((url) => {
      if (active) setPreviewQrUrl(url);
    });
    return () => {
      active = false;
    };
  }, [merchantVpa, merchantPayeeName]);

  // Interactive Live Sample Booking Preview (§5, §7)
  const [sampleSubtotal, setSampleSubtotal] = useState(24200);
  const sampleCoupon = "EXPLOREINDIA";
  const sampleCouponDiscount = 2000;

  // New rule form state
  const [isAddingRule, setIsAddingRule] = useState(false);
  const [ruleHours, setRuleHours] = useState(48);
  const [rulePercent, setRulePercent] = useState(100);

  const canWrite = hasPermission("pricing_write");

  const refresh = () => {
    const freshPricing = AdminService.getPricing();
    setPricing(freshPricing);
    setMerchantVpa(freshPricing.merchant_upi_vpa || "tripmate@upi");
    setMerchantPayeeName(freshPricing.merchant_payee_name || "TripMate Travels");
    setActiveGateway(freshPricing.active_payment_gateway || "auto");
    setUpiAutoConfirm(freshPricing.upi_auto_confirm ?? true);
    setRefundRules(AdminService.getRefundRules());
  };

  // §7 Calculations
  const calcServiceFee = pricing.service_fee;
  const calcTaxableBase = sampleSubtotal + calcServiceFee;
  const calcTaxAmount = Math.round(pricing.gst_rate * calcTaxableBase);
  const calcBaseTotal = sampleSubtotal + calcServiceFee + calcTaxAmount;
  const calcFinalDiscount = Math.min(sampleCouponDiscount, calcBaseTotal);
  const calcTotalAmount = calcBaseTotal - calcFinalDiscount;

  const handleUpdateGlobalPricing = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canWrite) {
      toast("Finance Manager or Super Admin role required", "error");
      return;
    }

    requestReasonModal(
      "Update Global Pricing Config",
      `Adjust service fee to ₹${pricing.service_fee} and GST rate to ${(pricing.gst_rate * 100).toFixed(1)}%. Affects newly calculated drafts.`,
      async (reason) => {
        await AdminService.updatePricing(
          currentAdmin,
          {
            service_fee: Number(pricing.service_fee),
            gst_rate: Number(pricing.gst_rate),
            merchant_upi_vpa: merchantVpa,
            merchant_payee_name: merchantPayeeName,
            active_payment_gateway: activeGateway,
            upi_auto_confirm: upiAutoConfirm,
          },
          reason
        );
        toast("Global pricing configuration updated & audited", "success");
        refresh();
      }
    );
  };

  const handleUpdateUpiGateway = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canWrite) {
      toast("Finance Manager or Super Admin role required", "error");
      return;
    }

    requestReasonModal(
      "Update Merchant UPI Gateway Settings",
      `Set merchant UPI VPA to ${merchantVpa}, payee name to "${merchantPayeeName}", gateway mode to "${activeGateway}".`,
      async (reason) => {
        await AdminService.updatePricing(
          currentAdmin,
          {
            service_fee: Number(pricing.service_fee),
            gst_rate: Number(pricing.gst_rate),
            merchant_upi_vpa: merchantVpa,
            merchant_payee_name: merchantPayeeName,
            active_payment_gateway: activeGateway,
            upi_auto_confirm: upiAutoConfirm,
          },
          reason
        );
        toast("Direct UPI Gateway configuration saved & audited", "success");
        refresh();
      }
    );
  };

  const handleAddRefundRule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canWrite) {
      toast("Finance Manager or Super Admin role required", "error");
      return;
    }

    requestReasonModal(
      "Add Cancellation Refund Tier",
      `Add refund tier: Departures >= ${ruleHours} hours before trip receive ${rulePercent}% refund.`,
      (reason) => {
        AdminService.addRefundRule(
          currentAdmin,
          {
            applies_to: "all",
            hours_before_min: Number(ruleHours),
            refund_percent: Number(rulePercent),
            is_active: true,
          },
          reason
        );
        toast("Added refund tier rule", "success");
        setIsAddingRule(false);
        refresh();
      }
    );
  };

  return (
    <div className="space-y-8 animate-in fade-in">
      <div>
        <h1 className="text-xl font-black text-text-primary tracking-tight">
          Pricing Pipeline & Refund Policies
        </h1>
        <p className="text-xs text-text-secondary">
          Global fees, GST parameters, live preview calculator, and departure-tiered refund rules (§3.C, §7)
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Global Pricing Config Form */}
        <div className="rounded-2xl border border-border-hairline bg-card-surface p-6 shadow-xs">
          <div className="flex items-center justify-between pb-4 border-b border-border-hairline">
            <div className="flex items-center gap-2">
              <Coins className="h-5 w-5 text-amber-500" />
              <h2 className="text-base font-bold text-text-primary">Global Pricing Constants</h2>
            </div>
            <span className="rounded-md bg-amber-50 text-amber-900 border border-amber-300 px-2 py-0.5 text-[10px] font-bold">
              Database §1 & §11
            </span>
          </div>

          <form onSubmit={handleUpdateGlobalPricing} className="mt-4 space-y-4">
            <div>
              <label className="block text-xs font-bold text-text-secondary mb-1">
                TripMate Assistance & Fees (Service Fee)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-xs font-bold text-text-secondary">₹</span>
                <input
                  type="number"
                  value={pricing.service_fee}
                  onChange={(e) =>
                    setPricing({ ...pricing, service_fee: Number(e.target.value) })
                  }
                  disabled={!canWrite}
                  className="w-full rounded-xl border border-border-hairline bg-surface pl-7 pr-3 py-2.5 text-xs font-mono font-bold text-text-primary focus:bg-card-surface disabled:opacity-60"
                  required
                />
              </div>
              <p className="mt-1 text-[11px] text-text-secondary">
                Applied to normal passenger bookings. Waived (₹0) on commercial bookings per DATABASE §3.
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-text-secondary mb-1">
                GST Tax Rate (Indian Goods & Services Tax)
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="0.5"
                  value={pricing.gst_rate}
                  onChange={(e) =>
                    setPricing({ ...pricing, gst_rate: Number(e.target.value) })
                  }
                  disabled={!canWrite}
                  className="w-32 rounded-xl border border-border-hairline bg-surface p-2.5 text-xs font-mono font-bold text-text-primary focus:bg-card-surface disabled:opacity-60"
                  required
                />
                <span className="text-xs font-bold text-text-primary font-mono">
                  = {(pricing.gst_rate * 100).toFixed(1)}% GST
                </span>
              </div>
              <p className="mt-1 text-[11px] text-text-secondary">
                Formula: round(gst_rate × (subtotal + service_fee), 0)
              </p>
            </div>

            <div className="rounded-xl bg-surface p-3 border border-border-hairline">
              <p className="text-[11px] text-text-secondary leading-snug">
                <strong className="text-text-primary">Immutable Price Guarantee:</strong> Confirmed reservations retain their exact historical price snapshots. Changes only apply to newly drafted bookings.
              </p>
            </div>

            {canWrite && (
              <div className="pt-2">
                <button
                  type="submit"
                  className="rounded-xl bg-primary-container hover:bg-primary-container/90 px-5 py-2.5 text-xs font-bold text-white shadow-xs transition-all"
                >
                  Save Global Parameters
                </button>
              </div>
            )}
          </form>
        </div>

        {/* Live Sample Booking Price Calculator Preview (§5, §7) */}
        <div className="rounded-2xl border border-border-hairline bg-surface-dark p-6 text-white shadow-md flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-border-hairline/30">
              <div className="flex items-center gap-2">
                <Calculator className="h-5 w-5 text-amber-400" />
                <h2 className="text-base font-bold text-white">Live Booking Preview (§7)</h2>
              </div>
              <span className="rounded-md bg-white/10 border border-white/10 px-2 py-0.5 text-[10px] font-mono text-amber-300">
                Formula Simulator
              </span>
            </div>

            <div className="mt-4 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-300">Sample Subtotal (Hotel + Fleet + Stops):</span>
                <input
                  type="number"
                  value={sampleSubtotal}
                  onChange={(e) => setSampleSubtotal(Number(e.target.value))}
                  className="w-28 rounded-lg bg-white/10 border border-white/20 px-2 py-1 text-right text-xs font-mono font-bold text-white focus:bg-white/15"
                />
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-300">+ Tripmate Service Fee:</span>
                <span className="font-mono font-bold text-white">₹{calcServiceFee.toLocaleString("en-IN")}</span>
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-300">+ GST ({(pricing.gst_rate * 100).toFixed(0)}% on ₹{calcTaxableBase}):</span>
                <span className="font-mono font-bold text-white">₹{calcTaxAmount.toLocaleString("en-IN")}</span>
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-300">Gross Payable:</span>
                <span className="font-mono font-bold text-slate-200">₹{calcBaseTotal.toLocaleString("en-IN")}</span>
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className="text-amber-400 font-medium">− Coupon Applied ({sampleCoupon}):</span>
                <span className="font-mono font-bold text-amber-400">−₹{calcFinalDiscount.toLocaleString("en-IN")}</span>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-border-hairline/30 flex items-baseline justify-between">
            <div>
              <span className="text-xs text-slate-300 font-semibold block">Total Customer Price</span>
              <span className="text-[10px] text-slate-400">Matching canonical standard ₹27,376 test case</span>
            </div>
            <span className="text-2xl font-black text-amber-400 font-mono">
              ₹{calcTotalAmount.toLocaleString("en-IN")}
            </span>
          </div>
        </div>
      </div>

      {/* Direct UPI Gateway (YouPI-PG Mode) Configuration Card */}
      <div className="rounded-2xl border border-border-hairline bg-card-surface p-6 shadow-xs">
        <div className="flex items-center justify-between pb-4 border-b border-border-hairline">
          <div className="flex items-center gap-2">
            <QrCode className="h-5 w-5 text-primary-container" />
            <div>
              <h2 className="text-base font-bold text-text-primary">
                Direct UPI Gateway (YouPI-PG Mode)
              </h2>
              <p className="text-xs text-text-secondary">
                Accept 0% fee UPI payments directly into your bank VPA with automated or manual 12-digit UTR verification
              </p>
            </div>
          </div>
          <span className="rounded-md bg-emerald-50 text-emerald-800 border border-emerald-300 px-2 py-0.5 text-[10px] font-bold">
            0% Gateway Fee
          </span>
        </div>

        <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
          <form onSubmit={handleUpdateUpiGateway} className="lg:col-span-2 space-y-4">
            <div>
              <label className="block text-xs font-bold text-text-secondary mb-1">
                Merchant UPI ID (VPA)
              </label>
              <input
                type="text"
                value={merchantVpa}
                onChange={(e) => setMerchantVpa(e.target.value)}
                disabled={!canWrite}
                placeholder="e.g. tripmate@upi or yourname@okaxis"
                className="w-full rounded-xl border border-border-hairline bg-surface px-3 py-2.5 text-xs font-mono font-bold text-text-primary focus:bg-card-surface disabled:opacity-60"
                required
              />
              <p className="mt-1 text-[11px] text-text-secondary">
                Your bank or business UPI ID where customer funds will be credited immediately.
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-text-secondary mb-1">
                Merchant Payee Name
              </label>
              <input
                type="text"
                value={merchantPayeeName}
                onChange={(e) => setMerchantPayeeName(e.target.value)}
                disabled={!canWrite}
                placeholder="e.g. TripMate Travels"
                className="w-full rounded-xl border border-border-hairline bg-surface px-3 py-2.5 text-xs font-bold text-text-primary focus:bg-card-surface disabled:opacity-60"
                required
              />
              <p className="mt-1 text-[11px] text-text-secondary">
                The business or entity name displayed to customers in their UPI app on payment.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-text-secondary mb-1">
                  Active Payment Mode
                </label>
                <select
                  value={activeGateway}
                  onChange={(e) => setActiveGateway(e.target.value as typeof activeGateway)}
                  disabled={!canWrite}
                  className="w-full rounded-xl border border-border-hairline bg-surface px-3 py-2.5 text-xs font-bold text-text-primary focus:bg-card-surface disabled:opacity-60"
                >
                  <option value="auto">Auto (Smart Route / Hybrid)</option>
                  <option value="direct_upi_utr">Direct UPI QR + UTR (0% Fee)</option>
                  <option value="razorpay">Razorpay PG</option>
                  <option value="demo">Demo Mode</option>
                </select>
                <p className="mt-1 text-[11px] text-text-secondary">
                  Controls payment options surfaced to customers at checkout.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-text-secondary mb-1">
                  12-Digit UTR Auto-Confirmation
                </label>
                <div className="flex items-center gap-2 mt-2">
                  <input
                    type="checkbox"
                    id="upiAutoConfirm"
                    checked={upiAutoConfirm}
                    onChange={(e) => setUpiAutoConfirm(e.target.checked)}
                    disabled={!canWrite}
                    className="w-4 h-4 text-primary-container accent-primary-container rounded"
                  />
                  <label htmlFor="upiAutoConfirm" className="text-xs font-bold text-text-primary cursor-pointer">
                    Auto-confirm on valid 12-digit UTR
                  </label>
                </div>
                <p className="mt-1 text-[11px] text-text-secondary">
                  If enabled, submitting a unique 12-digit UTR immediately confirms the booking and flags it for audit.
                </p>
              </div>
            </div>

            {canWrite && (
              <div className="pt-2">
                <button
                  type="submit"
                  className="rounded-xl bg-primary-container hover:bg-primary-container/90 px-5 py-2.5 text-xs font-bold text-white shadow-xs transition-all"
                >
                  Save UPI Gateway Settings
                </button>
              </div>
            )}
          </form>

          {/* Live QR Preview inside Admin */}
          <div className="rounded-2xl border border-border-hairline bg-surface p-4 flex flex-col items-center justify-center text-center">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-text-secondary mb-2">
              Live Gateway QR Preview
            </span>
            <div className="bg-white p-3 rounded-xl border border-border-hairline shadow-xs">
              {previewQrUrl ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={previewQrUrl}
                  alt="Live Merchant UPI QR Preview"
                  width={144}
                  height={144}
                  decoding="async"
                  className="w-36 h-36 aspect-square"
                />
              ) : (
                <div className="w-36 h-36 flex items-center justify-center bg-surface">
                  <QrCode className="h-8 w-8 text-text-secondary animate-pulse" />
                </div>
              )}
            </div>
            <span className="font-mono font-bold text-xs text-text-primary mt-2">
              {merchantVpa}
            </span>
            <span className="text-[10px] text-text-secondary">
              Test scan with GPay / PhonePe / Paytm
            </span>
            <span className="mt-2 text-[9px] font-mono text-text-secondary/80 break-all px-2">
              upi://pay?pa={merchantVpa}&amp;pn={encodeURIComponent(merchantPayeeName)}
            </span>
          </div>
        </div>
      </div>

      {/* Cancellation Refund Rules Table (§3.C, §7) */}
      <div className="rounded-2xl border border-border-hairline bg-card-surface p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border-hairline">
          <div>
            <h2 className="text-base font-bold text-text-primary">
              Cancellation Refund Rules & Tiers (§3.C)
            </h2>
            <p className="text-xs text-text-secondary">
              Replaces legacy hardcoded 48-hour logic. Looked up by hours remaining until 00:00 IST on departure day.
            </p>
          </div>

          {canWrite && (
            <button
              type="button"
              onClick={() => setIsAddingRule(!isAddingRule)}
              className="flex items-center gap-1.5 rounded-xl border border-border-hairline bg-surface px-3 py-1.5 text-xs font-bold text-text-primary hover:bg-card-surface"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Add Refund Tier</span>
            </button>
          )}
        </div>

        {isAddingRule && (
          <form
            onSubmit={handleAddRefundRule}
            className="mt-4 p-4 rounded-xl bg-surface border border-border-hairline flex flex-wrap items-end gap-4"
          >
            <div>
              <label className="block text-xs font-bold text-text-secondary mb-1">
                Min Hours Before Departure
              </label>
              <input
                type="number"
                min="0"
                value={ruleHours}
                onChange={(e) => setRuleHours(Number(e.target.value))}
                className="w-32 rounded-xl border border-border-hairline bg-card-surface p-2 text-xs font-mono text-text-primary"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-text-secondary mb-1">Refund Percentage (%)</label>
              <input
                type="number"
                min="0"
                max="100"
                value={rulePercent}
                onChange={(e) => setRulePercent(Number(e.target.value))}
                className="w-32 rounded-xl border border-border-hairline bg-card-surface p-2 text-xs font-mono text-text-primary"
                required
              />
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                className="rounded-xl bg-primary-container hover:bg-primary-container/90 px-4 py-2 text-xs font-bold text-white shadow-xs"
              >
                Save Tier
              </button>
              <button
                type="button"
                onClick={() => setIsAddingRule(false)}
                className="rounded-xl border border-border-hairline bg-surface px-3 py-2 text-xs font-bold text-text-primary hover:bg-card-surface"
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-border-hairline text-[10px] font-extrabold uppercase tracking-wider text-text-secondary">
                <th className="py-2.5">Rule Tier</th>
                <th className="py-2.5">Window Condition</th>
                <th className="py-2.5">Customer Refund %</th>
                <th className="py-2.5">Applies To</th>
                <th className="py-2.5 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-hairline">
              {refundRules
                .sort((a, b) => b.hours_before_min - a.hours_before_min)
                .map((r, i) => (
                  <tr key={r.id} className="hover:bg-surface-container-low/40">
                    <td className="py-3 font-mono font-bold text-text-primary">Tier #{i + 1}</td>
                    <td className="py-3 font-semibold text-text-primary">
                      ≥ {r.hours_before_min} hours before departure
                    </td>
                    <td className="py-3 font-black text-emerald-700 font-mono">{r.refund_percent}% of Total Paid</td>
                    <td className="py-3 text-text-secondary capitalize">{r.applies_to}</td>
                    <td className="py-3 text-right">
                      <span className="rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 text-[10px] font-extrabold uppercase">
                        Active
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
