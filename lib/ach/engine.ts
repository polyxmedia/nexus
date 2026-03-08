// Analysis of Competing Hypotheses (ACH) Engine
// CIA's primary structured analytic technique for systematic hypothesis evaluation

import { db, schema } from "@/lib/db";
import { eq, and, desc } from "drizzle-orm";
import Anthropic from "@anthropic-ai/sdk";

export type Rating = "CC" | "C" | "N" | "I" | "II";
export type Credibility = "high" | "medium" | "low";
export type Relevance = "high" | "medium" | "low";

const RATING_SCORES: Record<Rating, number> = { CC: 2, C: 1, N: 0, I: -1, II: -2 };
const CREDIBILITY_WEIGHTS: Record<Credibility, number> = { high: 1.0, medium: 0.7, low: 0.4 };
const RELEVANCE_WEIGHTS: Record<Relevance, number> = { high: 1.0, medium: 0.7, low: 0.4 };

export interface ACHAnalysis {
  id: number;
  title: string;
  question: string;
  status: string;
  conclusion: string | null;
  confidenceInConclusion: number | null;
  analystNotes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ACHHypothesis {
  id: number;
  analysisId: number;
  label: string;
  description: string;
  probability: number;
  inconsistencyScore: number;
  rank: number | null;
  isRejected: boolean;
  rejectionReason: string | null;
}

export interface ACHEvidence {
  id: number;
  analysisId: number;
  description: string;
  source: string;
  credibility: Credibility;
  relevance: Relevance;
  sourceReliability: string;
  informationAccuracy: number;
}

export interface ACHRating {
  id: number;
  analysisId: number;
  hypothesisId: number;
  evidenceId: number;
  rating: Rating;
  notes: string | null;
}

export interface ACHResult {
  hypotheses: Array<{
    id: number;
    label: string;
    description: string;
    inconsistencyScore: number;
    probability: number;
    rank: number;
    isRejected: boolean;
    diagnosticEvidence: Array<{ evidenceId: number; description: string; rating: string }>;
  }>;
  diagnosticItems: Array<{
    evidenceId: number;
    description: string;
    diagnosticity: number;
  }>;
  nonDiagnosticItems: number[];
  matrixCompleteness: number;
  analysisQuality: "incomplete" | "partial" | "good" | "comprehensive";
}

// Persistence via settings table (JSON key-value)
async function loadACH<T>(key: string): Promise<T | null> {
  const rows = await db.select().from(schema.settings).where(eq(schema.settings.key, key)).limit(1);
  if (rows.length === 0 || !rows[0].value) return null;
  try { return JSON.parse(rows[0].value) as T; } catch { return null; }
}

async function saveACH(key: string, data: unknown): Promise<void> {
  const value = JSON.stringify(data);
  const now = new Date().toISOString();
  const existing = await db.select().from(schema.settings).where(eq(schema.settings.key, key)).limit(1);
  if (existing.length > 0) {
    await db.update(schema.settings).set({ value, updatedAt: now }).where(eq(schema.settings.key, key));
  } else {
    await db.insert(schema.settings).values({ key, value, updatedAt: now });
  }
}

async function getNextId(prefix: string): Promise<number> {
  const counterKey = `ach:counter:${prefix}`;
  const current = await loadACH<number>(counterKey);
  const next = (current || 0) + 1;
  await saveACH(counterKey, next);
  return next;
}

export async function createAnalysis(title: string, question: string): Promise<{ id: number }> {
  const id = await getNextId("analysis");
  const analysis: ACHAnalysis = {
    id,
    title,
    question,
    status: "active",
    conclusion: null,
    confidenceInConclusion: null,
    analystNotes: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const analyses = (await loadACH<ACHAnalysis[]>("ach:analyses")) || [];
  analyses.push(analysis);
  await saveACH("ach:analyses", analyses);

  return { id };
}

export async function addHypothesis(analysisId: number, label: string, description: string): Promise<{ id: number }> {
  const id = await getNextId("hypothesis");
  const hypothesis: ACHHypothesis = {
    id, analysisId, label, description,
    probability: 0, inconsistencyScore: 0,
    rank: null, isRejected: false, rejectionReason: null,
  };

  const hypotheses = (await loadACH<ACHHypothesis[]>("ach:hypotheses")) || [];
  hypotheses.push(hypothesis);
  await saveACH("ach:hypotheses", hypotheses);

  return { id };
}

export async function addEvidence(
  analysisId: number,
  description: string,
  source: string,
  credibility: Credibility,
  relevance: Relevance,
  sourceReliability: string = "F",
  informationAccuracy: number = 6
): Promise<{ id: number }> {
  const id = await getNextId("evidence");
  const evidence: ACHEvidence = {
    id, analysisId, description, source, credibility, relevance,
    sourceReliability, informationAccuracy,
  };

  const allEvidence = (await loadACH<ACHEvidence[]>("ach:evidence")) || [];
  allEvidence.push(evidence);
  await saveACH("ach:evidence", allEvidence);

  return { id };
}

export async function rateEvidence(
  analysisId: number,
  hypothesisId: number,
  evidenceId: number,
  rating: Rating,
  notes?: string
): Promise<void> {
  const ratings = (await loadACH<ACHRating[]>("ach:ratings")) || [];

  // Update existing or add new
  const existingIdx = ratings.findIndex(
    r => r.analysisId === analysisId && r.hypothesisId === hypothesisId && r.evidenceId === evidenceId
  );

  const id = existingIdx >= 0 ? ratings[existingIdx].id : await getNextId("rating");
  const ratingEntry: ACHRating = { id, analysisId, hypothesisId, evidenceId, rating, notes: notes || null };

  if (existingIdx >= 0) {
    ratings[existingIdx] = ratingEntry;
  } else {
    ratings.push(ratingEntry);
  }

  await saveACH("ach:ratings", ratings);
}

function softmax(scores: number[]): number[] {
  const max = Math.max(...scores);
  const exps = scores.map(s => Math.exp(s - max));
  const sum = exps.reduce((a, b) => a + b, 0);
  return exps.map(e => Math.round((e / sum) * 1000) / 1000);
}

export async function evaluateMatrix(analysisId: number): Promise<ACHResult> {
  const allHypotheses = (await loadACH<ACHHypothesis[]>("ach:hypotheses")) || [];
  const allEvidence = (await loadACH<ACHEvidence[]>("ach:evidence")) || [];
  const allRatings = (await loadACH<ACHRating[]>("ach:ratings")) || [];

  const hypotheses = allHypotheses.filter(h => h.analysisId === analysisId);
  const evidence = allEvidence.filter(e => e.analysisId === analysisId);
  const ratings = allRatings.filter(r => r.analysisId === analysisId);

  const totalCells = hypotheses.length * evidence.length;
  const filledCells = ratings.length;
  const matrixCompleteness = totalCells > 0 ? Math.round((filledCells / totalCells) * 100) : 0;

  // Calculate inconsistency scores for each hypothesis
  const hypothesisScores = hypotheses.map(hyp => {
    let inconsistencyScore = 0;
    const diagnosticEvidence: Array<{ evidenceId: number; description: string; rating: string }> = [];

    for (const ev of evidence) {
      const rating = ratings.find(r => r.hypothesisId === hyp.id && r.evidenceId === ev.id);
      if (!rating) continue;

      const ratingScore = RATING_SCORES[rating.rating];
      const credWeight = CREDIBILITY_WEIGHTS[ev.credibility];
      const relWeight = RELEVANCE_WEIGHTS[ev.relevance];
      const weight = credWeight * relWeight;

      if (ratingScore < 0) {
        inconsistencyScore += Math.abs(ratingScore) * weight;
      }

      // Track diagnostic evidence (inconsistent with this hypothesis)
      if (ratingScore <= -1) {
        diagnosticEvidence.push({
          evidenceId: ev.id,
          description: ev.description,
          rating: rating.rating,
        });
      }
    }

    return {
      id: hyp.id,
      label: hyp.label,
      description: hyp.description,
      inconsistencyScore: Math.round(inconsistencyScore * 100) / 100,
      diagnosticEvidence,
      isRejected: hyp.isRejected,
    };
  });

  // Calculate probabilities using softmax on negative inconsistency scores
  // (lower inconsistency = higher probability)
  const negScores = hypothesisScores.map(h => -h.inconsistencyScore);
  const probs = hypothesisScores.length > 0 ? softmax(negScores) : [];

  // Rank hypotheses
  const ranked = hypothesisScores
    .map((h, i) => ({ ...h, probability: probs[i] || 0 }))
    .sort((a, b) => a.inconsistencyScore - b.inconsistencyScore)
    .map((h, i) => ({ ...h, rank: i + 1 }));

  // Calculate diagnosticity of each evidence item
  const diagnosticItems: Array<{ evidenceId: number; description: string; diagnosticity: number }> = [];
  const nonDiagnosticItems: number[] = [];

  for (const ev of evidence) {
    const evRatings = ratings.filter(r => r.evidenceId === ev.id);
    if (evRatings.length < 2) {
      nonDiagnosticItems.push(ev.id);
      continue;
    }

    const scores = evRatings.map(r => RATING_SCORES[r.rating]);
    const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
    const variance = scores.reduce((sum, s) => sum + Math.pow(s - mean, 2), 0) / scores.length;

    if (variance < 0.5) {
      nonDiagnosticItems.push(ev.id);
    } else {
      diagnosticItems.push({
        evidenceId: ev.id,
        description: ev.description,
        diagnosticity: Math.round(variance * 100) / 100,
      });
    }
  }

  diagnosticItems.sort((a, b) => b.diagnosticity - a.diagnosticity);

  let analysisQuality: "incomplete" | "partial" | "good" | "comprehensive";
  if (matrixCompleteness < 30) analysisQuality = "incomplete";
  else if (matrixCompleteness < 60) analysisQuality = "partial";
  else if (matrixCompleteness < 85) analysisQuality = "good";
  else analysisQuality = "comprehensive";

  // Update stored hypotheses with computed values
  for (const r of ranked) {
    const idx = allHypotheses.findIndex(h => h.id === r.id);
    if (idx >= 0) {
      allHypotheses[idx].probability = r.probability;
      allHypotheses[idx].inconsistencyScore = r.inconsistencyScore;
      allHypotheses[idx].rank = r.rank;
    }
  }
  await saveACH("ach:hypotheses", allHypotheses);

  return {
    hypotheses: ranked,
    diagnosticItems,
    nonDiagnosticItems,
    matrixCompleteness,
    analysisQuality,
  };
}

export async function aiAssistAnalysis(analysisId: number): Promise<{
  missingHypotheses: string[];
  cognitBiases: string[];
  additionalEvidence: string[];
  devilsAdvocate: string;
  qualityAssessment: string;
}> {
  const allAnalyses = (await loadACH<ACHAnalysis[]>("ach:analyses")) || [];
  const analysis = allAnalyses.find(a => a.id === analysisId);
  if (!analysis) throw new Error("Analysis not found");

  const result = await evaluateMatrix(analysisId);
  const allEvidence = (await loadACH<ACHEvidence[]>("ach:evidence")) || [];
  const evidence = allEvidence.filter(e => e.analysisId === analysisId);

  // Get API key
  const apiKeyRows = await db.select().from(schema.settings).where(eq(schema.settings.key, "anthropic_api_key")).limit(1);
  const apiKey = apiKeyRows[0]?.value || process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("No Anthropic API key configured");

  const client = new Anthropic({ apiKey });

  const prompt = `You are an intelligence analyst performing Analysis of Competing Hypotheses (ACH) review.

CENTRAL QUESTION: ${analysis.question}

HYPOTHESES:
${result.hypotheses.map(h => `- ${h.label} (P=${h.probability}, Inconsistency=${h.inconsistencyScore}, Rank=${h.rank}): ${h.description}`).join("\n")}

EVIDENCE:
${evidence.map(e => `- [${e.credibility}/${e.relevance}] ${e.description} (Source: ${e.source})`).join("\n")}

MATRIX COMPLETENESS: ${result.matrixCompleteness}%
ANALYSIS QUALITY: ${result.analysisQuality}

Provide:
1. MISSING_HYPOTHESES: 2-3 alternative hypotheses that should be considered but are not in the matrix
2. COGNITIVE_BIASES: Any biases you detect in the current analysis (anchoring, confirmation bias, mirror imaging, groupthink)
3. ADDITIONAL_EVIDENCE: 3-4 specific pieces of evidence that would help discriminate between the hypotheses
4. DEVILS_ADVOCATE: A strong argument for the LEAST likely hypothesis
5. QUALITY_ASSESSMENT: Overall assessment of the analysis quality and rigor

Respond in JSON format:
{
  "missingHypotheses": ["...", "..."],
  "cognitBiases": ["...", "..."],
  "additionalEvidence": ["...", "..."],
  "devilsAdvocate": "...",
  "qualityAssessment": "..."
}`;

  const response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1500,
    messages: [{ role: "user", content: prompt }],
  });

  const text = response.content[0].type === "text" ? response.content[0].text : "";

  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
  } catch {
    // Fall through
  }

  return {
    missingHypotheses: ["Unable to parse AI response"],
    cognitBiases: [],
    additionalEvidence: [],
    devilsAdvocate: text.slice(0, 500),
    qualityAssessment: "AI analysis could not be fully parsed",
  };
}

export async function getAnalysis(analysisId: number): Promise<{
  analysis: ACHAnalysis;
  hypotheses: ACHHypothesis[];
  evidence: ACHEvidence[];
  ratings: ACHRating[];
} | null> {
  const analyses = (await loadACH<ACHAnalysis[]>("ach:analyses")) || [];
  const analysis = analyses.find(a => a.id === analysisId);
  if (!analysis) return null;

  const hypotheses = ((await loadACH<ACHHypothesis[]>("ach:hypotheses")) || []).filter(h => h.analysisId === analysisId);
  const evidence = ((await loadACH<ACHEvidence[]>("ach:evidence")) || []).filter(e => e.analysisId === analysisId);
  const ratings = ((await loadACH<ACHRating[]>("ach:ratings")) || []).filter(r => r.analysisId === analysisId);

  return { analysis, hypotheses, evidence, ratings };
}

export async function listAnalyses(): Promise<ACHAnalysis[]> {
  return (await loadACH<ACHAnalysis[]>("ach:analyses")) || [];
}

export async function deleteAnalysis(analysisId: number): Promise<void> {
  const analyses = ((await loadACH<ACHAnalysis[]>("ach:analyses")) || []).filter(a => a.id !== analysisId);
  const hypotheses = ((await loadACH<ACHHypothesis[]>("ach:hypotheses")) || []).filter(h => h.analysisId !== analysisId);
  const evidence = ((await loadACH<ACHEvidence[]>("ach:evidence")) || []).filter(e => e.analysisId !== analysisId);
  const ratings = ((await loadACH<ACHRating[]>("ach:ratings")) || []).filter(r => r.analysisId !== analysisId);

  await saveACH("ach:analyses", analyses);
  await saveACH("ach:hypotheses", hypotheses);
  await saveACH("ach:evidence", evidence);
  await saveACH("ach:ratings", ratings);
}
