import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";
import manifest from "@/app/manifest";

describe("PWA Specification & Manifest Verification (Task 1 & Task 4)", () => {
  it("outputs a valid manifest with display: standalone, portrait orientation and brand colors", () => {
    const data = manifest();

    expect(data.name).toBe("TripMate — Regional Travel & AI Concierge");
    expect(data.short_name).toBe("TripMate");
    expect(data.description).toContain("Plan seamlessly, ride freely, travel confidently");
    expect(data.start_url).toBe("/");
    expect(data.display).toBe("standalone");
    expect(data.background_color).toBe("#FBF9F5");
    expect(data.theme_color).toBe("#FF5E1E");
    expect(data.orientation).toBe("portrait");
  });

  it("declares 192x192, 512x512, and 180x180 apple-touch-icon icons that physically exist", () => {
    const data = manifest();
    expect(data.icons).toBeDefined();
    expect(data.icons!.length).toBeGreaterThanOrEqual(3);

    const icon192 = data.icons!.find((i) => i.sizes === "192x192");
    const icon512 = data.icons!.find((i) => i.sizes === "512x512");
    const appleIcon = data.icons!.find((i) => i.sizes === "180x180");

    expect(icon192).toBeDefined();
    expect(icon192!.src).toBe("/icons/icon-192x192.png");
    expect(icon192!.type).toBe("image/png");

    expect(icon512).toBeDefined();
    expect(icon512!.src).toBe("/icons/icon-512x512.png");
    expect(icon512!.type).toBe("image/png");

    expect(appleIcon).toBeDefined();
    expect(appleIcon!.src).toBe("/icons/apple-touch-icon.png");

    // Verify files on disk
    const publicDir = path.resolve(process.cwd(), "public");
    for (const icon of data.icons!) {
      const cleanPath = icon.src.replace(/^\//, "");
      const fullPath = path.join(publicDir, cleanPath);
      expect(fs.existsSync(fullPath)).toBe(true);
      const stat = fs.statSync(fullPath);
      expect(stat.size).toBeGreaterThan(500); // verify non-empty, valid image file
    }
  });
});

describe("Safe Service Worker Architecture (Task 2 & Cache Safety)", () => {
  const swPath = path.resolve(process.cwd(), "public/sw.js");

  it("exists as a zero-dependency standalone script in public/sw.js", () => {
    expect(fs.existsSync(swPath)).toBe(true);
  });

  it("enforces strict Network-Only bypass for non-GET, API, admin, auth, book, and supabase requests", () => {
    const swContent = fs.readFileSync(swPath, "utf8");

    // Must check for non-GET methods
    expect(swContent).toMatch(/req\.method\s*!==\s*['"]GET['"]/);

    // Must bypass critical real-time / dynamic routes
    expect(swContent).toContain("/api/");
    expect(swContent).toContain("/admin");
    expect(swContent).toContain("/auth");
    expect(swContent).toContain("/book/");
    expect(swContent).toContain("supabase.co");
    expect(swContent).toContain("/_next/data");

    // Must immediately call fetch(req) without caching on bypass
    expect(swContent).toMatch(/if\s*\(\s*isNonGet\s*\|\|\s*isBypassUrl\s*\)\s*\{\s*event\.respondWith\(fetch\(req\)\);/);
  });

  it("configures Stale-While-Revalidate caching for static chunks, fonts, icons, and mascot images", () => {
    const swContent = fs.readFileSync(swPath, "utf8");

    expect(swContent).toContain("/_next/static/");
    expect(swContent).toContain("/icons/");
    expect(swContent).toContain("/images/");
    expect(swContent).toContain("fonts.googleapis.com");
    expect(swContent).toContain("fonts.gstatic.com");
    expect(swContent).toMatch(/cache\.put\(req,\s*networkResponse\.clone\(\)\)/);
  });
});
