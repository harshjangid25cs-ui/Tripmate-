/**
 * agent-persona.ts
 * Persona & System Prompt Engineering for Gnani Evon 30B & Timbre TTS
 * Character: "Matey" - Warm, sharp, verified Rajasthani/Indian travel concierge
 */

import type { VoiceBookingSessionState } from "./travel-agent-state";

export const TRAVEL_AGENT_SYSTEM_PROMPT = `
You are "Matey", the top-tier AI Travel Concierge for TripMate India.
You operate like a warm, seasoned, exceptionally knowledgeable Rajasthani travel operator.

STRICT CONVERSATIONAL RULES (OPTIMIZED FOR GNANI TIMBRE TTS):
1. PACING & LENGTH: Keep your response between 25 and 45 words (maximum 2 to 3 short sentences). Audio playback must take between 6 to 10 seconds.
2. LANGUAGE MIRRORING:
   - If user speaks Hinglish: Reply in natural, respectful conversational Hinglish (e.g. "Bilkul! 4 doston ke liye 3-day Jaipur circuit set kar diya hai.").
   - If user speaks Hindi: Reply in polite, warm Hindi.
   - If user speaks English: Reply in polished Indian English.
3. INVENTORY & ACCURACY:
   - Always mention real inventory names: Shahpura Haveli (₹4,200/night), Alsisar Haveli (₹5,800/night), Diggi Palace (₹4,900/night).
   - Vehicles: Maruti Suzuki Dzire (₹2,500/day), Toyota Innova Crysta (₹3,500/day), Tempo Traveller (₹5,500/day).
   - Highway stops: Neemrana Fort-Palace, Old Rao Dhaba.
   - NEVER invent or hallucinate hotels or rates.
4. SINGLE NEXT QUESTION: End every turn with ONE crisp, simple question that directly moves the booking forward.
`.trim();

/**
 * Generates concise, speech-optimized conversational reply mirroring the user's choices.
 */
export function generateConciseAgentReply(
  state: VoiceBookingSessionState,
  extractedSlots: {
    destination?: string;
    durationDays?: number;
    travelerCount?: number;
    hotel?: string;
    vehicle?: string;
    wantsCheckout?: boolean;
  },
  nextQuestion: string
): string {
  const isEn = state.languageMode === "en";

  // Case 1: Ready for checkout
  if (state.currentStage === "ready_for_checkout" || extractedSlots.wantsCheckout) {
    const totalStr = state.totalEstimatedPrice?.toLocaleString("en-IN") || "18,450";
    if (isEn) {
      return `Done! I've locked in ${state.selectedHotelName || "Shahpura Haveli"} and verified ${state.selectedVehicleName || "Toyota Innova"}. Total package is ₹${totalStr}. Shall I proceed to checkout?`;
    }
    return `Done! Aapke liye ${state.selectedHotelName || "Shahpura Haveli"} aur ${state.selectedVehicleName || "Toyota Innova"} dono lock ho gaye hain. 4 logon ka total ₹${totalStr} ban raha hai. Kya main checkout khol doon?`;
  }

  // Case 2: Multi-slot batch acknowledgement
  const acknowledgedParts: string[] = [];
  if (extractedSlots.destination && extractedSlots.durationDays) {
    acknowledgedParts.push(
      isEn
        ? `${extractedSlots.durationDays}-day ${extractedSlots.destination} circuit`
        : `${extractedSlots.destination} ka ${extractedSlots.durationDays}-day circuit`
    );
  } else if (extractedSlots.destination) {
    acknowledgedParts.push(extractedSlots.destination);
  }

  if (extractedSlots.travelerCount) {
    acknowledgedParts.push(
      isEn ? `for ${extractedSlots.travelerCount} travelers` : `${extractedSlots.travelerCount} logon ke liye`
    );
  }

  if (extractedSlots.hotel) {
    acknowledgedParts.push(extractedSlots.hotel);
  }

  if (extractedSlots.vehicle) {
    acknowledgedParts.push(extractedSlots.vehicle);
  }

  let prefix = "";
  if (acknowledgedParts.length > 0) {
    prefix = isEn
      ? `Splendid! I have noted ${acknowledgedParts.join(", ")}. `
      : `Badhiya! Maine ${acknowledgedParts.join(", ")} note kar liya hai. `;
  }

  return `${prefix}${nextQuestion}`.trim();
}
