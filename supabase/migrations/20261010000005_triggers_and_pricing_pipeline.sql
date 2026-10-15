-- Migration 5: Business logic triggers and server-side pricing pipeline
-- Source of truth: DATABASE.md §3 and §6

-- 1. Trigger function: set_trip_hotel_price()
CREATE OR REPLACE FUNCTION public.set_trip_hotel_price()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_trip record;
  v_hotel record;
BEGIN
  SELECT start_date, end_date INTO v_trip FROM public.trips WHERE id = NEW.trip_id;
  IF v_trip.start_date IS NULL OR v_trip.end_date IS NULL THEN
    RAISE EXCEPTION 'Trip start_date and end_date must be set before adding a hotel';
  END IF;

  SELECT price_per_night INTO v_hotel FROM public.hotels WHERE id = NEW.hotel_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Hotel not found';
  END IF;

  NEW.check_in := v_trip.start_date;
  NEW.check_out := v_trip.end_date;
  NEW.unit_price := v_hotel.price_per_night;
  NEW.subtotal := NEW.unit_price * NEW.rooms * (NEW.check_out - NEW.check_in);

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_trip_hotels_price ON public.trip_hotels;
CREATE TRIGGER trg_trip_hotels_price
  BEFORE INSERT OR UPDATE ON public.trip_hotels
  FOR EACH ROW
  EXECUTE FUNCTION public.set_trip_hotel_price();

-- 2. Trigger function: set_trip_vehicle_price()
CREATE OR REPLACE FUNCTION public.set_trip_vehicle_price()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_trip record;
  v_vehicle record;
BEGIN
  SELECT total_days INTO v_trip FROM public.trips WHERE id = NEW.trip_id;
  IF v_trip.total_days IS NULL THEN
    RAISE EXCEPTION 'Trip dates must be set before adding a vehicle';
  END IF;

  SELECT price INTO v_vehicle FROM public.vehicles WHERE id = NEW.vehicle_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Vehicle not found';
  END IF;

  NEW.days := v_trip.total_days;
  NEW.unit_price := v_vehicle.price;
  NEW.subtotal := NEW.unit_price * NEW.quantity * NEW.days;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_trip_vehicles_price ON public.trip_vehicles;
CREATE TRIGGER trg_trip_vehicles_price
  BEFORE INSERT OR UPDATE ON public.trip_vehicles
  FOR EACH ROW
  EXECUTE FUNCTION public.set_trip_vehicle_price();

-- 3. Trigger function: set_trip_stop_price()
CREATE OR REPLACE FUNCTION public.set_trip_stop_price()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_trip record;
  v_stop record;
BEGIN
  SELECT traveler_count INTO v_trip FROM public.trips WHERE id = NEW.trip_id;
  SELECT price, pricing_unit INTO v_stop FROM public.stops WHERE id = NEW.stop_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Stop not found';
  END IF;

  NEW.unit_price := v_stop.price;
  IF v_stop.pricing_unit = 'per_person' THEN
    NEW.subtotal := NEW.unit_price * COALESCE(v_trip.traveler_count, 1);
  ELSE
    NEW.subtotal := NEW.unit_price;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_trip_stops_price ON public.trip_stops;
CREATE TRIGGER trg_trip_stops_price
  BEFORE INSERT OR UPDATE ON public.trip_stops
  FOR EACH ROW
  EXECUTE FUNCTION public.set_trip_stop_price();

-- 4. Trigger function: recalc_trip_total()
CREATE OR REPLACE FUNCTION public.recalc_trip_total()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_trip_id uuid;
  v_booking_kind text;
  v_hotel_subtotal numeric(12,2);
  v_vehicle_subtotal numeric(12,2);
  v_stops_subtotal numeric(12,2);
  v_subtotal numeric(12,2);
  v_service_fee numeric(12,2);
  v_tax numeric(12,2);
  v_discount numeric(12,2);
  v_coupon text;
  v_total numeric(12,2);
  v_cfg record;
BEGIN
  v_trip_id := COALESCE(NEW.trip_id, OLD.trip_id);

  SELECT booking_kind INTO v_booking_kind FROM public.trips WHERE id = v_trip_id;
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  SELECT service_fee, gst_rate, demo_coupon_code, demo_coupon_discount
  INTO v_cfg
  FROM public.pricing_config
  WHERE id = 1;

  SELECT COALESCE(SUM(subtotal), 0) INTO v_hotel_subtotal FROM public.trip_hotels WHERE trip_id = v_trip_id;
  SELECT COALESCE(SUM(subtotal), 0) INTO v_vehicle_subtotal FROM public.trip_vehicles WHERE trip_id = v_trip_id;
  SELECT COALESCE(SUM(subtotal), 0) INTO v_stops_subtotal FROM public.trip_stops WHERE trip_id = v_trip_id;

  v_subtotal := v_hotel_subtotal + v_vehicle_subtotal + v_stops_subtotal;

  IF v_booking_kind = 'normal' THEN
    IF v_subtotal = 0 THEN
      v_service_fee := 0;
      v_tax := 0;
      v_discount := 0;
      v_coupon := NULL;
    ELSE
      v_service_fee := v_cfg.service_fee;
      v_tax := ROUND(v_cfg.gst_rate * (v_subtotal + v_service_fee), 0);
      v_discount := LEAST(v_cfg.demo_coupon_discount, v_subtotal + v_service_fee + v_tax);
      v_coupon := v_cfg.demo_coupon_code;
    END IF;
  ELSE
    -- Commercial booking
    v_service_fee := 0;
    v_tax := ROUND(v_cfg.gst_rate * v_subtotal, 0);
    v_discount := 0;
    v_coupon := NULL;
  END IF;

  v_total := v_subtotal + v_service_fee + v_tax - v_discount;

  UPDATE public.trips
  SET
    subtotal_amount = v_subtotal,
    service_fee = v_service_fee,
    tax_amount = v_tax,
    discount_amount = v_discount,
    coupon_code = v_coupon,
    total_amount = v_total
  WHERE id = v_trip_id;

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_trip_hotels_recalc ON public.trip_hotels;
CREATE TRIGGER trg_trip_hotels_recalc
  AFTER INSERT OR UPDATE OR DELETE ON public.trip_hotels
  FOR EACH ROW
  EXECUTE FUNCTION public.recalc_trip_total();

DROP TRIGGER IF EXISTS trg_trip_vehicles_recalc ON public.trip_vehicles;
CREATE TRIGGER trg_trip_vehicles_recalc
  AFTER INSERT OR UPDATE OR DELETE ON public.trip_vehicles
  FOR EACH ROW
  EXECUTE FUNCTION public.recalc_trip_total();

DROP TRIGGER IF EXISTS trg_trip_stops_recalc ON public.trip_stops;
CREATE TRIGGER trg_trip_stops_recalc
  AFTER INSERT OR UPDATE OR DELETE ON public.trip_stops
  FOR EACH ROW
  EXECUTE FUNCTION public.recalc_trip_total();

-- 5. Trigger function: sync_trip_children()
CREATE OR REPLACE FUNCTION public.sync_trip_children()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (OLD.start_date IS DISTINCT FROM NEW.start_date) OR
     (OLD.end_date IS DISTINCT FROM NEW.end_date) OR
     (OLD.traveler_count IS DISTINCT FROM NEW.traveler_count) THEN

    -- Touch child tables to invoke their respective BEFORE triggers and recalc
    UPDATE public.trip_hotels SET trip_id = trip_id WHERE trip_id = NEW.id;
    UPDATE public.trip_vehicles SET trip_id = trip_id WHERE trip_id = NEW.id;
    UPDATE public.trip_stops SET trip_id = trip_id WHERE trip_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_trips_sync_children ON public.trips;
CREATE TRIGGER trg_trips_sync_children
  AFTER UPDATE OF start_date, end_date, traveler_count ON public.trips
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_trip_children();

-- 6. Trigger function: validate_passenger_doc_path()
CREATE OR REPLACE FUNCTION public.validate_passenger_doc_path()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_expected_prefix text;
BEGIN
  IF NEW.id_doc_path IS NOT NULL THEN
    SELECT user_id INTO v_user_id FROM public.trips WHERE id = NEW.trip_id;
    v_expected_prefix := v_user_id::text || '/' || NEW.trip_id::text || '/';
    IF NOT (NEW.id_doc_path LIKE v_expected_prefix || '%') THEN
      RAISE EXCEPTION 'Invalid id_doc_path prefix: must start with %', v_expected_prefix;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_trip_passengers_validate_doc ON public.trip_passengers;
CREATE TRIGGER trg_trip_passengers_validate_doc
  BEFORE INSERT OR UPDATE ON public.trip_passengers
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_passenger_doc_path();
