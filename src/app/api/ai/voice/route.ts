import { NextRequest, NextResponse } from "next/server";
import {
  transcribeSpeechWithPrisma,
  generateVoiceWithTimbre,
  type SupportedLanguage,
} from "@/lib/ai/gnani-client";
import { routeEvonIntent } from "@/lib/ai/evon-router";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    let transcript = "";
    let currentPath = "";
    let tripId = "";
    let language: SupportedLanguage = "code-mixed";

    const contentType = req.headers.get("content-type") || "";

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const audioFile = formData.get("audio");
      const textParam = formData.get("text");
      const pathParam = formData.get("currentPath");
      const tripIdParam = formData.get("tripId");
      const langParam = formData.get("language");

      if (typeof pathParam === "string") currentPath = pathParam;
      if (typeof tripIdParam === "string") tripId = tripIdParam;
      if (typeof langParam === "string" && (langParam === "hi-IN" || langParam === "en-IN" || langParam === "code-mixed")) {
        language = langParam;
      }

      // Step 1: Speech-to-Text via Gnani Prisma (or direct text prompt)
      if (audioFile && typeof audioFile !== "string" && "arrayBuffer" in audioFile && audioFile.size > 0) {
        transcript = await transcribeSpeechWithPrisma(audioFile, language);
      } else if (typeof textParam === "string" && textParam.trim().length > 0) {
        transcript = textParam.trim();
      } else {
        // Fallback default prompt
        transcript = "Jaipur se Shahpura Haveli ke liye gaadi dikhao";
      }
    } else {
      // JSON payload support
      const body = await req.json().catch(() => ({}));
      transcript = body.text || body.transcript || "3-day Jaipur circuit";
      currentPath = body.currentPath || "";
      tripId = body.tripId || "";
      if (body.language) language = body.language;
    }

    // Step 2: Evon (30B Reasoning Model / TripMate Router) Intent Matching & DB Queries
    const evonResult = await routeEvonIntent(transcript, {
      currentPath,
      tripId,
      preferredLanguage: language,
    });

    // Step 3: Text-to-Speech via Gnani Timbre
    const audioBuffer = await generateVoiceWithTimbre(evonResult.replyText);
    const audioBase64 = Buffer.from(audioBuffer).toString("base64");

    // Step 4: Structured Return Payload
    return NextResponse.json({
      transcript: evonResult.transcript,
      replyText: evonResult.replyText,
      audioBase64,
      action: evonResult.action,
    });
  } catch (error) {
    console.error("[api/ai/voice] Handler error:", error);
    return NextResponse.json(
      {
        transcript: "Koi sawaal poochiye",
        replyText: "Maaf kijiye, main abhi sun nahi paya. Kripya punah koshish karein.",
        audioBase64: "",
      },
      { status: 500 }
    );
  }
}
