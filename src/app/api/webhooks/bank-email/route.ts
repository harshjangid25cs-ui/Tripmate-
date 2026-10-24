export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

import { NextResponse, type NextRequest } from "next/server";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { parseStrictBankMessage } from "@/lib/payments/bank-parser";

import {
  extractIncomingSecret,
  getAllowedSecrets,
  isValidWebhookSecret,
} from "@/lib/payments/webhook-auth";

export async function GET(request: NextRequest) {
  const supabase = createAdminClient();
  const allowedSecrets = await getAllowedSecrets(supabase);
  const receivedSecret = extractIncomingSecret(request);

  if (!isValidWebhookSecret(receivedSecret, allowedSecrets)) {
    return NextResponse.json(
      { error: "Unauthorized: Invalid or missing email webhook secret" },
      { status: 401 }
    );
  }

  return NextResponse.json({
    ok: true,
    status: "TripMate Bank Email Webhook Online",
  });
}

export async function POST(request: NextRequest) {
  const supabase = createAdminClient();
  const allowedSecrets = await getAllowedSecrets(supabase);

  // 1. Parse input payload
  let rawBodyText = "";
  let subject = "";
  let sender = "";
  let receivedAt = "";
  let parsedBody: Record<string, unknown> | null = null;

  try {
    const contentType = request.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      const json = (await request.json()) as {
        subject?: string;
        body?: string;
        text?: string;
        raw?: string;
        sender?: string;
        from?: string;
        receivedAt?: string;
        timestamp?: string | number;
        date?: string;
        secret?: string;
        token?: string;
        key?: string;
      };
      parsedBody = json as Record<string, unknown>;
      subject = json.subject || "";
      rawBodyText = json.body || json.text || json.raw || "";
      sender = json.sender || json.from || "Bank Email Forwarder";
      const rawTimestamp = json.receivedAt || json.timestamp || json.date;
      if (rawTimestamp) {
        const parsed = new Date(rawTimestamp);
        receivedAt = !isNaN(parsed.getTime()) ? parsed.toISOString() : new Date().toISOString();
      } else {
        receivedAt = new Date().toISOString();
      }
    } else {
      rawBodyText = await request.text();
      sender = "Bank Email Forwarder";
      receivedAt = new Date().toISOString();
    }
  } catch {
    return NextResponse.json({ error: "Failed to read request body" }, { status: 400 });
  }

  // 2. Flexible Secret Verification
  const receivedSecret = extractIncomingSecret(request, parsedBody);

  if (!isValidWebhookSecret(receivedSecret, allowedSecrets)) {
    return NextResponse.json(
      { error: "Unauthorized: Invalid or missing email webhook secret" },
      { status: 401 }
    );
  }

  if (!rawBodyText.trim() && !subject.trim()) {
    return NextResponse.json({ error: "Empty email payload" }, { status: 400 });
  }

  // 4. Strict Bank-Only Gatekeeper Check
  const parseResult = parseStrictBankMessage({
    channel: "gmail",
    sender,
    subject,
    body: rawBodyText,
  });

  if (!parseResult.isBankMessage) {
    // Returns HTTP 422 so Google Apps Script logs the exact reason and does NOT falsely mark as read
    return NextResponse.json(
      {
        ok: false,
        skipped: true,
        reason: parseResult.reason || "Non-bank email ignored by gatekeeper",
      },
      { status: 422 }
    );
  }

  // 5. Ingest authentic bank payment credit
  try {
    const { data: rpcRes, error: rpcErr } = await (
      supabase.rpc as unknown as (fn: string, args: Record<string, unknown>) => Promise<{
        data: Record<string, unknown> | null;
        error: { message: string } | null;
      }>
    )("ingest_bank_payment_message", {
      p_channel: "gmail",
      p_sender: parseResult.sender || "Bank / FamPay Gmail",
      p_subject: parseResult.subject || null,
      p_raw_body: parseResult.rawBody,
      p_amount: parseResult.amount!,
      p_utr_number: parseResult.utrNumber!,
      p_payer_vpa: parseResult.payerVpa || null,
      p_extracted_trip_ref: parseResult.tripRef || null,
      p_received_at: receivedAt,
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
            channel: "gmail",
            sender: parseResult.sender || "Bank / FamPay Gmail",
            subject: parseResult.subject || null,
            raw_body: parseResult.rawBody,
            amount: parseResult.amount!,
            utr_number: cleanUtr,
            payer_vpa: parseResult.payerVpa || null,
            extracted_trip_ref: parseResult.tripRef || null,
            created_at: receivedAt || new Date().toISOString(),
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
    }

    revalidatePath("/admin");
    revalidatePath("/admin?tab=payments");

    return NextResponse.json({
      ok: true,
      data: finalData,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ ok: false, error: message }, { status: 422 });
  }
}
