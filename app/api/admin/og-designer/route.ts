import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth";
import { db, schema } from "@/lib/db";
import { eq } from "drizzle-orm";
import { rateLimit } from "@/lib/rate-limit";
import Anthropic from "@anthropic-ai/sdk";
import { validateOrigin } from "@/lib/security/csrf";

const OG_CONFIG_KEY = "og-image-config";
const MAX_CONFIG_SIZE = 10_000;
const MAX_PROMPT_LENGTH = 1000;

const ALLOWED_CONFIG_KEYS = new Set([
  "title", "subtitle", "label", "topBar", "tags",
  "accentColor", "backgroundColor", "titleColor", "subtitleColor", "labelColor",
  "showGrid", "showAccentLine", "showRadar",
  "gridSpacing", "gridOpacity",
  "bottomLeft", "bottomRight",
  "titleSize", "subtitleSize",
  "radarColor", "radarOpacity", "radarSize",
  "backgroundImage", "backgroundOverlay",
  "gradientEnabled", "gradientFrom", "gradientTo", "gradientAngle",
  "labelSize", "topBarColor", "bottomBarColor",
  "titleWeight", "tagSize",
  "contentPaddingLeft",
]);

function sanitizeConfig(raw: unknown): Record<string, unknown> | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (ALLOWED_CONFIG_KEYS.has(k)) out[k] = v;
  }
  return out;
}

async function checkAdmin(username: string): Promise<boolean> {
  const userRows = await db
    .select()
    .from(schema.settings)
    .where(eq(schema.settings.key, `user:${username}`));
  const userData = userRows[0] ? JSON.parse(userRows[0].value) : {};
  return userData.role === "admin";
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.name) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!(await checkAdmin(session.user.name))) {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }

  const rows = await db
    .select()
    .from(schema.settings)
    .where(eq(schema.settings.key, OG_CONFIG_KEY));

  if (rows.length === 0) {
    return NextResponse.json({ config: null });
  }

  return NextResponse.json({ config: JSON.parse(rows[0].value) });
}

export async function POST(req: NextRequest) {
  const csrfError = validateOrigin(req);
  if (csrfError) return NextResponse.json({ error: csrfError }, { status: 403 });

  const session = await getServerSession(authOptions);
  if (!session?.user?.name) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!(await checkAdmin(session.user.name))) {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }

  const rl = await rateLimit(`admin:og:${session.user.name}`, 30, 60 * 1000);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Too many requests" },
      { status: 429, headers: { "Retry-After": String(Math.ceil((rl.resetAt - Date.now()) / 1000)) } }
    );
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const { action, config, prompt } = body;

  if (action === "save") {
    const sanitized = sanitizeConfig(config);
    if (!sanitized) {
      return NextResponse.json({ error: "Invalid config" }, { status: 400 });
    }
    const value = JSON.stringify(sanitized);
    if (value.length > MAX_CONFIG_SIZE) {
      return NextResponse.json({ error: "Config too large" }, { status: 400 });
    }
    const existing = await db
      .select()
      .from(schema.settings)
      .where(eq(schema.settings.key, OG_CONFIG_KEY));

    if (existing.length > 0) {
      await db
        .update(schema.settings)
        .set({ value, updatedAt: new Date().toISOString() })
        .where(eq(schema.settings.key, OG_CONFIG_KEY));
    } else {
      await db.insert(schema.settings).values({
        key: OG_CONFIG_KEY,
        value,
        updatedAt: new Date().toISOString(),
      });
    }

    return NextResponse.json({ success: true });
  }

  if (action === "generate") {
    if (!prompt || typeof prompt !== "string" || prompt.length > MAX_PROMPT_LENGTH) {
      return NextResponse.json({ error: "Invalid or oversized prompt" }, { status: 400 });
    }
    const aiRl = await rateLimit(`admin:og-ai:${session.user.name}`, 10, 60 * 1000);
    if (!aiRl.allowed) {
      return NextResponse.json(
        { error: "AI generation rate limited. Wait a moment." },
        { status: 429 }
      );
    }

    const anthropic = new Anthropic();
    const currentConfig = config || {};

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2000,
      messages: [
        {
          role: "user",
          content: `You are an OG image designer for NEXUS Intelligence, a geopolitical-market signal platform. The OG image is 1200x630px, rendered with next/og ImageResponse (React inline styles only, no CSS classes).

Current config:
${JSON.stringify(currentConfig, null, 2)}

The config schema:
{
  "title": string,           // Main headline
  "subtitle": string,        // Description text
  "label": string,           // Small label above title (e.g. "Signal Intelligence")
  "topBar": string,          // Top bar text (e.g. "NEXUS / Intelligence Platform")
  "tags": [{tag: string, color: string}],  // Signal layer tags
  "accentColor": string,     // Primary accent (hex)
  "backgroundColor": string, // Background (hex)
  "backgroundImage": string, // Background image URL (empty string for none)
  "backgroundOverlay": number, // Dark overlay opacity on background image (0-1)
  "gradientEnabled": boolean,  // Use gradient background instead of solid
  "gradientFrom": string,     // Gradient start color (hex)
  "gradientTo": string,       // Gradient end color (hex)
  "gradientAngle": number,    // Gradient angle in degrees (0-360)
  "titleColor": string,      // Title text color (hex)
  "subtitleColor": string,   // Subtitle text color (hex)
  "labelColor": string,      // Label text color (hex)
  "topBarColor": string,     // Top bar text color (hex)
  "bottomBarColor": string,  // Bottom bar text color (hex)
  "showGrid": boolean,       // Show grid overlay
  "showAccentLine": boolean, // Show left accent line
  "showRadar": boolean,      // Show radar graphic
  "gridSpacing": number,     // Grid spacing in px
  "gridOpacity": number,     // Grid line opacity (0-1)
  "bottomLeft": string,      // Bottom left text
  "bottomRight": string,     // Bottom right text
  "titleSize": number,       // Title font size (28-80)
  "titleWeight": number,     // Title font weight (400-900)
  "subtitleSize": number,    // Subtitle font size (10-28)
  "labelSize": number,       // Label font size (10-20)
  "tagSize": number,         // Tag font size (9-18)
  "contentPaddingLeft": number, // Left padding for content area in px (60-200)
  "radarColor": string,      // Radar icon color (hex)
  "radarOpacity": number,    // Radar icon opacity (0-0.4)
  "radarSize": number,       // Radar icon size in px (200-600)
}

User request: ${prompt}

Respond with ONLY a valid JSON object matching the config schema above. Include all fields. Make the design look professional, dark-themed, and aligned with an intelligence platform aesthetic. Do not include any explanation, just the JSON.`,
        },
      ],
    });

    const text = message.content[0].type === "text" ? message.content[0].text : "";
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        return NextResponse.json({ error: "Failed to parse AI response" }, { status: 500 });
      }
      const generated = sanitizeConfig(JSON.parse(jsonMatch[0]));
      if (!generated) {
        return NextResponse.json({ error: "AI returned invalid config" }, { status: 500 });
      }
      return NextResponse.json({ config: generated });
    } catch {
      return NextResponse.json({ error: "Failed to parse AI response" }, { status: 500 });
    }
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
