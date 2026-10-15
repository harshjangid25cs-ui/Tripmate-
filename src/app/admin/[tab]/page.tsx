"use client";

import React from "react";
import { useParams, useRouter } from "next/navigation";
import { AdminSidebar } from "@/components/features/admin/AdminSidebar";
import { DashboardView } from "@/components/features/admin/DashboardView";
import { DestinationsView } from "@/components/features/admin/DestinationsView";
import { TripsView } from "@/components/features/admin/TripsView";
import { HotelsView } from "@/components/features/admin/HotelsView";
import { VehiclesView } from "@/components/features/admin/VehiclesView";
import { DriversView } from "@/components/features/admin/DriversView";
import { StopsView } from "@/components/features/admin/StopsView";
import { PricingView } from "@/components/features/admin/PricingView";
import { CouponsView } from "@/components/features/admin/CouponsView";
import { BookingsView } from "@/components/features/admin/BookingsView";
import { ApprovalsView } from "@/components/features/admin/ApprovalsView";
import { DocumentsView } from "@/components/features/admin/DocumentsView";
import { UsersView } from "@/components/features/admin/UsersView";
import { CompaniesView } from "@/components/features/admin/CompaniesView";
import { EmailsView } from "@/components/features/admin/EmailsView";
import { PaymentsView } from "@/components/features/admin/PaymentsView";
import { AuditView } from "@/components/features/admin/AuditView";
import { SettingsView } from "@/components/features/admin/SettingsView";
import { AdminUsersView } from "@/components/features/admin/AdminUsersView";

export default function DynamicAdminTabPage() {
  const params = useParams();
  const router = useRouter();
  const activeTab = (params?.tab as string) || "overview";

  const handleSelectTab = (tab: string) => {
    router.push(`/admin/${tab}`);
  };

  const renderActiveView = () => {
    switch (activeTab) {
      case "overview":
      case "dashboard":
        return <DashboardView onNavigate={handleSelectTab} />;
      case "destinations":
        return <DestinationsView />;
      case "trips":
        return <TripsView />;
      case "hotels":
        return <HotelsView />;
      case "vehicles":
        return <VehiclesView />;
      case "drivers":
        return <DriversView />;
      case "stops":
        return <StopsView />;
      case "pricing":
        return <PricingView />;
      case "coupons":
        return <CouponsView />;
      case "bookings":
        return <BookingsView />;
      case "approvals":
        return <ApprovalsView />;
      case "documents":
        return <DocumentsView />;
      case "users":
        return <UsersView />;
      case "companies":
        return <CompaniesView />;
      case "emails":
        return <EmailsView />;
      case "payments":
        return <PaymentsView />;
      case "audit":
        return <AuditView />;
      case "settings":
        return <SettingsView />;
      case "admins":
        return <AdminUsersView />;
      default:
        return <DashboardView onNavigate={handleSelectTab} />;
    }
  };

  return (
    <div className="flex w-full min-h-[calc(100vh-4rem)]">
      <AdminSidebar activeTab={activeTab} onSelectTab={handleSelectTab} />
      <main className="flex-1 p-6 md:p-8 overflow-y-auto max-w-7xl mx-auto w-full">
        {renderActiveView()}
      </main>
    </div>
  );
}
