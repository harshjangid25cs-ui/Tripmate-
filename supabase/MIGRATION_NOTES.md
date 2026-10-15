# Migration notes

## v3 rebuild

- The v1/v2 migration set was deleted as explicitly requested because none was applied. The new source of truth is `md files/files/DATABASE.md` v3.
- `seed.sql` leaves all nullable image-path columns null: SCREENS.md identifies imagery but never specifies corresponding Storage object paths; inventing paths would violate the source-of-truth rule. No image was uploaded.
- Section 8 requests demo `profiles` linked to Auth users but supplies neither Auth UUIDs nor a permitted seeded Auth-user creation contract. `seed.sql` therefore cannot safely create those memberships; seed this after demo Auth accounts exist.

## Ambiguities and gaps in `DATABASE.md`

- `BUILD_PLAN.md` M1 asks for `seed.sql` and generated `database.ts`, while this task explicitly says not to create `supabase/seed.sql` and does not request generated types. No seed or generated types were written.
- The requested `memory-bank/progress.md` does not exist in this workspace. The repository’s actual progress file is `md files/progress.md`, and that file was updated instead.
- `DATABASE.md` requires all tables to use the standard UUID primary key convention, but `profiles` is the stated exception because its primary key is also its `auth.users` foreign key. This migration uses the documented `profiles.id` definition.
- `review_commercial_booking()` says the booking must be “pending”; the stored fields defined are `trips.status = 'pending_approval'` and `commercial_bookings.approval_status = 'pending'`. The implementation requires both.
- The requirement that commercial seats not exceed bus capacity is only specified for `submit_commercial_booking()`. It is not possible to express that cross-table condition as a normal CHECK constraint, so it is enforced by that function exactly as instructed.

## Postgres/Supabase risks

- `generate_booking_ref()` relies on a random six-digit reference and checks for existing values. Concurrent calls can still collide at the unique constraint. The safe production fix would be to retry the insert on `unique_violation`, or use a sequence; neither is specified in `DATABASE.md`.
- Ticket codes and demo provider references are randomly generated. Their unique constraint protects ticket codes, but a collision raises an error rather than retrying outside the internal ticket-code loop.
- `id-documents` storage policies validate only the first path segment as specified. They cannot verify that the supplied `trip_id` and `passenger_id` path segments belong to the caller without an additional storage helper function/policy rule, which is not specified.
- Security-definer trigger functions deliberately read catalog rows even when RLS is active. They overwrite client-supplied price values; their execute permissions are revoked from clients.
- No local runtime verification was possible: neither the Supabase CLI nor Docker is installed/available on this workstation. The migrations received static SQL and policy review only.

## Assumptions made

- `build_itinerary()` uses day 1 for hotel items when a commercial trip has no `start_date`; `DATABASE.md` allows `start_date` to be null on a draft but does not say whether commercial submission requires dates.
- Numeric money fields permit negative values where `DATABASE.md` does not provide a non-negative CHECK; no extra constraint was added.
- `id-documents` allowed MIME types use `image/jpeg`, `image/png`, and `application/pdf` as the standard MIME equivalents of “jpeg, png, pdf”.
- `catalog-images` receives an explicit public SELECT storage policy in addition to its public bucket setting; it does not permit client writes.

## v2 follow-up

- `20261009000011_database_v2.sql` adds forward-only non-negative checks for all 16 money columns defined in `DATABASE v2.md`, moves `trips.booking_ref` to `booking_ref_seq`, validates passenger document paths, and replaces the two affected RPC function definitions.
- Existing booking references that match `TMT-` plus six digits advance `booking_ref_seq` past the greatest existing numeric suffix. Existing references with another format are ignored when setting the sequence value; they remain valid because no format CHECK is defined in `DATABASE.md`.
- The `payments.provider_reference` column was already non-unique in the original migration. The v2 migration defensively removes a unique constraint involving that column if one exists, but does not remove an independently-created unique index because none exists in the migration history and its name/scope is not defined in `DATABASE.md`.
