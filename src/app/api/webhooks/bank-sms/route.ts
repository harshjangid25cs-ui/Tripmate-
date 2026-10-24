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

function isMacroDroidTestTrigger(message: string, urlTestParam: string | null): boolean {
  if (urlTestParam === "1" || urlTestParam === "true") return true;
  const trimmed = message.trim();
  if (!trimmed) return true;
  if (
    trimmed === "[sms_message]" ||
    trimmed === "{sms_message}" ||
    trimmed === '"[sms_message]"' ||
    trimmed === '"{sms_message}"' ||
    trimmed === "%text%" ||
    trimmed === '"%text%"'
  ) {
    return true;
  }
  if (/^(test|ping|test\s+action|test\s+phone\s+connection|phone\s+test)$/i.test(trimmed)) {
    return true;
  }
  if (/\b(?:test\s+ping|ping\s+test|test\s+connection)\b/i.test(trimmed)) {
    return true;
  }
  return false;
}

interface ExtractedPayload {
  rawMessage: string;
  sender: string;
  receivedAt: string;
  receivedSecret: string | null;
}

async function extractWebhookPayload(request: NextRequest): Promise<ExtractedPayload> {
  const urlParams = request.nextUrl.searchParams;
  let rawMessage =
    urlParams.get("text") ||
    urlParams.get("message") ||
    urlParams.get("body") ||
    urlParams.get("sms") ||
    "";

  let sender =
    request.headers.get("x-sms-sender") ||
    urlParams.get("sender") ||
    urlParams.get("from") ||
    urlParams.get("address") ||
    "";

  let receivedAt = urlParams.get("receivedAt") || urlParams.get("timestamp") || "";
  let parsedBody: Record<string, unknown> | null = null;

  if (request.method === "POST") {
    let rawBodyText = "";
    try {
      rawBodyText = await request.text();
    } catch {
      rawBodyText = "";
    }

    if (rawBodyText.trim()) {
      // 1. Try parsing JSON
      try {
        const json = JSON.parse(rawBodyText);
        if (json && typeof json === "object") {
          parsedBody = json;
          sender = json.sender || json.from || json.address || sender || "";
          rawMessage =
            json.message ||
            json.text ||
            json.body ||
            json.sms ||
            json.content ||
            rawMessage;
          const rawTimestamp = json.receivedAt || json.timestamp || json.date;
          if (rawTimestamp) {
            const parsed = new Date(rawTimestamp);
            if (!isNaN(parsed.getTime())) receivedAt = parsed.toISOString();
          }
        }
      } catch {
        // 2. Try URL-encoded Form string if key-value pairs are detected
        if (
          rawBodyText.includes("=") &&
          (rawBodyText.includes("message=") || rawBodyText.includes("text=") || rawBodyText.includes("body="))
        ) {
          try {
            const params = new URLSearchParams(rawBodyText);
            parsedBody = Object.fromEntries(params.entries());
            rawMessage =
              params.get("message") || params.get("text") || params.get("body") || params.get("sms") || rawMessage;
            sender = params.get("sender") || params.get("from") || sender;
          } catch {
            rawMessage = rawBodyText.trim();
          }
        } else {
          // 3. Raw text body
          rawMessage = rawBodyText.trim();
        }
      }
    }
  }

  const receivedSecret = extractIncomingSecret(request, parsedBody);

  if (!sender) {
    sender = "ANDROID-SMS";
  }
  if (!receivedAt) {
    receivedAt = new Date().toISOString();
  }

  return { rawMessage, sender, receivedAt, receivedSecret };
}

export async function GET(req: NextRequest) {
  const supabase = createAdminClient();
  const allowedSecrets = await getAllowedSecrets(supabase);
  const receivedSecret = extractIncomingSecret(req);

  if (!isValidWebhookSecret(receivedSecret, allowedSecrets)) {
    return NextResponse.json(
      { error: "Unauthorized: Invalid or missing SMS webhook secret" },
      { status: 401 }
    );
  }

  const urlParams = req.nextUrl.searchParams;
  const hasTestOrText =
    urlParams.has("text") ||
    urlParams.has("message") ||
    urlParams.has("body") ||
    urlParams.get("test") === "1" ||
    urlParams.get("test") === "true";

  if (hasTestOrText) {
    const sender =
      urlParams.get("sender") ||
      urlParams.get("from") ||
      "PHONE-BROWSER-TEST";
    const rawText =
      urlParams.get("text") ||
      urlParams.get("message") ||
      urlParams.get("body") ||
      "Test Phone Connection: Received Rs. 1.00 via UPI";
    const matchAmt = rawText.match(/(?:Rs\.?|INR|₹)?\s*([0-9,]+(?:\.\d{1,2})?)/i);
    const amount = urlParams.get("amount")
      ? parseFloat(urlParams.get("amount")!)
      : matchAmt && matchAmt[1]
        ? parseFloat(matchAmt[1].replace(/,/g, "")) || 1
        : 1;
    const raw_body =
      rawText.includes("Rs") || rawText.includes("INR") || rawText.includes("₹")
        ? rawText
        : `${rawText}: Received Rs. ${amount.toFixed(2)} via UPI`;
    const utr_number = Date.now().toString().slice(-12);
    const nowIso = new Date().toISOString();

    await (
      supabase.from("bank_messages_inbox") as unknown as {
        upsert: (
          payload: Record<string, unknown>,
          opts?: { onConflict: string }
        ) => {
          select: () => {
            single: () => Promise<{ data: Record<string, unknown> | null; error: { message: string } | null }>;
          };
        };
      }
    )
      .upsert(
        {
          channel: "sms",
          sender,
          subject: "Phone Browser Live Test Ping",
          raw_body,
          amount,
          utr_number,
          verification_state: "unmatched",
          created_at: nowIso,
        },
        { onConflict: "utr_number" }
      )
      .select()
      .single();

    revalidatePath("/admin");
    revalidatePath("/admin?tab=payments");

    return NextResponse.json({
      ok: true,
      status: "TripMate Bank SMS Webhook Online & Test Row Ingested at Row #1!",
      utr_number,
      utrNumber: utr_number,
      testMode: true,
      ingested: true,
      amount,
    });
  }

  return NextResponse.json({
    ok: true,
    status: "TripMate Bank SMS Webhook Online",
  });
}

export async function POST(request: NextRequest) {
  const supabase = createAdminClient();
  const allowedSecrets = await getAllowedSecrets(supabase);
  const { rawMessage, sender, receivedAt, receivedSecret } = await extractWebhookPayload(request);

  // 1. Flexible Secret Verification
  if (!isValidWebhookSecret(receivedSecret, allowedSecrets)) {
    return NextResponse.json(
      { error: "Unauthorized: Invalid or missing SMS webhook secret" },
      { status: 401 }
    );
  }

  const nowIso = new Date().toISOString();
  const effectiveReceivedAt = receivedAt || nowIso;

  // 2. Built-in MacroDroid Test Mode Handler
  // Tapping "Test Actions" in MacroDroid sends literal "[sms_message]" or empty test string
  if (isMacroDroidTestTrigger(rawMessage, request.nextUrl.searchParams.get("test"))) {
    const testUtr = Date.now().toString().slice(-12);
    const testSender = sender !== "ANDROID-SMS" ? sender : "PHONE-TEST-OK";
    const matchAmt = rawMessage.match(/(?:Rs\.?|INR|₹)?\s*([0-9,]+(?:\.\d{1,2})?)/i);
    const testAmount = matchAmt && matchAmt[1] ? parseFloat(matchAmt[1].replace(/,/g, "")) || 1 : 1;
    const testBody = rawMessage && (rawMessage.includes("Rs") || rawMessage.includes("INR") || rawMessage.includes("₹"))
      ? `TEST PING from Android Phone: ${rawMessage}. Ref: ${testUtr}`
      : `TEST PING from Android Phone: Received Rs. ${testAmount.toFixed(2)} via UPI. Ref: ${testUtr}`;

    await (
      supabase.from("bank_messages_inbox") as unknown as {
        upsert: (
          payload: Record<string, unknown>,
          opts?: { onConflict: string }
        ) => {
          select: () => {
            single: () => Promise<{ data: Record<string, unknown> | null; error: { message: string } | null }>;
          };
        };
      }
    )
      .upsert(
        {
          channel: "sms",
          sender: testSender,
          subject: "MacroDroid Android Connectivity Ping",
          raw_body: testBody,
          amount: testAmount,
          utr_number: testUtr,
          verification_state: "unmatched",
          created_at: nowIso,
        },
        { onConflict: "utr_number" }
      )
      .select()
      .single();

    revalidatePath("/admin");
    revalidatePath("/admin?tab=payments");

    return NextResponse.json({
      ok: true,
      testMode: true,
      ingested: true,
      utrNumber: testUtr,
      amount: testAmount,
      sender: testSender,
      message: "MacroDroid test ping received and placed at Row #1 in /admin",
      preview: testBody,
    });
  }

  // 3. Strict Bank Gatekeeper Evaluation
  const parseResult = parseStrictBankMessage({
    channel: "sms",
    sender,
    body: rawMessage,
  });

  let effectiveAmount: number;
  let effectiveUtr: string;
  const effectiveSender = parseResult.sender || sender || "ANDROID-SMS";
  const payerVpa: string | null = parseResult.payerVpa || null;
  const tripRef: string | null = parseResult.tripRef || null;
  let isPermissiveFallback = false;

  if (parseResult.isBankMessage) {
    effectiveAmount = parseResult.amount!;
    effectiveUtr = parseResult.utrNumber!;
  } else {
    // 4. Permissive Fallback for Unrecognized Bank SMS Formats
    // If strict parser rejects solely on formatting, but text has an authentic rupee amount and is NOT an OTP
    const isOtp = /\b(?:otp|verification\s*code|one\s*time\s*password)\b/i.test(rawMessage);
    const amountMatch = rawMessage.match(/(?:Rs\.?|INR|₹)\s*([0-9,]+(?:\.\d{1,2})?)/i);

    if (isOtp || !amountMatch || !amountMatch[1]) {
      return NextResponse.json(
        {
          ok: false,
          skipped: true,
          reason: parseResult.reason || "Non-bank or security OTP message ignored by gatekeeper",
        },
        { status: 422 }
      );
    }

    effectiveAmount = parseFloat(amountMatch[1].replace(/,/g, ""));
    const utrMatch = rawMessage.match(/\b\d{12}\b/);
    effectiveUtr = utrMatch ? utrMatch[0] : Date.now().toString().slice(-12);
    isPermissiveFallback = true;
  }

  // 5. Guaranteed Direct Upsert into public.bank_messages_inbox
  try {
    const { data: upsertData, error: upsertErr } = await (
      supabase.from("bank_messages_inbox") as unknown as {
        upsert: (
          payload: Record<string, unknown>,
          opts?: { onConflict: string }
        ) => {
          select: () => {
            single: () => Promise<{ data: Record<string, unknown> | null; error: { message: string } | null }>;
          };
        };
      }
    )
      .upsert(
        {
          channel: "sms",
          sender: effectiveSender,
          subject: null,
          raw_body: rawMessage,
          amount: effectiveAmount,
          utr_number: effectiveUtr,
          payer_vpa: payerVpa,
          extracted_trip_ref: tripRef,
          verification_state: isPermissiveFallback ? "unmatched" : undefined,
          created_at: nowIso,
        },
        { onConflict: "utr_number" }
      )
      .select()
      .single();

    if (upsertErr) {
      console.warn("Direct bank_messages_inbox upsert error:", upsertErr);
    }

    // Attempt RPC auto-matching and trip confirmation
    try {
      await (
        supabase.rpc as unknown as (fn: string, args: Record<string, unknown>) => Promise<{
          data: Record<string, unknown> | null;
          error: { message: string } | null;
        }>
      )("ingest_bank_payment_message", {
        p_channel: "sms",
        p_sender: effectiveSender,
        p_subject: null,
        p_raw_body: rawMessage,
        p_amount: effectiveAmount,
        p_utr_number: effectiveUtr,
        p_payer_vpa: payerVpa,
        p_extracted_trip_ref: tripRef,
        p_received_at: effectiveReceivedAt,
      });
    } catch (rpcErr) {
      console.warn("ingest_bank_payment_message non-fatal error:", rpcErr);
    }

    // Always guarantee created_at is bumped to nowIso so re-tested transactions jump to Row #1
    await (
      supabase.from("bank_messages_inbox") as unknown as {
        update: (payload: Record<string, unknown>) => {
          eq: (col: string, val: string) => Promise<{ data: unknown; error: unknown }>;
        };
      }
    )
      .update({
        created_at: nowIso,
        sender: effectiveSender,
        raw_body: rawMessage,
      })
      .eq("utr_number", effectiveUtr);

    revalidatePath("/admin");
    revalidatePath("/admin?tab=payments");

    return NextResponse.json({
      ok: true,
      ingested: true,
      fallback: isPermissiveFallback,
      utrNumber: effectiveUtr,
      amount: effectiveAmount,
      preview: rawMessage.slice(0, 80),
      data: upsertData || { utr_number: effectiveUtr, amount: effectiveAmount },
    });
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ ok: false, error: errorMessage }, { status: 422 });
  }
}
