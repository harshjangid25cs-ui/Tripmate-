import type {
  AdminRole,
  AdminUser,
  AdminActor,
  AuditLogEntry,
  AppSettings,
  RefundRule,
  Coupon,
  CouponRedemption,
  PricingConfig,
  DestinationAdmin,
  CircuitAdmin,
  HotelAdmin,
  VehicleAdmin,
  DriverAdmin,
  StopAdmin,
  BookingAdmin,
  CommercialApprovalItem,
  IdReviewItem,
  IdCorrectionRequest,
  UserAdmin,
  CompanyAdmin,
  EmailLogEntry,
  PaymentInvoiceRecord,
  DestinationHighlight,
  CompanyPolicyAdmin,
  TripStatusHistoryItem,
} from "./types";
import {
  adminUpsertCouponAction,
  adminToggleCouponAction,
  adminUpdatePricingConfigAction,
} from "@/lib/actions/admin-ops";

// Initial seed data reflecting TripMate catalog & specs
const INITIAL_APP_SETTINGS: AppSettings = {
  booking_enabled: true,
  commercial_enabled: true,
  maintenance_message: null,
  require_id_verification: true,
  id_retention_days: 90,
  support_email: "support@tripmate.in",
  support_phone: "+91 8000 123 456",
};

const INITIAL_PRICING_CONFIG: PricingConfig = {
  id: 1,
  service_fee: 999,
  gst_rate: 0.18,
  demo_coupon_code: "EXPLOREINDIA",
  demo_coupon_discount: 2000,
  merchant_upi_vpa: "tripmate@upi",
  merchant_payee_name: "TripMate Travels",
  active_payment_gateway: "auto",
  upi_auto_confirm: true,
};

const INITIAL_REFUND_RULES: RefundRule[] = [
  {
    id: "rf-1",
    applies_to: "all",
    hours_before_min: 48,
    refund_percent: 100,
    is_active: true,
  },
  {
    id: "rf-2",
    applies_to: "all",
    hours_before_min: 24,
    refund_percent: 50,
    is_active: true,
  },
  {
    id: "rf-3",
    applies_to: "all",
    hours_before_min: 0,
    refund_percent: 0,
    is_active: true,
  },
];

const INITIAL_ADMINS: AdminUser[] = [
  {
    id: "admin-super",
    email: "tripmateoffical007@gmail.com",
    full_name: "Super Administrator",
    role: "super_admin",
    is_active: true,
    mfa_enabled: true,
    created_at: "2026-09-01T10:00:00Z",
  },
  {
    id: "admin-1",
    email: "superadmin@tripmate.in",
    full_name: "Aaditya Singhania",
    role: "super_admin",
    is_active: true,
    mfa_enabled: true,
    created_at: "2026-09-01T10:00:00Z",
  },
  {
    id: "admin-2",
    email: "catalog@tripmate.in",
    full_name: "Pooja Varma",
    role: "catalog_manager",
    is_active: true,
    mfa_enabled: true,
    created_at: "2026-09-05T11:30:00Z",
  },
  {
    id: "admin-3",
    email: "ops@tripmate.in",
    full_name: "Devendra Rathore",
    role: "ops_manager",
    is_active: true,
    mfa_enabled: true,
    created_at: "2026-09-10T09:15:00Z",
  },
  {
    id: "admin-4",
    email: "finance@tripmate.in",
    full_name: "Kavita Sethi",
    role: "finance_manager",
    is_active: true,
    mfa_enabled: true,
    created_at: "2026-09-12T14:45:00Z",
  },
  {
    id: "admin-5",
    email: "support@tripmate.in",
    full_name: "Rohan Kapoor",
    role: "support_agent",
    is_active: true,
    mfa_enabled: true,
    created_at: "2026-09-15T08:00:00Z",
  },
];

interface AdminState {
  settings: AppSettings;
  pricing: PricingConfig;
  refundRules: RefundRule[];
  destinations: DestinationAdmin[];
  circuits: CircuitAdmin[];
  hotels: HotelAdmin[];
  vehicles: VehicleAdmin[];
  drivers: DriverAdmin[];
  stops: StopAdmin[];
  coupons: Coupon[];
  redemptions: CouponRedemption[];
  bookings: BookingAdmin[];
  idReviews: IdReviewItem[];
  correctionRequests: IdCorrectionRequest[];
  users: UserAdmin[];
  companies: CompanyAdmin[];
  emails: EmailLogEntry[];
  payments: PaymentInvoiceRecord[];
  auditLogs: AuditLogEntry[];
  highlights: DestinationHighlight[];
  policies: CompanyPolicyAdmin[];
  tripStatusHistory: TripStatusHistoryItem[];
  admins: AdminUser[];
}

function createDefaultState(): AdminState {
  return {
    settings: INITIAL_APP_SETTINGS,
    pricing: INITIAL_PRICING_CONFIG,
    refundRules: INITIAL_REFUND_RULES,
    destinations: [],
    circuits: [],
    hotels: [],
    vehicles: [],
    drivers: [],
    stops: [],
    coupons: [],
    redemptions: [],
    bookings: [],
    idReviews: [],
    correctionRequests: [],
    users: [],
    companies: [],
    emails: [],
    payments: [],
    auditLogs: [],
    highlights: [],
    policies: [],
    tripStatusHistory: [],
    admins: INITIAL_ADMINS,
  };
}

// Global in-memory cache strictly initialized with empty collections
const currentState: AdminState = createDefaultState();

export class AdminService {
  private static subscribers: Array<() => void> = [];

  static subscribe(fn: () => void) {
    this.subscribers.push(fn);
    return () => {
      this.subscribers = this.subscribers.filter((s) => s !== fn);
    };
  }

  private static notify() {
    for (const sub of this.subscribers) {
      sub();
    }
  }

  /**
   * Hydrates the AdminService state strictly with live records from Supabase.
   * Completely overwrites collections with live rows; NEVER merges fake mock records.
   */
  static hydrateOperationalData(snapshot: {
    bookings?: BookingAdmin[];
    circuits?: CircuitAdmin[];
    vehicles?: VehicleAdmin[];
    drivers?: DriverAdmin[];
    hotels?: HotelAdmin[];
    stops?: StopAdmin[];
    destinations?: DestinationAdmin[];
    users?: UserAdmin[];
    companies?: CompanyAdmin[];
    payments?: PaymentInvoiceRecord[];
    approvals?: CommercialApprovalItem[];
    coupons?: Coupon[];
    pricing?: PricingConfig;
    emailLogs?: EmailLogEntry[];
    auditLogs?: AuditLogEntry[];
    highlights?: DestinationHighlight[];
    policies?: CompanyPolicyAdmin[];
    tripStatusHistory?: TripStatusHistoryItem[];
  }) {
    if (snapshot.bookings !== undefined) {
      currentState.bookings = [...snapshot.bookings];
    }
    if (snapshot.circuits !== undefined) {
      currentState.circuits = [...snapshot.circuits];
    }
    if (snapshot.vehicles !== undefined) {
      currentState.vehicles = [...snapshot.vehicles];
    }
    if (snapshot.drivers !== undefined) {
      currentState.drivers = [...snapshot.drivers];
    }
    if (snapshot.hotels !== undefined) {
      currentState.hotels = [...snapshot.hotels];
    }
    if (snapshot.stops !== undefined) {
      currentState.stops = [...snapshot.stops];
    }
    if (snapshot.destinations !== undefined) {
      currentState.destinations = [...snapshot.destinations];
    }
    if (snapshot.users !== undefined) {
      currentState.users = [...snapshot.users];
    }
    if (snapshot.companies !== undefined) {
      currentState.companies = [...snapshot.companies];
    }
    if (snapshot.payments !== undefined) {
      currentState.payments = [...snapshot.payments];
    }
    if (snapshot.coupons !== undefined && snapshot.coupons.length > 0) {
      currentState.coupons = [...snapshot.coupons];
    }
    if (snapshot.pricing !== undefined) {
      currentState.pricing = { ...snapshot.pricing };
    }
    if (snapshot.emailLogs !== undefined && snapshot.emailLogs.length > 0) {
      currentState.emails = [...snapshot.emailLogs];
    }
    if (snapshot.auditLogs !== undefined && snapshot.auditLogs.length > 0) {
      currentState.auditLogs = [...snapshot.auditLogs];
    }
    if (snapshot.highlights !== undefined) {
      currentState.highlights = [...snapshot.highlights];
    }
    if (snapshot.policies !== undefined) {
      currentState.policies = [...snapshot.policies];
    }
    if (snapshot.tripStatusHistory !== undefined) {
      currentState.tripStatusHistory = [...snapshot.tripStatusHistory];
    }

    this.notify();
  }

  // --- Audit Logger ---
  static writeAudit(
    actor: AdminActor,
    action: string,
    entityType: string,
    entityId?: string,
    before?: Record<string, unknown> | null,
    after?: Record<string, unknown> | null,
    reason?: string | null
  ): AuditLogEntry {
    const entry: AuditLogEntry = {
      id: "aud-" + Math.random().toString(36).substring(2, 9),
      actor_id: actor.id,
      actor_name: actor.full_name || actor.name || "Administrator",
      actor_role: actor.role,
      action,
      entity_type: entityType,
      entity_id: entityId,
      before: before ?? null,
      after: after ?? null,
      reason: reason ?? null,
      created_at: new Date().toISOString(),
    };
    currentState.auditLogs.unshift(entry);
    this.notify();
    return entry;
  }

  static getAuditLogs(): AuditLogEntry[] {
    return [...currentState.auditLogs];
  }

  // --- Settings ---
  static getSettings(): AppSettings {
    return { ...currentState.settings };
  }

  static updateSettings(
    actor: AdminActor,
    updates: Partial<AppSettings>
  ) {
    const before = { ...currentState.settings };
    currentState.settings = { ...currentState.settings, ...updates };
    this.writeAudit(
      actor,
      "update",
      "app_settings",
      "global",
      before as unknown as Record<string, unknown>,
      currentState.settings as unknown as Record<string, unknown>,
      "Operational app setting adjustment"
    );
    this.notify();
    return currentState.settings;
  }

  // --- Pricing & Refund Rules ---
  static getPricing(): PricingConfig {
    return { ...currentState.pricing };
  }

  static updatePricing(
    actor: AdminActor,
    updates: Partial<PricingConfig>,
    reason: string
  ) {
    const before = { ...currentState.pricing };
    currentState.pricing = { ...currentState.pricing, ...updates };
    this.writeAudit(
      actor,
      "update",
      "pricing_config",
      "1",
      before as unknown as Record<string, unknown>,
      currentState.pricing as unknown as Record<string, unknown>,
      reason
    );
    this.notify();

    try {
      void adminUpdatePricingConfigAction({
        serviceFee: Number(currentState.pricing.service_fee),
        gstRate: Number(currentState.pricing.gst_rate),
        demoCouponCode: currentState.pricing.demo_coupon_code,
        demoCouponDiscount: Number(currentState.pricing.demo_coupon_discount),
        merchantUpiVpa: currentState.pricing.merchant_upi_vpa || "tripmate@upi",
        merchantPayeeName: currentState.pricing.merchant_payee_name || "TripMate Travels",
        activePaymentGateway: currentState.pricing.active_payment_gateway || "auto",
        upiAutoConfirm: currentState.pricing.upi_auto_confirm ?? true,
        reason,
      });
    } catch {
      // Non-blocking sync
    }

    return currentState.pricing;
  }

  static verifyUpiPayment(
    actor: AdminActor,
    paymentId: string,
    status: "verified" | "rejected",
    notes?: string,
    reason?: string
  ) {
    const payment = currentState.payments.find((p) => p.id === paymentId);
    if (payment) {
      const before = { ...payment };
      payment.verification_status = status;
      // If rejected, mark booking cancelled; if verified, mark booking verified
      const tripId = payment.trip_id;
      if (tripId) {
        const booking = currentState.bookings.find((b) => b.id === tripId);
        if (booking) {
          if (status === "rejected") {
            booking.status = "cancelled";
            booking.verification_status = "rejected";
          } else {
            booking.verification_status = "verified";
          }
        }
      }
      this.writeAudit(
        actor,
        status === "verified" ? "verify_upi_utr" : "reject_upi_utr",
        "payments",
        paymentId,
        before as unknown as Record<string, unknown>,
        payment as unknown as Record<string, unknown>,
        reason || notes || `UTR marked ${status}`
      );
      this.notify();
    }
  }

  static getRefundRules(): RefundRule[] {
    return [...currentState.refundRules];
  }

  static updateRefundRule(
    actor: AdminActor,
    ruleId: string,
    updates: Partial<RefundRule>,
    reason: string
  ) {
    const idx = currentState.refundRules.findIndex((r) => r.id === ruleId);
    if (idx < 0) return null;
    const before = { ...currentState.refundRules[idx] };
    currentState.refundRules[idx] = { ...currentState.refundRules[idx], ...updates } as RefundRule;
    this.writeAudit(
      actor,
      "update",
      "refund_rule",
      ruleId,
      before as unknown as Record<string, unknown>,
      currentState.refundRules[idx] as unknown as Record<string, unknown>,
      reason
    );
    this.notify();
    return currentState.refundRules[idx];
  }

  static addRefundRule(
    actor: AdminActor,
    rule: Omit<RefundRule, "id">,
    reason: string
  ) {
    const newRule: RefundRule = {
      ...rule,
      id: "rf-" + Math.random().toString(36).substring(2, 7),
    };
    currentState.refundRules.unshift(newRule);
    this.writeAudit(
      actor,
      "create",
      "refund_rule",
      newRule.id,
      null,
      newRule as unknown as Record<string, unknown>,
      reason
    );
    this.notify();
    return newRule;
  }

  // --- Coupons ---
  static getCoupons(): Coupon[] {
    return [...currentState.coupons];
  }

  static getCouponRedemptions(): CouponRedemption[] {
    return [...currentState.redemptions];
  }

  static createCoupon(
    actor: AdminActor,
    couponData: Omit<Coupon, "id" | "usage_count" | "created_at">,
    reason: string
  ): { ok: boolean; coupon?: Coupon; error?: string } {
    const cleanCode = couponData.code.trim().toUpperCase();
    if (!cleanCode) return { ok: false, error: "Coupon code is required" };

    const exists = currentState.coupons.some(
      (c) => c.code.toUpperCase() === cleanCode
    );
    if (exists) {
      return { ok: false, error: `Coupon code '${cleanCode}' already exists.` };
    }

    // Check auto_apply constraint (only one auto_apply can be active)
    if (couponData.auto_apply && couponData.is_active) {
      for (const c of currentState.coupons) {
        if (c.auto_apply && c.is_active) {
          c.auto_apply = false; // toggle off prior auto_apply
        }
      }
    }

    const newCoupon: Coupon = {
      ...couponData,
      id: "cp-" + Math.random().toString(36).substring(2, 8),
      code: cleanCode,
      usage_count: 0,
      created_at: new Date().toISOString(),
    };

    currentState.coupons.unshift(newCoupon);
    this.writeAudit(
      actor,
      "create",
      "coupon",
      newCoupon.id,
      null,
      newCoupon as unknown as Record<string, unknown>,
      reason
    );
    this.notify();

    try {
      void adminUpsertCouponAction({
        code: cleanCode,
        description: newCoupon.description,
        discountType: newCoupon.discount_type,
        value: newCoupon.value,
        minSubtotal: newCoupon.min_subtotal,
        maxDiscount: newCoupon.max_discount,
        usageLimit: newCoupon.usage_limit_total,
        validUntil: newCoupon.valid_to,
        isActive: newCoupon.is_active,
        reason,
      });
    } catch {
      // Non-blocking sync
    }

    return { ok: true, coupon: newCoupon };
  }

  static updateCoupon(
    actor: AdminActor,
    couponId: string,
    updates: Partial<Coupon>,
    reason: string
  ) {
    const idx = currentState.coupons.findIndex((c) => c.id === couponId);
    if (idx < 0) return null;
    const before = { ...currentState.coupons[idx] };

    if (updates.auto_apply && updates.is_active) {
      for (const c of currentState.coupons) {
        if (c.id !== couponId && c.auto_apply && c.is_active) {
          c.auto_apply = false;
        }
      }
    }

    currentState.coupons[idx] = { ...currentState.coupons[idx], ...updates } as Coupon;
    this.writeAudit(
      actor,
      "update",
      "coupon",
      couponId,
      before as unknown as Record<string, unknown>,
      currentState.coupons[idx] as unknown as Record<string, unknown>,
      reason
    );
    this.notify();

    try {
      if (typeof updates.is_active === "boolean" && Object.keys(updates).length === 1) {
        void adminToggleCouponAction({
          id: couponId,
          isActive: updates.is_active,
          reason,
        });
      } else {
        const item = currentState.coupons[idx];
        void adminUpsertCouponAction({
          id: couponId,
          code: item.code,
          description: item.description,
          discountType: item.discount_type,
          value: item.value,
          minSubtotal: item.min_subtotal,
          maxDiscount: item.max_discount,
          usageLimit: item.usage_limit_total,
          validUntil: item.valid_to,
          isActive: item.is_active,
          reason,
        });
      }
    } catch {
      // Non-blocking sync
    }

    return currentState.coupons[idx];
  }

  static deleteCoupon(actor: AdminActor, couponId: string, reason: string) {
    const idx = currentState.coupons.findIndex((c) => c.id === couponId);
    if (idx < 0) return false;
    const removed = currentState.coupons.splice(idx, 1)[0];
    this.writeAudit(
      actor,
      "delete",
      "coupon",
      couponId,
      removed as unknown as Record<string, unknown>,
      null,
      reason
    );
    this.notify();
    return true;
  }

  // --- Destinations (W1 Publish Checklist) ---
  static getDestinations(): DestinationAdmin[] {
    return [...currentState.destinations];
  }

  static checkPublishReadiness(destinationId: string): {
    canPublish: boolean;
    missingItems: string[];
  } {
    const dest = currentState.destinations.find((d) => d.id === destinationId);
    if (!dest) return { canPublish: false, missingItems: ["Destination not found"] };

    const missingItems: string[] = [];
    if (!dest.starting_price || dest.starting_price <= 0) {
      missingItems.push("Starting price is not set or zero.");
    }
    if (!dest.hero_image_path || !dest.hero_image_path.trim()) {
      missingItems.push("Hero image is not uploaded.");
    }

    const activeHotels = currentState.hotels.filter(
      (h) => h.destination_id === destinationId && h.is_active
    );
    if (activeHotels.length === 0) {
      missingItems.push("No active hotels assigned to this destination (minimum 1 required).");
    }

    if (dest.vehicle_required) {
      const activeVehicles = currentState.vehicles.filter((v) => v.is_active);
      const hasCar = activeVehicles.some((v) => v.type === "car");
      const hasBike = activeVehicles.some((v) => v.type === "bike");

      if (dest.allow_car && !hasCar) {
        missingItems.push("Car transport allowed but no active car fleet available.");
      }
      if (dest.allow_bike && !hasBike) {
        missingItems.push("Bike transport allowed but no active bike fleet available.");
      }
      if (!dest.allow_car && !dest.allow_bike) {
        missingItems.push("Vehicle is required, but both allow_car and allow_bike are disabled.");
      }
    }

    if (dest.min_days > dest.max_days) {
      missingItems.push("Min days (" + dest.min_days + ") cannot exceed Max days (" + dest.max_days + ").");
    }

    return {
      canPublish: missingItems.length === 0,
      missingItems,
    };
  }

  static setDestinationBookable(
    actor: AdminActor,
    destinationId: string,
    isBookable: boolean,
    reason: string
  ): { ok: boolean; missing?: string[]; destination?: DestinationAdmin } {
    const dest = currentState.destinations.find((d) => d.id === destinationId);
    if (!dest) return { ok: false, missing: ["Destination not found"] };

    if (isBookable) {
      const check = this.checkPublishReadiness(destinationId);
      if (!check.canPublish) {
        return { ok: false, missing: check.missingItems };
      }
    }

    const before = { is_bookable: dest.is_bookable };
    dest.is_bookable = isBookable;
    this.writeAudit(
      actor,
      "set_bookable",
      "destination",
      destinationId,
      before,
      { is_bookable: isBookable },
      reason
    );
    this.notify();
    return { ok: true, destination: dest };
  }

  static updateDestination(
    actor: AdminActor,
    destinationId: string,
    updates: Partial<DestinationAdmin>,
    reason: string
  ) {
    const idx = currentState.destinations.findIndex((d) => d.id === destinationId);
    if (idx < 0) return null;
    const before = { ...currentState.destinations[idx] };
    currentState.destinations[idx] = {
      ...currentState.destinations[idx],
      ...updates,
    } as DestinationAdmin;
    this.writeAudit(
      actor,
      "update",
      "destination",
      destinationId,
      before as unknown as Record<string, unknown>,
      currentState.destinations[idx] as unknown as Record<string, unknown>,
      reason
    );
    this.notify();
    return currentState.destinations[idx];
  }

  static createDestination(
    actor: AdminActor,
    data: Omit<DestinationAdmin, "id">,
    reason: string
  ) {
    const newDest: DestinationAdmin = {
      ...data,
      id: "dest-" + data.slug.toLowerCase().replace(/[^a-z0-9]/g, "-"),
    };
    currentState.destinations.unshift(newDest);
    this.writeAudit(
      actor,
      "create",
      "destination",
      newDest.id,
      null,
      newDest as unknown as Record<string, unknown>,
      reason
    );
    this.notify();
    return newDest;
  }

  static deleteDestination(actor: AdminActor, destinationId: string, reason: string) {
    const idx = currentState.destinations.findIndex((d) => d.id === destinationId);
    if (idx < 0) return false;
    const removed = currentState.destinations.splice(idx, 1)[0];
    this.writeAudit(
      actor,
      "delete",
      "destination",
      destinationId,
      removed as unknown as Record<string, unknown>,
      null,
      reason
    );
    this.notify();
    return true;
  }

  // --- Destination Highlights ---
  static getHighlights(): DestinationHighlight[] {
    return [...currentState.highlights];
  }

  static getHighlightsForDestination(destinationId: string): DestinationHighlight[] {
    return currentState.highlights.filter((h) => h.destination_id === destinationId);
  }

  static upsertHighlight(actor: AdminActor, highlight: DestinationHighlight, reason?: string) {
    const idx = currentState.highlights.findIndex((h) => h.id === highlight.id);
    if (idx >= 0) {
      const before = { ...currentState.highlights[idx] };
      currentState.highlights[idx] = { ...currentState.highlights[idx], ...highlight };
      this.writeAudit(
        actor,
        "update",
        "destination_highlight",
        highlight.id,
        before as unknown as Record<string, unknown>,
        highlight as unknown as Record<string, unknown>,
        reason || "Updated destination highlight"
      );
    } else {
      currentState.highlights.push(highlight);
      this.writeAudit(
        actor,
        "create",
        "destination_highlight",
        highlight.id,
        null,
        highlight as unknown as Record<string, unknown>,
        reason || "Created destination highlight"
      );
    }
    const dest = currentState.destinations.find((d) => d.id === highlight.destination_id);
    if (dest) {
      dest.highlights = currentState.highlights.filter((h) => h.destination_id === dest.id);
    }
    this.notify();
    return highlight;
  }

  static deleteHighlight(actor: AdminActor, highlightId: string, reason?: string) {
    const idx = currentState.highlights.findIndex((h) => h.id === highlightId);
    const [removed] = currentState.highlights.splice(idx, 1);
    if (!removed) return false;
    const dest = currentState.destinations.find((d) => d.id === removed.destination_id);
    if (dest) {
      dest.highlights = currentState.highlights.filter((h) => h.destination_id === dest.id);
    }
    this.writeAudit(
      actor,
      "delete",
      "destination_highlight",
      highlightId,
      removed as unknown as Record<string, unknown>,
      null,
      reason || "Deleted destination highlight"
    );
    this.notify();
    return true;
  }

  // --- Corporate Policies ---
  static getPolicies(): CompanyPolicyAdmin[] {
    return [...currentState.policies];
  }

  static getPoliciesForCompany(companyId: string): CompanyPolicyAdmin[] {
    return currentState.policies.filter((p) => p.company_id === companyId);
  }

  static upsertPolicy(actor: AdminActor, policy: CompanyPolicyAdmin, reason?: string) {
    const idx = currentState.policies.findIndex((p) => p.id === policy.id);
    if (idx >= 0) {
      const before = { ...currentState.policies[idx] };
      currentState.policies[idx] = { ...currentState.policies[idx], ...policy };
      this.writeAudit(
        actor,
        "update",
        "company_policy",
        policy.id,
        before as unknown as Record<string, unknown>,
        policy as unknown as Record<string, unknown>,
        reason || "Updated company policy"
      );
    } else {
      currentState.policies.push(policy);
      this.writeAudit(
        actor,
        "create",
        "company_policy",
        policy.id,
        null,
        policy as unknown as Record<string, unknown>,
        reason || "Created company policy"
      );
    }
    this.notify();
    return policy;
  }

  // --- Trip Status History ---
  static getStatusHistory(tripId?: string): TripStatusHistoryItem[] {
    if (tripId) {
      return currentState.tripStatusHistory.filter((h) => h.trip_id === tripId);
    }
    return [...currentState.tripStatusHistory];
  }

  // --- Booking Overrides ---
  static overrideBookingItems(
    actor: AdminActor,
    tripId: string,
    updates: {
      hotel_id?: string | null;
      vehicle_id?: string | null;
      driver_id?: string | null;
      stop_ids?: string[] | null;
    },
    reason?: string
  ) {
    const booking = currentState.bookings.find((b) => b.id === tripId);
    if (!booking) return null;
    const before = { ...booking };
    if (updates.hotel_id !== undefined) {
      booking.hotel_id = updates.hotel_id;
      const hotel = currentState.hotels.find((h) => h.id === updates.hotel_id);
      booking.hotel_name = hotel ? hotel.name : undefined;
    }
    if (updates.vehicle_id !== undefined) {
      booking.vehicle_id = updates.vehicle_id;
      const v = currentState.vehicles.find((veh) => veh.id === updates.vehicle_id);
      booking.vehicle = v || null;
    }
    if (updates.driver_id !== undefined) {
      booking.driver_id = updates.driver_id;
      const d = currentState.drivers.find((drv) => drv.id === updates.driver_id);
      booking.driver = d || null;
    }
    if (updates.stop_ids !== undefined && updates.stop_ids !== null) {
      booking.stop_ids = updates.stop_ids;
      booking.stops = currentState.stops.filter((s) => updates.stop_ids!.includes(s.id));
    }
    this.writeAudit(
      actor,
      "override_booking",
      "trip",
      tripId,
      before as unknown as Record<string, unknown>,
      booking as unknown as Record<string, unknown>,
      reason || "Operational booking items override"
    );
    this.notify();
    return booking;
  }

  // --- Trips / Circuits ---
  static getCircuits(): CircuitAdmin[] {
    return [...currentState.circuits];
  }

  static updateCircuit(
    actor: AdminActor,
    circuitId: string,
    updates: Partial<CircuitAdmin>,
    reason: string
  ) {
    const idx = currentState.circuits.findIndex((c) => c.id === circuitId);
    if (idx < 0) return null;
    const before = { ...currentState.circuits[idx] };

    // sync nights = days - 1
    if (updates.days && !updates.nights) {
      updates.nights = Math.max(1, updates.days - 1);
    }

    currentState.circuits[idx] = {
      ...currentState.circuits[idx],
      ...updates,
    } as CircuitAdmin;
    this.writeAudit(
      actor,
      "update",
      "circuit",
      circuitId,
      before as unknown as Record<string, unknown>,
      currentState.circuits[idx] as unknown as Record<string, unknown>,
      reason
    );
    this.notify();
    return currentState.circuits[idx];
  }

  static createCircuit(
    actor: AdminActor,
    data: Omit<CircuitAdmin, "id">,
    reason: string
  ) {
    const newCirc: CircuitAdmin = {
      ...data,
      id: "circ-" + Math.random().toString(36).substring(2, 7),
      nights: Math.max(1, data.days - 1),
    };
    currentState.circuits.unshift(newCirc);
    this.writeAudit(
      actor,
      "create",
      "circuit",
      newCirc.id,
      null,
      newCirc as unknown as Record<string, unknown>,
      reason
    );
    this.notify();
    return newCirc;
  }

  static deleteCircuit(actor: AdminActor, circuitId: string, reason: string) {
    const idx = currentState.circuits.findIndex((c) => c.id === circuitId);
    if (idx < 0) return false;
    const removed = currentState.circuits.splice(idx, 1)[0];
    this.writeAudit(
      actor,
      "delete",
      "circuit",
      circuitId,
      removed as unknown as Record<string, unknown>,
      null,
      reason
    );
    this.notify();
    return true;
  }

  // --- Hotels ---
  static getHotels(): HotelAdmin[] {
    return [...currentState.hotels];
  }

  static updateHotel(
    actor: AdminActor,
    hotelId: string,
    updates: Partial<HotelAdmin>,
    reason: string
  ) {
    const idx = currentState.hotels.findIndex((h) => h.id === hotelId);
    if (idx < 0) return null;
    const before = { ...currentState.hotels[idx] };
    currentState.hotels[idx] = { ...currentState.hotels[idx], ...updates } as HotelAdmin;
    this.writeAudit(
      actor,
      "update",
      "hotel",
      hotelId,
      before as unknown as Record<string, unknown>,
      currentState.hotels[idx] as unknown as Record<string, unknown>,
      reason
    );
    this.notify();
    return currentState.hotels[idx];
  }

  static createHotel(
    actor: AdminActor,
    data: Omit<HotelAdmin, "id">,
    reason: string
  ) {
    const newHotel: HotelAdmin = {
      ...data,
      id: "hotel-" + Math.random().toString(36).substring(2, 7),
    };
    currentState.hotels.unshift(newHotel);
    this.writeAudit(
      actor,
      "create",
      "hotel",
      newHotel.id,
      null,
      newHotel as unknown as Record<string, unknown>,
      reason
    );
    this.notify();
    return newHotel;
  }

  static deleteHotel(actor: AdminActor, hotelId: string, reason: string) {
    const idx = currentState.hotels.findIndex((h) => h.id === hotelId);
    if (idx < 0) return false;
    const removed = currentState.hotels.splice(idx, 1)[0];
    this.writeAudit(
      actor,
      "delete",
      "hotel",
      hotelId,
      removed as unknown as Record<string, unknown>,
      null,
      reason
    );
    this.notify();
    return true;
  }

  // --- Vehicles ---
  static getVehicles(): VehicleAdmin[] {
    return [...currentState.vehicles];
  }

  static updateVehicle(
    actor: AdminActor,
    vehicleId: string,
    updates: Partial<VehicleAdmin>,
    reason: string
  ) {
    const idx = currentState.vehicles.findIndex((v) => v.id === vehicleId);
    if (idx < 0) return null;
    const before = { ...currentState.vehicles[idx] };
    currentState.vehicles[idx] = { ...currentState.vehicles[idx], ...updates } as VehicleAdmin;
    this.writeAudit(
      actor,
      "update",
      "vehicle",
      vehicleId,
      before as unknown as Record<string, unknown>,
      currentState.vehicles[idx] as unknown as Record<string, unknown>,
      reason
    );
    this.notify();
    return currentState.vehicles[idx];
  }

  static createVehicle(
    actor: AdminActor,
    data: Omit<VehicleAdmin, "id">,
    reason: string
  ) {
    const newVehicle: VehicleAdmin = {
      ...data,
      id: "veh-" + Math.random().toString(36).substring(2, 7),
    };
    currentState.vehicles.unshift(newVehicle);
    this.writeAudit(
      actor,
      "create",
      "vehicle",
      newVehicle.id,
      null,
      newVehicle as unknown as Record<string, unknown>,
      reason
    );
    this.notify();
    return newVehicle;
  }

  static deleteVehicle(actor: AdminActor, vehicleId: string, reason: string) {
    const idx = currentState.vehicles.findIndex((v) => v.id === vehicleId);
    if (idx < 0) return false;
    const removed = currentState.vehicles.splice(idx, 1)[0];
    this.writeAudit(
      actor,
      "delete",
      "vehicle",
      vehicleId,
      removed as unknown as Record<string, unknown>,
      null,
      reason
    );
    this.notify();
    return true;
  }

  // --- Drivers ---
  static getDrivers(): DriverAdmin[] {
    return [...currentState.drivers];
  }

  static updateDriver(
    actor: AdminActor,
    driverId: string,
    updates: Partial<DriverAdmin>,
    reason: string
  ) {
    const idx = currentState.drivers.findIndex((d) => d.id === driverId);
    if (idx < 0) return null;
    const before = { ...currentState.drivers[idx] };
    currentState.drivers[idx] = { ...currentState.drivers[idx], ...updates } as DriverAdmin;
    this.writeAudit(
      actor,
      "update",
      "driver",
      driverId,
      before as unknown as Record<string, unknown>,
      currentState.drivers[idx] as unknown as Record<string, unknown>,
      reason
    );
    this.notify();
    return currentState.drivers[idx];
  }

  static createDriver(
    actor: AdminActor,
    data: Omit<DriverAdmin, "id">,
    reason: string
  ) {
    const newDriver: DriverAdmin = {
      ...data,
      id: "drv-" + Math.random().toString(36).substring(2, 7),
    };
    currentState.drivers.unshift(newDriver);
    this.writeAudit(
      actor,
      "create",
      "driver",
      newDriver.id,
      null,
      newDriver as unknown as Record<string, unknown>,
      reason
    );
    this.notify();
    return newDriver;
  }

  static deleteDriver(actor: AdminActor, driverId: string, reason: string) {
    const idx = currentState.drivers.findIndex((d) => d.id === driverId);
    if (idx < 0) return false;
    const removed = currentState.drivers.splice(idx, 1)[0];
    this.writeAudit(
      actor,
      "delete",
      "driver",
      driverId,
      removed as unknown as Record<string, unknown>,
      null,
      reason
    );
    this.notify();
    return true;
  }

  // --- Stops ---
  static getStops(): StopAdmin[] {
    return [...currentState.stops];
  }

  static updateStop(
    actor: AdminActor,
    stopId: string,
    updates: Partial<StopAdmin>,
    reason: string
  ) {
    const idx = currentState.stops.findIndex((s) => s.id === stopId);
    if (idx < 0) return null;
    const before = { ...currentState.stops[idx] };
    currentState.stops[idx] = { ...currentState.stops[idx], ...updates } as StopAdmin;
    this.writeAudit(
      actor,
      "update",
      "stop",
      stopId,
      before as unknown as Record<string, unknown>,
      currentState.stops[idx] as unknown as Record<string, unknown>,
      reason
    );
    this.notify();
    return currentState.stops[idx];
  }

  static createStop(
    actor: AdminActor,
    data: Omit<StopAdmin, "id">,
    reason: string
  ) {
    const newStop: StopAdmin = {
      ...data,
      id: "stop-" + Math.random().toString(36).substring(2, 7),
    };
    currentState.stops.unshift(newStop);
    this.writeAudit(
      actor,
      "create",
      "stop",
      newStop.id,
      null,
      newStop as unknown as Record<string, unknown>,
      reason
    );
    this.notify();
    return newStop;
  }

  static deleteStop(actor: AdminActor, stopId: string, reason: string) {
    const idx = currentState.stops.findIndex((s) => s.id === stopId);
    if (idx < 0) return false;
    const removed = currentState.stops.splice(idx, 1)[0];
    this.writeAudit(
      actor,
      "delete",
      "stop",
      stopId,
      removed as unknown as Record<string, unknown>,
      null,
      reason
    );
    this.notify();
    return true;
  }

  // --- Bookings & Ops ---
  static getBookings(): BookingAdmin[] {
    return [...currentState.bookings];
  }

  static assignDriver(
    actor: AdminActor,
    tripId: string,
    driverId: string,
    reason: string
  ) {
    const booking = currentState.bookings.find((b) => b.id === tripId);
    if (!booking) return { ok: false, error: "Booking not found" };

    if (!driverId || driverId === "none") {
      const before = { driver_id: booking.driver_id };
      booking.driver_id = null;
      booking.driver = undefined;
      this.writeAudit(
        actor,
        "unassign_driver",
        "booking",
        tripId,
        before,
        { driver_id: null },
        reason
      );
      this.notify();
      return { ok: true, booking };
    }

    const driver = currentState.drivers.find((d) => d.id === driverId);
    if (!driver || !driver.is_active) {
      return { ok: false, error: "Selected driver is inactive or not found" };
    }

    const before = { driver_id: booking.driver_id };
    booking.driver_id = driver.id;
    booking.driver = driver;

    this.writeAudit(
      actor,
      "assign_driver",
      "booking",
      tripId,
      before,
      { driver_id: driver.id, driver_name: driver.name },
      reason
    );

    // Queue customer notification email
    this.sendEmail(
      actor,
      booking.customer_email,
      "booking_updated",
      `Driver Assigned for Trip ${booking.booking_ref}`,
      `Driver ${driver.name} (${driver.phone}, ${driver.license_plate}) has been assigned to your booking.`,
      booking.booking_ref,
      booking.id
    );

    this.notify();
    return { ok: true, booking };
  }

  static addBookingNote(
    actor: AdminActor,
    tripId: string,
    noteText: string
  ) {
    const booking = currentState.bookings.find((b) => b.id === tripId);
    if (!booking) return null;

    const note = {
      id: "nt-" + Math.random().toString(36).substring(2, 7),
      trip_id: tripId,
      author_id: actor.id,
      author_name: actor.full_name || actor.name || "Operator",
      note: noteText.trim(),
      created_at: new Date().toISOString(),
    };

    booking.notes.unshift(note);
    this.writeAudit(
      actor,
      "add_note",
      "booking",
      tripId,
      null,
      { note: noteText },
      "Internal operator note added"
    );
    this.notify();
    return note;
  }

  static updateBookingStatus(
    actor: AdminActor,
    tripId: string,
    newStatus: BookingAdmin["status"],
    reason: string
  ): { ok: boolean; error?: string } {
    const booking = currentState.bookings.find((b) => b.id === tripId);
    if (!booking) return { ok: false, error: "Booking not found" };
    const before = { status: booking.status };
    booking.status = newStatus;
    this.writeAudit(
      actor,
      "update_status",
      "booking",
      tripId,
      before,
      { status: newStatus },
      reason
    );
    this.notify();
    return { ok: true };
  }

  static cancelBooking(
    actor: AdminActor,
    tripId: string,
    refundMode: "policy" | "full" | "none" | "custom",
    customAmount: number | null,
    reason: string
  ): { ok: boolean; refundAmount?: number; error?: string } {
    if (!reason || !reason.trim()) {
      return { ok: false, error: "Cancellation reason is strictly mandatory." };
    }

    const booking = currentState.bookings.find((b) => b.id === tripId);
    if (!booking) return { ok: false, error: "Booking not found" };

    if (booking.status === "cancelled") {
      return { ok: false, error: "Booking is already cancelled." };
    }

    let refundAmount = 0;
    const paidAmount = booking.total_amount;

    if (refundMode === "full") {
      refundAmount = paidAmount;
    } else if (refundMode === "none") {
      refundAmount = 0;
    } else if (refundMode === "custom") {
      if (customAmount === null || customAmount < 0) {
        return { ok: false, error: "Valid custom refund amount is required." };
      }
      if (customAmount > paidAmount) {
        return {
          ok: false,
          error: `Refund amount (₹${customAmount}) cannot exceed total amount paid (₹${paidAmount}).`,
        };
      }
      refundAmount = customAmount;
    } else {
      // "policy" mode calculation
      const startDate = new Date(booking.start_date + "T00:00:00+05:30").getTime();
      const now = Date.now();
      const hoursBefore = Math.max(0, (startDate - now) / (1000 * 60 * 60));

      // Find applicable refund rule
      const activeRules = currentState.refundRules
        .filter((r) => r.is_active)
        .sort((a, b) => b.hours_before_min - a.hours_before_min);

      const matchedRule = activeRules.find((r) => hoursBefore >= r.hours_before_min);
      const refundPercent = matchedRule ? matchedRule.refund_percent : 0;
      refundAmount = Math.round((paidAmount * refundPercent) / 100);
    }

    const before = { status: booking.status, refund_amount: booking.refund_amount };
    booking.status = "cancelled";
    booking.refund_amount = refundAmount;

    // Record refunded payment entry
    if (refundAmount > 0) {
      currentState.payments.unshift({
        id: "pay-" + Math.random().toString(36).substring(2, 7),
        trip_id: booking.id,
        booking_ref: booking.booking_ref,
        customer_name: booking.customer_name,
        invoice_number: "CN-REF-" + Math.floor(100000 + Math.random() * 900000),
        amount: refundAmount,
        gst_amount: Math.round(refundAmount * 0.18),
        method: "demo_pay",
        status: "refunded",
        itc_qualified: false,
        created_at: new Date().toISOString(),
      });
    }

    this.writeAudit(
      actor,
      "cancel",
      "booking",
      tripId,
      before,
      { status: "cancelled", refund_amount: refundAmount, refund_mode: refundMode },
      reason
    );

    // Send customer cancellation email
    this.sendEmail(
      actor,
      booking.customer_email,
      "booking_cancelled_by_admin",
      `Booking Cancelled: ${booking.booking_ref}`,
      `Your booking ${booking.booking_ref} has been cancelled by our operations team. Reason: ${reason}. Refund amount: ₹${refundAmount.toLocaleString("en-IN")}.`,
      booking.booking_ref,
      booking.id
    );

    this.notify();
    return { ok: true, refundAmount };
  }

  static revokeTicket(
    actor: AdminActor,
    passengerId: string,
    reason: string
  ) {
    for (const b of currentState.bookings) {
      const pax = b.travellers.find((p) => p.id === passengerId);
      if (pax) {
        pax.ticket_revoked = true;
        this.writeAudit(
          actor,
          "revoke_ticket",
          "trip_passenger",
          passengerId,
          { ticket_revoked: false },
          { ticket_revoked: true },
          reason
        );
        this.notify();
        return { ok: true, passenger: pax };
      }
    }
    return { ok: false, error: "Passenger not found" };
  }

  static regenerateTicket(
    actor: AdminActor,
    passengerId: string
  ) {
    for (const b of currentState.bookings) {
      const pax = b.travellers.find((p) => p.id === passengerId);
      if (pax) {
        const oldCode = pax.ticket_code;
        const newCode = "TKT-" + Math.random().toString(36).substring(2, 10).toUpperCase();
        pax.ticket_code = newCode;
        pax.ticket_revoked = false;
        this.writeAudit(
          actor,
          "regenerate_ticket",
          "trip_passenger",
          passengerId,
          { ticket_code: oldCode },
          { ticket_code: newCode },
          "Regenerated lost or compromised boarding ticket"
        );
        this.notify();
        return { ok: true, newCode };
      }
    }
    return { ok: false, error: "Passenger not found" };
  }

  // --- Commercial Approvals ---
  static getCommercialApprovals(): CommercialApprovalItem[] {
    const list: CommercialApprovalItem[] = [];
    for (const b of currentState.bookings) {
      if (b.kind === "commercial" && b.status === "pending_approval") {
        list.push({
          id: "appr-" + b.id,
          trip_id: b.id,
          company_id: "comp-1",
          company_name: b.company_name || "Acme Tech Pvt Ltd",
          gst_number: "07AAAAA0000A1Z5",
          booker_name: b.customer_name,
          booker_email: b.customer_email,
          destination_name: b.destination_name,
          dates: `${b.start_date} to ${b.end_date}`,
          passenger_count: b.traveler_count,
          vehicle_name: "Volvo 9600 Luxury Coach",
          total_amount: b.total_amount,
          approval_limit: 150000,
          status: "pending_approval",
          requested_at: b.created_at,
        });
      }
    }
    return list;
  }

  static decideCommercialApproval(
    actor: AdminActor,
    tripId: string,
    decision: "approved" | "rejected",
    note: string
  ) {
    if (!note || !note.trim()) {
      return { ok: false, error: "A decision note is required." };
    }

    const booking = currentState.bookings.find((b) => b.id === tripId);
    if (!booking) return { ok: false, error: "Booking not found" };

    const before = { status: booking.status };
    booking.status = decision === "approved" ? "confirmed" : "cancelled";

    this.writeAudit(
      actor,
      "commercial_override",
      "booking",
      tripId,
      before,
      { status: booking.status, decision },
      note
    );

    this.sendEmail(
      actor,
      booking.customer_email,
      "approval_decision",
      `Commercial Booking ${decision.toUpperCase()}: ${booking.booking_ref}`,
      `Your commercial fleet reservation for ${booking.company_name || "Corporate"} has been ${decision}. Decision note: ${note}`,
      booking.booking_ref,
      booking.id
    );

    this.notify();
    return { ok: true, booking };
  }

  // --- ID Reviews & Verification Queue ---
  static getIdReviews(): IdReviewItem[] {
    return [...currentState.idReviews];
  }

  static reviewIdDocument(
    actor: AdminActor,
    reviewId: string,
    decision: "approved" | "rejected",
    reasonCode?: "blurry" | "name_mismatch" | "expired" | "wrong_document_type" | "incomplete" | "other",
    note?: string
  ): { ok: boolean; error?: string } {
    const item = currentState.idReviews.find((r) => r.id === reviewId);
    if (!item) return { ok: false, error: "Review item not found" };

    if (decision === "rejected" && (!reasonCode || !note?.trim())) {
      return { ok: false, error: "Rejection requires a specific reason code and note." };
    }

    item.status = decision;
    item.reviewed_by = actor.name;
    item.reviewed_at = new Date().toISOString();
    item.reject_reason = decision === "rejected" ? `${reasonCode}: ${note}` : undefined;

    // Update matching booking traveller
    for (const b of currentState.bookings) {
      if (b.id === item.trip_id) {
        const pax = b.travellers.find((p) => p.id === item.passenger_id);
        if (pax) {
          pax.id_doc_status = decision;
          pax.id_doc_reviewed_by = actor.name;
          pax.id_doc_reviewed_at = item.reviewed_at;
          pax.id_doc_reject_reason = item.reject_reason;
        }
      }
    }

    if (decision === "rejected" && reasonCode && note) {
      // Record correction request
      currentState.correctionRequests.unshift({
        id: "cr-" + Math.random().toString(36).substring(2, 7),
        trip_id: item.trip_id,
        passenger_id: item.passenger_id,
        passenger_name: item.passenger_name,
        requested_by: actor.full_name || actor.name || "Operator",
        reason_code: reasonCode,
        note,
        status: "open",
        created_at: new Date().toISOString(),
      });

      // Send rejection & re-upload email (without leaking ID document)
      this.sendEmail(
        actor,
        item.customer_email,
        "id_correction_request",
        `ID Verification Required for Traveller ${item.passenger_name} (${item.booking_ref})`,
        `The ID document uploaded for ${item.passenger_name} could not be verified. Reason: ${reasonCode.replace(/_/g, " ")}. Operator Note: ${note}. Please visit your trip page to upload a clear replacement: /trips/${item.trip_id}/documents`,
        item.booking_ref,
        item.trip_id
      );
    }

    this.writeAudit(
      actor,
      decision === "approved" ? "approve_id" : "reject_id",
      "trip_passenger",
      item.passenger_id,
      { status: "pending" },
      { status: decision, reasonCode, note },
      note || "Identity document verification"
    );

    this.notify();
    return { ok: true };
  }

  // --- Users & Suspension ---
  static getUsers(): UserAdmin[] {
    return [...currentState.users];
  }

  static setUserSuspended(
    actor: AdminActor,
    userId: string,
    isSuspended: boolean,
    reason: string
  ): { ok: boolean; error?: string } {
    if (!reason || !reason.trim()) {
      return { ok: false, error: "A suspension rationale is mandatory." };
    }

    const user = currentState.users.find((u) => u.id === userId);
    if (!user) return { ok: false, error: "User not found" };

    const isAdmin = currentState.admins.some((a) => a.email === user.email);
    if (isAdmin && isSuspended) {
      return { ok: false, error: "Security Exception: Cannot suspend an active administrator account." };
    }

    const before = { is_suspended: user.is_suspended };
    user.is_suspended = isSuspended;
    user.suspended_reason = isSuspended ? reason : null;
    user.suspended_at = isSuspended ? new Date().toISOString() : null;

    this.writeAudit(
      actor,
      isSuspended ? "suspend_user" : "unsuspend_user",
      "user",
      userId,
      before,
      { is_suspended: isSuspended, reason },
      reason
    );

    this.notify();
    return { ok: true };
  }

  // --- Companies ---
  static getCompanies(): CompanyAdmin[] {
    return [...currentState.companies];
  }

  static createCompany(
    actor: AdminActor,
    name: string,
    gstNumber: string | null,
    approvalLimit: number | null
  ) {
    const newComp: CompanyAdmin = {
      id: "comp-" + Math.random().toString(36).substring(2, 7),
      name: name.trim(),
      gst_number: gstNumber?.trim() || null,
      is_active: true,
      approval_limit: approvalLimit,
      member_count: 0,
      members: [],
      created_at: new Date().toISOString(),
    };
    currentState.companies.unshift(newComp);
    this.writeAudit(
      actor,
      "create",
      "company",
      newComp.id,
      null,
      newComp as unknown as Record<string, unknown>,
      "Registered new corporate partner"
    );
    this.notify();
    return newComp;
  }

  static updateCompany(
    actor: AdminActor,
    companyId: string,
    updates: Partial<CompanyAdmin>,
    reason: string
  ) {
    const comp = currentState.companies.find((c) => c.id === companyId);
    if (!comp) return null;
    const before = { ...comp };
    Object.assign(comp, updates);
    this.writeAudit(
      actor,
      "update",
      "company",
      companyId,
      before as unknown as Record<string, unknown>,
      comp as unknown as Record<string, unknown>,
      reason
    );
    this.notify();
    return comp;
  }

  static addCompanyMember(
    actor: AdminActor,
    companyId: string,
    email: string,
    fullName: string,
    role: "admin" | "member"
  ): { ok: boolean; error?: string } {
    const comp = currentState.companies.find((c) => c.id === companyId);
    if (!comp) return { ok: false, error: "Company not found" };

    if (!comp.members) comp.members = [];
    const exists = comp.members.some((m) => m.email.toLowerCase() === email.toLowerCase());
    if (exists) return { ok: false, error: "User is already a member of this company." };

    const newMem = {
      id: "mem-" + Math.random().toString(36).substring(2, 7),
      company_id: companyId,
      profile_id: "usr-" + Math.random().toString(36).substring(2, 7),
      full_name: fullName,
      email: email.trim(),
      role,
    };

    comp.members.push(newMem);
    comp.member_count = comp.members.length;

    this.writeAudit(
      actor,
      "add_member",
      "company",
      companyId,
      null,
      { member: newMem },
      `Added ${email} as company ${role}`
    );

    this.notify();
    return { ok: true };
  }

  static removeCompanyMember(
    actor: AdminActor,
    companyId: string,
    memberId: string
  ): { ok: boolean; error?: string } {
    const comp = currentState.companies.find((c) => c.id === companyId);
    if (!comp || !comp.members) return { ok: false, error: "Company or members not found" };

    const member = comp.members.find((m) => m.id === memberId);
    if (!member) return { ok: false, error: "Member not found" };

    comp.members = comp.members.filter((m) => m.id !== memberId);
    comp.member_count = comp.members.length;

    this.writeAudit(
      actor,
      "remove_member",
      "company",
      companyId,
      { member },
      null,
      `Removed member ${member.email}`
    );

    this.notify();
    return { ok: true };
  }

  // --- Emails ---
  static getEmailLogs(): EmailLogEntry[] {
    return [...currentState.emails];
  }

  static sendEmail(
    actor: AdminActor,
    toEmail: string,
    template: EmailLogEntry["template"],
    subject: string,
    content: string,
    relatedBookingRef?: string,
    relatedTripId?: string
  ): EmailLogEntry {
    // Sanitize / escape text
    const sanitizedSubject = subject.replace(/<[^>]*>/g, "");
    const sanitizedContent = content.replace(/<[^>]*>/g, "");

    const entry: EmailLogEntry = {
      id: "em-" + Math.random().toString(36).substring(2, 8),
      to_email: toEmail,
      template,
      subject: sanitizedSubject,
      content: sanitizedContent,
      related_booking_ref: relatedBookingRef,
      related_trip_id: relatedTripId,
      sent_by: actor.full_name || actor.name || "Operator",
      status: "sent",
      provider_message_id: "prov_" + Math.random().toString(36).substring(2, 10),
      created_at: new Date().toISOString(),
    };

    currentState.emails.unshift(entry);
    this.writeAudit(
      actor,
      "send_email",
      "email_log",
      entry.id,
      null,
      { to: toEmail, template, subject: sanitizedSubject },
      "Direct transactional communication dispatch"
    );
    this.notify();
    return entry;
  }

  // --- Payments & Invoices ---
  static getPayments(): PaymentInvoiceRecord[] {
    return [...currentState.payments];
  }

  // --- Admin Accounts ---
  static getAdmins(): AdminUser[] {
    return [...currentState.admins];
  }

  static grantAdminRole(
    actor: AdminActor,
    email: string,
    fullName: string,
    role: AdminRole
  ): { ok: boolean; error?: string } {
    if (actor.role !== "super_admin") {
      return { ok: false, error: "Only Super Admin can grant or manage admin accounts." };
    }

    const cleanEmail = email.trim().toLowerCase();
    const existing = currentState.admins.find((a) => a.email.toLowerCase() === cleanEmail);

    if (existing) {
      const beforeRole = existing.role;
      existing.role = role;
      existing.is_active = true;
      this.writeAudit(
        actor,
        "update_role",
        "admin_user",
        existing.id,
        { role: beforeRole },
        { role },
        `Updated role to ${role}`
      );
      this.notify();
      return { ok: true };
    }

    const newAdmin: AdminUser = {
      id: "admin-" + Math.random().toString(36).substring(2, 7),
      email: cleanEmail,
      full_name: fullName.trim(),
      role,
      is_active: true,
      mfa_enabled: true,
      created_at: new Date().toISOString(),
    };

    currentState.admins.push(newAdmin);
    this.writeAudit(
      actor,
      "grant_role",
      "admin_user",
      newAdmin.id,
      null,
      { email: cleanEmail, role },
      `Granted ${role} privileges`
    );
    this.notify();
    return { ok: true };
  }

  static deactivateAdmin(
    actor: AdminActor,
    adminId: string,
    reason: string
  ): { ok: boolean; error?: string } {
    if (actor.role !== "super_admin") {
      return { ok: false, error: "Only Super Admin can deactivate administrators." };
    }

    const target = currentState.admins.find((a) => a.id === adminId);
    if (!target) return { ok: false, error: "Admin not found" };

    if (target.id === actor.id) {
      return { ok: false, error: "Self-deactivation is prohibited by safety policy." };
    }

    const activeSuperAdmins = currentState.admins.filter(
      (a) => a.role === "super_admin" && a.is_active && a.id !== adminId
    );
    if (target.role === "super_admin" && activeSuperAdmins.length === 0) {
      return { ok: false, error: "Cannot deactivate the last remaining active Super Admin." };
    }

    target.is_active = false;
    this.writeAudit(
      actor,
      "deactivate",
      "admin_user",
      adminId,
      { is_active: true },
      { is_active: false },
      reason
    );
    this.notify();
    return { ok: true };
  }
}
