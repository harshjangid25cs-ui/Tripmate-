import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@/types/database";
import { getAuthRedirectPath, ONBOARDING_COOKIE_NAME } from "@/lib/auth-guard";
import { ADMIN_SESSION_COOKIE, isAuthorizedAdmin } from "@/lib/admin/admin-auth";
import { getSupabaseEnv } from "./env";

export async function updateSession(request: NextRequest) {
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

  const adminCookie = request.cookies.get(ADMIN_SESSION_COOKIE)?.value;
  const isAdminUser = isAuthorizedAdmin({
    user,
    adminSessionCookie: adminCookie,
  });

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
    return redirectResponse;
  }

  return supabaseResponse;
}
