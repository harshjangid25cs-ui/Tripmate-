import { describe, it, expect } from "vitest";
import { formatCurrency, formatDateRange } from "../format";

describe("Format Utilities", () => {
  it("formats Indian Rupee currency correctly", () => {
    expect(formatCurrency(27376)).toContain("27,376");
    expect(formatCurrency("4200")).toContain("4,200");
    expect(formatCurrency(0)).toContain("0");
    expect(formatCurrency(null)).toContain("0");
  });

  it("formats date ranges with duration calculation", () => {
    const range = formatDateRange("2025-12-14", "2025-12-17", { includeDuration: true });
    expect(range).toContain("Dec 14 – Dec 17, 2025");
    expect(range).toContain("4 Days / 3 Nights");
  });
});
