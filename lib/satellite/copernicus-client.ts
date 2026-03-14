import "server-only";

interface CopernicusAuth {
  accessToken: string;
  expiresAt: number;
}

export interface ImageryQuery {
  bbox: { north: number; south: number; east: number; west: number };
  dateFrom: string;
  dateTo: string;
  collection: "sentinel-2-l2a" | "sentinel-1-grd";
  maxCloudCover?: number;
}

export interface ImageryResult {
  id: string;
  title: string;
  acquisitionDate: string;
  cloudCover: number;
  thumbnailUrl: string;
  tileUrl: string;
  footprint: unknown;
}

let cachedAuth: CopernicusAuth | null = null;

async function authenticate(): Promise<CopernicusAuth | null> {
  if (cachedAuth && cachedAuth.expiresAt > Date.now()) return cachedAuth;

  const clientId = process.env.COPERNICUS_CLIENT_ID;
  const clientSecret = process.env.COPERNICUS_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;

  try {
    const response = await fetch(
      "https://identity.dataspace.copernicus.eu/auth/realms/CDSE/protocol/openid-connect/token",
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "client_credentials",
          client_id: clientId,
          client_secret: clientSecret,
        }),
      }
    );

    if (!response.ok) return null;

    const data = await response.json();
    cachedAuth = {
      accessToken: data.access_token,
      expiresAt: Date.now() + (data.expires_in - 60) * 1000,
    };
    return cachedAuth;
  } catch {
    return null;
  }
}

export async function searchImagery(query: ImageryQuery): Promise<ImageryResult[]> {
  const auth = await authenticate();
  if (!auth) return [];

  const { bbox, dateFrom, dateTo, collection, maxCloudCover } = query;

  try {
    const body = {
      collections: [collection],
      bbox: [bbox.west, bbox.south, bbox.east, bbox.north],
      datetime: `${dateFrom}T00:00:00Z/${dateTo}T23:59:59Z`,
      limit: 10,
      filter: maxCloudCover !== undefined && collection === "sentinel-2-l2a"
        ? { op: "<=", args: [{ property: "eo:cloud_cover" }, maxCloudCover] }
        : undefined,
    };

    const response = await fetch("https://catalogue.dataspace.copernicus.eu/stac/search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${auth.accessToken}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) return [];

    const data = await response.json();
    return (data.features || []).map((f: any) => ({
      id: f.id,
      title: f.properties?.title || f.id,
      acquisitionDate: f.properties?.datetime || "",
      cloudCover: f.properties?.["eo:cloud_cover"] || 0,
      thumbnailUrl: f.assets?.thumbnail?.href || "",
      tileUrl: getTileUrl(f.id, collection),
      footprint: f.geometry,
    }));
  } catch {
    return [];
  }
}

function getTileUrl(productId: string, collection: string): string {
  const layer = collection === "sentinel-2-l2a" ? "TRUE-COLOR-S2L2A" : "SAR-URBAN";
  return `https://sh.dataspace.copernicus.eu/ogc/wms?service=WMS&request=GetMap&layers=${layer}&format=image/png&transparent=true&width=512&height=512`;
}

export async function getRecentImagery(
  regionName: string,
  bbox: { north: number; south: number; east: number; west: number },
  days = 30,
): Promise<ImageryResult[]> {
  const dateTo = new Date().toISOString().split("T")[0];
  const dateFrom = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

  const results = await searchImagery({
    bbox,
    dateFrom,
    dateTo,
    collection: "sentinel-2-l2a",
    maxCloudCover: 30,
  });

  return results.sort((a, b) => a.cloudCover - b.cloudCover);
}
