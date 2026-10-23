import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { db } from '@/lib/wa-auth/supabase';
import { hashOtp } from '@/lib/wa-auth/crypto';
import { isValidMobile, normalizeMobile } from '@/lib/wa-auth/phone';
import { createSession } from '@/lib/wa-auth/session';
import { getSupabaseEnv } from '@/lib/supabase/env';

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
    p_mobile: mobile,
    p_code_hash: hashOtp(mobile, otp),
    p_max_attempts: 5
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

  // 1. Find-or-create customer in wa_customers
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
    const row = {
      mobile,
      name: result.name ?? null,
      email: result.email ?? null,
      is_phone_verified: true,
      last_login_at: now
    };
    let insErr = (await db().from('wa_customers').insert(row)).error;
    if (insErr?.code === '23505') {
      // Concurrent signup won the race or email collision: fallback without email
      insErr = (await find()) ? null : (await db().from('wa_customers').insert({ ...row, email: null })).error;
    }
    if (insErr) {
      console.error('[wa-auth] create customer', insErr.message);
      return NextResponse.json({ error: 'Could not create account.' }, { status: 500 });
    }
    customer = await find();
  }
  if (!customer) {
    return NextResponse.json({ error: 'Could not create account.' }, { status: 500 });
  }

  const cleanPhone = mobile;
  const syntheticEmail = `${cleanPhone}@phone.tripmate.in`;
  const rawBodyName = typeof body.name === 'string' ? body.name.trim() : '';
  const rawResultName = typeof result.name === 'string' ? result.name.trim() : '';
  const rawCustomerName = typeof customer.name === 'string' ? customer.name.trim() : '';
  const fallbackName = rawBodyName || rawCustomerName || rawResultName || 'Verified Traveler';
  const adminClient = db();

  // 2. Cryptographic Server-Side Session Bridge (ZERO dummy passwords!)
  // Ensure user exists in auth.users
  const { error: createErr } = await adminClient.auth.admin.createUser({
    email: syntheticEmail,
    email_confirm: true,
    user_metadata: {
      full_name: fallbackName,
      phone: cleanPhone,
      auth_provider: 'whatsapp_otp'
    }
  });
  if (createErr && !createErr.message?.toLowerCase().includes('already')) {
    console.warn('[wa-auth] createUser notice:', createErr.message);
  }

  // Generate single-use cryptographic token_hash via Supabase Admin
  const { data: linkData, error: linkError } = await adminClient.auth.admin.generateLink({
    type: 'magiclink',
    email: syntheticEmail
  });

  if (linkError || !linkData?.properties?.hashed_token) {
    console.error('[wa-auth] generateLink error:', linkError);
    return NextResponse.json({ error: 'Could not generate session token.' }, { status: 500 });
  }

  const tokenHash = linkData.properties.hashed_token;

  // 3. Prepare outgoing response and wire @supabase/ssr client to set real JWT cookies
  const res = NextResponse.json({
    success: true,
    customer: {
      id: customer.id,
      name: fallbackName,
      email: customer.email || syntheticEmail,
      mobile: customer.mobile
    }
  });

  const { url, anonKey } = getSupabaseEnv();
  const ssrClient = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return req.cookies.getAll();
      },
      setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
        cookiesToSet.forEach(({ name, value, options }) => {
          res.cookies.set(name, value, {
            ...options,
            path: options?.path || '/',
            sameSite: options?.sameSite || 'lax',
            secure: process.env.NODE_ENV === 'production',
            httpOnly: options?.httpOnly ?? true
          });
        });
      }
    }
  });

  const { data: sessionData, error: verifyError } = await ssrClient.auth.verifyOtp({
    token_hash: tokenHash,
    type: 'magiclink'
  });

  if (verifyError || !sessionData?.session || !sessionData?.user) {
    console.error('[wa-auth] verifyOtp session error:', verifyError);
    return NextResponse.json({ error: 'Authentication session generation failed.' }, { status: 500 });
  }

  const authUserId = sessionData.user.id;

  // 4. Invalidate credentials for pre-registered synthetic account so it can NEVER be accessed via password
  const randomUnguessableSecret = crypto.randomUUID() + crypto.randomUUID();
  const { error: invalidateErr } = await adminClient.auth.admin.updateUserById(authUserId, {
    password: randomUnguessableSecret,
    email_confirm: true
  });
  if (invalidateErr) {
    console.warn('[wa-auth] Invalidate credentials notice:', invalidateErr.message);
  }

  // 5. Synchronize public.profiles, strictly preserving existing profile name & KYC Vault
  const { data: existingProfile } = await adminClient
    .from('profiles')
    .select('full_name, saved_id_type, saved_id_storage_path, saved_id_file_size_bytes, saved_id_verified, saved_id_updated_at, saved_companions')
    .eq('id', authUserId)
    .maybeSingle();

  // Name Precedence: An existing customized profile name is NEVER overwritten by a login fallback
  const existingName = existingProfile?.full_name?.trim();
  const hasCustomizedProfileName = Boolean(
    existingName &&
    existingName !== 'Verified Traveler' &&
    existingName !== 'Traveler' &&
    existingName !== 'TripMate Explorer'
  );

  const resolvedFullName = hasCustomizedProfileName
    ? existingName!
    : fallbackName;

  const profileUpsert = {
    id: authUserId,
    email: sessionData.user.email || syntheticEmail,
    full_name: resolvedFullName,
    phone: cleanPhone,
    updated_at: now,
    // Preserve any existing KYC ID Vault fields
    saved_id_type: existingProfile?.saved_id_type ?? null,
    saved_id_storage_path: existingProfile?.saved_id_storage_path ?? null,
    saved_id_file_size_bytes: existingProfile?.saved_id_file_size_bytes ?? null,
    saved_id_verified: existingProfile?.saved_id_verified ?? false,
    saved_id_updated_at: existingProfile?.saved_id_updated_at ?? null,
    saved_companions: existingProfile?.saved_companions ?? null
  };

  const { error: profileErr } = await adminClient
    .from('profiles')
    .upsert(profileUpsert, { onConflict: 'id' });

  if (profileErr) {
    console.error('[wa-auth] Profile sync error:', profileErr.message);
  }

  // 6. Update wa_customers with auth_user_id link and verify error
  const { error: waUpdateErr } = await adminClient
    .from('wa_customers')
    .update({
      auth_user_id: authUserId,
      name: resolvedFullName,
      is_phone_verified: true,
      last_login_at: now
    })
    .eq('id', customer.id);

  if (waUpdateErr) {
    console.error('[wa-auth] Failed to link wa_customers to auth_user_id:', waUpdateErr.message);
  }

  // Set wa_session cookie for complete dual backward compatibility
  await createSession(customer.id, req, res);

  return res;
}
