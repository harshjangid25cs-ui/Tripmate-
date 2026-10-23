import { describe, it, expect, vi } from "vitest";
import {
  getAuthRedirectPath,
  ONBOARDING_COOKIE_NAME,
} from "@/lib/auth-guard";

vi.mock("@supabase/ssr", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@supabase/ssr")>();
  return {
    ...actual,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    createServerClient: vi.fn((url: string, key: string, options: any) => {
      const client = actual.createServerClient(url, key, options);
      const origVerifyOtp = client.auth.verifyOtp.bind(client.auth);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (client.auth as any).verifyOtp = async (params: any) => {
        if (params?.token_hash === "mock-hashed-token") {
          options?.cookies?.setAll?.([
            {
              name: "sb-mock-auth-token",
              value: "mock-token-value",
              options: { path: "/", httpOnly: true, sameSite: "lax" },
            },
          ]);
          return {
            data: {
              session: { access_token: "mock-jwt-token" },
              user: { id: "cust-1234-uuid", email: "9876543210@phone.tripmate.in" },
            },
            error: null,
          };
        }
        return origVerifyOtp(params);
      };
      return client;
    }),
  };
});

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

    it("isAuthorizedAdmin allows DEFAULT_ADMIN_EMAILS without app_metadata role in production with NEXT_PUBLIC_ENABLE_DEMO_ADMIN unset", async () => {
      // Simulate production: NODE_ENV === "production" and NEXT_PUBLIC_ENABLE_DEMO_ADMIN is NOT set
      const origEnv = process.env.NEXT_PUBLIC_ENABLE_DEMO_ADMIN;
      const origNodeEnv = process.env.NODE_ENV;
      delete process.env.NEXT_PUBLIC_ENABLE_DEMO_ADMIN;
      (process.env as Record<string, string | undefined>).NODE_ENV = "production";

      const { isAuthorizedAdmin } = await import("@/lib/admin/admin-auth");

      // Primary admin account must pass even without app_metadata in production
      expect(
        isAuthorizedAdmin({
          user: { email: "tripmateoffical007@gmail.com", app_metadata: {}, user_metadata: {} },
        })
      ).toBe(true);

      // Direct user object parameter variant must also pass
      expect(
        isAuthorizedAdmin({
          email: "tripmateoffical007@gmail.com",
          app_metadata: {},
          user_metadata: {},
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
      (process.env as Record<string, string | undefined>).NODE_ENV = origNodeEnv;
    });

    it("requireAdmin() rejects unauthenticated callers and non-admin users (SEC-05)", async () => {
      const { requireAdmin } = await import("@/lib/admin/admin-auth");

      // Without active session, requireAdmin must throw unauthorized error
      await expect(requireAdmin()).rejects.toThrow("Unauthorized");
    });

    it(
      "adminLoginAction rejects wrong password and never swallows errors (SEC-02)",
      async () => {
        const { adminLoginAction } = await import("@/lib/actions/admin-auth");

        const result = await adminLoginAction({
          email: "superadmin@tripmate.in",
          password: "definitely-wrong-password-12345",
        });

        expect(result.ok).toBe(false);
        expect(result.error).toBeDefined();
      },
      15000
    );

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
    }, 15000);

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

  describe("WhatsApp Unified Supabase Auth Session Bridge & KYC Vault Integrity", () => {
    it("stale wa_session cookies without a valid Supabase JWT cannot bypass middleware auth", () => {
      // In the new unified architecture, middleware strictly sets hasUser: Boolean(user).
      // If user is null, even with stale wa_session cookie, protected routes MUST redirect to /login.
      const protectedPaths = ["/profile", "/trips", "/book/trip-123/checkout", "/commercial"];
      for (const pathname of protectedPaths) {
        const redirect = getAuthRedirectPath({
          pathname,
          hasUser: false, // user is null
          hasCompletedOnboarding: true,
        });
        expect(redirect).toBe("/login");
      }
    });

    it("verifies that profiles upsert preserves existing KYC ID Vault fields for returning users", () => {
      const existingProfile = {
        id: "auth-user-9988",
        full_name: "Original Traveler",
        saved_id_type: "passport",
        saved_id_storage_path: "kyc-vault/auth-user-9988/passport.pdf",
        saved_id_file_size_bytes: 524288,
        saved_id_verified: true,
        saved_id_updated_at: "2026-09-01T10:00:00Z",
        saved_companions: [{ full_name: "Companion One", id_type: "aadhaar" }],
      };

      const customerName = "Updated Name";
      const cleanPhone = "9876543210";
      const syntheticEmail = `${cleanPhone}@phone.tripmate.in`;
      const now = new Date().toISOString();

      const profileUpsert = {
        id: existingProfile.id,
        email: syntheticEmail,
        full_name: customerName || existingProfile.full_name,
        phone: cleanPhone,
        updated_at: now,
        saved_id_type: existingProfile.saved_id_type ?? null,
        saved_id_storage_path: existingProfile.saved_id_storage_path ?? null,
        saved_id_file_size_bytes: existingProfile.saved_id_file_size_bytes ?? null,
        saved_id_verified: existingProfile.saved_id_verified ?? false,
        saved_id_updated_at: existingProfile.saved_id_updated_at ?? null,
        saved_companions: existingProfile.saved_companions ?? null,
      };

      expect(profileUpsert.id).toBe("auth-user-9988");
      expect(profileUpsert.saved_id_type).toBe("passport");
      expect(profileUpsert.saved_id_storage_path).toBe("kyc-vault/auth-user-9988/passport.pdf");
      expect(profileUpsert.saved_id_verified).toBe(true);
      expect(profileUpsert.saved_companions).toHaveLength(1);
      expect(profileUpsert.phone).toBe("9876543210");
    });

    it("calls POST /api/auth/verify-otp and verifies magiclink session bridge minting without static passwords", async () => {
      const { POST: verifyOtpHandler } = await import("@/app/api/auth/verify-otp/route");
      const waSupabase = await import("@/lib/wa-auth/supabase");
      const { NextRequest } = await import("next/server");

      let generatedLinkParams: { type: string; email: string } | null = null;
      let invalidatedPassword = "";

      const mockCustomer = {
        id: "cust-test-1",
        mobile: "9876543210",
        name: "Test Traveler",
        status: "ACTIVE",
      };

      const mockRpc = vi.fn().mockResolvedValue({
        data: { status: "ok", name: "Test Traveler", email: "test@tripmate.in" },
        error: null,
      });

      const mockFrom = vi.fn().mockImplementation((table: string) => {
        if (table === "wa_customers") {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: async () => ({ data: mockCustomer, error: null }),
              }),
            }),
            update: () => ({
              eq: async () => ({ error: null }),
            }),
            insert: async () => ({ error: null }),
          };
        }
        if (table === "wa_sessions") {
          return {
            insert: async () => ({ error: null }),
          };
        }
        if (table === "profiles") {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: async () => ({ data: null, error: null }),
              }),
            }),
            upsert: async () => ({ error: null }),
          };
        }
        return {};
      });

      vi.spyOn(waSupabase, "db").mockReturnValue({
        rpc: mockRpc,
        from: mockFrom,
        auth: {
          admin: {
            createUser: async () => ({ data: null }),
            generateLink: async (params: { type: string; email: string }) => {
              generatedLinkParams = params;
              return {
                data: { properties: { hashed_token: "mock-hashed-token" } },
                error: null,
              };
            },
            updateUserById: async (_uid: string, attrs: { password?: string }) => {
              if (attrs.password) invalidatedPassword = attrs.password;
              return { error: null };
            },
          },
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);

      const req = new NextRequest("http://localhost:3000/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mobile: "9876543210", otp: "654321" }),
      });

      const res = await verifyOtpHandler(req);
      expect(res.status).toBe(200);

      // Verify the route called generateLink with type: 'magiclink' (cryptographic, non-password)
      expect(generatedLinkParams).toEqual({
        type: "magiclink",
        email: "9876543210@phone.tripmate.in",
      });

      // Verify rogue passwords were neutralized
      expect(invalidatedPassword.length).toBeGreaterThanOrEqual(32);

      // Verify session cookies were set on the response
      const setCookie = res.headers.get("set-cookie");
      expect(setCookie).toBeDefined();
      expect(setCookie).toContain("sb-mock-auth-token=");
      expect(setCookie).toContain("wa_session=");

      vi.restoreAllMocks();
    });
  });
});
