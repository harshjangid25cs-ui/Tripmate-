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
          <h1 className="text-xl font-black text-text-primary tracking-tight">
            Immutable Audit Trail & Ledger
          </h1>
          <p className="text-xs text-text-secondary">
            Append-only security log recording every admin modification, before/after diffs, and mandatory reasons (§3.G, §11 A4)
          </p>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-text-secondary" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter by actor, action, entity..."
            className="w-64 rounded-xl border border-border-hairline bg-surface pl-8 pr-3 py-2 text-xs text-text-primary focus:bg-card-surface focus:outline-hidden"
          />
        </div>
      </div>

      <div className="rounded-xl bg-amber-50 p-3.5 border border-amber-300 flex items-start gap-2.5 text-xs text-amber-900">
        <ShieldAlert className="h-4 w-4 text-amber-700 shrink-0 mt-0.5" />
        <p className="leading-snug">
          <strong>Database Security Enforced:</strong> The audit log table operates with a strict BEFORE UPDATE OR DELETE Postgres trigger. No administrator or service account can modify or purge entries once committed.
        </p>
      </div>

      <div className="rounded-2xl border border-border-hairline bg-card-surface p-6 shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-border-hairline text-[10px] font-extrabold uppercase tracking-wider text-text-secondary">
                <th className="py-2.5">Timestamp (IST)</th>
                <th className="py-2.5">Actor & Role</th>
                <th className="py-2.5">Action</th>
                <th className="py-2.5">Target Entity</th>
                <th className="py-2.5">Mandatory Reason</th>
                <th className="py-2.5 text-right">Inspection</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-hairline">
              {filteredLogs.map((entry) => (
                <tr key={entry.id} className="hover:bg-surface-container-low/40">
                  <td className="py-3.5 font-mono text-text-secondary text-[11px]">
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
                    <p className="font-bold text-text-primary">{entry.actor_name}</p>
                    <span className="text-[10px] text-text-secondary font-mono">{entry.actor_role}</span>
                  </td>

                  <td className="py-3.5">
                    <span className="rounded bg-surface border border-border-hairline px-2 py-0.5 text-[10px] font-mono font-extrabold uppercase text-text-primary">
                      {entry.action}
                    </span>
                  </td>

                  <td className="py-3.5 font-semibold text-text-primary">
                    {entry.entity_type}{" "}
                    {entry.entity_id && (
                      <span className="font-mono text-text-secondary text-[10px]">({entry.entity_id})</span>
                    )}
                  </td>

                  <td className="py-3.5 text-text-secondary max-w-sm">
                    {entry.reason ? (
                      <span className="italic text-[11px]">&quot;{entry.reason}&quot;</span>
                    ) : (
                      <span className="text-text-secondary/60">—</span>
                    )}
                  </td>

                  <td className="py-3.5 text-right">
                    {(entry.before || entry.after) && (
                      <button
                        type="button"
                        onClick={() => setSelectedEntry(entry)}
                        className="rounded-xl border border-border-hairline bg-surface px-2.5 py-1 text-xs font-semibold text-text-primary hover:bg-card-surface inline-flex items-center gap-1"
                      >
                        <Code className="h-3 w-3 text-text-secondary" />
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-2xl rounded-2xl bg-card-surface p-6 shadow-xl border border-border-hairline">
            <div className="flex items-center justify-between pb-3 border-b border-border-hairline">
              <div>
                <h3 className="text-base font-black text-text-primary">
                  Audit Snapshot: {selectedEntry.action.toUpperCase()} {selectedEntry.entity_type}
                </h3>
                <p className="text-xs text-text-secondary mt-0.5">
                  Actor: {selectedEntry.actor_name} ({selectedEntry.actor_role}) · {selectedEntry.created_at}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedEntry(null)}
                className="text-text-secondary hover:text-text-primary rounded-lg p-1"
              >
                ✕
              </button>
            </div>

            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="rounded-xl bg-surface-dark p-4 text-white border border-border-hairline">
                <span className="text-[10px] font-mono uppercase text-slate-400 block mb-2 font-bold">
                  State Before
                </span>
                <pre className="text-[11px] font-mono text-rose-300 overflow-x-auto max-h-60">
                  {selectedEntry.before ? JSON.stringify(selectedEntry.before, null, 2) : "null (Created)"}
                </pre>
              </div>

              <div className="rounded-xl bg-surface-dark p-4 text-white border border-border-hairline">
                <span className="text-[10px] font-mono uppercase text-slate-400 block mb-2 font-bold">
                  State After
                </span>
                <pre className="text-[11px] font-mono text-emerald-300 overflow-x-auto max-h-60">
                  {selectedEntry.after ? JSON.stringify(selectedEntry.after, null, 2) : "null (Deleted)"}
                </pre>
              </div>
            </div>

            {selectedEntry.reason && (
              <div className="mt-4 rounded-xl bg-surface p-3 border border-border-hairline text-xs">
                <span className="font-bold text-text-primary block mb-0.5">Recorded Reason:</span>
                <p className="text-text-secondary italic">&quot;{selectedEntry.reason}&quot;</p>
              </div>
            )}

            <div className="mt-5 flex justify-end pt-3 border-t border-border-hairline">
              <button
                type="button"
                onClick={() => setSelectedEntry(null)}
                className="rounded-xl border border-border-hairline bg-surface px-4 py-2 text-xs font-bold text-text-primary hover:bg-card-surface"
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
