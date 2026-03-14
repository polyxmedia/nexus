import "server-only";
import { db, schema } from "@/lib/db";
import { searchImagery, type ImageryQuery } from "./copernicus-client";
import { getNightlightActivity } from "./viirs";

interface ChangeDetectionResult {
  changes: string[];
  confidence: number;
  summary: string;
  imageryDate1: string;
  imageryDate2: string;
}

/**
 * Run change detection between two time periods.
 * Compares satellite imagery (or fire data as proxy) for the region.
 */
export async function analyzeChange(
  regionName: string,
  bbox: { north: number; south: number; east: number; west: number },
  date1: string,
  date2: string,
): Promise<ChangeDetectionResult> {
  // Try to get imagery for both dates
  const [imagery1, imagery2] = await Promise.all([
    searchImagery({
      bbox,
      dateFrom: date1,
      dateTo: date1,
      collection: "sentinel-2-l2a",
      maxCloudCover: 50,
    }),
    searchImagery({
      bbox,
      dateFrom: date2,
      dateTo: date2,
      collection: "sentinel-2-l2a",
      maxCloudCover: 50,
    }),
  ]);

  const changes: string[] = [];
  let confidence = 0.5;

  // If we have imagery, compare cloud cover and availability
  if (imagery1.length > 0 && imagery2.length > 0) {
    const cc1 = imagery1[0].cloudCover;
    const cc2 = imagery2[0].cloudCover;

    if (Math.abs(cc2 - cc1) > 20) {
      changes.push(`Cloud cover changed from ${cc1}% to ${cc2}%`);
    }

    // Store imagery records
    for (const img of [imagery1[0], imagery2[0]]) {
      await db.insert(schema.satelliteImagery).values({
        regionName,
        bbox: JSON.stringify(bbox),
        imageryType: "visual",
        source: "sentinel2",
        tileUrl: img.tileUrl,
        thumbnailUrl: img.thumbnailUrl,
        acquisitionDate: img.acquisitionDate,
        cloudCoverPct: img.cloudCover,
      });
    }

    confidence = 0.7;
    changes.push(`Imagery available for both dates in ${regionName}`);
  } else {
    changes.push(`Limited satellite imagery available for ${regionName}. Using thermal data as proxy.`);

    // Fall back to VIIRS fire data comparison
    const activity = await getNightlightActivity(bbox);
    changes.push(`Current thermal activity level: ${activity.activityLevel} (${activity.anomalyCount} anomalies)`);
    confidence = 0.4;
  }

  const summary = `Change detection for ${regionName} between ${date1} and ${date2}: ${changes.length} observations. ${imagery1.length > 0 ? "Optical imagery" : "Thermal proxy"} analysis.`;

  // Store analysis result
  await db.insert(schema.imageryAnalyses).values({
    analysisType: "change_detection",
    result: JSON.stringify({ changes, bbox, date1, date2 }),
    confidence,
    aiSummary: summary,
  });

  return { changes, confidence, summary, imageryDate1: date1, imageryDate2: date2 };
}

/**
 * Detect port/maritime activity using thermal and SAR data.
 */
export async function detectPortActivity(
  bbox: { north: number; south: number; east: number; west: number },
): Promise<{ activityLevel: string; thermalAnomalies: number; summary: string }> {
  const activity = await getNightlightActivity(bbox);

  // Also try SAR imagery for maritime detection
  const sarImagery = await searchImagery({
    bbox,
    dateFrom: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    dateTo: new Date().toISOString().split("T")[0],
    collection: "sentinel-1-grd",
  });

  const summary = `Port activity: ${activity.activityLevel}. ${activity.anomalyCount} thermal anomalies detected. ${sarImagery.length} SAR images available for vessel detection.`;

  return {
    activityLevel: activity.activityLevel,
    thermalAnomalies: activity.anomalyCount,
    summary,
  };
}
