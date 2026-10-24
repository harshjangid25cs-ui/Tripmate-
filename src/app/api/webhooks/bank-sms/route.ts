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

async function resolveExpectedSecret(supabase: ReturnType<typeof createAdminClient>): Promise<string> {
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
  return expectedSecret;
}

export async function GET(request: NextRequest) {
  const supabase = createAdminClient();
  const expectedSecret = await resolveExpectedSecret(supabase);

  const receivedSecret =
    request.nextUrl.searchParams.get("secret") ||
    request.headers.get("x-sms-secret") ||
    request.headers.get("x-webhook-secret") ||
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");

  if (!verifySecret(receivedSecret || null, expectedSecret)) {
    return NextResponse.json(
      { error: "Unauthorized: Invalid or missing SMS webhook secret" },
      { status: 401 }
    );
  }

  return NextResponse.json({
    ok: true,
    status: "TripMate Bank SMS Webhook Online",
  });
}

export async function POST(request: NextRequest) {
  const supabase = createAdminClient();
  const expectedSecret = await resolveExpectedSecret(supabase);

  // 1. Read raw body text safely
  let rawBodyText = "";
  try {
    rawBodyText = await request.text();
  } catch {
    return NextResponse.json({ error: "Failed to read request body" }, { status: 400 });
  }

  // 2. Parse JSON or fallback to raw text (for MacroDroid or unescaped newlines)
  let message = "";
  let sender = request.nextUrl.searchParams.get("sender") || "";
  let receivedAt = "";
  let bodySecret: string | null = null;

  if (rawBodyText.trim()) {
    try {
      const json = JSON.parse(rawBodyText);
      if (json && typeof json === "object") {
        sender =
          json.sender ||
          json.from ||
          json.address ||
          request.nextUrl.searchParams.get("sender") ||
          "BANK-SMS";
        message =
          json.message ||
          json.text ||
          json.body ||
          json.sms ||
          json.content ||
          "";
        bodySecret = json.secret || json.key || null;
        const rawTimestamp = json.receivedAt || json.timestamp || json.date;
        if (rawTimestamp) {
          const parsed = new Date(rawTimestamp);
          receivedAt = !isNaN(parsed.getTime()) ? parsed.toISOString() : new Date().toISOString();
        } else {
          receivedAt = new Date().toISOString();
        }
      }
    } catch {
      // MacroDroid or raw text with unescaped quotes/newlines
      message = rawBodyText.trim();
      sender = request.nextUrl.searchParams.get("sender") || "BANK-SMS";
      receivedAt = new Date().toISOString();
    }
  }

  if (!sender) {
    sender = "BANK-SMS";
  }
  if (!receivedAt) {
    receivedAt = new Date().toISOString();
  }

  // 3. Flexible Secret Verification (Header, Query Param ?secret=, or JSON body)
  const receivedSecret =
    request.headers.get("x-sms-secret") ||
    request.headers.get("x-webhook-secret") ||
    request.nextUrl.searchParams.get("secret") ||
    bodySecret ||
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");

  if (!verifySecret(receivedSecret || null, expectedSecret)) {
    return NextResponse.json(
      { error: "Unauthorized: Invalid or missing SMS webhook secret" },
      { status: 401 }
    );
  }

  if (!message.trim()) {
    return NextResponse.json({ error: "Empty message payload" }, { status: 400 });
  }

  // 4. Strict Bank-Only Gatekeeper Check
  const parseResult = parseStrictBankMessage({
    channel: "sms",
    sender,
    body: message,
  });

  if (!parseResult.isBankMessage) {
    // Returns HTTP 422 so forwarder app logs the exact reason and does not falsely mark as processed
    return NextResponse.json(
      {
        ok: false,
        skipped: true,
        reason: parseResult.reason || "Non-bank message ignored by gatekeeper",
      },
      { status: 422 }
    );
  }

  // 5. Ingest authentic bank payment credit
  try {
    const nowIso = new Date().toISOString();
    const effectiveReceivedAt = receivedAt || nowIso;

    const { data: rpcRes, error: rpcErr } = await (
      supabase.rpc as unknown as (fn: string, args: Record<string, unknown>) => Promise<{
        data: Record<string, unknown> | null;
        error: { message: string } | null;
      }>
    )("ingest_bank_payment_message", {
      p_channel: "sms",
      p_sender: parseResult.sender || sender || "Bank SMS",
      p_subject: null,
      p_raw_body: parseResult.rawBody,
      p_amount: parseResult.amount!,
      p_utr_number: parseResult.utrNumber!,
      p_payer_vpa: parseResult.payerVpa || null,
      p_extracted_trip_ref: parseResult.tripRef || null,
      p_received_at: effectiveReceivedAt,
    });

    let finalData = rpcRes;

    // Direct fallback upsert if RPC returns error
    if (rpcErr) {
      console.warn("ingest_bank_payment_message RPC failed, executing direct upsert fallback:", rpcErr);
      const cleanUtr = (parseResult.utrNumber || "").trim();
      const { data: upsertData, error: upsertErr } = await supabase
        .from("bank_messages_inbox")
        .upsert(
          {
            channel: "sms",
            sender: parseResult.sender || sender || "Bank SMS",
            subject: null,
            raw_body: parseResult.rawBody,
            amount: parseResult.amount!,
            utr_number: cleanUtr,
            payer_vpa: parseResult.payerVpa || null,
            extracted_trip_ref: parseResult.tripRef || null,
            created_at: nowIso,
          },
          { onConflict: "utr_number" }
        )
        .select()
        .single();

      if (upsertErr) {
        return NextResponse.json(
          {
            ok: false,
            error: `Database ingestion error: RPC (${rpcErr.message}) & Upsert (${upsertErr.message})`,
          },
          { status: 422 }
        );
      }
      finalData = { ...upsertData, fallback_upsert: true };
    } else {
      // Explicitly update created_at to nowIso, sender, and raw_body so repeated re-tests jump to Row #1
      await (supabase.from("bank_messages_inbox") as unknown as {
        update: (payload: Record<string, unknown>) => {
          eq: (col: string, val: string) => Promise<{ data: unknown; error: unknown }>;
        };
      })
        .update({
          created_at: nowIso,
          sender: parseResult.sender || sender || "Bank SMS",
          raw_body: parseResult.rawBody,
        })
        .eq("utr_number", parseResult.utrNumber!);
    }

    revalidatePath("/admin");
    revalidatePath("/admin?tab=payments");

    return NextResponse.json({
      ok: true,
      data: finalData,
    });
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ ok: false, error: errorMessage }, { status: 422 });
  }
}

