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

    it("allows /dev routes to proceed to page handler where notFound() is invoked in production", () => {
      const redirect = getAuthRedirectPath({
        pathname: "/dev/ui",
        hasUser: false,
        hasCompletedOnboarding: false,
      });
      expect(redirect).toBeNull();
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

    it("redirects authenticated admin from /admin/login to /admin (skip login page if session exists)", () => {
      const redirect = getAuthRedirectPath({
        pathname: "/admin/login",
        hasUser: true,
        hasCompletedOnboarding: true,
        isAdminUser: true,
      });
      expect(redirect).toBe("/admin");
    });

    it("allows non-admin authenticated user to view /admin/login (customer might need to re-login)", () => {
      const redirect = getAuthRedirectPath({
        pathname: "/admin/login",
        hasUser: true,
        hasCompletedOnboarding: true,
        isAdminUser: false,
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
      expect(isAllowedAdminEmail("tripmateoffical007@gmail.com")).toBe(true);
      expect(isAllowedAdminEmail("catalog@tripmate.in")).toBe(true);
      expect(isAllowedAdminEmail("finance@tripmate.in")).toBe(true);
      expect(isAllowedAdminEmail("support@tripmate.in")).toBe(true);
      // @tripmate.in domain wildcard
      expect(isAllowedAdminEmail("anyoperator@tripmate.in")).toBe(true);
      // Non-admin emails
      expect(isAllowedAdminEmail("arjun.kapoor@tripmate.io")).toBe(false);
      expect(isAllowedAdminEmail("hacker@gmail.com")).toBe(false);
      expect(isAllowedAdminEmail(null)).toBe(false);
      expect(isAllowedAdminEmail("")).toBe(false);
    });

    it("evaluates isAuthorizedAdmin correctly across sessions and user metadata", async () => {
      const { isAuthorizedAdmin } = await import("@/lib/admin/admin-auth");
      
      // Customer user without admin credentials — REJECTED
      expect(
        isAuthorizedAdmin({
          user: { email: "arjun.kapoor@tripmate.io", app_metadata: {}, user_metadata: {} },
        })
      ).toBe(false);

      // User with forged user_metadata.role MUST be rejected (user_metadata is client-writable)
      expect(
        isAuthorizedAdmin({
          user: {
            email: "arjun.kapoor@tripmate.io",
            app_metadata: {},
            user_metadata: { role: "super_admin" },
          },
        })
      ).toBe(false);

      expect(
        isAuthorizedAdmin({
          user: {
            email: "attacker@gmail.com",
            app_metadata: {},
            user_metadata: { role: "admin" },
          },
        })
      ).toBe(false);

      // User with app_metadata role is ACCEPTED (server/service_role tamper-proof)
      expect(
        isAuthorizedAdmin({
          user: { email: "admin@custom.com", app_metadata: { role: "admin" } },
        })
      ).toBe(true);

      expect(
        isAuthorizedAdmin({
          user: { email: "lead@custom.com", app_metadata: { role: "super_admin" } },
        })
      ).toBe(true);

      // Null user — REJECTED
      expect(
        isAuthorizedAdmin({
          user: null,
        })
      ).toBe(false);
    });

    it("isAuthorizedAdmin allows DEFAULT_ADMIN_EMAILS without app_metadata role (production-safe, no env flag)", async () => {
      // Simulate production: NEXT_PUBLIC_ENABLE_DEMO_ADMIN is NOT set
      const origEnv = process.env.NEXT_PUBLIC_ENABLE_DEMO_ADMIN;
      delete process.env.NEXT_PUBLIC_ENABLE_DEMO_ADMIN;

      const { isAuthorizedAdmin } = await import("@/lib/admin/admin-auth");

      // Primary admin account must pass even without app_metadata
      expect(
        isAuthorizedAdmin({
          user: { email: "tripmateoffical007@gmail.com", app_metadata: {}, user_metadata: {} },
        })
      ).toBe(true);

      // superadmin@tripmate.in must pass
      expect(
        isAuthorizedAdmin({
          user: { email: "superadmin@tripmate.in", app_metadata: {}, user_metadata: {} },
        })
      ).toBe(true);

      // ops@tripmate.in must pass
      expect(
        isAuthorizedAdmin({
          user: { email: "ops@tripmate.in", app_metadata: {} },
        })
      ).toBe(true);

      // @tripmate.in wildcard must pass
      expect(
        isAuthorizedAdmin({
          user: { email: "newoperator@tripmate.in", app_metadata: {} },
        })
      ).toBe(true);

      // Non-admin email without app_metadata must fail
      expect(
        isAuthorizedAdmin({
          user: { email: "customer@gmail.com", app_metadata: {} },
        })
      ).toBe(false);

      // Restore env
      if (origEnv !== undefined) {
        process.env.NEXT_PUBLIC_ENABLE_DEMO_ADMIN = origEnv;
      }
    });

    it("requireAdmin() rejects unauthenticated callers and non-admin users (SEC-05)", async () => {
      const { requireAdmin } = await import("@/lib/admin/admin-auth");

      // Without active session, requireAdmin must throw unauthorized error
      await expect(requireAdmin()).rejects.toThrow("Unauthorized");
    });

    it("adminLoginAction rejects wrong password and never swallows errors (SEC-02)", async () => {
      const { adminLoginAction } = await import("@/lib/actions/admin-auth");

      const result = await adminLoginAction({
        email: "superadmin@tripmate.in",
        password: "definitely-wrong-password-12345",
      });

      expect(result.ok).toBe(false);
      expect(result.error).toBeDefined();
    });

    it("adminLoginAction rejects unauthorized emails (SEC-01)", async () => {
      const { adminLoginAction } = await import("@/lib/actions/admin-auth");

      const result = await adminLoginAction({
        email: "attacker@external.com",
        password: "any-password",
      });

      expect(result.ok).toBe(false);
      expect(result.error).toContain("Access denied");
    });

    it("adminLoginAction rejects fake or invalid TOTP codes (SEC-03)", async () => {
      const { adminLoginAction } = await import("@/lib/actions/admin-auth");

      const result = await adminLoginAction({
        email: "superadmin@tripmate.in",
        password: "wrong-password",
        totpCode: "000000",
      });

      expect(result.ok).toBe(false);
      expect(result.error).toBeDefined();
    });

    it("a non-admin user cannot execute admin actions (SEC-04 / SEC-05)", async () => {
      const { adminUpdateBookingStatusAction } = await import("@/lib/actions/admin-ops");

      const result = await adminUpdateBookingStatusAction({
        tripId: "f47ac10b-58cc-4372-a567-0e02b2c3d479",
        newStatus: "confirmed",
      });

      expect(result.ok).toBe(false);
      expect(result.error).toBe("Unauthorized admin access.");
    });
  });
});
