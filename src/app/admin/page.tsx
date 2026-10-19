"use client";

import React, { Suspense, useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { AdminSidebar } from "@/components/features/admin/AdminSidebar";
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
} from "@/components/features/admin/AdminDynamicViews";

import { AdminViewSkeleton } from "@/components/features/admin/AdminViewSkeleton";

function AdminPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const tabParam = searchParams.get("tab") || "overview";
  const [activeTab, setActiveTab] = useState(tabParam);

  useEffect(() => {
    if (tabParam && tabParam !== activeTab) {
      setActiveTab(tabParam);
    }
  }, [tabParam, activeTab]);

  const handleSelectTab = (tab: string) => {
    setActiveTab(tab);
    router.push(`/admin?tab=${tab}`, { scroll: false });
  };

  const renderActiveView = () => {
    switch (activeTab) {
      case "overview":
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

export default function AdminPage() {
  return (
    <Suspense
      fallback={
        <div className="flex w-full min-h-[calc(100vh-4rem)]">
          <div className="hidden lg:block w-64 bg-surface-dark border-r border-border-hairline shrink-0" />
          <main className="flex-1 p-6 md:p-8 max-w-7xl mx-auto w-full">
            <AdminViewSkeleton />
          </main>
        </div>
      }
    >
      <AdminPageContent />
    </Suspense>
  );
}
