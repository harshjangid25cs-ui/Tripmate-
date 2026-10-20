import { describe, it, expect } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { CatalogImage } from "@/components/ui/CatalogImage";
import {
  resolveCatalogImageUrl,
  optimizeExternalImageUrl,
  getDestinationImageUrl,
  getCircuitImageUrl,
  getHotelImageUrl,
  getVehicleImageUrl,
  getStopImageUrl,
} from "../data/images";

describe("Catalog Image Resolution & CDN Optimizer Tests", () => {
  it("resolves external and relative image paths correctly and rejects placeholder.jpg", () => {
    expect(resolveCatalogImageUrl("https://images.unsplash.com/photo-123")).toBe(
      "https://images.unsplash.com/photo-123"
    );
    expect(resolveCatalogImageUrl("/placeholder.svg")).toBe("/placeholder.svg");
    expect(resolveCatalogImageUrl(null)).toBeNull();
    expect(resolveCatalogImageUrl("")).toBeNull();
    expect(resolveCatalogImageUrl("   ")).toBeNull();
    expect(resolveCatalogImageUrl("/images/placeholder.jpg")).toBeNull();
    expect(resolveCatalogImageUrl("catalog-images/placeholder.jpg")).toBeNull();
  });

  it("optimizeExternalImageUrl properly optimizes Unsplash URLs and bypasses broken placeholders", () => {
    const rawUnsplash = "https://images.unsplash.com/photo-1599661046827-dacff0c0f09a";
    const optimized = optimizeExternalImageUrl(rawUnsplash, 800, 75);

    expect(optimized).toContain("images.unsplash.com");
    expect(optimized).toContain("auto=format");
    expect(optimized).toContain("fit=crop");
    expect(optimized).toContain("w=800");
    expect(optimized).toContain("q=75");

    // Overrides existing params cleanly
    const existingParams =
      "https://images.unsplash.com/photo-1599661046827-dacff0c0f09a?w=4000&q=100&auto=enhance";
    const reoptimized = optimizeExternalImageUrl(existingParams, 1200, 80);
    expect(reoptimized).toContain("w=1200");
    expect(reoptimized).toContain("q=80");
    expect(reoptimized).toContain("auto=format");
    expect(reoptimized).toContain("fit=crop");

    // Never returns broken /images/placeholder.jpg
    expect(optimizeExternalImageUrl("/images/placeholder.jpg")).toBe("");
    expect(optimizeExternalImageUrl("https://example.com/images/placeholder.jpg")).toBe("");
    expect(optimizeExternalImageUrl(null)).toBe("");
    expect(optimizeExternalImageUrl("")).toBe("");
  });

  it("optimizeExternalImageUrl handles Google and Supabase Storage URLs correctly", () => {
    const googleUrlWithWidth =
      "https://lh3.googleusercontent.com/aida-public/test-image=w1600";
    expect(optimizeExternalImageUrl(googleUrlWithWidth, 800)).toBe(
      "https://lh3.googleusercontent.com/aida-public/test-image=w800"
    );

    const googleDirectUrl =
      "https://lh3.googleusercontent.com/aida-public/AB6AXuBnfR96SXW5fSYOF2t4";
    expect(optimizeExternalImageUrl(googleDirectUrl)).toBe(googleDirectUrl);

    // Supabase Storage free-tier public URLs must remain untouched (no /storage/v1/render/image/ Pro rewriting)
    const supabasePublicUrl =
      "https://xyz.supabase.co/storage/v1/object/public/catalog-images/catalog/pic.webp";
    expect(optimizeExternalImageUrl(supabasePublicUrl)).toBe(supabasePublicUrl);
  });

  it("provides reliable fallbacks for catalog entities even when given broken placeholders", () => {
    expect(getDestinationImageUrl("jaipur", null)).toContain("http");
    expect(getDestinationImageUrl("jaipur", "/images/placeholder.jpg")).toContain("http");
    expect(getCircuitImageUrl("c1", null)).toContain("http");
    expect(getCircuitImageUrl("c1", "/images/placeholder.jpg")).toContain("http");
    expect(getHotelImageUrl("h1", null)).toContain("http");
    expect(getHotelImageUrl("h1", "/images/placeholder.jpg")).toContain("http");
    expect(getVehicleImageUrl("v1", null)).toContain("http");
    expect(getVehicleImageUrl("v1", "/images/placeholder.jpg")).toContain("http");
    expect(getStopImageUrl("s1", null)).toContain("http");
    expect(getStopImageUrl("s1", "/images/placeholder.jpg")).toContain("http");
  });

  it("renders CatalogImage architectural fallback when src is missing, null, or placeholder without crashing", () => {
    const htmlNull = renderToStaticMarkup(
      React.createElement(CatalogImage, { src: null, alt: "Null src test" })
    );
    // Should render the solid architectural fallback surface matching design.md #EBE9E4
    expect(htmlNull).toContain("bg-[#EBE9E4]");
    expect(htmlNull).toContain("text-[#6E6D68]");
    expect(htmlNull).toContain("Null src test");
    expect(htmlNull).toContain("<svg");
    expect(htmlNull).not.toContain("placeholder.jpg");

    const htmlPlaceholder = renderToStaticMarkup(
      React.createElement(CatalogImage, {
        src: "/images/placeholder.jpg",
        alt: "Jaipur Palace",
      })
    );
    expect(htmlPlaceholder).toContain("bg-[#EBE9E4]");
    expect(htmlPlaceholder).toContain("Jaipur Palace");
    expect(htmlPlaceholder).not.toContain("placeholder.jpg");

    const htmlEmpty = renderToStaticMarkup(
      React.createElement(CatalogImage, { src: "   ", alt: "Empty src test" })
    );
    expect(htmlEmpty).toContain("bg-[#EBE9E4]");
  });

  it("renders external images with flat surface token classes and unoptimized direct CDN loading", () => {
    const html = renderToStaticMarkup(
      React.createElement(CatalogImage, {
        src: "https://images.unsplash.com/photo-123",
        alt: "External test",
        width: 400,
        height: 300,
      })
    );
    expect(html).toContain("bg-[#EBE9E4]");
    expect(html).toContain("images.unsplash.com");
    expect(html).toContain("auto=format");
    expect(html).toContain("w=400");
  });
});
