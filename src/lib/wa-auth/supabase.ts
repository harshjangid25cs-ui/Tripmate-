import 'server-only';
import { createClient } from '@supabase/supabase-js';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let client: ReturnType<typeof createClient<any>> | null = null;

/** Service-role client for wa-auth. Bypasses RLS: only ever import from server code (route handlers). */
export function db() {
  if (!client) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) {
      throw new Error('NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required for wa-auth');
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    client = createClient<any>(url, key, {
      auth: { persistSession: false, autoRefreshToken: false }
    });
  }
  return client;
}
