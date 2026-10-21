"use client";

import dynamic from "next/dynamic";
import { AdminViewSkeleton } from "./AdminViewSkeleton";

const loading = () => <AdminViewSkeleton />;

export const DashboardView = dynamic(
  () => import("./DashboardView").then((m) => m.DashboardView),
  { loading }
);

export const DestinationsView = dynamic(
  () => import("./DestinationsView").then((m) => m.DestinationsView),
  { loading }
);

export const TripsView = dynamic(
  () => import("./TripsView").then((m) => m.TripsView),
  { loading }
);

export const HotelsView = dynamic(
  () => import("./HotelsView").then((m) => m.HotelsView),
  { loading }
);

export const VehiclesView = dynamic(
  () => import("./VehiclesView").then((m) => m.VehiclesView),
  { loading }
);

export const DriversView = dynamic(
  () => import("./DriversView").then((m) => m.DriversView),
  { loading }
);

export const StopsView = dynamic(
  () => import("./StopsView").then((m) => m.StopsView),
  { loading }
);

export const PricingView = dynamic(
  () => import("./PricingView").then((m) => m.PricingView),
  { loading }
);

export const CouponsView = dynamic(
  () => import("./CouponsView").then((m) => m.CouponsView),
  { loading }
);

export const BookingsView = dynamic(
  () => import("./BookingsView").then((m) => m.BookingsView),
  { loading }
);

export const ApprovalsView = dynamic(
  () => import("./ApprovalsView").then((m) => m.ApprovalsView),
  { loading }
);

export const DocumentsView = dynamic(
  () => import("./DocumentsView").then((m) => m.DocumentsView),
  { loading }
);

export const UsersView = dynamic(
  () => import("./UsersView").then((m) => m.UsersView),
  { loading }
);

export const CompaniesView = dynamic(
  () => import("./CompaniesView").then((m) => m.CompaniesView),
  { loading }
);

export const EmailsView = dynamic(
  () => import("./EmailsView").then((m) => m.EmailsView),
  { loading }
);

export const PaymentsView = dynamic(
  () => import("./PaymentsView").then((m) => m.PaymentsView),
  { loading }
);

export const AuditView = dynamic(
  () => import("./AuditView").then((m) => m.AuditView),
  { loading }
);

export const SettingsView = dynamic(
  () => import("./SettingsView").then((m) => m.SettingsView),
  { loading }
);

export const AdminUsersView = dynamic(
  () => import("./AdminUsersView").then((m) => m.AdminUsersView),
  { loading }
);

export const WhatsAppView = dynamic(
  () => import("./WhatsAppView").then((m) => m.WhatsAppView),
  { loading }
);

