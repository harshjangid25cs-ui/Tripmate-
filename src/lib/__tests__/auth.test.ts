import { describe, it, expect } from "vitest";
import {
  getAuthRedirectPath,
  ONBOARDING_COOKIE_NAME,
} from "@/lib/auth-guard";

describe("Auth & Navigation Guards (getAuthRedirectPath)", () => {
  describe("Root route '/'", () => {
    it("redirects unauthenticated first-run user to /splash", () => {
      const redirect = getAuthRedirectPath({
        pathname: "/",
        hasUser: false,
        hasCompletedOnboarding: false,
      });
      expect(redirect).toBe("/splash");
    });

    it("redirects unauthenticated returning user with completed onboarding to /login", () => {
      const redirect = getAuthRedirectPath({
        pathname: "/",
        hasUser: false,
        hasCompletedOnboarding: true,
      });
      expect(redirect).toBe("/login");
    });

    it("redirects authenticated user to /home", () => {
      const redirect = getAuthRedirectPath({
        pathname: "/",
        hasUser: true,
        hasCompletedOnboarding: true,
      });
      expect(redirect).toBe("/home");
    });
  });

  describe("Public bypass routes", () => {
    it("allows public access to /tickets/:ticketCode without authentication", () => {
      const redirect = getAuthRedirectPath({
        pathname: "/tickets/TM-982341",
        hasUser: false,
        hasCompletedOnboarding: false,
      });
      expect(redirect).toBeNull();
    });

    it("allows access to /dev/ui showcase in non-production environments", () => {
      const redirect = getAuthRedirectPath({
        pathname: "/dev/ui",
        hasUser: false,
        hasCompletedOnboarding: false,
      });
      expect(redirect).toBeNull();
    });

    it("redirects /dev/ui to /home in production environment", () => {
      const prevEnv = process.env.NODE_ENV;
      try {
        (process.env as Record<string, string | undefined>).NODE_ENV = "production";
        const redirect = getAuthRedirectPath({
          pathname: "/dev/ui",
          hasUser: false,
          hasCompletedOnboarding: false,
        });
        expect(redirect).toBe("/home");
      } finally {
        (process.env as Record<string, string | undefined>).NODE_ENV = prevEnv;
      }
    });

    it("allows access to /auth/callback without authentication", () => {
      const redirect = getAuthRedirectPath({
        pathname: "/auth/callback",
        hasUser: false,
        hasCompletedOnboarding: false,
      });
      expect(redirect).toBeNull();
    });
  });

  describe("Admin route protection", () => {
    it("allows unauthenticated access to /admin/login", () => {
      const redirect = getAuthRedirectPath({
        pathname: "/admin/login",
        hasUser: false,
        hasCompletedOnboarding: false,
      });
      expect(redirect).toBeNull();
    });

    it("redirects unauthenticated user accessing /admin to /admin/login", () => {
      const redirect = getAuthRedirectPath({
        pathname: "/admin",
        hasUser: false,
        hasCompletedOnboarding: false,
      });
      expect(redirect).toBe("/admin/login");
    });

    it("redirects unauthenticated user accessing nested /admin/bookings to /admin/login", () => {
      const redirect = getAuthRedirectPath({
        pathname: "/admin/bookings",
        hasUser: false,
        hasCompletedOnboarding: true,
      });
      expect(redirect).toBe("/admin/login");
    });

    it("redirects regular authenticated customer accessing /admin to /home to prevent privilege escalation", () => {
      const redirect = getAuthRedirectPath({
        pathname: "/admin",
        hasUser: true,
        hasCompletedOnboarding: true,
        isAdminUser: false,
      });
      expect(redirect).toBe("/home");
    });

    it("allows verified admin user to access /admin", () => {
      const redirect = getAuthRedirectPath({
        pathname: "/admin",
        hasUser: true,
        hasCompletedOnboarding: true,
        isAdminUser: true,
      });
      expect(redirect).toBeNull();
    });
  });

  describe("Auth & onboarding pages", () => {
    it("allows unauthenticated user to access /splash, /onboarding, /login", () => {
      expect(
        getAuthRedirectPath({
          pathname: "/splash",
          hasUser: false,
          hasCompletedOnboarding: false,
        })
      ).toBeNull();

      expect(
        getAuthRedirectPath({
          pathname: "/onboarding",
          hasUser: false,
          hasCompletedOnboarding: false,
        })
      ).toBeNull();

      expect(
        getAuthRedirectPath({
          pathname: "/login",
          hasUser: false,
          hasCompletedOnboarding: true,
        })
      ).toBeNull();
    });

    it("redirects authenticated user away from /login, /splash, /onboarding to /home", () => {
      expect(
        getAuthRedirectPath({
          pathname: "/login",
          hasUser: true,
          hasCompletedOnboarding: true,
        })
      ).toBe("/home");

      expect(
        getAuthRedirectPath({
          pathname: "/splash",
          hasUser: true,
          hasCompletedOnboarding: true,
        })
      ).toBe("/home");

      expect(
        getAuthRedirectPath({
          pathname: "/onboarding",
          hasUser: true,
          hasCompletedOnboarding: false,
        })
      ).toBe("/home");
    });
  });

  describe("Protected routes", () => {
    const protectedRoutes = [
      "/home",
      "/trips",
      "/commercial",
      "/profile",
      "/book/trip-123/duration",
      "/book/trip-123/hotel",
      "/commercial/trip-456/setup",
    ];

    it.each(protectedRoutes)(
      "redirects unauthenticated user accessing %s to /login",
      (pathname) => {
        const redirect = getAuthRedirectPath({
          pathname,
          hasUser: false,
          hasCompletedOnboarding: true,
        });
        expect(redirect).toBe("/login");
      }
    );

    it.each(protectedRoutes)(
      "allows authenticated user to access %s",
      (pathname) => {
        const redirect = getAuthRedirectPath({
          pathname,
          hasUser: true,
          hasCompletedOnboarding: true,
        });
        expect(redirect).toBeNull();
      }
    );
  });

  describe("Constants", () => {
    it("has the expected cookie identifier for onboarding persistence", () => {
      expect(ONBOARDING_COOKIE_NAME).toBe("tripmate_onboarding_completed");
    });
  });

  describe("Admin authorization helpers", () => {
    it("validates allowed admin emails correctly", async () => {
      const { isAllowedAdminEmail } = await import("@/lib/admin/admin-auth");
      expect(isAllowedAdminEmail("superadmin@tripmate.in")).toBe(true);
      expect(isAllowedAdminEmail("ops@tripmate.in")).toBe(true);
      expect(isAllowedAdminEmail("arjun.kapoor@tripmate.io")).toBe(false);
      expect(isAllowedAdminEmail("hacker@gmail.com")).toBe(false);
    });

    it("evaluates isAuthorizedAdmin correctly across sessions and user metadata", async () => {
      const { isAuthorizedAdmin, createAdminSessionPayload } = await import("@/lib/admin/admin-auth");
      
      // Customer user without admin credentials
      expect(
        isAuthorizedAdmin({
          user: { email: "arjun.kapoor@tripmate.io", app_metadata: {}, user_metadata: {} },
        })
      ).toBe(false);

      // User with app_metadata role
      expect(
        isAuthorizedAdmin({
          user: { email: "admin@custom.com", app_metadata: { role: "admin" } },
        })
      ).toBe(true);

      // Valid admin session cookie
      const validCookie = createAdminSessionPayload("superadmin@tripmate.in", "super_admin");
      expect(
        isAuthorizedAdmin({
          adminSessionCookie: validCookie,
        })
      ).toBe(true);
    });
  });
});
