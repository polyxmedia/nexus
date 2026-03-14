import { NextResponse } from "next/server";
import { requireTier } from "@/lib/auth/require-tier";
import { getRecentImagery } from "@/lib/satellite/copernicus-client";
import { getNightlightActivity } from "@/lib/satellite/viirs";

export async function GET(request: Request) {
  const check = await requireTier("operator");
  if ("response" in check) return check.response;

  const url = new URL(request.url);
  const regionName = url.searchParams.get("regionName") || "Unknown";
  const north = parseFloat(url.searchParams.get("north") || "0");
  const south = parseFloat(url.searchParams.get("south") || "0");
  const east = parseFloat(url.searchParams.get("east") || "0");
  const west = parseFloat(url.searchParams.get("west") || "0");
  const days = parseInt(url.searchParams.get("days") || "30");

  const bbox = { north, south, east, west };

  try {
    const [imagery, activity] = await Promise.all([
      getRecentImagery(regionName, bbox, days),
      getNightlightActivity(bbox),
    ]);

    return NextResponse.json({ regionName, imagery, thermalActivity: activity });
  } catch (err) {
    return NextResponse.json({ error: "Failed to fetch imagery" }, { status: 500 });
  }
}
