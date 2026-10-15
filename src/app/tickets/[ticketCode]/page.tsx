import * as React from "react";
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

  return <PublicTicketView ticket={ticket} ticketCode={ticketCode} />;
}
