-- Migration: 20261022000023_booking_funnel_indexes.sql
-- Description: High-performance B-tree foreign key and composite indexes for Tripmate booking funnel

-- Booking relationship foreign key indexes
CREATE INDEX IF NOT EXISTS idx_trip_hotels_trip_id ON public.trip_hotels (trip_id);
CREATE INDEX IF NOT EXISTS idx_trip_vehicles_trip_id ON public.trip_vehicles (trip_id);
CREATE INDEX IF NOT EXISTS idx_trip_stops_trip_id ON public.trip_stops (trip_id);
CREATE INDEX IF NOT EXISTS idx_trip_passengers_trip_id ON public.trip_passengers (trip_id);

-- Trips ownership and status composite index
CREATE INDEX IF NOT EXISTS idx_trips_user_id_status ON public.trips (user_id, status);

-- Catalog destination scoping & active state composite indexes
CREATE INDEX IF NOT EXISTS idx_vehicles_dest_active ON public.vehicles (destination_id, is_active);
CREATE INDEX IF NOT EXISTS idx_stops_dest_active ON public.stops (destination_id, is_active);
CREATE INDEX IF NOT EXISTS idx_hotels_dest_active ON public.hotels (destination_id, is_active);
CREATE INDEX IF NOT EXISTS idx_circuits_dest_active ON public.circuits (destination_id, is_active);
