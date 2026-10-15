import { createClient as createSupabaseClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { getSupabaseEnv } from "./env";
import { createClient } from "./server";

/**
 * Server-only Supabase Admin Client.
 * Uses SUPABASE_SERVICE_ROLE_KEY if provided to bypass RLS for operator administrative tasks.
 * Falls back gracefully to the server authenticated/anon client when the service role key is not configured,
 * relying on SECURITY DEFINER RPC functions.
 */
export function createAdminClient(): SupabaseClient<Database> {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (serviceKey) {
    try {
      const { url } = getSupabaseEnv();
      return createSupabaseClient<Database>(url, serviceKey, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      });
    } catch {
      // Graceful fallback to server client
    }
  }

  return createClient();
}
