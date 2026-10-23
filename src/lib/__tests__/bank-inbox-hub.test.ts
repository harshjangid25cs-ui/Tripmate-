import { describe, it, expect, vi, beforeEach } from "vitest";
import { parseStrictBankMessage } from "../payments/bank-parser";

let mockAdminAuthorized = false;
const mockRpcCalls: { fn: string; args: Record<string, unknown> }[] = [];
const mockUpdateCalls: { table: string; payload: Record<string, unknown> }[] = [];

vi.mock("@/lib/admin/admin-auth", async () => {
  const actual = await vi.importActual<typeof import("@/lib/admin/admin-auth")>("@/lib/admin/admin-auth");
  return {
    ...actual,
    requireAdmin: vi.fn(async () => {
      if (!mockAdminAuthorized) {
        throw new Error("Unauthorized admin access.");
      }
      return {
        user: {
          id: "admin-uuid-1",
          email: "admin@tripmate.com",
          app_metadata: { role: "super_admin" },
          user_metadata: {},
        },
      };
    }),
  };
});

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: {
      getUser: vi.fn(async () => {
        if (!mockAdminAuthorized) {
          return { data: { user: null }, error: new Error("No session") };
        }
        return {
          data: {
            user: {
              id: "admin-uuid-1",
              email: "admin@tripmate.com",
              app_metadata: { role: "super_admin" },
              user_metadata: {},
            },
          },
          error: null,
        };
      }),
    },
  })),
  createPublicClient: vi.fn(),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({
    rpc: vi.fn(async (fn: string, args: Record<string, unknown>) => {
      mockRpcCalls.push({ fn, args });
      return {
        data: {
          id: args.p_inbox_id || "inbox-mock-123",
          status: "confirmed",
          success: true,
        },
        error: null,
      };
    }),
    from: vi.fn((table: string) => ({
      update: vi.fn((payload: Record<string, unknown>) => {
        mockUpdateCalls.push({ table, payload });
        return {
          eq: vi.fn(async () => ({ data: null, error: null })),
        };
      }),
    })),
  })),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
  unstable_noStore: vi.fn(),
}));

import {
  adminConfirmBankInboxPaymentAction,
  adminIngestManualBankMessageAction,
  adminToggleBankAutoConfirmAction,
  adminUpdateBankAlertConfigAction,
  markTripCheckoutActiveAction,
} from "../actions/admin-ops";

describe("Strict Bank-Only Gatekeeper & Parser (bank-parser.ts)", () => {
  describe("Rule 1 & 3: Bank / UPI Credit Message Acceptance", () => {
    it("accepts FamPay / IDFC credit alert SMS with exact amount, 12-digit UTR, VPA, and Trip Ref", () => {
      const sms =
        "You received Rs. 31,624.00 from rahul@okaxis via FamPay. UPI Ref: 429183746512. Trip: TM-492011";
      const result = parseStrictBankMessage({
        channel: "sms",
        sender: "FamPay",
        body: sms,
      });

      expect(result.isBankMessage).toBe(true);
      expect(result.bankName).toBe("FamPay / IDFC");
      expect(result.amount).toBe(31624);
      expect(result.utrNumber).toBe("429183746512");
      expect(result.payerVpa).toBe("rahul@okaxis");
      expect(result.tripRef).toBe("TM-492011");
    });

    it("accepts SBI Bank credit SMS and distinguishes transaction amount from Avl Bal", () => {
      const sms =
        "Dear SBI User, your A/c ending 4821 has been credited by Rs. 14,250.00 on 23-Oct-26 by UPI/429183746519/rahul@okaxis. Bal is Rs. 92,100.50";
      const result = parseStrictBankMessage({
        channel: "sms",
        sender: "AD-SBIBNK",
        body: sms,
      });

      expect(result.isBankMessage).toBe(true);
      expect(result.bankName).toBe("State Bank of India (SBI)");
      expect(result.amount).toBe(14250);
      expect(result.utrNumber).toBe("429183746519");
      expect(result.payerVpa).toBe("rahul@okaxis");
    });

    it("accepts HDFC Bank credit alert SMS with Avl Bal ignored", () => {
      const sms =
        "HDFC Bank: Rs 27,376.00 credited to a/c **9102 on 23-OCT-26 by UPI transfer from ananya@okhdfcbank. Ref no 501928374612. Avl bal INR 1,12,000.00";
      const result = parseStrictBankMessage({
        channel: "sms",
        sender: "VM-HDFCBK",
        body: sms,
      });

      expect(result.isBankMessage).toBe(true);
      expect(result.bankName).toBe("HDFC Bank");
      expect(result.amount).toBe(27376);
      expect(result.utrNumber).toBe("501928374612");
      expect(result.payerVpa).toBe("ananya@okhdfcbank");
    });

    it("accepts ICICI Bank credit SMS", () => {
      const sms =
        "ICICI Bank: INR 8,500.00 credited to account ending 2049 via UPI. UTR 602938471234. Avail Bal: Rs 45,000.00";
      const result = parseStrictBankMessage({
        channel: "sms",
        sender: "BZ-ICICIB",
        body: sms,
      });

      expect(result.isBankMessage).toBe(true);
      expect(result.bankName).toBe("ICICI Bank");
      expect(result.amount).toBe(8500);
      expect(result.utrNumber).toBe("602938471234");
    });

    it("accepts FamPay Gmail payment notification alert", () => {
      const email =
        "Hi TripMate Admin, FamPay payment of INR 31,624.00 received from rohit@fam. UTR: 429183746515. Reference TM-902144.";
      const result = parseStrictBankMessage({
        channel: "gmail",
        sender: "FamPay Alerts <no-reply@fampay.in>",
        subject: "Payment Received: INR 31,624 credited to your account",
        body: email,
      });

      expect(result.isBankMessage).toBe(true);
      expect(result.channel).toBe("gmail");
      expect(result.bankName).toBe("FamPay / IDFC");
      expect(result.amount).toBe(31624);
      expect(result.utrNumber).toBe("429183746515");
      expect(result.payerVpa).toBe("rohit@fam");
      expect(result.tripRef).toBe("TM-902144");
    });

    it("accepts Axis Bank, Kotak, and Google Pay credit notifications", () => {
      const axisSms = "Axis Bank: Your A/C 9812 has been credited with INR 5,200.00 via UPI. RRN: 718293041234.";
      const axisRes = parseStrictBankMessage({
        channel: "sms",
        sender: "AXISBK",
        body: axisSms,
      });
      expect(axisRes.isBankMessage).toBe(true);
      expect(axisRes.bankName).toBe("Axis Bank");
      expect(axisRes.amount).toBe(5200);
      expect(axisRes.utrNumber).toBe("718293041234");

      const gpaySms = "Google Pay: You received Rs. 1,499.00 from priya@oksbi. UPI transaction id 829104829103.";
      const gpayRes = parseStrictBankMessage({
        channel: "sms",
        sender: "GPAY",
        body: gpaySms,
      });
      expect(gpayRes.isBankMessage).toBe(true);
      expect(gpayRes.bankName).toBe("Google Pay");
      expect(gpayRes.amount).toBe(1499);
      expect(gpayRes.utrNumber).toBe("829104829103");
    });
  });

  describe("Rule 1: Rejection of Non-Bank & Personal Messages", () => {
    it("strictly rejects personal SMS chat messages", () => {
      const text = "Hey bro, can you send me 500 rupees tonight for dinner?";
      const result = parseStrictBankMessage({
        channel: "sms",
        sender: "+919876543210",
        body: text,
      });

      expect(result.isBankMessage).toBe(false);
      expect(result.reason).toBe("ignored_non_bank_source");
    });

    it("strictly rejects personal WhatsApp or text containing numbers", () => {
      const text = "Meet me at Starbucks CP, bill was 1200. See you in 15 mins!";
      const result = parseStrictBankMessage({
        channel: "sms",
        body: text,
      });

      expect(result.isBankMessage).toBe(false);
      expect(result.reason).toBe("ignored_non_bank_source");
    });

    it("strictly rejects random promotional marketing emails", () => {
      const email = "Get 50% discount on summer apparel at Myntra this weekend!";
      const result = parseStrictBankMessage({
        channel: "gmail",
        sender: "offers@myntra.com",
        subject: "Exclusive 50% discount",
        body: email,
      });

      expect(result.isBankMessage).toBe(false);
      expect(result.reason).toBe("ignored_non_bank_source");
    });
  });

  describe("Rule 2: Rejection of Debits, OTPs, Collect Requests & Failed Transactions", () => {
    it("strictly rejects OTP and verification code messages even if from a bank", () => {
      const otpSms =
        "Your State Bank of India OTP for online banking login is 482910. Do not share your OTP with anyone.";
      const result = parseStrictBankMessage({
        channel: "sms",
        sender: "SBI-BNK",
        body: otpSms,
      });

      expect(result.isBankMessage).toBe(false);
      expect(result.reason).toBe("rejected_debit_or_security_message");
    });

    it("strictly rejects debit messages (money going out)", () => {
      const debitSms =
        "Dear SBI User, your A/c ending 4821 has been debited by Rs. 1,500.00 on 23-Oct-26 via UPI. Ref 429183746512. Avl Bal Rs. 12,000.";
      const result = parseStrictBankMessage({
        channel: "sms",
        sender: "AD-SBIBNK",
        body: debitSms,
      });

      expect(result.isBankMessage).toBe(false);
      expect(result.reason).toBe("rejected_debit_or_security_message");
    });

    it("strictly rejects 'paid to' or 'sent to' outgoing transfer messages", () => {
      const sentSms =
        "Rs. 2,000 paid to Swiggy via HDFC Bank UPI. UTR: 429183746512. Total balance: Rs. 25,000.";
      const result = parseStrictBankMessage({
        channel: "sms",
        sender: "HDFCBK",
        body: sentSms,
      });

      expect(result.isBankMessage).toBe(false);
      expect(result.reason).toBe("rejected_debit_or_security_message");
    });

    it("strictly rejects UPI collect requests", () => {
      const collectSms =
        "Collect request of Rs 1,499.00 requested by merchant on PhonePe. Click here to approve or decline.";
      const result = parseStrictBankMessage({
        channel: "sms",
        sender: "PhonePe",
        body: collectSms,
      });

      expect(result.isBankMessage).toBe(false);
      expect(result.reason).toBe("rejected_debit_or_security_message");
    });

    it("strictly rejects failed or declined transactions", () => {
      const failedSms =
        "UPI transaction of Rs 5,000 failed on ICICI Bank due to insufficient balance. UTR: 123456789012.";
      const result = parseStrictBankMessage({
        channel: "sms",
        sender: "ICICIB",
        body: failedSms,
      });

      expect(result.isBankMessage).toBe(false);
      expect(result.reason).toBe("rejected_debit_or_security_message");
    });
  });

  describe("Amount and 12-digit UTR Extraction Edge Cases", () => {
    it("rejects messages lacking a valid 12-digit UTR/RRN", () => {
      const smsWithoutUtr = "SBI: Rs. 5,000.00 credited to your account. Thanks for banking with us.";
      const result = parseStrictBankMessage({
        channel: "sms",
        sender: "SBIBNK",
        body: smsWithoutUtr,
      });

      expect(result.isBankMessage).toBe(false);
      expect(result.reason).toBe("missing_or_invalid_12_digit_utr");
    });

    it("rejects messages where the reference is not exactly 12 digits (e.g. 10 digits or 14 digits)", () => {
      const smsBadUtr = "HDFC Bank: Rs 1,000 credited to account. Ref no 1234567890."; // 10 digits
      const result = parseStrictBankMessage({
        channel: "sms",
        sender: "HDFCBK",
        body: smsBadUtr,
      });

      expect(result.isBankMessage).toBe(false);
      expect(result.reason).toBe("missing_or_invalid_12_digit_utr");
    });

    it("handles Indian number formatting with commas correctly (e.g. 1,45,200.00)", () => {
      const largeSms =
        "ICICI Bank: INR 1,45,200.00 credited to account ending 1029 via UPI. UTR 402938172635. Avl Bal: Rs 2,50,000.";
      const result = parseStrictBankMessage({
        channel: "sms",
        sender: "ICICIB",
        body: largeSms,
      });

      expect(result.isBankMessage).toBe(true);
      expect(result.amount).toBe(145200);
      expect(result.utrNumber).toBe("402938172635");
    });
  });
});

describe("Admin Bank Hub Server Action Authorization & Workflows", () => {
  beforeEach(() => {
    mockAdminAuthorized = false;
    mockRpcCalls.length = 0;
    mockUpdateCalls.length = 0;
  });

  it("strictly rejects unauthenticated access to admin actions", async () => {
    mockAdminAuthorized = false;

    const res1 = await adminIngestManualBankMessageAction({
      channel: "sms",
      rawBody: "FamPay received Rs 1000",
    });
    expect(res1.ok).toBe(false);
    expect(res1.error).toBe("Unauthorized admin access.");

    const res2 = await adminConfirmBankInboxPaymentAction({
      inboxId: "inbox-1",
      tripId: "trip-1",
    });
    expect(res2.ok).toBe(false);
    expect(res2.error).toBe("Unauthorized admin access.");

    const res3 = await adminToggleBankAutoConfirmAction({
      bankAutoConfirm: true,
    });
    expect(res3.ok).toBe(false);
    expect(res3.error).toBe("Unauthorized admin access.");
  });

  it("rejects manual bank message ingestion when body is empty (authorized admin)", async () => {
    mockAdminAuthorized = true;

    const res = await adminIngestManualBankMessageAction({
      channel: "sms",
      rawBody: "   ",
    });

    expect(res.ok).toBe(false);
    expect(res.error).toMatch(/Please enter or paste the message content/i);
  });

  it("strictly rejects personal/non-bank text when manually pasted into admin console (authorized admin)", async () => {
    mockAdminAuthorized = true;

    const res = await adminIngestManualBankMessageAction({
      channel: "sms",
      rawBody: "Hey mom, please call me when you are free.",
    });

    expect(res.ok).toBe(false);
    expect(res.error).toMatch(
      /Rejected: Message does not match any recognized Bank\/UPI credit alert pattern/i
    );
  });

  it("ingests verified Bank SMS and invokes atomic PostgreSQL RPC (authorized admin)", async () => {
    mockAdminAuthorized = true;

    const validSms =
      "You received Rs. 31,624.00 from rahul@okaxis via FamPay. UPI Ref: 429183746512. Trip: TM-492011";
    const res = await adminIngestManualBankMessageAction({
      channel: "sms",
      sender: "FamPay",
      rawBody: validSms,
    });

    expect(res.ok).toBe(true);
    expect(res.message).toContain("31,624");
    expect(res.message).toContain("429183746512");
    expect(mockRpcCalls.length).toBe(1);
    expect(mockRpcCalls[0]?.fn).toBe("ingest_bank_payment_message");
    expect(mockRpcCalls[0]?.args).toEqual({
      p_channel: "sms",
      p_sender: "FamPay",
      p_subject: null,
      p_raw_body: validSms,
      p_amount: 31624,
      p_utr_number: "429183746512",
      p_payer_vpa: "rahul@okaxis",
      p_extracted_trip_ref: "TM-492011",
    });
  });

  it("rejects adminConfirmBankInboxPaymentAction when inboxId or tripId are missing (authorized admin)", async () => {
    mockAdminAuthorized = true;

    const res1 = await adminConfirmBankInboxPaymentAction({
      inboxId: "",
      tripId: "some-trip-id",
    });
    expect(res1.ok).toBe(false);
    expect(res1.error).toMatch(/Inbox ID and Trip ID are required/i);

    const res2 = await adminConfirmBankInboxPaymentAction({
      inboxId: "some-inbox-id",
      tripId: "",
    });
    expect(res2.ok).toBe(false);
    expect(res2.error).toMatch(/Inbox ID and Trip ID are required/i);
  });

  it("confirms bank inbox payment via admin_confirm_bank_inbox_payment RPC (authorized admin)", async () => {
    mockAdminAuthorized = true;

    const res = await adminConfirmBankInboxPaymentAction({
      inboxId: "inbox-uuid-99",
      tripId: "trip-uuid-88",
    });

    expect(res.ok).toBe(true);
    expect(res.message).toContain("Payment confirmed successfully");
    expect(mockRpcCalls.length).toBe(1);
    expect(mockRpcCalls[0]?.fn).toBe("admin_confirm_bank_inbox_payment");
    expect(mockRpcCalls[0]?.args).toEqual({
      p_inbox_id: "inbox-uuid-99",
      p_trip_id: "trip-uuid-88",
    });
  });

  it("updates pricing_config bank_auto_confirm setting (authorized admin)", async () => {
    mockAdminAuthorized = true;

    const res = await adminToggleBankAutoConfirmAction({
      bankAutoConfirm: false,
    });

    expect(res.ok).toBe(true);
    expect(mockUpdateCalls.length).toBe(1);
    expect(mockUpdateCalls[0]?.table).toBe("pricing_config");
    expect(mockUpdateCalls[0]?.payload.bank_auto_confirm).toBe(false);
  });

  it("marks trip checkout active without requiring admin role", async () => {
    const res = await markTripCheckoutActiveAction("trip-active-123");
    expect(res.ok).toBe(true);
    expect(mockUpdateCalls.some((c) => c.table === "trips")).toBe(true);
  });

  it("updates bank_alert_email and bank_alert_phone in pricing_config (authorized admin)", async () => {
    mockAdminAuthorized = true;

    const res = await adminUpdateBankAlertConfigAction({
      bankAlertEmail: "finance.alerts@gmail.com",
      bankAlertPhone: "+91 98765 43210",
    });

    expect(res.ok).toBe(true);
    expect(res.data?.bankAlertEmail).toBe("finance.alerts@gmail.com");
    expect(res.data?.bankAlertPhone).toBe("9876543210");
    expect(mockUpdateCalls.length).toBe(1);
    expect(mockUpdateCalls[0]?.table).toBe("pricing_config");
    expect(mockUpdateCalls[0]?.payload.bank_alert_email).toBe("finance.alerts@gmail.com");
    expect(mockUpdateCalls[0]?.payload.bank_alert_phone).toBe("9876543210");
  });

  it("rejects invalid bank alert email or phone", async () => {
    mockAdminAuthorized = true;

    const res1 = await adminUpdateBankAlertConfigAction({
      bankAlertEmail: "invalid-email",
      bankAlertPhone: "9876543210",
    });
    expect(res1.ok).toBe(false);
    expect(res1.error).toMatch(/Valid Bank Alert Email is required/i);

    const res2 = await adminUpdateBankAlertConfigAction({
      bankAlertEmail: "valid@gmail.com",
      bankAlertPhone: "123", // too short
    });
    expect(res2.ok).toBe(false);
    expect(res2.error).toMatch(/Valid 10-digit Bank Mobile Number is required/i);
  });
});

describe("Bank Webhooks Ingestion Routes (/api/webhooks/bank-sms & /api/webhooks/bank-email)", () => {
  beforeEach(() => {
    mockRpcCalls.length = 0;
  });

  it("bank-sms webhook rejects requests with invalid secret", async () => {
    const { NextRequest } = await import("next/server");
    const { POST } = await import("@/app/api/webhooks/bank-sms/route");
    const req = new NextRequest("http://localhost/api/webhooks/bank-sms", {
      method: "POST",
      headers: {
        "x-sms-secret": "wrong_secret",
        "content-type": "application/json",
      },
      body: JSON.stringify({ message: "You received Rs. 31,624 via FamPay" }),
    });

    const res = await POST(req);
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error).toMatch(/Unauthorized/i);
  });

  it("bank-sms webhook skips and does NOT store non-bank or OTP noise", async () => {
    const { NextRequest } = await import("next/server");
    const { POST } = await import("@/app/api/webhooks/bank-sms/route");
    const req = new NextRequest("http://localhost/api/webhooks/bank-sms", {
      method: "POST",
      headers: {
        "x-sms-secret": "tm_internal_bank_secret_2026",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        sender: "SBI-BNK",
        message: "Your State Bank OTP for login is 948123. Do not share.",
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.skipped).toBe(true);
    expect(json.reason).toBe("rejected_debit_or_security_message");
    // Ensure zero RPC calls made to database
    expect(mockRpcCalls.length).toBe(0);
  });

  it("bank-sms webhook ingests verified FamPay SMS and invokes database RPC", async () => {
    const { NextRequest } = await import("next/server");
    const { POST } = await import("@/app/api/webhooks/bank-sms/route");
    const req = new NextRequest("http://localhost/api/webhooks/bank-sms", {
      method: "POST",
      headers: {
        "x-sms-secret": "tm_internal_bank_secret_2026",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        sender: "FamPay",
        message:
          "You received Rs. 31,624.00 from rahul@okaxis via FamPay. UPI Ref: 429183746512. Trip: TM-492011",
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(mockRpcCalls.length).toBe(1);
    expect(mockRpcCalls[0]?.fn).toBe("ingest_bank_payment_message");
    expect(mockRpcCalls[0]?.args.p_amount).toBe(31624);
    expect(mockRpcCalls[0]?.args.p_utr_number).toBe("429183746512");
  });

  it("bank-email webhook ingests verified FamPay Gmail notification alert", async () => {
    const { NextRequest } = await import("next/server");
    const { POST } = await import("@/app/api/webhooks/bank-email/route");
    const req = new NextRequest("http://localhost/api/webhooks/bank-email", {
      method: "POST",
      headers: {
        "x-webhook-secret": "tm_internal_bank_secret_2026",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        from: "FamPay Alerts <no-reply@fampay.in>",
        subject: "Payment Received: INR 31,624 credited to your account",
        body: "FamPay payment of INR 31,624.00 received from rohit@fam. UTR: 429183746515. Reference TM-902144.",
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(mockRpcCalls.length).toBe(1);
    expect(mockRpcCalls[0]?.fn).toBe("ingest_bank_payment_message");
    expect(mockRpcCalls[0]?.args.p_channel).toBe("gmail");
    expect(mockRpcCalls[0]?.args.p_amount).toBe(31624);
    expect(mockRpcCalls[0]?.args.p_utr_number).toBe("429183746515");
  });
});

