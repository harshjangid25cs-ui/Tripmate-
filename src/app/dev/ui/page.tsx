import { notFound } from "next/navigation";
import DevUiClient from "./DevUiClient";

export const dynamic = "force-dynamic";

export default function DevUiPage() {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }

  return <DevUiClient />;
}
