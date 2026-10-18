import { createServerClient, type CookieOptions } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import type { Database } from "@/types/database";

import { getSupabaseEnv } from "./env";

/**
 * Server Supabase client
 * Used in Server Components, Route Handlers, and Server Actions.
 * Safely guards against invocation outside of an active HTTP request scope (e.g. unit tests).
 */
export function createClient(): SupabaseClient<Database> {
  let cookieStore: ReturnType<typeof cookies> | null = null;
  try {
    cookieStore = cookies();
  } catch {
    // Called outside active Next.js request context (e.g. Vitest unit tests)
  }

  const { url, anonKey } = getSupabaseEnv();

  return createServerClient<Database>(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore ? cookieStore.getAll() : [];
      },
      setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
        if (!cookieStore) return;
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore?.set(name, value, options);
          });
        } catch {
          // The `setAll` method was called from a Server Component.
          // This can be ignored if you have middleware refreshing user sessions.
        }
      },
    },
  }) as unknown as SupabaseClient<Database>;
}
