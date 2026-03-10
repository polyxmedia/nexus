import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth";
import { getUserTier } from "@/lib/auth/require-tier";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.name) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const tierInfo = await getUserTier();
    if (tierInfo.tierLevel < 2) {
      return NextResponse.json(
        { error: "Voice mode requires Operator tier or above" },
        { status: 403 }
      );
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "OpenAI API key not configured" },
        { status: 500 }
      );
    }

    const formData = await req.formData();
    const audioFile = formData.get("audio") as File | null;
    if (!audioFile) {
      return NextResponse.json({ error: "No audio file provided" }, { status: 400 });
    }

    console.log("[Transcribe] Received file:", audioFile.name, "size:", audioFile.size, "type:", audioFile.type);

    // Forward to OpenAI Whisper API
    const openaiForm = new FormData();
    // Must pass filename with extension - Whisper requires it
    const fileName = audioFile.name || "recording.webm";
    openaiForm.append("file", audioFile, fileName);
    openaiForm.append("model", "whisper-1");
    openaiForm.append("language", "en");

    const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      body: openaiForm,
    });

    if (!response.ok) {
      const err = await response.text();
      console.error("[Transcribe] OpenAI error:", response.status, err);
      return NextResponse.json(
        { error: "Transcription failed" },
        { status: 502 }
      );
    }

    const data = await response.json();
    console.log("[Transcribe] Result:", data.text?.slice(0, 100));
    return NextResponse.json({ text: data.text || "" });
  } catch (err) {
    console.error("[Transcribe] Error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
