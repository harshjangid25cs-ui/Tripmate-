import { z } from "zod";

/**
 * Zod validation schemas for all Server Action payloads across TripMate.
 */

// ---------------------------------------------------------------------------
// Normal Trip Draft & Booking Actions (src/lib/actions/trips.ts)
// ---------------------------------------------------------------------------

export const createNormalTripDraftSchema = z.object({
  destinationId: z.string().min(1, "Destination ID is required."),
  circuitId: z.string().min(1).nullable().optional(),
  groupType: z.enum(["solo", "family", "other"]).optional(),
});

export const updateTripDurationSchema = z.object({
  tripId: z.string().min(1, "Trip ID is required."),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Start date must be in YYYY-MM-DD format."),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "End date must be in YYYY-MM-DD format."),
  travelerCount: z
    .number()
    .int()
    .min(1, "Traveler count must be at least 1.")
    .max(20, "Traveler count cannot exceed 20."),
});

export const selectTripHotelSchema = z.object({
  tripId: z.string().min(1, "Trip ID is required."),
  hotelId: z.string().min(1, "Hotel ID is required."),
  roomCount: z.number().int().min(1).optional(),
});

export const selectTripVehicleSchema = z.object({
  tripId: z.string().min(1, "Trip ID is required."),
  vehicleId: z.string().min(1, "Vehicle ID is required."),
});

export const toggleTripStopSchema = z.object({
  tripId: z.string().min(1, "Trip ID is required."),
  stopId: z.string().min(1, "Stop ID is required."),
  dayNumber: z.number().int().min(1, "Day number must be at least 1.").optional().default(1),
  sortOrder: z.number().int().min(0, "Sort order must be at least 0.").optional().default(0),
});

export const passengerPayloadSchema = z.object({
  isLead: z.boolean(),
  fullName: z.string().trim().min(3, "Full legal name must be at least 3 characters."),
  phone: z.string().nullable().optional(),
  idDocType: z
    .enum(["aadhaar", "passport", "driving_licence", "voter_id"])
    .nullable()
    .optional(),
  idDocPath: z.string().nullable().optional(),
});

export const saveTripPassengersSchema = z.object({
  tripId: z.string().min(1, "Trip ID is required."),
  passengers: z
    .array(passengerPayloadSchema)
    .min(1, "Please provide details for travellers."),
});

export const processTripPaymentSchema = z.object({
  tripId: z.string().min(1, "Trip ID is required."),
  paymentMethod: z.enum(["upi", "card", "netbanking", "emi"]).optional(),
  simulateFailure: z.boolean().optional(),
});

export const cancelTripBookingSchema = z.object({
  tripId: z.string().min(1, "Trip ID is required."),
  reason: z.string().trim().min(1, "Cancellation reason is required.").optional(),
});

// ---------------------------------------------------------------------------
// Commercial & Corporate Charter Actions (src/lib/actions/commercial.ts)
// ---------------------------------------------------------------------------

export const createCommercialDraftSchema = z.object({
  companyId: z.string().min(1).optional(),
});

export const saveCommercialSetupSchema = z.object({
  tripId: z.string().min(1, "Trip ID is required."),
  travelerCount: z
    .number()
    .int()
    .min(1, "Passenger headcount must be between 1 and 120.")
    .max(120, "Passenger headcount must be between 1 and 120."),
  startDate: z.string().min(1, "Start and end dates are required."),
  endDate: z.string().min(1, "Start and end dates are required."),
  bookingTime: z.string().min(1, "Booking time is required."),
  fromLocation: z
    .string()
    .trim()
    .min(1, "Origin (From) and Destination (To) locations are required (DECISIONS D4)."),
  toLocation: z
    .string()
    .trim()
    .min(1, "Origin (From) and Destination (To) locations are required (DECISIONS D4)."),
  tripPurpose: z.string().optional(),
});

export const commercialPassengerSchema = z.object({
  fullName: z.string().trim().min(1, "Passenger name is required."),
  phone: z.string().trim().min(1, "Phone number is required."),
  designation: z.string().optional(),
  employeeRef: z.string().optional(),
  seatLabel: z.string().trim().min(1, "Seat label is required."),
  isLead: z.boolean().optional(),
});

export const saveCommercialBusAndRosterSchema = z.object({
  tripId: z.string().min(1, "Trip ID is required."),
  vehicleId: z.string().min(1, "Please select a fleet bus for the commercial charter."),
  passengers: z
    .array(commercialPassengerSchema)
    .min(1, "Please assign at least 1 passenger to a seat (partial roster allowed)."),
});

// ---------------------------------------------------------------------------
// Profile & Notification Actions (src/lib/actions/profile.ts)
// ---------------------------------------------------------------------------

export const updateUserProfileSchema = z.object({
  fullName: z.string().trim().min(1, "Full name is required."),
  phone: z
    .string()
    .trim()
    .refine((val) => {
      if (!val) return true;
      const digits = val.replace(/\D/g, "");
      const tenDigits = digits.length === 12 && digits.startsWith("91") ? digits.slice(2) : digits;
      return /^[6-9]\d{9}$/.test(tenDigits);
    }, "Please enter a valid 10-digit Indian mobile number (e.g. 9810123456 or +91 98101 23456).")
    .optional()
    .or(z.literal("")),
  avatarUrl: z.string().optional().nullable(),
});

export const markNotificationReadSchema = z.object({
  notificationId: z.string().min(1, "Notification ID is required."),
});

// ---------------------------------------------------------------------------
// Admin Operations & Dispatch Actions (src/lib/actions/admin-ops.ts)
// ---------------------------------------------------------------------------

export const adminUpdateBookingStatusSchema = z.object({
  tripId: z.string().uuid("Invalid trip UUID."),
  newStatus: z.enum(["draft", "pending_approval", "confirmed", "cancelled", "completed"], {
    errorMap: () => ({ message: "Invalid trip status." }),
  }),
  reason: z.string().trim().min(1, "Reason must not be empty.").optional(),
  refundMode: z.enum(["policy", "full", "none", "custom"]).optional(),
  customRefundAmount: z.number().min(0, "Refund amount cannot be negative.").optional(),
});

export const adminAssignDriverSchema = z.object({
  tripId: z.string().uuid("Invalid trip UUID."),
  driverId: z.string().uuid("Invalid driver UUID."),
  vehicleId: z.string().uuid("Invalid vehicle UUID.").optional(),
  reason: z.string().trim().optional(),
});

export const adminResolveApprovalSchema = z.object({
  tripId: z.string().uuid("Invalid trip UUID."),
  approvalId: z.string().uuid("Invalid approval UUID.").optional(),
  decision: z.enum(["approved", "rejected"], {
    errorMap: () => ({ message: "Decision must be approved or rejected." }),
  }),
  notes: z.string().trim().optional(),
});

export const adminUpsertCircuitSchema = z.object({
  id: z.string().min(1).optional(),
  destinationId: z.string().min(1, "Destination is required."),
  title: z.string().trim().min(2, "Title must be at least 2 characters."),
  days: z.number().int().min(1, "Circuit must be at least 1 day."),
  nights: z.number().int().min(0).optional(),
  basePricePerPerson: z.number().min(0, "Base price cannot be negative."),
  rating: z.number().min(0).max(5).optional(),
  badge: z.string().nullable().optional(),
  categories: z.array(z.string()).optional(),
  summary: z.string().optional(),
  description: z.string().optional(),
  imageUrl: z.string().optional(),
  isFeatured: z.boolean().optional(),
  isActive: z.boolean().optional(),
  reason: z.string().trim().optional(),
});

export const adminToggleCircuitStatusSchema = z.object({
  circuitId: z.string().min(1, "Circuit ID is required."),
  isActive: z.boolean(),
  reason: z.string().trim().optional(),
});

export const adminControlActiveTripSchema = z.object({
  tripId: z.string().min(1, "Trip ID is required."),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  status: z.enum(["draft", "pending_approval", "confirmed", "cancelled", "completed"]).optional(),
  totalAmount: z.number().min(0).optional(),
  travelerCount: z.number().int().min(1).optional(),
  vehicleId: z.string().optional(),
  driverId: z.string().optional(),
  hotelId: z.string().optional(),
  rooms: z.number().int().min(1).optional(),
  stopIds: z.array(z.string()).optional(),
  reason: z.string().trim().optional(),
});

export const adminUpsertVehicleSchema = z.object({
  id: z.string().min(1).optional(),
  name: z.string().trim().min(2, "Vehicle name must be at least 2 characters."),
  type: z.enum(["car", "bike", "bus"], {
    errorMap: () => ({ message: "Vehicle type must be car, bike, or bus." }),
  }),
  subtitle: z.string().optional(),
  description: z.string().optional(),
  capacity: z.number().int().min(1).optional(),
  luggageCapacity: z.number().int().min(0).optional(),
  features: z.array(z.string()).optional(),
  fuelPolicy: z.string().optional(),
  driverType: z.string().optional(),
  pricePerDay: z.number().min(0, "Price per day cannot be negative."),
  imageUrl: z.string().optional(),
  isActive: z.boolean().optional(),
  reason: z.string().trim().optional(),
});

export const adminDeleteVehicleSchema = z.object({
  vehicleId: z.string().min(1, "Vehicle ID is required."),
  reason: z.string().trim().optional(),
});

export const adminUpsertDriverSchema = z.object({
  id: z.string().min(1).optional(),
  name: z.string().trim().min(2, "Driver name must be at least 2 characters."),
  phone: z.string().trim().min(8, "Valid phone number is required."),
  licensePlate: z.string().trim().min(4, "Vehicle license plate is required."),
  rating: z.number().min(0).max(5).optional(),
  isActive: z.boolean().optional(),
  reason: z.string().trim().optional(),
});

export const adminUpsertHotelSchema = z.object({
  id: z.string().min(1).optional(),
  destinationId: z.string().min(1, "Destination ID is required."),
  name: z.string().trim().min(2, "Hotel name must be at least 2 characters."),
  description: z.string().optional(),
  neighborhood: z.string().optional(),
  distanceText: z.string().optional(),
  pricePerNight: z.number().min(0, "Price per night cannot be negative."),
  rating: z.number().min(0).max(5).optional(),
  badge: z.string().nullable().optional(),
  amenities: z.array(z.string()).optional(),
  imageUrl: z.string().optional(),
  isActive: z.boolean().optional(),
  reason: z.string().trim().optional(),
});

export const adminUpsertStopSchema = z.object({
  id: z.string().min(1).optional(),
  destinationId: z.string().optional().nullable(),
  name: z.string().trim().min(2, "Stop name must be at least 2 characters."),
  description: z.string().optional(),
  distanceText: z.string().optional(),
  turnaroundText: z.string().optional(),
  price: z.number().min(0, "Price cannot be negative."),
  pricingUnit: z.enum(["per_person", "flat"]).optional(),
  amenities: z.array(z.string()).optional(),
  imageUrl: z.string().optional(),
  isActive: z.boolean().optional(),
  reason: z.string().trim().optional(),
});

export const adminUpsertDestinationSchema = z.object({
  id: z.string().min(1).optional(),
  slug: z.string().trim().min(2, "Destination slug is required."),
  name: z.string().trim().min(2, "Destination name is required."),
  region: z.string().optional(),
  tagline: z.string().optional(),
  description: z.string().optional(),
  startingPrice: z.number().min(0).optional(),
  rating: z.number().min(0).max(5).optional(),
  badge: z.string().nullable().optional(),
  categories: z.array(z.string()).optional(),
  heroImagePath: z.string().optional(),
  isBookable: z.boolean().optional(),
  isActive: z.boolean().optional(),
  isFeatured: z.boolean().optional(),
  reason: z.string().trim().optional(),
});

export const adminUpsertCouponSchema = z.object({
  id: z.string().min(1).optional(),
  code: z.string().trim().min(2, "Coupon code must be at least 2 characters."),
  description: z.string().optional(),
  discountType: z.enum(["flat", "percent"]),
  value: z.number().min(0, "Discount value cannot be negative."),
  minSubtotal: z.number().min(0).optional().default(0),
  maxDiscount: z.number().min(0).nullable().optional(),
  usageLimit: z.number().int().min(1).nullable().optional(),
  validUntil: z.string().nullable().optional(),
  isActive: z.boolean().optional().default(true),
  reason: z.string().trim().optional(),
});

export const adminToggleCouponSchema = z.object({
  id: z.string().min(1, "Coupon ID is required."),
  isActive: z.boolean(),
  reason: z.string().trim().optional(),
});

export const adminUpdatePricingConfigSchema = z.object({
  serviceFee: z.number().min(0, "Service fee cannot be negative."),
  gstRate: z.number().min(0).max(1, "GST rate must be between 0 and 1 (e.g. 0.18)."),
  demoCouponCode: z.string().trim().min(2).optional().default("EXPLOREINDIA"),
  demoCouponDiscount: z.number().min(0).optional().default(2000),
  reason: z.string().trim().optional(),
});

export const applyCustomerCouponSchema = z.object({
  tripId: z.string().min(1, "Trip ID is required."),
  couponCode: z.string().trim().min(2, "Coupon code must be at least 2 characters."),
});

export const createRazorpayOrderSchema = z.object({
  tripId: z.string().min(1, "Trip ID is required."),
});

export const verifyRazorpayPaymentSchema = z.object({
  tripId: z.string().min(1, "Trip ID is required."),
  razorpay_order_id: z.string().min(1, "Order ID is required."),
  razorpay_payment_id: z.string().min(1, "Payment ID is required."),
  razorpay_signature: z.string().min(1, "Signature is required."),
  paymentMethod: z.enum(["upi", "card", "netbanking", "emi"]).optional().default("upi"),
});

export type AdminUpdateBookingStatusInput = z.infer<typeof adminUpdateBookingStatusSchema>;
export type AdminAssignDriverInput = z.infer<typeof adminAssignDriverSchema>;
export type AdminResolveApprovalInput = z.infer<typeof adminResolveApprovalSchema>;
export type AdminUpsertCircuitInput = z.infer<typeof adminUpsertCircuitSchema>;
export type AdminToggleCircuitStatusInput = z.infer<typeof adminToggleCircuitStatusSchema>;
export type AdminControlActiveTripInput = z.infer<typeof adminControlActiveTripSchema>;
export type AdminUpsertVehicleInput = z.infer<typeof adminUpsertVehicleSchema>;
export type AdminDeleteVehicleInput = z.infer<typeof adminDeleteVehicleSchema>;
export type AdminUpsertDriverInput = z.infer<typeof adminUpsertDriverSchema>;
export type AdminUpsertHotelInput = z.infer<typeof adminUpsertHotelSchema>;
export type AdminUpsertStopInput = z.infer<typeof adminUpsertStopSchema>;
export type AdminUpsertDestinationInput = z.infer<typeof adminUpsertDestinationSchema>;
export type AdminUpsertCouponInput = z.infer<typeof adminUpsertCouponSchema>;
export type AdminToggleCouponInput = z.infer<typeof adminToggleCouponSchema>;
export type AdminUpdatePricingConfigInput = z.infer<typeof adminUpdatePricingConfigSchema>;
export type ApplyCustomerCouponInput = z.infer<typeof applyCustomerCouponSchema>;
export type CreateRazorpayOrderInput = z.infer<typeof createRazorpayOrderSchema>;
export type VerifyRazorpayPaymentInput = z.infer<typeof verifyRazorpayPaymentSchema>;
