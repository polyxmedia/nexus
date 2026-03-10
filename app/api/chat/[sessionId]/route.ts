import { NextRequest, NextResponse } from "next/server";
import { getEffectiveUsername } from "@/lib/auth/effective-user";
import { db, schema } from "@/lib/db";
import { and, eq, gt, sql as drizzleSql } from "drizzle-orm";
import Anthropic from "@anthropic-ai/sdk";
import { TOOL_DEFINITIONS, executeTool, type ToolContext } from "@/lib/chat/tools";
import { TOOL_TIERS } from "@/lib/auth/tier-config";
import { loadPrompt } from "@/lib/prompts/loader";
import { getChatModel } from "@/lib/ai/model";
import { getUserTier } from "@/lib/auth/require-tier";
import { rateLimit } from "@/lib/rate-limit";
import { hasCredits, debitCredits, calculateCredits } from "@/lib/credits";
import { buildMemoryContext, touchMemories } from "@/lib/memory/engine";

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

async function getSystemPromptWithMode(username?: string, projectId?: number | null): Promise<string> {
  let prompt = await loadPrompt("chat_system");

  try {
    const jiangRow = await db
      .select()
      .from(schema.settings)
      .where(eq(schema.settings.key, "jiang_mode"));
    if (jiangRow[0]?.value === "true") {
      prompt += JIANG_MODE_ADDENDUM;
    }
  } catch {
    // Settings not available, use base prompt
  }

  // Inject user memory context
  if (username) {
    try {
      const { context: memoryContext, memoryIds } = await buildMemoryContext(username);
      if (memoryContext) {
        prompt += "\n\n" + memoryContext;
        // Touch memories in background (don't block)
        touchMemories(memoryIds).catch((err) => console.error("[Chat] touch memories failed:", err));
      }
    } catch {
      // Memory not critical
    }
  }

  // Inject project instructions if session belongs to a project
  if (projectId) {
    try {
      const projectRows = await db
        .select()
        .from(schema.chatProjects)
        .where(eq(schema.chatProjects.id, projectId));
      const project = projectRows[0];
      if (project?.instructions) {
        prompt += `\n\n## Project Instructions: ${project.name}\n\n${project.instructions}`;
      }
    } catch {
      // Project instructions not critical
    }
  }

  return prompt;
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
  const username = await getEffectiveUsername();
  if (!username) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { sessionId } = await params;
  try {
    const sessionRows = await db.select().from(schema.chatSessions).where(eq(schema.chatSessions.uuid, sessionId));
    const chatSession = sessionRows[0];
    if (!chatSession) return NextResponse.json({ error: "Session not found" }, { status: 404 });
    if (chatSession.userId !== username) {
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
  const username = await getEffectiveUsername();
  if (!username) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

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
  const requestedModel = body.model as string | undefined;
  if (!userMessage?.trim() && !attachedFiles?.length) return NextResponse.json({ error: "Message required" }, { status: 400 });

  // Input validation: max message length (16K chars)
  if (userMessage.length > 16_000) {
    return NextResponse.json({ error: "Message too long. Maximum 16,000 characters." }, { status: 400 });
  }
  // Input validation: max 5 file attachments, 10MB each
  if (attachedFiles && attachedFiles.length > 5) {
    return NextResponse.json({ error: "Maximum 5 file attachments allowed." }, { status: 400 });
  }
  if (attachedFiles?.some((f) => f.data && f.data.length > 10 * 1024 * 1024)) {
    return NextResponse.json({ error: "File attachment too large. Maximum 10MB per file." }, { status: 400 });
  }

  const sessionRows = await db.select().from(schema.chatSessions).where(eq(schema.chatSessions.uuid, sessionId));
  const session = sessionRows[0];
  if (!session) return NextResponse.json({ error: "Session not found" }, { status: 404 });
  if (session.userId !== username) {
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

  // ── Pre-flight: auto-gather intelligence for forecasting questions ──
  // Detects probability/prediction questions and pre-runs core tools so the
  // analyst has data injected into context before responding.
  const forecastingPattern = /\b(probability|probabilit|forecast|predict|will .+ (happen|occur|pass|succeed|fail|win|lose)|chances? of|likelihood|what are the odds|brier|yes or no.*prob|how likely|percent chance|base rate)\b/i;
  const isForecastingQuestion = forecastingPattern.test(userMessage);

  let preflightContext = "";
  if (isForecastingQuestion) {
    try {
      const preflightResults = await Promise.allSettled([
        executeTool("get_signals", {}),
        executeTool("get_change_points", {}),
        executeTool("search_knowledge", { query: userMessage.slice(0, 200) }),
        executeTool("search_historical_parallels", { query: userMessage.slice(0, 200) }),
        executeTool("get_game_theory", {}),
        executeTool("run_bayesian_analysis", {}),
        executeTool("get_macro_data", {}),
      ]);

      const labels = ["SIGNALS", "CHANGE_POINTS", "KNOWLEDGE_BANK", "HISTORICAL_PARALLELS", "GAME_THEORY", "BAYESIAN_ANALYSIS", "MACRO_DATA"];
      const sections: string[] = [];
      for (let i = 0; i < preflightResults.length; i++) {
        const r = preflightResults[i];
        if (r.status === "fulfilled" && r.value) {
          const val = typeof r.value === "string" ? r.value : JSON.stringify(r.value);
          if (val.length > 10 && !val.includes('"error"')) {
            sections.push(`## ${labels[i]}\n${val.slice(0, 3000)}`);
          }
        }
      }

      if (sections.length > 0) {
        preflightContext = `\n\n## PRE-FLIGHT INTELLIGENCE (auto-gathered for forecasting question)\nThe following data was automatically retrieved. You MUST reference this data in your analysis. Do NOT re-call these tools — the data is already here. Focus on calling any ADDITIONAL tools needed (web_search, get_actor_profile, get_live_quote, get_options_flow) and then structure your Tetlock-method answer.\n\n${sections.join("\n\n")}`;
      }
    } catch (err) {
      console.error("[Chat] preflight intelligence gathering failed:", err);
    }
  }

  // Credit check before streaming
  const creditCheck = await hasCredits(username, tierInfo.isAdmin ? "institution" : tierInfo.tier, tierInfo.isAdmin);
  if (!creditCheck.allowed) {
    return NextResponse.json(
      { error: "Monthly credits exhausted. Upgrade your plan or buy more credits to continue.", upgrade: true, topup: true, creditsRemaining: 0 },
      { status: 429 }
    );
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      function sendEvent(data: Record<string, unknown>) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      }
      try {
        const client = new Anthropic({ apiKey });
        const chatModel = await getChatModel(requestedModel);
        let messages = [...anthropicMessages];
        let fullText = "";
        const allToolUses: Array<{ toolName: string; toolUseId: string; input: unknown }> = [];
        const allToolResults: Array<{ toolName: string; toolUseId: string; result: unknown }> = [];
        let continueLoop = true;
        let totalInputTokens = 0;
        let totalOutputTokens = 0;
        const requestStartTime = Date.now();
        while (continueLoop) {
          const response = await client.messages.create({
            model: chatModel,
            max_tokens: 4096,
            system: (await getSystemPromptWithMode(username, session.projectId)) + preflightContext,
            tools: filteredTools,
            messages,
            stream: true,
          });
          const pendingTools: Array<{ id: string; name: string; inputJson: string }> = [];
          let currentToolIndex = -1;
          let iterationText = "";
          let stopReason = "";
          let iterInputTokens = 0;
          let iterOutputTokens = 0;
          for await (const event of response) {
            if (event.type === "message_start") {
              iterInputTokens = event.message.usage?.input_tokens || 0;
            } else if (event.type === "content_block_start") {
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
              iterOutputTokens = event.usage?.output_tokens || 0;
            }
          }
          totalInputTokens += iterInputTokens;
          totalOutputTokens += iterOutputTokens;

          // Send live token usage update after each API call
          sendEvent({
            type: "token_usage",
            inputTokens: totalInputTokens,
            outputTokens: totalOutputTokens,
            model: chatModel,
            elapsedMs: Date.now() - requestStartTime,
            creditsUsed: calculateCredits(chatModel, totalInputTokens, totalOutputTokens),
          });

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
              const toolCtx: ToolContext = { username, sessionId: id, projectId: session.projectId };
              const toolResult = await executeTool(tool.name, parsedInput, toolCtx);
              allToolResults.push({ toolName: tool.name, toolUseId: tool.id, result: toolResult });
              sendEvent({ type: "tool_result", toolName: tool.name, toolUseId: tool.id, result: toolResult });
              toolResultContent.push({ type: "tool_result" as const, tool_use_id: tool.id, content: JSON.stringify(toolResult) });
            }
            messages = [...messages, { role: "assistant" as const, content: assistantContent }, { role: "user" as const, content: toolResultContent }];
            // Add separator between iterations so text doesn't merge (e.g. "data.Now" -> "data.\n\nNow")
            if (fullText.length > 0) {
              fullText += "\n\n";
              sendEvent({ type: "text_delta", delta: "\n\n" });
            }
          } else {
            continueLoop = false;
          }
        }
        await db.insert(schema.chatMessages).values({
          sessionId: id, role: "assistant", content: fullText,
          toolUses: allToolUses.length > 0 ? JSON.stringify(allToolUses) : null,
          toolResults: allToolResults.length > 0 ? JSON.stringify(allToolResults) : null,
        });

        // Debit credits
        const totalCredits = calculateCredits(chatModel, totalInputTokens, totalOutputTokens);
        const debitResult = await debitCredits(username, chatModel, totalInputTokens, totalOutputTokens, "chat_request", sessionId).catch(() => null);

        // Non-blocking compression check after response is stored
        maybeCompressSession(client, id, sessionSummary, summarizedUntilId).catch((err) => {
          console.error("Compression background error:", err);
        });

        // ── Meta-Analysis: validate forecasting responses ──
        // After the analyst generates a probability estimate, a separate model
        // reviews the reasoning for anchoring errors, structural mismatches,
        // missing falsification, and calibration issues. Streams as a distinct card.
        if (isForecastingQuestion && fullText.length > 200) {
          try {
            const metaResponse = await client.messages.create({
              model: "claude-haiku-4-5-20251001",
              max_tokens: 1500,
              system: `You are the NEXUS Meta-Analyst, a calibration auditor that reviews forecasting analyses for systematic errors. You are NOT the analyst — you are the red team.

Review the analyst's response and check for these specific failure modes:

1. **Anchoring on base rates with poor structural fit**: Did the analyst use a historical parallel as a base rate without checking whether the structural parameters actually match? If the parallel differs by >3x on any key dimension (scale, duration, legal authority, mechanism), flag it.

2. **Insufficient adjustment from base rate**: Did the analyst list structural differences but then barely move the probability away from the base rate? Count the major differences. If 3+, the final probability should be 15+ points from the raw base rate.

3. **Missing falsification**: Did the analyst identify what specific data would change the estimate? If not, flag it.

4. **Pre-mortem absence**: Did the analyst consider the most likely way they could be wrong? If not, run one.

5. **Hard data cross-check**: For questions involving numbers (spending, rates, prices), did the analyst verify against the most recent actual reported figures?

6. **Overconfidence/underconfidence**: Is the stated probability suspiciously round (50%, 80%, 90%) or extreme (<5% or >95%) without extraordinary evidence?

7. **Missing evidence**: What data sources were NOT consulted that could materially change the estimate?

Output format — return ONLY valid JSON:
{
  "issues_found": [{"id": "anchoring|adjustment|falsification|premortem|crosscheck|confidence|missing", "severity": "high|medium|low", "detail": "..."}],
  "suggested_adjustment": {"original_probability": 0.0, "adjusted_probability": 0.0, "reason": "..."},
  "confidence_in_adjustment": "high|medium|low",
  "missing_data": ["..."]
}

If the analysis is solid and you find no issues, return: {"issues_found": [], "suggested_adjustment": null, "confidence_in_adjustment": "low", "missing_data": []}

Be ruthlessly honest. The whole point is to catch errors the analyst missed.`,
              messages: [
                { role: "user", content: `Original question: ${userMessage.slice(0, 1000)}\n\nAnalyst's response:\n${fullText.slice(0, 6000)}` },
              ],
            });

            const metaText = metaResponse.content[0].type === "text" ? metaResponse.content[0].text : "";
            const metaJsonMatch = metaText.match(/\{[\s\S]*\}/);
            if (metaJsonMatch) {
              try {
                const metaResult = JSON.parse(metaJsonMatch[0]);
                if (metaResult.issues_found?.length > 0 || metaResult.suggested_adjustment) {
                  sendEvent({ type: "meta_analysis", result: metaResult });

                  // Also append to the stored message for history
                  const metaSummary = `\n\n---\n**Meta-Analysis** (calibration audit):\n${metaResult.issues_found?.map((i: { severity: string; id: string; detail: string }) => `- [${i.severity.toUpperCase()}] ${i.id}: ${i.detail}`).join("\n") || "No issues found."}\n${metaResult.suggested_adjustment ? `\nSuggested adjustment: ${(metaResult.suggested_adjustment.original_probability * 100).toFixed(0)}% -> ${(metaResult.suggested_adjustment.adjusted_probability * 100).toFixed(0)}% (${metaResult.suggested_adjustment.reason})` : ""}`;
                  await db.update(schema.chatMessages)
                    .set({ content: fullText + metaSummary })
                    .where(and(eq(schema.chatMessages.sessionId, id), eq(schema.chatMessages.role, "assistant")));
                }
              } catch (err) {
                console.error("[Chat] meta-analysis JSON parse failed:", err);
              }
            }

            if (metaResponse.usage) {
              debitCredits(username, "claude-haiku-4-5-20251001", metaResponse.usage.input_tokens, metaResponse.usage.output_tokens, "meta_analysis", sessionId).catch((err) => console.error("[Chat] debit meta-analysis credits failed:", err));
            }
          } catch (err) {
            console.error("[Chat] meta-analysis failed:", err);
          }
        }

        // Generate follow-up suggestions (use Haiku to save credits)
        try {
          const sugResponse = await client.messages.create({
            model: "claude-haiku-4-5-20251001",
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
          // Debit suggestion credits too (small, Haiku)
          if (sugResponse.usage) {
            debitCredits(username, "claude-haiku-4-5-20251001", sugResponse.usage.input_tokens, sugResponse.usage.output_tokens, "suggestions", sessionId).catch((err) => console.error("[Chat] debit suggestion credits failed:", err));
          }
        } catch {
          // Suggestions are best-effort, don't block the response
        }

        // Send final usage summary
        sendEvent({
          type: "usage_summary",
          totalInputTokens,
          totalOutputTokens,
          totalCreditsUsed: totalCredits,
          creditsRemaining: debitResult?.balance.unlimited ? -1 : (debitResult?.balance.creditsRemaining ?? -1),
          unlimited: debitResult?.balance.unlimited ?? false,
          model: chatModel,
          elapsedMs: Date.now() - requestStartTime,
        });

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
