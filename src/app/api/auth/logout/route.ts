import { NextRequest, NextResponse } from 'next/server';
import { COOKIE, revokeSession, tokenFrom } from '@/lib/wa-auth/session';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { getSupabaseEnv } from '@/lib/supabase/env';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const token = tokenFrom(req);
  if (token) await revokeSession(token);
  const res = NextResponse.json({ success: true });
  res.cookies.set(COOKIE, '', { httpOnly: true, sameSite: 'lax', path: '/', maxAge: 0 });

  try {
    const { url, anonKey } = getSupabaseEnv();
    const ssrClient = createServerClient(url, anonKey, {
      cookies: {
        getAll() {
          return req.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value, options }) => {
            res.cookies.set(name, value, { ...options, path: '/', maxAge: 0 });
          });
        },
      },
    });
    await ssrClient.auth.signOut();
  } catch (err) {
    console.warn('[logout] Supabase signOut notice:', err);
  }

  return res;
}
