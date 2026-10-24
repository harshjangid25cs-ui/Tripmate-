import { NextRequest, NextResponse } from "next/server";
import {
  transcribeSpeechWithPrisma,
  generateVoiceWithTimbre,
  type SupportedLanguage,
} from "@/lib/ai/gnani-client";
import {
  evaluateTravelAgentTurn,
  createInitialSessionState,
  type VoiceBookingSessionState,
} from "@/lib/ai/travel-agent-state";
import { upsertVoiceDraftTrip } from "@/lib/ai/agent-tools";
import { generateConciseAgentReply } from "@/lib/ai/agent-persona";
import { routeEvonIntent } from "@/lib/ai/evon-router";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    let transcript = "";
    let currentPath = "";
    let tripId = "";
    let language: SupportedLanguage = "code-mixed";
    let rawSessionState: VoiceBookingSessionState | null = null;

    const contentType = req.headers.get("content-type") || "";

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const audioFile = formData.get("audio");
      const textParam = formData.get("textOverride") || formData.get("text");
      const pathParam = formData.get("currentPath");
      const tripIdParam = formData.get("tripId");
      const langParam = formData.get("language");
      const sessionParam = formData.get("sessionState");

      if (typeof pathParam === "string") currentPath = pathParam;
      if (typeof tripIdParam === "string") tripId = tripIdParam;
      if (
        typeof langParam === "string" &&
        (langParam === "hi-IN" || langParam === "en-IN" || langParam === "code-mixed")
      ) {
        language = langParam;
      }
      if (typeof sessionParam === "string") {
        try {
          rawSessionState = JSON.parse(sessionParam);
        } catch {
          rawSessionState = null;
        }
      }

      // Step 1: Speech-to-Text via Gnani Prisma (or direct text prompt)
      if (
        audioFile &&
        typeof audioFile !== "string" &&
        "arrayBuffer" in audioFile &&
        audioFile.size > 0
      ) {
        transcript = await transcribeSpeechWithPrisma(audioFile, language);
      } else if (typeof textParam === "string" && textParam.trim().length > 0) {
        transcript = textParam.trim();
      } else {
        transcript = "Jaipur se Shahpura Haveli ke liye gaadi dikhao";
      }
    } else {
      // JSON payload support
      const body = await req.json().catch(() => ({}));
      transcript = body.textOverride || body.text || body.transcript || "3-day Jaipur circuit";
      currentPath = body.currentPath || "";
      tripId = body.tripId || "";
      if (body.language) language = body.language;
      if (body.sessionState) rawSessionState = body.sessionState;
    }

    // Initialize or adopt incoming session state
    const currentSession = rawSessionState || createInitialSessionState();
    if (tripId && !currentSession.tripId) {
      currentSession.tripId = tripId;
    }

    // Step 2: Stateful Conversational Turn & Slot Extraction
    const { updatedState, extractedSlots, nextQuestion } = evaluateTravelAgentTurn(
      transcript,
      currentSession
    );

    // Live Database Tool Execution: Upsert Draft Trip
    const dbResult = await upsertVoiceDraftTrip(updatedState);
    updatedState.tripId = dbResult.tripId;
    updatedState.totalEstimatedPrice = dbResult.totalAmount;

    // Generate Natural Persona Speech
    const replyText = generateConciseAgentReply(updatedState, extractedSlots, nextQuestion);

    // Backwards-compatible evon fallback action
    const evonFallback = await routeEvonIntent(transcript, {
      currentPath,
      tripId: updatedState.tripId,
      preferredLanguage: language,
    });

    // Step 3: Text-to-Speech via Gnani Timbre
    const audioBuffer = await generateVoiceWithTimbre(replyText);
    const audioBase64 = Buffer.from(audioBuffer).toString("base64");

    const isReadyForCheckout = updatedState.currentStage === "ready_for_checkout";
    const mascotState = isReadyForCheckout ? "success" : "guiding";

    // Step 4: Structured Return Payload
    return NextResponse.json({
      transcript,
      replyText,
      audioBase64,
      mascotState,
      updatedSessionState: updatedState,
      liveTripSummary: {
        tripId: updatedState.tripId,
        destination: updatedState.destinationName || "Jaipur Heritage Circuit",
        days: updatedState.durationDays || 3,
        travelers: updatedState.travelerCount || 2,
        hotel: updatedState.selectedHotelName || "Shahpura Haveli (₹4,200/night)",
        vehicle: updatedState.selectedVehicleName || "Toyota Innova (₹3,500/day)",
        totalPrice: updatedState.totalEstimatedPrice || dbResult.totalAmount,
      },
      uiAction: {
        type: "SYNC_AND_NAVIGATE",
        targetUrl: dbResult.targetUrl,
        autoNavigate: isReadyForCheckout,
        ctaLabel: isReadyForCheckout
          ? `Proceed to Checkout (₹${updatedState.totalEstimatedPrice?.toLocaleString("en-IN")}) →`
          : `View ${updatedState.destinationName || "Trip"} Details →`,
      },
      action: evonFallback.action || {
        type: "NAVIGATE_OR_FILTER",
        targetUrl: dbResult.targetUrl,
        label: isReadyForCheckout ? "Proceed to Checkout" : "View Trip Details",
      },
    });
  } catch (error) {
    console.error("[api/ai/voice] Handler error:", error);
    return NextResponse.json(
      {
        transcript: "Koi sawaal poochiye",
        replyText: "Maaf kijiye, main abhi connect nahi kar paya. Kripya dobara koshish karein.",
        audioBase64: "",
      },
      { status: 500 }
    );
  }
}
