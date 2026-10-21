import { NextRequest, NextResponse } from 'next/server';
import { COOKIE, revokeSession, tokenFrom } from '@/lib/wa-auth/session';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const token = tokenFrom(req);
  if (token) await revokeSession(token);
  const res = NextResponse.json({ success: true });
  res.cookies.set(COOKIE, '', { httpOnly: true, sameSite: 'lax', path: '/', maxAge: 0 });
  return res;
}
