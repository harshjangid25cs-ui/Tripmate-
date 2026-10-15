"use client";

import React, { useState } from "react";
import { AdminService } from "@/lib/admin/admin-service";
import type { AuditLogEntry } from "@/lib/admin/types";
import { Search, ShieldAlert, Code } from "lucide-react";

export function AuditView() {
  const [logs] = useState<AuditLogEntry[]>(() => AdminService.getAuditLogs());
  const [search, setSearch] = useState("");
  const [selectedEntry, setSelectedEntry] = useState<AuditLogEntry | null>(null);

  const filteredLogs = logs.filter((l) => {
    const q = search.toLowerCase().trim();
    return (
      !q ||
      l.actor_name.toLowerCase().includes(q) ||
      l.action.toLowerCase().includes(q) ||
      l.entity_type.toLowerCase().includes(q) ||
      (l.reason && l.reason.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-6 animate-in fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight">
            Immutable Audit Trail & Ledger
          </h1>
          <p className="text-xs text-slate-500">
            Append-only security log recording every admin modification, before/after diffs, and mandatory reasons (§3.G, §11 A4)
          </p>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter by actor, action, entity..."
            className="w-64 rounded-xl border border-slate-300 pl-8 pr-3 py-2 text-xs focus:ring-2 focus:ring-primary-500/20"
          />
        </div>
      </div>

      <div className="rounded-2xl bg-amber-50 p-3.5 border border-amber-200 flex items-start gap-2.5 text-xs text-amber-900">
        <ShieldAlert className="h-4 w-4 text-amber-700 flex-shrink-0 mt-0.5" />
        <p className="leading-snug">
          <strong>Database Security Enforced:</strong> The audit log table operates with a strict BEFORE UPDATE OR DELETE Postgres trigger. No administrator or service account can modify or purge entries once committed.
        </p>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                <th className="py-2.5">Timestamp (IST)</th>
                <th className="py-2.5">Actor & Role</th>
                <th className="py-2.5">Action</th>
                <th className="py-2.5">Target Entity</th>
                <th className="py-2.5">Mandatory Reason</th>
                <th className="py-2.5 text-right">Inspection</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredLogs.map((entry) => (
                <tr key={entry.id} className="hover:bg-slate-50/50">
                  <td className="py-3.5 font-mono text-slate-500 text-[11px]">
                    {new Date(entry.created_at).toLocaleDateString([], {
                      month: "short",
                      day: "numeric",
                    })}{" "}
                    {new Date(entry.created_at).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                      second: "2-digit",
                    })}
                  </td>

                  <td className="py-3.5">
                    <p className="font-bold text-slate-900">{entry.actor_name}</p>
                    <span className="text-[10px] text-slate-400 font-mono">{entry.actor_role}</span>
                  </td>

                  <td className="py-3.5">
                    <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-mono font-extrabold uppercase text-slate-800">
                      {entry.action}
                    </span>
                  </td>

                  <td className="py-3.5 font-semibold text-slate-700">
                    {entry.entity_type}{" "}
                    {entry.entity_id && (
                      <span className="font-mono text-slate-400 text-[10px]">({entry.entity_id})</span>
                    )}
                  </td>

                  <td className="py-3.5 text-slate-600 max-w-sm">
                    {entry.reason ? (
                      <span className="italic text-[11px]">&quot;{entry.reason}&quot;</span>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>

                  <td className="py-3.5 text-right">
                    {(entry.before || entry.after) && (
                      <button
                        type="button"
                        onClick={() => setSelectedEntry(entry)}
                        className="rounded-xl border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 inline-flex items-center gap-1"
                      >
                        <Code className="h-3 w-3" />
                        <span>Diff</span>
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Before / After Diff Inspector Modal */}
      {selectedEntry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-2xl rounded-3xl bg-white p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-base font-black text-slate-900">
                  Audit Snapshot: {selectedEntry.action.toUpperCase()} {selectedEntry.entity_type}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Actor: {selectedEntry.actor_name} ({selectedEntry.actor_role}) · {selectedEntry.created_at}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedEntry(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="rounded-2xl bg-slate-950 p-4 text-white">
                <span className="text-[10px] font-mono uppercase text-slate-400 block mb-2 font-bold">
                  State Before
                </span>
                <pre className="text-[11px] font-mono text-rose-300 overflow-x-auto max-h-60">
                  {selectedEntry.before ? JSON.stringify(selectedEntry.before, null, 2) : "null (Created)"}
                </pre>
              </div>

              <div className="rounded-2xl bg-slate-950 p-4 text-white">
                <span className="text-[10px] font-mono uppercase text-slate-400 block mb-2 font-bold">
                  State After
                </span>
                <pre className="text-[11px] font-mono text-emerald-300 overflow-x-auto max-h-60">
                  {selectedEntry.after ? JSON.stringify(selectedEntry.after, null, 2) : "null (Deleted)"}
                </pre>
              </div>
            </div>

            {selectedEntry.reason && (
              <div className="mt-4 rounded-xl bg-slate-50 p-3 border border-slate-200 text-xs">
                <span className="font-bold text-slate-700 block mb-0.5">Recorded Reason:</span>
                <p className="text-slate-600 italic">&quot;{selectedEntry.reason}&quot;</p>
              </div>
            )}

            <div className="mt-5 flex justify-end pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setSelectedEntry(null)}
                className="rounded-xl border border-slate-300 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
