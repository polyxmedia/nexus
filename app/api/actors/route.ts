import { NextResponse } from "next/server";
import {
  getExtendedActorProfile,
  getAllExtendedProfiles,
  searchActors,
} from "@/lib/actors/profiles";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const actorId = searchParams.get("id");
    const query = searchParams.get("q");

    if (actorId) {
      const profile = await getExtendedActorProfile(actorId);
      if (!profile) {
        return NextResponse.json(
          { error: `Actor '${actorId}' not found` },
          { status: 404 }
        );
      }
      return NextResponse.json(profile);
    }

    if (query) {
      const results = searchActors(query);
      return NextResponse.json({ actors: results });
    }

    const all = await getAllExtendedProfiles();
    return NextResponse.json({ actors: all });
  } catch (error) {
    console.error("Actors API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch actor profiles" },
      { status: 500 }
    );
  }
}
