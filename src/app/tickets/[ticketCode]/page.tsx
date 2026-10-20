export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

import * as React from "react";
import { notFound } from "next/navigation";
import { getPublicTicketDetails } from "@/lib/data/commercial";
import { PublicTicketView } from "@/components/features/tickets/public-ticket-view";

interface TicketPageProps {
  params: {
    ticketCode: string;
  };
}

export default async function TicketPage({ params }: TicketPageProps) {
  const { ticketCode } = params;
  const ticket = await getPublicTicketDetails(ticketCode);

  if (!ticket) {
    notFound();
  }

  return <PublicTicketView ticket={ticket} ticketCode={ticketCode} />;
}
