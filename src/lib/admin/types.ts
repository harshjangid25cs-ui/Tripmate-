/**
 * Types for TripMate Admin & Operations System (v1)
 * Derived from md files/ADMIN.md and md files/DATABASE.md §11
 */

export type AdminRole =
  | "super_admin"
  | "catalog_manager"
  | "ops_manager"
  | "finance_manager"
  | "support_agent";

export type AdminCapability =
  | "dashboard"
  | "catalog_read"
  | "catalog_write"
  | "availability_read"
  | "availability_write"
  | "pricing_read"
  | "pricing_write"
  | "coupons_read"
  | "coupons_write"
  | "bookings_read"
  | "cancel_by_policy"
  | "cancel_full_custom_none"
  | "assign_driver"
  | "edit_traveller"
  | "internal_notes"
  | "commercial_approval"
  | "ticket_revoke_regenerate"
  | "view_id_docs"
  | "review_id_docs"
  | "send_email"
  | "users_view"
  | "users_suspend"
  | "companies_read"
  | "companies_write"
  | "payments_export"
  | "audit_read"
  | "app_settings"
  | "manage_admins";

export interface AdminUser {
  id: string;
  email: string;
  full_name: string;
  name?: string;
  role: AdminRole;
  is_active: boolean;
  mfa_enabled: boolean;
  created_at: string;
}

export type AdminActor = {
  id: string;
  role: AdminRole;
  full_name?: string;
  name?: string;
};

export interface AuditLogEntry {
  id: string;
  actor_id: string;
  actor_name: string;
  actor_role: AdminRole;
  action: string;
  entity_type: string;
  entity_id?: string;
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
  reason?: string | null;
  created_at: string;
}

export interface AppSettings {
  booking_enabled: boolean;
  commercial_enabled: boolean;
  maintenance_message: string | null;
  require_id_verification: boolean;
  id_retention_days: number;
  support_email: string;
  support_phone: string;
}

export interface RefundRule {
  id: string;
  applies_to: "normal" | "commercial" | "all";
  hours_before_min: number;
  refund_percent: number;
  is_active: boolean;
}

export interface Coupon {
  id: string;
  code: string;
  description: string;
  discount_type: "flat" | "percent";
  value: number;
  max_discount: number | null;
  min_subtotal: number;
  valid_from: string | null;
  valid_to: string | null;
  usage_limit_total: number | null;
  usage_limit_per_user: number | null;
  usage_count: number;
  applies_to: "normal" | "commercial" | "both";
  destination_id: string | null;
  circuit_id: string | null;
  auto_apply: boolean;
  is_active: boolean;
  created_at: string;
}

export interface CouponRedemption {
  id: string;
  coupon_id: string;
  coupon_code: string;
  trip_id: string;
  user_id: string;
  user_email: string;
  discount_amount: number;
  created_at: string;
}

export interface PricingConfig {
  id: number;
  service_fee: number;
  gst_rate: number;
  demo_coupon_code: string;
  demo_coupon_discount: number;
  merchant_upi_vpa?: string;
  merchant_payee_name?: string;
  active_payment_gateway?: "auto" | "direct_upi_utr" | "razorpay" | "demo";
  upi_auto_confirm?: boolean;
  bank_webhook_secret?: string;
  bank_auto_confirm?: boolean;
  bank_alert_email?: string;
  bank_alert_phone?: string;
}

export interface BankMessageInboxRecord {
  id: string;
  channel: "sms" | "gmail" | "admin_manual";
  sender: string;
  subject?: string | null;
  raw_body: string;
  amount: number;
  utr_number: string;
  payer_vpa?: string | null;
  extracted_trip_ref?: string | null;
  verification_state: "unmatched" | "ready_to_confirm" | "confirmed" | "rejected";
  matched_trip_id?: string | null;
  confirmed_by?: string | null;
  confirmed_at?: string | null;
  created_at: string;
}

export interface DestinationHighlight {
  id: string;
  destination_id: string;
  title: string;
  category?: string | null;
  duration_text?: string | null;
  badge?: string | null;
  description?: string | null;
  image_path?: string | null;
  sort_order: number;
}

export interface DestinationAdmin {
  id: string;
  slug: string;
  name: string;
  region: string;
  tagline: string;
  description: string;
  hero_image_path: string | null;
  starting_price: number | null;
  rating: number | null;
  review_count: number;
  recommended_days: string;
  best_season: string;
  badge: string | null;
  categories: string[];
  origin_label: string;
  drive_hours: number | null;
  drive_km: number | null;
  latitude?: number | null;
  longitude?: number | null;
  local_radius_km?: number;
  is_featured: boolean;
  is_bookable: boolean;
  is_active: boolean;
  allow_car: boolean;
  allow_bike: boolean;
  vehicle_required: boolean;
  min_days: number;
  max_days: number;
  max_travellers: number;
  highlights?: DestinationHighlight[];
}

export interface CircuitAdmin {
  id: string;
  destination_id: string;
  destination_name?: string;
  title: string;
  days: number;
  nights: number;
  base_price_per_person: number;
  rating: number;
  badge: string | null;
  categories: string[];
  summary: string;
  description: string;
  image_url: string;
  is_featured: boolean;
  is_active: boolean;
  allow_car: boolean | null;
  allow_bike: boolean | null;
  vehicle_required: boolean | null;
  hotel_ids: string[];
  vehicle_ids: string[];
  stop_ids: string[];
  pricing_scope?: "local_city_only" | "origin_transit_included";
  included_hotel_ids?: string[];
  included_vehicle_ids?: string[];
  included_stop_ids?: string[];
  local_sightseeing_km_per_day?: number;
}

export interface HotelAdmin {
  id: string;
  destination_id: string;
  destination_name?: string;
  name: string;
  rating: number;
  neighborhood: string;
  distance_text: string;
  price_per_night: number;
  amenities: string[];
  image_url: string;
  badge: string | null;
  is_active: boolean;
}

export interface VehicleAdmin {
  id: string;
  destination_id?: string | null;
  destination_name?: string | null;
  city?: string | null;
  type: "car" | "bike" | "bus";
  name: string;
  subtitle: string;
  description?: string;
  capacity: number;
  luggage_capacity: number;
  features: string[];
  fuel_policy: string;
  driver_type: string;
  price_per_day: number;
  image_url: string;
  is_active: boolean;
}

export interface DriverAdmin {
  id: string;
  name: string;
  phone: string;
  license_plate: string;
  rating: number;
  is_active: boolean;
}

export interface StopAdmin {
  id: string;
  destination_id: string;
  destination_name?: string;
  name: string;
  price: number;
  pricing_unit: "per_person" | "flat";
  distance_text: string;
  turnaround_text: string;
  amenities: string[];
  is_active: boolean;
  image_url?: string;
}

export interface TravellerAdmin {
  id: string;
  full_name: string;
  phone: string;
  seat_label?: string;
  id_doc_type?: string;
  id_doc_path?: string;
  id_doc_status: "not_provided" | "pending" | "approved" | "rejected";
  id_doc_reviewed_by?: string;
  id_doc_reviewed_at?: string;
  id_doc_reject_reason?: string;
  ticket_revoked: boolean;
  ticket_code?: string;
}

export interface BookingNote {
  id: string;
  trip_id: string;
  author_id: string;
  author_name: string;
  note: string;
  created_at: string;
}

export interface TripStatusHistoryItem {
  id: string;
  trip_id: string;
  from_status?: string | null;
  to_status: string;
  new_status?: string;
  note?: string | null;
  reason?: string | null;
  changed_by?: string | null;
  created_at: string;
}

export interface CompanyPolicyAdmin {
  id: string;
  company_id: string;
  type: "hotel" | "vehicle" | "approval";
  rule_text: string;
  limit_value: number | null;
  created_at?: string;
}

export interface BookingAdmin {
  id: string;
  booking_ref: string;
  user_id: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  customer_id?: string;
  kind: "normal" | "commercial";
  destination_name: string;
  destination_id?: string;
  circuit_name?: string;
  circuit_id?: string;
  start_date: string;
  end_date: string;
  days: number;
  traveler_count: number;
  subtotal_amount: number;
  service_fee: number;
  tax_amount: number;
  discount_amount: number;
  coupon_code: string | null;
  total_amount: number;
  status: "draft" | "confirmed" | "pending_approval" | "cancelled" | "completed";
  refund_amount?: number;
  company_name?: string;
  driver?: DriverAdmin | null;
  driver_id?: string | null;
  vehicle?: VehicleAdmin | null;
  vehicle_id?: string | null;
  hotel?: (HotelAdmin | { name: string; price_per_night?: number }) | null;
  hotel_id?: string | null;
  hotel_name?: string | null;
  stop_ids?: string[];
  stops?: StopAdmin[];
  origin_name?: string | null;
  origin_lat?: number | null;
  origin_lng?: number | null;
  calculated_distance_km?: number;
  transit_mode?: "local_only" | "live_origin_to_destination";
  status_history?: TripStatusHistoryItem[];
  utr_number?: string | null;
  payer_vpa?: string | null;
  verification_status?: "pending_verification" | "verified" | "rejected";
  payment_id?: string;
  travellers: TravellerAdmin[];
  notes: BookingNote[];
  created_at: string;
}

export interface CommercialApprovalItem {
  id: string;
  trip_id: string;
  company_id: string;
  company_name: string;
  gst_number: string;
  booker_name: string;
  booker_email: string;
  destination_name: string;
  dates: string;
  passenger_count: number;
  vehicle_name: string;
  total_amount: number;
  approval_limit: number;
  status: "pending_approval" | "approved" | "rejected";
  note?: string;
  requested_at: string;
}

export interface IdReviewItem {
  id: string;
  trip_id: string;
  passenger_id: string;
  booking_ref: string;
  customer_name: string;
  customer_email: string;
  passenger_name: string;
  doc_type: string;
  doc_url: string;
  status: "pending" | "approved" | "rejected";
  submitted_at: string;
  reject_reason?: string;
  reviewed_by?: string;
  reviewed_at?: string;
}

export interface IdCorrectionRequest {
  id: string;
  trip_id: string;
  passenger_id: string;
  passenger_name: string;
  requested_by: string;
  reason_code: "blurry" | "name_mismatch" | "expired" | "wrong_document_type" | "incomplete" | "other";
  note: string;
  status: "open" | "resolved" | "cancelled";
  created_at: string;
}

export interface UserAdmin {
  id: string;
  email: string;
  full_name: string;
  phone: string;
  total_bookings: number;
  total_spent: number;
  is_suspended: boolean;
  suspended_reason: string | null;
  suspended_at: string | null;
  created_at: string;
}

export interface CompanyMember {
  id: string;
  company_id: string;
  profile_id: string;
  full_name: string;
  email: string;
  role: "admin" | "member";
  employee_id?: string;
  department?: string;
  designation?: string;
}

export interface CompanyAdmin {
  id: string;
  name: string;
  gst_number: string | null;
  is_active: boolean;
  approval_limit: number | null;
  member_count: number;
  members?: CompanyMember[];
  created_at: string;
}

export interface EmailLogEntry {
  id: string;
  to_email: string;
  template:
    | "id_correction_request"
    | "booking_cancelled_by_admin"
    | "booking_updated"
    | "custom_message"
    | "approval_decision"
    | "booking_confirmed"
    | "gst_invoice_ready"
    | "driver_assigned"
    | "booking_cancelled"
    | string;
  subject: string;
  content: string;
  related_trip_id?: string;
  related_booking_ref?: string;
  sent_by: string;
  status: "sent" | "queued" | "failed";
  provider_message_id?: string;
  error?: string;
  created_at: string;
}

export interface PaymentInvoiceRecord {
  id: string;
  trip_id: string;
  booking_ref: string;
  customer_name: string;
  invoice_number: string;
  amount: number;
  gst_amount: number;
  method: "upi" | "card" | "netbanking" | "demo_pay";
  status: "completed" | "refunded" | "failed";
  itc_qualified: boolean;
  company_name?: string;
  gst_number?: string;
  utr_number?: string | null;
  payer_vpa?: string | null;
  verification_status?: "pending_verification" | "verified" | "rejected";
  provider?: string | null;
  provider_payment_id?: string | null;
  created_at: string;
}

// Aliases for admin operational models
export type AdminBooking = BookingAdmin;
export type AdminTrip = CircuitAdmin;
export type AdminApproval = CommercialApprovalItem;
export type AdminVehicle = VehicleAdmin;
export type AdminDriver = DriverAdmin;
export type AdminHotel = HotelAdmin;
export type AdminStop = StopAdmin;
export type AdminDestination = DestinationAdmin;

export interface AdminOperationalSnapshot {
  bookings: BookingAdmin[];
  approvals: CommercialApprovalItem[];
  circuits: CircuitAdmin[];
  destinations?: DestinationAdmin[];
  vehicles?: VehicleAdmin[];
  drivers?: DriverAdmin[];
  hotels?: HotelAdmin[];
  stops?: StopAdmin[];
  users?: UserAdmin[];
  companies?: CompanyAdmin[];
  payments?: PaymentInvoiceRecord[];
  coupons?: Coupon[];
  pricing?: PricingConfig;
  emailLogs?: EmailLogEntry[];
  auditLogs?: AuditLogEntry[];
  highlights?: DestinationHighlight[];
  policies?: CompanyPolicyAdmin[];
  tripStatusHistory?: TripStatusHistoryItem[];
  bankMessagesInbox?: BankMessageInboxRecord[];
  metrics: {
    totalRevenue: number;
    pendingApprovalsCount: number;
    cancelledBookings: number;
  };
}
