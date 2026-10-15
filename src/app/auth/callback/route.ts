import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");
  const errorDescription = searchParams.get("error_description");

  let next = searchParams.get("next") ?? "/home";
  // Strict sanitization against Open Redirect vulnerabilities
  if (
    !next.startsWith("/") ||
    next.startsWith("//") ||
    next.includes("://") ||
    next.includes("http:") ||
    next.includes("https:") ||
    next.includes("\\")
  ) {
    next = "/home";
  }

  // Handle provider cancellation or error
  if (error || errorDescription) {
    const errorUrl = new URL(`${origin}/login`);
    if (error) errorUrl.searchParams.set("error", error);
    if (errorDescription) {
      errorUrl.searchParams.set("error_description", errorDescription);
    }
    return NextResponse.redirect(errorUrl.toString());
  }

  if (code) {
    const supabase = createClient();
    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
    if (!exchangeError) {
      const forwardedHost = request.headers.get("x-forwarded-host");
      const isLocalEnv = process.env.NODE_ENV === "development";
      if (isLocalEnv) {
        return NextResponse.redirect(`${origin}${next}`);
      } else if (forwardedHost) {
        return NextResponse.redirect(`https://${forwardedHost}${next}`);
      } else {
        return NextResponse.redirect(`${origin}${next}`);
      }
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_exchange_failed`);
}
