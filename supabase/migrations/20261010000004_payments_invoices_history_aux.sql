-- Migration 4: Payments, invoices, history, notifications, saved items, feedback
-- Source of truth: DATABASE.md §4

-- Table: payments (normal trips only)
CREATE TABLE IF NOT EXISTS public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid NOT NULL REFERENCES public.trips(id) ON DELETE RESTRICT,
  user_id uuid NOT NULL REFERENCES public.profiles(id),
  provider text NOT NULL DEFAULT 'demo' CHECK (provider IN ('demo', 'razorpay')),
  method text CHECK (method IN ('upi', 'card', 'netbanking', 'emi')),
  amount numeric(12,2) NOT NULL CHECK (amount >= 0),
  currency text NOT NULL DEFAULT 'INR',
  status text NOT NULL CHECK (status IN ('succeeded', 'failed', 'refunded')),
  provider_reference text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Table: invoices
CREATE TABLE IF NOT EXISTS public.invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid NOT NULL UNIQUE REFERENCES public.trips(id) ON DELETE RESTRICT,
  invoice_number text NOT NULL UNIQUE,
  subtotal numeric(12,2) NOT NULL CHECK (subtotal >= 0),
  service_fee numeric(12,2) NOT NULL DEFAULT 0 CHECK (service_fee >= 0),
  tax_amount numeric(12,2) NOT NULL DEFAULT 0 CHECK (tax_amount >= 0),
  discount_amount numeric(12,2) NOT NULL DEFAULT 0 CHECK (discount_amount >= 0),
  total_amount numeric(12,2) NOT NULL CHECK (total_amount >= 0),
  issued_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Table: trip_status_history
CREATE TABLE IF NOT EXISTS public.trip_status_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  from_status text,
  to_status text NOT NULL,
  note text,
  changed_by uuid REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Table: notifications
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  trip_id uuid REFERENCES public.trips(id) ON DELETE SET NULL,
  type text NOT NULL CHECK (type IN ('booking_confirmed', 'booking_cancelled', 'approval_required', 'approval_decision', 'payment_succeeded', 'reminder')),
  message text NOT NULL,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Table: saved_items (wishlists / bookmarks)
CREATE TABLE IF NOT EXISTS public.saved_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  item_type text NOT NULL CHECK (item_type IN ('destination', 'hotel', 'circuit')),
  item_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (profile_id, item_type, item_id)
);

-- Table: feedback (table retained; no UI in v1)
CREATE TABLE IF NOT EXISTS public.feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  star_rating integer NOT NULL CHECK (star_rating BETWEEN 1 AND 5),
  nps_score integer CHECK (nps_score BETWEEN 0 AND 10),
  comment text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (trip_id, profile_id)
);
