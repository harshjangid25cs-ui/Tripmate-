import 'server-only';
import type { NextRequest, NextResponse } from 'next/server';
import { db } from './supabase';
import { hashToken, newSessionToken } from './crypto';

export const COOKIE = 'wa_session';
const TTL_DAYS = 30;

export type WaCustomer = {
  id: string;
  mobile: string;
  name: string | null;
  email: string | null;
  status: string;
  is_phone_verified: boolean;
  last_login_at: string | null;
};

export function tokenFrom(req: NextRequest): string | null {
  const h = req.headers.get('authorization') || '';
  if (h.startsWith('Bearer ')) return h.slice(7).trim() || null;
  return req.cookies.get(COOKIE)?.value || null;
}

export async function createSession(customerId: string, req: NextRequest, res: NextResponse) {
  const token = newSessionToken();
  const expires = new Date(Date.now() + TTL_DAYS * 864e5);
  const { error } = await db().from('wa_sessions').insert({
    customer_id: customerId,
    token_hash: hashToken(token),
    expires_at: expires.toISOString(),
    ip_address: req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || null,
    user_agent: req.headers.get('user-agent'),
  });
  if (error) throw error;
  res.cookies.set(COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: TTL_DAYS * 86400,
  });
  return token;
}

/** Returns the signed-in customer or null. Call from route handlers. */
export async function getCustomer(req: NextRequest): Promise<WaCustomer | null> {
  const token = tokenFrom(req);
  if (!token) return null;
  return getCustomerByToken(token);
}

export async function getCustomerByToken(token: string): Promise<WaCustomer | null> {
  if (!token) return null;
  const { data: s } = await db()
    .from('wa_sessions')
    .select('customer_id, expires_at, revoked')
    .eq('token_hash', hashToken(token))
    .maybeSingle();

  if (!s || s.revoked || new Date(s.expires_at as string) <= new Date()) return null;
  const { data: c } = await db()
    .from('wa_customers')
    .select('*')
    .eq('id', s.customer_id as string)
    .maybeSingle();

  return c && c.status === 'ACTIVE' ? (c as unknown as WaCustomer) : null;
}

export async function revokeSession(token: string) {
  await db().from('wa_sessions').update({ revoked: true }).eq('token_hash', hashToken(token));
}
