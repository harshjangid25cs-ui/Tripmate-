import type {
  AdminBooking,
  AdminTrip,
  AdminApproval,
  DriverAdmin,
  TravellerAdmin,
} from "./types";

export type DbRecord = Record<string, unknown>;

export function asRecord(val: unknown): DbRecord {
  return val && typeof val === "object" ? (val as DbRecord) : {};
}

/**
 * Maps a Supabase `trips` record (with joined relations) to `AdminBooking` (`BookingAdmin`).
 */
export function mapDatabaseTripToAdminBooking(t: DbRecord): AdminBooking {
  const profile = asRecord(t.profiles);
  const destination = asRecord(t.destinations);
  const circuit = asRecord(t.circuits);
  const tripVehicle = Array.isArray(t.trip_vehicles) ? asRecord(t.trip_vehicles[0]) : asRecord(t.trip_vehicles);
  const driver = asRecord(tripVehicle.drivers);
  const commercial = Array.isArray(t.commercial_bookings) ? asRecord(t.commercial_bookings[0]) : asRecord(t.commercial_bookings);
  const company = asRecord(commercial.companies);

  const rawPassengers = Array.isArray(t.trip_passengers) ? t.trip_passengers : [];
  const travellers: TravellerAdmin[] = rawPassengers.map((item: unknown) => {
    const pax = asRecord(item);
    return {
      id: String(pax.id || `pax-${Math.random().toString(36).substring(2, 7)}`),
      full_name: String(pax.full_name || "Traveller"),
      phone: String(pax.phone || ""),
      seat_label: pax.seat_label ? String(pax.seat_label) : undefined,
      id_doc_type: pax.id_doc_type ? String(pax.id_doc_type) : undefined,
      id_doc_path: pax.id_doc_path ? String(pax.id_doc_path) : undefined,
      id_doc_status: (pax.id_doc_path ? "pending" : "not_provided") as TravellerAdmin["id_doc_status"],
      ticket_revoked: false,
      ticket_code: pax.ticket_code ? String(pax.ticket_code) : undefined,
    };
  });

  const driverAdmin: DriverAdmin | null = driver.id
    ? {
        id: String(driver.id),
        name: String(driver.full_name || driver.name || "Assigned Driver"),
        phone: String(driver.phone || ""),
        license_plate: String(driver.plate_number || driver.license_plate || "DL 1Y AA 4088"),
        rating: Number(driver.rating) || 4.8,
        is_active: Boolean(driver.is_active ?? true),
      }
    : null;

  return {
    id: String(t.id || ""),
    booking_ref: String(t.booking_ref || `TM-${String(t.id || "000000").slice(0, 6)}`),
    user_id: String(t.user_id || ""),
    customer_name: String(profile.full_name || "Guest Traveler"),
    customer_email: String(profile.email || ""),
    customer_phone: String(profile.phone || ""),
    kind: t.booking_kind === "commercial" ? "commercial" : "normal",
    destination_name: String(destination.name || "Jaipur"),
    circuit_name: circuit.title ? String(circuit.title) : undefined,
    start_date: t.start_date ? String(t.start_date) : "",
    end_date: t.end_date ? String(t.end_date) : "",
    days: Number(t.total_days) || 1,
    traveler_count: Number(t.traveler_count) || (travellers.length > 0 ? travellers.length : 1),
    subtotal_amount: Number(t.subtotal_amount) || 0,
    service_fee: Number(t.service_fee) || 0,
    tax_amount: Number(t.tax_amount) || 0,
    discount_amount: Number(t.discount_amount) || 0,
    coupon_code: t.coupon_code ? String(t.coupon_code) : null,
    total_amount: Number(t.total_amount) || 0,
    status: (t.status || "draft") as AdminBooking["status"],
    refund_amount: t.refund_amount !== null && t.refund_amount !== undefined ? Number(t.refund_amount) : undefined,
    company_name: company.name ? String(company.name) : t.company_name ? String(t.company_name) : undefined,
    driver: driverAdmin,
    driver_id: tripVehicle.driver_id ? String(tripVehicle.driver_id) : null,
    travellers,
    notes: [],
    created_at: t.created_at ? String(t.created_at) : new Date().toISOString(),
  };
}

/**
 * Maps a Supabase `commercial_bookings` row to `AdminApproval` (`CommercialApprovalItem`).
 */
export function mapDatabaseCommercialToAdminApproval(c: DbRecord): AdminApproval {
  const trip = asRecord(c.trips);
  const company = asRecord(c.companies);
  const profile = asRecord(trip.profiles || c.profiles);
  const destination = asRecord(trip.destinations);
  const tripVehicle = Array.isArray(trip.trip_vehicles) ? asRecord(trip.trip_vehicles[0]) : asRecord(trip.trip_vehicles);
  const vehicle = asRecord(tripVehicle.vehicles);

  let dates = "";
  if (trip.start_date && trip.end_date) {
    dates = `${trip.start_date} to ${trip.end_date}`;
  } else if (c.dates) {
    dates = String(c.dates);
  }

  const rawStatus = String(c.approval_status || trip.status || "pending");
  const status: AdminApproval["status"] =
    rawStatus === "pending" || rawStatus === "pending_approval"
      ? "pending_approval"
      : rawStatus === "approved"
      ? "approved"
      : "rejected";

  return {
    id: String(c.id || `appr-${String(trip.id || Math.random().toString(36).substring(2, 7))}`),
    trip_id: String(c.trip_id || trip.id || ""),
    company_id: String(c.company_id || company.id || "comp-1"),
    company_name: String(company.name || c.company_name || "Corporate Fleet Client"),
    gst_number: String(company.gst_number || c.gst_number || "07AAAAA0000A1Z5"),
    booker_name: String(profile.full_name || c.booker_name || "Commercial Booker"),
    booker_email: String(profile.email || c.booker_email || ""),
    destination_name: String(destination.name || c.destination_name || "Corporate Destination"),
    dates,
    passenger_count: Number(trip.traveler_count || c.passenger_count || 1),
    vehicle_name: String(vehicle.name || c.vehicle_name || "Volvo 9600 Luxury Coach"),
    total_amount: Number(trip.total_amount || c.total_amount || 0),
    approval_limit: Number(c.approval_limit || 150000),
    status,
    note: c.review_note ? String(c.review_note) : c.note ? String(c.note) : undefined,
    requested_at: c.created_at ? String(c.created_at) : new Date().toISOString(),
  };
}

/**
 * Maps a Supabase `circuits` row to `AdminTrip` (`CircuitAdmin`).
 */
export function mapDatabaseCircuitToAdminTrip(c: DbRecord): AdminTrip {
  const destination = asRecord(c.destinations);
  const destName = String(destination.name || c.destination_name || "Custom");
  return {
    id: String(c.id || ""),
    destination_id: String(c.destination_id || ""),
    destination_name: destName,
    title: String(c.title || "Custom Circuit"),
    days: Number(c.days) || 3,
    nights: Number(c.nights) || Math.max(1, (Number(c.days) || 3) - 1),
    base_price_per_person: Number(c.base_price_per_person) || 5000,
    rating: Number(c.rating) || 4.8,
    badge: c.badge ? String(c.badge) : null,
    categories: Array.isArray(c.categories) ? (c.categories as string[]) : ["heritage"],
    summary: String(c.summary || ""),
    description: String(c.description || ""),
    image_url: String(c.image_path || c.image_url || "/images/placeholder.jpg"),
    is_featured: Boolean(c.is_featured),
    is_active: Boolean(c.is_active),
    allow_car: c.allow_car !== undefined ? Boolean(c.allow_car) : true,
    allow_bike: c.allow_bike !== undefined ? Boolean(c.allow_bike) : false,
    vehicle_required: c.vehicle_required !== undefined ? Boolean(c.vehicle_required) : true,
    hotel_ids: Array.isArray(c.hotel_ids) ? (c.hotel_ids as string[]) : [],
    vehicle_ids: Array.isArray(c.vehicle_ids) ? (c.vehicle_ids as string[]) : [],
    stop_ids: Array.isArray(c.stop_ids) ? (c.stop_ids as string[]) : [],
  };
}
