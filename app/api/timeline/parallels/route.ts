import { NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { desc } from "drizzle-orm";
import { searchKnowledge } from "@/lib/knowledge/engine";

/**
 * Returns timeline data: current signals + knowledge bank entries with dates,
 * structured for the psycho-history timeline visualization.
 */
export async function GET() {
  try {
    const [signals, predictions, knowledge] = await Promise.all([
      db
        .select()
        .from(schema.signals)
        .orderBy(desc(schema.signals.date))
        .then((rows) => rows.slice(0, 50)),
      db
        .select()
        .from(schema.predictions)
        .orderBy(desc(schema.predictions.createdAt))
        .then((rows) => rows.slice(0, 30)),
      searchKnowledge("historical event conflict crisis", {
        limit: 20,
        useVector: true,
      }),
    ]);

    // Build timeline events from signals
    const timelineEvents = signals.map((s) => ({
      id: `signal-${s.id}`,
      type: "signal" as const,
      title: s.title,
      date: s.date,
      category: s.category,
      intensity: s.intensity,
      description: s.description.slice(0, 200),
      layer: "current",
    }));

    // Add predictions as timeline events
    const predictionEvents = predictions.map((p) => ({
      id: `pred-${p.id}`,
      type: "prediction" as const,
      title: p.claim.slice(0, 100),
      date: p.deadline,
      category: p.category,
      intensity: Math.round(p.confidence * 5),
      description: `${(p.confidence * 100).toFixed(0)}% confidence${p.outcome ? ` [${p.outcome}]` : ""}`,
      layer: p.outcome ? "historical" : "current",
    }));

    // Add knowledge entries that have dates embedded in content
    const knowledgeEvents = knowledge
      .filter((k) => k.category === "event" || k.category === "world_model")
      .map((k) => ({
        id: `kb-${k.id}`,
        type: "knowledge" as const,
        title: k.title,
        date: k.createdAt || new Date().toISOString(),
        category: k.category,
        intensity: Math.round((k.confidence ?? 0.5) * 5),
        description: k.content.slice(0, 200),
        layer: "historical",
      }));

    return NextResponse.json({
      events: [...timelineEvents, ...predictionEvents, ...knowledgeEvents].sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
      ),
    });
  } catch (error) {
    console.error("Timeline parallels error:", error);
    return NextResponse.json({ events: [] });
  }
}
