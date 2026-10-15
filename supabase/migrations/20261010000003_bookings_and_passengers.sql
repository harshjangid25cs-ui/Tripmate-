-- Migration 3: Bookings, child items, passengers, commercial bookings, itinerary items
-- Source of truth: DATABASE.md §3

-- Table: trips (U)
CREATE TABLE IF NOT EXISTS public.trips (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_ref text NOT NULL UNIQUE DEFAULT ('TM-' || lpad(nextval('booking_ref_seq')::text, 6, '0')),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES public.profiles(id) ON DELETE RESTRICT,
  booking_kind text NOT NULL CHECK (booking_kind IN ('normal', 'commercial')),
  group_type text CHECK (group_type IN ('family', 'solo', 'other')),
  title text,
  destination_id uuid REFERENCES public.destinations(id) ON DELETE RESTRICT,
  circuit_id uuid REFERENCES public.circuits(id) ON DELETE SET NULL,
  from_location text,
  to_location text,
  start_date date,
  end_date date,
  total_days integer GENERATED ALWAYS AS (end_date - start_date + 1) STORED,
  traveler_count integer NOT NULL DEFAULT 1 CHECK (traveler_count >= 1 AND traveler_count <= 120),
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'pending_approval', 'confirmed', 'cancelled')),
  subtotal_amount numeric(12,2) NOT NULL DEFAULT 0 CHECK (subtotal_amount >= 0),
  service_fee numeric(12,2) NOT NULL DEFAULT 0 CHECK (service_fee >= 0),
  tax_amount numeric(12,2) NOT NULL DEFAULT 0 CHECK (tax_amount >= 0),
  discount_amount numeric(12,2) NOT NULL DEFAULT 0 CHECK (discount_amount >= 0),
  coupon_code text,
  total_amount numeric(12,2) NOT NULL DEFAULT 0 CHECK (total_amount >= 0),
  currency text NOT NULL DEFAULT 'INR',
  confirmed_at timestamptz,
  cancelled_at timestamptz,
  cancellation_reason text,
  refund_amount numeric(12,2) CHECK (refund_amount IS NULL OR refund_amount >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT check_normal_group_type CHECK (booking_kind <> 'normal' OR group_type IS NOT NULL),
  CONSTRAINT check_trip_dates CHECK (end_date IS NULL OR start_date IS NULL OR end_date >= start_date)
);

CREATE TRIGGER trg_trips_updated_at
  BEFORE UPDATE ON public.trips
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

-- Table: trip_hotels (one hotel per trip)
CREATE TABLE IF NOT EXISTS public.trip_hotels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid NOT NULL UNIQUE REFERENCES public.trips(id) ON DELETE CASCADE,
  hotel_id uuid NOT NULL REFERENCES public.hotels(id) ON DELETE RESTRICT,
  rooms integer NOT NULL DEFAULT 1 CHECK (rooms >= 1),
  check_in date NOT NULL,
  check_out date NOT NULL,
  unit_price numeric(12,2) NOT NULL CHECK (unit_price >= 0),
  subtotal numeric(12,2) NOT NULL CHECK (subtotal >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT check_hotel_stay CHECK (check_out > check_in)
);

-- Table: trip_vehicles (one vehicle row per trip)
CREATE TABLE IF NOT EXISTS public.trip_vehicles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid NOT NULL UNIQUE REFERENCES public.trips(id) ON DELETE CASCADE,
  vehicle_id uuid NOT NULL REFERENCES public.vehicles(id) ON DELETE RESTRICT,
  quantity integer NOT NULL DEFAULT 1 CHECK (quantity >= 1),
  days integer NOT NULL CHECK (days >= 1),
  unit_price numeric(12,2) NOT NULL CHECK (unit_price >= 0),
  subtotal numeric(12,2) NOT NULL CHECK (subtotal >= 0),
  driver_id uuid REFERENCES public.drivers(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Table: trip_stops
CREATE TABLE IF NOT EXISTS public.trip_stops (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  stop_id uuid NOT NULL REFERENCES public.stops(id) ON DELETE RESTRICT,
  day_number integer NOT NULL DEFAULT 1 CHECK (day_number >= 1),
  sort_order integer NOT NULL DEFAULT 0,
  unit_price numeric(12,2) NOT NULL CHECK (unit_price >= 0),
  subtotal numeric(12,2) NOT NULL CHECK (subtotal >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (trip_id, stop_id)
);

-- Table: trip_passengers
CREATE TABLE IF NOT EXISTS public.trip_passengers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  is_lead boolean NOT NULL DEFAULT false,
  full_name text NOT NULL,
  phone text,
  designation text,
  employee_ref text,
  id_doc_type text CHECK (id_doc_type IN ('aadhaar', 'passport', 'driving_licence', 'voter_id')),
  id_doc_path text,
  seat_label text,
  ticket_code text UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Partial unique index: no two passengers in the same trip can share a seat_label
CREATE UNIQUE INDEX IF NOT EXISTS idx_trip_passengers_seat
  ON public.trip_passengers (trip_id, seat_label)
  WHERE seat_label IS NOT NULL;

-- Table: commercial_bookings (U)
CREATE TABLE IF NOT EXISTS public.commercial_bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid NOT NULL UNIQUE REFERENCES public.trips(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE RESTRICT,
  booking_time time,
  trip_purpose text,
  policy_id uuid REFERENCES public.policies(id) ON DELETE SET NULL,
  approval_status text NOT NULL DEFAULT 'not_required' CHECK (approval_status IN ('not_required', 'pending', 'approved', 'rejected')),
  reviewed_by uuid REFERENCES public.profiles(id),
  reviewed_at timestamptz,
  review_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_commercial_bookings_updated_at
  BEFORE UPDATE ON public.commercial_bookings
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

-- Table: itinerary_items (normal trips only)
CREATE TABLE IF NOT EXISTS public.itinerary_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  day_number integer NOT NULL CHECK (day_number >= 1),
  sort_order integer NOT NULL DEFAULT 0,
  item_type text NOT NULL CHECK (item_type IN ('hotel', 'vehicle', 'stop', 'activity', 'note')),
  title text NOT NULL,
  description text,
  start_time time,
  trip_hotel_id uuid REFERENCES public.trip_hotels(id) ON DELETE SET NULL,
  trip_vehicle_id uuid REFERENCES public.trip_vehicles(id) ON DELETE SET NULL,
  trip_stop_id uuid REFERENCES public.trip_stops(id) ON DELETE SET NULL,
  highlight_id uuid REFERENCES public.destination_highlights(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
