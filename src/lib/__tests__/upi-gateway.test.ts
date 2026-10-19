import { describe, it, expect } from "vitest";
import {
  buildUpiPaymentUri,
  generateUpiQrSvg,
  generateUpiQrDataUrl,
  isValidUtr,
} from "../payments/upi-qr";
import {
  submitDirectUpiPaymentSchema,
  adminVerifyUpiPaymentSchema,
  adminUpdatePricingConfigSchema,
} from "../validations/actions";
import { AdminService } from "../admin/admin-service";
import type { AdminActor, PaymentInvoiceRecord, BookingAdmin } from "../admin/types";

describe("Direct UPI Gateway (YouPI-PG Mode) Unit Tests", () => {
  describe("NPCI upi://pay URI Generator", () => {
    it("generates an NPCI-compliant URI with exact 2-decimal INR amount and URL encoding", () => {
      const uri = buildUpiPaymentUri({
        vpa: "tripmate@okhdfcbank",
        payeeName: "TripMate Travels & Concierge",
        amount: 27376,
        transactionNote: "Booking #TM-492011",
        transactionRef: "TM-492011",
      });

      expect(uri).toContain("upi://pay?");
      expect(uri).toContain("pa=tripmate%40okhdfcbank");
      expect(uri).toContain("pn=TripMate%20Travels%20%26%20Concierge");
      expect(uri).toContain("am=27376.00");
      expect(uri).toContain("cu=INR");
      expect(uri).toContain("tn=Booking%20%23TM-492011");
      expect(uri).toContain("tr=TM-492011");
    });

    it("formats fractional amounts with exactly 2 decimal places", () => {
      const uri = buildUpiPaymentUri({
        vpa: "admin@upi",
        payeeName: "Admin",
        amount: 1499.5,
      });

      expect(uri).toContain("am=1499.50");
    });

    it("falls back to default VPA and payee name when empty or missing", () => {
      const uri = buildUpiPaymentUri({
        vpa: "",
        payeeName: "",
        amount: 500,
      });

      expect(uri).toContain("pa=tripmate%40upi");
      expect(uri).toContain("pn=TripMate%20Travels");
      expect(uri).toContain("am=500.00");

    });
  });

  describe("Flat Solid QR Code Generator", () => {
    it("renders crisp flat SVG without gradients using #1F1F1E modules on #FFFFFF", async () => {
      const uri = "upi://pay?pa=tripmate@upi&pn=TripMate&am=27376.00&cu=INR";
      const svg = await generateUpiQrSvg(uri, { size: 200 });

      expect(svg).toContain("<svg");
      expect(svg).toContain("#1F1F1E");
      expect(svg).toContain("#FFFFFF");
      expect(svg).not.toContain("linearGradient");
      expect(svg).not.toContain("radialGradient");
    });

    it("generates a valid base64 data URL for PNG rendering", async () => {
      const uri = "upi://pay?pa=tripmate@upi&pn=TripMate&am=1000.00&cu=INR";
      const dataUrl = await generateUpiQrDataUrl(uri, { size: 180 });

      expect(dataUrl).toMatch(/^data:image\/png;base64,/);
    });
  });

  describe("12-Digit UTR Format Validation & Schema Guardrails", () => {
    it("accepts valid 12-digit numeric UTRs", () => {
      expect(isValidUtr("429183746512")).toBe(true);
      expect(isValidUtr("000123456789")).toBe(true);
      expect(isValidUtr("  582910482910  ")).toBe(true);
    });

    it("rejects non-12-digit or non-numeric UTRs", () => {
      expect(isValidUtr("")).toBe(false);
      expect(isValidUtr(null)).toBe(false);
      expect(isValidUtr(undefined)).toBe(false);
      expect(isValidUtr("12345678901")).toBe(false); // 11 digits
      expect(isValidUtr("1234567890123")).toBe(false); // 13 digits
      expect(isValidUtr("42918374651A")).toBe(false); // Alphanumeric
      expect(isValidUtr("UTR-429183746512")).toBe(false); // Prefix
    });

    it("validates submitDirectUpiPaymentSchema strictly", () => {
      const valid = submitDirectUpiPaymentSchema.safeParse({
        tripId: "c29487b3-8833-4f51-b062-817346129841",
        utrNumber: "429183746512",
        payerVpa: "rahul@okaxis",
      });
      expect(valid.success).toBe(true);

      const invalidUtr = submitDirectUpiPaymentSchema.safeParse({
        tripId: "c29487b3-8833-4f51-b062-817346129841",
        utrNumber: "12345",
      });
      expect(invalidUtr.success).toBe(false);

      const missingTrip = submitDirectUpiPaymentSchema.safeParse({
        tripId: "",
        utrNumber: "429183746512",
      });
      expect(missingTrip.success).toBe(false);
    });

    it("validates adminVerifyUpiPaymentSchema for verified and rejected decisions", () => {
      const verifyDecision = adminVerifyUpiPaymentSchema.safeParse({
        paymentId: "pay-1234",
        status: "verified",
        notes: "Bank statement verified manually",
      });
      expect(verifyDecision.success).toBe(true);

      const rejectDecision = adminVerifyUpiPaymentSchema.safeParse({
        paymentId: "pay-1234",
        status: "rejected",
        notes: "Fake UTR: Transaction not found in bank ledger",
      });
      expect(rejectDecision.success).toBe(true);

      const invalidStatus = adminVerifyUpiPaymentSchema.safeParse({
        paymentId: "pay-1234",
        status: "pending_verification",
      });
      expect(invalidStatus.success).toBe(false);
    });

    it("validates adminUpdatePricingConfigSchema with merchant UPI settings", () => {
      const config = adminUpdatePricingConfigSchema.safeParse({
        serviceFee: 999,
        gstRate: 0.18,
        demoCouponCode: "EXPLOREINDIA",
        demoCouponDiscount: 2000,
        merchantUpiVpa: "harsh@okaxis",
        merchantPayeeName: "TripMate Official",
        activePaymentGateway: "direct_upi_utr",
        upiAutoConfirm: true,
      });

      expect(config.success).toBe(true);
      if (config.success) {
        expect(config.data.merchantUpiVpa).toBe("harsh@okaxis");
        expect(config.data.activePaymentGateway).toBe("direct_upi_utr");
        expect(config.data.upiAutoConfirm).toBe(true);
      }
    });
  });

  describe("Admin UTR Verification & Fake-UTR Cancellation Flow", () => {
    const adminActor: AdminActor = {
      id: "admin-super",
      role: "super_admin",
      full_name: "Super Administrator",
    };

    it("verifies a pending UTR and updates verification status in memory and audit log", () => {
      const testPaymentId = "pay-upi-test-1";
      const testTripId = "trip-upi-test-1";

      const samplePayment: PaymentInvoiceRecord = {
        id: testPaymentId,
        trip_id: testTripId,
        booking_ref: "TM-999001",
        customer_name: "Test Traveler",
        invoice_number: "INV-2026-999001",
        amount: 27376,
        gst_amount: 4176,
        method: "upi",
        status: "completed",
        itc_qualified: true,
        utr_number: "429183746512",
        payer_vpa: "traveler@okaxis",
        verification_status: "pending_verification",
        created_at: new Date().toISOString(),
      };

      const sampleBooking: BookingAdmin = {
        id: testTripId,
        booking_ref: "TM-999001",
        user_id: "user-1",
        customer_name: "Test Traveler",
        customer_email: "traveler@example.com",
        customer_phone: "9810123456",
        kind: "normal",
        destination_name: "Jaipur",
        start_date: "2026-11-01",
        end_date: "2026-11-05",
        days: 4,
        traveler_count: 2,
        subtotal_amount: 23896,
        service_fee: 999,
        tax_amount: 4481,
        discount_amount: 2000,
        coupon_code: "EXPLOREINDIA",
        total_amount: 27376,
        status: "confirmed",
        utr_number: "429183746512",
        verification_status: "pending_verification",
        travellers: [],
        notes: [],
        created_at: new Date().toISOString(),
      };

      AdminService.hydrateOperationalData({
        payments: [samplePayment],
        bookings: [sampleBooking],
      });

      AdminService.verifyUpiPayment(adminActor, testPaymentId, "verified", "Bank credit confirmed");

      const updatedPayments = AdminService.getPayments();
      const targetPayment = updatedPayments.find((p) => p.id === testPaymentId);
      expect(targetPayment?.verification_status).toBe("verified");

      const updatedBookings = AdminService.getBookings();
      const targetBooking = updatedBookings.find((b) => b.id === testTripId);
      expect(targetBooking?.verification_status).toBe("verified");
      expect(targetBooking?.status).toBe("confirmed");

      const audits = AdminService.getAuditLogs();
      const latestAudit = audits.find((a) => a.entity_id === testPaymentId);
      expect(latestAudit).toBeDefined();
      expect(latestAudit?.action).toBe("verify_upi_utr");
    });

    it("rejects a fake UTR and automatically cancels the booking to protect finances", () => {
      const testPaymentId = "pay-fake-utr";
      const testTripId = "trip-fake-utr";

      const samplePayment: PaymentInvoiceRecord = {
        id: testPaymentId,
        trip_id: testTripId,
        booking_ref: "TM-999002",
        customer_name: "Fake User",
        invoice_number: "INV-2026-999002",
        amount: 27376,
        gst_amount: 4176,
        method: "upi",
        status: "completed",
        itc_qualified: true,
        utr_number: "000000000000",
        payer_vpa: "scammer@fake",
        verification_status: "pending_verification",
        created_at: new Date().toISOString(),
      };

      const sampleBooking: BookingAdmin = {
        id: testTripId,
        booking_ref: "TM-999002",
        user_id: "user-scam",
        customer_name: "Fake User",
        customer_email: "fake@scam.com",
        customer_phone: "9810999999",
        kind: "normal",
        destination_name: "Jaipur",
        start_date: "2026-11-01",
        end_date: "2026-11-05",
        days: 4,
        traveler_count: 2,
        subtotal_amount: 23896,
        service_fee: 999,
        tax_amount: 4481,
        discount_amount: 2000,
        coupon_code: null,
        total_amount: 27376,
        status: "confirmed",
        utr_number: "000000000000",
        verification_status: "pending_verification",
        travellers: [],
        notes: [],
        created_at: new Date().toISOString(),
      };

      AdminService.hydrateOperationalData({
        payments: [samplePayment],
        bookings: [sampleBooking],
      });

      AdminService.verifyUpiPayment(
        adminActor,
        testPaymentId,
        "rejected",
        "UTR not found in merchant bank account",
        "Fraud detection rejection"
      );

      const updatedPayments = AdminService.getPayments();
      const targetPayment = updatedPayments.find((p) => p.id === testPaymentId);
      expect(targetPayment?.verification_status).toBe("rejected");

      const updatedBookings = AdminService.getBookings();
      const targetBooking = updatedBookings.find((b) => b.id === testTripId);
      expect(targetBooking?.verification_status).toBe("rejected");
      expect(targetBooking?.status).toBe("cancelled");

      const audits = AdminService.getAuditLogs();
      const latestAudit = audits.find((a) => a.entity_id === testPaymentId);
      expect(latestAudit).toBeDefined();
      expect(latestAudit?.action).toBe("reject_upi_utr");
    });
  });
});
