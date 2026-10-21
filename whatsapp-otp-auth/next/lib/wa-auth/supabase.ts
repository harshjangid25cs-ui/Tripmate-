import 'server-only';
import { createClient } from '@supabase/supabase-js';

// Untyped on purpose so this drops into any project; swap <any> for your generated Database type if you have one.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let client: ReturnType<typeof createClient<any>> | null = null;
/** Service-role client. Bypasses RLS: only ever import from server code (route handlers). */
export function db() {
  if (!client) {
    client = createClient<any>(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
      auth: { persistSession: false, autoRefreshToken: false }
    });
  }
  return client;
}
