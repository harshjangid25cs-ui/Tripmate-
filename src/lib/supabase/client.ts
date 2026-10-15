import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

import { getSupabaseEnv } from "./env";

/**
 * Browser Supabase client
 * Used in Client Components. Safe to call multiple times (caches singleton).
 */
export function createClient(): SupabaseClient<Database> {
  const { url, anonKey } = getSupabaseEnv();

  return createBrowserClient<Database>(url, anonKey) as unknown as SupabaseClient<Database>;
}
