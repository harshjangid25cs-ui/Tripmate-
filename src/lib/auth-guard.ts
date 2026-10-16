/**
 * Pure route guard logic for TripMate auth & onboarding navigation.
 * Evaluates pathname, session presence, and first-run onboarding status.
 */

export interface AuthGuardOptions {
  pathname: string;
  hasUser: boolean;
  hasCompletedOnboarding: boolean;
  isAdminUser?: boolean;
}

export const ONBOARDING_COOKIE_NAME = "tripmate_onboarding_completed";

export function getAuthRedirectPath({
  pathname,
  hasUser,
  hasCompletedOnboarding,
  isAdminUser = false,
}: AuthGuardOptions): string | null {
  // Protect /dev routes so they are only accessible when process.env.NODE_ENV !== "production"
  if (pathname.startsWith("/dev")) {
    if (process.env.NODE_ENV === "production") {
      return "/home";
    }
    return null;
  }

  // Admin routes: /admin/login is public; all other /admin routes require verified admin privileges
  if (pathname.startsWith("/admin")) {
    if (pathname === "/admin/login") {
      return null;
    }
    if (!isAdminUser) {
      // Unauthenticated users are redirected to login; regular customer users are redirected to /home
      return hasUser ? "/home" : "/admin/login";
    }
    return null;
  }

  // Public bypass paths (never redirected)
  const isPublicRoute =
    pathname.startsWith("/tickets") ||
    pathname.startsWith("/auth") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname === "/terms" ||
    pathname === "/privacy" ||
    pathname === "/refund-policy" ||
    pathname === "/contact" ||
    pathname === "/favicon.ico";

  if (isPublicRoute) {
    return null;
  }

  // Root route '/' navigation
  if (pathname === "/") {
    if (hasUser) {
      return "/home";
    }
    return hasCompletedOnboarding ? "/login" : "/splash";
  }

  // Auth & onboarding screens
  const isAuthOrOnboardingScreen =
    pathname === "/login" || pathname === "/splash" || pathname === "/onboarding";

  if (hasUser) {
    // Authenticated users shouldn't access login, splash, or onboarding
    if (isAuthOrOnboardingScreen) {
      return "/home";
    }
    return null;
  }

  // Unauthenticated users are allowed to access auth/onboarding screens
  if (isAuthOrOnboardingScreen) {
    return null;
  }

  // All other routes require authentication
  return "/login";
}
