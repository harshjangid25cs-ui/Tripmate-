"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import type { ValidatedDraftTrip } from "@/lib/data/booking-guards";
import { processTripPayment, applyCustomerCouponAction } from "@/lib/actions/trips";
import { createRazorpayOrderAction, verifyRazorpayPaymentAction } from "@/lib/actions/razorpay";
import { formatCurrency } from "@/lib/format";
import { buildUpiPaymentUri, generateUpiQrDataUrl, isValidUtr } from "@/lib/payments/upi-qr";
import { submitDirectUpiPaymentAction } from "@/lib/actions/admin-ops";
import { createClient } from "@/lib/supabase/client";

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => { open: () => void };
  }
}

function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window === "undefined") {
      resolve(false);
      return;
    }
    if (window.Razorpay) {
      resolve(true);
      return;
    }
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export interface PaymentConfigProp {
  merchantUpiVpa?: string;
  merchantPayeeName?: string;
  activePaymentGateway?: "auto" | "direct_upi_utr" | "razorpay" | "demo";
  upiAutoConfirm?: boolean;
  merchant_upi_vpa?: string;
  merchant_payee_name?: string;
  active_payment_gateway?: "auto" | "direct_upi_utr" | "razorpay" | "demo";
  upi_auto_confirm?: boolean;
  gst_rate?: number;
  service_fee?: number;
  gstRate?: number;
  serviceFee?: number;
}

export interface TripCheckoutViewProps {
  tripData?: ValidatedDraftTrip;
  trip?: ValidatedDraftTrip["trip"];
  paymentConfig?: PaymentConfigProp;
  pricingConfig?: PaymentConfigProp;
}

export function TripCheckoutView({ tripData, trip: propTrip, paymentConfig, pricingConfig }: TripCheckoutViewProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const trip = propTrip || tripData?.trip;
  if (!trip) {
    throw new Error("TripCheckoutView requires either a trip or tripData prop.");
  }
  const hotel = tripData?.hotel ?? null;
  const vehicle = tripData?.vehicle ?? null;
  const stops = tripData?.stops ?? [];
  const destination = tripData?.destination ?? null;

  // Initial values resolved with priority: paymentConfig > pricingConfig > default
  const resolvedInitialVpa =
    paymentConfig?.merchantUpiVpa ||
    paymentConfig?.merchant_upi_vpa ||
    pricingConfig?.merchantUpiVpa ||
    pricingConfig?.merchant_upi_vpa ||
    "tripmate@upi";

  const resolvedInitialPayee =
    paymentConfig?.merchantPayeeName ||
    paymentConfig?.merchant_payee_name ||
    pricingConfig?.merchantPayeeName ||
    pricingConfig?.merchant_payee_name ||
    "TripMate Travels";

  const resolvedInitialGateway =
    paymentConfig?.activePaymentGateway ||
    paymentConfig?.active_payment_gateway ||
    pricingConfig?.activePaymentGateway ||
    pricingConfig?.active_payment_gateway ||
    "auto";

  // Reactive state for merchant UPI parameters
  const [merchantVpa, setMerchantVpa] = React.useState(resolvedInitialVpa);
  const [merchantPayeeName, setMerchantPayeeName] = React.useState(resolvedInitialPayee);
  const [activeGateway, setActiveGateway] = React.useState(resolvedInitialGateway);

  // Sync state when props change
  React.useEffect(() => {
    const vpa =
      paymentConfig?.merchantUpiVpa ||
      paymentConfig?.merchant_upi_vpa ||
      pricingConfig?.merchantUpiVpa ||
      pricingConfig?.merchant_upi_vpa;
    if (vpa && vpa.trim()) {
      setMerchantVpa((prev) => (vpa.trim() !== prev ? vpa.trim() : prev));
    }

    const payee =
      paymentConfig?.merchantPayeeName ||
      paymentConfig?.merchant_payee_name ||
      pricingConfig?.merchantPayeeName ||
      pricingConfig?.merchant_payee_name;
    if (payee && payee.trim()) {
      setMerchantPayeeName((prev) => (payee.trim() !== prev ? payee.trim() : prev));
    }

    const gateway =
      paymentConfig?.activePaymentGateway ||
      paymentConfig?.active_payment_gateway ||
      pricingConfig?.activePaymentGateway ||
      pricingConfig?.active_payment_gateway;
    if (gateway) {
      setActiveGateway((prev) => (gateway !== prev ? gateway : prev));
    }
  }, [
    paymentConfig?.merchantUpiVpa,
    paymentConfig?.merchant_upi_vpa,
    paymentConfig?.merchantPayeeName,
    paymentConfig?.merchant_payee_name,
    paymentConfig?.activePaymentGateway,
    paymentConfig?.active_payment_gateway,
    pricingConfig?.merchantUpiVpa,
    pricingConfig?.merchant_upi_vpa,
    pricingConfig?.merchantPayeeName,
    pricingConfig?.merchant_payee_name,
    pricingConfig?.activePaymentGateway,
    pricingConfig?.active_payment_gateway,
  ]);

  // Real-time synchronization from Supabase WebSocket & on-mount freshness check
  React.useEffect(() => {
    let active = true;
    let supabaseClient: ReturnType<typeof createClient> | null = null;

    try {
      supabaseClient = createClient();
    } catch {
      return;
    }

    // 1. Fetch live active row on mount to bypass any browser cache
    void (async () => {
      try {
        const { data } = await supabaseClient!
          .from("pricing_config")
          .select("merchant_upi_vpa, merchant_payee_name, active_payment_gateway, upi_auto_confirm")
          .order("updated_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (!active || !data) return;
        const row = data as {
          merchant_upi_vpa?: string | null;
          merchant_payee_name?: string | null;
          active_payment_gateway?: "auto" | "direct_upi_utr" | "razorpay" | "demo" | null;
        };
        if (row.merchant_upi_vpa?.trim()) {
          setMerchantVpa(row.merchant_upi_vpa.trim());
        }
        if (row.merchant_payee_name?.trim()) {
          setMerchantPayeeName(row.merchant_payee_name.trim());
        }
        if (row.active_payment_gateway) {
          setActiveGateway(row.active_payment_gateway);
        }
      } catch {
        // Fallback silently if offline
      }
    })();

    // 2. Subscribe to Supabase Realtime postgres_changes broadcast
    const channel = supabaseClient
      .channel(`pricing-config-live-${Math.random().toString(36).slice(2, 7)}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "pricing_config",
        },
        (payload) => {
          if (!active) return;
          const newRow = payload.new as {
            merchant_upi_vpa?: string | null;
            merchant_payee_name?: string | null;
            active_payment_gateway?: "auto" | "direct_upi_utr" | "razorpay" | "demo" | null;
          } | null;

          if (newRow?.merchant_upi_vpa?.trim()) {
            setMerchantVpa(newRow.merchant_upi_vpa.trim());
          }
          if (newRow?.merchant_payee_name?.trim()) {
            setMerchantPayeeName(newRow.merchant_payee_name.trim());
          }
          if (newRow?.active_payment_gateway) {
            setActiveGateway(newRow.active_payment_gateway);
          }
        }
      )
      .subscribe();

    return () => {
      active = false;
      if (supabaseClient) {
        supabaseClient.removeChannel(channel);
      }
    };
  }, []);

  // UPI sub-mode: Direct UPI QR (default) vs Instant UPI VPA
  const [upiSubMode, setUpiSubMode] = React.useState<"direct_qr" | "instant">("direct_qr");
  const [utrNumber, setUtrNumber] = React.useState("");
  const [payerVpa, setPayerVpa] = React.useState("");
  const [copiedVpa, setCopiedVpa] = React.useState(false);
  const [qrDataUrl, setQrDataUrl] = React.useState<string | null>(null);

  const upiUri = React.useMemo(() => {
    return buildUpiPaymentUri({
      vpa: merchantVpa,
      payeeName: merchantPayeeName,
      amount: trip.total_amount,
      transactionNote: `TripMate #${trip.booking_ref}`,
      transactionRef: trip.booking_ref,
    });
  }, [merchantVpa, merchantPayeeName, trip.total_amount, trip.booking_ref]);

  React.useEffect(() => {
    let active = true;
    generateUpiQrDataUrl(upiUri, { size: 220 }).then((url) => {
      if (active) setQrDataUrl(url);
    });
    return () => {
      active = false;
    };
  }, [upiUri]);

  const handleCopyVpa = async () => {
    try {
      await navigator.clipboard.writeText(merchantVpa);
      setCopiedVpa(true);
      setTimeout(() => setCopiedVpa(false), 2000);
    } catch {
      // fallback
    }
  };

  const handleDirectUpiSubmit = async () => {
    const cleanUtr = utrNumber.trim();
    if (!isValidUtr(cleanUtr)) {
      setErrorMsg("Please enter a valid strictly 12-digit UPI UTR number.");
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const res = await submitDirectUpiPaymentAction({
        tripId: trip.id,
        utrNumber: cleanUtr,
        payerVpa: payerVpa.trim() || undefined,
      });

      if (!res.ok) {
        setErrorMsg(res.error || "Failed to submit direct UPI payment.");
        setIsSubmitting(false);
        return;
      }

      router.refresh();
      router.push(`/book/${trip.id}/confirmed`);
    } catch {
      setErrorMsg("Network error submitting UTR payment. Please retry.");
      setIsSubmitting(false);
    }
  };

  // Payment method selection
  const [paymentMethod, setPaymentMethod] = React.useState<"upi" | "card" | "netbanking" | "emi">("upi");
  const [upiId, setUpiId] = React.useState("traveler@okhdfcbank");
  const [upiVerified, setUpiVerified] = React.useState(true);
  const [isVerifyingUpi, setIsVerifyingUpi] = React.useState(false);

  // Sync active payment gateway mode
  React.useEffect(() => {
    if (activeGateway === "direct_upi_utr") {
      setPaymentMethod("upi");
      setUpiSubMode("direct_qr");
    }
  }, [activeGateway]);

  // Card demo fields
  const [cardNumber, setCardNumber] = React.useState("4532 •••• •••• 8829");
  const [cardExpiry, setCardExpiry] = React.useState("08/29");
  const [cardCvv, setCardCvv] = React.useState("•••");
  const [cardName, setCardName] = React.useState("HARSH KUMAR");

  // Net banking selection
  const [selectedBank, setSelectedBank] = React.useState("HDFC Bank");

  // Simulation controls
  const initialSimulateFailure = searchParams.get("simulate") === "failure";
  const [simulateFailure, setSimulateFailure] = React.useState(initialSimulateFailure);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  // Price lock countdown (15 minutes) persisted across refreshes
  const [secondsRemaining, setSecondsRemaining] = React.useState<number>(900);
  React.useEffect(() => {
    const storageKey = `tripmate_checkout_lock_${trip.id}`;
    const LOCK_DURATION_MS = 15 * 60 * 1000;
    let expiryTime = 0;

    try {
      const stored = sessionStorage.getItem(storageKey);
      if (stored) {
        expiryTime = parseInt(stored, 10);
      }
      if (!expiryTime || isNaN(expiryTime) || expiryTime <= Date.now()) {
        expiryTime = Date.now() + LOCK_DURATION_MS;
        sessionStorage.setItem(storageKey, String(expiryTime));
      }
    } catch {
      expiryTime = Date.now() + LOCK_DURATION_MS;
    }

    const calculateRemaining = () => {
      const remainingMs = expiryTime - Date.now();
      return Math.max(0, Math.floor(remainingMs / 1000));
    };

    setSecondsRemaining(calculateRemaining());

    const timer = setInterval(() => {
      const remaining = calculateRemaining();
      setSecondsRemaining(remaining);
      if (remaining <= 0) {
        clearInterval(timer);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [trip.id]);

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  };

  const handleVerifyUpi = () => {
    if (!upiId.trim() || !upiId.includes("@")) {
      setErrorMsg("Please enter a valid UPI ID (e.g. username@upi)");
      return;
    }
    setIsVerifyingUpi(true);
    setErrorMsg(null);
    setTimeout(() => {
      setIsVerifyingUpi(false);
      setUpiVerified(true);
    }, 600);
  };

  // Customer Coupon Promo Code State
  const [couponInput, setCouponInput] = React.useState(trip.coupon_code || "");
  const [isApplyingCoupon, setIsApplyingCoupon] = React.useState(false);
  const [couponFeedback, setCouponFeedback] = React.useState<{ type: "success" | "error"; text: string } | null>(null);

  const handleApplyCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!couponInput.trim()) return;
    setIsApplyingCoupon(true);
    setCouponFeedback(null);
    try {
      const res = await applyCustomerCouponAction({
        tripId: trip.id,
        couponCode: couponInput.trim(),
      });
      if (res.ok) {
        setCouponFeedback({
          type: "success",
          text: `Coupon ${couponInput.trim().toUpperCase()} applied! Discount: ₹${res.discountAmount ?? 2000}`,
        });
        router.refresh();
      } else {
        setCouponFeedback({ type: "error", text: res.error || "Invalid coupon code." });
      }
    } catch {
      setCouponFeedback({ type: "error", text: "Failed to apply coupon." });
    } finally {
      setIsApplyingCoupon(false);
    }
  };

  const handlePayment = async () => {
    setIsSubmitting(true);
    setErrorMsg(null);

    // 0. Direct UPI Submission if user entered a custom 12-digit UTR
    if (paymentMethod === "upi" && utrNumber.trim()) {
      const cleanUtr = utrNumber.trim();
      if (!isValidUtr(cleanUtr)) {
        setErrorMsg("Please enter a valid strictly 12-digit UPI UTR number.");
        setIsSubmitting(false);
        return;
      }
      try {
        const res = await submitDirectUpiPaymentAction({
          tripId: trip.id,
          utrNumber: cleanUtr,
          payerVpa: payerVpa.trim() || undefined,
        });

        if (!res.ok) {
          setErrorMsg(res.error || "Failed to submit direct UPI payment.");
          setIsSubmitting(false);
          return;
        }

        router.refresh();
        router.push(`/book/${trip.id}/confirmed`);
        return;
      } catch {
        setErrorMsg("Network error submitting UTR payment. Please retry.");
        setIsSubmitting(false);
        return;
      }
    }

    const razorpayKeyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;

    // 1. Live Razorpay Payment Modal (when live key is provided and not simulating failure)
    if (razorpayKeyId && !simulateFailure) {
      try {
        const orderRes = await createRazorpayOrderAction(trip.id);
        if (!orderRes.ok || !orderRes.orderId) {
          setErrorMsg(orderRes.error || "Unable to initiate Razorpay checkout.");
          setIsSubmitting(false);
          return;
        }

        const scriptLoaded = await loadRazorpayScript();
        if (!scriptLoaded || !window.Razorpay) {
          setErrorMsg("Could not load Razorpay SDK. Please check your internet connection.");
          setIsSubmitting(false);
          return;
        }

        const options = {
          key: orderRes.keyId || razorpayKeyId,
          amount: orderRes.amount,
          currency: orderRes.currency || "INR",
          name: "TripMate Concierge",
          description: `Booking #${trip.booking_ref}`,
          order_id: orderRes.orderId,
          prefill: {
            name: "Traveler",
            email: "concierge@tripmate.in",
            contact: "+919810123456",
          },
          theme: {
            color: "#0f172a",
          },
          handler: async (response: {
            razorpay_order_id: string;
            razorpay_payment_id: string;
            razorpay_signature: string;
          }) => {
            setIsSubmitting(true);
            const verifyRes = await verifyRazorpayPaymentAction({
              tripId: trip.id,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              paymentMethod,
            });

            if (verifyRes.ok) {
              router.refresh();
              router.push(`/book/${trip.id}/confirmed`);
            } else {
              setErrorMsg(verifyRes.error || "Payment verification failed.");
              setIsSubmitting(false);
            }
          },
          modal: {
            ondismiss: () => {
              setIsSubmitting(false);
            },
          },
        };

        const rzp = new window.Razorpay(options);
        rzp.open();
        return;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Razorpay payment error";
        setErrorMsg(msg);
        setIsSubmitting(false);
        return;
      }
    }

    // 2. Seamless Demo / E2E Checkout Fallback (keeps 100% of existing tests passing)
    try {
      const res = await processTripPayment({
        tripId: trip.id,
        method: paymentMethod,
        simulate: simulateFailure ? "failure" : "success",
      });

      if (!res.ok) {
        setErrorMsg(res.error ?? "Payment failed. Your draft trip remains saved.");
        setIsSubmitting(false);
        return;
      }

      // Success path navigates to confirmation screen
      router.refresh();
      router.push(`/book/${trip.id}/confirmed`);
    } catch {
      setErrorMsg("Network error processing payment. Please retry.");
      setIsSubmitting(false);
    }
  };

  const totalDays = trip.total_days || 4;
  const nights = Math.max(1, totalDays - 1);
  const destinationName = destination?.name || "Jaipur";
  const vehicleName = vehicle?.vehicle?.name || "No vehicle selected (Own/Independent Transport)";
  const hotelName = hotel?.hotel?.name || "Selected Hotel";
  const hotelSubtotal = hotel?.subtotal ?? 12600;
  const vehicleSubtotal = vehicle ? Number(vehicle.subtotal) : 0;
  const stopsSubtotal = stops.reduce((acc, s) => acc + Number(s.subtotal || 0), 0);

  return (
    <div className="bg-surface font-body-md text-text-primary min-h-screen flex flex-col antialiased">
      {/* Top App Bar */}
      <header className="fixed top-0 w-full z-50 pt-safe bg-surface/80 backdrop-blur-xl shadow-[0_1px_8px_rgba(20,21,26,0.04)]">
        <div className="h-16 px-margin-mobile flex items-center justify-between gap-space-sm max-w-md mx-auto">
          <div className="flex items-center gap-space-sm">
            <Link
              href={`/book/${trip.id}/travellers`}
              className="w-10 h-10 -ml-2 rounded-full flex items-center justify-center text-text-primary hover:bg-surface-container active:scale-95 transition-colors"
              aria-label="Back to Traveller Details"
            >
              <span className="material-symbols-outlined text-[24px]">arrow_back</span>
            </Link>
            <div>
              <h1 className="font-title-md text-title-md font-semibold text-text-primary leading-tight">
                Checkout &amp; Payment
              </h1>
              <p className="font-label-sm text-[11px] text-text-secondary">
                Step 7 of 7 • Final Confirmation
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="px-2 py-0.5 rounded-full bg-secondary-container text-on-secondary font-label-badge text-label-badge font-bold uppercase tracking-wider">
              DEMO
            </span>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-md mx-auto w-full px-margin-mobile pt-24 pb-36">
        <div className="flex flex-col gap-space-md">
          {/* Top Status Indicators */}
          <div className="flex items-center justify-between gap-2 bg-surface-container-low p-2.5 rounded-xl border border-border-hairline">
            <div className="flex items-center gap-1.5 text-text-secondary">
              <span className="material-symbols-outlined text-[18px] text-primary-container">
                confirmation_number
              </span>
              <span className="font-label-sm text-xs font-medium">
                Ref: #{trip.booking_ref}
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-warning-orange font-semibold">
              <span className="material-symbols-outlined text-[18px]">lock_clock</span>
              <span className="font-label-sm text-xs">
                Price locked {formatTimer(secondsRemaining)}
              </span>
            </div>
          </div>

          {/* Prominent Demo Notice Banner (DECISIONS D5) */}
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3.5 flex items-start gap-3">
            <span className="material-symbols-outlined text-amber-600 text-[22px] shrink-0 mt-0.5">
              info
            </span>
            <div className="flex-1">
              <h2 className="font-label-md text-xs font-bold text-amber-900">
                DEMO MODE — No real money is charged
              </h2>
              <p className="font-body-sm text-[11px] text-amber-800 mt-0.5 leading-relaxed">
                This is a fully simulated payment sandbox for test orders. You can test both successful booking confirmation and simulated payment failure below.
              </p>
            </div>
          </div>

          {/* Error Banner (if simulated or actual failure occurred) */}
          {errorMsg && (
            <div className="bg-error/10 border border-error/30 rounded-xl p-3.5 flex items-start gap-3 animate-in fade-in duration-200">
              <span className="material-symbols-outlined text-error text-[22px] shrink-0 mt-0.5">
                error
              </span>
              <div className="flex-1">
                <h3 className="font-label-md text-xs font-bold text-error">
                  Payment Failed
                </h3>
                <p className="font-body-sm text-[11px] text-text-secondary mt-0.5">
                  {errorMsg}
                </p>
                <div className="mt-2 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setErrorMsg(null)}
                    className="text-xs font-bold text-error hover:underline"
                  >
                    Dismiss &amp; Retry
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Trip Summary Card */}
          <section className="bg-card-surface rounded-xl p-space-md border border-border-hairline shadow-sm">
            <div className="flex items-center justify-between pb-3 border-b border-border-hairline/80">
              <div>
                <h2 className="font-title-md text-title-md font-bold text-text-primary">
                  Trip Summary
                </h2>
                <p className="font-body-sm text-xs text-text-secondary mt-0.5">
                  {destinationName} • {totalDays}D / {nights}N • {trip.traveler_count} {trip.traveler_count === 1 ? "Traveler" : "Travelers"}
                </p>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-surface-container text-text-secondary font-label-badge text-[10px] font-bold uppercase tracking-wider">
                {trip.group_type ? `${trip.group_type} Trip` : "Custom Plan"}
              </span>
            </div>

            {/* Itemized Line Items */}
            <div className="py-3 flex flex-col gap-2.5 text-xs">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <span className="font-semibold text-text-primary block">
                    Stay: {hotelName}
                  </span>
                  <span className="text-text-secondary text-[11px]">
                    {nights} Nights, {hotel?.rooms ?? 1} Room(s)
                  </span>
                </div>
                <span className="font-semibold text-text-primary">
                  {formatCurrency(hotelSubtotal)}
                </span>
              </div>

              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <span className="font-semibold text-text-primary block">
                    Transport: {vehicle ? vehicleName : "No vehicle selected (Own/Independent Transport)"}
                  </span>
                  <span className="text-text-secondary text-[11px]">
                    {vehicle
                      ? `${totalDays} Days • Dedicated Chauffeur & Fuel incl.`
                      : "Self-arranged transport • ₹0 Transport Fee"}
                  </span>
                </div>
                <span className="font-semibold text-text-primary">
                  {formatCurrency(vehicleSubtotal)}
                </span>
              </div>

              {stops.length > 0 && (
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <span className="font-semibold text-text-primary block">
                      Rest Stop: {stops[0]?.stop?.name || "Mid-journey Rest Stop"}
                    </span>
                    <span className="text-text-secondary text-[11px]">
                      Access passes for {trip.traveler_count} guest(s)
                    </span>
                  </div>
                  <span className="font-semibold text-text-primary">
                    {formatCurrency(stopsSubtotal)}
                  </span>
                </div>
              )}

              <div className="flex items-start justify-between gap-2 pt-1 border-t border-border-hairline/60">
                <span className="text-text-secondary">Subtotal</span>
                <span className="font-medium text-text-primary">
                  {formatCurrency(trip.subtotal_amount)}
                </span>
              </div>

              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-1 text-text-secondary">
                  <span>TripMate Service Fee</span>
                  <span className="material-symbols-outlined text-[13px] text-text-secondary/70">
                    help_outline
                  </span>
                </div>
                <span className="font-medium text-text-primary">
                  {formatCurrency(trip.service_fee)}
                </span>
              </div>

              <div className="flex items-start justify-between gap-2">
                <span className="text-text-secondary">GST Taxes (18%)</span>
                <span className="font-medium text-text-primary">
                  {formatCurrency(trip.tax_amount)}
                </span>
              </div>

              {trip.discount_amount > 0 && (
                <div className="flex items-start justify-between gap-2 text-success-green">
                  <div className="flex items-center gap-1">
                    <span>Coupon ({trip.coupon_code || "EXPLOREINDIA"})</span>
                    <span className="px-1.5 py-0.2 bg-success-green/10 text-success-green font-bold text-[9px] rounded">
                      APPLIED
                    </span>
                  </div>
                  <span className="font-semibold">
                    -{formatCurrency(trip.discount_amount)}
                  </span>
                </div>
              )}

              {/* Customer Promo / Coupon Code Input (§3.A) */}
              <div className="pt-2.5 border-t border-border-hairline/60">
                <form onSubmit={handleApplyCoupon} className="flex flex-col gap-1.5">
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={couponInput}
                      onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                      placeholder="Enter Coupon / Promo Code"
                      aria-label="Enter Coupon Code"
                      className="flex-1 bg-surface border border-border-hairline rounded-lg px-3 py-1.5 text-xs font-mono font-bold text-text-primary uppercase tracking-wider focus:outline-none focus:border-primary-container"
                    />
                    <button
                      type="submit"
                      disabled={isApplyingCoupon || !couponInput.trim()}
                      className="px-3.5 py-1.5 rounded-lg bg-surface-container border border-border-hairline font-label-sm text-xs font-bold text-text-primary hover:bg-surface-container-high transition-colors disabled:opacity-50"
                    >
                      {isApplyingCoupon ? "Applying..." : "Apply"}
                    </button>
                  </div>
                  {couponFeedback && (
                    <span
                      className={`text-[11px] font-medium ${
                        couponFeedback.type === "success" ? "text-success-green" : "text-error"
                      }`}
                    >
                      {couponFeedback.text}
                    </span>
                  )}
                </form>
              </div>
            </div>

            {/* Grand Total Strip */}
            <div className="pt-3 border-t border-border-hairline flex items-center justify-between">
              <div>
                <span className="font-title-md text-title-md font-bold text-text-primary block">
                  Grand Total
                </span>
                <span className="font-body-sm text-[11px] text-text-secondary">
                  Inclusive of all taxes, highway toll &amp; concierge fees
                </span>
              </div>
              <span className="font-headline-sm text-headline-sm font-bold text-primary-container">
                {formatCurrency(trip.total_amount)}
              </span>
            </div>
          </section>

          {/* Payment Method Selector */}
          <section className="bg-card-surface rounded-xl p-space-md border border-border-hairline shadow-sm">
            <h2 className="font-title-md text-title-md font-bold text-text-primary mb-3">
              Select Payment Method
            </h2>

            <div className="flex flex-col gap-2.5">
              {/* Option 1: UPI */}
              <div
                onClick={() => setPaymentMethod("upi")}
                className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                  paymentMethod === "upi"
                    ? "border-primary-container bg-primary-container/5"
                    : "border-border-hairline hover:bg-surface-container"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <input
                      type="radio"
                      name="payment_method"
                      aria-label="UPI Payment Option"
                      checked={paymentMethod === "upi"}
                      onChange={() => setPaymentMethod("upi")}
                      className="w-4 h-4 text-primary-container accent-primary-container"
                    />
                    <div>
                      <span className="font-label-md text-xs font-bold text-text-primary block">
                        UPI (Instant &amp; Zero Fee)
                      </span>
                      <span className="font-body-sm text-[11px] text-text-secondary">
                        Google Pay, PhonePe, Paytm, BHIM or any UPI ID
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="px-1.5 py-0.5 rounded bg-surface-container font-label-badge text-[9px] font-bold text-text-secondary">
                      GPay
                    </span>
                    <span className="px-1.5 py-0.5 rounded bg-surface-container font-label-badge text-[9px] font-bold text-text-secondary">
                      PhonePe
                    </span>
                  </div>
                </div>

                {paymentMethod === "upi" && (
                  <div className="mt-3 pt-3 border-t border-border-hairline/60 flex flex-col gap-3">
                    {/* Sub-mode selector tabs */}
                    <div className="flex rounded-xl bg-surface p-1 border border-border-hairline gap-1">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setUpiSubMode("direct_qr");
                        }}
                        className={`flex-1 py-1.5 px-2 rounded-lg text-[11px] font-bold transition-all ${
                          upiSubMode === "direct_qr"
                            ? "bg-primary-container text-white shadow-xs"
                            : "text-text-secondary hover:text-text-primary"
                        }`}
                      >
                        Direct UPI QR &amp; UTR (0% Fee)
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setUpiSubMode("instant");
                        }}
                        className={`flex-1 py-1.5 px-2 rounded-lg text-[11px] font-bold transition-all ${
                          upiSubMode === "instant"
                            ? "bg-primary-container text-white shadow-xs"
                            : "text-text-secondary hover:text-text-primary"
                        }`}
                      >
                        Instant UPI VPA
                      </button>
                    </div>

                    {upiSubMode === "direct_qr" ? (
                      <div className="flex flex-col gap-3 pt-1">
                        {/* Live Merchant VPA Banner */}
                        <div className="p-3 bg-surface rounded-xl border border-border-hairline flex items-center justify-between gap-2">
                          <div className="min-w-0">
                            <span className="text-[10px] uppercase font-bold text-text-secondary block">
                              Pay To Merchant UPI ID
                            </span>
                            <span className="font-mono font-bold text-xs text-text-primary block truncate">
                              {merchantVpa}
                            </span>
                            <span className="text-[10px] text-text-secondary block">
                              Payee: {merchantPayeeName}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCopyVpa();
                            }}
                            className="px-2.5 py-1.5 rounded-lg bg-surface-container hover:bg-surface-container-high text-xs font-semibold text-text-primary shrink-0 border border-border-hairline active:scale-95 transition-all"
                          >
                            {copiedVpa ? "Copied ✓" : "Copy UPI ID"}
                          </button>
                        </div>

                        {/* Flat Crisp Dynamic UPI QR Code */}
                        <div className="bg-white p-4 rounded-2xl border border-border-hairline flex flex-col items-center justify-center text-center shadow-xs">
                          {qrDataUrl ? (
                            /* eslint-disable-next-line @next/next/no-img-element */
                            <img
                              src={qrDataUrl}
                              alt="Direct UPI QR Code"
                              width={176}
                              height={176}
                              decoding="async"
                              className="w-44 h-44 aspect-square border border-border-hairline/40 rounded-xl p-1 bg-white"
                            />
                          ) : (
                            <div className="w-44 h-44 flex items-center justify-center bg-surface rounded-xl border border-border-hairline">
                              <span className="material-symbols-outlined text-text-secondary text-[28px] animate-spin">
                                progress_activity
                              </span>
                            </div>
                          )}
                          <div className="mt-2 text-center">
                            <span className="font-mono font-extrabold text-sm text-text-primary block">
                              {formatCurrency(trip.total_amount)}
                            </span>
                            <span className="text-[11px] text-text-secondary">
                              Scan with GPay, PhonePe, Paytm, or BHIM
                            </span>
                          </div>
                        </div>

                        {/* Mobile Intent Deep Link CTA */}
                        <a
                          href={upiUri}
                          onClick={(e) => e.stopPropagation()}
                          className="w-full py-2.5 px-3 rounded-xl bg-surface hover:bg-surface-container text-xs font-bold text-text-primary flex items-center justify-center gap-2 border border-border-hairline active:scale-95 transition-all"
                        >
                          <span className="material-symbols-outlined text-[16px]">open_in_new</span>
                          <span>Open UPI App (GPay / PhonePe / Paytm)</span>
                        </a>

                        {/* 12-Digit UTR Input */}
                        <div className="space-y-1">
                          <label className="font-label-sm text-[10px] font-bold text-text-secondary block">
                            Enter 12-Digit UPI Ref / UTR No. *
                          </label>
                          <input
                            type="text"
                            maxLength={12}
                            id="upi-utr-input"
                            aria-label="12-digit UPI UTR Number"
                            value={utrNumber}
                            onChange={(e) => setUtrNumber(e.target.value.replace(/\D/g, ""))}
                            onClick={(e) => e.stopPropagation()}
                            placeholder="Enter 12-digit UPI Ref / UTR No. (e.g. 429183746512)"
                            className="w-full bg-surface border border-border-hairline rounded-lg px-3 py-2 text-xs font-mono font-bold text-text-primary tracking-wider focus:outline-none focus:border-primary-container"
                          />
                          <p className="text-[10px] text-text-secondary">
                            Find the 12-digit UTR in your UPI app transaction history.
                          </p>
                        </div>

                        {/* Optional Payer VPA Input */}
                        <div className="space-y-1">
                          <label className="font-label-sm text-[10px] text-text-secondary block">
                            Your UPI ID / Payer VPA (Optional)
                          </label>
                          <input
                            type="text"
                            value={payerVpa}
                            onChange={(e) => setPayerVpa(e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                            placeholder="yourname@bank (optional)"
                            className="w-full bg-surface border border-border-hairline rounded-lg px-3 py-2 text-xs font-mono text-text-primary focus:outline-none focus:border-primary-container"
                          />
                        </div>

                        {/* Direct Submit Button inside card */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDirectUpiSubmit();
                          }}
                          disabled={isSubmitting || utrNumber.length !== 12}
                          className="w-full py-2.5 rounded-xl bg-primary-container text-white text-xs font-bold hover:bg-primary-container/90 disabled:opacity-50 transition-all flex items-center justify-center gap-2 active:scale-95"
                        >
                          <span className="material-symbols-outlined text-[16px]">verified</span>
                          <span>Submit 12-Digit UTR to Confirm</span>
                        </button>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-2 pt-1">
                        <div className="flex gap-2">
                          <input
                            type="text"
                            id="upi-id"
                            value={upiId}
                            aria-label="Enter Virtual Payment Address (UPI ID)"
                            onChange={(e) => {
                              setUpiId(e.target.value);
                              setUpiVerified(false);
                            }}
                            onClick={(e) => e.stopPropagation()}
                            placeholder="yourname@bank"
                            className="flex-1 bg-surface border border-border-hairline rounded-lg px-3 py-2 text-xs font-mono text-text-primary focus:outline-none focus:border-primary-container"
                          />
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleVerifyUpi();
                            }}
                            disabled={isVerifyingUpi}
                            className="px-3 py-2 rounded-lg bg-surface-container hover:bg-surface-container-high text-xs font-semibold text-text-primary active:scale-95 transition-all"
                          >
                            {isVerifyingUpi ? "Checking..." : upiVerified ? "Verified ✓" : "Verify"}
                          </button>
                        </div>
                        {upiVerified && (
                          <p className="text-[11px] text-success-green flex items-center gap-1">
                            <span className="material-symbols-outlined text-[14px]">check_circle</span>
                            Verified: Harsh Kumar (Demo VPA)
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Option 2: Credit / Debit Card */}
              <div
                onClick={() => setPaymentMethod("card")}
                className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                  paymentMethod === "card"
                    ? "border-primary-container bg-primary-container/5"
                    : "border-border-hairline hover:bg-surface-container"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <input
                      type="radio"
                      name="payment_method"
                      aria-label="Credit or Debit Card Payment Option"
                      checked={paymentMethod === "card"}
                      onChange={() => setPaymentMethod("card")}
                      className="w-4 h-4 text-primary-container accent-primary-container"
                    />
                    <div>
                      <span className="font-label-md text-xs font-bold text-text-primary block">
                        Credit / Debit Card
                      </span>
                      <span className="font-body-sm text-[11px] text-text-secondary">
                        Visa, MasterCard, RuPay with 256-bit SSL
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="px-1.5 py-0.5 rounded bg-surface-container font-label-badge text-[9px] font-bold text-text-secondary">
                      VISA
                    </span>
                    <span className="px-1.5 py-0.5 rounded bg-surface-container font-label-badge text-[9px] font-bold text-text-secondary">
                      MC
                    </span>
                  </div>
                </div>

                {paymentMethod === "card" && (
                  <div className="mt-3 pt-3 border-t border-border-hairline/60 flex flex-col gap-2.5">
                    <div>
                      <label className="font-label-sm text-[10px] text-text-secondary block mb-1">
                        Card Number
                      </label>
                      <input
                        type="text"
                        aria-label="16-digit Card Number"
                        value={cardNumber}
                        onChange={(e) => setCardNumber(e.target.value)}
                        className="w-full bg-surface border border-border-hairline rounded-lg px-3 py-2 text-xs font-mono text-text-primary focus:outline-none focus:border-primary-container"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="font-label-sm text-[10px] text-text-secondary block mb-1">
                          Expiry
                        </label>
                        <input
                          type="text"
                          aria-label="Card Expiry Month and Year"
                          value={cardExpiry}
                          onChange={(e) => setCardExpiry(e.target.value)}
                          className="w-full bg-surface border border-border-hairline rounded-lg px-3 py-2 text-xs font-mono text-text-primary focus:outline-none focus:border-primary-container"
                        />
                      </div>
                      <div>
                        <label className="font-label-sm text-[10px] text-text-secondary block mb-1">
                          CVV
                        </label>
                        <input
                          type="text"
                          aria-label="Card CVV Security Code"
                          value={cardCvv}
                          onChange={(e) => setCardCvv(e.target.value)}
                          className="w-full bg-surface border border-border-hairline rounded-lg px-3 py-2 text-xs font-mono text-text-primary focus:outline-none focus:border-primary-container"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="font-label-sm text-[10px] text-text-secondary block mb-1">
                        Name on Card
                      </label>
                      <input
                        type="text"
                        aria-label="Cardholder Full Name"
                        value={cardName}
                        onChange={(e) => setCardName(e.target.value)}
                        className="w-full bg-surface border border-border-hairline rounded-lg px-3 py-2 text-xs font-mono text-text-primary uppercase focus:outline-none focus:border-primary-container"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Option 3: Net Banking */}
              <div
                onClick={() => setPaymentMethod("netbanking")}
                className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                  paymentMethod === "netbanking"
                    ? "border-primary-container bg-primary-container/5"
                    : "border-border-hairline hover:bg-surface-container"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <input
                      type="radio"
                      name="payment_method"
                      aria-label="Net Banking Payment Option"
                      checked={paymentMethod === "netbanking"}
                      onChange={() => setPaymentMethod("netbanking")}
                      className="w-4 h-4 text-primary-container accent-primary-container"
                    />
                    <div>
                      <span className="font-label-md text-xs font-bold text-text-primary block">
                        Net Banking
                      </span>
                      <span className="font-body-sm text-[11px] text-text-secondary">
                        All major Indian banks supported
                      </span>
                    </div>
                  </div>
                </div>

                {paymentMethod === "netbanking" && (
                  <div className="mt-3 pt-3 border-t border-border-hairline/60 flex flex-wrap gap-2">
                    {["HDFC Bank", "ICICI Bank", "SBI", "Axis Bank", "Kotak"].map((bank) => (
                      <button
                        key={bank}
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedBank(bank);
                        }}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                          selectedBank === bank
                            ? "bg-primary-container text-on-primary font-bold shadow-sm"
                            : "bg-surface border border-border-hairline text-text-secondary hover:bg-surface-container"
                        }`}
                      >
                        {bank}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Option 4: EMI / Pay Later */}
              <div
                onClick={() => setPaymentMethod("emi")}
                className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                  paymentMethod === "emi"
                    ? "border-primary-container bg-primary-container/5"
                    : "border-border-hairline hover:bg-surface-container"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <input
                      type="radio"
                      name="payment_method"
                      aria-label="Equated Monthly Installment (EMI) or Pay Later Option"
                      checked={paymentMethod === "emi"}
                      onChange={() => setPaymentMethod("emi")}
                      className="w-4 h-4 text-primary-container accent-primary-container"
                    />
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-label-md text-xs font-bold text-text-primary">
                          EMI / Pay Later
                        </span>
                        <span className="px-1.5 py-0.2 rounded bg-success-green/10 text-success-green font-label-badge text-[9px] font-bold">
                          0% EMI
                        </span>
                      </div>
                      <span className="font-body-sm text-[11px] text-text-secondary">
                        Starting from ₹{Math.round(trip.total_amount / 12)}/month
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Dev Test Sandbox Switch: Simulate Payment Failure */}
          <section className="bg-surface-container-low rounded-xl p-3 border border-border-hairline flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[20px] text-text-secondary">
                science
              </span>
              <div>
                <span className="font-label-sm text-xs font-semibold text-text-primary block">
                  Simulate Payment Failure
                </span>
                <span className="font-body-sm text-[10px] text-text-secondary">
                  Tests `?simulate=failure` state; leaves draft untouched per M5
                </span>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={simulateFailure}
                onChange={(e) => setSimulateFailure(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-surface-container-high peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-error"></div>
            </label>
          </section>

          {/* Security & Cancellation Policy Strip */}
          <div className="p-3 bg-surface-container rounded-xl flex items-center gap-2.5 text-xs text-text-secondary">
            <span className="material-symbols-outlined text-success-green text-[20px] shrink-0">
              verified_user
            </span>
            <p className="text-[11px] leading-relaxed">
              <strong>Bank Grade Encryption</strong> • 100% Refundable if cancelled up to 48 hours prior to trip start.
            </p>
          </div>
        </div>
      </main>

      {/* Sticky Bottom Shelf */}
      <footer className="fixed bottom-0 w-full z-40 bg-surface/95 backdrop-blur-xl border-t border-border-hairline shadow-[0_-4px_16px_rgba(20,21,26,0.06)] pb-safe">
        <div className="max-w-md mx-auto px-margin-mobile py-space-sm flex items-center justify-between gap-4">
          <div className="flex flex-col">
            <span className="font-label-sm text-[11px] text-text-secondary uppercase tracking-wider">
              Amount Due
            </span>
            <span className="font-headline-sm text-headline-sm font-bold text-text-primary">
              {formatCurrency(trip.total_amount)}
            </span>
          </div>

          <button
            type="button"
            disabled={isSubmitting}
            onClick={handlePayment}
            className={`flex-1 py-3.5 px-6 rounded-[12px] font-label-lg text-label-lg font-semibold flex items-center justify-center gap-2 shadow-sm transition-all active:scale-[0.98] ${
              simulateFailure
                ? "bg-error text-white hover:bg-error/90"
                : "bg-primary-container text-on-primary hover:bg-primary"
            } ${isSubmitting ? "opacity-70 cursor-not-allowed" : ""}`}
          >
            {isSubmitting ? (
              <>
                <span className="material-symbols-outlined text-[18px] animate-spin">
                  progress_activity
                </span>
                <span>Processing Demo...</span>
              </>
            ) : simulateFailure ? (
              <>
                <span className="material-symbols-outlined text-[18px]">gpp_maybe</span>
                <span>Simulate Failure</span>
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-[18px]">lock</span>
                <span>Confirm &amp; Pay {formatCurrency(trip.total_amount)}</span>
              </>
            )}
          </button>
        </div>
      </footer>
    </div>
  );
}
