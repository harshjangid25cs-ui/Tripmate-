"use client";

import React, { useState } from "react";
import { AdminService } from "@/lib/admin/admin-service";
import { useAdmin } from "@/lib/admin/admin-context";
import type { Coupon } from "@/lib/admin/types";
import { adminDeleteCouponAction } from "@/lib/actions/admin-ops";
import { Plus, Edit2, EyeOff, Eye, History, Trash2 } from "lucide-react";

export function CouponsView() {
  const { currentAdmin, hasPermission, requestReasonModal, toast } = useAdmin();
  const [coupons, setCoupons] = useState<Coupon[]>(() => AdminService.getCoupons());
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<Partial<Coupon>>({});

  const canWrite = hasPermission("coupons_write");
  const refresh = () => setCoupons(AdminService.getCoupons());

  const handleToggleActive = (coupon: Coupon) => {
    if (!canWrite) {
      toast("Finance Manager or Super Admin role required", "error");
      return;
    }
    const nextVal = !coupon.is_active;
    requestReasonModal(
      nextVal ? "Activate Coupon" : "Deactivate Coupon",
      `${nextVal ? "Re-enable" : "Deactivate"} redeem code ${coupon.code}.`,
      (reason) => {
        AdminService.updateCoupon(currentAdmin, coupon.id, { is_active: nextVal }, reason);
        toast(`Coupon ${coupon.code} is now ${nextVal ? "active" : "deactivated"}.`, "success");
        refresh();
      }
    );
  };

  const handleDeleteCoupon = (coupon: Coupon) => {
    if (!canWrite) {
      toast("Finance Manager or Super Admin role required", "error");
      return;
    }
    requestReasonModal(
      "Delete Coupon",
      `Are you sure you want to delete coupon ${coupon.code}?`,
      async (reason) => {
        AdminService.deleteCoupon(currentAdmin, coupon.id, reason);
        await adminDeleteCouponAction({ couponId: coupon.id, reason });
        toast(`Coupon ${coupon.code} deleted.`, "success");
        if (isEditing && formData.id === coupon.id) {
          setIsEditing(false);
        }
        refresh();
      }
    );
  };

  const handleSaveForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.code || !formData.value) {
      toast("Coupon code and discount value are required", "error");
      return;
    }

    requestReasonModal(
      formData.id ? "Update Coupon" : "Create Redeem Code",
      `Save modifications to promo code ${formData.code.toUpperCase()}.`,
      (reason) => {
        if (formData.id) {
          AdminService.updateCoupon(currentAdmin, formData.id, formData, reason);
          toast(`Updated coupon ${formData.code}`, "success");
        } else {
          const res = AdminService.createCoupon(
            currentAdmin,
            {
              code: formData.code!,
              description: formData.description || "",
              discount_type: formData.discount_type || "flat",
              value: Number(formData.value),
              max_discount: formData.max_discount ? Number(formData.max_discount) : null,
              min_subtotal: Number(formData.min_subtotal) || 0,
              valid_from: formData.valid_from || null,
              valid_to: formData.valid_to || null,
              usage_limit_total: formData.usage_limit_total ? Number(formData.usage_limit_total) : null,
              usage_limit_per_user: formData.usage_limit_per_user ? Number(formData.usage_limit_per_user) : 1,
              applies_to: formData.applies_to || "normal",
              destination_id: null,
              circuit_id: null,
              auto_apply: Boolean(formData.auto_apply),
              is_active: true,
            },
            reason
          );

          if (!res.ok) {
            toast(res.error || "Failed to create coupon", "error");
            return;
          }
          toast(`Created coupon ${formData.code}`, "success");
        }
        setIsEditing(false);
        refresh();
      }
    );
  };

  return (
    <div className="space-y-6 animate-in fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-text-primary tracking-tight">
            Coupons & Redeem Codes
          </h1>
          <p className="text-xs text-text-secondary">
            Configure promotional discounts, auto-apply flags, and usage ceilings (§3.C, §7)
          </p>
        </div>

        {canWrite && (
          <button
            type="button"
            onClick={() => {
              setFormData({
                code: "",
                description: "",
                discount_type: "flat",
                value: 1000,
                min_subtotal: 5000,
                max_discount: null,
                usage_limit_total: 100,
                usage_limit_per_user: 1,
                applies_to: "normal",
                auto_apply: false,
              });
              setIsEditing(true);
            }}
            className="flex items-center gap-2 rounded-xl bg-primary-container hover:bg-primary-container/90 px-4 py-2 text-xs font-bold text-white shadow-xs"
          >
            <Plus className="h-4 w-4" />
            <span>Create Coupon</span>
          </button>
        )}
      </div>

      {/* Coupons Table */}
      <div className="rounded-xl border border-[#E5E3DF] bg-[#FFFFFF] shadow-xs overflow-hidden flex flex-col">
        <div className="px-4 py-3 border-b border-[#E5E3DF] bg-[#FFFFFF] shrink-0 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-[#1F1F1E] uppercase tracking-wider">Active Promotional Coupons</span>
            <span className="rounded-full bg-[#1F1F1E] px-2 py-0.5 text-[11px] font-bold text-white">
              {coupons.length}
            </span>
          </div>
          <span className="text-xs text-[#6E6D68]">Up to 5 visible · scroll inside table</span>
        </div>

        <div className="overflow-y-auto overflow-x-auto max-h-[360px] custom-scrollbar admin-scroll overscroll-contain">
          <table className="w-full text-left text-xs">
            <thead className="sticky top-0 z-10 bg-[#FBF9F5] border-b border-[#E5E3DF]">
              <tr className="text-[10px] font-extrabold uppercase tracking-wider text-[#6E6D68]">
                <th className="py-2.5 px-4">Code</th>
                <th className="py-2.5 px-4">Discount Value</th>
                <th className="py-2.5 px-4">Min Subtotal</th>
                <th className="py-2.5 px-4">Applies To</th>
                <th className="py-2.5 px-4">Redemptions</th>
                <th className="py-2.5 px-4">Type / Flag</th>
                <th className="py-2.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E3DF]">
              {coupons.map((c) => (
                <tr key={c.id} className="hover:bg-surface-container-low/40">
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-black text-text-primary bg-surface px-2 py-0.5 rounded-lg border border-border-hairline">
                        {c.code}
                      </span>
                      {c.auto_apply && (
                        <span className="rounded-md bg-amber-50 text-amber-900 border border-amber-300 px-1.5 py-0.2 text-[9px] font-extrabold">
                          AUTO-APPLY
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-[11px] text-text-secondary max-w-xs truncate">
                      {c.description}
                    </p>
                  </td>

                  <td className="py-3.5 px-4 font-black text-text-primary font-mono">
                    {c.discount_type === "flat" ? `₹${c.value.toLocaleString("en-IN")}` : `${c.value}%`}
                    {c.max_discount && (
                      <span className="block text-[10px] text-text-secondary font-normal font-sans">
                        Max ₹{c.max_discount.toLocaleString("en-IN")}
                      </span>
                    )}
                  </td>

                  <td className="py-3.5 px-4 font-medium text-text-primary font-mono">
                    ₹{c.min_subtotal.toLocaleString("en-IN")}
                  </td>

                  <td className="py-3.5 px-4 capitalize text-text-secondary font-medium">{c.applies_to}</td>

                  <td className="py-3.5 px-4 text-text-primary">
                    <span className="font-bold font-mono">{c.usage_count}</span>
                    <span className="text-text-secondary">{c.usage_limit_total ? ` / ${c.usage_limit_total}` : " (unlimited)"}</span>
                  </td>

                  <td className="py-3.5 px-4">
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-[10px] font-extrabold uppercase border ${
                        c.is_active
                          ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                          : "bg-surface text-text-secondary border-border-hairline"
                      }`}
                    >
                      {c.is_active ? "Active" : "Disabled"}
                    </span>
                  </td>

                  <td className="py-3.5 px-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          setFormData(c);
                          setIsEditing(true);
                        }}
                        disabled={!canWrite}
                        className="rounded-lg p-1.5 text-text-secondary hover:text-text-primary hover:bg-surface disabled:opacity-40"
                        title="Edit Coupon"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleToggleActive(c)}
                        disabled={!canWrite}
                        className="rounded-lg p-1.5 text-text-secondary hover:text-text-primary hover:bg-surface disabled:opacity-40"
                        title={c.is_active ? "Deactivate" : "Activate"}
                      >
                        {c.is_active ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteCoupon(c)}
                        disabled={!canWrite}
                        className="rounded-lg p-1.5 text-rose-700 hover:bg-rose-50 disabled:opacity-40"
                        title="Delete Coupon"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="px-4 py-2.5 border-t border-[#E5E3DF] bg-[#FBF9F5] text-xs text-[#6E6D68] shrink-0 flex items-center justify-between">
          <span>Showing {coupons.length} promotional redeem codes (scroll inside box for more)</span>
          <span className="font-mono text-[11px] text-[#8C8A85]">Discounts §3.C, §7</span>
        </div>
      </div>

      {/* Redemption Log */}
      <div className="rounded-2xl border border-border-hairline bg-card-surface p-6 shadow-xs">
        <div className="flex items-center gap-2 pb-4 border-b border-border-hairline">
          <History className="h-4 w-4 text-text-secondary" />
          <h2 className="text-base font-bold text-text-primary">Recent Redemptions Audit</h2>
        </div>

        <p className="mt-3 text-xs text-text-secondary">
          Coupons are locked and validated row-level at time of booking confirmation. Two customers racing for the last code use cannot collide (§7, §11 A13).
        </p>

        <div className="mt-4 rounded-xl bg-surface p-4 border border-border-hairline text-xs text-text-secondary">
          <div className="flex items-center justify-between font-bold text-text-primary pb-2 border-b border-border-hairline">
            <span>Customer</span>
            <span>Code Used</span>
            <span>Discount Given</span>
            <span>Timestamp</span>
          </div>
          <div className="mt-2 space-y-2">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-text-primary">Aarav Sharma (aarav.sharma@gmail.com)</span>
              <span className="font-mono font-bold text-primary-container">EXPLOREINDIA</span>
              <span className="font-bold text-emerald-700 font-mono">₹2,000</span>
              <span className="text-text-secondary">10 Oct 2026 14:22 IST</span>
            </div>
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-text-primary">Meera Nair (meera.nair@outlook.com)</span>
              <span className="font-mono font-bold text-primary-container">EXPLOREINDIA</span>
              <span className="font-bold text-emerald-700 font-mono">₹2,000</span>
              <span className="text-text-secondary">14 Oct 2026 09:12 IST</span>
            </div>
          </div>
        </div>
      </div>

      {isEditing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-lg rounded-2xl bg-card-surface p-6 shadow-xl border border-border-hairline">
            <div className="flex items-center justify-between pb-3 border-b border-border-hairline">
              <h2 className="text-lg font-black text-text-primary">
                {formData.id ? `Edit Coupon: ${formData.code}` : "Create Coupon"}
              </h2>
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="text-text-secondary hover:text-text-primary rounded-lg p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveForm} className="mt-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-text-secondary mb-1">Coupon Code</label>
                  <input
                    type="text"
                    value={formData.code || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, code: e.target.value.toUpperCase().replace(/\s/g, "") })
                    }
                    className="w-full rounded-xl border border-border-hairline bg-surface p-2.5 text-xs font-mono uppercase font-black text-text-primary focus:bg-card-surface"
                    placeholder="e.g. SUMMER500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-text-secondary mb-1">Discount Type</label>
                  <select
                    value={formData.discount_type || "flat"}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        discount_type: e.target.value as "flat" | "percent",
                      })
                    }
                    className="w-full rounded-xl border border-border-hairline bg-surface p-2.5 text-xs font-bold text-text-primary focus:bg-card-surface"
                  >
                    <option value="flat">Flat Rupees (₹)</option>
                    <option value="percent">Percentage (%)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-text-secondary mb-1">Description</label>
                <input
                  type="text"
                  value={formData.description || ""}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full rounded-xl border border-border-hairline bg-surface p-2.5 text-xs text-text-primary focus:bg-card-surface"
                  placeholder="e.g. ₹2,000 flat discount on road trips"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-text-secondary mb-1">Discount Value</label>
                  <input
                    type="number"
                    value={formData.value || 0}
                    onChange={(e) => setFormData({ ...formData, value: Number(e.target.value) })}
                    className="w-full rounded-xl border border-border-hairline bg-surface p-2 text-xs text-text-primary focus:bg-card-surface font-mono"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-text-secondary mb-1">Max Discount (₹)</label>
                  <input
                    type="number"
                    value={formData.max_discount || ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        max_discount: e.target.value ? Number(e.target.value) : null,
                      })
                    }
                    placeholder="Unlimited"
                    className="w-full rounded-xl border border-border-hairline bg-surface p-2 text-xs text-text-primary focus:bg-card-surface font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-text-secondary mb-1">Min Subtotal (₹)</label>
                  <input
                    type="number"
                    value={formData.min_subtotal || 0}
                    onChange={(e) =>
                      setFormData({ ...formData, min_subtotal: Number(e.target.value) })
                    }
                    className="w-full rounded-xl border border-border-hairline bg-surface p-2 text-xs text-text-primary focus:bg-card-surface font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-text-secondary mb-1">Total Usage Limit</label>
                  <input
                    type="number"
                    value={formData.usage_limit_total || ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        usage_limit_total: e.target.value ? Number(e.target.value) : null,
                      })
                    }
                    placeholder="Unlimited"
                    className="w-full rounded-xl border border-border-hairline bg-surface p-2 text-xs text-text-primary focus:bg-card-surface font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-text-secondary mb-1">Per-User Limit</label>
                  <input
                    type="number"
                    value={formData.usage_limit_per_user || 1}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        usage_limit_per_user: Number(e.target.value),
                      })
                    }
                    className="w-full rounded-xl border border-border-hairline bg-surface p-2 text-xs text-text-primary focus:bg-card-surface font-mono"
                  />
                </div>
              </div>

              <div className="p-3 bg-surface rounded-xl border border-border-hairline">
                <label className="flex items-center gap-2 text-xs font-bold text-text-primary cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.auto_apply || false}
                    onChange={(e) => setFormData({ ...formData, auto_apply: e.target.checked })}
                    className="rounded text-primary-container focus:ring-primary-container"
                  />
                  <span>Auto-Apply (Applies automatically unless customer opts out)</span>
                </label>
                <p className="mt-1 text-[11px] text-text-secondary">
                  Per §7, at most one auto-apply coupon can be active globally. Replaces old demo discount.
                </p>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-border-hairline">
                {formData.id ? (
                  <button
                    type="button"
                    onClick={() => handleDeleteCoupon(formData as Coupon)}
                    disabled={!canWrite}
                    className="flex items-center gap-1 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700 hover:bg-rose-100"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>Delete Coupon</span>
                  </button>
                ) : <div />}
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    className="rounded-xl border border-border-hairline bg-surface px-4 py-2 text-xs font-bold text-text-primary hover:bg-card-surface"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="rounded-xl bg-primary-container hover:bg-primary-container/90 px-5 py-2 text-xs font-bold text-white shadow-xs"
                  >
                    Save Coupon
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
