"use client";

import React from "react";
import { useAdmin } from "@/lib/admin/admin-context";
import type { AdminCapability } from "@/lib/admin/types";
import {
  LayoutDashboard,
  CalendarDays,
  FileCheck2,
  Building2,
  MapPin,
  Route,
  Hotel,
  Car,
  UserCheck,
  Compass,
  Coins,
  TicketPercent,
  Receipt,
  Users,
  Briefcase,
  Mail,
  History,
  Sliders,
  ShieldCheck,
  Lock,
  MessageSquare,
} from "lucide-react";

interface NavItem {
  id: string;
  label: string;
  icon: React.ElementType;
  capability?: AdminCapability;
  badgeCount?: number;
  badgeColor?: string;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

export function AdminSidebar({
  activeTab,
  onSelectTab,
}: {
  activeTab: string;
  onSelectTab: (tab: string) => void;
}) {
  const { hasPermission, currentRole } = useAdmin();

  const sections: NavSection[] = [
    {
      title: "Operations",
      items: [
        {
          id: "overview",
          label: "Dashboard",
          icon: LayoutDashboard,
          capability: "dashboard",
        },
        {
          id: "bookings",
          label: "Bookings & Dispatch",
          icon: CalendarDays,
          capability: "bookings_read",
        },
        {
          id: "documents",
          label: "ID Review Queue",
          icon: FileCheck2,
          capability: "view_id_docs",
          badgeCount: 2,
          badgeColor: "bg-amber-50 text-amber-800 border border-amber-200",
        },
        {
          id: "approvals",
          label: "Commercial Approvals",
          icon: Building2,
          capability: "commercial_approval",
          badgeCount: 1,
          badgeColor: "bg-purple-50 text-purple-800 border border-purple-200",
        },
      ],
    },
    {
      title: "Catalog",
      items: [
        {
          id: "destinations",
          label: "Destinations",
          icon: MapPin,
          capability: "catalog_read",
        },
        {
          id: "trips",
          label: "Circuits & Trips",
          icon: Route,
          capability: "catalog_read",
        },
        {
          id: "hotels",
          label: "Hotels",
          icon: Hotel,
          capability: "catalog_read",
        },
        {
          id: "vehicles",
          label: "Fleet Vehicles",
          icon: Car,
          capability: "catalog_read",
        },
        {
          id: "drivers",
          label: "Drivers",
          icon: UserCheck,
          capability: "catalog_read",
        },
        {
          id: "stops",
          label: "Highway Stops",
          icon: Compass,
          capability: "catalog_read",
        },
      ],
    },
    {
      title: "Pricing & Finance",
      items: [
        {
          id: "pricing",
          label: "Pricing & Refund Rules",
          icon: Coins,
          capability: "pricing_read",
        },
        {
          id: "coupons",
          label: "Coupons & Redeem",
          icon: TicketPercent,
          capability: "coupons_read",
        },
        {
          id: "payments",
          label: "Payments & Invoices",
          icon: Receipt,
          capability: "payments_export",
        },
      ],
    },
    {
      title: "Management",
      items: [
        {
          id: "users",
          label: "Customers & Users",
          icon: Users,
          capability: "users_view",
        },
        {
          id: "companies",
          label: "Corporate Accounts",
          icon: Briefcase,
          capability: "companies_read",
        },
        {
          id: "emails",
          label: "Email Dispatch Log",
          icon: Mail,
          capability: "send_email",
        },
      ],
    },
    {
      title: "System & Governance",
      items: [
        {
          id: "audit",
          label: "Audit Trail",
          icon: History,
          capability: "audit_read",
        },
        {
          id: "settings",
          label: "App Settings & Flags",
          icon: Sliders,
          capability: "app_settings",
        },
        {
          id: "admins",
          label: "Admin Accounts",
          icon: ShieldCheck,
          capability: "manage_admins",
        },
        {
          id: "whatsapp",
          label: "WhatsApp Sender",
          icon: MessageSquare,
          capability: "app_settings",
        },
      ],
    },
  ];

  return (
    <aside className="w-64 shrink-0 border-r border-border-hairline bg-surface-container-low p-4 sticky top-16 h-[calc(100vh-4rem)] overflow-y-auto custom-scrollbar flex flex-col justify-between self-start">
      <div className="space-y-6">
        {sections.map((section) => (
          <div key={section.title}>
            <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-text-secondary">
              {section.title}
            </p>
            <div className="mt-1.5 space-y-0.5">
              {section.items.map((item) => {
                const allowed = item.capability ? hasPermission(item.capability) : true;
                const isSelected = activeTab === item.id;
                const Icon = item.icon;

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      if (allowed) onSelectTab(item.id);
                    }}
                    disabled={!allowed}
                    className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-xs font-semibold transition-all ${
                      isSelected
                        ? "bg-surface-dark text-white shadow-xs"
                        : allowed
                        ? "text-text-primary/80 hover:bg-card-surface hover:text-text-primary"
                        : "cursor-not-allowed opacity-40 text-text-secondary/50"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon
                        className={`h-4 w-4 ${
                          isSelected ? "text-primary-container" : allowed ? "text-text-secondary" : "text-text-secondary/40"
                        }`}
                      />
                      <span>{item.label}</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {item.badgeCount !== undefined && allowed && (
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                            item.badgeColor || "bg-card-surface text-text-primary border border-border-hairline"
                          }`}
                        >
                          {item.badgeCount}
                        </span>
                      )}
                      {!allowed && (
                        <span title="Restricted by Role Matrix">
                          <Lock className="h-3 w-3 text-text-secondary/60" />
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Role Notice at Footer */}
      <div className="mt-6 rounded-2xl bg-card-surface p-3.5 border border-border-hairline shadow-xs">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold uppercase tracking-wider text-text-secondary">
            Current Filter
          </span>
          <span className="text-[10px] font-bold text-primary-container uppercase">§2 Matrix</span>
        </div>
        <p className="mt-1 text-xs font-bold text-text-primary capitalize">
          {currentRole.replace(/_/g, " ")}
        </p>
        <p className="text-[10px] text-text-secondary mt-0.5 leading-snug">
          Buttons and views automatically enforce role boundaries.
        </p>
      </div>
    </aside>
  );
}
