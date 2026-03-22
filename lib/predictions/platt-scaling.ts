/**
 * Platt Scaling Recalibration
 *
 * Academic basis: Platt (1999). Post-hoc sigmoid recalibration with only
 * 2 parameters (A, B), safe for small sample sizes. Preferred over isotonic
 * regression which overfits below ~1000 samples (Niculescu-Mizil & Caruana 2005).
 *
 * Formula: calibrated = 1 / (1 + exp(A * logit(p) + B))
 *
 * Identity transform: A = -1, B = 0
 *   Proof: 1/(1+exp(-logit(p))) = 1/(1+(1-p)/p) = p
 *
 * A closer to 0 than -1 = compression toward 0.5 (overconfidence correction)
 * B > 0 = shift all probabilities down (systematic overconfidence)
 * B < 0 = shift all probabilities up (systematic underconfidence)
 */

import { db, schema } from "@/lib/db";
import { eq } from "drizzle-orm";
import { sql } from "drizzle-orm";

// ── Types ────────────────────────────────────────────────────────────────

export interface PlattParameters {
  A: number;
  B: number;
  fittedAt: string;
  sampleSize: number;
  crossEntropyLoss: number;
  improvementOverIdentity: number;
}

// ── Constants ────────────────────────────────────────────────────────────

export const MIN_SAMPLES_FOR_PLATT = 15;
const PLATT_SETTINGS_KEY = "calibration:platt_parameters";
const PARAMS_CACHE_TTL = 10 * 60 * 1000;
const LEARNING_RATE = 0.01;
const ITERATIONS = 1000;
const EPSILON = 1e-7;

// ── Cache ────────────────────────────────────────────────────────────────

let cachedParams: PlattParameters | null = null;
let paramsCacheTime = 0;

// ── Core Math (exported for testing) ─────────────────────────────────────

export function logit(p: number): number {
  const clamped = Math.max(EPSILON, Math.min(1 - EPSILON, p));
  return Math.log(clamped / (1 - clamped));
}

export function sigmoid(x: number): number {
  if (x > 500) return 1 - EPSILON;
  if (x < -500) return EPSILON;
  return 1 / (1 + Math.exp(x));
}

export function plattTransform(p: number, A: number, B: number): number {
  const l = logit(p);
  return sigmoid(A * l + B);
}

/**
 * Cross-entropy loss for a set of predictions.
 * L = -mean(y * log(sigma) + (1-y) * log(1-sigma))
 */
export function crossEntropyLoss(
  samples: Array<{ logit: number; y: number }>,
  A: number,
  B: number
): number {
  if (samples.length === 0) return Infinity;
  let loss = 0;
  for (const { logit: l, y } of samples) {
    const sigma = Math.max(EPSILON, Math.min(1 - EPSILON, sigmoid(A * l + B)));
    loss -= y * Math.log(sigma) + (1 - y) * Math.log(1 - sigma);
  }
  return loss / samples.length;
}

// ── Fitting ──────────────────────────────────────────────────────────────

export interface FitInput {
  confidence: number;
  outcome: string;
}

/**
 * Fit Platt parameters from prediction data using gradient descent.
 * Pure function (no DB access) for testability.
 */
export function fitFromData(data: FitInput[]): PlattParameters | null {
  if (data.length < MIN_SAMPLES_FOR_PLATT) return null;

  const samples = data.map((d) => ({
    logit: logit(d.confidence),
    y: d.outcome === "confirmed" ? 1 : d.outcome === "partial" ? 0.5 : 0,
  }));

  // Initialize at identity: A = -1, B = 0
  let A = -1.0;
  let B = 0.0;
  const n = samples.length;

  for (let iter = 0; iter < ITERATIONS; iter++) {
    let dA = 0;
    let dB = 0;

    for (const { logit: l, y } of samples) {
      const sigma = sigmoid(A * l + B);
      const error = sigma - y;
      dA += error * l;
      dB += error;
    }

    dA /= n;
    dB /= n;

    A -= LEARNING_RATE * dA;
    B -= LEARNING_RATE * dB;
  }

  const loss = crossEntropyLoss(samples, A, B);
  const identityLoss = crossEntropyLoss(samples, -1, 0);

  // If the fitted model is worse than or equal to identity, don't use it
  if (loss >= identityLoss - EPSILON) {
    return null;
  }

  const improvement = identityLoss > EPSILON
    ? ((identityLoss - loss) / identityLoss) * 100
    : 0;

  return {
    A,
    B,
    fittedAt: new Date().toISOString(),
    sampleSize: n,
    crossEntropyLoss: Math.round(loss * 10000) / 10000,
    improvementOverIdentity: Math.round(improvement * 100) / 100,
  };
}

// ── DB-backed Fit & Apply ────────────────────────────────────────────────

export async function fitPlattParameters(): Promise<PlattParameters | null> {
  try {
    const resolved = await db
      .select({
        confidence: schema.predictions.confidence,
        outcome: schema.predictions.outcome,
      })
      .from(schema.predictions)
      .where(
        sql`${schema.predictions.outcome} IS NOT NULL
            AND ${schema.predictions.outcome} NOT IN ('expired', 'post_event')
            AND ${schema.predictions.preEvent} = 1`
      );

    const data = resolved
      .filter((r) => r.outcome != null)
      .map((r) => ({ confidence: r.confidence, outcome: r.outcome! }));

    const params = fitFromData(data);
    if (!params) return null;

    // Store in settings table
    const existing = await db
      .select()
      .from(schema.settings)
      .where(eq(schema.settings.key, PLATT_SETTINGS_KEY));

    if (existing.length > 0) {
      await db
        .update(schema.settings)
        .set({ value: JSON.stringify(params), updatedAt: new Date().toISOString() })
        .where(eq(schema.settings.key, PLATT_SETTINGS_KEY));
    } else {
      await db.insert(schema.settings).values({
        key: PLATT_SETTINGS_KEY,
        value: JSON.stringify(params),
        updatedAt: new Date().toISOString(),
      });
    }

    // Update cache
    cachedParams = params;
    paramsCacheTime = Date.now();

    return params;
  } catch (err) {
    console.error("[platt-scaling] fitPlattParameters failed:", err);
    return null;
  }
}

export async function getPlattParameters(): Promise<PlattParameters | null> {
  try {
    const rows = await db
      .select()
      .from(schema.settings)
      .where(eq(schema.settings.key, PLATT_SETTINGS_KEY));

    if (rows.length === 0) return null;
    return JSON.parse(rows[0].value) as PlattParameters;
  } catch {
    return null;
  }
}

export async function applyPlattScaling(rawConfidence: number): Promise<number> {
  if (!cachedParams || Date.now() - paramsCacheTime > PARAMS_CACHE_TTL) {
    cachedParams = await getPlattParameters();
    paramsCacheTime = Date.now();
  }

  if (!cachedParams || cachedParams.sampleSize < MIN_SAMPLES_FOR_PLATT) {
    return rawConfidence;
  }

  const calibrated = plattTransform(rawConfidence, cachedParams.A, cachedParams.B);
  return Math.max(0.05, Math.min(0.95, calibrated));
}

// ── Cache Reset (for testing) ────────────────────────────────────────────

export function _resetCache(): void {
  cachedParams = null;
  paramsCacheTime = 0;
}
