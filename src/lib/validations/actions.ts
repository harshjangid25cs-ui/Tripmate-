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

export type AdminUpdateBookingStatusInput = z.infer<typeof adminUpdateBookingStatusSchema>;
export type AdminAssignDriverInput = z.infer<typeof adminAssignDriverSchema>;
export type AdminResolveApprovalInput = z.infer<typeof adminResolveApprovalSchema>;
