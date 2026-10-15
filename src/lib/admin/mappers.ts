import type {
  AdminBooking,
  AdminTrip,
  AdminApproval,
  AdminVehicle,
  AdminDriver,
  AdminHotel,
  AdminStop,
  AdminDestination,
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

/**
 * Maps a Supabase `vehicles` row to `AdminVehicle` (`VehicleAdmin`).
 */
export function mapDatabaseVehicleToAdminVehicle(v: DbRecord): AdminVehicle {
  return {
    id: String(v.id || ""),
    type: (v.type || "car") as "car" | "bike" | "bus",
    name: String(v.name || "Fleet Vehicle"),
    subtitle: String(v.subtitle || ""),
    capacity: Number(v.capacity) || 4,
    luggage_capacity: Number(v.luggage_capacity) || 2,
    features: Array.isArray(v.features) ? (v.features as string[]) : ["Air Conditioning", "Commercial Permit"],
    fuel_policy: String(v.fuel_policy || "Driver Provided · Fuel Included"),
    driver_type: String(v.driver_type || "Professional Chauffeur"),
    price_per_day: Number(v.price_per_day || v.price) || 3000,
    image_url: String(v.image_path || v.image_url || "/images/placeholder.jpg"),
    is_active: Boolean(v.is_active ?? true),
  };
}

/**
 * Maps a Supabase `drivers` row to `AdminDriver` (`DriverAdmin`).
 */
export function mapDatabaseDriverToAdminDriver(d: DbRecord): AdminDriver {
  return {
    id: String(d.id || ""),
    name: String(d.full_name || d.name || "Driver"),
    phone: String(d.phone || ""),
    license_plate: String(d.plate_number || d.license_plate || "DL 1Y AA 4088"),
    rating: Number(d.rating) || 4.9,
    is_active: Boolean(d.is_active ?? true),
  };
}

/**
 * Maps a Supabase `hotels` row to `AdminHotel` (`HotelAdmin`).
 */
export function mapDatabaseHotelToAdminHotel(h: DbRecord): AdminHotel {
  const destination = asRecord(h.destinations);
  const destName = String(destination.name || h.destination_name || "Jaipur");
  let img = "/images/placeholder.jpg";
  if (Array.isArray(h.image_paths) && h.image_paths[0]) {
    img = String(h.image_paths[0]);
  } else if (h.image_url) {
    img = String(h.image_url);
  }

  return {
    id: String(h.id || ""),
    destination_id: String(h.destination_id || ""),
    destination_name: destName,
    name: String(h.name || "Hotel"),
    rating: Number(h.rating) || 4.8,
    neighborhood: String(h.neighborhood || ""),
    distance_text: String(h.distance_text || ""),
    price_per_night: Number(h.price_per_night) || 3500,
    amenities: Array.isArray(h.amenities) ? (h.amenities as string[]) : ["Free Wi-Fi", "Swimming Pool"],
    image_url: img,
    badge: h.badge ? String(h.badge) : null,
    is_active: Boolean(h.is_active ?? true),
  };
}

/**
 * Maps a Supabase `stops` row to `AdminStop` (`StopAdmin`).
 */
export function mapDatabaseStopToAdminStop(s: DbRecord): AdminStop {
  const destination = asRecord(s.destinations);
  return {
    id: String(s.id || ""),
    destination_id: String(s.destination_id || ""),
    destination_name: String(destination.name || s.destination_name || ""),
    name: String(s.name || "Highway Stop"),
    price: Number(s.price) || 0,
    pricing_unit: (s.pricing_unit || "per_person") as "per_person" | "flat",
    distance_text: String(s.distance_text || ""),
    turnaround_text: String(s.turnaround_text || ""),
    amenities: Array.isArray(s.amenities) ? (s.amenities as string[]) : ["Clean Restrooms", "Artisan Chai"],
    is_active: Boolean(s.is_active ?? true),
  };
}

/**
 * Maps a Supabase `destinations` row to `AdminDestination` (`DestinationAdmin`).
 */
export function mapDatabaseDestinationToAdminDestination(d: DbRecord): AdminDestination {
  return {
    id: String(d.id || ""),
    slug: String(d.slug || ""),
    name: String(d.name || ""),
    region: String(d.region || ""),
    tagline: String(d.tagline || ""),
    description: String(d.description || ""),
    hero_image_path: d.hero_image_path ? String(d.hero_image_path) : null,
    starting_price: d.starting_price !== null && d.starting_price !== undefined ? Number(d.starting_price) : 5000,
    rating: d.rating !== null && d.rating !== undefined ? Number(d.rating) : 4.8,
    review_count: Number(d.review_count) || 0,
    recommended_days: String(d.recommended_days || "3-4 Days"),
    best_season: String(d.best_season || "Oct - Mar"),
    badge: d.badge ? String(d.badge) : null,
    categories: Array.isArray(d.categories) ? (d.categories as string[]) : ["popular"],
    origin_label: String(d.origin_label || "Delhi NCR"),
    drive_hours: d.drive_hours !== null && d.drive_hours !== undefined ? Number(d.drive_hours) : null,
    drive_km: d.drive_km !== null && d.drive_km !== undefined ? Number(d.drive_km) : null,
    is_featured: Boolean(d.is_featured),
    is_bookable: Boolean(d.is_bookable ?? true),
    is_active: Boolean(d.is_active ?? true),
    allow_car: true,
    allow_bike: false,
    vehicle_required: true,
    min_days: 2,
    max_days: 7,
    max_travellers: 20,
  };
}
