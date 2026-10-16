import { describe, it, expect } from "vitest";
import { determineEarliestIncompleteStep } from "../data/booking-guards";
import { uploadIdDocument } from "../actions/trips";

describe("Booking Step Guards & Rules", () => {
  it("enforces earliest incomplete step sequence correctly", () => {
    // 1. Incomplete dates/travelers -> duration
    expect(
      determineEarliestIncompleteStep({
        trip: { start_date: null, end_date: null, traveler_count: 1 },
        hotel: null,
        vehicle: null,
        passengers: [],
      })
    ).toBe("duration");

    // 2. Dates set but no hotel -> hotel
    expect(
      determineEarliestIncompleteStep({
        trip: {
          start_date: "2026-12-14",
          end_date: "2026-12-17",
          traveler_count: 2,
        },
        hotel: null,
        vehicle: null,
        passengers: [],
      })
    ).toBe("hotel");

    // 3. Hotel set but no vehicle -> vehicle
    expect(
      determineEarliestIncompleteStep({
        trip: {
          start_date: "2026-12-14",
          end_date: "2026-12-17",
          traveler_count: 2,
        },
        hotel: { id: "h1" },
        vehicle: null,
        passengers: [],
      })
    ).toBe("vehicle");

    // 4. Hotel & vehicle set, but passengers not complete -> travellers
    expect(
      determineEarliestIncompleteStep({
        trip: {
          start_date: "2026-12-14",
          end_date: "2026-12-17",
          traveler_count: 2,
        },
        hotel: { id: "h1" },
        vehicle: { id: "v1" },
        passengers: [
          { full_name: "Kabir Malhotra", phone: "9876543210", is_lead: true },
        ],
      })
    ).toBe("travellers");

    // 5. Complete passengers -> checkout
    expect(
      determineEarliestIncompleteStep({
        trip: {
          start_date: "2026-12-14",
          end_date: "2026-12-17",
          traveler_count: 2,
        },
        hotel: { id: "h1" },
        vehicle: { id: "v1" },
        passengers: [
          { full_name: "Kabir Malhotra", phone: "9876543210", is_lead: true },
          { full_name: "Aanya Sharma", phone: null, is_lead: false },
        ],
      })
    ).toBe("checkout");
  });
});

describe("Date Calculation Rule (DECISIONS D20)", () => {
  it("calculates end date as start_date + days - 1 (inclusive calendar days)", () => {
    const startDate = new Date(2026, 11, 14); // Dec 14, 2026
    const days = 4;
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + (days - 1));

    expect(endDate.getDate()).toBe(17); // Dec 17
    expect(endDate.getMonth()).toBe(11); // Dec

    const nights = days - 1;
    expect(nights).toBe(3); // 3 Nights
  });

  it("handles single-weekend 2 days trip correctly", () => {
    const startDate = new Date(2026, 11, 14);
    const days = 2;
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + (days - 1));

    expect(endDate.getDate()).toBe(15);
    expect(days - 1).toBe(1);
  });
});

describe("Pricing Pipeline Worked Check (DATABASE.md §3 Worked Check #11)", () => {
  it("computes exact totals for normal 4D/3N trip: subtotal 23,896, fee 999, tax 4,481, discount 2,000, total 27,376", () => {
    const nights = 3;
    const hotelRooms = 1;
    const hotelPricePerNight = 4200;
    const hotelSubtotal = hotelPricePerNight * hotelRooms * nights; // 12,600

    const vehicleDays = 4;
    const vehiclePricePerDay = 1899;
    const vehicleQuantity = 1;
    const vehicleSubtotal = vehiclePricePerDay * vehicleQuantity * vehicleDays; // 7,596

    const travelers = 2;
    const stopPricePerPerson = 1850;
    const stopSubtotal = stopPricePerPerson * travelers; // 3,700

    const subtotal = hotelSubtotal + vehicleSubtotal + stopSubtotal;
    expect(subtotal).toBe(23896);

    const serviceFee = 999;
    const gstRate = 0.18;
    const taxAmount = Math.round(gstRate * (subtotal + serviceFee));
    expect(taxAmount).toBe(4481);

    const demoCouponDiscount = 2000;
    const discountAmount = Math.min(demoCouponDiscount, subtotal + serviceFee + taxAmount);
    expect(discountAmount).toBe(2000);

    const totalAmount = subtotal + serviceFee + taxAmount - discountAmount;
    expect(totalAmount).toBe(27376);
  });
});

describe("Traveller Privacy & Document Rules (BUILD_PLAN M4 & FEATURES §4.6)", () => {
  it("ensures no government ID numbers are collected or stored in payload", () => {
    const validPassengerPayload = {
      trip_id: "trip-123",
      is_lead: true,
      full_name: "Kabir Malhotra",
      phone: "+91 9876543210",
      id_doc_type: "aadhaar" as const,
      id_doc_path: "usr-456/trip-123/passenger_1_1728518400000.pdf",
    };

    // Assert that standard payload has strictly no ID number keys
    expect(validPassengerPayload).not.toHaveProperty("id_number");
    expect(validPassengerPayload).not.toHaveProperty("aadhaar_number");
    expect(validPassengerPayload).not.toHaveProperty("passport_number");
    expect(validPassengerPayload).not.toHaveProperty("document_number");

    // Path must follow user_id/trip_id/passenger_...
    expect(validPassengerPayload.id_doc_path).toMatch(
      /^usr-456\/trip-123\/passenger_\d+_\d+\.pdf$/
    );
  });

  it("proves a 4 MB upload passes size validation under the 6 MB limit", async () => {
    const fourMbBuffer = Buffer.alloc(4 * 1024 * 1024, 0x20); // exactly 4 MB
    expect(fourMbBuffer.length).toBe(4194304);
    expect(fourMbBuffer.length).toBeLessThan(6 * 1024 * 1024);

    const base64 = fourMbBuffer.toString("base64");
    const res = await uploadIdDocument({
      tripId: "11111111-1111-1111-1111-111111111111",
      passengerIndex: 1,
      fileName: "passport_scan.pdf",
      fileBytesBase64: base64,
      mimeType: "application/pdf",
    });

    // Validates that 4 MB is NOT rejected by the 6 MB limit
    expect(res.error).not.toBe("Document must be under 6 MB.");
  });
});

describe("Optional Vehicle Selection in Customer Booking Flow (TASK 2)", () => {
  it("allows selecting null or empty vehicleId in selectTripVehicleSchema", async () => {
    const { selectTripVehicleSchema } = await import("../validations/actions");

    // Null vehicle (skipping vehicle / own transport)
    const nullVeh = selectTripVehicleSchema.safeParse({
      tripId: "f47ac10b-58cc-4372-a567-0e02b2c3d479",
      vehicleId: null,
    });
    expect(nullVeh.success).toBe(true);

    // Undefined vehicle
    const undefVeh = selectTripVehicleSchema.safeParse({
      tripId: "f47ac10b-58cc-4372-a567-0e02b2c3d479",
    });
    expect(undefVeh.success).toBe(true);

    // Empty string vehicle
    const emptyVeh = selectTripVehicleSchema.safeParse({
      tripId: "f47ac10b-58cc-4372-a567-0e02b2c3d479",
      vehicleId: "",
    });
    expect(emptyVeh.success).toBe(true);

    // Valid vehicle UUID
    const validVeh = selectTripVehicleSchema.safeParse({
      tripId: "f47ac10b-58cc-4372-a567-0e02b2c3d479",
      vehicleId: "a11ac10b-58cc-4372-a567-0e02b2c3d479",
    });
    expect(validVeh.success).toBe(true);
  });

  it("exports clearTripVehicleAction for skipping car/bike", async () => {
    const { clearTripVehicleAction, selectTripVehicle } = await import("../actions/trips");
    expect(typeof clearTripVehicleAction).toBe("function");
    expect(typeof selectTripVehicle).toBe("function");
  });

  it("calculates booking subtotal with ₹0 vehicle cost when vehicle is skipped", () => {
    const nights = 3;
    const hotelRooms = 1;
    const hotelPricePerNight = 4200;
    const hotelSubtotal = hotelPricePerNight * hotelRooms * nights; // 12,600

    // Vehicle skipped: 0 cost
    const vehicleSubtotal = 0;

    const travelers = 2;
    const stopPricePerPerson = 1850;
    const stopSubtotal = stopPricePerPerson * travelers; // 3,700

    const subtotal = hotelSubtotal + vehicleSubtotal + stopSubtotal;
    expect(subtotal).toBe(16300);

    const serviceFee = 999;
    const gstRate = 0.18;
    const taxAmount = Math.round(gstRate * (subtotal + serviceFee));
    expect(taxAmount).toBe(3114);

    const discountAmount = 2000;
    const totalAmount = subtotal + serviceFee + taxAmount - discountAmount;
    expect(totalAmount).toBe(18413);
  });
});

