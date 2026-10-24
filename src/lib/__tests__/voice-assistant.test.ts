import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  classifyIntent,
  isHinglishQuery,
  routeEvonIntent,
} from "@/lib/ai/evon-router";
import {
  transcribeSpeechWithPrisma,
  generateVoiceWithTimbre,
  createSyntheticWavBuffer,
} from "@/lib/ai/gnani-client";
import { POST } from "@/app/api/ai/voice/route";
import { NextRequest } from "next/server";

describe("TripMate Voice AI Companion ('Matey') Test Suite", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  describe("1. Intent Classification & Parameter Extraction (Evon Router)", () => {
    it("correctly identifies vehicle inventory queries in Hinglish and English", () => {
      expect(classifyIntent("Jaipur se Shahpura Haveli ke liye gaadi dikhao")).toBe("INVENTORY_VEHICLE");
      expect(classifyIntent("Check Dzire cab price")).toBe("INVENTORY_VEHICLE");
      expect(classifyIntent("Which cars are available for 4 people?")).toBe("INVENTORY_VEHICLE");
      expect(classifyIntent("Innova Crysta with chauffeur available?")).toBe("INVENTORY_VEHICLE");
      expect(classifyIntent("gaadi chahiye", "/destinations/jaipur")).toBe("INVENTORY_VEHICLE");
    });

    it("correctly identifies hotel and haveli queries", () => {
      expect(classifyIntent("Show available heritage hotels")).toBe("INVENTORY_HOTEL");
      expect(classifyIntent("Shahpura Haveli room rates")).toBe("INVENTORY_HOTEL");
      expect(classifyIntent("Book a boutique stay in Udaipur")).toBe("INVENTORY_HOTEL");
      expect(classifyIntent("Raj Palace haveli amenities")).toBe("INVENTORY_HOTEL");
    });

    it("correctly identifies circuit discovery queries", () => {
      expect(classifyIntent("Plan a trip to Udaipur")).toBe("CIRCUIT_DISCOVERY");
      expect(classifyIntent("3-day Jaipur circuit plan karo")).toBe("CIRCUIT_DISCOVERY");
      expect(classifyIntent("Nahargarh sunset circuit")).toBe("CIRCUIT_DISCOVERY");
      expect(classifyIntent("Hampi weekend getaway tour")).toBe("CIRCUIT_DISCOVERY");
    });

    it("correctly identifies booking assistance and status queries", () => {
      expect(classifyIntent("Check my booking TM-492011")).toBe("BOOKING_ASSISTANCE");
      expect(classifyIntent("What is my booking status?")).toBe("BOOKING_ASSISTANCE");
      expect(classifyIntent("Help me check out")).toBe("BOOKING_ASSISTANCE");
      expect(classifyIntent("Show my booking TM-ABCD12")).toBe("BOOKING_ASSISTANCE");
      expect(classifyIntent("Meri booking ka kya status hai?")).toBe("BOOKING_ASSISTANCE");
    });

    it("classifies greetings and general queries into GENERAL_HELP", () => {
      expect(classifyIntent("Hello Matey")).toBe("GENERAL_HELP");
      expect(classifyIntent("Who are you?")).toBe("GENERAL_HELP");
    });
  });

  describe("2. Hinglish & Language Detection", () => {
    it("detects Hinglish keywords properly", () => {
      expect(isHinglishQuery("Jaipur ke liye gaadi dikhao")).toBe(true);
      expect(isHinglishQuery("Shahpura Haveli ka kiraya kitna hai?")).toBe(true);
      expect(isHinglishQuery("booking status batao")).toBe(true);
      expect(isHinglishQuery("kripya cab book kijiye")).toBe(true);
    });

    it("returns false for pure English sentences", () => {
      expect(isHinglishQuery("Show available vehicles from Jaipur")).toBe(false);
      expect(isHinglishQuery("Check booking reference status")).toBe(false);
      expect(isHinglishQuery("Explore heritage havelis")).toBe(false);
    });

    it("detects Devanagari Hindi text", () => {
      expect(isHinglishQuery("गाड़ी दिखाओ")).toBe(true);
      expect(isHinglishQuery("होटल बुक करो")).toBe(true);
    });
  });

  describe("3. Evon Intent Execution & Contextual Routing", () => {
    it("routes vehicle intent and returns actionable Dzire cab card", async () => {
      const res = await routeEvonIntent("Check Dzire cab price", {
        currentPath: "/book/trip_demo_123/vehicle",
        tripId: "trip_demo_123",
      });

      expect(res.intent).toBe("INVENTORY_VEHICLE");
      expect(res.replyText).toContain("verified cabs");
      expect(res.action).toBeDefined();
      expect(res.action?.targetUrl).toBe("/book/trip_demo_123/vehicle");
      expect(res.action?.label).toContain("Dzire");
    });

    it("routes hotel intent with bilingual Hinglish output", async () => {
      const res = await routeEvonIntent("Shahpura Haveli dikhao", {
        preferredLanguage: "hi-IN",
      });

      expect(res.intent).toBe("INVENTORY_HOTEL");
      expect(res.replyText).toContain("Shahpura Haveli");
      expect(res.action?.label).toContain("Shahpura Haveli");
    });

    it("routes booking lookup with TM-492011 reference", async () => {
      const res = await routeEvonIntent("Check my booking TM-492011");

      expect(res.intent).toBe("BOOKING_ASSISTANCE");
      expect(res.replyText).toContain("TM-492011");
      expect(res.action?.targetUrl).toBe("/trips");
      expect(res.action?.label).toContain("TM-492011");
    });

    it("routes circuit discovery and points to destination page", async () => {
      const res = await routeEvonIntent("Plan a trip to Udaipur");

      expect(res.intent).toBe("CIRCUIT_DISCOVERY");
      expect(res.replyText).toContain("Udaipur");
      expect(res.action?.targetUrl).toBe("/destinations/udaipur");
    });
  });

  describe("4. Gnani AI Client Audio Pipeline & Fallback Resilience", () => {
    it("creates a valid standard 16kHz mono PCM WAV buffer", () => {
      const wav = createSyntheticWavBuffer(0.2, 440);
      expect(wav.byteLength).toBeGreaterThan(44);

      const view = new DataView(wav);
      // "RIFF"
      expect(view.getUint32(0, false)).toBe(0x52494646);
      // "WAVE"
      expect(view.getUint32(8, false)).toBe(0x57415645);
      // Sample rate = 16000
      expect(view.getUint32(24, true)).toBe(16000);
      // Channels = 1 (mono)
      expect(view.getUint16(22, true)).toBe(1);
    });

    it("falls back gracefully when GNANI_API_KEY is not set", async () => {
      delete process.env.GNANI_API_KEY;

      const dummyBlob = new Blob([new Uint8Array([0, 1, 2, 3])], { type: "audio/wav" });
      const transcript = await transcribeSpeechWithPrisma(dummyBlob);
      expect(transcript).toBeDefined();
      expect(typeof transcript).toBe("string");
      expect(transcript.length).toBeGreaterThan(0);

      const audioBuf = await generateVoiceWithTimbre("Hello from Matey");
      expect(audioBuf).toBeDefined();
      expect(audioBuf.byteLength).toBeGreaterThan(44);
    });

    it("sends request with Authorization when GNANI_API_KEY is set", async () => {
      process.env.GNANI_API_KEY = "test_gnani_key_xyz";
      process.env.GNANI_API_URL = "https://mock.gnani.ai/v1";

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ transcript: "Jaipur cab book kardo" }),
        arrayBuffer: async () => createSyntheticWavBuffer(0.1),
      });
      global.fetch = mockFetch;

      const dummyBlob = new Blob([new Uint8Array([1, 2, 3])], { type: "audio/wav" });
      const transcript = await transcribeSpeechWithPrisma(dummyBlob, "hi-IN");

      expect(mockFetch).toHaveBeenCalledWith(
        "https://mock.gnani.ai/v1/asr/prisma",
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({
            Authorization: "Bearer test_gnani_key_xyz",
          }),
        })
      );
      expect(transcript).toBe("Jaipur cab book kardo");
    });
  });

  describe("5. Route Handler (POST /api/ai/voice)", () => {
    it("handles multipart form-data audio upload and returns speech response", async () => {
      const formData = new FormData();
      const fakeAudio = new Blob([new Uint8Array([0, 1, 2, 3])], { type: "audio/wav" });
      formData.append("audio", fakeAudio);
      formData.append("currentPath", "/destinations/jaipur");
      formData.append("language", "code-mixed");

      const req = new NextRequest("http://localhost:3000/api/ai/voice", {
        method: "POST",
        body: formData,
      });

      const res = await POST(req);
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json).toHaveProperty("transcript");
      expect(json).toHaveProperty("replyText");
      expect(json).toHaveProperty("audioBase64");
      expect(json).toHaveProperty("action");
      expect(json.audioBase64.length).toBeGreaterThan(0);
    });

    it("handles text prompt queries directly via JSON payload", async () => {
      const req = new NextRequest("http://localhost:3000/api/ai/voice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: "Check Dzire cab price",
          currentPath: "/book/trip_777/vehicle",
          tripId: "trip_777",
        }),
      });

      const res = await POST(req);
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.transcript).toBe("Check Dzire cab price");
      expect(json.replyText).toContain("Dzire");
      expect(json.action?.targetUrl).toBe("/book/trip_777/vehicle");
    });
  });
});
