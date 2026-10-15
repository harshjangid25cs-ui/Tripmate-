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
} from "./types";

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

const INITIAL_DESTINATIONS: DestinationAdmin[] = [
  {
    id: "dest-jaipur",
    slug: "jaipur",
    name: "Jaipur",
    region: "Rajasthan",
    tagline: "The Pink City",
    description: "Royal palaces, formidable hill forts, vibrant bazaars, and opulent heritage hotels.",
    hero_image_path: "/images/jaipur-hero.jpg",
    starting_price: 8499,
    rating: 4.88,
    review_count: 1420,
    recommended_days: "3–4 Days",
    best_season: "Oct–Mar",
    badge: "Trending this week",
    categories: ["heritage", "popular", "weekend_getaways"],
    origin_label: "Delhi NCR",
    drive_hours: 6.5,
    drive_km: 270,
    is_featured: true,
    is_bookable: true,
    is_active: true,
    allow_car: true,
    allow_bike: true,
    vehicle_required: true,
    min_days: 2,
    max_days: 7,
    max_travellers: 10,
    highlights: [
      { id: "hl-1", destination_id: "dest-jaipur", title: "Amber Fort & Palace Tour", sort_order: 1 },
      { id: "hl-2", destination_id: "dest-jaipur", title: "Hawa Mahal & City Palace Walk", sort_order: 2 },
      { id: "hl-3", destination_id: "dest-jaipur", title: "Sunset at Nahargarh Fort", sort_order: 3 },
      { id: "hl-4", destination_id: "dest-jaipur", title: "Johri Bazaar Gem & Textile Walk", sort_order: 4 },
    ],
  },
  {
    id: "dest-udaipur",
    slug: "udaipur",
    name: "Udaipur",
    region: "Rajasthan",
    tagline: "City of Lakes",
    description: "Serene lakeside promenades, marble palace architecture, and stunning sunsets over Lake Pichola.",
    hero_image_path: "/images/udaipur-hero.jpg",
    starting_price: 12499,
    rating: 4.92,
    review_count: 980,
    recommended_days: "3–4 Days",
    best_season: "Sep–Mar",
    badge: "Romantic Choice",
    categories: ["heritage", "popular"],
    origin_label: "Delhi NCR",
    drive_hours: 11.5,
    drive_km: 660,
    is_featured: true,
    is_bookable: true,
    is_active: true,
    allow_car: true,
    allow_bike: false,
    vehicle_required: true,
    min_days: 3,
    max_days: 8,
    max_travellers: 8,
  },
  {
    id: "dest-munnar",
    slug: "munnar",
    name: "Munnar",
    region: "Kerala",
    tagline: "Misty Tea Highlands",
    description: "Endless rolling green tea plantations, cool mountain breeze, waterfalls, and spice trails.",
    hero_image_path: "/images/munnar-hero.jpg",
    starting_price: 9999,
    rating: 4.82,
    review_count: 730,
    recommended_days: "4–5 Days",
    best_season: "Sep–May",
    badge: null,
    categories: ["nature", "weekend_getaways"],
    origin_label: "Kochi",
    drive_hours: 4.0,
    drive_km: 130,
    is_featured: false,
    is_bookable: false, // Coming soon in seed
    is_active: true,
    allow_car: true,
    allow_bike: true,
    vehicle_required: false,
    min_days: 2,
    max_days: 6,
    max_travellers: 10,
  },
  {
    id: "dest-hampi",
    slug: "hampi",
    name: "Hampi",
    region: "Karnataka",
    tagline: "Boulders & Ruins of Vijayanagara",
    description: "UNESCO World Heritage site with monolithic monuments, riverside temple trails, and surreal landscapes.",
    hero_image_path: "/images/hampi-hero.jpg",
    starting_price: 7499,
    rating: 4.85,
    review_count: 512,
    recommended_days: "3–4 Days",
    best_season: "Nov–Feb",
    badge: null,
    categories: ["heritage", "hidden_gems"],
    origin_label: "Bengaluru",
    drive_hours: 6.5,
    drive_km: 340,
    is_featured: false,
    is_bookable: false,
    is_active: true,
    allow_car: true,
    allow_bike: true,
    vehicle_required: true,
    min_days: 2,
    max_days: 5,
    max_travellers: 8,
  },
];

const INITIAL_CIRCUITS: CircuitAdmin[] = [
  {
    id: "circ-1",
    destination_id: "dest-jaipur",
    destination_name: "Jaipur",
    title: "Jaipur Heritage & Forts Circuit",
    days: 3,
    nights: 2,
    base_price_per_person: 8499,
    rating: 4.9,
    badge: "Best Seller",
    categories: ["heritage", "popular"],
    summary: "Complete classic circuit covering royal havelis, Amber Fort, and authentic Rajasthani dining.",
    description: "An immersive 3-day royal journey designed for travelers who appreciate architectural heritage and boutique comfort.",
    image_url: "/images/jaipur-circuit-1.jpg",
    is_featured: true,
    is_active: true,
    allow_car: true,
    allow_bike: true,
    vehicle_required: true,
    hotel_ids: ["hotel-1", "hotel-2"],
    vehicle_ids: ["veh-1", "veh-2", "veh-3"],
    stop_ids: ["stop-1", "stop-2"],
  },
  {
    id: "circ-2",
    destination_id: "dest-jaipur",
    destination_name: "Jaipur",
    title: "Royal Rajputana Palaces Express",
    days: 4,
    nights: 3,
    base_price_per_person: 11499,
    rating: 4.85,
    badge: null,
    categories: ["heritage"],
    summary: "Extended stay with private museum tours, Chokhi Dhani cultural village, and stepwell exploration.",
    description: "Deeper exploration into Jaipur's hidden courtyards, artisan textile workshops, and Nahargarh astronomy.",
    image_url: "/images/jaipur-circuit-2.jpg",
    is_featured: false,
    is_active: true,
    allow_car: true,
    allow_bike: false,
    vehicle_required: true,
    hotel_ids: ["hotel-1", "hotel-3"],
    vehicle_ids: ["veh-1", "veh-2"],
    stop_ids: ["stop-1"],
  },
  {
    id: "circ-3",
    destination_id: "dest-udaipur",
    destination_name: "Udaipur",
    title: "Udaipur Lakeside Retreat",
    days: 3,
    nights: 2,
    base_price_per_person: 12499,
    rating: 4.95,
    badge: "Trending Alternative",
    categories: ["heritage", "popular"],
    summary: "Private boat safari on Lake Pichola, Bagore Ki Haveli folk dance, and Jagdish Temple.",
    description: "Romantic and peaceful lakeside escape with luxury boutique accommodation overlooking the illuminated ghats.",
    image_url: "/images/udaipur-circuit-1.jpg",
    is_featured: true,
    is_active: true,
    allow_car: true,
    allow_bike: false,
    vehicle_required: true,
    hotel_ids: [],
    vehicle_ids: ["veh-2"],
    stop_ids: [],
  },
];

const INITIAL_HOTELS: HotelAdmin[] = [
  {
    id: "hotel-1",
    destination_id: "dest-jaipur",
    destination_name: "Jaipur",
    name: "Shahpura Haveli & Heritage Suites",
    rating: 4.9,
    neighborhood: "Old City, Jaipur",
    distance_text: "2.5 km from City Palace",
    price_per_night: 4200,
    amenities: ["Rooftop Pool", "Free High-Speed Wi-Fi", "Royal Breakfast Included", "Spa & Wellness"],
    image_url: "/images/shahpura-haveli.jpg",
    badge: "Operator Pick",
    is_active: true,
  },
  {
    id: "hotel-2",
    destination_id: "dest-jaipur",
    destination_name: "Jaipur",
    name: "Diggi Palace Heritage Hotel",
    rating: 4.8,
    neighborhood: "C-Scheme, Jaipur",
    distance_text: "3.1 km from Hawa Mahal",
    price_per_night: 3600,
    amenities: ["Lush Courtyard Gardens", "Free Wi-Fi", "Swimming Pool", "Heritage Dining"],
    image_url: "/images/diggi-palace.jpg",
    badge: null,
    is_active: true,
  },
  {
    id: "hotel-3",
    destination_id: "dest-jaipur",
    destination_name: "Jaipur",
    name: "Alsisar Haveli",
    rating: 4.85,
    neighborhood: "Sansar Chandra Road",
    distance_text: "1.8 km from Jaipur Junction",
    price_per_night: 4800,
    amenities: ["Carved Marble Pool", "Cocktail Bar", "Free Wi-Fi", "Valet Parking"],
    image_url: "/images/alsisar-haveli.jpg",
    badge: "Luxury Heritage",
    is_active: true,
  },
];

const INITIAL_VEHICLES: VehicleAdmin[] = [
  {
    id: "veh-1",
    type: "car",
    name: "Maruti Suzuki Dzire",
    subtitle: "Compact Sedan · AC · Ideal for 2–3 Travellers",
    capacity: 4,
    luggage_capacity: 2,
    features: ["Air Conditioning", "Bluetooth Audio", "Commercial Permit", "Fastag Included"],
    fuel_policy: "Driver Provided · Fuel Included in Base",
    driver_type: "Professional Chauffeur",
    price_per_day: 2400,
    image_url: "/images/dzire.jpg",
    is_active: true,
  },
  {
    id: "veh-2",
    type: "car",
    name: "Toyota Innova Crysta",
    subtitle: "Premium SUV · Captain Seats · Ideal for Families",
    capacity: 6,
    luggage_capacity: 4,
    features: ["Dual-zone AC", "Leather Captain Seats", "Spacious Legroom", "USB Fast Chargers"],
    fuel_policy: "Driver Provided · Fuel Included in Base",
    driver_type: "Professional Chauffeur",
    price_per_day: 3900,
    image_url: "/images/innova.jpg",
    is_active: true,
  },
  {
    id: "veh-3",
    type: "bike",
    name: "Royal Enfield Classic 350",
    subtitle: "Thumper Cruiser · Self-Ride · Solo or Couple",
    capacity: 2,
    luggage_capacity: 1,
    features: ["Dual Disc ABS", "Pannier Mounts", "Twin Helmets Provided", "Crash Guards"],
    fuel_policy: "Self-Fuel · Security Deposit Required",
    driver_type: "Self-Ride",
    price_per_day: 1400,
    image_url: "/images/enfield.jpg",
    is_active: true,
  },
  {
    id: "veh-4",
    type: "bus",
    name: "Volvo 9600 Luxury Coach",
    subtitle: "Corporate Fleet · 45 Pushback Seats · Restroom Onboard",
    capacity: 45,
    luggage_capacity: 40,
    features: ["Air Suspension", "PA System", "Individual AC Vents", "Clean Restroom"],
    fuel_policy: "Commercial Chauffeur + Conductor Included",
    driver_type: "Heavy Commercial Crew",
    price_per_day: 38500,
    image_url: "/images/volvo-bus.jpg",
    is_active: true,
  },
  {
    id: "veh-5",
    type: "bus",
    name: "BharatBenz Executive Glider",
    subtitle: "Corporate Fleet · 32 Executive Leather Seats",
    capacity: 32,
    luggage_capacity: 28,
    features: ["Panoramic Windows", "LED Mood Lighting", "USB Ports on Every Seat"],
    fuel_policy: "Commercial Chauffeur Included",
    driver_type: "Heavy Commercial Crew",
    price_per_day: 28000,
    image_url: "/images/bharatbenz-bus.jpg",
    is_active: true,
  },
  {
    id: "veh-6",
    type: "bus",
    name: "Force Urbania Executive Mini",
    subtitle: "Executive Commuter · 17 Plush Recliner Seats",
    capacity: 17,
    luggage_capacity: 15,
    features: ["Individual AC", "High Roof Walk-in", "Smooth Monocoque Chassis"],
    fuel_policy: "Commercial Chauffeur Included",
    driver_type: "Heavy Commercial Crew",
    price_per_day: 18500,
    image_url: "/images/urbania-bus.jpg",
    is_active: true,
  },
];

const INITIAL_DRIVERS: DriverAdmin[] = [
  {
    id: "drv-1",
    name: "Rajesh Kumar",
    phone: "+91 98765 43210",
    license_plate: "DL 1Y AA 4088",
    rating: 4.96,
    is_active: true,
  },
  {
    id: "drv-2",
    name: "Harish Chandra",
    phone: "+91 98112 34567",
    license_plate: "RJ 14 TB 8821",
    rating: 4.89,
    is_active: true,
  },
  {
    id: "drv-3",
    name: "Vikramaditya Gurjar",
    phone: "+91 97234 56789",
    license_plate: "RJ 14 TA 1290",
    rating: 4.92,
    is_active: true,
  },
];

const INITIAL_STOPS: StopAdmin[] = [
  {
    id: "stop-1",
    destination_id: "dest-jaipur",
    destination_name: "Jaipur",
    name: "Neemrana Fort-Palace Buffet & Ramparts",
    price: 1850,
    pricing_unit: "per_person",
    distance_text: "122 km from Delhi on NH48",
    turnaround_text: "Direct entry ramp from highway",
    amenities: ["Gourmet Royal Buffet", "Stepwell Views", "Spotless Restrooms", "Zip-line Arena"],
    is_active: true,
  },
  {
    id: "stop-2",
    destination_id: "dest-jaipur",
    destination_name: "Jaipur",
    name: "Highway King Boutique & Food Court",
    price: 499,
    pricing_unit: "per_person",
    distance_text: "190 km from Delhi on NH48",
    turnaround_text: "Express service plaza with fuel",
    amenities: ["Clean Restrooms", "Artisan Chai Lounge", "Handloom Souvenirs", "EV Superchargers"],
    is_active: true,
  },
];

const INITIAL_COUPONS: Coupon[] = [
  {
    id: "cp-1",
    code: "EXPLOREINDIA",
    description: "Welcome road tripper discount (Auto-applied to standard bookings)",
    discount_type: "flat",
    value: 2000,
    max_discount: null,
    min_subtotal: 5000,
    valid_from: "2026-01-01T00:00:00Z",
    valid_to: "2026-12-31T23:59:59Z",
    usage_limit_total: null,
    usage_limit_per_user: 1,
    usage_count: 142,
    applies_to: "normal",
    destination_id: null,
    circuit_id: null,
    auto_apply: true,
    is_active: true,
    created_at: "2026-01-01T00:00:00Z",
  },
  {
    id: "cp-2",
    code: "FESTIVE25",
    description: "Diwali & Winter Festival Special (25% off up to ₹3,500)",
    discount_type: "percent",
    value: 25,
    max_discount: 3500,
    min_subtotal: 10000,
    valid_from: "2026-10-01T00:00:00Z",
    valid_to: "2026-11-30T23:59:59Z",
    usage_limit_total: 500,
    usage_limit_per_user: 1,
    usage_count: 89,
    applies_to: "normal",
    destination_id: null,
    circuit_id: null,
    auto_apply: false,
    is_active: true,
    created_at: "2026-10-01T00:00:00Z",
  },
  {
    id: "cp-3",
    code: "VIPCORP",
    description: "Commercial Fleet Executive rebate (Flat ₹5,000 for corporate bookings)",
    discount_type: "flat",
    value: 5000,
    max_discount: null,
    min_subtotal: 50000,
    valid_from: "2026-01-01T00:00:00Z",
    valid_to: null,
    usage_limit_total: 100,
    usage_limit_per_user: null,
    usage_count: 14,
    applies_to: "commercial",
    destination_id: null,
    circuit_id: null,
    auto_apply: false,
    is_active: true,
    created_at: "2026-02-15T00:00:00Z",
  },
];

const INITIAL_BOOKINGS: BookingAdmin[] = [
  {
    id: "trip-001",
    booking_ref: "TM-008821",
    user_id: "usr-1",
    customer_name: "Aarav Sharma",
    customer_email: "aarav.sharma@gmail.com",
    customer_phone: "+91 98200 12345",
    kind: "normal",
    destination_name: "Jaipur",
    circuit_name: "Jaipur Heritage & Forts Circuit",
    start_date: "2026-11-10",
    end_date: "2026-11-12",
    days: 3,
    traveler_count: 2,
    subtotal_amount: 24200,
    service_fee: 999,
    tax_amount: 4177,
    discount_amount: 2000,
    coupon_code: "EXPLOREINDIA",
    total_amount: 27376,
    status: "confirmed",
    driver: INITIAL_DRIVERS[0] ?? null,
    driver_id: INITIAL_DRIVERS[0]?.id ?? null,
    travellers: [
      {
        id: "pax-1",
        full_name: "Aarav Sharma",
        phone: "+91 98200 12345",
        seat_label: "1A",
        id_doc_type: "Aadhaar Card",
        id_doc_path: "usr-1/trip-001/pax-1.jpg",
        id_doc_status: "approved",
        ticket_revoked: false,
        ticket_code: "TKT-TM882101",
      },
      {
        id: "pax-2",
        full_name: "Ananya Sharma",
        phone: "+91 98200 12346",
        seat_label: "1B",
        id_doc_type: "Passport",
        id_doc_path: "usr-1/trip-001/pax-2.jpg",
        id_doc_status: "approved",
        ticket_revoked: false,
        ticket_code: "TKT-TM882102",
      },
    ],
    notes: [
      {
        id: "nt-1",
        trip_id: "trip-001",
        author_id: "admin-3",
        author_name: "Devendra Rathore",
        note: "Customer requested child booster seat if possible. Driver Rajesh informed.",
        created_at: "2026-10-12T11:00:00Z",
      },
    ],
    created_at: "2026-10-10T14:22:10Z",
  },
  {
    id: "trip-002",
    booking_ref: "TM-009104",
    user_id: "usr-2",
    customer_name: "Meera Nair",
    customer_email: "meera.nair@outlook.com",
    customer_phone: "+91 99341 55210",
    kind: "normal",
    destination_name: "Jaipur",
    circuit_name: "Royal Rajputana Palaces Express",
    start_date: "2026-10-25",
    end_date: "2026-10-28",
    days: 4,
    traveler_count: 3,
    subtotal_amount: 38400,
    service_fee: 999,
    tax_amount: 6732,
    discount_amount: 2000,
    coupon_code: "EXPLOREINDIA",
    total_amount: 44131,
    status: "confirmed",
    driver: null,
    driver_id: null,
    travellers: [
      {
        id: "pax-3",
        full_name: "Meera Nair",
        phone: "+91 99341 55210",
        seat_label: "Front Left",
        id_doc_type: "Driving License",
        id_doc_path: "usr-2/trip-002/pax-3.png",
        id_doc_status: "pending",
        ticket_revoked: false,
        ticket_code: "TKT-TM910401",
      },
      {
        id: "pax-4",
        full_name: "Karan Nair",
        phone: "+91 99341 55211",
        seat_label: "Rear Right",
        id_doc_type: "Aadhaar Card",
        id_doc_path: "usr-2/trip-002/pax-4.jpg",
        id_doc_status: "pending",
        ticket_revoked: false,
        ticket_code: "TKT-TM910402",
      },
    ],
    notes: [],
    created_at: "2026-10-14T09:12:45Z",
  },
  {
    id: "trip-003",
    booking_ref: "TM-009412",
    user_id: "usr-3",
    customer_name: "Vikramaditya Oberoi",
    customer_email: "v.oberoi@acmetech.com",
    customer_phone: "+91 98101 99882",
    kind: "commercial",
    destination_name: "Jaipur",
    circuit_name: "Jaipur Heritage & Forts Circuit",
    start_date: "2026-11-20",
    end_date: "2026-11-24",
    days: 5,
    traveler_count: 28,
    subtotal_amount: 192500,
    service_fee: 0,
    tax_amount: 34650,
    discount_amount: 0,
    coupon_code: null,
    total_amount: 227150,
    status: "pending_approval",
    company_name: "Acme Tech Pvt Ltd",
    driver: null,
    driver_id: null,
    travellers: [
      {
        id: "pax-5",
        full_name: "Vikramaditya Oberoi",
        phone: "+91 98101 99882",
        seat_label: "1A",
        id_doc_type: "Voter ID",
        id_doc_path: "usr-3/trip-003/pax-5.jpg",
        id_doc_status: "pending",
        ticket_revoked: false,
        ticket_code: "TKT-TMCORP0412",
      },
    ],
    notes: [
      {
        id: "nt-2",
        trip_id: "trip-003",
        author_id: "admin-3",
        author_name: "Devendra Rathore",
        note: "Corporate annual retreat. Exceeds standard approval threshold of ₹1,50,000.",
        created_at: "2026-10-14T16:00:00Z",
      },
    ],
    created_at: "2026-10-14T15:30:20Z",
  },
];

const INITIAL_ID_REVIEWS: IdReviewItem[] = [
  {
    id: "rev-1",
    trip_id: "trip-002",
    passenger_id: "pax-3",
    booking_ref: "TM-009104",
    customer_name: "Meera Nair",
    customer_email: "meera.nair@outlook.com",
    passenger_name: "Meera Nair",
    doc_type: "Driving License",
    doc_url: "https://images.unsplash.com/photo-1544717305-2782549b5136?w=600&auto=format&fit=crop&q=80",
    status: "pending",
    submitted_at: "2026-10-14T09:15:00Z",
  },
  {
    id: "rev-2",
    trip_id: "trip-002",
    passenger_id: "pax-4",
    booking_ref: "TM-009104",
    customer_name: "Meera Nair",
    customer_email: "meera.nair@outlook.com",
    passenger_name: "Karan Nair",
    doc_type: "Aadhaar Card",
    doc_url: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600&auto=format&fit=crop&q=80",
    status: "pending",
    submitted_at: "2026-10-14T09:18:00Z",
  },
];

const INITIAL_USERS: UserAdmin[] = [
  {
    id: "usr-1",
    email: "aarav.sharma@gmail.com",
    full_name: "Aarav Sharma",
    phone: "+91 98200 12345",
    total_bookings: 3,
    total_spent: 78240,
    is_suspended: false,
    suspended_reason: null,
    suspended_at: null,
    created_at: "2026-06-15T12:00:00Z",
  },
  {
    id: "usr-2",
    email: "meera.nair@outlook.com",
    full_name: "Meera Nair",
    phone: "+91 99341 55210",
    total_bookings: 1,
    total_spent: 44131,
    is_suspended: false,
    suspended_reason: null,
    suspended_at: null,
    created_at: "2026-09-20T14:10:00Z",
  },
  {
    id: "usr-3",
    email: "v.oberoi@acmetech.com",
    full_name: "Vikramaditya Oberoi",
    phone: "+91 98101 99882",
    total_bookings: 2,
    total_spent: 312000,
    is_suspended: false,
    suspended_reason: null,
    suspended_at: null,
    created_at: "2026-07-01T08:30:00Z",
  },
  {
    id: "usr-4",
    email: "fraud.test@example.com",
    full_name: "Test Flagged User",
    phone: "+91 99999 00000",
    total_bookings: 0,
    total_spent: 0,
    is_suspended: true,
    suspended_reason: "Repeated chargeback threats and fraudulent identity upload attempts.",
    suspended_at: "2026-10-08T17:00:00Z",
    created_at: "2026-10-05T09:00:00Z",
  },
];

const INITIAL_COMPANIES: CompanyAdmin[] = [
  {
    id: "comp-1",
    name: "Acme Tech Pvt Ltd",
    gst_number: "07AAAAA0000A1Z5",
    is_active: true,
    approval_limit: 150000,
    member_count: 32,
    members: [
      {
        id: "mem-1",
        company_id: "comp-1",
        profile_id: "usr-3",
        full_name: "Vikramaditya Oberoi",
        email: "v.oberoi@acmetech.com",
        role: "admin",
        employee_id: "ACME-001",
        designation: "VP People & Culture",
      },
    ],
    created_at: "2026-05-10T10:00:00Z",
  },
  {
    id: "comp-2",
    name: "Infosprint Solutions LLP",
    gst_number: "29BBBBB1111B2Z4",
    is_active: true,
    approval_limit: 80000,
    member_count: 14,
    members: [],
    created_at: "2026-08-14T11:20:00Z",
  },
];

const INITIAL_EMAIL_LOGS: EmailLogEntry[] = [
  {
    id: "em-1",
    to_email: "aarav.sharma@gmail.com",
    template: "booking_updated",
    subject: "Driver Assigned for Trip TM-008821 to Jaipur",
    content: "Your driver Rajesh Kumar (+91 98765 43210, DL 1Y AA 4088) has been assigned to your booking.",
    related_booking_ref: "TM-008821",
    sent_by: "ops@tripmate.in",
    status: "sent",
    provider_message_id: "msg_9821381230",
    created_at: "2026-10-10T14:30:00Z",
  },
];

const INITIAL_PAYMENTS: PaymentInvoiceRecord[] = [
  {
    id: "pay-1",
    trip_id: "trip-001",
    booking_ref: "TM-008821",
    customer_name: "Aarav Sharma",
    invoice_number: "INV-2026-00412",
    amount: 27376,
    gst_amount: 4177,
    method: "demo_pay",
    status: "completed",
    itc_qualified: false,
    created_at: "2026-10-10T14:22:15Z",
  },
  {
    id: "pay-2",
    trip_id: "trip-002",
    booking_ref: "TM-009104",
    customer_name: "Meera Nair",
    invoice_number: "INV-2026-00413",
    amount: 44131,
    gst_amount: 6732,
    method: "upi",
    status: "completed",
    itc_qualified: false,
    created_at: "2026-10-14T09:12:50Z",
  },
];

const INITIAL_AUDIT_LOGS: AuditLogEntry[] = [
  {
    id: "aud-1",
    actor_id: "admin-1",
    actor_name: "Aaditya Singhania",
    actor_role: "super_admin",
    action: "create",
    entity_type: "coupon",
    entity_id: "cp-1",
    before: null,
    after: { code: "EXPLOREINDIA", value: 2000, discount_type: "flat", auto_apply: true },
    reason: "Seeded mandatory auto-apply demo coupon EXPLOREINDIA per DATABASE §11 & §7.",
    created_at: "2026-10-01T09:00:00Z",
  },
  {
    id: "aud-2",
    actor_id: "admin-3",
    actor_name: "Devendra Rathore",
    actor_role: "ops_manager",
    action: "assign_driver",
    entity_type: "booking",
    entity_id: "trip-001",
    before: { driver_id: null },
    after: { driver_id: "drv-1", driver_name: "Rajesh Kumar" },
    reason: "Assigned verified VIP driver for Jaipur Heritage route.",
    created_at: "2026-10-10T14:28:00Z",
  },
];

const STORAGE_KEY = "tripmate_admin_state_v1";

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
  admins: AdminUser[];
}

function loadState(): AdminState {
  if (typeof window === "undefined") {
    return {
      settings: INITIAL_APP_SETTINGS,
      pricing: INITIAL_PRICING_CONFIG,
      refundRules: INITIAL_REFUND_RULES,
      destinations: INITIAL_DESTINATIONS,
      circuits: INITIAL_CIRCUITS,
      hotels: INITIAL_HOTELS,
      vehicles: INITIAL_VEHICLES,
      drivers: INITIAL_DRIVERS,
      stops: INITIAL_STOPS,
      coupons: INITIAL_COUPONS,
      redemptions: [],
      bookings: INITIAL_BOOKINGS,
      idReviews: INITIAL_ID_REVIEWS,
      correctionRequests: [],
      users: INITIAL_USERS,
      companies: INITIAL_COMPANIES,
      emails: INITIAL_EMAIL_LOGS,
      payments: INITIAL_PAYMENTS,
      auditLogs: INITIAL_AUDIT_LOGS,
      admins: INITIAL_ADMINS,
    };
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return saveAndReturnDefault();
    const parsed = JSON.parse(raw) as Partial<AdminState>;
    return {
      settings: parsed.settings || INITIAL_APP_SETTINGS,
      pricing: parsed.pricing || INITIAL_PRICING_CONFIG,
      refundRules: parsed.refundRules || INITIAL_REFUND_RULES,
      destinations: parsed.destinations || INITIAL_DESTINATIONS,
      circuits: parsed.circuits || INITIAL_CIRCUITS,
      hotels: parsed.hotels || INITIAL_HOTELS,
      vehicles: parsed.vehicles || INITIAL_VEHICLES,
      drivers: parsed.drivers || INITIAL_DRIVERS,
      stops: parsed.stops || INITIAL_STOPS,
      coupons: parsed.coupons || INITIAL_COUPONS,
      redemptions: parsed.redemptions || [],
      bookings: parsed.bookings || INITIAL_BOOKINGS,
      idReviews: parsed.idReviews || INITIAL_ID_REVIEWS,
      correctionRequests: parsed.correctionRequests || [],
      users: parsed.users || INITIAL_USERS,
      companies: parsed.companies || INITIAL_COMPANIES,
      emails: parsed.emails || INITIAL_EMAIL_LOGS,
      payments: parsed.payments || INITIAL_PAYMENTS,
      auditLogs: parsed.auditLogs || INITIAL_AUDIT_LOGS,
      admins: parsed.admins || INITIAL_ADMINS,
    };
  } catch {
    return saveAndReturnDefault();
  }
}

function saveAndReturnDefault(): AdminState {
  const def: AdminState = {
    settings: INITIAL_APP_SETTINGS,
    pricing: INITIAL_PRICING_CONFIG,
    refundRules: INITIAL_REFUND_RULES,
    destinations: INITIAL_DESTINATIONS,
    circuits: INITIAL_CIRCUITS,
    hotels: INITIAL_HOTELS,
    vehicles: INITIAL_VEHICLES,
    drivers: INITIAL_DRIVERS,
    stops: INITIAL_STOPS,
    coupons: INITIAL_COUPONS,
    redemptions: [],
    bookings: INITIAL_BOOKINGS,
    idReviews: INITIAL_ID_REVIEWS,
    correctionRequests: [],
    users: INITIAL_USERS,
    companies: INITIAL_COMPANIES,
    emails: INITIAL_EMAIL_LOGS,
    payments: INITIAL_PAYMENTS,
    auditLogs: INITIAL_AUDIT_LOGS,
    admins: INITIAL_ADMINS,
  };
  saveState(def);
  return def;
}

function saveState(state: AdminState) {
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // storage quota or incognito
    }
  }
}

// Global in-memory cache
const currentState: AdminState = loadState();

export class AdminService {
  private static subscribers: Array<() => void> = [];

  static subscribe(fn: () => void) {
    this.subscribers.push(fn);
    return () => {
      this.subscribers = this.subscribers.filter((s) => s !== fn);
    };
  }

  private static notify() {
    saveState(currentState);
    for (const sub of this.subscribers) {
      sub();
    }
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
    return currentState.pricing;
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
    return currentState.coupons[idx];
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
