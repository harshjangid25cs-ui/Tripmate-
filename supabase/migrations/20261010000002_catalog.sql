-- Migration 2: Catalog tables (destinations, highlights, circuits, hotels, vehicles, stops, drivers)
-- Source of truth: DATABASE.md §2

-- Table: destinations (U)
CREATE TABLE IF NOT EXISTS public.destinations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  region text,
  tagline text,
  description text,
  hero_image_path text,
  starting_price numeric(12,2) CHECK (starting_price >= 0),
  rating numeric(3,2) CHECK (rating BETWEEN 0 AND 5),
  review_count integer NOT NULL DEFAULT 0 CHECK (review_count >= 0),
  recommended_days text,
  best_season text,
  badge text,
  categories text[] NOT NULL DEFAULT '{}' CHECK (categories <@ ARRAY['popular','hidden_gems','less_discovered','nature','heritage','weekend_getaways']::text[]),
  origin_label text DEFAULT 'Delhi NCR',
  drive_hours numeric(3,1) CHECK (drive_hours >= 0),
  drive_km integer CHECK (drive_km >= 0),
  is_featured boolean NOT NULL DEFAULT false,
  is_bookable boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_destinations_updated_at
  BEFORE UPDATE ON public.destinations
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

-- Table: destination_highlights
CREATE TABLE IF NOT EXISTS public.destination_highlights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  destination_id uuid NOT NULL REFERENCES public.destinations(id) ON DELETE CASCADE,
  title text NOT NULL,
  category text,
  duration_text text,
  badge text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Table: circuits (U)
CREATE TABLE IF NOT EXISTS public.circuits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  destination_id uuid NOT NULL REFERENCES public.destinations(id) ON DELETE RESTRICT,
  title text NOT NULL,
  days integer NOT NULL CHECK (days >= 1),
  nights integer NOT NULL CHECK (nights = days - 1),
  summary text,
  description text,
  base_price_per_person numeric(12,2) NOT NULL CHECK (base_price_per_person >= 0),
  rating numeric(3,2) CHECK (rating BETWEEN 0 AND 5),
  badge text,
  categories text[] NOT NULL DEFAULT '{}' CHECK (categories <@ ARRAY['popular','hidden_gems','less_discovered','nature','heritage','weekend_getaways']::text[]),
  is_featured boolean NOT NULL DEFAULT false,
  image_path text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_circuits_updated_at
  BEFORE UPDATE ON public.circuits
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

-- Table: hotels (U)
CREATE TABLE IF NOT EXISTS public.hotels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  destination_id uuid NOT NULL REFERENCES public.destinations(id) ON DELETE RESTRICT,
  name text NOT NULL,
  description text,
  rating numeric(3,2) CHECK (rating BETWEEN 0 AND 5),
  review_count integer NOT NULL DEFAULT 0 CHECK (review_count >= 0),
  neighborhood text,
  distance_text text,
  badge text,
  price_per_night numeric(12,2) NOT NULL CHECK (price_per_night >= 0),
  image_paths text[] NOT NULL DEFAULT '{}',
  amenities text[] NOT NULL DEFAULT '{}',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_hotels_updated_at
  BEFORE UPDATE ON public.hotels
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

-- Table: vehicles (U)
CREATE TABLE IF NOT EXISTS public.vehicles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL CHECK (type IN ('car', 'bike', 'bus')),
  name text NOT NULL,
  subtitle text,
  description text,
  capacity integer CHECK (capacity >= 1),
  luggage_capacity integer CHECK (luggage_capacity >= 0),
  features text[] NOT NULL DEFAULT '{}',
  fuel_policy text,
  driver_type text CHECK (driver_type IN ('chauffeur', 'self_drive')),
  rating numeric(3,2) CHECK (rating BETWEEN 0 AND 5),
  badge text,
  price numeric(12,2) NOT NULL CHECK (price >= 0),
  image_path text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT check_bus_capacity CHECK (type <> 'bus' OR capacity IS NOT NULL)
);

CREATE TRIGGER trg_vehicles_updated_at
  BEFORE UPDATE ON public.vehicles
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

-- Table: stops (U)
CREATE TABLE IF NOT EXISTS public.stops (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  destination_id uuid REFERENCES public.destinations(id) ON DELETE SET NULL,
  name text NOT NULL,
  description text,
  location_text text,
  distance_text text,
  amenities text[] NOT NULL DEFAULT '{}',
  badge text,
  turnaround_text text,
  image_path text,
  price numeric(12,2) NOT NULL DEFAULT 0 CHECK (price >= 0),
  pricing_unit text NOT NULL DEFAULT 'per_person' CHECK (pricing_unit IN ('per_person', 'flat')),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_stops_updated_at
  BEFORE UPDATE ON public.stops
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

-- Table: drivers (seeded)
CREATE TABLE IF NOT EXISTS public.drivers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  phone text NOT NULL,
  plate_number text NOT NULL,
  rating numeric(3,2) CHECK (rating BETWEEN 0 AND 5),
  trips_count integer NOT NULL DEFAULT 0 CHECK (trips_count >= 0),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
