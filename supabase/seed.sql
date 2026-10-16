-- seed.sql — TripMate Fixed Catalog & Demo Data
-- Source of truth: DATABASE.md §8 (v3.4) & SCREENS.md
-- All image paths are NULL; fixed catalog values strictly match SCREENS.md

-- 1. PRICING CONFIG
INSERT INTO public.pricing_config (id, service_fee, gst_rate, demo_coupon_code, demo_coupon_discount)
VALUES (1, 999, 0.18, 'EXPLOREINDIA', 2000)
ON CONFLICT (id) DO UPDATE SET
  service_fee = EXCLUDED.service_fee,
  gst_rate = EXCLUDED.gst_rate,
  demo_coupon_code = EXCLUDED.demo_coupon_code,
  demo_coupon_discount = EXCLUDED.demo_coupon_discount;

-- 2. DESTINATIONS (Only Jaipur is_bookable=true in v1 per DECISIONS D7; 4 rows)
INSERT INTO public.destinations (
  id, slug, name, region, tagline, description, hero_image_path,
  starting_price, rating, review_count, recommended_days, best_season,
  badge, categories, origin_label, drive_hours, drive_km, is_featured, is_bookable, is_active
) VALUES
  (
    '11111111-1111-1111-1111-111111111111',
    'jaipur',
    'Jaipur',
    'Rajasthan',
    'The Pink City',
    'Palaces, bustling bazaars, and royal heritage in the heart of Rajasthan.',
    NULL,
    12499.00,
    4.80,
    3200,
    '3–4 Days',
    'Oct–Mar',
    'Trending this week',
    ARRAY['popular', 'heritage'],
    'Delhi NCR',
    6.5,
    270,
    true,
    true,
    true
  ),
  (
    '22222222-2222-2222-2222-222222222222',
    'udaipur',
    'Udaipur',
    'Rajasthan',
    'City of Lakes • Heritage Stays',
    NULL,
    NULL,
    14800.00,
    NULL,
    0,
    NULL,
    NULL,
    'High demand today',
    ARRAY['heritage', 'weekend_getaways'],
    'Delhi NCR',
    NULL,
    NULL,
    false,
    false,
    true
  ),
  (
    '33333333-3333-3333-3333-333333333333',
    'munnar',
    'Munnar',
    'Kerala',
    'Misty Tea Plantations • Nature Escape',
    NULL,
    NULL,
    9200.00,
    NULL,
    0,
    NULL,
    NULL,
    'Popular in Monsoon',
    ARRAY['nature', 'hidden_gems'],
    'Delhi NCR',
    NULL,
    NULL,
    false,
    false,
    true
  ),
  (
    '44444444-4444-4444-4444-444444444444',
    'hampi',
    'Hampi',
    'Karnataka',
    'Ancient Boulders & Temples • UNESCO site',
    NULL,
    NULL,
    7500.00,
    NULL,
    0,
    NULL,
    NULL,
    NULL,
    ARRAY['heritage', 'less_discovered'],
    'Delhi NCR',
    NULL,
    NULL,
    false,
    false,
    true
  )
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  region = EXCLUDED.region,
  tagline = EXCLUDED.tagline,
  description = EXCLUDED.description,
  starting_price = EXCLUDED.starting_price,
  rating = EXCLUDED.rating,
  review_count = EXCLUDED.review_count,
  recommended_days = EXCLUDED.recommended_days,
  best_season = EXCLUDED.best_season,
  badge = EXCLUDED.badge,
  categories = EXCLUDED.categories,
  origin_label = EXCLUDED.origin_label,
  drive_hours = EXCLUDED.drive_hours,
  drive_km = EXCLUDED.drive_km,
  is_bookable = EXCLUDED.is_bookable,
  is_featured = EXCLUDED.is_featured,
  is_active = EXCLUDED.is_active;

-- 3. DESTINATION HIGHLIGHTS (Jaipur 4 highlights with sort_order 1..4 per Screen 07)
INSERT INTO public.destination_highlights (
  id, destination_id, title, category, duration_text, badge, sort_order
) VALUES
  ('aaaa1111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'Hawa Mahal & Old City Walk', 'Heritage', '2.5 hrs', 'Must Visit', 1),
  ('aaaa2222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 'Amber Palace & Elephant Route', 'Iconic Fort', '4 hrs', 'Entry ticket', 2),
  ('aaaa3333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111', 'Nahargarh Sunset Point', 'Viewpoint & Cafe', '2 hrs', 'Golden Hour', 3),
  ('aaaa4444-4444-4444-4444-444444444444', '11111111-1111-1111-1111-111111111111', 'Johari Bazaar Textile & Gems', 'Local Market', '3 hrs', 'Local guide', 4)
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  category = EXCLUDED.category,
  duration_text = EXCLUDED.duration_text,
  badge = EXCLUDED.badge,
  sort_order = EXCLUDED.sort_order;

-- 4. CIRCUITS (5 rows: 4 Jaipur search results + 1 Udaipur alternative; exactly 2 featured per §8/v3.3)
INSERT INTO public.circuits (
  id, destination_id, title, days, nights, summary, description,
  base_price_per_person, rating, badge, categories, is_featured, image_path, is_active
) VALUES
  (
    'c1111111-1111-1111-1111-111111111111',
    '11111111-1111-1111-1111-111111111111',
    'Jaipur Heritage & Forts Circuit',
    4, 3,
    'Heritage Havelis & Cab',
    'Amber Palace sunrise, City Palace museum pass, private sedan & local culinary trail.',
    12499.00,
    4.90,
    'Trending this week',
    ARRAY['heritage'],
    true, -- is_featured = true (Trending Alternative)
    NULL,
    true
  ),
  (
    'c2222222-2222-2222-2222-222222222222',
    '11111111-1111-1111-1111-111111111111',
    'Amer & Nahargarh Valley Escape',
    3, 2,
    'Chauffeur SUV & Fort Villa',
    'Nahargarh sunset drinks, stepwell tour at Panna Meena Ka Kund & stargazing camp.',
    9800.00,
    4.80,
    'High demand for winter',
    ARRAY['heritage'],
    false,
    NULL,
    true
  ),
  (
    'c3333333-3333-3333-3333-333333333333',
    '11111111-1111-1111-1111-111111111111',
    'Royal Artisans & Bazaars',
    2, 1,
    'Artisan Masterclasses',
    'Private block printing studio, blue pottery studio access & guided evening food walk.',
    6450.00,
    4.95,
    'Handcrafted Experience',
    ARRAY['heritage'],
    false,
    NULL,
    true
  ),
  (
    'c4444444-4444-4444-4444-444444444444',
    '11111111-1111-1111-1111-111111111111',
    'Samode Palace Luxury Retreat',
    3, 2,
    'All-Inclusive Palace Stay',
    'Heritage luxury suite, candlelit courtyard dining & countryside desert drive.',
    21500.00,
    5.00,
    'Selling fast',
    ARRAY['heritage'],
    false,
    NULL,
    true
  ),
  (
    'c5555555-5555-5555-5555-555555555555',
    '22222222-2222-2222-2222-222222222222',
    'Udaipur Lakeside Retreat',
    4, 3,
    'Palaces & Sunset Cruises',
    NULL,
    12200.00,
    4.95,
    'Curated Luxe',
    ARRAY['heritage', 'weekend_getaways'],
    true, -- is_featured = true (Trending Alternative)
    NULL,
    true
  )
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  days = EXCLUDED.days,
  nights = EXCLUDED.nights,
  summary = EXCLUDED.summary,
  description = EXCLUDED.description,
  base_price_per_person = EXCLUDED.base_price_per_person,
  rating = EXCLUDED.rating,
  badge = EXCLUDED.badge,
  categories = EXCLUDED.categories,
  is_featured = EXCLUDED.is_featured,
  is_active = EXCLUDED.is_active;

-- 5. HOTELS (Jaipur heritage hotels; 3 rows per Screen 09)
INSERT INTO public.hotels (
  id, destination_id, name, description, rating, review_count, neighborhood,
  distance_text, badge, price_per_night, image_paths, amenities, is_active
) VALUES
  (
    'b1111111-1111-1111-1111-111111111111',
    '11111111-1111-1111-1111-111111111111',
    'Shahpura Haveli & Heritage Suites',
    NULL,
    4.80,
    840,
    'Bani Park',
    '1.8 km from center',
    'Only 2 rooms left',
    4200.00,
    '{}',
    ARRAY['Free Breakfast', 'Heritage Courtyard', 'Free WiFi'],
    true
  ),
  (
    'b2222222-2222-2222-2222-222222222222',
    '11111111-1111-1111-1111-111111111111',
    'Diggi Palace Heritage Hotel',
    NULL,
    4.70,
    1210,
    'C-Scheme',
    NULL,
    'Selling fast for Nov',
    3499.00,
    '{}',
    ARRAY['Palace Gardens', 'Outdoor Pool', 'Bar & Lounge'],
    true
  ),
  (
    'b3333333-3333-3333-3333-333333333333',
    '11111111-1111-1111-1111-111111111111',
    'Alsisar Haveli',
    NULL,
    4.90,
    620,
    'Sansar Chandra Road',
    NULL,
    'Top Rated Haveli',
    5800.00,
    '{}',
    ARRAY['Rooftop Dining', 'Royal Courtyard', 'Spa & Wellness'],
    true
  )
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  rating = EXCLUDED.rating,
  review_count = EXCLUDED.review_count,
  neighborhood = EXCLUDED.neighborhood,
  distance_text = EXCLUDED.distance_text,
  badge = EXCLUDED.badge,
  price_per_night = EXCLUDED.price_per_night,
  amenities = EXCLUDED.amenities,
  is_active = EXCLUDED.is_active;

-- 6. VEHICLES (Cars, Bikes, Buses; price is ALWAYS per day per D2; 6 rows per Screen 10 & Screen 19)
INSERT INTO public.vehicles (
  id, type, name, subtitle, description, capacity, luggage_capacity,
  features, fuel_policy, driver_type, rating, badge, price, image_path, is_active
) VALUES
  (
    'e1111111-1111-1111-1111-111111111111',
    'car',
    'Maruti Suzuki Dzire',
    'AC Sedan • Dedicated Commercial Fleet',
    NULL,
    4,
    2,
    ARRAY['4 Seater', '2 Bags', 'Climate Control', 'Pro Chauffeur'],
    'Fuel & toll taxes covered up to 300 km',
    'chauffeur',
    4.90,
    'High demand today',
    1899.00,
    NULL,
    true
  ),
  (
    'e2222222-2222-2222-2222-222222222222',
    'car',
    'Toyota Innova Crysta',
    'Premium SUV • Luxury Travel Group',
    NULL,
    6,
    4,
    ARRAY['6 Captain Seats', '4 Large Bags', 'On-board WiFi', 'Uniformed Driver'],
    'Intercity permit included • Mineral water on board',
    'chauffeur',
    4.96,
    'Only 3 vehicles left',
    3200.00,
    NULL,
    true
  ),
  (
    'e3333333-3333-3333-3333-333333333333',
    'bike',
    'Royal Enfield Classic 350',
    'Cruiser • Self-Drive Exploration',
    NULL,
    2,
    1,
    ARRAY['2 Helmets Provided', '24/7 Roadside Assist', 'Unlimited KM'],
    NULL,
    'self_drive',
    NULL,
    'Popular for solo trips',
    950.00,
    NULL,
    true
  ),
  (
    'e4444444-4444-4444-4444-444444444444',
    'bus',
    'Volvo 9600 Luxury Multi-Axle',
    '45 Seater AC Semi-Sleeper • BS6 Phase 2',
    NULL,
    45,
    40,
    ARRAY['High-Speed Wi-Fi', '220V Outlets', '135° Recline', 'Air Suspension'],
    'Driver & Fuel Included',
    'chauffeur',
    NULL,
    NULL,
    38500.00,
    NULL,
    true
  ),
  (
    'e5555555-5555-5555-5555-555555555555',
    'bus',
    'BharatBenz Executive Glider',
    '32 Seater AC Pushback • Ergonomic Cabin',
    NULL,
    32,
    28,
    ARRAY['Air Conditioned', 'Pushback Seats', 'Ample Legroom', 'Professional Chauffeur'],
    'Driver & Fuel Included',
    'chauffeur',
    NULL,
    'Standby Available',
    28000.00,
    NULL,
    true
  ),
  (
    'e6666666-6666-6666-6666-666666666666',
    'bus',
    'Force Urbania Executive Cruiser',
    '17 Seater Luxury Mini-Coach • Captain Chairs',
    NULL,
    17,
    15,
    ARRAY['Standalone Captain Chairs', 'High Roof Walk-through', 'Individual AC', 'Fast Transit'],
    'Driver & Fuel Included',
    'chauffeur',
    NULL,
    'Fast Transit',
    18500.00,
    NULL,
    true
  )
ON CONFLICT (id) DO UPDATE SET
  type = EXCLUDED.type,
  name = EXCLUDED.name,
  subtitle = EXCLUDED.subtitle,
  description = EXCLUDED.description,
  capacity = EXCLUDED.capacity,
  luggage_capacity = EXCLUDED.luggage_capacity,
  features = EXCLUDED.features,
  fuel_policy = EXCLUDED.fuel_policy,
  driver_type = EXCLUDED.driver_type,
  rating = EXCLUDED.rating,
  badge = EXCLUDED.badge,
  price = EXCLUDED.price,
  is_active = EXCLUDED.is_active;

-- 7. MID-JOURNEY STOPS (2 rows per Screen 11)
INSERT INTO public.stops (
  id, destination_id, name, description, location_text, distance_text,
  amenities, badge, turnaround_text, image_path, price, pricing_unit, is_active
) VALUES
  (
    'f1111111-1111-1111-1111-111111111111',
    '11111111-1111-1111-1111-111111111111',
    'Neemrana Fort-Palace',
    NULL,
    'NH48, Neemrana, Rajasthan',
    '122 km from Delhi (Approx. 2.5 hrs mark) • Highway direct access',
    ARRAY['Clean Washrooms', 'Royal Buffet', 'EV Fast Charger', 'Day Pass or Overnight'],
    'Heritage Landmark',
    NULL,
    NULL,
    1850.00,
    'per_person',
    true
  ),
  (
    'f2222222-2222-2222-2222-222222222222',
    '11111111-1111-1111-1111-111111111111',
    'Highway King Boutique & Food Court',
    NULL,
    'NH48 Express Bay',
    '158 km from Delhi (Approx. 3.2 hrs mark) • NH48 Express Bay',
    ARRAY['Express Gourmet Dining', 'Kids Play Area', 'Premium AC Lounge'],
    'Verified Hygienic',
    'Quick 45m Turnaround',
    NULL,
    499.00,
    'per_person',
    true
  )
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  location_text = EXCLUDED.location_text,
  distance_text = EXCLUDED.distance_text,
  amenities = EXCLUDED.amenities,
  badge = EXCLUDED.badge,
  turnaround_text = EXCLUDED.turnaround_text,
  price = EXCLUDED.price,
  pricing_unit = EXCLUDED.pricing_unit,
  is_active = EXCLUDED.is_active;

-- 8. DRIVERS (Verified Rajasthan Fleet Operators per Screen 13 & 14)
INSERT INTO public.drivers (
  id, full_name, phone, plate_number, rating, trips_count, is_active
) VALUES
  (
    'd1111111-1111-1111-1111-111111111111',
    'Rajesh Kumar',
    '+91 98765 43210',
    'RJ 14 TA 4088',
    4.96,
    180,
    true
  ),
  (
    'd2222222-2222-2222-2222-222222222222',
    'Vikram Singh Rathore',
    '+91 98290 12345',
    'RJ 14 PA 8821',
    4.92,
    245,
    true
  ),
  (
    'd3333333-3333-3333-3333-333333333333',
    'Mahendra Gurjar',
    '+91 94140 67890',
    'RJ 27 UA 3190',
    4.88,
    140,
    true
  ),
  (
    'd4444444-4444-4444-4444-444444444444',
    'Suresh Meena',
    '+91 97840 54321',
    'RJ 14 TA 7762',
    4.95,
    310,
    true
  )
ON CONFLICT (id) DO UPDATE SET
  full_name = EXCLUDED.full_name,
  phone = EXCLUDED.phone,
  plate_number = EXCLUDED.plate_number,
  rating = EXCLUDED.rating,
  trips_count = EXCLUDED.trips_count,
  is_active = EXCLUDED.is_active;

-- 9. DEMO COMPANY (Acme Tech Pvt Ltd — no approval policy)
INSERT INTO public.companies (
  id, name, gst_number
) VALUES
  (
    '00000000-0000-0000-0000-000000000001',
    'Acme Tech Pvt Ltd',
    '08AAACA1234A1Z5'
  )
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  gst_number = EXCLUDED.gst_number;
