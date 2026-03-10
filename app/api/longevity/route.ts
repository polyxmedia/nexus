import { NextRequest, NextResponse } from "next/server";
import { creditGate } from "@/lib/credits/gate";
import Anthropic from "@anthropic-ai/sdk";

// GDELT search for public news about a person
async function searchGDELT(query: string, maxRecords = 15): Promise<Array<{ title: string; url: string; date: string; source: string }>> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    const res = await fetch(
      `https://api.gdeltproject.org/api/v2/doc/doc?query=${encodeURIComponent(query)}&mode=artlist&maxrecords=${maxRecords}&format=json&sort=datedesc`,
      { signal: controller.signal }
    );
    clearTimeout(timeout);
    if (!res.ok) return [];
    const json = await res.json();
    return (json.articles || []).map((a: { title: string; url: string; seendate: string; domain: string }) => ({
      title: a.title,
      url: a.url,
      date: a.seendate,
      source: a.domain,
    }));
  } catch {
    return [];
  }
}

// Wikipedia summary for background
async function getWikiSummary(name: string): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const searchRes = await fetch(
      `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(name)}&srlimit=1&format=json`,
      { signal: controller.signal }
    );
    clearTimeout(timeout);
    if (!searchRes.ok) return null;
    const searchData = await searchRes.json();
    const pageTitle = searchData?.query?.search?.[0]?.title;
    if (!pageTitle) return null;

    const controller2 = new AbortController();
    const timeout2 = setTimeout(() => controller2.abort(), 8000);
    const summaryRes = await fetch(
      `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(pageTitle)}`,
      { signal: controller2.signal }
    );
    clearTimeout(timeout2);
    if (!summaryRes.ok) return null;
    const summaryData = await summaryRes.json();
    return summaryData?.extract || null;
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  const gate = await creditGate();
  if (gate.response) return gate.response;

  try {
    const body = await req.json();
    const { name, timeframeYears } = body;

    if (!name || typeof name !== "string") {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    const years = timeframeYears || 5;

    // Gather intelligence in parallel
    const [newsArticles, healthNews, wikiSummary] = await Promise.all([
      searchGDELT(`"${name}"`, 20),
      searchGDELT(`"${name}" (health OR medical OR hospital OR diet OR exercise OR weight OR illness OR disease OR surgery OR age OR aging)`, 10),
      getWikiSummary(name),
    ]);

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "AI API key not configured" }, { status: 500 });
    }

    const client = new Anthropic({ apiKey });

    const newsContext = newsArticles.length > 0
      ? `\n\nRecent news articles about ${name}:\n${newsArticles.map((a) => `- ${a.title} (${a.source}, ${a.date})`).join("\n")}`
      : "";

    const healthContext = healthNews.length > 0
      ? `\n\nHealth-related news about ${name}:\n${healthNews.map((a) => `- ${a.title} (${a.source}, ${a.date})`).join("\n")}`
      : "";

    const wikiContext = wikiSummary
      ? `\n\nWikipedia summary:\n${wikiSummary}`
      : "";

    const prompt = `You are an actuarial intelligence analyst. Given publicly available information about a public figure, produce a comprehensive longevity risk assessment. This is used for geopolitical and market risk analysis, not personal medical advice.

Subject: ${name}
Assessment timeframe: ${years} years

Public intelligence gathered:${wikiContext}${newsContext}${healthContext}

Analyze ALL of the following risk dimensions using ONLY publicly available information. For each factor, assign a risk score from 1 (minimal risk) to 10 (extreme risk) and provide a brief evidence-based rationale.

Return ONLY valid JSON in this exact structure:
{
  "subject": {
    "name": "Full name",
    "age": <number or null if unknown>,
    "dateOfBirth": "YYYY-MM-DD or null",
    "nationality": "string",
    "role": "Current primary role/title",
    "significance": "Why this person matters geopolitically/market-wise"
  },
  "riskFactors": {
    "age": {
      "score": <1-10>,
      "rationale": "Age-based actuarial assessment based on demographic data"
    },
    "knownHealthConditions": {
      "score": <1-10>,
      "rationale": "Any publicly reported health conditions, surgeries, hospitalizations"
    },
    "lifestyle": {
      "score": <1-10>,
      "rationale": "Known habits: diet, exercise, sleep, substance use, weight, stress indicators"
    },
    "occupationalStress": {
      "score": <1-10>,
      "rationale": "Work demands, public pressure, travel schedule, sleep deprivation indicators"
    },
    "securityThreats": {
      "score": <1-10>,
      "rationale": "Assassination risk, active threats, conflict zone exposure, protection level"
    },
    "mentalHealth": {
      "score": <1-10>,
      "rationale": "Publicly observable stress indicators, behavioral patterns, cognitive markers"
    },
    "environmentalExposure": {
      "score": <1-10>,
      "rationale": "Exposure to hazardous environments, radiation, pollution, travel to high-risk areas"
    },
    "geneticIndicators": {
      "score": <1-10>,
      "rationale": "Known family history, hereditary conditions if publicly documented"
    },
    "accessToHealthcare": {
      "score": <1-10>,
      "rationale": "Quality and immediacy of available medical care - 1=best possible, 10=poor access"
    },
    "substanceUse": {
      "score": <1-10>,
      "rationale": "Known alcohol, tobacco, drug use patterns from public record"
    }
  },
  "compositeScore": {
    "overallRisk": <1-10 weighted composite>,
    "survivalProbability": <0.0-1.0 estimated probability of surviving the timeframe>,
    "confidence": <0.0-1.0 confidence in this assessment>,
    "primaryConcerns": ["top 3 risk factors driving the score"],
    "mitigatingFactors": ["factors that reduce risk"]
  },
  "geopoliticalImpact": {
    "successionRisk": "Assessment of what happens if this person is incapacitated",
    "marketSectors": ["sectors that would be affected"],
    "estimatedMarketImpact": "low|moderate|high|severe",
    "keyDependencies": ["systems, policies, or structures that depend on this person"]
  },
  "timeline": {
    "shortTerm": "1-year outlook",
    "mediumTerm": "${years}-year outlook",
    "trendDirection": "improving|stable|declining|unknown"
  },
  "intelligenceGaps": ["Key unknowns that would change the assessment"],
  "sources": ["Types of public sources used in this analysis"],
  "disclaimer": "This is a geopolitical risk assessment based solely on publicly available information. It is not medical advice or a clinical evaluation."
}`;

    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4000,
      messages: [{ role: "user", content: prompt }],
    });

    const text = response.content[0].type === "text" ? response.content[0].text : "";

    // Extract JSON from response
    let analysis;
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      analysis = jsonMatch ? JSON.parse(jsonMatch[0]) : null;
    } catch {
      return NextResponse.json({ error: "Failed to parse analysis", raw: text }, { status: 500 });
    }

    // Debit credits
    await gate.debit(
      "claude-sonnet-4-20250514",
      response.usage.input_tokens,
      response.usage.output_tokens,
      "longevity_analysis"
    );

    return NextResponse.json({
      analysis,
      newsArticles: newsArticles.slice(0, 10),
      healthArticles: healthNews.slice(0, 5),
    });
  } catch (err) {
    console.error("[Longevity] Error:", err);
    return NextResponse.json({ error: "Analysis failed" }, { status: 500 });
  }
}
