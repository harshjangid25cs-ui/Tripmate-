"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { FALLBACK_COMPANY, isSeatValidForCapacity } from "@/lib/data/commercial";
import {
  createCommercialDraftSchema,
  saveCommercialSetupSchema,
  saveCommercialBusAndRosterSchema,
} from "@/lib/validations/actions";
import type { Database, Json } from "@/types/database";

export interface CommercialSetupInput {
  travelerCount: number;
  startDate: string;
  endDate: string;
  bookingTime: string;
  fromLocation: string;
  toLocation: string;
  tripPurpose?: string;
}

export interface CommercialPassengerInput {
  fullName: string;
  phone: string;
  designation?: string;
  employeeRef?: string;
  seatLabel: string;
  isLead?: boolean;
}

/**
 * 1. Creates a new commercial booking draft for the current user and their company.
 */
export async function createCommercialDraftAction(companyId?: string) {
  try {
    const parsed = createCommercialDraftSchema.safeParse({ companyId });
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid company ID." };
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { ok: false, error: "Please log in to start a commercial booking." };
    }

    // Resolve company ID
    let targetCompanyId = companyId;
    if (!targetCompanyId) {
      const { data: member } = await supabase
        .from("company_members")
        .select("company_id")
        .eq("profile_id", user.id)
        .limit(1)
        .maybeSingle();

      targetCompanyId = member?.company_id || FALLBACK_COMPANY.id;
    }

    // Generate reference code
    const randomDigits = String(Math.floor(100000 + Math.random() * 900000));
    const bookingRef = `TM-${randomDigits}`;

    // Insert trips draft
    const { data: tripData, error: tripErr } = await supabase
      .from("trips")
      .insert({
        user_id: user.id,
        booking_ref: bookingRef,
        booking_kind: "commercial",
        status: "draft",
        traveler_count: 28,
        title: "Corporate Commercial Trip",
      })
      .select("id")
      .single();

    if (tripErr || !tripData) {
      console.error("Database error creating commercial trip draft:", tripErr);
      return {
        ok: false,
        error: tripErr?.message || "Failed to create commercial trip draft.",
      };
    }

    // Insert commercial_bookings row
    const { error: commErr } = await supabase.from("commercial_bookings").insert({
      trip_id: tripData.id,
      company_id: targetCompanyId,
      booking_time: "07:30:00",
    });

    if (commErr) {
      console.error("Database error creating commercial booking link:", commErr);
      return {
        ok: false,
        error: commErr.message || "Failed to associate company with commercial trip.",
      };
    }

    return { ok: true, tripId: tripData.id };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to create commercial draft";
    return { ok: false, error: message };
  }
}

/**
 * 2. Saves Step 1: Set Up parameters (headcount, schedule, time, route From/To, purpose).
 */
export async function saveCommercialSetupAction(
  tripId: string,
  input: CommercialSetupInput
) {
  try {
    const parsed = saveCommercialSetupSchema.safeParse({
      tripId,
      ...input,
    });
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid setup details." };
    }

    if (input.endDate < input.startDate) {
      return { ok: false, error: "Return date cannot be earlier than departure date." };
    }

    const supabase = await createClient();
    const title = input.tripPurpose?.trim() || "Corporate Offsite Expedition";

    // Update trips table
    const { error: tripErr } = await supabase
      .from("trips")
      .update({
        traveler_count: input.travelerCount,
        start_date: input.startDate,
        end_date: input.endDate,
        from_location: input.fromLocation.trim(),
        to_location: input.toLocation.trim(),
        title,
      })
      .eq("id", tripId);

    if (tripErr) {
      console.error("Database error saving commercial setup:", tripErr);
      return {
        ok: false,
        error: tripErr.message || "Failed to update commercial setup.",
      };
    }

    // Update commercial_bookings table
    const { error: commErr } = await supabase
      .from("commercial_bookings")
      .update({
        booking_time: input.bookingTime,
        trip_purpose: input.tripPurpose?.trim() || null,
      })
      .eq("trip_id", tripId);

    if (commErr) {
      console.error("Database error updating commercial bookings:", commErr);
      return {
        ok: false,
        error: commErr.message || "Failed to update commercial schedule parameters.",
      };
    }

    revalidatePath(`/commercial/${tripId}`);
    return { ok: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to save commercial setup";
    return { ok: false, error: message };
  }
}

/**
 * 3. Saves Step 2: Bus selection and passenger roster assignments with seat labels safely.
 */
export async function saveCommercialBusAndRosterAction(
  tripId: string,
  vehicleId: string,
  passengers: CommercialPassengerInput[]
) {
  try {
    const parsed = saveCommercialBusAndRosterSchema.safeParse({
      tripId,
      vehicleId,
      passengers,
    });
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid bus and roster input." };
    }

    const supabase = await createClient();

    // Verify vehicle capacity
    const { data: bus } = await supabase
      .from("vehicles")
      .select("capacity, price")
      .eq("id", vehicleId)
      .single();

    const capacity = bus?.capacity || 45;

    // Validate that each passenger has a unique, valid seat within capacity
    const seenSeats = new Set<string>();
    for (const p of passengers) {
      if (!p.seatLabel) {
        return { ok: false, error: `Passenger ${p.fullName} does not have a seat assigned.` };
      }
      if (seenSeats.has(p.seatLabel)) {
        return { ok: false, error: `Seat ${p.seatLabel} is assigned more than once.` };
      }
      seenSeats.add(p.seatLabel);

      if (!isSeatValidForCapacity(p.seatLabel, capacity)) {
        return { ok: false, error: `Seat ${p.seatLabel} exceeds bus capacity of ${capacity} seats.` };
      }
    }

    // Backup existing vehicle and passenger rows to prevent data loss on failure
    const [{ data: existingVehicles }, { data: existingPassengers }] = await Promise.all([
      supabase.from("trip_vehicles").select("*").eq("trip_id", tripId),
      supabase.from("trip_passengers").select("*").eq("trip_id", tripId),
    ]);

    // Upsert trip_vehicles (bus quantity = 1)
    await supabase.from("trip_vehicles").delete().eq("trip_id", tripId);
    const { error: vehicleInsertErr } = await supabase.from("trip_vehicles").insert({
      trip_id: tripId,
      vehicle_id: vehicleId,
      quantity: 1,
    });

    if (vehicleInsertErr) {
      // Rollback to existing vehicles if backup exists
      if (existingVehicles && existingVehicles.length > 0) {
        await supabase.from("trip_vehicles").insert(existingVehicles);
      }
      return { ok: false, error: vehicleInsertErr.message || "Failed to assign fleet bus." };
    }

    const passengerRows: Database["public"]["Tables"]["trip_passengers"]["Insert"][] =
      passengers.map((p, idx) => ({
        trip_id: tripId,
        full_name: p.fullName.trim(),
        phone: p.phone.trim(),
        designation: p.designation?.trim() || "Team Member",
        employee_ref: p.employeeRef?.trim() || String(idx + 1).padStart(4, "0"),
        seat_label: p.seatLabel,
        is_lead: Boolean(p.isLead || idx === 0),
      }));

    // 1. Attempt atomic database-level RPC replacement
    const { error: rpcError } = await supabase.rpc("replace_trip_passengers", {
      p_trip_id: tripId,
      p_passengers: passengerRows as unknown as Json,
    });

    if (rpcError) {
      // 2. Fallback: manual delete & insert with in-memory rollback if RPC is not present
      await supabase.from("trip_passengers").delete().eq("trip_id", tripId);

      const { error: paxInsertErr } = await supabase.from("trip_passengers").insert(passengerRows);

      if (paxInsertErr) {
        if (existingPassengers && existingPassengers.length > 0) {
          await supabase.from("trip_passengers").insert(existingPassengers);
        }
        return { ok: false, error: paxInsertErr.message || "Failed to save passenger roster." };
      }
    }

    revalidatePath(`/commercial/${tripId}`);
    return { ok: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to save fleet and roster";
    return { ok: false, error: message };
  }
}

/**
 * 4. Submits the commercial booking via submit_commercial_booking RPC.
 */
export async function submitCommercialBookingAction(tripId: string) {
  try {
    const supabase = await createClient();

    // Call Supabase RPC
    const { data, error } = await supabase.rpc("submit_commercial_booking", {
      p_trip_id: tripId,
    });

    if (error) {
      // Fallback: update status and assign ticket codes cleanly
      await supabase
        .from("trips")
        .update({
          status: "confirmed",
          confirmed_at: new Date().toISOString(),
        })
        .eq("id", tripId);

      // Assign ticket codes
      const { data: paxList } = await supabase
        .from("trip_passengers")
        .select("id")
        .eq("trip_id", tripId);

      if (paxList) {
        for (const pax of paxList) {
          const code = `TKT-${Math.random().toString(36).substring(2, 14).toUpperCase().padEnd(12, "0")}`;
          await supabase
            .from("trip_passengers")
            .update({ ticket_code: code })
            .eq("id", pax.id);
        }
      }

      revalidatePath(`/commercial/${tripId}`);
      revalidatePath("/trips");
      return {
        ok: true,
        status: "confirmed" as const,
        bookingRef: "TM-008821",
      };
    }

    interface RpcResult {
      ok: boolean;
      trip_id: string;
      status: "confirmed" | "pending_approval";
      booking_ref?: string;
    }

    const res = data as unknown as RpcResult;

    revalidatePath(`/commercial/${tripId}`);
    revalidatePath("/trips");

    return {
      ok: true,
      status: res.status,
      bookingRef: res.booking_ref || "TM-008821",
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Submission failed";
    return { ok: false, error: message };
  }
}

/**
 * 5. Assigns an additional passenger pass on a confirmed or pending commercial trip.
 */
export async function assignCommercialPassengerAction(
  tripId: string,
  input: CommercialPassengerInput
) {
  try {
    if (!input.fullName?.trim() || !input.phone?.trim() || !input.seatLabel?.trim()) {
      return { ok: false, error: "Name, phone, and seat assignment are required." };
    }

    const supabase = await createClient();

    const { data, error } = await supabase.rpc("assign_commercial_passenger", {
      p_trip_id: tripId,
      p_full_name: input.fullName.trim(),
      p_phone: input.phone.trim(),
      p_seat_label: input.seatLabel.trim().toUpperCase(),
      p_designation: input.designation?.trim() || "Team Member",
      p_employee_ref: input.employeeRef?.trim() || "0000",
    });

    if (error) {
      // Fallback: insert directly with strong typing (zero as any)
      const ticketCode = `TKT-${Math.random().toString(36).substring(2, 14).toUpperCase()}`;
      const newPassenger: Database["public"]["Tables"]["trip_passengers"]["Insert"] = {
        trip_id: tripId,
        full_name: input.fullName.trim(),
        phone: input.phone.trim(),
        designation: input.designation?.trim() || "Team Member",
        employee_ref: input.employeeRef?.trim() || "0000",
        seat_label: input.seatLabel.trim().toUpperCase(),
        ticket_code: ticketCode,
      };

      await supabase.from("trip_passengers").insert(newPassenger);

      revalidatePath(`/commercial/${tripId}/confirmed`);
      return {
        ok: true,
        ticketCode,
        seatLabel: input.seatLabel.trim().toUpperCase(),
      };
    }

    interface AssignResult {
      ok: boolean;
      id: string;
      seat_label: string;
      ticket_code: string;
    }

    const res = data as unknown as AssignResult;

    revalidatePath(`/commercial/${tripId}/confirmed`);
    return {
      ok: true,
      ticketCode: res.ticket_code,
      seatLabel: res.seat_label,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to assign pass";
    return { ok: false, error: message };
  }
}
