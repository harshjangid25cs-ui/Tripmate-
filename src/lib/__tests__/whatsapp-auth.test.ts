import { describe, it, expect, vi } from "vitest";
import fs from "fs";
import path from "path";
import { newOtp, hashOtp, newSessionToken, hashToken } from "@/lib/wa-auth/crypto";
import { normalizeMobile, isValidMobile, isValidEmail } from "@/lib/wa-auth/phone";
import { otpMessage } from "@/lib/wa-auth/worker";
import * as waWorker from "@/lib/wa-auth/worker";
import { NextRequest } from "next/server";
import { POST as sendOtpHandler } from "@/app/api/auth/send-otp/route";
import { POST as verifyOtpHandler } from "@/app/api/auth/verify-otp/route";
import { GET as meHandler } from "@/app/api/auth/me/route";
import * as waSupabase from "@/lib/wa-auth/supabase";

describe("WhatsApp OTP Authentication - Comprehensive Test Suite", () => {
  describe("Layer 1: Unit & Cryptographic Logic", () => {
    it("newOtp() generates a valid 6-digit numeric string", () => {
      for (let i = 0; i < 20; i++) {
        const otp = newOtp();
        expect(otp).toMatch(/^\d{6}$/);
        const num = Number(otp);
        expect(num).toBeGreaterThanOrEqual(100000);
        expect(num).toBeLessThan(1000000);
      }
    });

    it("hashOtp() is deterministic and keyed to mobile & secret", () => {
      const mobile = "9876543210";
      const code = "123456";
      const hash1 = hashOtp(mobile, code);
      const hash2 = hashOtp(mobile, code);
      expect(hash1).toBe(hash2);
      expect(hash1).toHaveLength(64); // SHA-256 hex string

      // Different code or mobile must produce different hashes
      const diffCodeHash = hashOtp(mobile, "654321");
      const diffMobileHash = hashOtp("9876543211", code);
      expect(hash1).not.toBe(diffCodeHash);
      expect(hash1).not.toBe(diffMobileHash);
    });

    it("newSessionToken() generates secure prefixed bearer tokens", () => {
      const token = newSessionToken();
      expect(token).toMatch(/^wsess_[a-f0-9]{64}$/);
    });

    it("hashToken() creates keyed HMAC for session tokens", () => {
      const token = newSessionToken();
      const hash = hashToken(token);
      expect(hash).toHaveLength(64);
      expect(hashToken(token)).toBe(hash);
    });

    it("normalizeMobile() properly cleans Indian phone numbers", () => {
      expect(normalizeMobile("9876543210")).toBe("9876543210");
      expect(normalizeMobile("+91 98765 43210")).toBe("9876543210");
      expect(normalizeMobile("919876543210")).toBe("9876543210");
      expect(normalizeMobile("09876543210")).toBe("9876543210");
      expect(normalizeMobile("98765-43210")).toBe("9876543210");
    });

    it("isValidMobile() validates Indian mobile numbers strictly", () => {
      // Must start with 6, 7, 8, 9 and have 10 digits
      expect(isValidMobile("9876543210")).toBe(true);
      expect(isValidMobile("8123456789")).toBe(true);
      expect(isValidMobile("7012345678")).toBe(true);
      expect(isValidMobile("6987654321")).toBe(true);

      // Rejects numbers starting with 0-5
      expect(isValidMobile("5123456789")).toBe(false);
      expect(isValidMobile("1234567890")).toBe(false);
      expect(isValidMobile("0876543210")).toBe(false);

      // Rejects too short or empty
      expect(isValidMobile("")).toBe(false);
      expect(isValidMobile("98765")).toBe(false);
    });

    it("isValidEmail() validates email syntax correctly", () => {
      expect(isValidEmail("arjun.kapoor@tripmate.in")).toBe(true);
      expect(isValidEmail("user@gmail.com")).toBe(true);
      expect(isValidEmail("invalid-email")).toBe(false);
      expect(isValidEmail("@domain.com")).toBe(false);
      expect(isValidEmail("user@")).toBe(false);
    });

    it("otpMessage() formats WhatsApp template correctly", () => {
      const msg1 = otpMessage("789123");
      expect(msg1).toContain("789123");
      expect(msg1).toContain("Valid for 5 minutes");

      const msg2 = otpMessage("789123", "Priya");
      expect(msg2).toContain("Hello *Priya*!");
      expect(msg2).toContain("789123");
    });
  });

  describe("Layer 2: Database Migration & Security Verification", () => {
    const migrationPath = path.resolve(
      process.cwd(),
      "supabase/migrations/20261021000023_wa_otp_auth.sql"
    );
    const sql = fs.readFileSync(migrationPath, "utf8");

    it("verifies wa_customers table enforces phone regex check", () => {
      expect(sql).toContain("CHECK (mobile ~ '^[6-9][0-9]{9}$')");
    });

    it("verifies row level security is enabled and revoked from public/anon/authenticated", () => {
      expect(sql).toContain("ALTER TABLE public.wa_customers       ENABLE ROW LEVEL SECURITY;");
      expect(sql).toContain("ALTER TABLE public.wa_otp_challenges  ENABLE ROW LEVEL SECURITY;");
      expect(sql).toContain("ALTER TABLE public.wa_sessions        ENABLE ROW LEVEL SECURITY;");
      expect(sql).toContain("REVOKE ALL ON public.wa_customers, public.wa_otp_challenges, public.wa_sessions FROM anon, authenticated;");
    });

    it("verifies atomic row locking and security definer on stored functions", () => {
      expect(sql).toContain("SECURITY DEFINER");
      expect(sql).toContain("SELECT * INTO c FROM public.wa_otp_challenges WHERE mobile = p_mobile FOR UPDATE;");
    });

    it("verifies execute privileges are granted exclusively to service_role", () => {
      expect(sql).toContain("GRANT EXECUTE ON FUNCTION public.wa_issue_otp(text,text,int,int,text,text) TO service_role;");
      expect(sql).toContain("GRANT EXECUTE ON FUNCTION public.wa_verify_otp(text,text,int)             TO service_role;");
    });
  });

  describe("Layer 3: Next.js API Route Handlers", () => {
    it("POST /api/auth/send-otp rejects invalid phone numbers with 400", async () => {
      const req = new NextRequest("http://localhost:3000/api/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mobile: "12345" }),
      });

      const res = await sendOtpHandler(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toContain("Please enter a valid 10-digit mobile number");
    });

    it("POST /api/auth/send-otp rejects invalid email with 400", async () => {
      const req = new NextRequest("http://localhost:3000/api/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mobile: "9823456789", email: "not-an-email" }),
      });

      const res = await sendOtpHandler(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toContain("valid email address");
    });

    it("POST /api/auth/verify-otp rejects invalid OTP length with 400", async () => {
      const req = new NextRequest("http://localhost:3000/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mobile: "9823456789", otp: "123" }),
      });

      const res = await verifyOtpHandler(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toContain("Mobile number and 6-digit code are required");
    });

    it("GET /api/auth/me returns 401 when no session cookie or header is provided", async () => {
      const req = new NextRequest("http://localhost:3000/api/auth/me", {
        method: "GET",
      });

      const res = await meHandler(req);
      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json.authenticated).toBe(false);
    });

    it("POST /api/auth/send-otp successfully dispatches real-time code", async () => {
      // Mock db().rpc for deterministic route handler verification
      const mockRpc = vi.fn().mockResolvedValue({ data: true, error: null });
      vi.spyOn(waSupabase, "db").mockReturnValue({
        rpc: mockRpc,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);
      vi.spyOn(waWorker, "sendWhatsApp").mockResolvedValue({ ok: true });

      const req = new NextRequest("http://localhost:3000/api/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mobile: "9899887766", name: "Aarav Sharma" }),
      });

      const res = await sendOtpHandler(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.expiresInSeconds).toBe(300);
      expect(json.resendAfterSeconds).toBe(30);
      expect(json.devOtp).toBeDefined();

      vi.restoreAllMocks();
    });

    it("POST /api/auth/verify-otp successfully authenticates customer and issues session cookie", async () => {
      const mockCustomer = {
        id: "cust-1234-uuid",
        mobile: "9899887766",
        name: "Aarav Sharma",
        email: "aarav@tripmate.in",
        status: "ACTIVE",
      };

      const mockRpc = vi.fn().mockResolvedValue({
        data: { status: "ok", name: "Aarav Sharma", email: "aarav@tripmate.in" },
        error: null,
      });

      const mockFrom = vi.fn().mockImplementation((table: string) => {
        if (table === "wa_customers") {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: async () => ({ data: mockCustomer, error: null }),
              }),
            }),
            update: () => ({
              eq: async () => ({ error: null }),
            }),
            insert: async () => ({ error: null }),
          };
        }
        if (table === "wa_sessions") {
          return {
            insert: async () => ({ error: null }),
          };
        }
        return {};
      });

      vi.spyOn(waSupabase, "db").mockReturnValue({
        rpc: mockRpc,
        from: mockFrom,
        auth: {
          admin: {
            listUsers: async () => ({ data: { users: [] } }),
            createUser: async () => ({ data: null }),
          },
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);

      const verifyReq = new NextRequest("http://localhost:3000/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mobile: "9899887766", otp: "654321" }),
      });

      const verifyRes = await verifyOtpHandler(verifyReq);
      expect(verifyRes.status).toBe(200);
      const verifyJson = await verifyRes.json();
      expect(verifyJson.success).toBe(true);
      expect(verifyJson.customer.mobile).toBe("9899887766");
      expect(verifyJson.customer.name).toBe("Aarav Sharma");

      const setCookie = verifyRes.headers.get("set-cookie");
      expect(setCookie).toBeDefined();
      expect(setCookie).toContain("wa_session=");
      expect(setCookie).toContain("HttpOnly");

      vi.restoreAllMocks();
    });
  });
});
