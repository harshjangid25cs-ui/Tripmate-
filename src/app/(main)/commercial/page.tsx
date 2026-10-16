export const dynamic = "force-dynamic";
export const revalidate = 0;

import * as React from "react";
import { getUserCompanyMembership } from "@/lib/data/commercial";
import { CommercialIntroView } from "@/components/features/commercial/commercial-intro-view";

export default async function CommercialPage() {
  const membership = await getUserCompanyMembership();

  return <CommercialIntroView membership={membership} />;
}
