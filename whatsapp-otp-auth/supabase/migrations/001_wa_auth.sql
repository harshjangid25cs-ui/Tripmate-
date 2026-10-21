-- WhatsApp OTP auth (extracted from youpi-pg/YouPI-PG, adapted for Postgres/Supabase).
-- All tables are locked to the service role: RLS on, no policies, grants revoked.
-- Only your Next.js route handlers (service-role key) touch them.

create table if not exists public.wa_customers (
  id                uuid primary key default gen_random_uuid(),
  mobile            text not null unique check (mobile ~ '^[6-9][0-9]{9}$'),
  name              text,
  email             text unique,
  status            text not null default 'ACTIVE' check (status in ('ACTIVE','BANNED')),
  is_phone_verified boolean not null default false,
  last_login_at     timestamptz,
  created_at        timestamptz not null default now()
);

-- One live challenge per mobile. Code is stored as an HMAC, never in plaintext.
create table if not exists public.wa_otp_challenges (
  mobile        text primary key,
  code_hash     text not null,
  expires_at    timestamptz not null,
  attempts      int not null default 0,
  last_sent_at  timestamptz not null default now(),
  signup_name   text,
  signup_email  text
);

-- Session bearer tokens are stored hashed, so a DB leak cannot be replayed.
create table if not exists public.wa_sessions (
  id           uuid primary key default gen_random_uuid(),
  customer_id  uuid not null references public.wa_customers(id) on delete cascade,
  token_hash   text not null unique,
  expires_at   timestamptz not null,
  revoked      boolean not null default false,
  ip_address   text,
  user_agent   text,
  created_at   timestamptz not null default now()
);
create index if not exists wa_sessions_customer_idx on public.wa_sessions (customer_id);

alter table public.wa_customers       enable row level security;
alter table public.wa_otp_challenges  enable row level security;
alter table public.wa_sessions        enable row level security;
revoke all on public.wa_customers, public.wa_otp_challenges, public.wa_sessions from anon, authenticated;

-- Atomic issue + resend cooldown. Returns false if still inside the cooldown.
create or replace function public.wa_issue_otp(
  p_mobile text, p_code_hash text,
  p_ttl_seconds int default 300, p_cooldown_seconds int default 30,
  p_name text default null, p_email text default null
) returns boolean
language plpgsql security definer set search_path = public, pg_temp as $$
declare v_mobile text;
begin
  insert into public.wa_otp_challenges as c
    (mobile, code_hash, expires_at, attempts, last_sent_at, signup_name, signup_email)
  values
    (p_mobile, p_code_hash, now() + make_interval(secs => p_ttl_seconds), 0, now(), p_name, p_email)
  on conflict (mobile) do update
    set code_hash = excluded.code_hash, expires_at = excluded.expires_at, attempts = 0,
        last_sent_at = now(), signup_name = excluded.signup_name, signup_email = excluded.signup_email
    where c.last_sent_at <= now() - make_interval(secs => p_cooldown_seconds)
  returning c.mobile into v_mobile;
  return v_mobile is not null;
end $$;

-- Atomic verify. Row lock makes the attempt budget race-proof under concurrent requests
-- (the original relied on single-threaded sync SQLite for this).
create or replace function public.wa_verify_otp(
  p_mobile text, p_code_hash text, p_max_attempts int default 5
) returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
declare c public.wa_otp_challenges%rowtype;
begin
  select * into c from public.wa_otp_challenges where mobile = p_mobile for update;
  if not found then return jsonb_build_object('status','none'); end if;
  if c.expires_at < now() then
    delete from public.wa_otp_challenges where mobile = p_mobile;
    return jsonb_build_object('status','expired');
  end if;
  if c.attempts >= p_max_attempts then
    delete from public.wa_otp_challenges where mobile = p_mobile;
    return jsonb_build_object('status','locked');
  end if;
  if c.code_hash <> p_code_hash then
    update public.wa_otp_challenges set attempts = attempts + 1 where mobile = p_mobile;
    return jsonb_build_object('status','invalid');
  end if;
  delete from public.wa_otp_challenges where mobile = p_mobile;
  return jsonb_build_object('status','ok','name',c.signup_name,'email',c.signup_email);
end $$;

revoke all on function public.wa_issue_otp(text,text,int,int,text,text) from public, anon, authenticated;
revoke all on function public.wa_verify_otp(text,text,int)             from public, anon, authenticated;
grant execute on function public.wa_issue_otp(text,text,int,int,text,text) to service_role;
grant execute on function public.wa_verify_otp(text,text,int)             to service_role;

-- Optional housekeeping (pg_cron): delete from wa_sessions where expires_at < now() - interval '7 days';
