import { describe, it, expect, beforeAll } from "vitest";
import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";

describe("Payment Confirmation RPC (confirm_payment_and_finalize_trip) Integration Suite", () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  const hasDb = Boolean(supabaseUrl && serviceRoleKey);
  const client = hasDb ? createClient(supabaseUrl!, serviceRoleKey!) : null;

  // 1. Static Contract & Migration Syntax Verification (Guaranteed in CI / Unit runner)
  describe("Migration 17 Static Verification", () => {
    const migrationPath = path.resolve(
      process.cwd(),
      "supabase/migrations/20261017000017_payment_confirmation_transaction.sql"
    );
    const sql = fs.readFileSync(migrationPath, "utf8");

    it("verifies row-level locking (SELECT ... FOR UPDATE) is enforced", () => {
      expect(sql).toContain("FOR UPDATE;");
      expect(sql).toContain("WHERE id = p_trip_id");
    });

    it("verifies amount validation against trip total is enforced", () => {
      expect(sql).toContain("round(p_amount, 2) <> round(v_trip.total_amount, 2)");
      expect(sql).toContain("Payment amount mismatch");
    });

    it("verifies idempotent payment insert with ON CONFLICT DO NOTHING", () => {
      expect(sql).toContain("ON CONFLICT (provider, provider_reference) DO NOTHING");
    });

    it("verifies invoice number generation from DB sequence (invoice_number_seq)", () => {
      expect(sql).toContain("nextval('invoice_number_seq')");
      expect(sql).toContain("ON CONFLICT (trip_id) DO NOTHING");
    });

    it("verifies already_processed flag is returned on duplicates", () => {
      expect(sql).toContain("'already_processed', true");
      expect(sql).toContain("'already_processed', false");
    });

    it("verifies security grants: revoked from public/anon/authenticated and granted to service_role", () => {
      expect(sql).toContain(
        "REVOKE ALL ON FUNCTION public.confirm_payment_and_finalize_trip(uuid, text, text, text, numeric, text) FROM PUBLIC, anon, authenticated;"
      );
      expect(sql).toContain(
        "GRANT EXECUTE ON FUNCTION public.confirm_payment_and_finalize_trip(uuid, text, text, text, numeric, text) TO service_role;"
      );
    });
  });

  const runLiveDb = Boolean(hasDb && process.env.RUN_DB_RPC_TESTS === "true");

  // 2. Real Database Integration Tests (Runs against live local Supabase or staging)
  describe.runIf(runLiveDb)("Real Database Transaction Tests", () => {
    let testTripId: string;
    const testAmount = 25000.0;

    beforeAll(async () => {
      if (!client) return;

      // Seed a test trip
      const { data: trip, error } = await client
        .from("trips")
        .insert({
          total_amount: testAmount,
          subtotal_amount: testAmount,
          currency: "INR",
          status: "draft",
          booking_kind: "normal",
        })
        .select("id")
        .single();

      if (error || !trip) {
        console.warn("Could not insert test trip for integration test:", error?.message);
        return;
      }
      testTripId = trip.id;
    });

    it("rejects payment when paid amount does not match trip total", async () => {
      if (!client || !testTripId) return;

      const wrongAmount = 15000.0;
      const { data, error } = await client.rpc("confirm_payment_and_finalize_trip", {
        p_trip_id: testTripId,
        p_provider: "razorpay",
        p_provider_reference: `pay_test_wrong_${Date.now()}`,
        p_method: "card",
        p_amount: wrongAmount,
        p_currency: "INR",
      });

      expect(error).toBeTruthy();
      expect(error?.message).toContain("Payment amount mismatch");
      expect(data).toBeFalsy();
    });

    it("same payment twice gives one payment and one invoice with already_processed=true on 2nd call", async () => {
      if (!client || !testTripId) return;

      const providerRef = `pay_test_idempotent_${Date.now()}`;

      // First confirmation call
      const { data: firstRes, error: firstErr } = await client.rpc(
        "confirm_payment_and_finalize_trip",
        {
          p_trip_id: testTripId,
          p_provider: "razorpay",
          p_provider_reference: providerRef,
          p_method: "card",
          p_amount: testAmount,
          p_currency: "INR",
        }
      );

      expect(firstErr).toBeNull();
      expect(firstRes).toBeTruthy();
      expect(firstRes.ok).toBe(true);
      expect(firstRes.already_processed).toBe(false);
      const invoiceNumber1 = firstRes.invoice_number;
      expect(invoiceNumber1).toMatch(/^INV-\d{4}-\d+/);

      // Second identical confirmation call
      const { data: secondRes, error: secondErr } = await client.rpc(
        "confirm_payment_and_finalize_trip",
        {
          p_trip_id: testTripId,
          p_provider: "razorpay",
          p_provider_reference: providerRef,
          p_method: "card",
          p_amount: testAmount,
          p_currency: "INR",
        }
      );

      expect(secondErr).toBeNull();
      expect(secondRes).toBeTruthy();
      expect(secondRes.ok).toBe(true);
      expect(secondRes.already_processed).toBe(true);
      expect(secondRes.invoice_number).toBe(invoiceNumber1);

      // Verify DB table counts: exactly 1 payment and 1 invoice
      const { count: paymentCount } = await client
        .from("payments")
        .select("*", { count: "exact", head: true })
        .eq("provider_reference", providerRef);
      expect(paymentCount).toBe(1);

      const { count: invoiceCount } = await client
        .from("invoices")
        .select("*", { count: "exact", head: true })
        .eq("trip_id", testTripId);
      expect(invoiceCount).toBe(1);
    });

    it("two concurrent calls serialize via row locking and return one stable invoice number", async () => {
      if (!client) return;

      // Seed a fresh trip for concurrency test
      const { data: concTrip } = await client
        .from("trips")
        .insert({
          total_amount: 30000.0,
          subtotal_amount: 30000.0,
          currency: "INR",
          status: "draft",
          booking_kind: "normal",
        })
        .select("id")
        .single();

      if (!concTrip) return;

      const providerRef = `pay_test_conc_${Date.now()}`;

      // Execute both simultaneous calls concurrently
      const [res1, res2] = await Promise.all([
        client.rpc("confirm_payment_and_finalize_trip", {
          p_trip_id: concTrip.id,
          p_provider: "razorpay",
          p_provider_reference: providerRef,
          p_method: "upi",
          p_amount: 30000.0,
          p_currency: "INR",
        }),
        client.rpc("confirm_payment_and_finalize_trip", {
          p_trip_id: concTrip.id,
          p_provider: "razorpay",
          p_provider_reference: providerRef,
          p_method: "upi",
          p_amount: 30000.0,
          p_currency: "INR",
        }),
      ]);

      expect(res1.error).toBeNull();
      expect(res2.error).toBeNull();
      expect(res1.data.ok).toBe(true);
      expect(res2.data.ok).toBe(true);

      // Exactly one must be fresh and one must be already_processed
      const alreadyProcessedFlags = [res1.data.already_processed, res2.data.already_processed];
      expect(alreadyProcessedFlags).toContain(false);
      expect(alreadyProcessedFlags).toContain(true);

      // Both must share the exact same stable invoice number
      expect(res1.data.invoice_number).toBe(res2.data.invoice_number);

      // Verify only 1 invoice exists in DB
      const { count: invoiceCount } = await client
        .from("invoices")
        .select("*", { count: "exact", head: true })
        .eq("trip_id", concTrip.id);
      expect(invoiceCount).toBe(1);
    });
  });
});
