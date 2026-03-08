import { NextResponse } from "next/server";
import { requireTier } from "@/lib/auth/require-tier";

interface AircraftMeta {
  icao24: string;
  registration: string | null;
  manufacturer: string | null;
  model: string | null;
  typecode: string | null;
  operator: string | null;
  owner: string | null;
  built: string | null;
  categoryDescription: string | null;
  imageUrl: string | null;
  imageSource: string | null;
}

interface TrackPoint {
  time: number;
  lat: number;
  lng: number;
  altitude: number;
  heading: number;
  onGround: boolean;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ icao24: string }> }
) {
  const tierCheck = await requireTier("operator");
  if ("response" in tierCheck) return tierCheck.response;
  const { icao24 } = await params;

  const [meta, track] = await Promise.all([
    fetchAircraftMeta(icao24),
    fetchFlightTrack(icao24),
  ]);

  return NextResponse.json({ meta, track });
}

async function fetchAircraftMeta(icao24: string): Promise<AircraftMeta> {
  const result: AircraftMeta = {
    icao24,
    registration: null,
    manufacturer: null,
    model: null,
    typecode: null,
    operator: null,
    owner: null,
    built: null,
    categoryDescription: null,
    imageUrl: null,
    imageSource: null,
  };

  // 1. OpenSky aircraft metadata database
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(
      `https://opensky-network.org/api/metadata/aircraft/icao/${icao24}`,
      { signal: controller.signal }
    );
    clearTimeout(timeout);

    if (res.ok) {
      const data = await res.json();
      result.registration = data.registration || null;
      result.manufacturer = data.manufacturerName || null;
      result.model = data.model || null;
      result.typecode = data.typecode || null;
      result.operator = data.operatorCallsign || data.owner || null;
      result.owner = data.owner || null;
      result.built = data.built || null;
      result.categoryDescription = data.categoryDescription || null;
    }
  } catch {
    // OpenSky metadata unavailable
  }

  // 2. Planespotters.net photo API (free, no key needed)
  const reg = result.registration;
  if (reg) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);
      const res = await fetch(
        `https://api.planespotters.net/pub/photos/reg/${encodeURIComponent(reg)}`,
        { signal: controller.signal }
      );
      clearTimeout(timeout);

      if (res.ok) {
        const data = await res.json();
        if (data.photos && data.photos.length > 0) {
          const photo = data.photos;
          result.imageUrl = photo.thumbnail_large?.src || photo.thumbnail?.src || null;
          result.imageSource = photo.photographer || "Planespotters.net";
        }
      }
    } catch {
      // Photo unavailable
    }
  }

  // 3. Fallback: try hex.aero photo lookup by ICAO24
  if (!result.imageUrl) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);
      const res = await fetch(
        `https://api.planespotters.net/pub/photos/hex/${icao24}`,
        { signal: controller.signal }
      );
      clearTimeout(timeout);

      if (res.ok) {
        const data = await res.json();
        if (data.photos && data.photos.length > 0) {
          const photo = data.photos;
          result.imageUrl = photo.thumbnail_large?.src || photo.thumbnail?.src || null;
          result.imageSource = photo.photographer || "Planespotters.net";
        }
      }
    } catch {
      // Photo unavailable
    }
  }

  return result;
}

async function fetchFlightTrack(icao24: string): Promise<TrackPoint[]> {
  try {
    // OpenSky tracks endpoint - last known track
    const now = Math.floor(Date.now() / 1000);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const res = await fetch(
      `https://opensky-network.org/api/tracks/all?icao24=${icao24}&time=0`,
      { signal: controller.signal }
    );
    clearTimeout(timeout);

    if (!res.ok) return [];

    const data = await res.json();
    const path: unknown[][] = data.path || [];

    return path.map((p) => ({
      time: (p[0] as number) || 0,
      lat: (p[1] as number) || 0,
      lng: (p[2] as number) || 0,
      altitude: (p[3] as number) || 0,
      heading: (p[4] as number) || 0,
      onGround: (p[5] as boolean) || false,
    }));
  } catch {
    return [];
  }
}
