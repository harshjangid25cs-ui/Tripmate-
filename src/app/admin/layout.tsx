export const dynamic = "force-dynamic";
export const revalidate = 0;

import type { Metadata } from "next";
import React from "react";
import { headers } from "next/headers";
import { AdminProvider } from "@/lib/admin/admin-context";
import { AdminHeader } from "@/components/features/admin/AdminHeader";
import { requireAdmin } from "@/lib/admin/admin-auth";

import { fetchAdminOperationalSnapshot } from "@/lib/actions/admin-ops";

// Enforce noindex per ADMIN.md §1 & §5: "Admin is a separate area (/admin, own layout, own guard, noindex)"
export const metadata: Metadata = {
  title: "TripMate Admin & Operations",
  description: "Internal operator control portal for TripMate road trip network.",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const headerList = headers();
  const pathname = headerList.get("x-pathname") || "";

  // Bypass authorization check on the login screen
  if (pathname === "/admin/login") {
    return (
      <AdminProvider>
        <div className="min-h-screen bg-surface font-sans text-text-primary antialiased selection:bg-primary-container selection:text-white flex flex-col">
          <AdminHeader />
          <div className="flex-1 flex overflow-hidden">{children}</div>
        </div>
      </AdminProvider>
    );
  }

  // Enforce server-side role-based authorization check + AAL2 MFA via requireAdmin
  await requireAdmin({ redirectOnFail: true });

  // Load live Supabase operational snapshot for authorized operator
  let initialSnapshot = null;
  try {
    const snapshotRes = await fetchAdminOperationalSnapshot();
    if (snapshotRes.ok && snapshotRes.data) {
      initialSnapshot = snapshotRes.data;
    }
  } catch {
    // Graceful fallback to client seed
  }

  return (
    <AdminProvider initialSnapshot={initialSnapshot}>
      <div className="min-h-screen bg-surface font-sans text-text-primary antialiased selection:bg-primary-container selection:text-white flex flex-col">
        <AdminHeader />
        <div className="flex-1 flex overflow-hidden">{children}</div>
      </div>
    </AdminProvider>
  );
}
