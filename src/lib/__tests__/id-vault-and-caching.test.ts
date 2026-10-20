import { describe, it, expect } from "vitest";
import {
  compressImageToMax300KB,
  validateDocumentClarity,
  MAX_DOCUMENT_BYTES,
} from "@/lib/images/compress-and-validate";
import {
  CATALOG_TAGS,
  PUBLIC_CATALOG_TTL_SECONDS,
} from "@/lib/cache/catalog-cache";
import { invalidateCatalogCache } from "@/lib/actions/admin-ops";
import { saveTripPassengersSchema } from "@/lib/validations/actions";

describe("Task 2: High-Clarity <= 300 KB Compressor & Clarity Validator", () => {
  it("guarantees output size is strictly <= 300 KB (307,200 bytes) for oversized 4 MB buffer", async () => {
    // Synthetic 4 MB buffer matching Playwright Test 3
    const fourMbBuffer = Buffer.alloc(4 * 1024 * 1024, "a");
    fourMbBuffer.write("%PDF-1.4\n", 0);

    const testFile = new File([fourMbBuffer], "test_kyc_4mb.pdf", {
      type: "application/pdf",
    });

    const result = await compressImageToMax300KB(testFile);

    expect(result.compressedBytes).toBeLessThanOrEqual(MAX_DOCUMENT_BYTES);
    expect(result.file.size).toBeLessThanOrEqual(MAX_DOCUMENT_BYTES);
    expect(result.originalBytes).toBe(4 * 1024 * 1024);
    expect(result.reductionPercentage).toBeGreaterThan(90);
  });

  it("passes small files (< 300 KB) without unnecessary reduction", async () => {
    const smallBuffer = Buffer.alloc(150 * 1024, "b");
    const smallFile = new File([smallBuffer], "small_aadhaar.jpg", {
      type: "image/jpeg",
    });

    const result = await compressImageToMax300KB(smallFile);

    expect(result.compressedBytes).toBe(150 * 1024);
    expect(result.compressedBytes).toBeLessThanOrEqual(MAX_DOCUMENT_BYTES);
    expect(result.reductionPercentage).toBe(0);
  });

  it("validateDocumentClarity safely handles synthetic mock buffers without crashing", async () => {
    const mockFile = new File(["dummy text"], "test.pdf", {
      type: "application/pdf",
    });

    const clarity = await validateDocumentClarity(mockFile);
    expect(clarity.valid).toBe(true);
  });
});

describe("Task 4: Tagged ISR Data Cache & 0ms Admin Busting", () => {
  it("defines canonical catalog tags and 5-minute TTL", () => {
    expect(CATALOG_TAGS.ALL).toBe("catalog");
    expect(CATALOG_TAGS.DESTINATIONS).toBe("catalog:destinations");
    expect(CATALOG_TAGS.CIRCUITS).toBe("catalog:circuits");
    expect(CATALOG_TAGS.HOTELS).toBe("catalog:hotels");
    expect(CATALOG_TAGS.VEHICLES).toBe("catalog:vehicles");
    expect(CATALOG_TAGS.STOPS).toBe("catalog:stops");
    expect(PUBLIC_CATALOG_TTL_SECONDS).toBe(300);
  });

  it("invalidateCatalogCache is strictly an async function", async () => {
    expect(typeof invalidateCatalogCache).toBe("function");
    // Calling it must return a Promise
    const promise = invalidateCatalogCache();
    expect(promise).toBeInstanceOf(Promise);
    await expect(promise).resolves.toBeUndefined();
  });
});

describe("Task 1 & 3: Reusable ID Vault & Passengers Validation", () => {
  it("validates passenger payload with idFileSizeBytes and isReusedFromProfile", () => {
    const validPayload = {
      tripId: "11111111-1111-1111-1111-111111111111",
      passengers: [
        {
          isLead: true,
          fullName: "Aarav Sharma",
          phone: "9876543210",
          idDocType: "aadhaar",
          idDocPath: "user-123/trip-abc/passenger_1.webp",
          idFileSizeBytes: 212000,
          isReusedFromProfile: true,
        },
        {
          isLead: false,
          fullName: "Priya Sharma",
          phone: "9876543211",
          idDocType: "passport",
          idDocPath: "user-123/trip-abc/passenger_2.webp",
          idFileSizeBytes: 185000,
          isReusedFromProfile: false,
        },
      ],
    };

    const parsed = saveTripPassengersSchema.safeParse(validPayload);
    expect(parsed.success).toBe(true);
  });
});
