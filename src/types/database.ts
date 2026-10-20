/**
 * database.ts — TypeScript Schema Definitions for TripMate Supabase Database (v3)
 * Source of truth: DATABASE.md §0 - §6
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type DestinationCategory =
  | "popular"
  | "hidden_gems"
  | "less_discovered"
  | "nature"
  | "heritage"
  | "weekend_getaways";

export interface SavedCompanion {
  full_name: string;
  age?: number | null;
  gender?: string | null;
  id_type?: "aadhaar" | "passport" | "driving_license" | "driving_licence" | "voter_id" | string | null;
  id_storage_path?: string | null;
  id_verified?: boolean;
}

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          full_name: string;
          email: string | null;
          phone: string | null;
          avatar_url: string | null;
          saved_id_type: "aadhaar" | "passport" | "driving_license" | "driving_licence" | "voter_id" | null;
          saved_id_storage_path: string | null;
          saved_id_file_size_bytes: number | null;
          saved_id_verified: boolean;
          saved_id_updated_at: string | null;
          saved_companions: SavedCompanion[] | Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          full_name?: string;
          email?: string | null;
          phone?: string | null;
          avatar_url?: string | null;
          saved_id_type?: "aadhaar" | "passport" | "driving_license" | "driving_licence" | "voter_id" | null;
          saved_id_storage_path?: string | null;
          saved_id_file_size_bytes?: number | null;
          saved_id_verified?: boolean;
          saved_id_updated_at?: string | null;
          saved_companions?: SavedCompanion[] | Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          full_name?: string;
          email?: string | null;
          phone?: string | null;
          avatar_url?: string | null;
          saved_id_type?: "aadhaar" | "passport" | "driving_license" | "driving_licence" | "voter_id" | null;
          saved_id_storage_path?: string | null;
          saved_id_file_size_bytes?: number | null;
          saved_id_verified?: boolean;
          saved_id_updated_at?: string | null;
          saved_companions?: SavedCompanion[] | Json;
          updated_at?: string;
        };
        Relationships: [];
      };

      companies: {
        Row: {
          id: string;
          name: string;
          gst_number: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          gst_number?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          name?: string;
          gst_number?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };

      company_members: {
        Row: {
          id: string;
          company_id: string;
          profile_id: string;
          role: "member" | "admin";
          employee_id: string | null;
          department: string | null;
          designation: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          profile_id: string;
          role?: "member" | "admin";
          employee_id?: string | null;
          department?: string | null;
          designation?: string | null;
          created_at?: string;
        };
        Update: {
          role?: "member" | "admin";
          employee_id?: string | null;
          department?: string | null;
          designation?: string | null;
        };
        Relationships: [];
      };

      policies: {
        Row: {
          id: string;
          company_id: string;
          type: "hotel" | "vehicle" | "approval";
          rule_text: string;
          limit_value: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          type: "hotel" | "vehicle" | "approval";
          rule_text: string;
          limit_value?: number | null;
          created_at?: string;
        };
        Update: {
          type?: "hotel" | "vehicle" | "approval";
          rule_text?: string;
          limit_value?: number | null;
        };
        Relationships: [];
      };

      pricing_config: {
        Row: {
          id: number;
          service_fee: number;
          gst_rate: number;
          demo_coupon_code: string | null;
          demo_coupon_discount: number;
          merchant_upi_vpa?: string | null;
          merchant_payee_name?: string | null;
          active_payment_gateway?: "auto" | "direct_upi_utr" | "razorpay" | "demo" | null;
          upi_auto_confirm?: boolean | null;
          created_at: string;
          updated_at?: string;
        };
        Insert: {
          id?: number;
          service_fee?: number;
          gst_rate?: number;
          demo_coupon_code?: string | null;
          demo_coupon_discount?: number;
          merchant_upi_vpa?: string | null;
          merchant_payee_name?: string | null;
          active_payment_gateway?: "auto" | "direct_upi_utr" | "razorpay" | "demo" | null;
          upi_auto_confirm?: boolean | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          service_fee?: number;
          gst_rate?: number;
          demo_coupon_code?: string | null;
          demo_coupon_discount?: number;
          merchant_upi_vpa?: string | null;
          merchant_payee_name?: string | null;
          active_payment_gateway?: "auto" | "direct_upi_utr" | "razorpay" | "demo" | null;
          upi_auto_confirm?: boolean | null;
          updated_at?: string;
        };
        Relationships: [];
      };

      destinations: {
        Row: {
          id: string;
          slug: string;
          name: string;
          region: string | null;
          tagline: string | null;
          description: string | null;
          hero_image_path: string | null;
          starting_price: number | null;
          rating: number | null;
          review_count: number;
          recommended_days: string | null;
          best_season: string | null;
          badge: string | null;
          categories: string[];
          origin_label: string | null;
          drive_hours: number | null;
          drive_km: number | null;
          latitude: number | null;
          longitude: number | null;
          local_radius_km: number;
          is_featured: boolean;
          is_bookable: boolean;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          slug: string;
          name: string;
          region?: string | null;
          tagline?: string | null;
          description?: string | null;
          hero_image_path?: string | null;
          starting_price?: number | null;
          rating?: number | null;
          review_count?: number;
          recommended_days?: string | null;
          best_season?: string | null;
          badge?: string | null;
          categories?: string[];
          origin_label?: string | null;
          drive_hours?: number | null;
          drive_km?: number | null;
          latitude?: number | null;
          longitude?: number | null;
          local_radius_km?: number;
          is_featured?: boolean;
          is_bookable?: boolean;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          slug?: string;
          name?: string;
          region?: string | null;
          tagline?: string | null;
          description?: string | null;
          hero_image_path?: string | null;
          starting_price?: number | null;
          rating?: number | null;
          review_count?: number;
          recommended_days?: string | null;
          best_season?: string | null;
          badge?: string | null;
          categories?: string[];
          origin_label?: string | null;
          drive_hours?: number | null;
          drive_km?: number | null;
          latitude?: number | null;
          longitude?: number | null;
          local_radius_km?: number;
          is_featured?: boolean;
          is_bookable?: boolean;
          is_active?: boolean;
          updated_at?: string;
        };
        Relationships: [];
      };

      destination_highlights: {
        Row: {
          id: string;
          destination_id: string;
          title: string;
          category: string | null;
          duration_text: string | null;
          badge: string | null;
          description: string | null;
          image_path: string | null;
          sort_order: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          destination_id: string;
          title: string;
          category?: string | null;
          duration_text?: string | null;
          badge?: string | null;
          description?: string | null;
          image_path?: string | null;
          sort_order?: number;
          created_at?: string;
        };
        Update: {
          title?: string;
          category?: string | null;
          duration_text?: string | null;
          badge?: string | null;
          description?: string | null;
          image_path?: string | null;
          sort_order?: number;
        };
        Relationships: [];
      };

      circuits: {
        Row: {
          id: string;
          destination_id: string;
          title: string;
          days: number;
          nights: number;
          summary: string | null;
          description: string | null;
          base_price_per_person: number;
          rating: number | null;
          badge: string | null;
          categories: string[];
          pricing_scope: "local_city_only" | "origin_transit_included";
          included_hotel_ids: string[];
          included_vehicle_ids: string[];
          included_stop_ids: string[];
          local_sightseeing_km_per_day: number;
          is_featured: boolean;
          image_path: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          destination_id: string;
          title: string;
          days: number;
          nights: number;
          summary?: string | null;
          description?: string | null;
          base_price_per_person: number;
          rating?: number | null;
          badge?: string | null;
          categories?: string[];
          pricing_scope?: "local_city_only" | "origin_transit_included";
          included_hotel_ids?: string[];
          included_vehicle_ids?: string[];
          included_stop_ids?: string[];
          local_sightseeing_km_per_day?: number;
          is_featured?: boolean;
          image_path?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          destination_id?: string;
          title?: string;
          days?: number;
          nights?: number;
          summary?: string | null;
          description?: string | null;
          base_price_per_person?: number;
          rating?: number | null;
          badge?: string | null;
          categories?: string[];
          pricing_scope?: "local_city_only" | "origin_transit_included";
          included_hotel_ids?: string[];
          included_vehicle_ids?: string[];
          included_stop_ids?: string[];
          local_sightseeing_km_per_day?: number;
          is_featured?: boolean;
          image_path?: string | null;
          is_active?: boolean;
          updated_at?: string;
        };
        Relationships: [];
      };

      hotels: {
        Row: {
          id: string;
          destination_id: string | null;
          name: string;
          description: string | null;
          rating: number | null;
          review_count: number;
          neighborhood: string | null;
          distance_text: string | null;
          badge: string | null;
          price_per_night: number;
          image_paths: string[];
          amenities: string[];
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          destination_id?: string | null;
          name: string;
          description?: string | null;
          rating?: number | null;
          review_count?: number;
          neighborhood?: string | null;
          distance_text?: string | null;
          badge?: string | null;
          price_per_night: number;
          image_paths?: string[];
          amenities?: string[];
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          destination_id?: string | null;
          name?: string;
          description?: string | null;
          rating?: number | null;
          review_count?: number;
          neighborhood?: string | null;
          distance_text?: string | null;
          badge?: string | null;
          price_per_night?: number;
          image_paths?: string[];
          amenities?: string[];
          is_active?: boolean;
          updated_at?: string;
        };
        Relationships: [];
      };

      vehicles: {
        Row: {
          id: string;
          destination_id: string | null;
          type: "car" | "bike" | "bus";
          name: string;
          subtitle: string | null;
          description: string | null;
          capacity: number | null;
          luggage_capacity: number | null;
          features: string[];
          fuel_policy: string | null;
          driver_type: "chauffeur" | "self_drive" | null;
          rating: number | null;
          badge: string | null;
          price: number;
          image_path: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          destination_id?: string | null;
          type: "car" | "bike" | "bus";
          name: string;
          subtitle?: string | null;
          description?: string | null;
          capacity?: number | null;
          luggage_capacity?: number | null;
          features?: string[];
          fuel_policy?: string | null;
          driver_type?: "chauffeur" | "self_drive" | null;
          rating?: number | null;
          badge?: string | null;
          price: number;
          image_path?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          destination_id?: string | null;
          type?: "car" | "bike" | "bus";
          name?: string;
          subtitle?: string | null;
          description?: string | null;
          capacity?: number | null;
          luggage_capacity?: number | null;
          features?: string[];
          fuel_policy?: string | null;
          driver_type?: "chauffeur" | "self_drive" | null;
          rating?: number | null;
          badge?: string | null;
          price?: number;
          image_path?: string | null;
          is_active?: boolean;
          updated_at?: string;
        };
        Relationships: [];
      };

      stops: {
        Row: {
          id: string;
          destination_id: string | null;
          name: string;
          description: string | null;
          location_text: string | null;
          distance_text: string | null;
          amenities: string[];
          badge: string | null;
          turnaround_text: string | null;
          image_path: string | null;
          price: number;
          pricing_unit: "per_person" | "flat";
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          destination_id?: string | null;
          name: string;
          description?: string | null;
          location_text?: string | null;
          distance_text?: string | null;
          amenities?: string[];
          badge?: string | null;
          turnaround_text?: string | null;
          image_path?: string | null;
          price?: number;
          pricing_unit?: "per_person" | "flat";
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          destination_id?: string | null;
          name?: string;
          description?: string | null;
          location_text?: string | null;
          distance_text?: string | null;
          amenities?: string[];
          badge?: string | null;
          turnaround_text?: string | null;
          image_path?: string | null;
          price?: number;
          pricing_unit?: "per_person" | "flat";
          is_active?: boolean;
          updated_at?: string;
        };
        Relationships: [];
      };

      drivers: {
        Row: {
          id: string;
          full_name: string;
          phone: string;
          plate_number: string;
          rating: number | null;
          trips_count: number;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          full_name: string;
          phone: string;
          plate_number: string;
          rating?: number | null;
          trips_count?: number;
          is_active?: boolean;
          created_at?: string;
        };
        Update: {
          full_name?: string;
          phone?: string;
          plate_number?: string;
          rating?: number | null;
          trips_count?: number;
          is_active?: boolean;
        };
        Relationships: [];
      };

      trips: {
        Row: {
          id: string;
          booking_ref: string;
          user_id: string;
          booking_kind: "normal" | "commercial";
          group_type: "family" | "solo" | "other" | null;
          title: string | null;
          destination_id: string | null;
          circuit_id: string | null;
          from_location: string | null;
          to_location: string | null;
          start_date: string | null;
          end_date: string | null;
          total_days: number | null;
          traveler_count: number;
          status: "draft" | "pending_approval" | "confirmed" | "cancelled" | "completed";
          subtotal_amount: number;
          service_fee: number;
          tax_amount: number;
          discount_amount: number;
          coupon_code: string | null;
          total_amount: number;
          currency: string;
          confirmed_at: string | null;
          cancelled_at: string | null;
          cancellation_reason: string | null;
          refund_amount: number | null;
          origin_name: string | null;
          origin_lat: number | null;
          origin_lng: number | null;
          calculated_distance_km: number;
          transit_mode: "local_only" | "live_origin_to_destination";
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          booking_ref?: string;
          user_id?: string;
          booking_kind: "normal" | "commercial";
          group_type?: "family" | "solo" | "other" | null;
          title?: string | null;
          destination_id?: string | null;
          circuit_id?: string | null;
          from_location?: string | null;
          to_location?: string | null;
          start_date?: string | null;
          end_date?: string | null;
          traveler_count?: number;
          status?: "draft" | "pending_approval" | "confirmed" | "cancelled" | "completed";
          currency?: string;
          origin_name?: string | null;
          origin_lat?: number | null;
          origin_lng?: number | null;
          calculated_distance_km?: number;
          transit_mode?: "local_only" | "live_origin_to_destination";
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          group_type?: "family" | "solo" | "other" | null;
          title?: string | null;
          destination_id?: string | null;
          circuit_id?: string | null;
          from_location?: string | null;
          to_location?: string | null;
          start_date?: string | null;
          end_date?: string | null;
          traveler_count?: number;
          status?: "draft" | "pending_approval" | "confirmed" | "cancelled" | "completed";
          confirmed_at?: string | null;
          cancelled_at?: string | null;
          cancellation_reason?: string | null;
          refund_amount?: number | null;
          origin_name?: string | null;
          origin_lat?: number | null;
          origin_lng?: number | null;
          calculated_distance_km?: number;
          transit_mode?: "local_only" | "live_origin_to_destination";
          subtotal_amount?: number;
          service_fee?: number;
          tax_amount?: number;
          discount_amount?: number;
          coupon_code?: string | null;
          total_amount?: number;
          updated_at?: string;
        };
        Relationships: [];
      };

      trip_hotels: {
        Row: {
          id: string;
          trip_id: string;
          hotel_id: string;
          rooms: number;
          check_in: string;
          check_out: string;
          unit_price: number;
          subtotal: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          trip_id: string;
          hotel_id: string;
          rooms?: number;
          check_in?: string;
          check_out?: string;
          unit_price?: number;
          subtotal?: number;
          created_at?: string;
        };
        Update: {
          hotel_id?: string;
          rooms?: number;
          check_in?: string;
          check_out?: string;
          unit_price?: number;
          subtotal?: number;
        };
        Relationships: [];
      };

      trip_vehicles: {
        Row: {
          id: string;
          trip_id: string;
          vehicle_id: string;
          quantity: number;
          days: number;
          unit_price: number;
          subtotal: number;
          driver_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          trip_id: string;
          vehicle_id: string;
          quantity?: number;
          days?: number;
          unit_price?: number;
          subtotal?: number;
          driver_id?: string | null;
          created_at?: string;
        };
        Update: {
          vehicle_id?: string;
          quantity?: number;
          days?: number;
          unit_price?: number;
          subtotal?: number;
          driver_id?: string | null;
        };
        Relationships: [];
      };

      trip_stops: {
        Row: {
          id: string;
          trip_id: string;
          stop_id: string;
          day_number: number;
          sort_order: number;
          unit_price: number;
          subtotal: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          trip_id: string;
          stop_id: string;
          day_number?: number;
          sort_order?: number;
          unit_price?: number;
          subtotal?: number;
          created_at?: string;
        };
        Update: {
          stop_id?: string;
          day_number?: number;
          sort_order?: number;
          unit_price?: number;
          subtotal?: number;
        };
        Relationships: [];
      };

      trip_passengers: {
        Row: {
          id: string;
          trip_id: string;
          is_lead: boolean;
          full_name: string;
          phone: string | null;
          designation: string | null;
          employee_ref: string | null;
          id_doc_type: "aadhaar" | "passport" | "driving_licence" | "driving_license" | "voter_id" | null;
          id_doc_path: string | null;
          id_file_size_bytes?: number | null;
          is_reused_from_profile?: boolean;
          seat_label: string | null;
          ticket_code: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          trip_id: string;
          is_lead?: boolean;
          full_name: string;
          phone?: string | null;
          designation?: string | null;
          employee_ref?: string | null;
          id_doc_type?: "aadhaar" | "passport" | "driving_licence" | "driving_license" | "voter_id" | null;
          id_doc_path?: string | null;
          id_file_size_bytes?: number | null;
          is_reused_from_profile?: boolean;
          seat_label?: string | null;
          ticket_code?: string | null;
          created_at?: string;
        };
        Update: {
          is_lead?: boolean;
          full_name?: string;
          phone?: string | null;
          designation?: string | null;
          employee_ref?: string | null;
          id_doc_type?: "aadhaar" | "passport" | "driving_licence" | "driving_license" | "voter_id" | null;
          id_doc_path?: string | null;
          id_file_size_bytes?: number | null;
          is_reused_from_profile?: boolean;
          seat_label?: string | null;
          ticket_code?: string | null;
        };
        Relationships: [];
      };

      commercial_bookings: {
        Row: {
          id: string;
          trip_id: string;
          company_id: string;
          booking_time: string | null;
          trip_purpose: string | null;
          policy_id: string | null;
          approval_status: "not_required" | "pending" | "approved" | "rejected";
          reviewed_by: string | null;
          reviewed_at: string | null;
          review_note: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          trip_id: string;
          company_id: string;
          booking_time?: string | null;
          trip_purpose?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          booking_time?: string | null;
          trip_purpose?: string | null;
          approval_status?: "not_required" | "pending" | "approved" | "rejected";
          reviewed_by?: string | null;
          reviewed_at?: string | null;
          review_note?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };

      itinerary_items: {
        Row: {
          id: string;
          trip_id: string;
          day_number: number;
          sort_order: number;
          item_type: "hotel" | "vehicle" | "stop" | "activity" | "note";
          title: string;
          description: string | null;
          start_time: string | null;
          trip_hotel_id: string | null;
          trip_vehicle_id: string | null;
          trip_stop_id: string | null;
          highlight_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          trip_id: string;
          day_number: number;
          sort_order?: number;
          item_type: "hotel" | "vehicle" | "stop" | "activity" | "note";
          title: string;
          description?: string | null;
          start_time?: string | null;
          trip_hotel_id?: string | null;
          trip_vehicle_id?: string | null;
          trip_stop_id?: string | null;
          highlight_id?: string | null;
          created_at?: string;
        };
        Update: {
          day_number?: number;
          sort_order?: number;
          item_type?: "hotel" | "vehicle" | "stop" | "activity" | "note";
          title?: string;
          description?: string | null;
          start_time?: string | null;
        };
        Relationships: [];
      };

      payments: {
        Row: {
          id: string;
          trip_id: string;
          user_id: string;
          provider: "demo" | "razorpay" | "direct_upi";
          method: "upi" | "card" | "netbanking" | "emi" | null;
          amount: number;
          currency: string;
          status: "succeeded" | "failed" | "refunded";
          provider_reference: string | null;
          utr_number: string | null;
          payer_vpa: string | null;
          merchant_vpa?: string | null;
          verification_status: "pending_verification" | "verified" | "rejected";
          created_at: string;
        };
        Insert: {
          id?: string;
          trip_id: string;
          user_id: string;
          provider?: "demo" | "razorpay" | "direct_upi";
          method?: "upi" | "card" | "netbanking" | "emi" | null;
          amount: number;
          currency?: string;
          status: "succeeded" | "failed" | "refunded";
          provider_reference?: string | null;
          utr_number?: string | null;
          payer_vpa?: string | null;
          merchant_vpa?: string | null;
          verification_status?: "pending_verification" | "verified" | "rejected";
          created_at?: string;
        };
        Update: {
          status?: "succeeded" | "failed" | "refunded";
          merchant_vpa?: string | null;
          verification_status?: "pending_verification" | "verified" | "rejected";
        };
        Relationships: [];
      };

      invoices: {
        Row: {
          id: string;
          trip_id: string;
          invoice_number: string;
          subtotal: number;
          service_fee: number;
          tax_amount: number;
          discount_amount: number;
          total_amount: number;
          issued_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          trip_id: string;
          invoice_number: string;
          subtotal: number;
          service_fee?: number;
          tax_amount?: number;
          discount_amount?: number;
          total_amount: number;
          issued_at?: string;
          created_at?: string;
        };
        Update: Record<string, never>;
        Relationships: [];
      };

      trip_status_history: {
        Row: {
          id: string;
          trip_id: string;
          from_status: string | null;
          to_status: string;
          note: string | null;
          changed_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          trip_id: string;
          from_status?: string | null;
          to_status: string;
          note?: string | null;
          changed_by?: string | null;
          created_at?: string;
        };
        Update: Record<string, never>;
        Relationships: [];
      };

      notifications: {
        Row: {
          id: string;
          profile_id: string;
          trip_id: string | null;
          type:
            | "booking_confirmed"
            | "booking_cancelled"
            | "approval_required"
            | "approval_decision"
            | "payment_succeeded"
            | "reminder";
          message: string;
          is_read: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          profile_id: string;
          trip_id?: string | null;
          type:
            | "booking_confirmed"
            | "booking_cancelled"
            | "approval_required"
            | "approval_decision"
            | "payment_succeeded"
            | "reminder";
          message: string;
          is_read?: boolean;
          created_at?: string;
        };
        Update: {
          is_read?: boolean;
        };
        Relationships: [];
      };

      saved_items: {
        Row: {
          id: string;
          profile_id: string;
          item_type: "destination" | "hotel" | "circuit";
          item_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          profile_id: string;
          item_type: "destination" | "hotel" | "circuit";
          item_id: string;
          created_at?: string;
        };
        Update: Record<string, never>;
        Relationships: [];
      };

      feedback: {
        Row: {
          id: string;
          trip_id: string;
          profile_id: string;
          star_rating: number;
          nps_score: number | null;
          comment: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          trip_id: string;
          profile_id: string;
          star_rating: number;
          nps_score?: number | null;
          comment?: string | null;
          created_at?: string;
        };
        Update: Record<string, never>;
        Relationships: [];
      };

      coupons: {
        Row: {
          id: string;
          code: string;
          description: string | null;
          discount_type: "flat" | "percent";
          discount_value: number;
          min_order_amount: number;
          max_discount: number | null;
          usage_limit: number | null;
          used_count: number;
          valid_until: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          code: string;
          description?: string | null;
          discount_type: "flat" | "percent";
          discount_value: number;
          min_order_amount?: number;
          max_discount?: number | null;
          usage_limit?: number | null;
          used_count?: number;
          valid_until?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          code?: string;
          description?: string | null;
          discount_type?: "flat" | "percent";
          discount_value?: number;
          min_order_amount?: number;
          max_discount?: number | null;
          usage_limit?: number | null;
          used_count?: number;
          valid_until?: string | null;
          is_active?: boolean;
          updated_at?: string;
        };
        Relationships: [];
      };

      email_logs: {
        Row: {
          id: string;
          to_email: string;
          template: string;
          subject: string;
          content: string;
          related_trip_id: string | null;
          related_booking_ref: string | null;
          sent_by: string;
          status: "sent" | "queued" | "failed";
          provider_message_id: string | null;
          error: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          to_email: string;
          template: string;
          subject: string;
          content: string;
          related_trip_id?: string | null;
          related_booking_ref?: string | null;
          sent_by: string;
          status?: "sent" | "queued" | "failed";
          provider_message_id?: string | null;
          error?: string | null;
          created_at?: string;
        };
        Update: Record<string, never>;
        Relationships: [];
      };

      admin_audit_logs: {
        Row: {
          id: string;
          actor_id: string;
          actor_name: string;
          actor_role: string;
          action: string;
          entity_type: string;
          entity_id: string | null;
          before: Json | null;
          after: Json | null;
          reason: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          actor_id: string;
          actor_name: string;
          actor_role: string;
          action: string;
          entity_type: string;
          entity_id?: string | null;
          before?: Json | null;
          after?: Json | null;
          reason?: string | null;
          created_at?: string;
        };
        Update: Record<string, never>;
        Relationships: [];
      };
    };

    Views: Record<string, never>;

    Functions: {
      demo_pay: {
        Args: {
          p_trip_id: string;
          p_method: string;
          p_simulate?: string;
        };
        Returns: {
          ok: boolean;
          trip_id?: string;
          booking_ref?: string;
          reason?: string;
        };
      };
      submit_commercial_booking: {
        Args: {
          p_trip_id: string;
        };
        Returns: {
          ok: boolean;
          trip_id?: string;
          status?: string;
          booking_ref?: string;
        };
      };
      assign_commercial_passenger: {
        Args: {
          p_trip_id: string;
          p_full_name: string;
          p_phone: string;
          p_seat_label: string;
          p_designation?: string | null;
          p_employee_ref?: string | null;
        };
        Returns: {
          ok: boolean;
          id?: string;
          seat_label?: string;
          ticket_code?: string | null;
        };
      };
      review_commercial_booking: {
        Args: {
          p_trip_id: string;
          p_decision: "approved" | "rejected";
          p_note?: string | null;
        };
        Returns: {
          ok: boolean;
          status?: string;
        };
      };
      cancel_booking: {
        Args: {
          p_trip_id: string;
          p_reason: string;
        };
        Returns: {
          ok: boolean;
          refund_amount?: number;
        };
      };
      get_ticket: {
        Args: {
          p_ticket_code: string;
        };
        Returns: {
          passenger_name: string;
          seat_label: string | null;
          designation: string | null;
          booking_ref: string;
          from_location: string | null;
          to_location: string | null;
          start_date: string | null;
          end_date: string | null;
          booking_time: string | null;
          vehicle_name: string | null;
          company_name: string | null;
          ticket_code: string;
        };
      };
      replace_trip_passengers: {
        Args: {
          p_trip_id: string;
          p_passengers: Json;
        };
        Returns: void;
      };
      is_admin_jwt: {
        Args: Record<string, never>;
        Returns: boolean;
      };
      admin_get_operational_snapshot: {
        Args: Record<string, never>;
        Returns: {
          bookings: Json;
          approvals: Json;
          circuits: Json;
          destinations?: Json;
          vehicles?: Json;
          drivers?: Json;
          hotels?: Json;
          stops?: Json;
          metrics: {
            totalRevenue: number;
            pendingApprovalsCount: number;
            cancelledBookings: number;
          };
        };
      };
      admin_get_catalog_snapshot: {
        Args: Record<string, never>;
        Returns: Json;
      };
      admin_upsert_circuit: {
        Args: {
          p_circuit: Json;
        };
        Returns: {
          ok: boolean;
          data?: Json;
          error?: string;
        };
      };
      admin_toggle_circuit_status: {
        Args: {
          p_circuit_id: string;
          p_is_active: boolean;
        };
        Returns: {
          ok: boolean;
          circuit_id: string;
          is_active: boolean;
        };
      };
      admin_control_active_trip: {
        Args: {
          p_trip_id: string;
          p_updates: Json;
        };
        Returns: {
          ok: boolean;
          trip_id: string;
        };
      };
      admin_upsert_vehicle: {
        Args: {
          p_vehicle: Json;
        };
        Returns: {
          ok: boolean;
          data?: Json;
          error?: string;
        };
      };
      admin_delete_vehicle: {
        Args: {
          p_vehicle_id: string;
        };
        Returns: {
          ok: boolean;
          vehicle_id: string;
        };
      };
      admin_upsert_driver: {
        Args: {
          p_driver: Json;
        };
        Returns: {
          ok: boolean;
          data?: Json;
          error?: string;
        };
      };
      admin_upsert_hotel: {
        Args: {
          p_hotel: Json;
        };
        Returns: {
          ok: boolean;
          data?: Json;
          error?: string;
        };
      };
      admin_upsert_stop: {
        Args: {
          p_stop: Json;
        };
        Returns: {
          ok: boolean;
          data?: Json;
          error?: string;
        };
      };
      admin_upsert_destination: {
        Args: {
          p_destination: Json;
        };
        Returns: {
          ok: boolean;
          data?: Json;
          error?: string;
        };
      };
      admin_update_booking_status: {
        Args: {
          p_trip_id: string;
          p_status: string;
          p_reason?: string | null;
          p_refund_amount?: number | null;
        };
        Returns: {
          ok: boolean;
          trip_id: string;
          status: string;
          refund_amount?: number;
        };
      };
      admin_assign_driver: {
        Args: {
          p_trip_id: string;
          p_driver_id: string;
          p_vehicle_id?: string | null;
        };
        Returns: {
          ok: boolean;
          trip_id: string;
          driver_id: string;
          driver_name?: string;
        };
      };
      admin_resolve_approval: {
        Args: {
          p_trip_id: string;
          p_decision: "approved" | "rejected";
          p_notes?: string | null;
        };
        Returns: {
          ok: boolean;
          trip_id: string;
          status: string;
          decision: string;
        };
      };
      admin_upsert_coupon: {
        Args: {
          p_code: string;
          p_description?: string;
          p_discount_type: string;
          p_discount_value: number;
          p_min_order_amount?: number;
          p_max_discount?: number | null;
          p_usage_limit?: number | null;
          p_is_active?: boolean;
          p_valid_until?: string | null;
          p_id?: string | null;
        };
        Returns: Json;
      };
      admin_toggle_coupon_active: {
        Args: {
          p_id: string;
          p_is_active: boolean;
        };
        Returns: Json;
      };
      admin_update_pricing_config: {
        Args: {
          p_service_fee: number;
          p_gst_rate: number;
          p_demo_coupon_code?: string;
          p_demo_coupon_discount?: number;
          p_reason?: string | null;
          p_merchant_upi_vpa?: string;
          p_merchant_payee_name?: string;
          p_active_payment_gateway?: string;
          p_upi_auto_confirm?: boolean;
        };
        Returns: Json;
      };
      submit_direct_upi_payment: {
        Args: {
          p_trip_id: string;
          p_utr_number: string;
          p_payer_vpa?: string | null;
        };
        Returns: Json;
      };
      admin_verify_upi_payment: {
        Args: {
          p_payment_id: string;
          p_status: string;
          p_notes?: string | null;
        };
        Returns: Json;
      };
      customer_apply_coupon: {
        Args: {
          p_trip_id: string;
          p_coupon_code: string;
        };
        Returns: Json;
      };
      admin_upsert_destination_highlight: {
        Args: {
          p_destination_id: string;
          p_title: string;
          p_category?: string | null;
          p_duration_text?: string | null;
          p_badge?: string | null;
          p_sort_order?: number;
          p_description?: string | null;
          p_image_path?: string | null;
          p_id?: string | null;
        };
        Returns: Json;
      };
      admin_delete_destination_highlight: {
        Args: {
          p_id: string;
        };
        Returns: boolean;
      };
      admin_upsert_circuit_itinerary_template: {
        Args: {
          p_circuit_id: string;
          p_items: Json;
        };
        Returns: boolean;
      };
      admin_override_booking_items: {
        Args: {
          p_trip_id: string;
          p_hotel_id?: string | null;
          p_vehicle_id?: string | null;
          p_stop_ids?: string[] | null;
          p_custom_adjustment?: number | null;
          p_notes?: string | null;
        };
        Returns: Json;
      };
      admin_send_customer_notification: {
        Args: {
          p_profile_id: string;
          p_trip_id?: string | null;
          p_type?: string | null;
          p_message: string;
        };
        Returns: Json;
      };
      admin_upsert_company_policy: {
        Args: {
          p_company_id: string;
          p_type: string;
          p_rule_text: string;
          p_limit_value?: number | null;
          p_policy_id?: string | null;
        };
        Returns: Json;
      };
    };

    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
