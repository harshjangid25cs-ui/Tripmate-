# WhatsApp OTP auth: extracted from youpi-pg/YouPI-PG

Phone-number login where the 6-digit code arrives on WhatsApp. Three pieces:

| Piece | Where | Runs on |
|---|---|---|
| WhatsApp worker (holds the linked-device socket, exposes `POST /send`) | `worker/` | **A persistent host** (VPS, Railway, Fly, Render). Not Vercel/serverless. |
| Auth API + session helpers | `next/` | Your Next.js app |
| Tables + atomic OTP functions | `supabase/migrations/001_wa_auth.sql` | Supabase |

```
browser ──> Next /api/auth/send-otp ──> Supabase wa_issue_otp()  (hash stored, 30s cooldown)
                                   └──> worker POST /send ──> WhatsApp
browser ──> Next /api/auth/verify-otp ─> Supabase wa_verify_otp() (row-locked, 5 attempts)
                                   └──> wa_customers upsert + wa_sessions row + httpOnly cookie
```

## Setup
1. Run the SQL migration (Supabase SQL editor or `supabase db push`).
2. Copy `next/lib/wa-auth`, `next/app/api/auth`, `next/components/WhatsAppLogin.tsx` into your app (the `@/` alias is assumed). `npm i @supabase/supabase-js server-only`.
3. Fill `.env.example` into `.env.local`.
4. Deploy `worker/` (`npm i && node src/server.js`) with `WORKER_SECRET`, and **persist `WA_DATA_DIR`**, since it holds the WhatsApp credentials.
5. Link a WhatsApp number once (use a dedicated number, not your personal one):
   ```
   curl -X POST -H "Authorization: Bearer $WORKER_SECRET" -H 'content-type: application/json' \
        -d '{"phone":"9XXXXXXXXX"}' http://HOST:4100/link/pairing-code      # 8-digit code
   # or: POST /link/qr, then GET /status → qrDataUrl
   ```
   Enter the code in WhatsApp → Linked devices → Link with phone number. Check with `GET /status`.
6. In protected route handlers: `const customer = await getCustomer(req)` (from `lib/wa-auth/session`).

## What changed vs. the original
- SQLite/`@youpi/*` monorepo → Supabase + Next route handlers; hardcoded `D:\...` module paths, simulated/test modes removed.
- OTP is stored as an HMAC (original: encrypted at rest); session tokens hashed (same idea as the original's blind index).
- Attempt budget and resend cooldown are enforced **inside Postgres under a row lock**. The original's in-memory maps don't work on serverless and its attempt counter was only safe because SQLite was single-threaded.
- Send failures now return 502 (original returned success even if WhatsApp wasn't connected). `devOtp` response field dropped; dev logging is opt-in and disabled in production.
- Dropped: `check-user` (account-existence/masked-email lookup, an enumeration vector), password register/login, device fingerprinting, ban pipeline (only `status = 'BANNED'` is honoured).
- Email/name on signup are optional and ride on the challenge row.

## Caveats you should know
- **Unofficial WhatsApp access.** `berryprotocol` drives WhatsApp as a linked device. That is outside WhatsApp's Business Platform terms, and the number can be banned, especially if someone bombs your OTP endpoint. For anything with real users, the official WhatsApp Cloud API (authentication-template messages) is the safe route; only `worker/src/whatsapp.js` `send()` would need replacing.
- **No licence in the source repo.** The README points to a `LICENSE` file that doesn't exist, so the code is all-rights-reserved by default. This package is a rewrite of the logic, but `worker/src/whatsapp.js` follows the original closely; get permission from the maintainers or reimplement before shipping commercially.
- **Not tested end to end.** Verified: worker boots, auth-gates, refuses to send when unlinked; SQL and plpgsql parse; TypeScript compiles clean. Not verified: actually linking WhatsApp and delivering a message (needs a phone and network access to WhatsApp), and the SQL running on a live Postgres.
- Add **per-IP rate limiting** on `send-otp` (Upstash/Vercel Firewall). The DB only limits per number.
- India-only number rules (`phone.ts`), inherited from the original.
- These are custom sessions, so `auth.uid()` in RLS won't see them; reads go through the service role in your route handlers. If you want native Supabase sessions + RLS, use Supabase phone auth with a **Send SMS Hook** that calls this worker's `/send`.
