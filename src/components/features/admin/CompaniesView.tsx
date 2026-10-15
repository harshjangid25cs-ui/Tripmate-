"use client";

import React, { useState } from "react";
import { AdminService } from "@/lib/admin/admin-service";
import { useAdmin } from "@/lib/admin/admin-context";
import type { CompanyAdmin } from "@/lib/admin/types";
import { Plus, Users } from "lucide-react";

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
          <h1 className="text-xl font-black text-slate-900 tracking-tight">
            Corporate Partners & Companies
          </h1>
          <p className="text-xs text-slate-500">
            GST compliance, member rosters, corporate roles, and approval policies (§3.F, §4 W9)
          </p>
        </div>

        {canWrite && (
          <button
            type="button"
            onClick={() => setIsAddingComp(true)}
            className="flex items-center gap-2 rounded-2xl bg-primary-600 hover:bg-primary-700 px-4 py-2 text-xs font-bold text-white shadow-sm"
          >
            <Plus className="h-4 w-4" />
            <span>Add Company</span>
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {companies.map((c) => (
          <div
            key={c.id}
            className="rounded-3xl border border-slate-200 bg-white p-5 shadow-xs flex flex-col justify-between"
          >
            <div>
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-base font-black text-slate-900">{c.name}</h3>
                  <div className="mt-1 flex items-center gap-2">
                    {c.gst_number ? (
                      <span className="rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 text-[10px] font-mono font-bold">
                        ITC QUALIFIED · {c.gst_number}
                      </span>
                    ) : (
                      <span className="rounded-md bg-slate-100 text-slate-500 px-2 py-0.5 text-[10px]">
                        No GST Registered
                      </span>
                    )}
                  </div>
                </div>

                <span className="rounded-full bg-emerald-100 text-emerald-800 px-2 py-0.5 text-[10px] font-bold uppercase">
                  Active
                </span>
              </div>

              <div className="mt-4 rounded-2xl bg-slate-50 p-3 border border-slate-100 space-y-2 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span className="text-[11px] font-semibold text-slate-400">Approval Threshold:</span>
                  <span className="font-bold font-mono text-slate-800">
                    {c.approval_limit ? `₹${c.approval_limit.toLocaleString("en-IN")}` : "No Limit"}
                  </span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span className="text-[11px] font-semibold text-slate-400">Roster Headcount:</span>
                  <span className="font-bold text-slate-800">{c.member_count} Members</span>
                </div>
              </div>
            </div>

            <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setSelectedCompany(c)}
                className="flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50"
              >
                <Users className="h-3.5 w-3.5" />
                <span>Manage Roster</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Add Company Modal */}
      {isAddingComp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h2 className="text-lg font-black text-slate-900">Register Company</h2>
              <button
                type="button"
                onClick={() => setIsAddingComp(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateCompany} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Company Legal Name</label>
                <input
                  type="text"
                  value={compName}
                  onChange={(e) => setCompName(e.target.value)}
                  placeholder="e.g. Acme Tech Pvt Ltd"
                  className="w-full rounded-xl border border-slate-300 p-2.5 text-xs"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">GSTIN Number (Optional)</label>
                <input
                  type="text"
                  value={compGst}
                  onChange={(e) => setCompGst(e.target.value.toUpperCase())}
                  placeholder="07AAAAA0000A1Z5"
                  className="w-full rounded-xl border border-slate-300 p-2.5 text-xs font-mono uppercase"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Commercial Approval Limit (₹)
                </label>
                <input
                  type="number"
                  value={compLimit}
                  onChange={(e) => setCompLimit(Number(e.target.value))}
                  className="w-full rounded-xl border border-slate-300 p-2.5 text-xs font-mono font-bold"
                />
                <p className="mt-1 text-[11px] text-slate-500">
                  Trips with total amount greater than this require executive commercial approval.
                </p>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddingComp(false)}
                  className="rounded-xl border border-slate-300 px-4 py-2 text-xs font-bold text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-primary-600 hover:bg-primary-700 px-5 py-2 text-xs font-bold text-white shadow-sm"
                >
                  Create Company
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Manage Members Roster Modal */}
      {selectedCompany && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h2 className="text-lg font-black text-slate-900">
                  {selectedCompany.name} — Member Roster
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Resolve membership by email; set corporate roles (§3.F)
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedCompany(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            {/* Member List */}
            <div className="mt-4 divide-y divide-slate-100 max-h-52 overflow-y-auto">
              {(selectedCompany.members || []).length === 0 ? (
                <p className="py-4 text-xs text-slate-400 italic text-center">No members added yet.</p>
              ) : (
                selectedCompany.members?.map((m) => (
                  <div key={m.id} className="py-2.5 flex items-center justify-between">
                    <div>
                      <span className="font-bold text-slate-900 text-xs">{m.full_name}</span>
                      <span className="text-[11px] text-slate-400 ml-2">{m.email}</span>
                      {m.designation && (
                        <p className="text-[10px] text-slate-500">{m.designation}</p>
                      )}
                    </div>
                    <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase text-slate-700">
                      {m.role}
                    </span>
                  </div>
                ))
              )}
            </div>

            {/* Add Member Form */}
            {canWrite && (
              <form onSubmit={handleAddMember} className="mt-5 pt-4 border-t border-slate-100 space-y-3">
                <h4 className="text-xs font-bold text-slate-800">Add Member to Roster</h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <input
                    type="text"
                    value={memberName}
                    onChange={(e) => setMemberName(e.target.value)}
                    placeholder="Full Name"
                    className="rounded-xl border border-slate-300 p-2 text-xs"
                    required
                  />
                  <input
                    type="email"
                    value={memberEmail}
                    onChange={(e) => setMemberEmail(e.target.value)}
                    placeholder="Work Email"
                    className="rounded-xl border border-slate-300 p-2 text-xs"
                    required
                  />
                  <select
                    value={memberRole}
                    onChange={(e) => setMemberRole(e.target.value as "admin" | "member")}
                    className="rounded-xl border border-slate-300 p-2 text-xs font-bold"
                  >
                    <option value="member">Member</option>
                    <option value="admin">Company Admin</option>
                  </select>
                </div>
                <button
                  type="submit"
                  className="rounded-xl bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 text-xs font-bold"
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
