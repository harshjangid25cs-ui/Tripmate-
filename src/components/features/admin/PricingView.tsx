"use client";

import React, { useState } from "react";
import { AdminService } from "@/lib/admin/admin-service";
import { useAdmin } from "@/lib/admin/admin-context";
import { Coins, Plus, Calculator } from "lucide-react";

export function PricingView() {
  const { currentAdmin, hasPermission, requestReasonModal, toast } = useAdmin();
  const [pricing, setPricing] = useState(() => AdminService.getPricing());
  const [refundRules, setRefundRules] = useState(() => AdminService.getRefundRules());

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
    setPricing(AdminService.getPricing());
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
      (reason) => {
        AdminService.updatePricing(
          currentAdmin,
          {
            service_fee: Number(pricing.service_fee),
            gst_rate: Number(pricing.gst_rate),
          },
          reason
        );
        toast("Global pricing configuration updated & audited", "success");
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
        <h1 className="text-xl font-black text-slate-900 tracking-tight">
          Pricing Pipeline & Refund Policies
        </h1>
        <p className="text-xs text-slate-500">
          Global fees, GST parameters, live preview calculator, and departure-tiered refund rules (§3.C, §7)
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Global Pricing Config Form */}
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Coins className="h-5 w-5 text-amber-500" />
              <h2 className="text-base font-bold text-slate-900">Global Pricing Constants</h2>
            </div>
            <span className="rounded-md bg-amber-50 text-amber-900 px-2 py-0.5 text-[10px] font-bold">
              Database §1 & §11
            </span>
          </div>

          <form onSubmit={handleUpdateGlobalPricing} className="mt-4 space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                TripMate Assistance & Fees (Service Fee)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-xs font-bold text-slate-400">₹</span>
                <input
                  type="number"
                  value={pricing.service_fee}
                  onChange={(e) =>
                    setPricing({ ...pricing, service_fee: Number(e.target.value) })
                  }
                  disabled={!canWrite}
                  className="w-full rounded-xl border border-slate-300 pl-7 pr-3 py-2.5 text-xs font-bold text-slate-900 focus:ring-2 focus:ring-primary-500/20 disabled:bg-slate-50"
                  required
                />
              </div>
              <p className="mt-1 text-[11px] text-slate-500">
                Applied to normal passenger bookings. Waived (₹0) on commercial bookings per DATABASE §3.
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
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
                  className="w-32 rounded-xl border border-slate-300 p-2.5 text-xs font-bold text-slate-900 disabled:bg-slate-50"
                  required
                />
                <span className="text-xs font-bold text-slate-700">
                  = {(pricing.gst_rate * 100).toFixed(1)}% GST
                </span>
              </div>
              <p className="mt-1 text-[11px] text-slate-500">
                Formula: round(gst_rate × (subtotal + service_fee), 0)
              </p>
            </div>

            <div className="rounded-2xl bg-amber-50 p-3 border border-amber-200">
              <p className="text-[11px] text-amber-800 leading-snug">
                <strong>Immutable Price Guarantee:</strong> Confirmed reservations retain their exact historical price snapshots. Changes only apply to newly drafted bookings.
              </p>
            </div>

            {canWrite && (
              <div className="pt-2">
                <button
                  type="submit"
                  className="rounded-xl bg-primary-600 hover:bg-primary-700 px-5 py-2.5 text-xs font-bold text-white shadow-sm transition-all"
                >
                  Save Global Parameters
                </button>
              </div>
            )}
          </form>
        </div>

        {/* Live Sample Booking Price Calculator Preview (§5, §7) */}
        <div className="rounded-3xl border border-slate-200 bg-slate-900 p-6 text-white shadow-lg flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Calculator className="h-5 w-5 text-amber-400" />
                <h2 className="text-base font-bold text-white">Live Booking Preview (§7)</h2>
              </div>
              <span className="rounded-md bg-white/10 px-2 py-0.5 text-[10px] font-mono text-amber-300">
                Formula Simulator
              </span>
            </div>

            <div className="mt-4 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Sample Subtotal (Hotel + Fleet + Stops):</span>
                <input
                  type="number"
                  value={sampleSubtotal}
                  onChange={(e) => setSampleSubtotal(Number(e.target.value))}
                  className="w-28 rounded-lg bg-slate-800 border border-slate-700 px-2 py-1 text-right text-xs font-bold text-white"
                />
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">+ Tripmate Service Fee:</span>
                <span className="font-mono font-bold text-white">₹{calcServiceFee.toLocaleString("en-IN")}</span>
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">+ GST ({(pricing.gst_rate * 100).toFixed(0)}% on ₹{calcTaxableBase}):</span>
                <span className="font-mono font-bold text-white">₹{calcTaxAmount.toLocaleString("en-IN")}</span>
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Gross Payable:</span>
                <span className="font-mono font-bold text-slate-300">₹{calcBaseTotal.toLocaleString("en-IN")}</span>
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className="text-amber-400 font-medium">− Coupon Applied ({sampleCoupon}):</span>
                <span className="font-mono font-bold text-amber-400">−₹{calcFinalDiscount.toLocaleString("en-IN")}</span>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-800 flex items-baseline justify-between">
            <div>
              <span className="text-xs text-slate-400 font-semibold block">Total Customer Price</span>
              <span className="text-[10px] text-slate-500">Matching canonical standard ₹27,376 test case</span>
            </div>
            <span className="text-2xl font-black text-amber-400 font-mono">
              ₹{calcTotalAmount.toLocaleString("en-IN")}
            </span>
          </div>
        </div>
      </div>

      {/* Cancellation Refund Rules Table (§3.C, §7) */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Cancellation Refund Rules & Tiers (§3.C)
            </h2>
            <p className="text-xs text-slate-500">
              Replaces legacy hardcoded 48-hour logic. Looked up by hours remaining until 00:00 IST on departure day.
            </p>
          </div>

          {canWrite && (
            <button
              type="button"
              onClick={() => setIsAddingRule(!isAddingRule)}
              className="flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Add Refund Tier</span>
            </button>
          )}
        </div>

        {isAddingRule && (
          <form
            onSubmit={handleAddRefundRule}
            className="mt-4 p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-wrap items-end gap-4"
          >
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Min Hours Before Departure
              </label>
              <input
                type="number"
                min="0"
                value={ruleHours}
                onChange={(e) => setRuleHours(Number(e.target.value))}
                className="w-32 rounded-xl border border-slate-300 p-2 text-xs"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Refund Percentage (%)</label>
              <input
                type="number"
                min="0"
                max="100"
                value={rulePercent}
                onChange={(e) => setRulePercent(Number(e.target.value))}
                className="w-32 rounded-xl border border-slate-300 p-2 text-xs"
                required
              />
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                className="rounded-xl bg-primary-600 hover:bg-primary-700 px-4 py-2 text-xs font-bold text-white"
              >
                Save Tier
              </button>
              <button
                type="button"
                onClick={() => setIsAddingRule(false)}
                className="rounded-xl border border-slate-300 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-white"
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                <th className="py-2.5">Rule Tier</th>
                <th className="py-2.5">Window Condition</th>
                <th className="py-2.5">Customer Refund %</th>
                <th className="py-2.5">Applies To</th>
                <th className="py-2.5 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {refundRules
                .sort((a, b) => b.hours_before_min - a.hours_before_min)
                .map((r, i) => (
                  <tr key={r.id} className="hover:bg-slate-50/50">
                    <td className="py-3 font-mono font-bold text-slate-900">Tier #{i + 1}</td>
                    <td className="py-3 font-semibold text-slate-700">
                      ≥ {r.hours_before_min} hours before departure
                    </td>
                    <td className="py-3 font-black text-emerald-600">{r.refund_percent}% of Total Paid</td>
                    <td className="py-3 text-slate-500 capitalize">{r.applies_to}</td>
                    <td className="py-3 text-right">
                      <span className="rounded-full bg-emerald-100 text-emerald-800 px-2 py-0.5 text-[10px] font-extrabold uppercase">
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
