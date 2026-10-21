import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/wa-auth/supabase';
import { hashOtp } from '@/lib/wa-auth/crypto';
import { isValidMobile, normalizeMobile } from '@/lib/wa-auth/phone';
import { createSession } from '@/lib/wa-auth/session';

export const runtime = 'nodejs';

const MESSAGES: Record<string, [number, string]> = {
  none: [400, 'No active code. Please request a new one.'],
  expired: [400, 'That code has expired. Please request a new one.'],
  locked: [429, 'Too many incorrect attempts. Please request a new code.'],
  invalid: [400, 'Incorrect code. Please check and try again.']
};

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const otp = String(body.otp ?? '').trim();
  if (!isValidMobile(body.mobile) || !/^\d{6}$/.test(otp)) {
    return NextResponse.json({ error: 'Mobile number and 6-digit code are required.' }, { status: 400 });
  }
  const mobile = normalizeMobile(body.mobile);

  const { data, error } = await db().rpc('wa_verify_otp', {
    p_mobile: mobile, p_code_hash: hashOtp(mobile, otp), p_max_attempts: 5
  });
  if (error) {
    console.error('[wa-auth] wa_verify_otp', error.message);
    return NextResponse.json({ error: 'Verification failed.' }, { status: 500 });
  }
  const result = data as { status: string; name?: string | null; email?: string | null };
  if (result.status !== 'ok') {
    const [status, message] = MESSAGES[result.status] ?? [400, 'Verification failed.'];
    return NextResponse.json({ error: message }, { status });
  }

  // Find-or-create (signup name/email were carried on the challenge).
  const now = new Date().toISOString();
  type Row = { id: string; name: string | null; email: string | null; mobile: string; status: string };
  const find = async () =>
    (await db().from('wa_customers').select('*').eq('mobile', mobile).maybeSingle()).data as Row | null;

  let customer = await find();
  if (customer) {
    if (customer.status === 'BANNED') {
      return NextResponse.json({ error: 'ACCESS BLOCKED', isBanned: true }, { status: 403 });
    }
    await db().from('wa_customers').update({ is_phone_verified: true, last_login_at: now }).eq('id', customer.id);
  } else {
    const row = { mobile, name: result.name ?? null, email: result.email ?? null, is_phone_verified: true, last_login_at: now };
    let insErr = (await db().from('wa_customers').insert(row)).error;
    if (insErr?.code === '23505') {
      // Concurrent signup won the race, or the email already belongs to someone else.
      insErr = (await find()) ? null : (await db().from('wa_customers').insert({ ...row, email: null })).error;
    }
    if (insErr) {
      console.error('[wa-auth] create customer', insErr.message);
      return NextResponse.json({ error: 'Could not create account.' }, { status: 500 });
    }
    customer = await find();
  }
  if (!customer) return NextResponse.json({ error: 'Could not create account.' }, { status: 500 });

  const res = NextResponse.json({
    success: true,
    customer: { id: customer.id, name: customer.name, email: customer.email, mobile: customer.mobile }
  });
  await createSession(customer.id, req, res);
  return res;
}
