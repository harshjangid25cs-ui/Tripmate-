import crypto from "crypto";
import { type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export function cleanSecret(val: unknown): string | null {
  if (val === null || val === undefined) return null;
  let str = String(val).trim();
  if (
    (str.startsWith('"') && str.endsWith('"')) ||
    (str.startsWith("'") && str.endsWith("'"))
  ) {
    str = str.slice(1, -1).trim();
  } else {
    str = str.replace(/^["']|["']$/g, "").trim();
  }
  return str.length > 0 ? str : null;
}

export function extractIncomingSecret(
  req: NextRequest,
  parsedBody?: Record<string, unknown> | null
): string | null {
  // 1. URL Query parameters (searchParams from req.nextUrl or fallback req.url)
  let querySecret: string | null = null;
  try {
    querySecret =
      req.nextUrl.searchParams.get("secret") ||
      req.nextUrl.searchParams.get("token") ||
      null;
  } catch {
    // nextUrl fallback
  }

  if (!querySecret && req.url) {
    try {
      const parsedUrl = new URL(req.url);
      querySecret =
        parsedUrl.searchParams.get("secret") ||
        parsedUrl.searchParams.get("token") ||
        null;
    } catch {
      // url parse error
    }
  }

  // 2. Custom webhook headers
  const headerSecret =
    req.headers.get("x-sms-secret") ||
    req.headers.get("x-webhook-secret") ||
    req.headers.get("x-email-secret") ||
    null;

  // 3. Authorization Bearer header
  let authBearer: string | null = null;
  const authHeader = req.headers.get("authorization");
  if (authHeader) {
    authBearer = authHeader.replace(/^Bearer\s+/i, "");
  }

  // 4. Parsed body fields (JSON or form body)
  let bodySecret: string | null = null;
  if (parsedBody && typeof parsedBody === "object") {
    bodySecret =
      (parsedBody.secret as string | undefined) ||
      (parsedBody.token as string | undefined) ||
      (parsedBody.key as string | undefined) ||
      null;
  }

  const rawCandidate = querySecret || headerSecret || authBearer || bodySecret;
  return cleanSecret(rawCandidate);
}

export async function getAllowedSecrets(supabase: ReturnType<typeof createAdminClient>): Promise<string[]> {
  const secrets: (string | undefined | null)[] = [
    "tm_internal_bank_secret_2026",
    "tm_whsec_live_9664340734_fampay_upi",
    process.env.BANK_SMS_WEBHOOK_SECRET,
  ];

  try {
    const { data: config } = await supabase
      .from("pricing_config")
      .select("bank_webhook_secret")
      .eq("id", 1)
      .maybeSingle();

    if (config?.bank_webhook_secret) {
      secrets.push(config.bank_webhook_secret);
    }
  } catch {
    // Fall back to defaults
  }

  const cleanList = secrets
    .map((s) => cleanSecret(s))
    .filter((s): s is string => Boolean(s));

  return Array.from(new Set(cleanList));
}

export function isValidWebhookSecret(candidate: string | null, allowedSecrets: string[]): boolean {
  if (!candidate) return false;
  const cleanCandidate = cleanSecret(candidate);
  if (!cleanCandidate) return false;

  for (const expected of allowedSecrets) {
    const cleanExpected = cleanSecret(expected);
    if (!cleanExpected) continue;

    if (cleanCandidate === cleanExpected) {
      return true;
    }

    try {
      const bufReceived = Buffer.from(cleanCandidate, "utf-8");
      const bufExpected = Buffer.from(cleanExpected, "utf-8");
      if (
        bufReceived.length === bufExpected.length &&
        crypto.timingSafeEqual(bufReceived, bufExpected)
      ) {
        return true;
      }
    } catch {
      // Continue to next secret
    }
  }

  return false;
}
