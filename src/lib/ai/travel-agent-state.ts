/**
 * travel-agent-state.ts
 * Stateful Conversational Slot-Filling Engine for TripMate Autonomous Voice Travel Agent ("Matey")
 */

export interface VoiceBookingSessionState {
  tripId: string | null;
  destinationId: string | null;
  destinationName: string | null;
  circuitId: string | null;
  durationDays: number | null;
  travelerCount: number | null;
  travelType: "solo" | "family" | "corporate" | null;
  selectedHotelId: string | null;
  selectedHotelName: string | null;
  selectedVehicleId: string | null;
  selectedVehicleName: string | null;
  selectedStopIds: string[];
  totalEstimatedPrice: number | null;
  currentStage:
    | "greeting"
    | "choosing_destination"
    | "choosing_hotel"
    | "choosing_vehicle"
    | "choosing_stops"
    | "ready_for_checkout";
  languageMode: "hinglish" | "en" | "hi";
}

export interface SlotExtractionResult {
  updatedState: VoiceBookingSessionState;
  extractedSlots: {
    destination?: string;
    durationDays?: number;
    travelerCount?: number;
    travelType?: "solo" | "family" | "corporate";
    hotel?: string;
    vehicle?: string;
    stops?: string[];
    wantsCheckout?: boolean;
  };
  nextQuestion: string;
}

export function createInitialSessionState(): VoiceBookingSessionState {
  return {
    tripId: null,
    destinationId: null,
    destinationName: null,
    circuitId: null,
    durationDays: null,
    travelerCount: null,
    travelType: null,
    selectedHotelId: null,
    selectedHotelName: null,
    selectedVehicleId: null,
    selectedVehicleName: null,
    selectedStopIds: [],
    totalEstimatedPrice: null,
    currentStage: "greeting",
    languageMode: "hinglish",
  };
}

/**
 * Detect language mode from user utterance:
 * Devanagari characters -> 'hi'
 * Hindi keywords -> 'hinglish'
 * Pure english -> 'en'
 */
export function detectLanguageMode(text: string): "hinglish" | "en" | "hi" {
  if (/[\u0900-\u097F]/.test(text)) {
    return "hi";
  }
  const lower = text.toLowerCase();
  const hindiKeywords = [
    "karo", "karna", "chahiye", "hum", "kitna", "bhai", "namaste", "din", "log",
    "gaadi", "gadi", "chalna", "batao", "dikhao", "badhiya", "sahi", "haan", "nahin",
    "le chalo", "kar do", "dost", "parivar"
  ];
  if (hindiKeywords.some((w) => lower.includes(w))) {
    return "hinglish";
  }
  return "en";
}

/**
 * Evaluates user utterance and updates booking slots deterministically.
 */
export function evaluateTravelAgentTurn(
  utterance: string,
  currentState: VoiceBookingSessionState
): SlotExtractionResult {
  const text = utterance.toLowerCase();
  const state: VoiceBookingSessionState = {
    ...currentState,
    selectedStopIds: [...currentState.selectedStopIds],
  };

  const extracted: SlotExtractionResult["extractedSlots"] = {};
  state.languageMode = detectLanguageMode(utterance);

  // 1. Destination Extraction
  if (text.includes("jaipur")) {
    state.destinationId = "dest_jaipur";
    state.destinationName = "Jaipur";
    state.circuitId = state.circuitId || "circ_jaipur_3d";
    extracted.destination = "Jaipur";
  } else if (text.includes("udaipur")) {
    state.destinationId = "dest_udaipur";
    state.destinationName = "Udaipur";
    state.circuitId = "circ_udaipur_4d";
    extracted.destination = "Udaipur";
  } else if (text.includes("pushkar")) {
    state.destinationId = "dest_pushkar";
    state.destinationName = "Pushkar";
    extracted.destination = "Pushkar";
  } else if (text.includes("jodhpur")) {
    state.destinationId = "dest_jodhpur";
    state.destinationName = "Jodhpur";
    extracted.destination = "Jodhpur";
  } else if (text.includes("hampi")) {
    state.destinationId = "dest_hampi";
    state.destinationName = "Hampi";
    extracted.destination = "Hampi";
  } else if (text.includes("munnar")) {
    state.destinationId = "dest_munnar";
    state.destinationName = "Munnar";
    extracted.destination = "Munnar";
  }

  // 2. Duration Extraction (e.g., "3 din", "3-day", "3 days", "weekend", "4 nights")
  const durationMatch = text.match(/(\d+)[\s-]*(din|days?|nights?|raat)/i);
  if (durationMatch && durationMatch[1]) {
    const days = parseInt(durationMatch[1], 10);
    if (days > 0 && days <= 14) {
      state.durationDays = days;
      extracted.durationDays = days;
    }
  } else if (text.includes("weekend")) {
    state.durationDays = 2;
    extracted.durationDays = 2;
  }

  // 3. Traveler Count Extraction (e.g. "4 log", "4-person", "4 people", "hum 4 dost", "family of 5")
  const travelerMatch = text.match(/(\d+)[\s-]*(log|people|persons?|dost|friends?|travelers?|travellers?|pax|members?)/i);
  if (travelerMatch && travelerMatch[1]) {
    const count = parseInt(travelerMatch[1], 10);
    if (count > 0 && count <= 50) {
      state.travelerCount = count;
      extracted.travelerCount = count;
    }
  } else if (text.includes("couple") || text.includes("dono")) {
    state.travelerCount = 2;
    extracted.travelerCount = 2;
  } else if (text.includes("solo") || text.includes("akela") || text.includes("myself")) {
    state.travelerCount = 1;
    state.travelType = "solo";
    extracted.travelerCount = 1;
    extracted.travelType = "solo";
  }

  // 4. Travel Type Extraction
  if (text.includes("corporate") || text.includes("office") || text.includes("company") || text.includes("team")) {
    state.travelType = "corporate";
    extracted.travelType = "corporate";
  } else if (text.includes("family") || text.includes("parivar") || text.includes("parents") || text.includes("kids")) {
    state.travelType = "family";
    extracted.travelType = "family";
  } else if (text.includes("dost") || text.includes("friends")) {
    state.travelType = "family";
  }

  // 5. Hotel Preference Extraction
  if (text.includes("shahpura") || (text.includes("heritage") && (text.includes("haveli") || text.includes("hotel")))) {
    state.selectedHotelId = "hotel_shahpura_haveli";
    state.selectedHotelName = "Shahpura Haveli";
    extracted.hotel = "Shahpura Haveli";
  } else if (text.includes("alsisar")) {
    state.selectedHotelId = "hotel_alsisar_haveli";
    state.selectedHotelName = "Alsisar Haveli";
    extracted.hotel = "Alsisar Haveli";
  } else if (text.includes("diggi")) {
    state.selectedHotelId = "hotel_diggi_palace";
    state.selectedHotelName = "Diggi Palace Heritage Hotel";
    extracted.hotel = "Diggi Palace Heritage Hotel";
  } else if (text.includes("boutique") || text.includes("budget hotel")) {
    state.selectedHotelId = "hotel_boutique_jaipur";
    state.selectedHotelName = "Boutique Heritage Suites";
    extracted.hotel = "Boutique Heritage Suites";
  }

  // 6. Vehicle Preference Extraction
  if (text.includes("innova") || text.includes("suv") || text.includes("crysta")) {
    state.selectedVehicleId = "veh_innova_crysta";
    state.selectedVehicleName = "Toyota Innova Crysta";
    extracted.vehicle = "Toyota Innova Crysta";
  } else if (text.includes("dzire") || text.includes("sedan") || text.includes("swift")) {
    state.selectedVehicleId = "veh_swift_dzire";
    state.selectedVehicleName = "Maruti Suzuki Dzire";
    extracted.vehicle = "Maruti Suzuki Dzire";
  } else if (text.includes("tempo") || text.includes("traveller") || (state.travelerCount && state.travelerCount > 7)) {
    state.selectedVehicleId = "veh_tempo_traveller";
    state.selectedVehicleName = "Force Tempo Traveller (12 Seater)";
    extracted.vehicle = "Force Tempo Traveller (12 Seater)";
  } else if (text.includes("bike") || text.includes("enfield") || text.includes("bullet")) {
    state.selectedVehicleId = "veh_re_classic";
    state.selectedVehicleName = "Royal Enfield Classic 350";
    extracted.vehicle = "Royal Enfield Classic 350";
  } else if (text.includes("cab") || text.includes("gaadi") || text.includes("car")) {
    if (!state.selectedVehicleId) {
      if ((state.travelerCount || 1) <= 4) {
        state.selectedVehicleId = "veh_swift_dzire";
        state.selectedVehicleName = "Maruti Suzuki Dzire";
      } else {
        state.selectedVehicleId = "veh_innova_crysta";
        state.selectedVehicleName = "Toyota Innova Crysta";
      }
      extracted.vehicle = state.selectedVehicleName;
    }
  }

  // 7. Highway Stops Extraction
  if (text.includes("neemrana")) {
    if (!state.selectedStopIds.includes("stop_neemrana")) {
      state.selectedStopIds.push("stop_neemrana");
    }
  }
  if (text.includes("rao") || text.includes("dhaba")) {
    if (!state.selectedStopIds.includes("stop_rao_dhaba")) {
      state.selectedStopIds.push("stop_rao_dhaba");
    }
  }
  if (text.includes("stepwell") || text.includes("chand baori")) {
    if (!state.selectedStopIds.includes("stop_stepwell")) {
      state.selectedStopIds.push("stop_stepwell");
    }
  }

  // 8. Checkout Intent Extraction
  const checkoutPhrases = [
    "checkout", "payment", "book it", "confirm", "lock kar do", "pay", "kar do book",
    "le chalo", "done", "theek hai book karo", "ticket bana do", "qr code"
  ];
  if (checkoutPhrases.some((phrase) => text.includes(phrase))) {
    extracted.wantsCheckout = true;
  }

  // Calculate Running Estimate
  const days = state.durationDays || 3;
  const travelers = state.travelerCount || 2;
  const hotelPricePerNight = state.selectedHotelName?.includes("Alsisar")
    ? 5800
    : state.selectedHotelName?.includes("Diggi")
    ? 4900
    : 4200;
  const vehiclePricePerDay = state.selectedVehicleName?.includes("Innova")
    ? 3500
    : state.selectedVehicleName?.includes("Tempo")
    ? 5500
    : state.selectedVehicleName?.includes("Bike")
    ? 1200
    : 2500;
  const rooms = Math.max(1, Math.ceil(travelers / 2));
  state.totalEstimatedPrice = (hotelPricePerNight * days * rooms) + (vehiclePricePerDay * days);

  // Determine Next Stage and Next Question
  let nextQuestion = "";

  if (extracted.wantsCheckout && state.destinationName && state.selectedHotelName && state.selectedVehicleName) {
    state.currentStage = "ready_for_checkout";
    nextQuestion = state.languageMode === "en"
      ? `Everything is locked! Package total is ₹${state.totalEstimatedPrice.toLocaleString("en-IN")}. Shall I open the UPI checkout page for you now?`
      : `Done! Sab kuch lock ho gaya hai. Total package ₹${state.totalEstimatedPrice.toLocaleString("en-IN")} ban raha hai. Kya main aapko UPI checkout page par le chalun?`;
  } else if (!state.destinationName || !state.durationDays || !state.travelerCount) {
    state.currentStage = "choosing_destination";
    if (!state.destinationName) {
      nextQuestion = state.languageMode === "en"
        ? "Which destination in India are you planning to visit, and for how many days?"
        : "Aap agli chhuttiyon mein kahan ghumna chahte hain, aur kitne din ka plan hai?";
    } else if (!state.durationDays) {
      nextQuestion = state.languageMode === "en"
        ? `Great choice visiting ${state.destinationName}! How many days are you planning for this trip?`
        : `${state.destinationName} bohot sundar jagah hai! Aap kitne din ka trip plan kar rahe hain?`;
    } else {
      nextQuestion = state.languageMode === "en"
        ? `Got it, ${state.durationDays} days in ${state.destinationName}. How many travelers will be going?`
        : `${state.destinationName} ke 3 din ke trip mein kitne log travel karenge?`;
    }
  } else if (!state.selectedHotelName) {
    state.currentStage = "choosing_hotel";
    nextQuestion = state.languageMode === "en"
      ? `For ${state.travelerCount} travelers in ${state.destinationName}, would you prefer heritage stay like Shahpura Haveli (₹4,200/night) or Alsisar Haveli?`
      : `${state.destinationName} mein stay ke liye Shahpura Haveli (₹4,200/night) pasand karenge ya Alsisar Haveli?`;
  } else if (!state.selectedVehicleName) {
    state.currentStage = "choosing_vehicle";
    nextQuestion = state.languageMode === "en"
      ? `Got your stay at ${state.selectedHotelName}. For your cab, shall I book a Swift Dzire (₹2,500/day) or an Innova Crysta?`
      : `${state.selectedHotelName} select ho gaya hai. Gaadi mein Swift Dzire (₹2,500/day) chalegi ya Innova Crysta kar doon?`;
  } else {
    state.currentStage = "ready_for_checkout";
    nextQuestion = state.languageMode === "en"
      ? `Your package with ${state.selectedHotelName} and ${state.selectedVehicleName} is ₹${state.totalEstimatedPrice.toLocaleString("en-IN")}. Shall I proceed to checkout?`
      : `${state.selectedHotelName} aur ${state.selectedVehicleName} dono set hain. Total ₹${state.totalEstimatedPrice.toLocaleString("en-IN")} hai. Kya main checkout khol doon?`;
  }

  return {
    updatedState: state,
    extractedSlots: extracted,
    nextQuestion,
  };
}
