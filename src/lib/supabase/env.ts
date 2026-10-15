/**
 * Validates and retrieves required Supabase environment variables.
 * Throws a clear error if either variable is missing.
 */
export function getSupabaseEnv(): { url: string; anonKey: string } {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url) {
    throw new Error(
      "Missing required environment variable: NEXT_PUBLIC_SUPABASE_URL. Please set NEXT_PUBLIC_SUPABASE_URL in your environment."
    );
  }

  if (!anonKey) {
    throw new Error(
      "Missing required environment variable: NEXT_PUBLIC_SUPABASE_ANON_KEY. Please set NEXT_PUBLIC_SUPABASE_ANON_KEY in your environment."
    );
  }

  return { url, anonKey };
}
