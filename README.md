# 🧭 TripMate — Enterprise Travel & Mobility Platform

[![Next.js](https://img.shields.io/badge/Next.js-14.2%20App%20Router-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6%20Strict-3178C6?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL%2015%20%2B%20Realtime-3ECF8E?style=for-the-badge&logo=supabase)](https://supabase.com/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind%20CSS-3.4%20Flat%20Design-06B6D4?style=for-the-badge&logo=tailwindcss)](https://tailwindcss.com/)
[![Vitest Unit Tests](https://img.shields.io/badge/Unit%20Tests-134%2F134%20Passing-brightgreen?style=for-the-badge&logo=vitest)](https://vitest.dev/)
[![Playwright E2E Tests](https://img.shields.io/badge/E2E%20Tests-5%2F5%20Passing-brightgreen?style=for-the-badge&logo=playwright)](https://playwright.dev/)

> **TripMate** is a production-grade travel booking and fleet mobility platform built for Indian tourism circuits and corporate charter operations. Designed with a strict **100% solid flat color design system** (zero CSS gradients), end-to-end Supabase PostgreSQL 15 integration with live WebSocket synchronization, full-featured B2C/B2B flows, and a 14-tab Superadmin Master Control Suite.

---

## 🌟 Key Capabilities

### 1. B2C Custom Circuit & 7-Step Itinerary Engine
- **Curated Exploration (`/home`, `/destinations/[slug]`)**: Live catalog powered by Supabase with dynamic starting packages, regional filters, verified highlights carousels, and 48-hour free cancellation guarantees.
- **Interactive 7-Step Booking Flow**:
  1. **Duration & Dates (`/book/[tripId]/duration`)**: Real-time calendar range picker, guest stepper, and pricing estimate calculator.
  2. **Hotel Stays (`/book/[tripId]/hotel`)**: Curated heritage and luxury hotel inventory with dynamic room calculation formula: $\lceil \text{travellers} / 2 \rceil$ (or 1 room for solo travellers).
  3. **Vehicle Fleet (`/book/[tripId]/vehicle`)**: Sedan, SUV, EV, and two-wheeler rentals with transmission, fuel, and luggage configuration filters.
  4. **Highway Pitstops (`/book/[tripId]/stops`)**: Heritage and dining stopovers with automatic Drive-Time Advisories when travel exceeds 6 hours.
  5. **Review Draft (`/book/[tripId]/review`)**: Comprehensive day-by-day timeline preview, inclusions breakdown, and transparent pricing derived from database triggers (`recalc_trip_total`).
  6. **Traveller Details (`/book/[tripId]/travellers`)**: Contact validation (10-digit Indian mobile numbers), atomic roster upserts (`replace_trip_passengers` RPC), and direct document uploads to private Supabase Storage (`id-documents`).
  7. **Checkout & Lock (`/book/[tripId]/checkout`)**: 15-minute countdown price lock, real-time coupon code validation, and dual-mode payment gateway.
- **Post-Booking Digital Concierge (`/trips/[tripId]`)**:
  - Derived status indicators (*Upcoming*, *Ongoing*, *Completed*).
  - Chronological Day 1..N daily itinerary with designated chauffeur contacts.
  - Digital passenger boarding passes (`TKT-...`).
  - Formal GST Tax Invoice (`/trips/[tripId]/invoice`) with SAC code 998555, itemized CGST 9% + SGST 9%, and print-optimized stylesheets (`window.print()`).

### 2. B2B Corporate Charter Hub
- **Corporate Portal (`/commercial`)**: Enterprise hub highlighting corporate advantages, GST input tax credit (ITC) compliance, and charter logistics workflows.
- **Charter Setup (`/commercial/[tripId]/setup`)**: Headcount specification (up to 45 delegates), mandatory origin/destination routing, date schedules, and corporate event tagging.
- **Fleet Allocation & 2x2 Seating Grid (`/commercial/[tripId]/bus`)**:
  - Fleet options: Tempo Traveller (17 seats), Luxury Coach (32 seats), Volvo 9600 (45 seats).
  - Interactive SVG 2x2 bus cabin seat map with passenger seat assignments and real-time capacity checks.
- **Corporate Confirmation (`/commercial/[tripId]/confirmed`)**:
  - Auto-generated booking reference (`TM-######`).
  - Passenger ticket roster with individual QR verification modals and clipboard copy.
- **Public Boarding Pass Verification (`/tickets/[ticketCode]`)**:
  - Public, unauthenticated verification route for ground crew and passengers.
  - Displays booking validity, passenger name, route, bus details, and seat assignment without exposing sensitive customer PII or transaction pricing.

### 3. Live Superadmin Master Control Portal (`/admin`)
- **Secure Access Control**: Dedicated MFA/AAL2 authentication at `/admin/login`, supporting 5 operational roles (`super_admin`, `catalog_manager`, `ops_manager`, `finance_manager`, `support_agent`) with live perspective switching.
- **Real-Time WebSocket Synchronization**: Direct subscription to Supabase Realtime (`supabase_realtime`) across 14 operational views with zero mock fallbacks:
  1. **Dashboard**: High-level KPIs, booking velocity, active fleet dispatches, and pending action queues.
  2. **Destinations**: Catalog management with W1 Publish Readiness checklist validation modal.
  3. **Circuits / Trips**: Curated itineraries with strict validation ($\text{nights} = \text{days} - 1$) and inventory bindings.
  4. **Hotels**: Room inventory, night rates, star ratings, and location mappings.
  5. **Vehicles**: Fleet management, per-day rates, capacity limits, and transmission types.
  6. **Drivers & Chauffeurs**: Chauffeur dispatch management with role-based phone number masking.
  7. **Highway Stops**: Curated pitstops with per-person and flat pricing structures.
  8. **Pricing Formula Simulator**: Interactive pricing calculator testing base costs, service fees, and GST.
  9. **Coupons & Promotions**: Dynamic discount management with row-locked redemption tracking.
  10. **Bookings & Dispatch**: End-to-end trip operational control, chauffeur assignment, and multi-mode cancellation refunds.
  11. **ID Verification Queue**: KYC document review queue with secure 60-second expiring preview URLs and rejection code logging.
  12. **Corporate Approvals**: Commercial booking credit limit threshold verification and corporate dispatch review.
  13. **Customer & Corporate Accounts**: User status controls, password reset links, and GST ITC verification.
  14. **Communications & Finance**: Outbound email logs, payments ledger, invoice records, audit trail diff viewer, and 1-click CSV exports.
- **Direct Storage Uploads (`CatalogImageUpload.tsx`)**: Zero-friction drag-and-drop image uploader streaming media directly to the public `catalog-images` Supabase Storage bucket.

### 4. Plug-and-Play Razorpay Gateway, Resend Emails & KYC Legal Pages
- **Razorpay Orders & Webhook Engine**:
  - Production Razorpay integration via `@/lib/payments/razorpay.ts` and `@/lib/actions/razorpay.ts`.
  - Secure webhook endpoint at `/api/webhooks/razorpay` validating incoming signatures with **HMAC-SHA256**.
  - Automatic fallback to `DemoPaymentProvider` when live keys are not configured.
- **Resend Transactional Email Engine**:
  - Dispatches booking confirmations, cancellation notices, and corporate approval emails via Resend API (`@/lib/notifications/email.ts`).
  - Full audit logging of all outgoing emails in the `email_logs` PostgreSQL table.
- **Regulatory & KYC Legal Documentation**:
  - `/terms`: Comprehensive Terms of Service, booking policies, and user responsibilities.
  - `/privacy`: DPDP and GDPR compliant privacy guidelines detailing data protection and zero-ID-storage policies.
  - `/refund-policy`: Detailed 48-hour cancellation rules, refund tiers, and corporate charter terms.
  - `/contact`: Dedicated customer concierge channels, corporate office addresses, and grievance redressal officer details.

---

## 🏛️ ASCII System Architecture Diagram

```
+----------------------------------------------------------------------------------------------------+
|                                    CLIENT & EDGE LAYER                                            |
|                                                                                                    |
|    Next.js 14 App Router  *  React 18  *  Tailwind CSS Flat Tokens  *  Lucide Icons                |
|    Edge Middleware (`middleware.ts`)  *  Authentication Guard (`auth-guard.ts`)                   |
+----------------------------------------------------------------------------------------------------+
                                      |                                  |
                                      v                                  v
+---------------------------------------------+  +---------------------------------------------------+
|              CUSTOMER PORTAL                |  |           SUPERADMIN MASTER CONTROL               |
|                                             |  |                                                   |
|  * Curated Catalog (`/home`, `/destinations`)|  |  * Role Perspectives (Super, Ops, Catalog, etc.) |
|  * 7-Step Itinerary Builder (`/book/*`)     |  |  * 14 Operational Views (Dashboard, Bookings,    |
|  * B2B Corporate Charter Hub (`/commercial`)|  |    Catalog, Approvals, ID KYC, Audit Trail, etc.) |
|  * Digital Tickets & Invoices (`/trips/*`)  |  |  * Media Manager (`CatalogImageUpload.tsx`)       |
|  * Public Verification (`/tickets/*`)       |  |  * Live WebSockets (`supabase_realtime`)          |
+---------------------------------------------+  +---------------------------------------------------+
                       \                                                /
                        \                                              /
                         v                                            v
+----------------------------------------------------------------------------------------------------+
|                               SERVER ACTION & VALIDATION LAYER                                     |
|                                                                                                    |
|  * Next.js Server Actions (`/lib/actions/*.ts`)                                                    |
|  * Zod Schema Validation (`/lib/validations/actions.ts`)                                           |
|  * Razorpay HMAC-SHA256 Verification (`/api/webhooks/razorpay`)                                    |
|  * Resend Transactional Dispatcher (`/lib/notifications/email.ts`)                                 |
+----------------------------------------------------------------------------------------------------+
                                                  |
                                                  v
+----------------------------------------------------------------------------------------------------+
|                            SUPABASE POSTGRESQL 15 & REALTIME ENGINE                                |
|                                                                                                    |
|  +---------------------------+  +---------------------------+  +--------------------------------+  |
|  |     POSTGRES SCHEMA       |  |   SECURITY & ACCESS (RLS) |  |        STORAGE ENGINE          |  |
|  | * 22 Relational Tables    |  | * Row Level Security      |  | * catalog-images (Public Read) |  |
|  | * Pricing Triggers        |  | * Column-level Grants     |  | * id-documents (Private KYC)   |  |
|  | * `recalc_trip_total`     |  | * `public.is_admin_jwt()` |  +--------------------------------+  |
|  | * Status State Machines   |  | * Error 42501 Enforcement |  |       REALTIME ENGINE          |  |
|  | * Atomic RPC Functions    |  | * Scoped App Metadata     |  | * Two-Way WebSocket Broadcast  |  |
|  +---------------------------+  +---------------------------+  +--------------------------------+  |
+----------------------------------------------------------------------------------------------------+
```

---

## 🗄️ Database Schema & Migrations

The platform database runs on PostgreSQL 15 via Supabase, versioned across 13 sequential SQL migrations:

| # | Migration File | Scope & Major Entities Created | Key Functions & RPCs |
|---|---|---|---|
| **01** | `20261010000001_core_and_identity.sql` | `uuid-ossp`, `pgcrypto`, enums (`trip_status`, `booking_type`, `approval_status`), `profiles`, `admin_roles`, `audit_logs` | Identity triggers, `current_user_role` |
| **02** | `20261010000002_catalog.sql` | `destinations`, `destination_highlights`, `circuits`, `hotels`, `vehicles`, `stops`, `drivers`, `reviews` | Catalog indexes and slug foreign keys |
| **03** | `20261010000003_bookings_and_passengers.sql` | `trips`, `trip_passengers`, `trip_stops`, `commercial_bookings` | Booking sequencing, seat constraints |
| **04** | `20261010000004_payments_invoices_history_aux.sql` | `payments`, `invoices`, `saved_items`, `notifications` | Sequential `INV-YYYY-XXXXXX` generator |
| **05** | `20261010000005_triggers_and_pricing_pipeline.sql` | Automated price computation pipeline & updated timestamp triggers | `recalc_trip_total()`, dynamic GST & fee triggers |
| **06** | `20261010000006_rpc_functions.sql` | Core booking transaction functions | `demo_pay`, `cancel_booking`, `submit_commercial_booking`, `review_commercial_booking`, `get_ticket` |
| **07** | `20261010000007_rls_and_grants.sql` | Row-Level Security policies on all public tables & column-level privilege lockdown | RLS policies for `anon`, `authenticated`, `service_role` |
| **08** | `20261010000008_storage.sql` | Bucket creation & storage policies | Public `catalog-images`, private `${userId}/${tripId}/${passengerId}` `id-documents` |
| **09** | `20261015000009_atomic_passengers_rpc.sql` | Atomic passenger roster updates without partial state leaks | `replace_trip_passengers()` |
| **10** | `20261015000010_admin_ops_rpc.sql` | Administrative operations engine | `admin_dispatch_driver`, `admin_cancel_trip`, `admin_review_document`, `admin_review_commercial` |
| **11** | `20261015000011_admin_catalog_crud_rpc.sql` | Superadmin full catalog CRUD capabilities | `admin_upsert_destination`, `admin_upsert_circuit`, `admin_upsert_hotel`, `admin_upsert_vehicle`, `admin_upsert_driver`, `admin_upsert_stop` |
| **12** | `20261016000012_enable_realtime.sql` | Supabase Realtime publication setup | `supabase_realtime` publication, `REPLICA IDENTITY FULL` across live operational tables |
| **13** | `20261016000013_production_coupons_pricing_emails.sql` | Live coupons engine, dynamic pricing triggers, Resend email logs | `coupons`, `coupon_redemptions`, `email_logs`, `apply_coupon()`, Razorpay payment tracking |

---

## 🛡️ 4-Layer Defense-in-Depth Security Model

```
[Layer 1: Edge Middleware] -> [Layer 2: App Metadata Guard] -> [Layer 3: RLS & PostgREST 42501] -> [Layer 4: Atomic RPCs & Storage Sandbox]
```

1. **Layer 1: Edge Route Protection (`src/lib/auth-guard.ts` & `src/middleware.ts`)**
   - Intercepts requests before route execution.
   - Redirects unauthenticated visitors attempting to reach `/trips`, `/book/*`, `/profile`, or `/commercial` to `/login` with safe return parameters.
   - Restricts `/admin` paths to authorized administrative sessions and blocks public access to staging/testing tools (`/dev/*`) in production builds.

2. **Layer 2: Tamper-Proof `app_metadata` Role Enforcement**
   - **Vulnerability Prevention**: User profile `user_metadata` is client-writable in Supabase Auth. To eliminate privilege escalation risks, TripMate strictly ignores client-supplied metadata for authorization.
   - **Enforcement**: Administrative access queries only `auth.users.raw_app_meta_data->>'role'` or the dedicated `admin_roles` table populated exclusively via service-role operations and database migrations.

3. **Layer 3: `public.is_admin_jwt()` & PostgREST Lockdown (HTTP 42501)**
   - Database functions check caller claims via `public.is_admin_jwt()`.
   - Direct PostgREST or REST client tampering by unauthorized callers triggers an immediate PostgreSQL exception: `ERROR 42501 (insufficient_privilege)`.
   - Column-level privileges revoke direct UPDATE or DELETE access on financial columns (`total_amount`, `gst_amount`, `discount_amount`) from standard authenticated users.

4. **Layer 4: Atomic RPC Functions & KYC Storage Sandboxing**
   - Multi-row updates run inside single transactional RPCs (`replace_trip_passengers`, `demo_pay`, `apply_coupon`).
   - Traveller document uploads are sandboxed within the private `id-documents` bucket under `${userId}/${tripId}/${passengerId}.${ext}`.
   - **Strict Privacy Rule**: No government ID numbers (e.g. Aadhaar, Passport) are ever captured, logged, or persisted in the database.

---

## 📂 Repository Directory Structure

```text
tripmate/
├── .agents/                      # Agent customizations & Supabase skills
├── .env.example                  # Environment configuration template
├── .gitignore                    # Secrets & test artifacts exclusion
├── README.md                     # Production release documentation
├── e2e/                          # Playwright End-to-End test suite
│   ├── screenshots/              # Automated screenshot captures across flows
│   └── tripmate.spec.ts          # 5 acceptance suites (Happy path, B2B, KYC, Pricing, Admin)
├── memory-bank/                  # System context and milestone tracking
├── scripts/
│   └── check-gradients.js        # CI flat-color enforcement (zero-gradient validator)
├── src/
│   ├── app/                      # Next.js 14 App Router
│   │   ├── (flow)/               # Fullscreen booking flows (/destinations, /book)
│   │   ├── (main)/               # Authenticated shell layouts (/home, /trips, /commercial, /profile)
│   │   ├── (public)/             # Splash, onboarding carousel, login
│   │   ├── admin/                # Superadmin Master Control (/admin, /admin/login, /admin/[tab])
│   │   ├── api/webhooks/         # Razorpay HMAC-SHA256 webhook handler
│   │   ├── contact/              # Customer contact & registered entity details
│   │   ├── privacy/              # Privacy Policy (DPDP & GDPR compliance)
│   │   ├── refund-policy/        # 48-hour cancellation & refund terms
│   │   ├── terms/                # Terms of Service & booking conditions
│   │   └── tickets/              # Public unauthenticated boarding pass verification
│   ├── components/
│   │   ├── features/             # Domain feature components (home, booking, admin, profile, trips)
│   │   └── ui/                   # Flat solid UI primitives (Button, Card, Tabs, SeatGrid, etc.)
│   ├── lib/
│   │   ├── actions/              # Type-safe Server Actions (trips, admin-ops, razorpay, commercial)
│   │   ├── admin/                # Role matrix, mappers, and admin data providers
│   │   ├── data/                 # Catalog access layers & image resolvers
│   │   ├── notifications/        # Resend transactional email client
│   │   ├── payments/             # Razorpay & Demo payment providers
│   │   ├── supabase/             # Client, Server, and Service-Role Supabase singletons
│   │   ├── validations/          # Zod schemas for forms and server actions
│   │   └── __tests__/            # 10 Vitest test suites (134 unit tests)
│   └── types/
│       └── database.ts           # Generated Supabase PostgreSQL TypeScript types
├── supabase/
│   ├── migrations/               # 13 versioned SQL migrations
│   └── seed.sql                  # Initial catalog and test dataset
├── playwright.config.ts          # Playwright test configuration
├── tailwind.config.ts            # Flat solid design system tokens
└── vitest.config.ts              # Vitest test configuration
```

---

## ⚙️ Environment Configuration (`.env.local`)

Create a `.env.local` file in the repository root based on `.env.example`:

```bash
# -----------------------------------------------------------------------------
# Supabase Configuration
# -----------------------------------------------------------------------------
NEXT_PUBLIC_SUPABASE_URL="https://<your-project-id>.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="<your-supabase-anon-key>"
SUPABASE_SERVICE_ROLE_KEY="<your-supabase-service-role-key>"

# -----------------------------------------------------------------------------
# E2E Testing & Seed Credentials
# -----------------------------------------------------------------------------
DEMO_USER_PASSWORD="<your-demo-user-password>"

# -----------------------------------------------------------------------------
# Superadmin Authorization
# -----------------------------------------------------------------------------
ADMIN_EMAILS="admin@tripmate.io,tripmateoffical007@gmail.com"
NEXT_PUBLIC_ENABLE_DEMO_ADMIN="false"
COOKIE_SECURE="true"

# -----------------------------------------------------------------------------
# Razorpay Payment Gateway (Optional: falls back to DemoPaymentProvider)
# -----------------------------------------------------------------------------
NEXT_PUBLIC_RAZORPAY_KEY_ID="rzp_live_xxxxxxxxxxxxxx"
RAZORPAY_KEY_SECRET="xxxxxxxxxxxxxxxxxxxxxxxx"
RAZORPAY_WEBHOOK_SECRET="xxxxxxxxxxxxxxxxxxxxxxxx"

# -----------------------------------------------------------------------------
# Resend Transactional Emails (Optional: logs to database if unset)
# -----------------------------------------------------------------------------
RESEND_API_KEY="re_xxxxxxxxxxxxxxxxxxxxxxxx"
TRANSACTIONAL_FROM_EMAIL="TripMate Concierge <bookings@tripmate.in>"
```

---

## 🚦 The 5-Gate Production Verification Suite

TripMate enforces a strict 5-gate automated validation pipeline for every production release:

```bash
# Gate 1: Strict TypeScript Compilation (0 errors)
pnpm typecheck

# Gate 2: Code Linting & Flat Solid Design Enforcement (0 warnings, 0 gradients)
pnpm run lint

# Gate 3: Vitest Unit Test Suite (134/134 passing)
pnpm test

# Gate 4: Next.js Optimized Production Build (All routes valid)
pnpm build

# Gate 5: Playwright End-to-End Acceptance Suite (5/5 passing)
pnpm test:e2e
```

### Verification Suite Results

```text
 Gate 1: pnpm typecheck      -->  PASS  [0 errors]
 Gate 2: pnpm run lint       -->  PASS  [0 ESLint warnings, 0 prohibited gradients]
 Gate 3: pnpm test           -->  PASS  [10 test files, 134 passed (134)]
 Gate 4: pnpm build          -->  PASS  [20/20 static/dynamic routes compiled cleanly]
 Gate 5: pnpm test:e2e       -->  PASS  [5/5 acceptance suites passed (56.0s)]
```

---

## 📜 License

TripMate is proprietary enterprise software. All rights reserved. Licensed for production deployment under commercial enterprise terms.
