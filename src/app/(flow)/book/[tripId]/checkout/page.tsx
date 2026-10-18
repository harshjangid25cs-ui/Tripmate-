import { getValidatedDraftTrip } from "@/lib/data/booking-guards";
import { TripCheckoutView } from "@/components/features/booking/trip-checkout-view";
import { createClient } from "@/lib/supabase/server";

interface CheckoutPageProps {
  params: {
    tripId: string;
  };
}

export default async function CheckoutPage({ params }: CheckoutPageProps) {
  const tripData = await getValidatedDraftTrip(params.tripId, "checkout");
  const supabase = createClient();
  const { data: pricing } = await supabase
    .from("pricing_config")
    .select("merchant_upi_vpa, merchant_payee_name, active_payment_gateway, upi_auto_confirm")
    .eq("id", 1)
    .maybeSingle();

  return (
    <TripCheckoutView
      tripData={tripData}
      pricingConfig={{
        merchant_upi_vpa: pricing?.merchant_upi_vpa || "tripmate@upi",
        merchant_payee_name: pricing?.merchant_payee_name || "TripMate Travels",
        active_payment_gateway: pricing?.active_payment_gateway || "auto",
        upi_auto_confirm: pricing?.upi_auto_confirm ?? true,
      }}
    />
  );
}
