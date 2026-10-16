-- 20261016000012_enable_realtime.sql
-- TripMate Real-Time Synchronization for Admin Portal & Customer App
-- Enables supabase_realtime publication on core operational and catalog tables

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    CREATE PUBLICATION supabase_realtime;
  END IF;
END $$;

-- Set REPLICA IDENTITY FULL on core tables to send full row images on updates/deletes
ALTER TABLE public.trips REPLICA IDENTITY FULL;
ALTER TABLE public.trip_vehicles REPLICA IDENTITY FULL;
ALTER TABLE public.trip_hotels REPLICA IDENTITY FULL;
ALTER TABLE public.trip_stops REPLICA IDENTITY FULL;
ALTER TABLE public.circuits REPLICA IDENTITY FULL;
ALTER TABLE public.destinations REPLICA IDENTITY FULL;
ALTER TABLE public.vehicles REPLICA IDENTITY FULL;
ALTER TABLE public.drivers REPLICA IDENTITY FULL;
ALTER TABLE public.hotels REPLICA IDENTITY FULL;
ALTER TABLE public.stops REPLICA IDENTITY FULL;
ALTER TABLE public.commercial_bookings REPLICA IDENTITY FULL;
ALTER TABLE public.notifications REPLICA IDENTITY FULL;
ALTER TABLE public.payments REPLICA IDENTITY FULL;

-- Add tables to supabase_realtime publication if not already added
DO $$
DECLARE
  t text;
  tables_to_add text[] := ARRAY[
    'trips',
    'trip_vehicles',
    'trip_hotels',
    'trip_stops',
    'circuits',
    'destinations',
    'vehicles',
    'drivers',
    'hotels',
    'stops',
    'commercial_bookings',
    'notifications',
    'payments'
  ];
BEGIN
  FOREACH t IN ARRAY tables_to_add LOOP
    IF NOT EXISTS (
      SELECT 1
      FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime'
        AND schemaname = 'public'
        AND tablename = t
    ) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', t);
    END IF;
  END LOOP;
END $$;
