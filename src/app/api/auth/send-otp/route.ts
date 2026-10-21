import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/wa-auth/supabase';
import { hashOtp, newOtp } from '@/lib/wa-auth/crypto';
import { isValidEmail, isValidMobile, normalizeMobile } from '@/lib/wa-auth/phone';
import { otpMessage, sendWhatsApp } from '@/lib/wa-auth/worker';

export const runtime = 'nodejs';
const COOLDOWN_S = 30;

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  if (!isValidMobile(body.mobile)) {
    return NextResponse.json({ error: 'Please enter a valid 10-digit mobile number.' }, { status: 400 });
  }
  const mobile = normalizeMobile(body.mobile);
  const name = typeof body.name === 'string' ? body.name.trim().slice(0, 80) || null : null;
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() || null : null;
  if (email && !isValidEmail(email)) {
    return NextResponse.json({ error: 'Please enter a valid email address.' }, { status: 400 });
  }

  const code = newOtp();
  const { data: issued, error } = await db().rpc('wa_issue_otp', {
    p_mobile: mobile,
    p_code_hash: hashOtp(mobile, code),
    p_ttl_seconds: 300,
    p_cooldown_seconds: COOLDOWN_S,
    p_name: name,
    p_email: email,
  });

  if (error) {
    console.error('[wa-auth] wa_issue_otp', error.message);
    return NextResponse.json({ error: 'Could not start verification.' }, { status: 500 });
  }
  if (!issued) {
    return NextResponse.json({ error: `Please wait ${COOLDOWN_S} seconds before requesting another code.` }, { status: 429 });
  }

  if (process.env.WA_AUTH_DEV_LOG_OTP === 'true' && process.env.NODE_ENV !== 'production') {
    console.log(`[wa-auth][dev] OTP for ${mobile}: ${code}`);
  }

  const sent = await sendWhatsApp(mobile, otpMessage(code, name));
  if (!sent.ok) {
    console.error('[wa-auth] WhatsApp send failed:', sent.error);
    return NextResponse.json({ error: 'Could not deliver the code on WhatsApp. Try again shortly.' }, { status: 502 });
  }

  return NextResponse.json({
    success: true,
    expiresInSeconds: 300,
    resendAfterSeconds: COOLDOWN_S,
    devOtp: process.env.NODE_ENV !== 'production' && process.env.WA_AUTH_DEV_LOG_OTP === 'true' ? code : undefined,
  });
}
