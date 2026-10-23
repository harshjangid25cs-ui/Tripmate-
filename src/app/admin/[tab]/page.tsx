"use client";

import React from "react";
import { useParams, useRouter } from "next/navigation";
import { AdminSidebar } from "@/components/features/admin/AdminSidebar";
import { AdminHeader } from "@/components/features/admin/AdminHeader";
import {
  DashboardView,
  DestinationsView,
  TripsView,
  HotelsView,
  VehiclesView,
  DriversView,
  StopsView,
  PricingView,
  CouponsView,
  BookingsView,
  ApprovalsView,
  DocumentsView,
  UsersView,
  CompaniesView,
  EmailsView,
  PaymentsView,
  AuditView,
  SettingsView,
  AdminUsersView,
  WhatsAppView,
} from "@/components/features/admin/AdminDynamicViews";

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
      case "whatsapp":
        return <WhatsAppView />;
      default:
        return <DashboardView onNavigate={handleSelectTab} />;
    }
  };

  return (
    <div className="flex w-full h-screen overflow-hidden">
      <AdminSidebar activeTab={activeTab} onSelectTab={handleSelectTab} />
      <div className="flex-1 flex flex-col h-screen min-w-0 overflow-hidden">
        <AdminHeader />
        <main className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 overscroll-contain min-h-0 custom-scrollbar admin-scroll">
          <div className="max-w-7xl mx-auto w-full space-y-6">
            {renderActiveView()}
          </div>
        </main>
      </div>
    </div>
  );
}
