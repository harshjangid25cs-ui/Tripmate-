import * as React from "react";
import { getUserCompanyMembership } from "@/lib/data/commercial";
import { CommercialIntroView } from "@/components/features/commercial/commercial-intro-view";

export default async function CommercialPage() {
  const membership = await getUserCompanyMembership();

  return <CommercialIntroView membership={membership} />;
}
