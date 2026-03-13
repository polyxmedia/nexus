import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth";
import { db, schema } from "@/lib/db";
import { eq, desc } from "drizzle-orm";
import { searchChannels, getChannelDetails } from "@/lib/youtube";
import { sendEmail } from "@/lib/email";
import { validateOrigin } from "@/lib/security/csrf";
import { rateLimit } from "@/lib/rate-limit";
import Anthropic from "@anthropic-ai/sdk";

async function isAdmin(): Promise<string | null> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.name) return null;
  const rows = await db
    .select()
    .from(schema.settings)
    .where(eq(schema.settings.key, `user:${session.user.name}`));
  if (rows.length === 0) return null;
  const userData = JSON.parse(rows[0].value);
  return userData.role === "admin" ? session.user.name : null;
}

// GET — list prospects or search YouTube
export async function GET(request: NextRequest) {
  const admin = await isAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const url = new URL(request.url);
  const action = url.searchParams.get("action");

  try {
    // Search YouTube channels
    if (action === "search") {
      const query = url.searchParams.get("q");
      if (!query) return NextResponse.json({ error: "Missing search query" }, { status: 400 });

      const rl = await rateLimit(`partnerships:search:${admin}`, 10, 60 * 1000);
      if (!rl.allowed) {
        return NextResponse.json({ error: "Too many searches" }, { status: 429 });
      }

      const channels = await searchChannels(query, 10);
      return NextResponse.json({ channels });
    }

    // Get outreach history for a prospect
    if (action === "outreach") {
      const prospectId = url.searchParams.get("prospectId");
      if (!prospectId) return NextResponse.json({ error: "Missing prospectId" }, { status: 400 });
      const outreach = await db
        .select()
        .from(schema.partnerOutreach)
        .where(eq(schema.partnerOutreach.prospectId, parseInt(prospectId, 10)))
        .orderBy(desc(schema.partnerOutreach.createdAt));
      return NextResponse.json({ outreach });
    }

    // List all prospects
    const prospects = await db
      .select()
      .from(schema.partnerProspects)
      .orderBy(desc(schema.partnerProspects.createdAt));

    return NextResponse.json({ prospects });
  } catch (err) {
    console.error("[partnerships] GET error:", err);
    return NextResponse.json({ error: "Failed to fetch data" }, { status: 500 });
  }
}

// POST — add prospect, draft email, send email
export async function POST(request: NextRequest) {
  const csrfError = validateOrigin(request);
  if (csrfError) return NextResponse.json({ error: csrfError }, { status: 403 });

  const admin = await isAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const body = await request.json();
    const { action } = body;

    // Add a YouTube channel as a prospect
    if (action === "add_prospect") {
      const { channelId } = body;
      if (!channelId) return NextResponse.json({ error: "Missing channelId" }, { status: 400 });

      // Check if already exists
      const existing = await db
        .select()
        .from(schema.partnerProspects)
        .where(eq(schema.partnerProspects.channelId, channelId));
      if (existing.length > 0) {
        return NextResponse.json({ error: "Channel already added", prospect: existing[0] }, { status: 409 });
      }

      // Fetch fresh channel data
      const channels = await getChannelDetails([channelId]);
      if (channels.length === 0) {
        return NextResponse.json({ error: "Channel not found" }, { status: 404 });
      }

      const ch = channels[0];
      const [prospect] = await db
        .insert(schema.partnerProspects)
        .values({
          channelId: ch.channelId,
          channelName: ch.channelName,
          channelUrl: ch.channelUrl,
          subscriberCount: ch.subscriberCount,
          videoCount: ch.videoCount,
          description: ch.description,
          thumbnailUrl: ch.thumbnailUrl,
          contactEmail: ch.contactEmail,
        })
        .returning();

      return NextResponse.json({ prospect });
    }

    // Update prospect (email, status, notes, commission rate)
    if (action === "update_prospect") {
      const { id, contactEmail, status, notes, commissionRate } = body;
      if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

      const updates: Record<string, unknown> = { updatedAt: new Date().toISOString() };
      if (contactEmail !== undefined) updates.contactEmail = contactEmail;
      if (status !== undefined) updates.status = status;
      if (notes !== undefined) updates.notes = notes;
      if (commissionRate !== undefined) updates.commissionRate = commissionRate;

      const [updated] = await db
        .update(schema.partnerProspects)
        .set(updates)
        .where(eq(schema.partnerProspects.id, id))
        .returning();

      return NextResponse.json({ prospect: updated });
    }

    // Draft an outreach email using AI + voice substrate
    if (action === "draft_email") {
      const { prospectId, context } = body;
      if (!prospectId) return NextResponse.json({ error: "Missing prospectId" }, { status: 400 });

      const rl = await rateLimit(`partnerships:draft:${admin}`, 10, 60 * 1000);
      if (!rl.allowed) {
        return NextResponse.json({ error: "Too many draft requests" }, { status: 429 });
      }

      const [prospect] = await db
        .select()
        .from(schema.partnerProspects)
        .where(eq(schema.partnerProspects.id, prospectId));

      if (!prospect) return NextResponse.json({ error: "Prospect not found" }, { status: 404 });

      const apiKey = process.env.ANTHROPIC_API_KEY;
      if (!apiKey) return NextResponse.json({ error: "AI not configured" }, { status: 500 });

      const client = new Anthropic({ apiKey });

      const voiceSubstrate = `You are writing as Andre Figueira. Follow these voice rules exactly:
- Direct, casual, soothing authority. Write like speech, chaining thoughts with commas.
- Warm without being soft, confident without arrogance.
- Use contractions (don't, won't, it's, you'd).
- Use filler words naturally (just, really, actually).
- NEVER use em dashes. Use commas instead.
- NEVER use formulaic antithesis ("it's not X, it's Y").
- NEVER use ALL CAPS, exclamation marks, or hollow hype words.
- NEVER use "Let's dive in", "unpack", "break down", "game-changer", "Here's the thing".
- American spelling (color, behavior).
- Open with the point, not a warmup.
- End with a final thought, not a summary or call to action.
- Use ellipsis (...) for natural pauses.`;

      const prompt = `Write a partnership outreach email from Andre Figueira to ${prospect.channelName}.

Channel info:
- Name: ${prospect.channelName}
- Subscribers: ${prospect.subscriberCount?.toLocaleString() || "unknown"}
- Description: ${prospect.description || "No description available"}
- URL: ${prospect.channelUrl || "unknown"}

About NEXUS (what Andre built):
- Live geopolitical-financial intelligence platform
- Real-time vessel tracking through Hormuz and other chokepoints
- Game theory modeling on active conflict scenarios (US-Iran, China-Taiwan, Russia-Ukraine)
- Bayesian signal synthesis across OSINT, maritime, and market data
- Live oil/gold/defense signals with position-level recommendations
- Andre is a senior software engineer who built the entire platform himself
- It called the Hormuz closure before it happened
- 3x leveraged oil position entered at £54 from a NEXUS thesis, currently well in profit
- Referral commission: 20% recurring on all sign-ups

The deal: Sponsorship with a recurring segment or mention that fits their content naturally. 20% recurring commission on all sign-ups through their audience. Offer to send a 5-minute walkthrough video first.

${context ? `Additional context from Andre: ${context}` : ""}

Write ONLY the email body (no subject line, no "Subject:" prefix). The email should feel personal to this specific channel, not generic. Reference something specific about their content or audience. Keep it concise, around 200 words.

Sign off with just "Andre" at the end.`;

      const response = await client.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1024,
        system: voiceSubstrate,
        messages: [{ role: "user", content: prompt }],
      });

      const emailBody = response.content
        .filter((b): b is Anthropic.TextBlock => b.type === "text")
        .map((b) => b.text)
        .join("");

      // Generate subject line
      const subjectResponse = await client.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 100,
        system: voiceSubstrate,
        messages: [
          {
            role: "user",
            content: `Write a short, direct email subject line for this partnership outreach email to ${prospect.channelName}. No quotes, no emojis, no hype. Just a clear subject that would get opened. Output ONLY the subject line, nothing else.`,
          },
        ],
      });

      const subject = subjectResponse.content
        .filter((b): b is Anthropic.TextBlock => b.type === "text")
        .map((b) => b.text)
        .join("")
        .trim();

      return NextResponse.json({ subject, body: emailBody });
    }

    // Save a draft
    if (action === "save_draft") {
      const { prospectId, subject, body: emailBody, toEmail } = body;
      if (!prospectId || !subject || !emailBody || !toEmail) {
        return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
      }

      const [draft] = await db
        .insert(schema.partnerOutreach)
        .values({
          prospectId,
          subject,
          body: emailBody,
          toEmail,
          status: "draft",
        })
        .returning();

      return NextResponse.json({ draft });
    }

    // Send email
    if (action === "send_email") {
      const { outreachId, prospectId, subject, body: emailBody, toEmail } = body;
      if (!subject || !emailBody || !toEmail) {
        return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
      }

      const rl = await rateLimit(`partnerships:send:${admin}`, 5, 60 * 1000);
      if (!rl.allowed) {
        return NextResponse.json({ error: "Too many sends" }, { status: 429 });
      }

      // Send via Resend
      const html = emailBody
        .split("\n")
        .map((line: string) => (line.trim() === "" ? "<br/>" : `<p style="margin:0 0 12px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:15px;line-height:1.6;color:#1a1a1a;">${line}</p>`))
        .join("");

      await sendEmail({
        to: toEmail,
        subject,
        html: `<div style="max-width:600px;margin:0 auto;padding:24px;">${html}</div>`,
        text: emailBody,
        replyTo: "andre@nexushq.xyz",
        type: "partnership_outreach",
      });

      const now = new Date().toISOString();

      // Update or create outreach record
      if (outreachId) {
        await db
          .update(schema.partnerOutreach)
          .set({ status: "sent", sentAt: now, subject, body: emailBody, toEmail })
          .where(eq(schema.partnerOutreach.id, outreachId));
      } else {
        await db.insert(schema.partnerOutreach).values({
          prospectId: prospectId,
          subject,
          body: emailBody,
          toEmail,
          status: "sent",
          sentAt: now,
        });
      }

      // Update prospect status
      if (prospectId) {
        await db
          .update(schema.partnerProspects)
          .set({ status: "contacted", updatedAt: now })
          .where(eq(schema.partnerProspects.id, prospectId));
      }

      return NextResponse.json({ success: true });
    }

    // Delete prospect
    if (action === "delete_prospect") {
      const { id } = body;
      if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
      await db.delete(schema.partnerProspects).where(eq(schema.partnerProspects.id, id));
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (err) {
    console.error("[partnerships] POST error:", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
