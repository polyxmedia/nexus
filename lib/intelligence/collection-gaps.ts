// Intelligence Collection Gaps Tracker
// Monitors coverage across critical regions/topics and detects
// when information flow stops (intelligence silence is meaningful)

import { db, schema } from "@/lib/db";
import { eq, and, like, desc, gte } from "drizzle-orm";

interface CoverageArea {
  region: string;
  tags: string[];
  minArticlesPerDay: number;
  criticality: "critical" | "high" | "medium";
}

const REQUIRED_COVERAGE: CoverageArea[] = [
  { region: "Taiwan Strait", tags: ["taiwan", "china", "semiconductor"], minArticlesPerDay: 3, criticality: "critical" },
  { region: "Ukraine-Russia", tags: ["ukraine", "russia", "conflict"], minArticlesPerDay: 5, criticality: "critical" },
  { region: "Middle East", tags: ["israel", "iran", "houthi", "hezbollah"], minArticlesPerDay: 5, criticality: "critical" },
  { region: "Strait of Hormuz", tags: ["hormuz", "iran", "oil", "shipping"], minArticlesPerDay: 2, criticality: "high" },
  { region: "Red Sea", tags: ["red-sea", "houthis", "shipping"], minArticlesPerDay: 2, criticality: "high" },
  { region: "Korean Peninsula", tags: ["north-korea", "nuclear", "missile"], minArticlesPerDay: 1, criticality: "high" },
  { region: "South China Sea", tags: ["south-china-sea", "philippines", "spratlys"], minArticlesPerDay: 1, criticality: "high" },
  { region: "US Monetary Policy", tags: ["fed", "rates", "monetary-policy"], minArticlesPerDay: 3, criticality: "critical" },
  { region: "OPEC+ Energy", tags: ["opec", "oil", "energy"], minArticlesPerDay: 2, criticality: "high" },
  { region: "China Economy", tags: ["china", "economy", "trade"], minArticlesPerDay: 3, criticality: "high" },
  { region: "European Security", tags: ["nato", "europe", "defense"], minArticlesPerDay: 2, criticality: "medium" },
  { region: "Cyber Threats", tags: ["cyber", "hack", "infrastructure"], minArticlesPerDay: 1, criticality: "medium" },
  { region: "Africa Sahel", tags: ["sahel", "coup", "wagner", "mali", "niger"], minArticlesPerDay: 1, criticality: "medium" },
  { region: "Sudan", tags: ["sudan", "rsf", "darfur"], minArticlesPerDay: 1, criticality: "medium" },
  { region: "Global Food Security", tags: ["food", "grain", "fertilizer", "famine"], minArticlesPerDay: 1, criticality: "medium" },
  { region: "Semiconductor Supply", tags: ["semiconductor", "chip", "asml", "tsmc"], minArticlesPerDay: 1, criticality: "high" },
];

export interface CoverageAreaStatus {
  region: string;
  criticality: string;
  knowledgeEntries: number;
  knowledgeFreshness: "current" | "stale" | "expired" | "none";
  lastKnowledgeUpdate: string | null;
  gapDetected: boolean;
  silenceDetected: boolean;
  status: "covered" | "thin" | "gap" | "blind-spot";
}

export interface CoverageReport {
  timestamp: string;
  overallScore: number;
  areas: CoverageAreaStatus[];
  gaps: string[];
  silences: string[];
  collectionPriorities: Array<{
    region: string;
    priority: 1 | 2 | 3 | 4;
    reason: string;
    suggestedAction: string;
  }>;
}

async function getKnowledgeForArea(area: CoverageArea): Promise<{
  entries: Array<{ title: string; updatedAt: string | null; validUntil: string | null; status: string | null }>;
}> {
  try {
    // Search knowledge entries matching any of the area's tags
    const allEntries = await db
      .select()
      .from(schema.knowledge)
      .where(eq(schema.knowledge.status, "active"))
      .orderBy(desc(schema.knowledge.updatedAt))
      .limit(100);

    const matching = allEntries.filter((entry: { tags: string | null; title: string; content: string | null }) => {
      const tags = entry.tags ? entry.tags.toLowerCase() : "";
      const title = entry.title.toLowerCase();
      const content = (entry.content || "").toLowerCase();

      return area.tags.some(tag =>
        tags.includes(tag) || title.includes(tag) || content.includes(tag)
      );
    });

    return {
      entries: matching.map((e: { title: string; updatedAt: string | null; validUntil: string | null; status: string | null }) => ({
        title: e.title,
        updatedAt: e.updatedAt,
        validUntil: e.validUntil,
        status: e.status,
      })),
    };
  } catch {
    return { entries: [] };
  }
}

function assessFreshness(entries: Array<{ updatedAt: string | null; validUntil: string | null }>): "current" | "stale" | "expired" | "none" {
  if (entries.length === 0) return "none";

  const now = Date.now();
  const twoHoursAgo = now - 2 * 60 * 60_000;
  const sixHoursAgo = now - 6 * 60 * 60_000;
  const twentyFourHoursAgo = now - 24 * 60 * 60_000;

  // Check most recent entry
  const mostRecent = entries[0];
  const updatedAt = mostRecent.updatedAt ? new Date(mostRecent.updatedAt).getTime() : 0;

  if (updatedAt > twoHoursAgo) return "current";
  if (updatedAt > sixHoursAgo) return "stale";
  if (updatedAt > twentyFourHoursAgo) return "stale";
  return "expired";
}

export async function assessCoverage(): Promise<CoverageReport> {
  const areas: CoverageAreaStatus[] = [];
  const gaps: string[] = [];
  const silences: string[] = [];
  const priorities: CoverageReport["collectionPriorities"] = [];

  // Load previous coverage to detect silence
  let previousCoverage: CoverageReport | null = null;
  try {
    const prevRows = await db
      .select()
      .from(schema.settings)
      .where(eq(schema.settings.key, "coverage:previous"))
      .limit(1);
    if (prevRows.length > 0 && prevRows[0].value) {
      previousCoverage = JSON.parse(prevRows[0].value);
    }
  } catch {}

  for (const area of REQUIRED_COVERAGE) {
    const knowledge = await getKnowledgeForArea(area);
    const freshness = assessFreshness(knowledge.entries);

    const lastUpdate = knowledge.entries.length > 0 ? knowledge.entries[0].updatedAt : null;

    // Detect silence: area was previously covered but now has no fresh data
    const prevArea = previousCoverage?.areas.find(a => a.region === area.region);
    const wasCovered = prevArea && (prevArea.status === "covered" || prevArea.status === "thin");
    const nowEmpty = freshness === "expired" || freshness === "none";
    const silenceDetected = wasCovered === true && nowEmpty;

    let gapDetected = false;
    let status: CoverageAreaStatus["status"];

    if (freshness === "none") {
      status = "blind-spot";
      gapDetected = true;
    } else if (freshness === "expired") {
      status = "gap";
      gapDetected = true;
    } else if (freshness === "stale" || knowledge.entries.length < 2) {
      status = "thin";
    } else {
      status = "covered";
    }

    if (gapDetected) gaps.push(area.region);
    if (silenceDetected) silences.push(area.region);

    areas.push({
      region: area.region,
      criticality: area.criticality,
      knowledgeEntries: knowledge.entries.length,
      knowledgeFreshness: freshness,
      lastKnowledgeUpdate: lastUpdate,
      gapDetected,
      silenceDetected,
      status,
    });

    // Generate collection priorities
    if (status === "blind-spot" && area.criticality === "critical") {
      priorities.push({
        region: area.region,
        priority: 1,
        reason: `No intelligence coverage for critical region`,
        suggestedAction: `Immediately ingest knowledge and monitor GDELT for ${area.tags.join(", ")}`,
      });
    } else if (status === "gap" && area.criticality !== "medium") {
      priorities.push({
        region: area.region,
        priority: 2,
        reason: `Intelligence has expired. Last update: ${lastUpdate || "unknown"}`,
        suggestedAction: `Refresh knowledge entries for ${area.region}`,
      });
    } else if (silenceDetected) {
      priorities.push({
        region: area.region,
        priority: 2,
        reason: `Intelligence silence detected. Previously covered area went dark`,
        suggestedAction: `Investigate why ${area.region} coverage stopped. Silence may indicate censorship or developing situation`,
      });
    } else if (status === "thin") {
      priorities.push({
        region: area.region,
        priority: 3,
        reason: `Thin coverage. Only ${knowledge.entries.length} entries, freshness: ${freshness}`,
        suggestedAction: `Expand source diversity for ${area.region}`,
      });
    }
  }

  // Overall score
  const coveredCount = areas.filter(a => a.status === "covered").length;
  const overallScore = Math.round((coveredCount / areas.length) * 100);

  priorities.sort((a, b) => a.priority - b.priority);

  const report: CoverageReport = {
    timestamp: new Date().toISOString(),
    overallScore,
    areas,
    gaps,
    silences,
    collectionPriorities: priorities,
  };

  // Save as previous for next comparison
  try {
    const now = new Date().toISOString();
    const key = "coverage:previous";
    const existing = await db.select().from(schema.settings).where(eq(schema.settings.key, key)).limit(1);
    if (existing.length > 0) {
      await db.update(schema.settings).set({ value: JSON.stringify(report), updatedAt: now }).where(eq(schema.settings.key, key));
    } else {
      await db.insert(schema.settings).values({ key, value: JSON.stringify(report), updatedAt: now });
    }
  } catch {}

  return report;
}
