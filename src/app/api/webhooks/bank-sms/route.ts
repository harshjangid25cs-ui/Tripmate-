export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

import crypto from "crypto";
import { NextResponse, type NextRequest } from "next/server";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { parseStrictBankMessage } from "@/lib/payments/bank-parser";

function verifySecret(received: string | null, expected: string): boolean {
  if (!received) return false;
  try {
    const bufReceived = Buffer.from(received.trim(), "utf-8");
    const bufExpected = Buffer.from(expected.trim(), "utf-8");
    if (bufReceived.length !== bufExpected.length) return false;
    return crypto.timingSafeEqual(bufReceived, bufExpected);
  } catch {
    return false;
  }
}

export async function POST(request: NextRequest) {
  const supabase = createAdminClient();

  // 1. Fetch expected secret from database pricing_config or fallback to env
  let expectedSecret = process.env.BANK_SMS_WEBHOOK_SECRET || "tm_internal_bank_secret_2026";
  try {
    const { data: config } = await supabase
      .from("pricing_config")
      .select("bank_webhook_secret")
      .eq("id", 1)
      .maybeSingle();

    if (config?.bank_webhook_secret) {
      expectedSecret = config.bank_webhook_secret;
    }
  } catch {
    // Fall back to default
  }

  // 2. Authenticate webhook caller
  const receivedSecret =
    request.headers.get("x-sms-secret") ||
    request.headers.get("x-webhook-secret") ||
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");

  if (!verifySecret(receivedSecret || null, expectedSecret)) {
    return NextResponse.json(
      { error: "Unauthorized: Invalid or missing SMS webhook secret" },
      { status: 401 }
    );
  }

  // 3. Parse input payload
  let rawBodyText = "";
  let sender = "";
  let receivedAt = "";

  try {
    const contentType = request.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      const json = (await request.json()) as {
        message?: string;
        body?: string;
        text?: string;
        sender?: string;
        receivedAt?: string;
        timestamp?: string | number;
        date?: string;
      };
      rawBodyText = json.message || json.body || json.text || "";
      sender = json.sender || "SMS Forwarder";
      const rawTimestamp = json.receivedAt || json.timestamp || json.date;
      if (rawTimestamp) {
        const parsed = new Date(rawTimestamp);
        receivedAt = !isNaN(parsed.getTime()) ? parsed.toISOString() : new Date().toISOString();
      } else {
        receivedAt = new Date().toISOString();
      }
    } else {
      rawBodyText = await request.text();
      sender = "SMS Forwarder";
      receivedAt = new Date().toISOString();
    }
  } catch {
    return NextResponse.json({ error: "Failed to read request body" }, { status: 400 });
  }

  if (!rawBodyText.trim()) {
    return NextResponse.json({ error: "Empty message payload" }, { status: 400 });
  }

  // 4. Strict Bank-Only Gatekeeper Check
  const parseResult = parseStrictBankMessage({
    channel: "sms",
    sender,
    body: rawBodyText,
  });

  if (!parseResult.isBankMessage) {
    // Non-bank noise (OTP, personal text, debit) is silently ignored and NEVER stored in DB
    return NextResponse.json({
      ok: true,
      skipped: true,
      reason: parseResult.reason || "Non-bank message ignored",
    });
  }

  // 5. Ingest authentic bank payment credit
  try {
    const { data: rpcRes, error: rpcErr } = await (
      supabase.rpc as unknown as (fn: string, args: Record<string, unknown>) => Promise<{
        data: Record<string, unknown> | null;
        error: { message: string } | null;
      }>
    )("ingest_bank_payment_message", {
      p_channel: "sms",
      p_sender: parseResult.sender || "Bank SMS",
      p_subject: null,
      p_raw_body: parseResult.rawBody,
      p_amount: parseResult.amount!,
      p_utr_number: parseResult.utrNumber!,
      p_payer_vpa: parseResult.payerVpa || null,
      p_extracted_trip_ref: parseResult.tripRef || null,
      p_received_at: receivedAt,
    });

    if (rpcErr) {
      return NextResponse.json(
        { error: `Database ingestion error: ${rpcErr.message}` },
        { status: 500 }
      );
    }

    revalidatePath("/admin");
    revalidatePath("/admin?tab=payments");

    return NextResponse.json({
      ok: true,
      data: rpcRes,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
