import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@/types/database";
import { getAuthRedirectPath, ONBOARDING_COOKIE_NAME } from "@/lib/auth-guard";
import { isAuthorizedAdmin } from "@/lib/admin/admin-auth";
import { getSupabaseEnv } from "./env";

export async function updateSession(request: NextRequest) {
  // In production, /dev routes do not exist: return genuine HTTP 404
  if (process.env.NODE_ENV === "production" && request.nextUrl.pathname.startsWith("/dev")) {
    return NextResponse.rewrite(new URL("/_not-found", request.url), { status: 404 });
  }

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-pathname", request.nextUrl.pathname);

  let supabaseResponse = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

  const { url, anonKey } = getSupabaseEnv();

  const supabase = createServerClient<Database>(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value)
        );
        supabaseResponse = NextResponse.next({
          request: {
            headers: requestHeaders,
          },
        });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        );
      },
    },
  });

  // Check auth user securely with getUser()
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const hasCompletedOnboarding =
    request.cookies.get(ONBOARDING_COOKIE_NAME)?.value === "true";

  const hasAdminSessionCookie = Boolean(
    request.cookies.get("tripmate_admin_session")?.value
  );

  const isAdminUser =
    isAuthorizedAdmin({
      user,
    }) || hasAdminSessionCookie;

  const redirectPath = getAuthRedirectPath({
    pathname: request.nextUrl.pathname,
    hasUser: Boolean(user),
    hasCompletedOnboarding,
    isAdminUser,
  });

  if (redirectPath) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = redirectPath;
    const redirectResponse = NextResponse.redirect(redirectUrl);
    // Forward any session cookies to the redirect response
    supabaseResponse.cookies.getAll().forEach((cookie) => {
      redirectResponse.cookies.set(cookie);
    });
    redirectResponse.headers.set(
      "Cache-Control",
      "private, no-cache, no-store, max-age=0, must-revalidate"
    );
    redirectResponse.headers.set("Pragma", "no-cache");
    redirectResponse.headers.set("Expires", "0");
    return redirectResponse;
  }

  return applyNoCacheHeaders(supabaseResponse, request.nextUrl.pathname);
}

function applyNoCacheHeaders(response: NextResponse, pathname: string): NextResponse {
  const isNoCacheRoute =
    pathname.startsWith("/admin") ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/book") ||
    pathname.startsWith("/trips") ||
    pathname.startsWith("/profile") ||
    pathname.startsWith("/commercial") ||
    pathname.startsWith("/tickets") ||
    pathname.startsWith("/auth");

  if (isNoCacheRoute) {
    response.headers.set(
      "Cache-Control",
      "private, no-store, no-cache, must-revalidate, max-age=0"
    );
    response.headers.set("CDN-Cache-Control", "no-store");
    response.headers.set("Surrogate-Control", "no-store");
    response.headers.set("Pragma", "no-cache");
    response.headers.set("Expires", "0");
  }
  return response;
}
