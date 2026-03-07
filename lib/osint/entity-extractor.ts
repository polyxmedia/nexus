// Auto Entity Extraction from OSINT
// Extracts actors, locations, topics, and tickers from news articles
// Links to existing game theory scenarios and signals

import { db, schema } from "@/lib/db";
import { eq } from "drizzle-orm";

// Known entity patterns for matching
const ACTOR_PATTERNS: Record<string, string[]> = {
  "Iran": ["iran", "tehran", "irgc", "khamenei", "rouhani", "raisi", "persian gulf", "iranian"],
  "Russia": ["russia", "moscow", "kremlin", "putin", "russian", "lavrov"],
  "China": ["china", "beijing", "xi jinping", "chinese", "pla", "ccp", "prc"],
  "United States": ["united states", "washington", "biden", "white house", "pentagon", "us military", "american"],
  "Israel": ["israel", "idf", "netanyahu", "tel aviv", "israeli", "mossad"],
  "Saudi Arabia": ["saudi", "riyadh", "mbs", "bin salman", "aramco"],
  "Turkey": ["turkey", "ankara", "erdogan", "turkish"],
  "North Korea": ["north korea", "pyongyang", "kim jong", "dprk"],
  "Ukraine": ["ukraine", "kyiv", "zelensky", "ukrainian"],
  "Taiwan": ["taiwan", "taipei", "taiwanese"],
  "EU": ["european union", "brussels", "eu sanctions", "european commission"],
  "NATO": ["nato", "alliance", "article 5"],
  "OPEC": ["opec", "opec+", "oil cartel", "production cut"],
  "Hezbollah": ["hezbollah", "nasrallah", "lebanese militia"],
  "Hamas": ["hamas", "gaza", "palestinian"],
  "Houthis": ["houthi", "yemen", "ansar allah"],
};

const LOCATION_PATTERNS: Record<string, string[]> = {
  "Strait of Hormuz": ["hormuz", "strait of hormuz"],
  "South China Sea": ["south china sea", "spratly", "scarborough shoal"],
  "Taiwan Strait": ["taiwan strait", "formosa strait"],
  "Black Sea": ["black sea", "crimea"],
  "Red Sea": ["red sea", "bab el-mandeb", "bab al-mandab"],
  "Suez Canal": ["suez canal", "suez"],
  "Persian Gulf": ["persian gulf", "gulf states"],
  "Gaza": ["gaza", "gaza strip"],
  "West Bank": ["west bank", "judea", "samaria"],
  "Golan Heights": ["golan heights", "golan"],
  "Donbas": ["donbas", "donetsk", "luhansk"],
  "Korean Peninsula": ["korean peninsula", "dmz", "38th parallel"],
  "Arctic": ["arctic", "north pole", "northern sea route"],
};

const TOPIC_PATTERNS: Record<string, string[]> = {
  "nuclear": ["nuclear", "uranium", "enrichment", "atomic", "warhead", "icbm"],
  "oil_supply": ["oil supply", "crude oil", "petroleum", "barrel", "oil price", "energy crisis"],
  "sanctions": ["sanctions", "sanctioned", "embargo", "blacklist", "ofac"],
  "military_exercise": ["military exercise", "war games", "naval drill", "air defense drill"],
  "missile_test": ["missile test", "ballistic missile", "rocket launch", "missile launch"],
  "trade_war": ["trade war", "tariff", "trade dispute", "import duty"],
  "cyber_attack": ["cyber attack", "hack", "ransomware", "cyber warfare"],
  "election": ["election", "vote", "ballot", "polling", "referendum"],
  "inflation": ["inflation", "consumer price", "cost of living", "price surge"],
  "recession": ["recession", "economic downturn", "contraction", "negative growth"],
  "rate_hike": ["rate hike", "interest rate", "fed funds", "tightening", "hawkish"],
  "ceasefire": ["ceasefire", "peace talks", "truce", "armistice", "de-escalation"],
  "coup": ["coup", "overthrow", "military takeover", "regime change"],
  "shipping_disruption": ["shipping disruption", "port closure", "supply chain", "freight rate"],
};

const TICKER_PATTERNS: Record<string, string[]> = {
  "OIL": ["oil price", "crude oil", "wti", "brent", "petroleum"],
  "GLD": ["gold price", "gold futures", "bullion", "gold rally", "gold slump"],
  "USO": ["us oil", "oil etf"],
  "SPY": ["s&p 500", "sp500", "wall street", "us stocks", "stock market"],
  "QQQ": ["nasdaq", "tech stocks", "technology sector"],
  "TLT": ["treasury", "government bond", "bond yield", "us debt"],
  "UUP": ["dollar index", "us dollar", "greenback", "dollar strength"],
  "EEM": ["emerging market", "em equities", "developing nation"],
  "XLE": ["energy sector", "energy stocks", "oil stocks"],
  "XLF": ["financial sector", "bank stocks", "banking sector"],
  "TSM": ["tsmc", "taiwan semiconductor", "chip maker"],
  "LMT": ["lockheed martin", "defense contractor", "weapons"],
  "RTX": ["raytheon", "missile defense", "defense sector"],
};

// Scenario mapping
const SCENARIO_KEYWORDS: Record<string, string[]> = {
  "taiwan-strait": ["taiwan", "china", "tsmc", "semiconductor", "strait", "reunification", "one china"],
  "iran-nuclear": ["iran", "nuclear", "enrichment", "iaea", "jcpoa", "sanctions", "hormuz", "oil"],
  "opec-production": ["opec", "production cut", "oil supply", "barrel", "crude", "saudi", "output"],
};

export interface ExtractedEntities {
  actors: string[];
  locations: string[];
  topics: string[];
  tickers: string[];
  scenarios: string[];
  sentiment: "positive" | "negative" | "neutral";
  urgency: "low" | "medium" | "high" | "critical";
}

export function extractEntities(text: string): ExtractedEntities {
  const lower = text.toLowerCase();

  const actors: string[] = [];
  for (const [actor, patterns] of Object.entries(ACTOR_PATTERNS)) {
    if (patterns.some(p => lower.includes(p))) actors.push(actor);
  }

  const locations: string[] = [];
  for (const [loc, patterns] of Object.entries(LOCATION_PATTERNS)) {
    if (patterns.some(p => lower.includes(p))) locations.push(loc);
  }

  const topics: string[] = [];
  for (const [topic, patterns] of Object.entries(TOPIC_PATTERNS)) {
    if (patterns.some(p => lower.includes(p))) topics.push(topic);
  }

  const tickers: string[] = [];
  for (const [ticker, patterns] of Object.entries(TICKER_PATTERNS)) {
    if (patterns.some(p => lower.includes(p))) tickers.push(ticker);
  }

  const scenarios: string[] = [];
  for (const [scenario, keywords] of Object.entries(SCENARIO_KEYWORDS)) {
    const matches = keywords.filter(k => lower.includes(k)).length;
    if (matches >= 2) scenarios.push(scenario);
  }

  // Simple sentiment from keyword matching
  const negativeWords = ["attack", "war", "crisis", "threat", "bomb", "kill", "death", "collapse", "crash", "fear", "panic", "destroy", "escalat"];
  const positiveWords = ["peace", "deal", "agreement", "ceasefire", "rally", "surge", "growth", "recover", "stable", "cooperat"];

  const negCount = negativeWords.filter(w => lower.includes(w)).length;
  const posCount = positiveWords.filter(w => lower.includes(w)).length;
  const sentiment = negCount > posCount + 1 ? "negative" : posCount > negCount + 1 ? "positive" : "neutral";

  // Urgency based on keywords
  const criticalWords = ["breaking", "urgent", "emergency", "imminent", "critical", "attack", "strike", "invasion"];
  const highWords = ["escalation", "military", "deployment", "sanctions", "crisis", "warning"];
  const critCount = criticalWords.filter(w => lower.includes(w)).length;
  const highCount = highWords.filter(w => lower.includes(w)).length;

  let urgency: ExtractedEntities["urgency"] = "low";
  if (critCount >= 2) urgency = "critical";
  else if (critCount >= 1 || highCount >= 2) urgency = "high";
  else if (highCount >= 1 || actors.length >= 2) urgency = "medium";

  return { actors, locations, topics, tickers, scenarios, sentiment, urgency };
}

// Process a batch of OSINT articles and create/link entities in the graph
export async function processOsintArticles(
  articles: Array<{ title: string; url?: string; date?: string; tone?: number }>
): Array<ExtractedEntities & { title: string }> {
  return articles.map(article => ({
    ...extractEntities(article.title),
    title: article.title,
  }));
}

// Link extracted entities to the entity graph
export async function linkEntitiesToGraph(
  extracted: ExtractedEntities,
  sourceTitle: string,
  sourceDate: string
): { entitiesCreated: number; relationshipsCreated: number } {
  let entitiesCreated = 0;
  let relationshipsCreated = 0;

  // Find or create an event entity for this OSINT item
  const [existingEvent] = await db.select().from(schema.entities)
    .where(eq(schema.entities.name, sourceTitle)).limit(1);

  let eventId: number;
  if (existingEvent) {
    eventId = existingEvent.id;
  } else {
    const result = await db.insert(schema.entities).values({
      type: "event",
      name: sourceTitle.slice(0, 200),
      properties: JSON.stringify({
        date: sourceDate,
        sentiment: extracted.sentiment,
        urgency: extracted.urgency,
        source: "osint",
      }),
      sourceType: "osint",
    }).returning();
    eventId = result.id;
    entitiesCreated++;
  }

  // Link actors
  for (const actor of extracted.actors) {
    const [actorEntity] = await db.select().from(schema.entities)
      .where(eq(schema.entities.name, actor)).limit(1);

    if (actorEntity) {
      // Check if relationship already exists
      const existing = await db.select().from(schema.relationships)
        .where(eq(schema.relationships.fromEntityId, eventId))
        
        .find(r => r.toEntityId === actorEntity.id);

      if (!existing) {
        await db.insert(schema.relationships).values({
          fromEntityId: eventId,
          toEntityId: actorEntity.id,
          type: "involves",
          weight: extracted.urgency === "critical" ? 1.0 : extracted.urgency === "high" ? 0.8 : 0.5,
          properties: JSON.stringify({ sentiment: extracted.sentiment }),
        });
        relationshipsCreated++;
      }
    }
  }

  // Link tickers
  for (const ticker of extracted.tickers) {
    const [tickerEntity] = await db.select().from(schema.entities)
      .where(eq(schema.entities.name, ticker)).limit(1);

    if (tickerEntity) {
      const existing = await db.select().from(schema.relationships)
        .where(eq(schema.relationships.fromEntityId, eventId))
        
        .find(r => r.toEntityId === tickerEntity.id);

      if (!existing) {
        await db.insert(schema.relationships).values({
          fromEntityId: eventId,
          toEntityId: tickerEntity.id,
          type: "affects",
          weight: 0.7,
        });
        relationshipsCreated++;
      }
    }
  }

  return { entitiesCreated, relationshipsCreated };
}
