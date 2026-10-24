import { describe, it, expect } from "vitest";
import {
  createInitialSessionState,
  evaluateTravelAgentTurn,
  detectLanguageMode,
} from "@/lib/ai/travel-agent-state";
import { generateConciseAgentReply } from "@/lib/ai/agent-persona";
import { upsertVoiceDraftTrip, findMatchingDestinationAndCircuit } from "@/lib/ai/agent-tools";

describe("Autonomous Voice Travel Agent ('Matey') Conversational Engine", () => {
  describe("1. Multi-Turn Conversational Slot Filling", () => {
    it("progresses sequentially across Destination -> Hotel -> Vehicle -> Checkout", () => {
      // Turn 1: Destination, Days & Travelers
      const s0 = createInitialSessionState();
      const turn1 = evaluateTravelAgentTurn("Hum 4 log Jaipur 3 din ke liye jana chahte hain", s0);

      expect(turn1.extractedSlots.destination).toBe("Jaipur");
      expect(turn1.extractedSlots.durationDays).toBe(3);
      expect(turn1.extractedSlots.travelerCount).toBe(4);
      expect(turn1.updatedState.currentStage).toBe("choosing_hotel");
      expect(turn1.nextQuestion).toContain("Shahpura Haveli");

      // Turn 2: Hotel Selection
      const turn2 = evaluateTravelAgentTurn("Shahpura Haveli kar do", turn1.updatedState);
      expect(turn2.extractedSlots.hotel).toBe("Shahpura Haveli");
      expect(turn2.updatedState.selectedHotelName).toBe("Shahpura Haveli");
      expect(turn2.updatedState.currentStage).toBe("choosing_vehicle");
      expect(turn2.nextQuestion).toContain("Dzire");

      // Turn 3: Vehicle Selection
      const turn3 = evaluateTravelAgentTurn("Innova Crysta cab book karo", turn2.updatedState);
      expect(turn3.extractedSlots.vehicle).toBe("Toyota Innova Crysta");
      expect(turn3.updatedState.selectedVehicleName).toBe("Toyota Innova Crysta");
      expect(turn3.updatedState.currentStage).toBe("ready_for_checkout");

      // Turn 4: Checkout Intent
      const turn4 = evaluateTravelAgentTurn("Payment pe le chalo confirm kar do", turn3.updatedState);
      expect(turn4.extractedSlots.wantsCheckout).toBe(true);
      expect(turn4.updatedState.currentStage).toBe("ready_for_checkout");
      expect(turn4.nextQuestion).toContain("checkout");
    });
  });

  describe("2. Single-Shot Compound Voice Utterance", () => {
    it("extracts all slots simultaneously from a single comprehensive voice request", () => {
      const s0 = createInitialSessionState();
      const utterance =
        "Book a 3-day Jaipur family trip for 4 people with an SUV and Shahpura Haveli lock kar do";

      const result = evaluateTravelAgentTurn(utterance, s0);
      const state = result.updatedState;

      expect(state.destinationName).toBe("Jaipur");
      expect(state.durationDays).toBe(3);
      expect(state.travelerCount).toBe(4);
      expect(state.travelType).toBe("family");
      expect(state.selectedHotelName).toBe("Shahpura Haveli");
      expect(state.selectedVehicleName).toBe("Toyota Innova Crysta");
      expect(state.currentStage).toBe("ready_for_checkout");

      // Price calculation: 3 days * 2 rooms * 4200 + 3 days * 3500 = 25200 + 10500 = 35700
      expect(state.totalEstimatedPrice).toBe(35700);
    });
  });

  describe("3. Language Detection & Concierge Response Formatting", () => {
    it("detects Hinglish, English, and Hindi accurately", () => {
      expect(detectLanguageMode("Jaipur 3 din ke liye cab batao")).toBe("hinglish");
      expect(detectLanguageMode("Show me packages for Jaipur")).toBe("en");
      expect(detectLanguageMode("जयपुर का टूर पैकेज दिखाओ")).toBe("hi");
    });

    it("generates concise, conversational speech within word limits (25 to 45 words)", () => {
      const state = createInitialSessionState();
      state.destinationName = "Jaipur";
      state.durationDays = 3;
      state.travelerCount = 4;
      state.selectedHotelName = "Shahpura Haveli";
      state.selectedVehicleName = "Toyota Innova Crysta";
      state.totalEstimatedPrice = 35700;
      state.currentStage = "ready_for_checkout";

      const reply = generateConciseAgentReply(
        state,
        { wantsCheckout: true },
        "Kya main checkout khol doon?"
      );

      const wordCount = reply.split(/\s+/).length;
      expect(wordCount).toBeGreaterThanOrEqual(15);
      expect(wordCount).toBeLessThanOrEqual(45);
      expect(reply).toContain("Shahpura Haveli");
      expect(reply).toContain("Toyota Innova");
    });
  });

  describe("4. Live Database Tool Execution (upsertVoiceDraftTrip)", () => {
    it("creates or updates a draft trip and returns a valid checkout URL", async () => {
      const state = createInitialSessionState();
      state.destinationName = "Jaipur";
      state.durationDays = 3;
      state.travelerCount = 4;
      state.selectedHotelName = "Shahpura Haveli";
      state.selectedVehicleName = "Toyota Innova Crysta";
      state.currentStage = "ready_for_checkout";

      const result = await upsertVoiceDraftTrip(state);

      expect(result.tripId).toBeDefined();
      expect(result.totalAmount).toBe(35700);
      expect(result.targetUrl).toContain(`/book/${result.tripId}/checkout`);
    });

    it("matches destination and provides verified catalog pricing", async () => {
      const jaipurCatalog = await findMatchingDestinationAndCircuit("jaipur", 3);
      expect(jaipurCatalog.destination.name).toBe("Jaipur");
      expect(jaipurCatalog.hotels.length).toBeGreaterThanOrEqual(2);
      expect(jaipurCatalog.vehicles.length).toBeGreaterThanOrEqual(2);
    });
  });
});
