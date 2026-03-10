/**
 * Actor Profile Auto-Update System
 *
 * Periodically searches GDELT/news for new statements, decisions, and events
 * related to tracked actors, then stores them in the knowledge bank for
 * the actor profile system to reference.
 *
 * Runs on a schedule (via the scheduler) to keep actor intelligence current.
 */

import { searchKnowledge, addKnowledge } from "@/lib/knowledge/engine";
import { ACTOR_PROFILES } from "@/lib/signals/actor-beliefs";
import Anthropic from "@anthropic-ai/sdk";
import { db, schema } from "@/lib/db";
import { eq } from "drizzle-orm";

const UPDATE_MODEL = "claude-haiku-4-5-20251001";

interface ActorUpdate {
  actorId: string;
  actorName: string;
  newStatements: Array<{
    date: string;
    quote: string;
    context: string;
    source: string;
    significance: string;
  }>;
  newDecisions: Array<{
    date: string;
    action: string;
    context: string;
    outcome: string;
  }>;
  updatedAssessment: string;
}

/**
 * Fetch recent GDELT events mentioning an actor.
 */
async function fetchGDELTForActor(actorName: string): Promise<string> {
  try {
    const query = encodeURIComponent(actorName);
    const res = await fetch(
      `https://api.gdeltproject.org/api/v2/doc/doc?query=${query}&mode=ArtList&maxrecords=10&format=json&timespan=7d`,
      { signal: AbortSignal.timeout(10000) }
    );
    if (!res.ok) return "";
    const data = await res.json();
    if (!data.articles) return "";

    return data.articles
      .slice(0, 10)
      .map(
        (a: { title: string; seendate: string; url: string; domain: string }) =>
          `[${a.seendate}] ${a.title} (${a.domain})`
      )
      .join("\n");
  } catch {
    return "";
  }
}

/**
 * Use Claude to extract structured actor updates from news articles.
 */
async function extractActorUpdates(
  actorId: string,
  actorName: string,
  newsContent: string,
  apiKey: string
): Promise<ActorUpdate | null> {
  if (!newsContent.trim()) return null;

  const client = new Anthropic({ apiKey });

  const response = await client.messages.create({
    model: UPDATE_MODEL,
    max_tokens: 1000,
    system: `You extract structured actor intelligence from news articles. Given news about a geopolitical actor, extract any new public statements (direct quotes with context) and significant decisions/actions. Only include genuinely significant items, not routine news. If nothing significant, return empty arrays.

Respond in JSON:
{
  "newStatements": [{ "date": "YYYY-MM-DD", "quote": "exact or close quote", "context": "what prompted it", "source": "publication", "significance": "low|medium|high|critical" }],
  "newDecisions": [{ "date": "YYYY-MM-DD", "action": "what they did", "context": "why", "outcome": "result or ongoing" }],
  "updatedAssessment": "1-2 sentence current posture assessment"
}`,
    messages: [
      {
        role: "user",
        content: `Extract intelligence about ${actorName} (${actorId}) from these recent articles:\n\n${newsContent}`,
      },
    ],
  });

  const text =
    response.content[0].type === "text" ? response.content[0].text : "";
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return null;

  const parsed = JSON.parse(jsonMatch[0]);
  return {
    actorId,
    actorName,
    ...parsed,
  };
}

/**
 * Run a full actor profile update cycle.
 * Fetches news for all tracked actors, extracts updates, stores in knowledge bank.
 */
export async function runActorProfileUpdate(): Promise<{
  actorsChecked: number;
  updatesFound: number;
  errors: number;
}> {
  const { getSettingValue } = await import("@/lib/settings/get-setting");
  const apiKey = await getSettingValue("anthropic_api_key", process.env.ANTHROPIC_API_KEY) || "";

  if (!apiKey) {
    return { actorsChecked: 0, updatesFound: 0, errors: 1 };
  }

  let updatesFound = 0;
  let errors = 0;

  for (const actor of ACTOR_PROFILES) {
    try {
      const news = await fetchGDELTForActor(actor.name);
      if (!news) continue;

      const update = await extractActorUpdates(
        actor.id,
        actor.name,
        news,
        apiKey
      );
      if (!update) continue;

      const hasContent =
        update.newStatements.length > 0 || update.newDecisions.length > 0;
      if (!hasContent) continue;

      // Store in knowledge bank
      const content = [
        `Actor Intelligence Update: ${actor.name}`,
        "",
        update.updatedAssessment,
        "",
        ...update.newStatements.map(
          (s) =>
            `STATEMENT [${s.date}] (${s.significance}): "${s.quote}" - ${s.context} (${s.source})`
        ),
        ...update.newDecisions.map(
          (d) =>
            `DECISION [${d.date}]: ${d.action} - Context: ${d.context}. Outcome: ${d.outcome}`
        ),
      ].join("\n");

      await addKnowledge({
        title: `${actor.name} Intelligence Update - ${new Date().toISOString().split("T")[0]}`,
        content,
        category: "actor_intelligence",
        tags: JSON.stringify([
          "actor",
          actor.id,
          actor.country.toLowerCase(),
          "auto-update",
        ]),
        confidence: 0.7,
        status: "active",
      });

      updatesFound++;
    } catch (err) {
      console.error(`Actor update error for ${actor.id}:`, err);
      errors++;
    }
  }

  return {
    actorsChecked: ACTOR_PROFILES.length,
    updatesFound,
    errors,
  };
}
