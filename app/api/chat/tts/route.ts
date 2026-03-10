import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth";
import { getUserTier } from "@/lib/auth/require-tier";

const ELEVENLABS_API_URL = "https://api.elevenlabs.io/v1/text-to-speech";
const DEFAULT_VOICE_ID = "pNInz6obpgDQGcFmaJgB"; // Adam - deep male voice
const MODEL_ID = "eleven_turbo_v2_5";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.name) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Tier gate: operator (2) or institution (3) only
    const tierInfo = await getUserTier();
    if (tierInfo.tierLevel < 2) {
      return NextResponse.json(
        { error: "Voice mode requires Operator tier or above" },
        { status: 403 }
      );
    }

    const apiKey = process.env.ELEVENLABS_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "ElevenLabs API key not configured" },
        { status: 500 }
      );
    }

    const { text, voiceId } = await req.json();
    if (!text || typeof text !== "string" || text.length > 5000) {
      return NextResponse.json(
        { error: "Text required (max 5000 chars)" },
        { status: 400 }
      );
    }

    const voice = voiceId || DEFAULT_VOICE_ID;

    const response = await fetch(`${ELEVENLABS_API_URL}/${voice}/stream`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "xi-api-key": apiKey,
      },
      body: JSON.stringify({
        text,
        model_id: MODEL_ID,
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
          style: 0.0,
          use_speaker_boost: true,
        },
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error("[TTS] ElevenLabs error:", response.status, err);
      return NextResponse.json(
        { error: "TTS generation failed" },
        { status: 502 }
      );
    }

    // Stream audio back to client
    return new Response(response.body, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "no-cache",
      },
    });
  } catch (err) {
    console.error("[TTS] Error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
