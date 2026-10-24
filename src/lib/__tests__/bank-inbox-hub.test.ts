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

let mockBankInboxDbRows: unknown[] = [];
let mockPaymentsDbRows: unknown[] = [];
let mockTripsDbRows: unknown[] = [];

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
    from: vi.fn((table: string) => {
      const mockQueryBuilder = {
        update: vi.fn((payload: Record<string, unknown>) => {
          mockUpdateCalls.push({ table, payload });
          return {
            eq: vi.fn(async () => ({ data: null, error: null })),
          };
        }),
        upsert: vi.fn((payload: Record<string, unknown>) => ({
          select: vi.fn(() => ({
            single: vi.fn(async () => ({ data: { id: "mock-upsert-id", ...payload }, error: null })),
          })),
        })),
        select: vi.fn(() => {
          let returnedData: unknown[] = [];
          if (table === "bank_messages_inbox") {
            returnedData = mockBankInboxDbRows;
          } else if (table === "payments") {
            returnedData = mockPaymentsDbRows;
          } else if (table === "trips") {
            returnedData = mockTripsDbRows;
          }
          const builder = {
            order: vi.fn(() => builder),
            limit: vi.fn(async () => ({ data: returnedData, error: null })),
            in: vi.fn(() => builder),
            eq: vi.fn(() => builder),
            maybeSingle: vi.fn(async () => ({ data: null, error: null })),
            single: vi.fn(async () => ({ data: null, error: null })),
          };
          return builder;
        }),
      };
      return mockQueryBuilder;
    }),
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
  fetchLatestBankInboxAndPaymentsAction,
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
    expect(res.status).toBe(422);
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

  it("strictly sorts bankMessagesInbox and payments lists in descending chronological order (newest at index 0)", async () => {
    const { sortByLatestTimestamp } = await import("@/components/features/admin/PaymentsView");

    // Unordered bank messages
    const rawBankMessages = [
      { id: "msg-1", created_at: "2026-10-21T10:00:00.000Z", utr_number: "111111111111" },
      { id: "msg-2", created_at: "2026-10-23T18:45:00.000Z", utr_number: "222222222222" }, // newest
      { id: "msg-3", created_at: "2026-10-20T08:30:00.000Z", utr_number: "333333333333" }, // oldest
      { id: "msg-4", created_at: "2026-10-22T14:15:00.000Z", utr_number: "444444444444" },
    ];

    const sortedMessages = sortByLatestTimestamp(rawBankMessages);

    // Assert index 0 is newest (23 Oct), last index is oldest (20 Oct)
    expect(sortedMessages[0]?.id).toBe("msg-2");
    expect(sortedMessages[0]?.utr_number).toBe("222222222222");
    expect(sortedMessages[1]?.id).toBe("msg-4");
    expect(sortedMessages[2]?.id).toBe("msg-1");
    expect(sortedMessages[3]?.id).toBe("msg-3");

    // Unordered payments with mixed created_at and confirmed_at
    const rawPayments = [
      { id: "pay-1", created_at: "2026-10-15T12:00:00.000Z", amount: 15000 },
      { id: "pay-2", created_at: "2026-10-23T20:00:00.000Z", amount: 31624 }, // newest
      { id: "pay-3", created_at: null, confirmed_at: "2026-10-23T19:30:00.000Z", amount: 22000 }, // 2nd newest via confirmed_at
      { id: "pay-4", created_at: "2026-10-10T05:00:00.000Z", amount: 10000 }, // oldest
    ];

    const sortedPayments = sortByLatestTimestamp(rawPayments);

    expect(sortedPayments[0]?.id).toBe("pay-2");
    expect(sortedPayments[1]?.id).toBe("pay-3");
    expect(sortedPayments[2]?.id).toBe("pay-1");
    expect(sortedPayments[3]?.id).toBe("pay-4");
  });

  it("bank-sms webhook preserves and forwards optional custom receivedAt ISO timestamp", async () => {
    const { NextRequest } = await import("next/server");
    const { POST } = await import("@/app/api/webhooks/bank-sms/route");
    const customTimestamp = "2026-10-23T12:34:56.789Z";

    const req = new NextRequest("http://localhost/api/webhooks/bank-sms", {
      method: "POST",
      headers: {
        "x-sms-secret": "tm_internal_bank_secret_2026",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        sender: "FamPay",
        message: "You received Rs. 31,624.00 from rahul@okaxis via FamPay. UPI Ref: 429183746599. Trip: TM-492011",
        receivedAt: customTimestamp,
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(mockRpcCalls.length).toBe(1);
    expect(mockRpcCalls[0]?.fn).toBe("ingest_bank_payment_message");
    expect(mockRpcCalls[0]?.args.p_utr_number).toBe("429183746599");
    expect(mockRpcCalls[0]?.args.p_received_at).toBe(customTimestamp);
  });

  describe("Fix Bank Inbox Upsert, Footer Disclaimers & Live Refresh (Bugfix Suite)", () => {
    it("accepts authentic FamPay HTML email with security disclaimer containing OTP and 'sent' in footer", () => {
      const htmlEmail = `
        <div style="font-family: sans-serif;">
          <h2>Payment Received</h2>
          <p>Hi TripMate Admin, ₹18,500.00 has been credited to your FamPay account via UPI.</p>
          <p>UPI Ref / UTR: <strong>918273645012</strong></p>
          <p>Sender VPA: rohit@oksbi</p>
          <hr />
          <footer style="font-size: 11px; color: #888;">
            Security Disclaimer: Never share your OTP, UPI PIN, or password with anyone. 
            If this transaction was not sent by you, report to grievance immediately.
          </footer>
        </div>
      `;

      const result = parseStrictBankMessage({
        channel: "gmail",
        sender: "FamPay Alerts <no-reply@fampay.in>",
        subject: "Payment Received: ₹18,500 credited to your account",
        body: htmlEmail,
      });

      expect(result.isBankMessage).toBe(true);
      expect(result.amount).toBe(18500);
      expect(result.utrNumber).toBe("918273645012");
      expect(result.payerVpa).toBe("rohit@oksbi");
      expect(result.bankName).toBe("FamPay / IDFC");
    });

    it("generates deterministic 12-digit numeric UTR fallback for bank email without 12-digit regex match", () => {
      const emailWithoutUtr = `
        Dear Customer,
        You have received INR 5,500.00 in your HDFC Bank account from Priya Sharma.
        Transaction reference: HDFC-TXN-ABC99.
      `;

      const result = parseStrictBankMessage({
        channel: "gmail",
        sender: "alerts@hdfcbank.net",
        subject: "Payment Received: INR 5,500 credited",
        body: emailWithoutUtr,
      });

      expect(result.isBankMessage).toBe(true);
      expect(result.amount).toBe(5500);
      expect(result.utrNumber).toMatch(/^\d{12}$/);
      expect(result.bankName).toBe("HDFC Bank");
    });

    it("re-triggering an existing UTR updates its timestamp and surfaces it at index 0", async () => {
      const { sortByLatestTimestamp } = await import("@/components/features/admin/PaymentsView");

      interface InboxItem {
        id: string;
        utr_number: string;
        created_at: string;
      }

      const item1: InboxItem = { id: "inbox-1", utr_number: "111111111111", created_at: "2026-10-24T08:00:00.000Z" };
      const item2: InboxItem = { id: "inbox-2", utr_number: "222222222222", created_at: "2026-10-24T09:00:00.000Z" };
      // Re-trigger inbox-3 (which was oldest at 07:00:00) with fresh now() timestamp (10:30:00)
      const retriggeredInbox3: InboxItem = { id: "inbox-3", utr_number: "333333333333", created_at: "2026-10-24T10:30:00.000Z" };

      const updatedList: InboxItem[] = [item1, item2, retriggeredInbox3];

      const sorted = sortByLatestTimestamp(updatedList);
      expect(sorted[0]?.utr_number).toBe("333333333333");
      expect(sorted[0]?.id).toBe("inbox-3");
    });

    it("fetchLatestBankInboxAndPaymentsAction returns fresh rows ordered by created_at DESC", async () => {
      mockAdminAuthorized = true;
      mockBankInboxDbRows = [
        { id: "b-1", created_at: "2026-10-24T06:00:00.000Z", utr_number: "111111111111", amount: 1000, channel: "sms", sender: "SBI", raw_body: "credit" },
        { id: "b-2", created_at: "2026-10-24T10:00:00.000Z", utr_number: "222222222222", amount: 5000, channel: "gmail", sender: "FamPay", raw_body: "credit" },
      ];
      mockPaymentsDbRows = [
        { id: "p-1", created_at: "2026-10-24T05:00:00.000Z", amount: 1000, status: "succeeded", method: "upi" },
        { id: "p-2", created_at: "2026-10-24T09:00:00.000Z", amount: 5000, status: "succeeded", method: "upi" },
      ];
      mockTripsDbRows = [
        { id: "t-1", booking_ref: "TM-100001", total_amount: 5000, status: "pending_approval" },
      ];

      const res = await fetchLatestBankInboxAndPaymentsAction();
      expect(res.ok).toBe(true);
      expect(res.bankInbox.length).toBe(2);
      expect(res.bankInbox[0]?.id).toBe("b-2"); // Newest (10:00) at index 0
      expect(res.bankInbox[1]?.id).toBe("b-1");
      expect(res.payments.length).toBe(2);
      expect(res.payments[0]?.id).toBe("p-2"); // Newest (09:00) at index 0
      expect(res.payments[1]?.id).toBe("p-1");
      expect(res.pendingTrips?.length).toBe(1);
    });
  });

  describe("Indian TRAI DLT Bank SMS Parser & Webhook Route Enhancements", () => {
    it("recognizes all Indian TRAI DLT SMS sender headers (AD-SBIBNK-S, VM-HDFCBK-S, JX-IDFCFB-S, BP-ICICIT, AX-FAMPAY, TM-PAYTMB, CP-AXISBK)", () => {
      const senders = [
        { sender: "AD-SBIBNK-S", expectedBank: "State Bank of India (SBI)" },
        { sender: "VM-HDFCBK-S", expectedBank: "HDFC Bank" },
        { sender: "JX-IDFCFB-S", expectedBank: "IDFC FIRST Bank" },
        { sender: "BP-ICICIT", expectedBank: "ICICI Bank" },
        { sender: "AX-FAMPAY", expectedBank: "FamPay / IDFC" },
        { sender: "TM-PAYTMB", expectedBank: "Paytm Payments Bank" },
        { sender: "CP-AXISBK", expectedBank: "Axis Bank" },
      ];

      for (const item of senders) {
        const sms = `Dear Customer, A/c credited with Rs 2,500.00 via UPI. Ref 429183746512.`;
        const res = parseStrictBankMessage({
          channel: "sms",
          sender: item.sender,
          body: sms,
        });
        expect(res.isBankMessage).toBe(true);
        expect(res.bankName).toBe(item.expectedBank);
        expect(res.amount).toBe(2500);
        expect(res.utrNumber).toBe("429183746512");
      }
    });

    it("parses all real Indian UPI Credit SMS templates with high precision", () => {
      // SBI
      const sbiSms = "Dear SBI UPI User, A/C X1234 credited by Rs 12215.00 on 24Oct26 transfer from HARSH KUMAR Ref No 429183746512";
      const sbiRes = parseStrictBankMessage({
        channel: "sms",
        sender: "AD-SBIBNK-S",
        body: sbiSms,
      });
      expect(sbiRes.isBankMessage).toBe(true);
      expect(sbiRes.amount).toBe(12215);
      expect(sbiRes.utrNumber).toBe("429183746512");

      // HDFC
      const hdfcSms = "Rs. 2500.00 credited to a/c XX1234 on 24-10-26 by UPI: 429183746512";
      const hdfcRes = parseStrictBankMessage({
        channel: "sms",
        sender: "VM-HDFCBK-S",
        body: hdfcSms,
      });
      expect(hdfcRes.isBankMessage).toBe(true);
      expect(hdfcRes.amount).toBe(2500);
      expect(hdfcRes.utrNumber).toBe("429183746512");

      // ICICI
      const iciciSms = "Acct XX987 is credited with INR 8,450.00 on 24-Oct-26 from rahul@upi UPI:429183746512";
      const iciciRes = parseStrictBankMessage({
        channel: "sms",
        sender: "BP-ICICIT",
        body: iciciSms,
      });
      expect(iciciRes.isBankMessage).toBe(true);
      expect(iciciRes.amount).toBe(8450);
      expect(iciciRes.utrNumber).toBe("429183746512");

      // Axis / Kotak / IDFC / BOB / PNB
      const axisSms = "INR 1,500.00 credited to A/c no. XX123 on 24-10-26. UPI Ref: 429183746512";
      const axisRes = parseStrictBankMessage({
        channel: "sms",
        sender: "CP-AXISBK",
        body: axisSms,
      });
      expect(axisRes.isBankMessage).toBe(true);
      expect(axisRes.amount).toBe(1500);
      expect(axisRes.utrNumber).toBe("429183746512");

      // FamPay / UPI App Alerts
      const famSms = "Received Rs.1,499.00 from rohit@fam via UPI. Ref: 429183746512";
      const famRes = parseStrictBankMessage({
        channel: "sms",
        sender: "AX-FAMPAY",
        body: famSms,
      });
      expect(famRes.isBankMessage).toBe(true);
      expect(famRes.amount).toBe(1499);
      expect(famRes.utrNumber).toBe("429183746512");
    });

    it("strictly rejects outgoing Amt Sent / debited messages", () => {
      const sentSms = "Amt Sent Rs.2500.00 from a/c XX1234 on 24-10-26 to merchant. Ref: 429183746512";
      const res = parseStrictBankMessage({
        channel: "sms",
        sender: "VM-HDFCBK-S",
        body: sentSms,
      });
      expect(res.isBankMessage).toBe(false);
      expect(res.reason).toBe("rejected_debit_or_security_message");
    });

    it("generates deterministic 12-digit numeric ID for SMS when reference is alphanumeric", () => {
      const alphaRefSms = "Dear SBI User, your A/c credited by Rs 3,200.00. Txn Ref: SBIN98234812.";
      const res = parseStrictBankMessage({
        channel: "sms",
        sender: "AD-SBIBNK-S",
        body: alphaRefSms,
      });
      expect(res.isBankMessage).toBe(true);
      expect(res.amount).toBe(3200);
      expect(res.utrNumber).toMatch(/^\d{12}$/);
    });

    it("bank-sms GET endpoint returns online status when secret query param is valid", async () => {
      const { NextRequest } = await import("next/server");
      const { GET } = await import("@/app/api/webhooks/bank-sms/route");

      const req = new NextRequest("http://localhost/api/webhooks/bank-sms?secret=tm_internal_bank_secret_2026", {
        method: "GET",
      });
      const res = await GET(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.ok).toBe(true);
      expect(json.status).toContain("TripMate Bank SMS Webhook Online");
    });

    it("bank-sms GET endpoint rejects request when secret is missing or invalid", async () => {
      const { NextRequest } = await import("next/server");
      const { GET } = await import("@/app/api/webhooks/bank-sms/route");

      const req = new NextRequest("http://localhost/api/webhooks/bank-sms?secret=invalid_secret", {
        method: "GET",
      });
      const res = await GET(req);
      expect(res.status).toBe(401);
    });

    it("bank-sms POST endpoint accepts raw text body with query param secret (MacroDroid format)", async () => {
      const { NextRequest } = await import("next/server");
      const { POST } = await import("@/app/api/webhooks/bank-sms/route");

      const rawText = "Dear SBI UPI User, A/C X1234 credited by Rs 12215.00 on 24Oct26 transfer from HARSH KUMAR Ref No 429183746599";
      const req = new NextRequest("http://localhost/api/webhooks/bank-sms?secret=tm_internal_bank_secret_2026&sender=AD-SBIBNK-S", {
        method: "POST",
        headers: {
          "content-type": "text/plain",
        },
        body: rawText,
      });

      const res = await POST(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.ok).toBe(true);
      expect(mockRpcCalls.length).toBe(1);
      expect(mockRpcCalls[0]?.args.p_amount).toBe(12215);
      expect(mockRpcCalls[0]?.args.p_utr_number).toBe("429183746599");
    });

    it("synthesizes test bank SMS card at Row #1 when MacroDroid Test Action sends literal placeholder", async () => {
      const { NextRequest } = await import("next/server");
      const { POST } = await import("@/app/api/webhooks/bank-sms/route");

      const req = new NextRequest("http://localhost/api/webhooks/bank-sms?secret=tm_internal_bank_secret_2026", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          message: "[sms_message]",
          sender: "PHONE-TEST-OK",
        }),
      });

      const res = await POST(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.ok).toBe(true);
      expect(json.testMode).toBe(true);
      expect(json.amount).toBe(1);
      expect(json.sender).toBe("PHONE-TEST-OK");
      expect(json.utrNumber).toMatch(/^\d{12}$/);
    });

    it("permissively accepts unrecognized bank SMS format when rupee amount is present (non-OTP)", async () => {
      const { NextRequest } = await import("next/server");
      const { POST } = await import("@/app/api/webhooks/bank-sms/route");

      // Custom/regional bank wording with Rs amount and 12-digit reference
      const unconventionalSms = "Alert from Co-op Society: Rs 4,500.00 received in your credit balance. Ref: 772918346512.";
      const req = new NextRequest("http://localhost/api/webhooks/bank-sms?secret=tm_internal_bank_secret_2026", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          message: unconventionalSms,
          sender: "COOP-BANK",
        }),
      });

      const res = await POST(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.ok).toBe(true);
      expect(json.ingested).toBe(true);
      expect(json.amount).toBe(4500);
      expect(json.utrNumber).toBe("772918346512");
    });

    it("GET 1-tap test link with ?text= inserts test row at Row #1 and returns expected status and utr_number", async () => {
      const { NextRequest } = await import("next/server");
      const { GET } = await import("@/app/api/webhooks/bank-sms/route");

      const req = new NextRequest(
        "http://localhost/api/webhooks/bank-sms?secret=tm_internal_bank_secret_2026&text=Test+Phone+Connection+Rs.1",
        { method: "GET" }
      );
      const res = await GET(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.ok).toBe(true);
      expect(json.status).toBe("TripMate Bank SMS Webhook Online & Test Row Ingested at Row #1!");
      expect(json.utr_number).toMatch(/^\d{12}$/);
      expect(json.utrNumber).toMatch(/^\d{12}$/);
      expect(json.amount).toBe(1);
    });

    it("cleanSecret strips surrounding double and single quotes and trims whitespace", async () => {
      const { cleanSecret } = await import("@/lib/payments/webhook-auth");

      expect(cleanSecret('"tm_internal_bank_secret_2026"')).toBe("tm_internal_bank_secret_2026");
      expect(cleanSecret("'tm_internal_bank_secret_2026'")).toBe("tm_internal_bank_secret_2026");
      expect(cleanSecret("  tm_internal_bank_secret_2026  ")).toBe("tm_internal_bank_secret_2026");
      expect(cleanSecret('  "tm_internal_bank_secret_2026"  ')).toBe("tm_internal_bank_secret_2026");
      expect(cleanSecret(null)).toBeNull();
      expect(cleanSecret("")).toBeNull();
      expect(cleanSecret("   ")).toBeNull();
    });

    it("extractIncomingSecret resolves secrets across query params, headers, bearer auth, and body", async () => {
      const { NextRequest } = await import("next/server");
      const { extractIncomingSecret } = await import("@/lib/payments/webhook-auth");

      // 1. ?secret=
      const req1 = new NextRequest("http://localhost/api/webhooks/bank-sms?secret=query_sec");
      expect(extractIncomingSecret(req1)).toBe("query_sec");

      // 2. ?token=
      const req2 = new NextRequest("http://localhost/api/webhooks/bank-sms?token=token_sec");
      expect(extractIncomingSecret(req2)).toBe("token_sec");

      // 3. x-sms-secret header
      const req3 = new NextRequest("http://localhost/api/webhooks/bank-sms", {
        headers: { "x-sms-secret": "hdr_sms_sec" },
      });
      expect(extractIncomingSecret(req3)).toBe("hdr_sms_sec");

      // 4. x-webhook-secret header
      const req4 = new NextRequest("http://localhost/api/webhooks/bank-sms", {
        headers: { "x-webhook-secret": "hdr_wh_sec" },
      });
      expect(extractIncomingSecret(req4)).toBe("hdr_wh_sec");

      // 5. Authorization: Bearer
      const req5 = new NextRequest("http://localhost/api/webhooks/bank-sms", {
        headers: { authorization: "Bearer bearer_sec_123" },
      });
      expect(extractIncomingSecret(req5)).toBe("bearer_sec_123");

      // 6. parsedBody.secret
      const req6 = new NextRequest("http://localhost/api/webhooks/bank-sms");
      expect(extractIncomingSecret(req6, { secret: "body_sec" })).toBe("body_sec");
    });

    it("isValidWebhookSecret authorizes both internal and configured webhook secrets", async () => {
      const { isValidWebhookSecret } = await import("@/lib/payments/webhook-auth");
      const allowed = ["tm_internal_bank_secret_2026", "tm_whsec_configured_fampay"];

      expect(isValidWebhookSecret("tm_internal_bank_secret_2026", allowed)).toBe(true);
      expect(isValidWebhookSecret('"tm_internal_bank_secret_2026"', allowed)).toBe(true);
      expect(isValidWebhookSecret("tm_whsec_configured_fampay", allowed)).toBe(true);
      expect(isValidWebhookSecret("invalid_secret_123", allowed)).toBe(false);
      expect(isValidWebhookSecret(null, allowed)).toBe(false);
    });

    it("keeps test-row amount consistent with stored raw_body when customized amount or text is provided", async () => {
      const { NextRequest } = await import("next/server");
      const { GET } = await import("@/app/api/webhooks/bank-sms/route");

      const req = new NextRequest(
        "http://localhost/api/webhooks/bank-sms?secret=tm_internal_bank_secret_2026&text=Phone+Live+Test+Rs.500",
        { method: "GET" }
      );
      const res = await GET(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.ok).toBe(true);
      expect(json.amount).toBe(500);
      expect(json.utr_number).toMatch(/^\d{12}$/);
    });

    it("bank-email GET endpoint returns 200 when authenticated with token query parameter", async () => {
      const { NextRequest } = await import("next/server");
      const { GET } = await import("@/app/api/webhooks/bank-email/route");

      const req = new NextRequest("http://localhost/api/webhooks/bank-email?token=tm_internal_bank_secret_2026", {
        method: "GET",
      });
      const res = await GET(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.ok).toBe(true);
      expect(json.status).toBe("TripMate Bank Email Webhook Online");
    });
  });
});
