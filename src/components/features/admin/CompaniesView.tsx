"use client";

import React, { useState } from "react";
import { AdminService } from "@/lib/admin/admin-service";
import { useAdmin } from "@/lib/admin/admin-context";
import type { CompanyAdmin } from "@/lib/admin/types";
import { Plus, Users, Trash2, Shield, Edit3 } from "lucide-react";
import { adminUpsertCompanyPolicyAction } from "@/lib/actions/admin-ops";

export function CompaniesView() {
  const { currentAdmin, hasPermission, requestReasonModal, toast } = useAdmin();
  const [companies, setCompanies] = useState<CompanyAdmin[]>(() =>
    AdminService.getCompanies()
  );
  const [selectedCompany, setSelectedCompany] = useState<CompanyAdmin | null>(null);
  const [isAddingComp, setIsAddingComp] = useState(false);
  const [compName, setCompName] = useState("");
  const [compGst, setCompGst] = useState("");
  const [compLimit, setCompLimit] = useState<number>(150000);

  // Policy Editor state
  const [editingPolicyCompany, setEditingPolicyCompany] = useState<CompanyAdmin | null>(null);
  const [policyBudget, setPolicyBudget] = useState<number>(150000);
  const [policyRequiresApproval, setPolicyRequiresApproval] = useState<boolean>(true);

  // Add Member state
  const [memberEmail, setMemberEmail] = useState("");
  const [memberName, setMemberName] = useState("");
  const [memberRole, setMemberRole] = useState<"admin" | "member">("member");

  const canWrite = hasPermission("companies_write");
  const refresh = () => setCompanies(AdminService.getCompanies());

  const handleCreateCompany = (e: React.FormEvent) => {
    e.preventDefault();
    if (!compName.trim()) return;

    requestReasonModal(
      "Register Corporate Account",
      `Create corporate organization profile for ${compName}.`,
      () => {
        AdminService.createCompany(
          currentAdmin,
          compName.trim(),
          compGst.trim() || null,
          compLimit
        );
        toast(`Registered company ${compName}`, "success");
        setIsAddingComp(false);
        setCompName("");
        setCompGst("");
        refresh();
      }
    );
  };

  const handleSavePolicy = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPolicyCompany) return;

    try {
      await adminUpsertCompanyPolicyAction({
        companyId: editingPolicyCompany.id,
        maxBudgetPerTrip: policyBudget,
        requiresApproval: policyRequiresApproval,
        reason: "Superadmin updated spending policy via admin console",
      });
      AdminService.updateCompany(
        currentAdmin,
        editingPolicyCompany.id,
        { approval_limit: policyBudget },
        "Updated company spending policy"
      );
      toast(`Spending policy saved for ${editingPolicyCompany.name}`, "success");
      setEditingPolicyCompany(null);
      refresh();
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : "Failed to update policy", "error");
    }
  };

  const handleRemoveMember = (memberId: string, memberName: string) => {
    if (!selectedCompany) return;
    requestReasonModal(
      "Remove Member",
      `Remove ${memberName} from ${selectedCompany.name} corporate roster?`,
      () => {
        const res = AdminService.removeCompanyMember(currentAdmin, selectedCompany.id, memberId);
        if (res.ok) {
          toast(`Removed ${memberName} from roster`, "success");
          refresh();
          const updated = AdminService.getCompanies().find((c) => c.id === selectedCompany.id);
          if (updated) setSelectedCompany(updated);
        } else {
          toast(res.error || "Failed to remove member", "error");
        }
      }
    );
  };

  const handleAddMember = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCompany || !memberEmail.trim()) return;

    const res = AdminService.addCompanyMember(
      currentAdmin,
      selectedCompany.id,
      memberEmail.trim(),
      memberName.trim() || memberEmail.split("@")[0] || "Employee",
      memberRole
    );

    if (res.ok) {
      toast(`Added ${memberEmail} to ${selectedCompany.name}`, "success");
      setMemberEmail("");
      setMemberName("");
      refresh();
      const updated = AdminService.getCompanies().find((c) => c.id === selectedCompany.id);
      if (updated) setSelectedCompany(updated);
    } else {
      toast(res.error || "Failed to add member", "error");
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-text-primary tracking-tight">
            Corporate Partners & Companies
          </h1>
          <p className="text-xs text-text-secondary">
            GST compliance, member rosters, corporate roles, and approval policies (§3.F, §4 W9)
          </p>
        </div>

        {canWrite && (
          <button
            type="button"
            onClick={() => setIsAddingComp(true)}
            className="flex items-center gap-2 rounded-xl bg-primary-container hover:bg-primary-container/90 px-4 py-2 text-xs font-bold text-white shadow-xs"
          >
            <Plus className="h-4 w-4" />
            <span>Add Company</span>
          </button>
        )}
      </div>

      <div className="rounded-xl border border-[#E5E3DF] bg-[#FFFFFF] shadow-xs overflow-hidden flex flex-col">
        <div className="px-4 py-3 border-b border-[#E5E3DF] bg-[#FFFFFF] shrink-0 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-[#1F1F1E] uppercase tracking-wider">Corporate Organizations</span>
            <span className="rounded-full bg-[#1F1F1E] px-2 py-0.5 text-[11px] font-bold text-white">
              {companies.length}
            </span>
          </div>
          <span className="text-xs text-[#6E6D68]">Showing corporate cards · scroll inside box</span>
        </div>

        <div className="max-h-[420px] overflow-y-auto custom-scrollbar admin-scroll p-4 overscroll-contain">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {companies.map((c) => (
          <div
            key={c.id}
            className="rounded-2xl border border-border-hairline bg-card-surface p-5 shadow-xs flex flex-col justify-between"
          >
            <div>
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-base font-black text-text-primary">{c.name}</h3>
                  <div className="mt-1 flex items-center gap-2">
                    {c.gst_number ? (
                      <span className="rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 text-[10px] font-mono font-bold">
                        ITC QUALIFIED · {c.gst_number}
                      </span>
                    ) : (
                      <span className="rounded-md bg-surface text-text-secondary border border-border-hairline px-2 py-0.5 text-[10px]">
                        No GST Registered
                      </span>
                    )}
                  </div>
                </div>

                <span className="rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 text-[10px] font-bold uppercase">
                  Active
                </span>
              </div>

              <div className="mt-4 rounded-xl bg-surface p-3 border border-border-hairline space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-[11px] font-semibold text-text-secondary">Approval Threshold:</span>
                  <span className="font-bold font-mono text-text-primary">
                    {c.approval_limit ? `₹${c.approval_limit.toLocaleString("en-IN")}` : "No Limit"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[11px] font-semibold text-text-secondary">Roster Headcount:</span>
                  <span className="font-bold text-text-primary">{c.member_count} Members</span>
                </div>
              </div>
            </div>

            <div className="mt-5 pt-3 border-t border-border-hairline flex items-center justify-between">
              <button
                type="button"
                onClick={() => setSelectedCompany(c)}
                className="flex items-center gap-1.5 rounded-xl border border-border-hairline bg-surface px-3 py-1.5 text-xs font-bold text-text-primary hover:bg-card-surface"
              >
                <Users className="h-3.5 w-3.5 text-text-secondary" />
                <span>Manage Roster ({c.member_count})</span>
              </button>

              {canWrite && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingPolicyCompany(c);
                    setPolicyBudget(c.approval_limit || 150000);
                    setPolicyRequiresApproval(true);
                  }}
                  className="flex items-center gap-1.5 rounded-xl border border-border-hairline bg-surface px-3 py-1.5 text-xs font-bold text-text-primary hover:bg-card-surface"
                >
                  <Edit3 className="h-3.5 w-3.5 text-text-secondary" />
                  <span>Spending Policy</span>
                </button>
              )}
            </div>
          </div>
        ))}
          </div>
        </div>

        <div className="px-4 py-2.5 border-t border-[#E5E3DF] bg-[#FBF9F5] text-xs text-[#6E6D68] shrink-0 flex items-center justify-between">
          <span>Showing {companies.length} registered corporate accounts (scroll inside box for more)</span>
          <span className="font-mono text-[11px] text-[#8C8A85]">Corporate Management §3.F</span>
        </div>
      </div>

      {/* Add Company Modal */}
      {isAddingComp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl bg-card-surface p-6 shadow-xl border border-border-hairline">
            <div className="flex items-center justify-between pb-3 border-b border-border-hairline">
              <h2 className="text-lg font-black text-text-primary">Register Company</h2>
              <button
                type="button"
                onClick={() => setIsAddingComp(false)}
                className="text-text-secondary hover:text-text-primary rounded-lg p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateCompany} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-bold text-text-secondary mb-1">Company Legal Name</label>
                <input
                  type="text"
                  value={compName}
                  onChange={(e) => setCompName(e.target.value)}
                  placeholder="e.g. Acme Tech Pvt Ltd"
                  className="w-full rounded-xl border border-border-hairline bg-surface p-2.5 text-xs text-text-primary focus:bg-card-surface"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-text-secondary mb-1">GSTIN Number (Optional)</label>
                <input
                  type="text"
                  value={compGst}
                  onChange={(e) => setCompGst(e.target.value.toUpperCase())}
                  placeholder="07AAAAA0000A1Z5"
                  className="w-full rounded-xl border border-border-hairline bg-surface p-2.5 text-xs font-mono uppercase text-text-primary focus:bg-card-surface"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-text-secondary mb-1">
                  Commercial Approval Limit (₹)
                </label>
                <input
                  type="number"
                  value={compLimit}
                  onChange={(e) => setCompLimit(Number(e.target.value))}
                  className="w-full rounded-xl border border-border-hairline bg-surface p-2.5 text-xs font-mono font-bold text-text-primary focus:bg-card-surface"
                />
                <p className="mt-1 text-[11px] text-text-secondary">
                  Trips with total amount greater than this require executive commercial approval.
                </p>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-border-hairline">
                <button
                  type="button"
                  onClick={() => setIsAddingComp(false)}
                  className="rounded-xl border border-border-hairline bg-surface px-4 py-2 text-xs font-bold text-text-primary hover:bg-card-surface"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-primary-container hover:bg-primary-hover px-5 py-2 text-xs font-bold text-white shadow-xs"
                >
                  Create Company
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Spending Policy Modal */}
      {editingPolicyCompany && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl bg-card-surface p-6 shadow-xl border border-border-hairline">
            <div className="flex items-center justify-between pb-3 border-b border-border-hairline">
              <h2 className="text-lg font-black text-text-primary flex items-center gap-2">
                <Shield className="h-4 w-4 text-primary-container" />
                <span>Policy: {editingPolicyCompany.name}</span>
              </h2>
              <button
                type="button"
                onClick={() => setEditingPolicyCompany(null)}
                className="text-text-secondary hover:text-text-primary rounded-lg p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSavePolicy} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-bold text-text-secondary mb-1">
                  Max Budget Per Trip (₹)
                </label>
                <input
                  type="number"
                  value={policyBudget}
                  onChange={(e) => setPolicyBudget(Number(e.target.value))}
                  className="w-full rounded-xl border border-border-hairline bg-surface p-2.5 text-xs font-mono font-bold text-text-primary focus:bg-card-surface"
                  required
                />
                <p className="mt-1 text-[11px] text-text-secondary">
                  Trips with total amount greater than this require executive authorization.
                </p>
              </div>

              <div>
                <label className="flex items-center gap-2 text-xs font-bold text-text-primary cursor-pointer">
                  <input
                    type="checkbox"
                    checked={policyRequiresApproval}
                    onChange={(e) => setPolicyRequiresApproval(e.target.checked)}
                    className="rounded text-primary-600"
                  />
                  <span>Enforce Executive Commercial Approval</span>
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-border-hairline">
                <button
                  type="button"
                  onClick={() => setEditingPolicyCompany(null)}
                  className="rounded-xl border border-border-hairline bg-surface px-4 py-2 text-xs font-bold text-text-primary hover:bg-card-surface"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-primary-container hover:bg-primary-hover px-5 py-2 text-xs font-bold text-white shadow-xs"
                >
                  Save Policy
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Manage Members Roster Modal */}
      {selectedCompany && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-card-surface p-6 shadow-xl border border-border-hairline">
            <div className="flex items-center justify-between pb-3 border-b border-border-hairline">
              <div>
                <h2 className="text-lg font-black text-text-primary">
                  {selectedCompany.name} — Member Roster
                </h2>
                <p className="text-xs text-text-secondary mt-0.5">
                  Resolve membership by email; set corporate roles (§3.F)
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedCompany(null)}
                className="text-text-secondary hover:text-text-primary rounded-lg p-1"
              >
                ✕
              </button>
            </div>

            {/* Member List */}
            <div className="mt-4 divide-y divide-border-hairline max-h-[240px] overflow-y-auto custom-scrollbar admin-scroll overscroll-contain">
              {(selectedCompany.members || []).length === 0 ? (
                <p className="py-4 text-xs text-text-secondary italic text-center">No members added yet.</p>
              ) : (
                selectedCompany.members?.map((m) => (
                  <div key={m.id} className="py-2.5 flex items-center justify-between">
                    <div>
                      <span className="font-bold text-text-primary text-xs">{m.full_name}</span>
                      <span className="text-[11px] text-text-secondary ml-2">{m.email}</span>
                      {m.designation && (
                        <p className="text-[10px] text-text-secondary/70">{m.designation}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="rounded bg-surface border border-border-hairline px-2 py-0.5 text-[10px] font-bold uppercase text-text-secondary">
                        {m.role}
                      </span>
                      {canWrite && (
                        <button
                          type="button"
                          onClick={() => handleRemoveMember(m.id, m.full_name)}
                          className="text-rose-600 hover:text-rose-800 p-1 rounded-lg transition-colors"
                          title="Remove Member"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Add Member Form */}
            {canWrite && (
              <form onSubmit={handleAddMember} className="mt-5 pt-4 border-t border-border-hairline space-y-3">
                <h4 className="text-xs font-bold text-text-primary">Add Member to Roster</h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <input
                    type="text"
                    value={memberName}
                    onChange={(e) => setMemberName(e.target.value)}
                    placeholder="Full Name"
                    className="rounded-xl border border-border-hairline bg-surface p-2 text-xs text-text-primary focus:bg-card-surface"
                    required
                  />
                  <input
                    type="email"
                    value={memberEmail}
                    onChange={(e) => setMemberEmail(e.target.value)}
                    placeholder="Work Email"
                    className="rounded-xl border border-border-hairline bg-surface p-2 text-xs text-text-primary focus:bg-card-surface"
                    required
                  />
                  <select
                    value={memberRole}
                    onChange={(e) => setMemberRole(e.target.value as "admin" | "member")}
                    className="rounded-xl border border-border-hairline bg-surface p-2 text-xs font-bold text-text-primary focus:bg-card-surface"
                  >
                    <option value="member">Member</option>
                    <option value="admin">Company Admin</option>
                  </select>
                </div>
                <button
                  type="submit"
                  className="rounded-xl bg-surface-dark hover:bg-surface-dark/90 text-white px-4 py-2 text-xs font-bold shadow-xs"
                >
                  Add to Company
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
