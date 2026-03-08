import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/auth";
import { db, schema } from "@/lib/db";
import { and, eq, gt, sql as drizzleSql } from "drizzle-orm";
import Anthropic from "@anthropic-ai/sdk";
import { TOOL_DEFINITIONS, executeTool } from "@/lib/chat/tools";
import { TOOL_TIERS } from "@/lib/auth/tier-config";
import { loadPrompt } from "@/lib/prompts/loader";
import { getChatModel } from "@/lib/ai/model";
import { getUserTier } from "@/lib/auth/require-tier";
import { rateLimit } from "@/lib/rate-limit";

// ── Conversation compression ──
// When a session exceeds COMPRESS_THRESHOLD messages, older messages are
// summarised and stored as a rolling summary. Only recent messages + the
// summary are sent to the API, keeping context windows manageable.
const COMPRESS_THRESHOLD = 20; // total messages before compression kicks in
const KEEP_RECENT = 8;          // messages to retain verbatim after compression

type DbMessage = { id: number; role: string; content: string; toolUses: string | null; toolResults: string | null };

const JIANG_MODE_ADDENDUM = `

## NARRATIVE SYNTHESIS MODE (ACTIVE)

Convergence scoring is DISABLED. Do not reference convergence scores, intensity ratings, or quantitative signal weights.

Instead, focus entirely on:
- **Actor psychology**: What do key actors believe? What narratives are they operating under?
- **Belief-driven scenario modeling**: Model outcomes based on what actors think will happen, not what data says
- **Calendar significance through actor lens**: Calendar events matter only insofar as specific actors behave differently around them
- **Narrative synthesis**: Connect events through narrative threads, not numerical convergence
- **Scripture/doctrinal analysis**: When relevant, analyze how religious or ideological texts inform actor decisions

When using tools, still gather data, but interpret it through the narrative/belief lens rather than the quantitative convergence framework.`;

async function getSystemPromptWithMode(): Promise<string> {
  const basePrompt = await loadPrompt("chat_system");

  try {
    const jiangRow = await db
      .select()
      .from(schema.settings)
      .where(eq(schema.settings.key, "jiang_mode"));
    if (jiangRow[0]?.value === "true") {
      return basePrompt + JIANG_MODE_ADDENDUM;
    }
  } catch {
    // Settings not available, use base prompt
  }

  return basePrompt;
}

async function maybeCompressSession(
  client: Anthropic,
  sessionId: number,
  currentSummary: string | null,
  summarizedUntilId: number | null
): Promise<void> {
  // Count total messages in session
  const countResult = await db
    .select({ count: drizzleSql<number>`count(*)` })
    .from(schema.chatMessages)
    .where(eq(schema.chatMessages.sessionId, sessionId));
  const total = Number(countResult[0]?.count ?? 0);

  if (total <= COMPRESS_THRESHOLD) return;

  // Get all messages to determine the cutoff
  const allMsgs = await db
    .select()
    .from(schema.chatMessages)
    .where(eq(schema.chatMessages.sessionId, sessionId))
    .orderBy(schema.chatMessages.id);

  // Messages to summarise: everything except the last KEEP_RECENT
  const toSummarise = allMsgs.slice(0, allMsgs.length - KEEP_RECENT);
  if (toSummarise.length === 0) return;

  const lastSummarisedId = toSummarise[toSummarise.length - 1].id;

  // Already compressed up to this point
  if (summarizedUntilId && lastSummarisedId <= summarizedUntilId) return;

  // Build a readable transcript of messages to summarise
  const transcript = toSummarise
    .map((m) => {
      const role = m.role === "user" ? "User" : "Assistant";
      const text = m.content || "(tool interaction)";
      return `${role}: ${text}`;
    })
    .join("\n\n");

  const priorContext = currentSummary
    ? `Prior summary:\n${currentSummary}\n\n---\n\nAdditional messages to incorporate:\n${transcript}`
    : transcript;

  try {
    // Use a fast model for compression — this is background work, not user-facing
    const res = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1024,
      system: "You are a precise conversation summariser. Produce a dense, factual summary of the conversation below, preserving all key facts, decisions, data points, market tickers, and analytical conclusions. Write in third person present tense. Be thorough but concise — this summary replaces the original messages as context for future turns.",
      messages: [{ role: "user", content: priorContext }],
    });

    const newSummary = res.content[0].type === "text" ? res.content[0].text : currentSummary ?? "";

    // Persist summary and compression marker
    await db.execute(drizzleSql`
      UPDATE chat_sessions
      SET summary = ${newSummary}, summarized_until_id = ${lastSummarisedId}
      WHERE id = ${sessionId}
    `);
  } catch (err) {
    console.error("Compression failed (non-blocking):", err);
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const authSession = await getServerSession(authOptions);
  if (!authSession?.user?.name) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const username = authSession.user.name;

  const { sessionId } = await params;
  try {
    const sessionRows = await db.select().from(schema.chatSessions).where(eq(schema.chatSessions.uuid, sessionId));
    const chatSession = sessionRows[0];
    if (!chatSession) return NextResponse.json({ error: "Session not found" }, { status: 404 });
    // Allow access to own sessions or legacy sessions (before user scoping was added)
    if (chatSession.userId !== username && chatSession.userId !== "legacy") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const messages = await db.select().from(schema.chatMessages).where(eq(schema.chatMessages.sessionId, chatSession.id)).orderBy(schema.chatMessages.createdAt);
    return NextResponse.json({ session: chatSession, messages });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const authSession = await getServerSession(authOptions);
  if (!authSession?.user?.name) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const username = authSession.user.name;

  // Tier-based message rate limiting
  const tierInfo = await getUserTier();
  if (!tierInfo.isAdmin && tierInfo.tierLevel === 0) {
    return NextResponse.json(
      { error: "Chat requires an active subscription", upgrade: true, requiredTier: "analyst" },
      { status: 403 }
    );
  }
  if (!tierInfo.isAdmin && tierInfo.limits?.chatMessages && tierInfo.limits.chatMessages > 0) {
    const limit = tierInfo.limits.chatMessages;
    const rl = rateLimit(`chat:${username}`, limit, 24 * 60 * 60 * 1000); // daily window
    if (!rl.allowed) {
      return NextResponse.json(
        { error: `Daily message limit reached (${limit}/day). Upgrade for unlimited.`, upgrade: true, requiredTier: "operator", remaining: 0 },
        { status: 429 }
      );
    }
  }

  // Filter chat tools by user's tier level
  const TIER_LEVELS: Record<string, number> = { free: 0, analyst: 1, operator: 2, institution: 3 };
  const userTierLevel = tierInfo.isAdmin ? 3 : tierInfo.tierLevel;
  const filteredTools = TOOL_DEFINITIONS.filter((tool) => {
    const requiredTier = TOOL_TIERS[tool.name] || "analyst";
    const requiredLevel = TIER_LEVELS[requiredTier] ?? 1;
    return userTierLevel >= requiredLevel;
  });

  const { sessionId } = await params;
  const body = await req.json();
  const userMessage = (body.message as string) || "";
  const attachedFiles = body.files as Array<{ name: string; type: string; data: string }> | undefined;
  if (!userMessage?.trim() && !attachedFiles?.length) return NextResponse.json({ error: "Message required" }, { status: 400 });

  const sessionRows = await db.select().from(schema.chatSessions).where(eq(schema.chatSessions.uuid, sessionId));
  const session = sessionRows[0];
  if (!session) return NextResponse.json({ error: "Session not found" }, { status: 404 });
  if (session.userId !== username && session.userId !== "legacy") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const id = session.id;

  const apiKeyRows = await db.select().from(schema.settings).where(eq(schema.settings.key, "anthropic_api_key"));
  const apiKeySetting = apiKeyRows[0];
  const apiKey = apiKeySetting?.value || process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "Anthropic API key not configured" }, { status: 500 });

  // Build DB-stored content: text + file references (no binary data in DB)
  const dbContent = [
    userMessage,
    ...(attachedFiles || []).map((f) =>
      f.type.startsWith("image/") ? `[Image: ${f.name}]` : `[File: ${f.name}]`
    ),
  ].filter(Boolean).join("\n");

  await db.insert(schema.chatMessages).values({ sessionId: id, role: "user", content: dbContent || "(files attached)" });

  if (session.title === "New Chat") {
    const title = userMessage.slice(0, 50) + (userMessage.length > 50 ? "..." : "");
    await db.update(schema.chatSessions).set({ title, updatedAt: new Date().toISOString() }).where(eq(schema.chatSessions.id, id));
  } else {
    await db.update(schema.chatSessions).set({ updatedAt: new Date().toISOString() }).where(eq(schema.chatSessions.id, id));
  }

  // Load full session row (includes summary/summarized_until_id from the extended schema)
  const fullSession = await db.execute(drizzleSql`SELECT summary, summarized_until_id FROM chat_sessions WHERE id = ${id}`);
  const sessionMeta = fullSession.rows[0] as { summary: string | null; summarized_until_id: number | null } | undefined;
  const sessionSummary = sessionMeta?.summary ?? null;
  const summarizedUntilId = sessionMeta?.summarized_until_id ?? null;

  // Only fetch messages that haven't been compressed (or all if no compression yet)
  const dbMessages: DbMessage[] = summarizedUntilId
    ? await db.select().from(schema.chatMessages)
        .where(and(eq(schema.chatMessages.sessionId, id), gt(schema.chatMessages.id, summarizedUntilId)))
        .orderBy(schema.chatMessages.id)
    : await db.select().from(schema.chatMessages)
        .where(eq(schema.chatMessages.sessionId, id))
        .orderBy(schema.chatMessages.id);

  // Replace the last stored user message content with the rich version (including file content)
  // buildAnthropicMessages reads from DB, so we patch the last user message after building
  const anthropicMessages = buildAnthropicMessages(dbMessages, sessionSummary);

  // Attach file content blocks to the last user message in the API payload
  if (attachedFiles?.length) {
    const last = anthropicMessages[anthropicMessages.length - 1];
    if (last?.role === "user") {
      const richContent: Anthropic.ContentBlockParam[] = [];

      // Add file blocks first
      for (const f of attachedFiles) {
        if (f.type.startsWith("image/")) {
          const mediaType = f.type as "image/jpeg" | "image/png" | "image/gif" | "image/webp";
          richContent.push({ type: "image", source: { type: "base64", media_type: mediaType, data: f.data } });
        } else {
          // Text/code file — include inline
          richContent.push({ type: "text", text: `[File: ${f.name}]\n\`\`\`\n${f.data}\n\`\`\`` });
        }
      }

      // Add the text message (could be empty if user only attached files)
      if (userMessage.trim()) {
        richContent.push({ type: "text", text: userMessage });
      }

      last.content = richContent;
    }
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      function sendEvent(data: Record<string, unknown>) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      }
      try {
        const client = new Anthropic({ apiKey });
        let messages = [...anthropicMessages];
        let fullText = "";
        const allToolUses: Array<{ toolName: string; toolUseId: string; input: unknown }> = [];
        const allToolResults: Array<{ toolName: string; toolUseId: string; result: unknown }> = [];
        let continueLoop = true;
        while (continueLoop) {
          const response = await client.messages.create({
            model: await getChatModel(),
            max_tokens: 4096,
            system: await getSystemPromptWithMode(),
            tools: filteredTools,
            messages,
            stream: true,
          });
          const pendingTools: Array<{ id: string; name: string; inputJson: string }> = [];
          let currentToolIndex = -1;
          let iterationText = "";
          let stopReason = "";
          for await (const event of response) {
            if (event.type === "content_block_start") {
              if (event.content_block.type === "tool_use") {
                pendingTools.push({ id: event.content_block.id, name: event.content_block.name, inputJson: "" });
                currentToolIndex = pendingTools.length - 1;
                sendEvent({ type: "tool_start", toolName: event.content_block.name, toolUseId: event.content_block.id });
              }
            } else if (event.type === "content_block_delta") {
              if (event.delta.type === "text_delta") {
                iterationText += event.delta.text;
                fullText += event.delta.text;
                sendEvent({ type: "text_delta", delta: event.delta.text });
              } else if (event.delta.type === "input_json_delta") {
                if (currentToolIndex >= 0) pendingTools[currentToolIndex].inputJson += event.delta.partial_json;
              }
            } else if (event.type === "message_delta") {
              stopReason = event.delta.stop_reason || "";
            }
          }
          if (stopReason === "tool_use" && pendingTools.length > 0) {
            const assistantContent: Anthropic.ContentBlockParam[] = [];
            if (iterationText) assistantContent.push({ type: "text" as const, text: iterationText });
            const toolResultContent: Anthropic.ToolResultBlockParam[] = [];
            for (const tool of pendingTools) {
              let parsedInput: Record<string, unknown> = {};
              try { parsedInput = tool.inputJson ? JSON.parse(tool.inputJson) : {}; } catch { parsedInput = {}; }
              assistantContent.push({ type: "tool_use" as const, id: tool.id, name: tool.name, input: parsedInput });
              allToolUses.push({ toolName: tool.name, toolUseId: tool.id, input: parsedInput });
              // Server-side tool tier enforcement (belt + suspenders)
              const toolRequiredTier = TOOL_TIERS[tool.name] || "analyst";
              const toolRequiredLevel = TIER_LEVELS[toolRequiredTier] ?? 1;
              if (userTierLevel < toolRequiredLevel) {
                const blocked = { error: `${tool.name} requires ${toolRequiredTier} tier`, upgrade: true, requiredTier: toolRequiredTier };
                allToolResults.push({ toolName: tool.name, toolUseId: tool.id, result: blocked });
                sendEvent({ type: "tool_result", toolName: tool.name, toolUseId: tool.id, result: blocked });
                toolResultContent.push({ type: "tool_result" as const, tool_use_id: tool.id, content: JSON.stringify(blocked) });
                continue;
              }
              const toolResult = await executeTool(tool.name, parsedInput);
              allToolResults.push({ toolName: tool.name, toolUseId: tool.id, result: toolResult });
              sendEvent({ type: "tool_result", toolName: tool.name, toolUseId: tool.id, result: toolResult });
              toolResultContent.push({ type: "tool_result" as const, tool_use_id: tool.id, content: JSON.stringify(toolResult) });
            }
            messages = [...messages, { role: "assistant" as const, content: assistantContent }, { role: "user" as const, content: toolResultContent }];
            fullText = "";
          } else {
            continueLoop = false;
          }
        }
        await db.insert(schema.chatMessages).values({
          sessionId: id, role: "assistant", content: fullText,
          toolUses: allToolUses.length > 0 ? JSON.stringify(allToolUses) : null,
          toolResults: allToolResults.length > 0 ? JSON.stringify(allToolResults) : null,
        });

        // Non-blocking compression check after response is stored
        maybeCompressSession(client, id, sessionSummary, summarizedUntilId).catch((err) => {
          console.error("Compression background error:", err);
        });

        // Generate follow-up suggestions
        try {
          const sugResponse = await client.messages.create({
            model: await getChatModel(),
            max_tokens: 300,
            system: "Generate 3-4 short follow-up prompts the user might want to explore next based on this conversation. Return ONLY a JSON array of strings, nothing else. Each prompt should be concise (under 60 chars), actionable, and naturally continue the conversation. Do not wrap in markdown code blocks.",
            messages: [
              { role: "user", content: userMessage },
              { role: "assistant", content: fullText || "(tool results provided above)" },
              { role: "user", content: "Generate follow-up suggestions." },
            ],
          });
          const sugText = sugResponse.content[0].type === "text" ? sugResponse.content[0].text : "";
          const jsonMatch = sugText.match(/\[[\s\S]*\]/);
          if (jsonMatch) {
            const suggestions = JSON.parse(jsonMatch[0]) as string[];
            if (Array.isArray(suggestions) && suggestions.length > 0) {
              sendEvent({ type: "suggestions", suggestions: suggestions.slice(0, 4) });
            }
          }
        } catch {
          // Suggestions are best-effort, don't block the response
        }

        sendEvent({ type: "done" });
        controller.close();
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Stream error";
        sendEvent({ type: "error", message });
        controller.close();
      }
    },
  });
  return new Response(stream, { headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive" } });
}

function buildAnthropicMessages(
  dbMessages: Array<{ role: string; content: string; toolUses: string | null; toolResults: string | null }>,
  summary?: string | null
): Anthropic.MessageParam[] {
  const result: Anthropic.MessageParam[] = [];

  // Prepend compressed context as a synthetic exchange so the model has full continuity
  if (summary) {
    result.push({ role: "user", content: `[Earlier conversation summary — treat as established context]\n\n${summary}` });
    result.push({ role: "assistant", content: "Understood. I have the context from our earlier conversation and will continue from there." });
  }

  for (const msg of dbMessages) {
    if (msg.role === "user") {
      const lastMsg = result[result.length - 1];
      if (lastMsg && lastMsg.role === "user") {
        const existingContent = Array.isArray(lastMsg.content) ? lastMsg.content : [{ type: "text" as const, text: lastMsg.content as string }];
        existingContent.push({ type: "text" as const, text: msg.content });
        lastMsg.content = existingContent;
      } else {
        result.push({ role: "user", content: msg.content });
      }
    } else if (msg.role === "assistant") {
      if (msg.toolUses && msg.toolResults) {
        const toolUses = JSON.parse(msg.toolUses) as Array<{ toolName: string; toolUseId: string; input: unknown }>;
        const toolResults = JSON.parse(msg.toolResults) as Array<{ toolName: string; toolUseId: string; result: unknown }>;
        const assistantContent: Anthropic.ContentBlockParam[] = [];
        if (msg.content) assistantContent.push({ type: "text", text: msg.content });
        for (const tu of toolUses) assistantContent.push({ type: "tool_use", id: tu.toolUseId, name: tu.toolName, input: tu.input as Record<string, unknown> });
        result.push({ role: "assistant", content: assistantContent });
        const toolResultContent: Anthropic.ToolResultBlockParam[] = toolResults.map((tr) => ({ type: "tool_result" as const, tool_use_id: tr.toolUseId, content: JSON.stringify(tr.result) }));
        result.push({ role: "user", content: toolResultContent });
      } else {
        result.push({ role: "assistant", content: msg.content });
      }
    }
  }
  return result;
}
