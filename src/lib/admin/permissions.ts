import type { AdminRole, AdminCapability } from "./types";

export interface RoleInfo {
  id: AdminRole;
  label: string;
  badgeColor: string;
  description: string;
}

export const ADMIN_ROLES: RoleInfo[] = [
  {
    id: "super_admin",
    label: "Super Admin",
    badgeColor: "bg-purple-100 text-purple-800 border-purple-300",
    description: "Unrestricted operational authority, settings, audit trails, and admin management.",
  },
  {
    id: "catalog_manager",
    label: "Catalog Manager",
    badgeColor: "bg-blue-100 text-blue-800 border-blue-300",
    description: "Curate destinations, circuits, hotels, vehicles, drivers, stops, and publish readiness.",
  },
  {
    id: "ops_manager",
    label: "Ops Manager",
    badgeColor: "bg-emerald-100 text-emerald-800 border-emerald-300",
    description: "Manage bookings, driver dispatch, commercial approvals, ID document verification, and user state.",
  },
  {
    id: "finance_manager",
    label: "Finance Manager",
    badgeColor: "bg-amber-100 text-amber-800 border-amber-300",
    description: "Configure pricing, refund rules, coupons, discretionary cancellations, payments & CSV audits.",
  },
  {
    id: "support_agent",
    label: "Support Agent",
    badgeColor: "bg-slate-100 text-slate-800 border-slate-300",
    description: "View bookings, manage internal notes, review ID verification queues, and communicate with customers.",
  },
];

/**
 * Checks whether an admin role has permission for a specific capability.
 * Strictly adheres to ADMIN.md §2 permission matrix.
 */
export function hasAdminPermission(
  role: AdminRole,
  capability: AdminCapability
): boolean {
  if (role === "super_admin") return true;

  switch (capability) {
    case "dashboard":
      return true; // All roles

    case "catalog_read":
    case "availability_read":
      return true; // All roles have read access to catalog

    case "catalog_write":
    case "availability_write":
      return role === "catalog_manager";

    case "pricing_read":
      return role === "finance_manager" || role === "ops_manager";

    case "pricing_write":
      return role === "finance_manager";

    case "coupons_read":
      return (
        role === "finance_manager" ||
        role === "ops_manager" ||
        role === "support_agent"
      );

    case "coupons_write":
      return role === "finance_manager";

    case "bookings_read":
      return (
        role === "ops_manager" ||
        role === "finance_manager" ||
        role === "support_agent"
      );

    case "cancel_by_policy":
      return role === "ops_manager" || role === "finance_manager";

    case "cancel_full_custom_none":
      return role === "finance_manager";

    case "assign_driver":
    case "edit_traveller":
      return role === "ops_manager";

    case "internal_notes":
      return role === "ops_manager" || role === "support_agent";

    case "commercial_approval":
      return role === "ops_manager";

    case "ticket_revoke_regenerate":
      return role === "ops_manager";

    case "view_id_docs":
    case "review_id_docs":
      return role === "ops_manager" || role === "support_agent";

    case "send_email":
      return role === "ops_manager" || role === "support_agent";

    case "users_view":
      return role === "ops_manager" || role === "support_agent";

    case "users_suspend":
      return role === "ops_manager";

    case "companies_read":
      return role === "ops_manager" || role === "finance_manager";

    case "companies_write":
      return role === "ops_manager";

    case "payments_export":
      return role === "finance_manager";

    case "audit_read":
      return role === "finance_manager";

    case "app_settings":
    case "manage_admins":
      return false; // Only super_admin

    default:
      return false;
  }
}
