import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { db, schema } from "@/lib/db";

const anthropic = new Anthropic();

export interface SentimentResult {
  sentimentScore: number;
  confidence: number;
  toneBreakdown: {
    hawkish: number;
    dovish: number;
    uncertainty: number;
    urgency: number;
    optimism: number;
    fear: number;
  };
  entitiesMentioned: string[];
  keyClaims: string[];
  marketImplications: {
    bonds: string;
    equities: string;
    dollar: string;
    gold: string;
    crypto: string;
  };
  summary: string;
}

interface CentralBankSentiment extends SentimentResult {
  ratePathImplication: string;
  forwardGuidance: string;
}

interface EarningsSentiment extends SentimentResult {
  guidanceDirection: string;
  surprises: string[];
}

const SENTIMENT_PROMPT = `Analyze the following text and return ONLY a valid JSON object (no markdown, no code blocks) with these exact fields:
- sentimentScore: float -1 to 1 (-1 = extremely negative/bearish, 1 = extremely positive/bullish)
- confidence: float 0-1 (how confident you are in this assessment)
- toneBreakdown: object with hawkish/dovish/uncertainty/urgency/optimism/fear as floats 0-1
- entitiesMentioned: array of key entities (people, organizations, countries, tickers)
- keyClaims: array of 3-5 key factual claims extracted from the text
- marketImplications: object with bonds/equities/dollar/gold/crypto as brief one-sentence strings
- summary: one paragraph summary of the key takeaways and market relevance`;

const CENTRAL_BANK_PROMPT = `Analyze this central bank statement and return ONLY a valid JSON object (no markdown, no code blocks) with these exact fields:
- sentimentScore: float -1 to 1 (-1 = extremely dovish, 1 = extremely hawkish)
- confidence: float 0-1
- toneBreakdown: object with hawkish/dovish/uncertainty/urgency/optimism/fear as floats 0-1
- entitiesMentioned: array of key entities
- keyClaims: array of 3-5 key policy claims
- marketImplications: object with bonds/equities/dollar/gold/crypto as brief strings
- summary: one paragraph summary
- ratePathImplication: one of "hiking", "pausing", "cutting", "uncertain"
- forwardGuidance: one sentence on forward guidance direction`;

const EARNINGS_PROMPT = `Analyze this earnings call/report and return ONLY a valid JSON object (no markdown, no code blocks) with these exact fields:
- sentimentScore: float -1 to 1 (-1 = very negative outlook, 1 = very positive)
- confidence: float 0-1
- toneBreakdown: object with hawkish/dovish/uncertainty/urgency/optimism/fear as floats 0-1
- entitiesMentioned: array of companies, executives, competitors mentioned
- keyClaims: array of 3-5 key financial claims (revenue, guidance, margins)
- marketImplications: object with bonds/equities/dollar/gold/crypto as brief strings
- summary: one paragraph summary
- guidanceDirection: one of "raised", "maintained", "lowered", "withdrawn"
- surprises: array of notable surprises (beats, misses, unexpected announcements)`;

function parseJsonResponse(text: string): Record<string, unknown> {
  let cleaned = text.trim();
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
  }
  return JSON.parse(cleaned);
}

async function storeSentimentResult(
  result: SentimentResult,
  meta: { sourceType: string; sourceTitle?: string; sourceUrl?: string; rawText: string; model: string; tokens: number },
): Promise<void> {
  await db.insert(schema.sentimentAnalyses).values({
    sourceType: meta.sourceType,
    sourceUrl: meta.sourceUrl || null,
    sourceTitle: meta.sourceTitle || null,
    rawText: meta.rawText.slice(0, 2000),
    sentimentScore: result.sentimentScore,
    confidence: result.confidence,
    toneBreakdown: JSON.stringify(result.toneBreakdown),
    entitiesMentioned: JSON.stringify(result.entitiesMentioned),
    keyClaims: JSON.stringify(result.keyClaims),
    marketImplications: JSON.stringify(result.marketImplications),
    modelUsed: meta.model,
    tokensUsed: meta.tokens,
  });
}

export async function analyzeSentiment(
  text: string,
  sourceType: string,
  sourceTitle?: string,
  sourceUrl?: string,
): Promise<SentimentResult> {
  // Truncate text to avoid token limits
  const truncated = text.slice(0, 8000);

  const response = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 1024,
    messages: [
      {
        role: "user",
        content: `${SENTIMENT_PROMPT}\n\nSource type: ${sourceType}\n${sourceTitle ? `Title: ${sourceTitle}\n` : ""}\nText:\n${truncated}`,
      },
    ],
  });

  const content = response.content[0];
  if (content.type !== "text") throw new Error("Unexpected response type");

  const result = parseJsonResponse(content.text) as unknown as SentimentResult;

  await storeSentimentResult(result, {
    sourceType,
    sourceTitle,
    sourceUrl,
    rawText: truncated,
    model: "claude-haiku-4-5-20251001",
    tokens: (response.usage?.input_tokens || 0) + (response.usage?.output_tokens || 0),
  });

  return result;
}

export async function analyzeCentralBankDeep(
  text: string,
  institution: string,
): Promise<CentralBankSentiment> {
  const truncated = text.slice(0, 12000);

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1500,
    messages: [
      {
        role: "user",
        content: `${CENTRAL_BANK_PROMPT}\n\nInstitution: ${institution}\n\nStatement:\n${truncated}`,
      },
    ],
  });

  const content = response.content[0];
  if (content.type !== "text") throw new Error("Unexpected response type");

  const result = parseJsonResponse(content.text) as unknown as CentralBankSentiment;

  await storeSentimentResult(result, {
    sourceType: "central_bank",
    sourceTitle: `${institution} statement`,
    rawText: truncated,
    model: "claude-sonnet-4-20250514",
    tokens: (response.usage?.input_tokens || 0) + (response.usage?.output_tokens || 0),
  });

  return result;
}

export async function analyzeEarningsDeep(
  text: string,
  company: string,
): Promise<EarningsSentiment> {
  const truncated = text.slice(0, 12000);

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1500,
    messages: [
      {
        role: "user",
        content: `${EARNINGS_PROMPT}\n\nCompany: ${company}\n\nEarnings text:\n${truncated}`,
      },
    ],
  });

  const content = response.content[0];
  if (content.type !== "text") throw new Error("Unexpected response type");

  const result = parseJsonResponse(content.text) as unknown as EarningsSentiment;

  await storeSentimentResult(result, {
    sourceType: "earnings",
    sourceTitle: `${company} earnings`,
    rawText: truncated,
    model: "claude-sonnet-4-20250514",
    tokens: (response.usage?.input_tokens || 0) + (response.usage?.output_tokens || 0),
  });

  return result;
}
