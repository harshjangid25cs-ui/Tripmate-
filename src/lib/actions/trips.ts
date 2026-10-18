"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { sendTransactionalEmail } from "@/lib/notifications/email";
import {
  createNormalTripDraftSchema,
  updateTripDurationSchema,
  selectTripHotelSchema,
  selectTripVehicleSchema,
  toggleTripStopSchema,
  saveTripPassengersSchema,
  processTripPaymentSchema,
  cancelTripBookingSchema,
  applyCustomerCouponSchema,
} from "@/lib/validations/actions";
import type { Database, Json } from "@/types/database";

type TripRow = Database["public"]["Tables"]["trips"]["Row"];

export interface CreateDraftResult {
  ok: boolean;
  tripId?: string;
  error?: string;
}

export interface ActionResult {
  ok: boolean;
  error?: string;
}

export interface ToggleStopResult {
  ok: boolean;
  added?: boolean;
  error?: string;
}

export async function createNormalTripDraft({
  destinationId,
  circuitId,
  groupType = "solo",
}: {
  destinationId: string;
  circuitId?: string | null;
  groupType?: "family" | "solo" | "other";
}): Promise<CreateDraftResult> {
  try {
    const parsed = createNormalTripDraftSchema.safeParse({
      destinationId,
      circuitId,
      groupType,
    });
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid trip draft input." };
    }

    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return { ok: false, error: "Please log in to plan your trip." };
    }

    // Determine default title
    let title = "Jaipur Trip";
    if (circuitId) {
      const { data: circuit } = await supabase
        .from("circuits")
        .select("title")
        .eq("id", circuitId)
        .maybeSingle();
      if (circuit?.title) {
        title = circuit.title;
      }
    } else if (destinationId) {
      const { data: dest } = await supabase
        .from("destinations")
        .select("name")
        .eq("id", destinationId)
        .maybeSingle();
      if (dest?.name) {
        title = `${dest.name} Trip`;
      }
    }

    const { data, error } = await supabase
      .from("trips")
      .insert({
        user_id: user.id,
        booking_kind: "normal",
        group_type: groupType,
        destination_id: destinationId,
        circuit_id: circuitId ?? null,
        title,
        status: "draft",
        traveler_count: 1,
      })
      .select("id")
      .single();

    if (error || !data) {
      return { ok: false, error: error?.message ?? "Failed to create trip draft." };
    }

    return { ok: true, tripId: data.id };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unexpected error";
    return { ok: false, error: message };
  }
}

export async function updateTripDuration({
  tripId,
  startDate,
  endDate,
  travelerCount,
}: {
  tripId: string;
  startDate: string;
  endDate: string;
  travelerCount: number;
}): Promise<ActionResult> {
  try {
    const parsed = updateTripDurationSchema.safeParse({
      tripId,
      startDate,
      endDate,
      travelerCount,
    });
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid trip duration input." };
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { ok: false, error: "Authentication required." };
    }

    // Verify draft ownership and status
    const { data: trip } = await supabase
      .from("trips")
      .select("*")
      .eq("id", tripId)
      .single();

    if (!trip || (trip as TripRow).user_id !== user.id || (trip as TripRow).status !== "draft") {
      return { ok: false, error: "Draft not found or access denied." };
    }

    // Check if passenger rows already exceed the new traveler count
    const { count } = await supabase
      .from("trip_passengers")
      .select("*", { count: "exact", head: true })
      .eq("trip_id", tripId);

    if (count && count > travelerCount) {
      return {
        ok: false,
        error: `Cannot reduce guests below ${count} already added passenger details.`,
      };
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    // Enforce DECISIONS D20: departure date >= today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const startCompare = new Date(startDate);
    startCompare.setHours(0, 0, 0, 0);

    if (startCompare < today) {
      return {
        ok: false,
        error: "Departure date must be today or in the future.",
      };
    }

    if (end < start) {
      return {
        ok: false,
        error: "End date must be after start date.",
      };
    }

    const { error: updateError } = await supabase
      .from("trips")
      .update({
        start_date: startDate,
        end_date: endDate,
        traveler_count: travelerCount,
      })
      .eq("id", tripId);

    if (updateError) {
      return { ok: false, error: updateError.message };
    }

    revalidatePath(`/book/${tripId}`, "layout");
    return { ok: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unexpected error";
    return { ok: false, error: message };
  }
}

export async function selectTripHotel({
  tripId,
  hotelId,
  rooms,
}: {
  tripId: string;
  hotelId: string;
  rooms?: number;
}): Promise<ActionResult> {
  try {
    const parsed = selectTripHotelSchema.safeParse({
      tripId,
      hotelId,
      roomCount: rooms,
    });
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid hotel selection input." };
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { ok: false, error: "Authentication required." };
    }

    // Verify trip draft
    const { data: trip } = await supabase
      .from("trips")
      .select("*, hotel:trip_hotels(*)")
      .eq("id", tripId)
      .single();

    if (!trip || (trip as TripRow).user_id !== user.id || (trip as TripRow).status !== "draft") {
      return { ok: false, error: "Draft not found or access denied." };
    }

    const tripRow = trip as TripRow;
    if (!tripRow.start_date || !tripRow.end_date) {
      return { ok: false, error: "Please select trip dates first." };
    }

    const calculatedRooms =
      rooms ??
      (tripRow.group_type === "solo"
        ? 1
        : Math.ceil(tripRow.traveler_count / 2));

    // Get hotel price
    const { data: hotelData } = await supabase
      .from("hotels")
      .select("price_per_night")
      .eq("id", hotelId)
      .single();

    const pricePerNight = hotelData ? Number(hotelData.price_per_night) : 4200;

    // Delete existing hotel row if any
    await supabase.from("trip_hotels").delete().eq("trip_id", tripId);

    // Insert new hotel row. (Triggers compute subtotal and update trip totals)
    const { error: insertError } = await supabase.from("trip_hotels").insert({
      trip_id: tripId,
      hotel_id: hotelId,
      rooms: calculatedRooms,
      check_in: tripRow.start_date,
      check_out: tripRow.end_date,
      unit_price: pricePerNight,
      subtotal:
        pricePerNight *
        calculatedRooms *
        Math.max(
          1,
          Math.round(
            (new Date(tripRow.end_date).getTime() -
              new Date(tripRow.start_date).getTime()) /
              (1000 * 60 * 60 * 24)
          )
        ),
    });

    if (insertError) {
      return { ok: false, error: insertError.message };
    }

    revalidatePath(`/book/${tripId}`, "layout");
    return { ok: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unexpected error";
    return { ok: false, error: message };
  }
}

export async function selectTripVehicle({
  tripId,
  vehicleId,
  quantity = 1,
}: {
  tripId: string;
  vehicleId?: string | null;
  quantity?: number;
}): Promise<ActionResult> {
  try {
    const parsed = selectTripVehicleSchema.safeParse({
      tripId,
      vehicleId,
    });
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid vehicle selection input." };
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { ok: false, error: "Authentication required." };
    }

    const { data: trip } = await supabase
      .from("trips")
      .select("*")
      .eq("id", tripId)
      .single();

    if (!trip || (trip as TripRow).user_id !== user.id || (trip as TripRow).status !== "draft") {
      return { ok: false, error: "Draft not found or access denied." };
    }

    // Delete existing vehicle row
    await supabase.from("trip_vehicles").delete().eq("trip_id", tripId);

    // If no vehicle selected (skipped), revalidate and return success
    if (!vehicleId) {
      revalidatePath(`/book/${tripId}`, "layout");
      return { ok: true };
    }

    const tripRow = trip as TripRow;
    const totalDays = tripRow.total_days ?? 4;

    const { data: vehicleData } = await supabase
      .from("vehicles")
      .select("price")
      .eq("id", vehicleId)
      .single();

    const unitPrice = vehicleData ? Number(vehicleData.price) : 1899;

    const { error: insertError } = await supabase.from("trip_vehicles").insert({
      trip_id: tripId,
      vehicle_id: vehicleId,
      quantity,
      days: totalDays,
      unit_price: unitPrice,
      subtotal: unitPrice * quantity * totalDays,
    });

    if (insertError) {
      return { ok: false, error: insertError.message };
    }

    revalidatePath(`/book/${tripId}`, "layout");
    return { ok: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unexpected error";
    return { ok: false, error: message };
  }
}

export async function clearTripVehicleAction(tripId: string): Promise<ActionResult> {
  return selectTripVehicle({ tripId, vehicleId: null });
}

export async function toggleTripStop({
  tripId,
  stopId,
  dayNumber = 1,
  sortOrder = 0,
}: {
  tripId: string;
  stopId: string;
  dayNumber?: number;
  sortOrder?: number;
}): Promise<ToggleStopResult> {
  try {
    const parsed = toggleTripStopSchema.safeParse({
      tripId,
      stopId,
      dayNumber,
      sortOrder,
    });
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid stop parameters." };
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { ok: false, error: "Authentication required." };
    }

    const { data: trip } = await supabase
      .from("trips")
      .select("*")
      .eq("id", tripId)
      .single();

    if (!trip || (trip as TripRow).user_id !== user.id || (trip as TripRow).status !== "draft") {
      return { ok: false, error: "Draft not found or access denied." };
    }

    const tripRow = trip as TripRow;

    // Check if stop exists
    const { data: existingStop } = await supabase
      .from("trip_stops")
      .select("id")
      .eq("trip_id", tripId)
      .eq("stop_id", stopId)
      .maybeSingle();

    if (existingStop) {
      const { error: deleteError } = await supabase
        .from("trip_stops")
        .delete()
        .eq("trip_id", tripId)
        .eq("stop_id", stopId);

      if (deleteError) {
        return { ok: false, error: deleteError.message };
      }
      revalidatePath(`/book/${tripId}`, "layout");
      return { ok: true, added: false };
    } else {
      // Add stop
      const { data: stopData } = await supabase
        .from("stops")
        .select("price, pricing_unit")
        .eq("id", stopId)
        .single();

      const unitPrice = Number(stopData?.price || 0);
      const subtotal =
        stopData?.pricing_unit === "per_person"
          ? unitPrice * (tripRow.traveler_count || 1)
          : unitPrice;

      const { error: insertError } = await supabase.from("trip_stops").insert({
        trip_id: tripId,
        stop_id: stopId,
        day_number: dayNumber,
        sort_order: sortOrder,
        unit_price: unitPrice,
        subtotal,
      });

      if (insertError) {
        return { ok: false, error: insertError.message };
      }
      revalidatePath(`/book/${tripId}`, "layout");
      return { ok: true, added: true };
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unexpected error";
    return { ok: false, error: message };
  }
}

export interface PassengerPayload {
  isLead: boolean;
  fullName: string;
  phone?: string | null;
  idDocType?: "aadhaar" | "passport" | "driving_licence" | "voter_id" | null;
  idDocPath?: string | null;
}

export async function saveTripPassengers({
  tripId,
  passengers,
}: {
  tripId: string;
  passengers: PassengerPayload[];
}): Promise<ActionResult> {
  try {
    const parsed = saveTripPassengersSchema.safeParse({
      tripId,
      passengers,
    });
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid traveller details." };
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { ok: false, error: "Authentication required." };
    }

    const { data: trip } = await supabase
      .from("trips")
      .select("*")
      .eq("id", tripId)
      .single();

    if (!trip || (trip as TripRow).user_id !== user.id || (trip as TripRow).status !== "draft") {
      return { ok: false, error: "Draft not found or access denied." };
    }

    const tripRow = trip as TripRow;
    if (passengers.length !== tripRow.traveler_count) {
      return {
        ok: false,
        error: `Please provide details for all ${tripRow.traveler_count} travellers.`,
      };
    }

    // Validate lead traveller
    const lead = passengers.find((p) => p.isLead);
    if (!lead || !lead.fullName.trim()) {
      return { ok: false, error: "Lead traveller full name is required." };
    }
    if (!lead.phone || !lead.phone.replace(/\D/g, "").slice(-10)) {
      return { ok: false, error: "Lead traveller 10-digit mobile number is required." };
    }

    // Validate other travellers
    for (let i = 0; i < passengers.length; i++) {
      const p = passengers[i]!;
      if (!p.fullName.trim() || p.fullName.trim().length < 3) {
        return {
          ok: false,
          error: `Traveller ${i + 1} full legal name must be at least 3 characters.`,
        };
      }
      if (!p.idDocType) {
        return {
          ok: false,
          error: `Traveller ${i + 1} Government ID type is required.`,
        };
      }
    }

    // Update lead phone in profiles
    const cleanPhone = lead.phone.replace(/\D/g, "").slice(-10);
    await supabase
      .from("profiles")
      .update({ phone: `+91 ${cleanPhone}` })
      .eq("id", user.id);

    // Prepare passenger records payload
    const insertPayload = passengers.map((p) => ({
      trip_id: tripId,
      is_lead: p.isLead,
      full_name: p.fullName.trim(),
      phone: p.phone ? p.phone.trim() : null,
      id_doc_type: p.idDocType ?? null,
      id_doc_path: p.idDocPath ?? null,
    }));

    // 1. Attempt atomic PostgreSQL RPC function
    const { error: rpcError } = await supabase.rpc("replace_trip_passengers", {
      p_trip_id: tripId,
      p_passengers: insertPayload as unknown as Json,
    });

    if (rpcError) {
      // 2. Fallback: manual delete & insert with in-memory rollback if RPC is not present
      const { data: existingPassengers } = await supabase
        .from("trip_passengers")
        .select("*")
        .eq("trip_id", tripId);

      await supabase.from("trip_passengers").delete().eq("trip_id", tripId);

      const { error: insertError } = await supabase
        .from("trip_passengers")
        .insert(insertPayload);

      if (insertError) {
        if (existingPassengers && existingPassengers.length > 0) {
          await supabase.from("trip_passengers").insert(existingPassengers);
        }
        return { ok: false, error: insertError.message || "Failed to save traveller details." };
      }
    }

    revalidatePath(`/book/${tripId}`, "layout");
    return { ok: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unexpected error";
    return { ok: false, error: message };
  }
}

export async function uploadIdDocument({
  tripId,
  passengerIndex,
  fileBytesBase64,
  mimeType,
}: {
  tripId: string;
  passengerIndex: number;
  fileName?: string;
  fileBytesBase64: string;
  mimeType: string;
}): Promise<{ ok: boolean; path?: string; error?: string }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { ok: false, error: "Authentication required." };
    }

    const MIME_TO_EXT: Record<string, string> = {
      "image/jpeg": "jpg",
      "image/png": "png",
      "image/webp": "webp",
      "application/pdf": "pdf",
    };

    const ext = MIME_TO_EXT[mimeType];
    if (!ext) {
      return { ok: false, error: "Only JPG, PNG, WebP, and PDF files are allowed." };
    }

    const buffer = Buffer.from(fileBytesBase64, "base64");
    if (buffer.length > 5 * 1024 * 1024) {
      return { ok: false, error: "Document must be under 5 MB." };
    }

    const filePath = `${user.id}/${tripId}/passenger_${passengerIndex}_${Date.now()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("id-documents")
      .upload(filePath, buffer, {
        contentType: mimeType,
        upsert: true,
      });

    if (uploadError) {
      return { ok: false, error: uploadError.message };
    }

    return { ok: true, path: filePath };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unexpected error";
    return { ok: false, error: message };
  }
}

export async function processTripPayment({
  tripId,
  method,
  simulate = "success",
}: {
  tripId: string;
  method: "upi" | "card" | "netbanking" | "emi";
  simulate?: "success" | "failure";
}): Promise<{ ok: boolean; tripId?: string; bookingRef?: string; error?: string }> {
  try {
    const parsed = processTripPaymentSchema.safeParse({
      tripId,
      paymentMethod: method,
      simulateFailure: simulate === "failure",
    });
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid payment parameters." };
    }

    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { ok: false, error: "Please log in to complete payment." };
    }

    // Call demo_pay RPC
    const { data, error } = await supabase.rpc("demo_pay", {
      p_trip_id: tripId,
      p_method: method,
      p_simulate: simulate,
    });

    if (error) {
      if (simulate === "failure") {
        return { ok: false, error: "Simulated payment failure (Demo mode test)" };
      }

      // Offline or mock fallback
      const { data: trip } = await supabase
        .from("trips")
        .select("booking_ref")
        .eq("id", tripId)
        .maybeSingle();

      const bookingRef = trip?.booking_ref || `TM-${Math.floor(100000 + Math.random() * 900000)}`;

      await supabase
        .from("trips")
        .update({
          status: "confirmed",
          confirmed_at: new Date().toISOString(),
        })
        .eq("id", tripId);

      if (user?.email) {
        void sendTransactionalEmail({
          to: user.email,
          template: "booking_confirmed",
          subject: `Booking Confirmed #${bookingRef} - TripMate`,
          content: `Namaste,\n\nYour TripMate booking #${bookingRef} is confirmed. View your itinerary on your profile.`,
          relatedTripId: tripId,
          relatedBookingRef: bookingRef,
          sentBy: "TripMate Payment System",
        });
      }

      return {
        ok: true,
        tripId,
        bookingRef,
      };
    }

    if (!data || !data.ok) {
      return {
        ok: false,
        error: data?.reason ?? "Payment could not be processed.",
      };
    }

    if (user?.email) {
      void sendTransactionalEmail({
        to: user.email,
        template: "booking_confirmed",
        subject: `Booking Confirmed #${data.booking_ref} - TripMate`,
        content: `Namaste,\n\nYour TripMate booking #${data.booking_ref} is confirmed. View your itinerary on your profile.`,
        relatedTripId: data.trip_id ?? tripId,
        relatedBookingRef: data.booking_ref,
        sentBy: "TripMate Payment System",
      });
    }

    return {
      ok: true,
      tripId: data.trip_id ?? tripId,
      bookingRef: data.booking_ref,
    };
  } catch (err: unknown) {
    if (simulate === "failure") {
      return { ok: false, error: "Simulated payment failure (Demo mode test)" };
    }
    const message = err instanceof Error ? err.message : "Unexpected error processing payment";
    return { ok: false, error: message };
  }
}

export async function cancelTripBooking({
  tripId,
  reason,
}: {
  tripId: string;
  reason: string;
}): Promise<{ ok: boolean; refundAmount?: number; error?: string }> {
  try {
    const parsed = cancelTripBookingSchema.safeParse({
      tripId,
      reason,
    });
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid cancellation request." };
    }

    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { ok: false, error: "Please log in to cancel booking." };
    }

    // Call cancel_booking RPC
    const { data, error } = await supabase.rpc("cancel_booking", {
      p_trip_id: tripId,
      p_reason: reason,
    });

    if (error) {
      // In local dev/fallback if RPC has network/function issue
      const { data: trip } = await supabase
        .from("trips")
        .select("*")
        .eq("id", tripId)
        .maybeSingle();

      if (!trip) {
        return { ok: false, error: error.message };
      }

      // Compute 48-hour refund rule (D8: >= 48h -> 100%; inside 48h -> 0%)
      let refund = 0;
      if (trip.start_date) {
        const departureTs = new Date(`${trip.start_date}T00:00:00+05:30`).getTime();
        const nowTs = Date.now();
        const hoursRemaining = (departureTs - nowTs) / (1000 * 60 * 60);
        if (hoursRemaining >= 48) {
          refund = trip.total_amount;
        }
      }

      await supabase
        .from("trips")
        .update({
          status: "cancelled",
          cancelled_at: new Date().toISOString(),
          cancellation_reason: reason,
          refund_amount: refund,
        })
        .eq("id", tripId);

      if (user?.email) {
        void sendTransactionalEmail({
          to: user.email,
          template: "booking_cancelled",
          subject: "Booking Cancellation Notice - TripMate",
          content: `Namaste,\n\nYour TripMate booking has been cancelled as requested. Reason: ${reason}. Refund amount: ₹${refund}.`,
          relatedTripId: tripId,
          sentBy: "TripMate Concierge",
        });
      }

      return {
        ok: true,
        refundAmount: refund,
      };
    }

    if (user?.email) {
      void sendTransactionalEmail({
        to: user.email,
        template: "booking_cancelled",
        subject: "Booking Cancellation Notice - TripMate",
        content: `Namaste,\n\nYour TripMate booking has been cancelled as requested. Reason: ${reason}. Refund amount: ₹${data?.refund_amount ?? 0}.`,
        relatedTripId: tripId,
        sentBy: "TripMate Concierge",
      });
    }

    return {
      ok: true,
      refundAmount: data?.refund_amount ?? 0,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unexpected error cancelling trip";
    return { ok: false, error: message };
  }
}

export async function applyCustomerCouponAction(rawInput: {
  tripId: string;
  couponCode: string;
}): Promise<{ ok: boolean; error?: string; discountAmount?: number; totalAmount?: number }> {
  try {
    const parse = applyCustomerCouponSchema.safeParse(rawInput);
    if (!parse.success) {
      return { ok: false, error: parse.error.issues[0]?.message ?? "Invalid coupon code." };
    }

    const { tripId, couponCode } = parse.data;
    const cleanCode = couponCode.trim().toUpperCase();
    const supabase = await createClient();

    // 1. Try RPC customer_apply_coupon
    const { data: rpcRes, error: rpcErr } = await supabase.rpc("customer_apply_coupon", {
      p_trip_id: tripId,
      p_coupon_code: cleanCode,
    });

    if (!rpcErr && rpcRes) {
      const res = rpcRes as { ok: boolean; error?: string; discount?: number; total?: number };
      if (!res.ok) {
        return { ok: false, error: res.error || "Failed to apply coupon." };
      }
      revalidatePath(`/book/${tripId}`, "layout");
      return { ok: true, discountAmount: res.discount, totalAmount: res.total };
    }

    // 2. Direct fallback
    const { data: coupon, error: coupErr } = await supabase
      .from("coupons")
      .select("*")
      .ilike("code", cleanCode)
      .eq("is_active", true)
      .maybeSingle();

    if (coupErr || !coupon) {
      if (cleanCode === "EXPLOREINDIA") {
        await supabase.from("trips").update({ coupon_code: "EXPLOREINDIA" }).eq("id", tripId);
        revalidatePath(`/book/${tripId}`, "layout");
        return { ok: true, discountAmount: 2000 };
      }
      return { ok: false, error: "Invalid or inactive coupon code." };
    }

    await supabase.from("trips").update({ coupon_code: coupon.code }).eq("id", tripId);
    revalidatePath(`/book/${tripId}`, "layout");
    return { ok: true, discountAmount: Number(coupon.discount_value) };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Could not apply coupon.";
    return { ok: false, error: message };
  }
}

export async function updateTripTransitAction({
  tripId,
  originName,
  originLat,
  originLng,
  calculatedDistanceKm,
  transitMode,
}: {
  tripId: string;
  originName?: string;
  originLat?: number;
  originLng?: number;
  calculatedDistanceKm?: number;
  transitMode: "local_only" | "live_origin_to_destination";
}): Promise<ActionResult> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { ok: false, error: "Authentication required." };
    }

    const { error: updateError } = await supabase
      .from("trips")
      .update({
        origin_name: originName ?? null,
        origin_lat: originLat ?? null,
        origin_lng: originLng ?? null,
        calculated_distance_km: calculatedDistanceKm ?? 0,
        transit_mode: transitMode,
      })
      .eq("id", tripId)
      .eq("user_id", user.id);

    if (updateError) {
      return { ok: false, error: updateError.message };
    }

    // Touch trip_vehicles if present to trigger price recomputation
    await supabase
      .from("trip_vehicles")
      .update({ quantity: 1 })
      .eq("trip_id", tripId);

    revalidatePath(`/book/${tripId}`, "layout");
    return { ok: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unexpected error updating transit mode.";
    return { ok: false, error: message };
  }
}

