import { describe, it, expect } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { CatalogImage } from "@/components/ui/CatalogImage";
import {
  resolveCatalogImageUrl,
  getDestinationImageUrl,
  getCircuitImageUrl,
  getHotelImageUrl,
  getVehicleImageUrl,
  getStopImageUrl,
} from "../data/images";

describe("Catalog Image Resolution & Fallback Tests", () => {
  it("resolves external and relative image paths correctly", () => {
    expect(resolveCatalogImageUrl("https://images.unsplash.com/photo-123")).toBe(
      "https://images.unsplash.com/photo-123"
    );
    expect(resolveCatalogImageUrl("/placeholder.svg")).toBe("/placeholder.svg");
    expect(resolveCatalogImageUrl(null)).toBeNull();
    expect(resolveCatalogImageUrl("")).toBeNull();
    expect(resolveCatalogImageUrl("   ")).toBeNull();
  });

  it("provides reliable fallbacks for catalog entities", () => {
    expect(getDestinationImageUrl("jaipur", null)).toContain("http");
    expect(getCircuitImageUrl("c1", null)).toContain("http");
    expect(getHotelImageUrl("h1", null)).toContain("http");
    expect(getVehicleImageUrl("v1", null)).toContain("http");
    expect(getStopImageUrl("s1", null)).toContain("http");
  });

  it("renders CatalogImage with fallback when src is missing, null, or empty without crashing", () => {
    const htmlNull = renderToStaticMarkup(
      React.createElement(CatalogImage, { src: null, alt: "Null src test" })
    );
    // Should render an img tag pointing to placeholder.svg
    expect(htmlNull).toContain("<img");
    expect(htmlNull).toContain("/placeholder.svg");
    expect(htmlNull).toContain("bg-slate-100");
    expect(htmlNull).toContain("bg-[#FBF9F5]");

    const htmlEmpty = renderToStaticMarkup(
      React.createElement(CatalogImage, { src: "   ", alt: "Empty src test" })
    );
    expect(htmlEmpty).toContain("/placeholder.svg");
  });

  it("renders external images with flat surface token classes", () => {
    const html = renderToStaticMarkup(
      React.createElement(CatalogImage, {
        src: "https://example.com/external.jpg",
        alt: "External test",
        width: 400,
        height: 300,
      })
    );
    expect(html).toContain("bg-slate-100");
    expect(html).toContain("bg-[#FBF9F5]");
    expect(html).toContain("https://example.com/external.jpg");
  });
});
