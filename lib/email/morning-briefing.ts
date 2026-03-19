/**
 * Daily Morning Briefing Email
 * ============================
 * Sent at 7am UTC. The email a trader opens before their Bloomberg terminal.
 *
 * Content:
 * - Overnight regime state + any shifts
 * - Top signals (highest intensity)
 * - Prediction scoreboard (recent resolutions)
 * - Active predictions to watch today
 * - Cross-stream convergence alerts
 * - One-line thesis summary
 */

import { db, schema } from "@/lib/db";
import { gte, like, desc, eq, isNull, not } from "drizzle-orm";
import { sendEmail } from "@/lib/email";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://nexushq.xyz";

const D = {
  bg: "#000000", card: "#0a0a0a", border: "#1f1f1f",
  text: "#e0e0e0", muted: "#787878", accent: "#06b6d4",
  green: "#10b981", amber: "#f59e0b", rose: "#f43f5e",
};

interface BriefingData {
  regime: string | null;
  regimeScore: number | null;
  signals: Array<{ title: string; intensity: number; category: string }>;
  recentHits: Array<{ claim: string; confidence: number }>;
  recentMisses: Array<{ claim: string; confidence: number }>;
  predictions: { total: number; pending: number; resolved: number; accuracy: number };
  watchToday: Array<{ claim: string; confidence: number; deadline: string }>;
  thesis: string | null;
  convergenceAlerts: number;
}

async function gatherBriefingData(): Promise<BriefingData> {
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const today = new Date().toISOString().split("T")[0];

  const [signals, allPredictions, theses] = await Promise.all([
    db.select({ title: schema.signals.title, intensity: schema.signals.intensity, category: schema.signals.category })
      .from(schema.signals)
      .where(eq(schema.signals.status, "active"))
      .orderBy(desc(schema.signals.intensity))
      .limit(10),
    db.select().from(schema.predictions).orderBy(desc(schema.predictions.id)).limit(300),
    db.select().from(schema.theses).where(eq(schema.theses.status, "active")).orderBy(desc(schema.theses.generatedAt)).limit(1),
  ]);

  const resolved = allPredictions.filter(p => p.outcome && p.outcome !== "expired");
  const confirmed = resolved.filter(p => p.outcome === "confirmed");
  const denied = resolved.filter(p => p.outcome === "denied");
  const pending = allPredictions.filter(p => !p.outcome);

  // Recent resolutions (last 48h)
  const recentResolved = resolved.filter(p => p.resolvedAt && p.resolvedAt >= yesterday);
  const recentHits = recentResolved.filter(p => p.outcome === "confirmed").slice(0, 3)
    .map(p => ({ claim: p.claim.slice(0, 100), confidence: p.confidence }));
  const recentMisses = recentResolved.filter(p => p.outcome === "denied").slice(0, 2)
    .map(p => ({ claim: p.claim.slice(0, 100), confidence: p.confidence }));

  // Predictions due today or overdue
  const watchToday = pending.filter(p => p.deadline <= today).slice(0, 5)
    .map(p => ({ claim: p.claim.slice(0, 100), confidence: p.confidence, deadline: p.deadline }));

  // Regime from latest thesis
  const regime = theses[0]?.marketRegime || null;
  // Strip markdown from thesis summary for email
  const rawThesis = theses[0]?.executiveSummary || "";
  const thesis = rawThesis
    .replace(/#{1,6}\s+/g, "")          // remove headings
    .replace(/\*{1,2}([^*]+)\*{1,2}/g, "$1") // remove bold/italic
    .replace(/---+/g, "")               // remove hr
    .replace(/\n{2,}/g, " ")            // collapse newlines
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1") // links to text
    .trim()
    .split(/[.!?]\s/)[0]               // take first sentence only
    ?.slice(0, 200) || null;

  return {
    regime,
    regimeScore: theses[0]?.overallConfidence || null,
    signals: signals.map(s => ({ title: s.title, intensity: s.intensity, category: s.category })),
    recentHits,
    recentMisses,
    predictions: {
      total: allPredictions.length,
      pending: pending.length,
      resolved: resolved.length,
      accuracy: resolved.length > 0 ? confirmed.length / resolved.length : 0,
    },
    watchToday,
    thesis,
    convergenceAlerts: 0, // filled below
  };
}

function buildBriefingHtml(data: BriefingData, username: string): { subject: string; html: string } {
  const today = new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
  const regimeLabels: Record<string, string> = {
    risk_off: "Risk Off", risk_on: "Risk On", transitioning: "Transitioning",
    peacetime: "Peacetime", wartime: "Wartime", crisis: "Crisis",
  };
  const regimeLabel = regimeLabels[data.regime || ""] || (data.regime || "Unknown").replace(/_/g, " ");
  const regimeColor = ["risk_off", "wartime", "crisis"].includes(data.regime || "") ? D.rose :
    ["risk_on", "peacetime"].includes(data.regime || "") ? D.green : D.amber;

  let body = "";

  // Header
  body += `<div style="font-family:'IBM Plex Mono',monospace;font-size:10px;text-transform:uppercase;letter-spacing:2px;color:${D.muted};margin-bottom:24px;">Nexus Intelligence</div>`;
  body += `<h1 style="font-size:18px;font-weight:600;color:${D.text};margin:0 0 4px;">Morning Briefing</h1>`;
  body += `<p style="font-size:12px;color:${D.muted};margin:0 0 24px;font-family:'IBM Plex Mono',monospace;">${today}</p>`;

  // Regime bar
  if (data.regime) {
    body += `<div style="background:${D.card};border:1px solid ${D.border};border-radius:6px;padding:12px 16px;margin-bottom:16px;">`;
    body += `<span style="font-family:'IBM Plex Mono',monospace;font-size:10px;text-transform:uppercase;letter-spacing:1.5px;color:${D.muted};">Market Regime</span>`;
    body += `<div style="margin-top:6px;font-size:16px;font-weight:600;color:${regimeColor};">${regimeLabel}</div>`;
    if (data.thesis) {
      body += `<p style="font-size:12px;color:${D.muted};margin:8px 0 0;line-height:1.5;">${data.thesis}...</p>`;
    }
    body += `</div>`;
  }

  // Top signals
  if (data.signals.length > 0) {
    body += `<div style="margin-bottom:16px;">`;
    body += `<div style="font-family:'IBM Plex Mono',monospace;font-size:10px;text-transform:uppercase;letter-spacing:1.5px;color:${D.muted};margin-bottom:8px;">Active Signals</div>`;
    for (const s of data.signals.slice(0, 5)) {
      const barWidth = Math.round(s.intensity * 20);
      const barColor = s.intensity >= 4 ? D.rose : s.intensity >= 3 ? D.amber : D.accent;
      body += `<div style="padding:6px 0;border-bottom:1px solid ${D.border};">`;
      body += `<div style="display:flex;justify-content:space-between;align-items:center;">`;
      body += `<span style="font-size:12px;color:${D.text};">${s.title.slice(0, 60)}</span>`;
      body += `</div>`;
      body += `<div style="margin-top:4px;height:3px;background:${D.border};border-radius:2px;"><div style="height:3px;width:${barWidth}%;background:${barColor};border-radius:2px;"></div></div>`;
      body += `</div>`;
    }
    body += `</div>`;
  }

  // Prediction scorecard
  body += `<div style="background:${D.card};border:1px solid ${D.border};border-radius:6px;padding:12px 16px;margin-bottom:16px;">`;
  body += `<div style="font-family:'IBM Plex Mono',monospace;font-size:10px;text-transform:uppercase;letter-spacing:1.5px;color:${D.muted};margin-bottom:8px;">Prediction Scorecard</div>`;
  body += `<table style="width:100%;font-size:12px;color:${D.text};" cellpadding="4" cellspacing="0">`;
  body += `<tr><td style="color:${D.muted};">Total</td><td style="text-align:right;font-weight:600;">${data.predictions.total}</td>`;
  body += `<td style="color:${D.muted};padding-left:16px;">Pending</td><td style="text-align:right;font-weight:600;">${data.predictions.pending}</td></tr>`;
  body += `<tr><td style="color:${D.muted};">Resolved</td><td style="text-align:right;font-weight:600;">${data.predictions.resolved}</td>`;
  body += `<td style="color:${D.muted};padding-left:16px;">Accuracy</td><td style="text-align:right;font-weight:600;color:${data.predictions.accuracy >= 0.6 ? D.green : D.amber};">${(data.predictions.accuracy * 100).toFixed(0)}%</td></tr>`;
  body += `</table>`;
  body += `</div>`;

  // Recent resolutions
  if (data.recentHits.length > 0 || data.recentMisses.length > 0) {
    body += `<div style="margin-bottom:16px;">`;
    body += `<div style="font-family:'IBM Plex Mono',monospace;font-size:10px;text-transform:uppercase;letter-spacing:1.5px;color:${D.muted};margin-bottom:8px;">Recent Resolutions</div>`;
    for (const h of data.recentHits) {
      body += `<div style="padding:4px 0;font-size:12px;"><span style="color:${D.green};font-family:'IBM Plex Mono',monospace;font-size:10px;">HIT</span> <span style="color:${D.text};">${h.claim}</span> <span style="color:${D.muted};">(${(h.confidence * 100).toFixed(0)}%)</span></div>`;
    }
    for (const m of data.recentMisses) {
      body += `<div style="padding:4px 0;font-size:12px;"><span style="color:${D.rose};font-family:'IBM Plex Mono',monospace;font-size:10px;">MISS</span> <span style="color:${D.text};">${m.claim}</span> <span style="color:${D.muted};">(${(m.confidence * 100).toFixed(0)}%)</span></div>`;
    }
    body += `</div>`;
  }

  // Watch today
  if (data.watchToday.length > 0) {
    body += `<div style="margin-bottom:16px;">`;
    body += `<div style="font-family:'IBM Plex Mono',monospace;font-size:10px;text-transform:uppercase;letter-spacing:1.5px;color:${D.amber};margin-bottom:8px;">Due Today</div>`;
    for (const w of data.watchToday) {
      body += `<div style="padding:4px 0;font-size:12px;color:${D.text};">${w.claim} <span style="color:${D.muted};">(${(w.confidence * 100).toFixed(0)}%)</span></div>`;
    }
    body += `</div>`;
  }

  // CTA
  body += `<div style="text-align:center;margin-top:24px;">`;
  body += `<a href="${SITE_URL}/dashboard" style="display:inline-block;padding:10px 24px;background:${D.text};color:${D.bg};font-size:12px;font-weight:600;text-decoration:none;border-radius:6px;font-family:'IBM Plex Mono',monospace;letter-spacing:1px;">Open Dashboard</a>`;
  body += `</div>`;

  const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light dark">
</head>
<body style="margin:0;padding:0;background:${D.bg};font-family:'IBM Plex Sans',-apple-system,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:${D.bg};padding:40px 20px;">
<tr><td align="center">
<table width="560" cellpadding="0" cellspacing="0" style="background:${D.card};border:1px solid ${D.border};border-radius:8px;">
<tr><td style="padding:32px 40px 24px;">${body}</td></tr>
<tr><td style="padding:16px 40px 24px;border-top:1px solid ${D.border};">
<div style="font-family:'IBM Plex Mono',monospace;font-size:9px;color:${D.muted};letter-spacing:1px;">Nexus Intelligence Platform</div>
<div style="margin-top:8px;"><a href="${SITE_URL}/settings" style="font-family:'IBM Plex Mono',monospace;font-size:9px;color:${D.muted};letter-spacing:1px;text-decoration:underline;">Manage email preferences</a></div>
</td></tr>
</table>
</td></tr>
</table>
</body></html>`;

  const subject = data.regime
    ? `NEXUS Briefing: ${regimeLabel} regime, ${data.signals.length} active signals`
    : `NEXUS Briefing: ${data.signals.length} signals, ${data.predictions.pending} predictions pending`;

  return { subject, html };
}

/**
 * Generate and send daily morning briefings to all users with active subscriptions.
 */
export async function sendMorningBriefings(): Promise<{ sent: number; failed: number }> {
  const data = await gatherBriefingData();

  // Skip if nothing to report
  if (data.signals.length === 0 && data.predictions.total === 0) {
    return { sent: 0, failed: 0 };
  }

  // Get all users
  const userRows = await db.select().from(schema.settings)
    .where(like(schema.settings.key, "user:%"));

  let sent = 0;
  let failed = 0;

  for (const row of userRows) {
    try {
      const userData = JSON.parse(row.value);
      if (!userData.email) continue;

      // Check opt-out
      const username = row.key.replace("user:", "");
      const pref = await db.select().from(schema.settings)
        .where(eq(schema.settings.key, `${username}:morning_briefing`));
      if (pref.length > 0 && pref[0].value === "false") continue;

      // Only send to users with analyst tier or above (or admin)
      if (userData.role !== "admin" && !["analyst", "observer", "operator", "institution"].includes(userData.tier)) continue;

      const { subject, html } = buildBriefingHtml(data, username);
      await sendEmail({ to: userData.email, subject, html });
      sent++;
    } catch {
      failed++;
    }
  }

  return { sent, failed };
}
