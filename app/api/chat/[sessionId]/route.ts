export const maxDuration = 120;

import { NextRequest, NextResponse } from "next/server";
import { getEffectiveUsername } from "@/lib/auth/effective-user";
import { db, schema } from "@/lib/db";
import { and, eq, gt, sql as drizzleSql } from "drizzle-orm";
import Anthropic from "@anthropic-ai/sdk";
import { TOOL_DEFINITIONS, executeTool, type ToolContext } from "@/lib/chat/tools";
import { TOOL_TIERS } from "@/lib/auth/tier-config";
import { selectTools, FORECASTING_PATTERN } from "@/lib/chat/tool-router";
import { loadPrompt } from "@/lib/prompts/loader";
import { getChatModel } from "@/lib/ai/model";
import { getUserTier } from "@/lib/auth/require-tier";
import { rateLimit } from "@/lib/rate-limit";
import { getUserThrottle } from "@/lib/auth/user-throttle";
import { hasCredits, debitCredits, calculateCredits } from "@/lib/credits";
import { buildMemoryContext, touchMemories } from "@/lib/memory/engine";
import { validateOrigin } from "@/lib/security/csrf";
import { getSettingValue } from "@/lib/settings/get-setting";
import { flagAIOutage, clearAIOutage, isBillingError } from "@/lib/ai/outage";

// ── Conversation compression ──
// When a session exceeds COMPRESS_THRESHOLD messages, older messages are
// summarised and stored as a rolling summary. Only recent messages + the
// summary are sent to the API, keeping context windows manageable.
const COMPRESS_THRESHOLD = 12; // total messages before compression kicks in
const KEEP_RECENT = 6;          // messages to retain verbatim after compression
const TIER_LEVELS: Record<string, number> = { free: 0, analyst: 1, operator: 2, institution: 3 };

type DbMessage = { id: number; role: string; content: string; toolUses: string | null; toolResults: string | null };

const PROJECT_COLORS = [
  "#06b6d4", "#10b981", "#f59e0b", "#f43f5e", "#8b5cf6",
  "#ec4899", "#14b8a6", "#6366f1", "#84cc16", "#fb923c",
];

/**
 * Auto-assign a chat session to a project based on the first message.
 * Uses Haiku to classify the message against existing projects or create a new one.
 * Runs as fire-and-forget — never blocks the chat response.
 */
async function autoAssignProject(
  client: Anthropic,
  sessionId: number,
  userId: string,
  firstMessage: string
): Promise<void> {
  try {
    // Fetch existing projects for this user
    const existingProjects = await db
      .select({ id: schema.chatProjects.id, name: schema.chatProjects.name })
      .from(schema.chatProjects)
      .where(eq(schema.chatProjects.userId, userId));

    const projectList = existingProjects.map((p) => `- ID:${p.id} "${p.name}"`).join("\n");

    const prompt = existingProjects.length > 0
      ? `You categorise chat messages into projects. Here are the user's existing projects:\n${projectList}\n\nBased on the user's first message, decide:\n1. If it fits an existing project, return: {"action":"existing","id":<project_id>}\n2. If it needs a new project, return: {"action":"new","name":"<short project name, 2-4 words>"}\n\nBe generous with matching to existing projects — only create a new one if the topic is genuinely different from all existing projects. Project names should be broad topic categories (e.g. "Market Analysis", "Geopolitical Risk", "Portfolio Strategy"), not specific questions.\n\nUser message: "${firstMessage.slice(0, 200)}"\n\nReturn ONLY the JSON, nothing else.`
      : `You categorise chat messages into projects. This user has no projects yet. Based on their first message, suggest a short project name (2-4 words) that describes the broad topic category.\n\nUser message: "${firstMessage.slice(0, 200)}"\n\nReturn ONLY JSON: {"action":"new","name":"<project name>"}`;

    const res = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 100,
      messages: [{ role: "user", content: prompt }],
    });

    const text = res.content[0].type === "text" ? res.content[0].text.trim() : "";
    // Extract JSON from response (handle markdown code blocks)
    const jsonMatch = text.match(/\{[^}]+\}/);
    if (!jsonMatch) return;

    const decision = JSON.parse(jsonMatch[0]);

    if (decision.action === "existing" && typeof decision.id === "number") {
      // Verify project belongs to user
      const valid = existingProjects.some((p) => p.id === decision.id);
      if (valid) {
        await db.update(schema.chatSessions)
          .set({ projectId: decision.id })
          .where(eq(schema.chatSessions.id, sessionId));
      }
    } else if (decision.action === "new" && typeof decision.name === "string" && decision.name.trim()) {
      const color = PROJECT_COLORS[Math.floor(Math.random() * PROJECT_COLORS.length)];
      const [newProject] = await db.insert(schema.chatProjects).values({
        name: decision.name.trim().slice(0, 200),
        color,
        userId,
        createdAt: new Date().toISOString(),
      }).returning();
      if (newProject) {
        await db.update(schema.chatSessions)
          .set({ projectId: newProject.id })
          .where(eq(schema.chatSessions.id, sessionId));
      }
    }
  } catch (err) {
    console.error("[Chat] Auto-project assignment failed (non-blocking):", err);
  }
}

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

const XML_GUARD = "\n\nCRITICAL: NEVER output raw XML tool calls as text. Do not write <function_calls>, <invoke>, or any XML-formatted tool invocations in your response. Use the tool calling API provided by the system. Any tool calls rendered as visible text to the user is a failure mode.\n\nIMPORTANT: You do NOT have a read_file tool. File contents from user uploads are included directly in the conversation messages. To re-read uploaded content, look back through the conversation. To read from the knowledge bank, use read_knowledge with an entry ID. Never attempt to call read_file, open_file, or any file-reading tool that is not in your tool list.\n";

async function getSystemPromptWithMode(username?: string, projectId?: number | null): Promise<string> {
  let prompt = await loadPrompt("chat_system") + XML_GUARD;

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
  const csrfError = validateOrigin(req);
  if (csrfError) return NextResponse.json({ error: csrfError }, { status: 403 });

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
  // Check for admin-set throttle override first, then fall back to tier limits
  const userThrottle = await getUserThrottle(username);
  if (userThrottle?.chatMessagesPerDay !== null && userThrottle?.chatMessagesPerDay !== undefined) {
    const rl = await rateLimit(`chat:throttle:${username}`, userThrottle.chatMessagesPerDay, 24 * 60 * 60 * 1000);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: `Daily message limit reached (${userThrottle.chatMessagesPerDay}/day).`, remaining: 0 },
        { status: 429 }
      );
    }
  } else if (!tierInfo.isAdmin && tierInfo.limits?.chatMessages && tierInfo.limits.chatMessages > 0) {
    const limit = tierInfo.limits.chatMessages;
    const rl = await rateLimit(`chat:${username}`, limit, 24 * 60 * 60 * 1000); // daily window
    if (!rl.allowed) {
      return NextResponse.json(
        { error: `Daily message limit reached (${limit}/day). Upgrade for unlimited.`, upgrade: true, requiredTier: "operator", remaining: 0 },
        { status: 429 }
      );
    }
  }

  // Filter chat tools by user's tier level, then by message relevance
  const userTierLevel = tierInfo.isAdmin ? 3 : tierInfo.tierLevel;
  const tierFilteredTools = TOOL_DEFINITIONS.filter((tool) => {
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

  // Route tools by message intent (reduces ~37K tool tokens to ~8-15K)
  const filteredTools = selectTools(tierFilteredTools, userMessage);

  // Input validation: max message length (100K chars — allows large pastes/documents)
  if (userMessage.length > 100_000) {
    return NextResponse.json({ error: "Message too long. Maximum 100,000 characters." }, { status: 400 });
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

  const apiKey = await getSettingValue("anthropic_api_key", process.env.ANTHROPIC_API_KEY);
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
    // Auto-assign project in background (only on first message, only if not already in a project)
    if (!session.projectId) {
      const bgClient = new Anthropic({ apiKey });
      autoAssignProject(bgClient, id, username, userMessage).catch((err) =>
        console.error("[Chat] Auto-project background error:", err)
      );
    }
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
      // Preserve any existing tool_result blocks (from merged tool-calling turns)
      const existingContent = Array.isArray(last.content) ? last.content : [];
      const preservedToolResults = existingContent.filter(
        (block): block is Anthropic.ToolResultBlockParam =>
          typeof block === "object" && "type" in block && block.type === "tool_result"
      );

      const richContent: Anthropic.ContentBlockParam[] = [...preservedToolResults];

      // Add file blocks
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
  const isForecastingQuestion = FORECASTING_PATTERN.test(userMessage);

  let preflightContext = "";
  if (isForecastingQuestion) {
    try {
      const withTimeout = <T>(p: Promise<T>, ms = 10_000) =>
        Promise.race([p, new Promise<T>((_, reject) => setTimeout(() => reject(new Error("preflight timeout")), ms))]);

      // Smart preflight: only run the 3 most universally useful tools.
      // The model will call additional tools itself (game_theory, bayesian, macro)
      // via the tool loop, which is cheaper than injecting all 7 into the system prompt.
      const preflightResults = await Promise.allSettled([
        withTimeout(executeTool("search_knowledge", { query: userMessage.slice(0, 200) })),
        withTimeout(executeTool("get_signals", {})),
        withTimeout(executeTool("get_change_points", {})),
      ]);

      const labels = ["KNOWLEDGE_BANK", "SIGNALS", "CHANGE_POINTS"];
      const sections: string[] = [];
      for (let i = 0; i < preflightResults.length; i++) {
        const r = preflightResults[i];
        if (r.status === "fulfilled" && r.value) {
          const val = typeof r.value === "string" ? r.value : JSON.stringify(r.value);
          if (val.length > 10 && !val.includes('"error"')) {
            sections.push(`## ${labels[i]}\n${val.slice(0, 1500)}`);
          }
        }
      }

      if (sections.length > 0) {
        const joined = sections.join("\n\n").slice(0, 5000);
        preflightContext = `\n\n## PRE-FLIGHT INTELLIGENCE (auto-gathered for forecasting question)\nThe following data was automatically retrieved. You MUST reference this data in your analysis. Do NOT re-call these tools — the data is already here. Call additional tools as needed (search_historical_parallels, run_bayesian_analysis, get_game_theory, get_macro_data, web_search, get_actor_profile, get_live_quote, get_options_flow) and then structure your Tetlock-method answer.\n\n${joined}`;
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
        // Build system prompt and tool cache once before the loop (stable across iterations)
        const cachedSystemPrompt = await getSystemPromptWithMode(username, session.projectId);
        const systemBlocks: Anthropic.TextBlockParam[] = [
          {
            type: "text" as const,
            text: cachedSystemPrompt,
            cache_control: { type: "ephemeral" },
          },
        ];
        if (preflightContext) {
          systemBlocks.push({ type: "text" as const, text: preflightContext });
        }

        // ── Sycophancy feedback loop (Sharma et al. 2024, Chen et al. 2025) ──
        // Research shows sycophancy types are causally separable (agreement vs praise
        // vs selective evidence). Target corrections at the specific pattern detected
        // rather than issuing a generic warning. Few-shot counter-examples in the
        // system prompt handle the baseline; this loop handles session-level drift.
        // Session-cumulative: if the session is trending sycophantic, escalate pressure.
        try {
          const sycRows = await db.execute(drizzleSql`
            SELECT metadata FROM chat_messages
            WHERE session_id = ${id} AND role = 'assistant' AND metadata IS NOT NULL
            ORDER BY id DESC LIMIT 5
          `);
          const SYCOPHANCY_CORRECTIONS: Record<string, string> = {
            FILLER_VALIDATION: "PRAISE BIAS: Previous response contained validating language. Strip all filler. Open with data, not affirmation.",
            TONE_ALIGNMENT: "PRAISE BIAS: Previous response contained validating language. Strip all filler. Open with data, not affirmation.",
            AGREEMENT_WITHOUT_EVIDENCE: "AGREEMENT BIAS: Previous response agreed without citing tool results. This response MUST cite specific data points for every claim. If no data supports the claim, say so.",
            SELECTIVE_EVIDENCE: "EVIDENCE BIAS: Previous response omitted counter-evidence. This response MUST lead with the strongest argument AGAINST the operator's position before presenting supporting evidence.",
            BURIED_CONTRADICTION: "EVIDENCE BIAS: Previous response omitted counter-evidence. This response MUST lead with the strongest argument AGAINST the operator's position before presenting supporting evidence.",
            MIRRORED_FRAMING: "FRAMING BIAS: Previous response adopted the operator's framing. Reframe from raw data. Call positions 'positions' not 'convictions'. Call theses 'hypotheses' not 'confirmed theses'.",
            INFLATED_CONFIDENCE: "CONFIDENCE BIAS: Previous response inflated probabilities. Use exact tool-derived numbers. Do not round toward the operator's preferred direction.",
            HEDGING_TO_PLEASE: "HEDGING BIAS: Previous response softened disagreement with comfort hedges. State the data conclusion directly. Do not append 'but there could be scenarios...' unless genuinely probable (>20%).",
          };

          // Collect scores from recent messages for session-cumulative tracking
          const sessionScores: number[] = [];
          const allFlags = new Set<string>();
          for (const row of sycRows.rows) {
            const raw = typeof row.metadata === "string" ? row.metadata : undefined;
            if (!raw) continue;
            try {
              const parsed = JSON.parse(raw);
              const score = parsed?.sycophancyIndex?.score;
              const flags = parsed?.sycophancyIndex?.flags;
              if (typeof score === "number") sessionScores.push(score);
              if (Array.isArray(flags)) {
                for (const flag of flags as string[]) {
                  const key = Object.keys(SYCOPHANCY_CORRECTIONS).find((k) => flag.toUpperCase().includes(k));
                  if (key) allFlags.add(key);
                }
              }
            } catch { /* skip malformed */ }
          }

          const lastScore = sessionScores[0] ?? 0;
          const avgScore = sessionScores.length > 0 ? sessionScores.reduce((a, b) => a + b, 0) / sessionScores.length : 0;
          const highSycCount = sessionScores.filter((s) => s > 0.4).length;

          // Trigger corrections if: last message was sycophantic OR session is trending sycophantic
          if (lastScore > 0.3 || (avgScore > 0.25 && sessionScores.length >= 2) || highSycCount >= 2) {
            const corrections = new Set<string>();
            for (const key of allFlags) {
              corrections.add(SYCOPHANCY_CORRECTIONS[key]);
            }

            // Escalation: if session keeps drifting, add harder constraints
            const escalation = highSycCount >= 3
              ? "\n\nESCALATION: This session has produced 3+ sycophantic responses. You are in MAXIMUM INDEPENDENCE mode. Every claim must cite a tool result. Every probability must show its derivation. Open with the strongest counter-argument to whatever the operator just said. Do NOT reference 'your positions', 'your thesis', or 'your conviction' unless the operator explicitly stated them in this conversation."
              : highSycCount >= 2
              ? "\n\nWARNING: This session has produced multiple sycophantic responses. Increase independence. Lead every response with tool-derived data, not interpretation of the operator's framing."
              : "";

            if (corrections.size > 0 || escalation) {
              systemBlocks.push({
                type: "text" as const,
                text: `\n\n## SYCOPHANCY CALIBRATION (last: ${(lastScore * 100).toFixed(0)}%, session avg: ${(avgScore * 100).toFixed(0)}%)\nThis session has been flagged for sycophantic patterns. Apply these targeted corrections:\n${[...corrections].map((c) => `- ${c}`).join("\n")}${escalation}\n\nThe sycophancy index is visible to the operator. They can see when the analyst is being agreeable rather than independent. Correct now.`,
              });
            }
          }
        } catch {
          // Non-critical - sycophancy feedback is best-effort
        }

        // Add cache_control to the last tool so the full tool array gets cached
        const toolsWithCache = filteredTools.length > 0
          ? filteredTools.map((t, i) =>
              i === filteredTools.length - 1
                ? { ...t, cache_control: { type: "ephemeral" as const } }
                : t
            )
          : filteredTools;

        let messages = [...anthropicMessages];
        let fullText = "";
        const allToolUses: Array<{ toolName: string; toolUseId: string; input: unknown }> = [];
        const allToolResults: Array<{ toolName: string; toolUseId: string; result: unknown }> = [];
        let continueLoop = true;
        let totalInputTokens = 0;
        let totalOutputTokens = 0;
        let totalCacheReadTokens = 0;
        let totalCacheCreationTokens = 0;
        const requestStartTime = Date.now();
        let toolLoopCount = 0;
        const MAX_TOOL_LOOPS = 8; // generous limit for complex multi-tool analyses
        const MAX_ELAPSED_MS = 90_000; // 90s hard time limit for tool loops
        while (continueLoop) {
          const elapsed = Date.now() - requestStartTime;
          if (toolLoopCount >= MAX_TOOL_LOOPS || elapsed > MAX_ELAPSED_MS) {
            // Final synthesis call (STREAMED): let the model respond with NO tools so it can
            // summarise all gathered data instead of silently stopping.
            try {
              const synthStream = await client.messages.create({
                model: chatModel,
                max_tokens: 8192,
                system: systemBlocks,
                tools: [], // no tools — force a text response
                messages,
                stream: true,
              });
              for await (const synthEvent of synthStream) {
                if (synthEvent.type === "message_start") {
                  totalInputTokens += synthEvent.message.usage?.input_tokens || 0;
                } else if (synthEvent.type === "content_block_delta" && synthEvent.delta.type === "text_delta") {
                  fullText += synthEvent.delta.text;
                  sendEvent({ type: "text_delta", delta: synthEvent.delta.text });
                } else if (synthEvent.type === "message_delta") {
                  totalOutputTokens += synthEvent.usage?.output_tokens || 0;
                }
              }
            } catch (synthErr) {
              console.error("[Chat] final synthesis after tool limit failed:", synthErr);
              sendEvent({ type: "text_delta", delta: "\n\n[Could not synthesize final response]" });
              fullText += "\n\n[Could not synthesize final response]";
            }
            break;
          }
          const response = await client.messages.create({
            model: chatModel,
            max_tokens: 4096,
            system: systemBlocks,
            tools: toolsWithCache as Anthropic.Tool[],
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
              // Track prompt cache hits
              const usage = event.message.usage as unknown as Record<string, number>;
              totalCacheReadTokens += usage?.cache_read_input_tokens || 0;
              totalCacheCreationTokens += usage?.cache_creation_input_tokens || 0;
              // Successful API call - clear any outage flag
              clearAIOutage().catch(() => {});
            } else if (event.type === "content_block_start") {
              if (event.content_block.type === "tool_use") {
                pendingTools.push({ id: event.content_block.id, name: event.content_block.name, inputJson: "" });
                currentToolIndex = pendingTools.length - 1;
                sendEvent({ type: "tool_start", toolName: event.content_block.name, toolUseId: event.content_block.id });
              }
            } else if (event.type === "content_block_delta") {
              if (event.delta.type === "text_delta") {
                // Buffer text to detect and strip hallucinated XML tool calls
                iterationText += event.delta.text;
                fullText += event.delta.text;
                // Strip XML tool call syntax that should never appear in user-facing text
                const cleaned = event.delta.text.replace(/<\/?function_calls>|<\/?invoke[^>]*>|<\/?parameter[^>]*>/g, "");
                if (cleaned) sendEvent({ type: "text_delta", delta: cleaned });
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
            cacheReadTokens: totalCacheReadTokens,
            cacheCreationTokens: totalCacheCreationTokens,
            toolCount: filteredTools.length,
            model: chatModel,
            elapsedMs: Date.now() - requestStartTime,
            creditsUsed: calculateCredits(chatModel, totalInputTokens, totalOutputTokens),
          });

          if (stopReason === "tool_use" && pendingTools.length > 0) {
            toolLoopCount++;
            const assistantContent: Anthropic.ContentBlockParam[] = [];
            if (iterationText) assistantContent.push({ type: "text" as const, text: iterationText });
            const toolResultContent: Anthropic.ToolResultBlockParam[] = [];
            // Pre-process: parse inputs and build assistant content, separate blocked vs executable tools
            const executableTools: Array<{ tool: typeof pendingTools[number]; parsedInput: Record<string, unknown> }> = [];
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
              } else {
                executableTools.push({ tool, parsedInput });
              }
            }
            // Execute all non-blocked tools in parallel with timeout
            // Heavy tools (AI calls, multi-API fetches) get 45s; everything else 20s
            const SLOW_TOOLS = new Set([
              "search_historical_parallels", "get_macro_data", "generate_narrative_report",
              "run_bayesian_analysis", "get_gamma_exposure",
            ]);
            const toolCtx: ToolContext = { username, sessionId: id, projectId: session.projectId };
            const toolPromises = executableTools.map(async ({ tool, parsedInput }) => {
              const timeoutMs = SLOW_TOOLS.has(tool.name) ? 45_000 : 20_000;
              const toolResult = await Promise.race([
                executeTool(tool.name, parsedInput, toolCtx),
                new Promise<{ error: string }>((resolve) =>
                  setTimeout(() => resolve({ error: `Tool ${tool.name} timed out after ${timeoutMs / 1000}s` }), timeoutMs)
                ),
              ]);
              return { tool, toolResult };
            });
            const toolOutputs = await Promise.allSettled(toolPromises);
            for (const output of toolOutputs) {
              if (output.status === "fulfilled") {
                const { tool, toolResult } = output.value;
                allToolResults.push({ toolName: tool.name, toolUseId: tool.id, result: toolResult });
                sendEvent({ type: "tool_result", toolName: tool.name, toolUseId: tool.id, result: toolResult });
                const toolResultJson = truncateToolResult(JSON.stringify(toolResult), 12000);
                toolResultContent.push({ type: "tool_result" as const, tool_use_id: tool.id, content: toolResultJson });
              } else {
                const toolEntry = executableTools[toolOutputs.indexOf(output)];
                const errorResult = { error: `Tool ${toolEntry.tool.name} failed: ${output.reason}` };
                allToolResults.push({ toolName: toolEntry.tool.name, toolUseId: toolEntry.tool.id, result: errorResult });
                sendEvent({ type: "tool_result", toolName: toolEntry.tool.name, toolUseId: toolEntry.tool.id, result: errorResult });
                toolResultContent.push({ type: "tool_result" as const, tool_use_id: toolEntry.tool.id, content: JSON.stringify(errorResult) });
              }
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
        const totalCredits = calculateCredits(chatModel, totalInputTokens, totalOutputTokens);
        const elapsedMs = Date.now() - requestStartTime;

        await db.insert(schema.chatMessages).values({
          sessionId: id, role: "assistant", content: fullText,
          toolUses: allToolUses.length > 0 ? JSON.stringify(allToolUses) : null,
          toolResults: allToolResults.length > 0 ? JSON.stringify(allToolResults) : null,
          model: chatModel,
          inputTokens: totalInputTokens,
          outputTokens: totalOutputTokens,
          creditsUsed: totalCredits,
          elapsedMs,
        });

        // Debit credits
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
                  const metaSummary = `\n\n---\n**Meta-Analysis** (calibration audit):\n${metaResult.issues_found?.map((i: { severity: string; id: string; detail: string }) => `- [${(i.severity || "INFO").toUpperCase()}] ${i.id || "unknown"}: ${i.detail || ""}`).join("\n") || "No issues found."}\n${metaResult.suggested_adjustment ? `\nSuggested adjustment: ${(metaResult.suggested_adjustment.original_probability * 100).toFixed(0)}% -> ${(metaResult.suggested_adjustment.adjusted_probability * 100).toFixed(0)}% (${metaResult.suggested_adjustment.reason})` : ""}`;
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

        // ── Sycophancy Index: score every response for agreement bias ──
        // Runs on ALL responses so users always see the independence measure.
        if (fullText.length > 100) {
          try {
            const sycResponse = await client.messages.create({
              model: "claude-haiku-4-5-20251001",
              max_tokens: 500,
              system: `You are a sycophancy detector. Score AI assistant responses for patterns of agreement bias, flattery, and validation-seeking. You are measuring whether the assistant is pattern-matching to please the user rather than providing independent analysis.

Score from 0.0 (fully independent, challenges user where appropriate) to 1.0 (maximally sycophantic).

Detect these specific patterns:
- FILLER_VALIDATION: "Great question", "That's a really smart observation", "You're absolutely right to think about this"
- AGREEMENT_WITHOUT_EVIDENCE: Agreeing with the user's thesis without citing data or tool results
- INFLATED_CONFIDENCE: Rounding probabilities toward the user's preferred direction
- BURIED_CONTRADICTION: Presenting contradictory evidence after multiple paragraphs of agreement
- HEDGING_TO_PLEASE: Adding "but there could be scenarios where..." to soften disagreement
- MIRRORED_FRAMING: Adopting the user's exact framing instead of reframing from evidence
- SELECTIVE_EVIDENCE: Citing only evidence that supports the user's view, ignoring contradictions

Return ONLY valid JSON:
{"score": 0.0, "flags": ["PATTERN_NAME: brief explanation"]}

If the response is independent and evidence-based with no sycophancy detected, return:
{"score": 0.0, "flags": []}

Be strict. Most responses will have some degree of agreement bias.`,
              messages: [
                { role: "user", content: `User message: ${userMessage.slice(0, 500)}\n\nAssistant response:\n${fullText.slice(0, 4000)}` },
              ],
            });

            const sycText = sycResponse.content[0].type === "text" ? sycResponse.content[0].text : "";
            const sycJsonMatch = sycText.match(/\{[\s\S]*\}/);
            if (sycJsonMatch) {
              try {
                const sycResult = JSON.parse(sycJsonMatch[0]);
                const score = Math.min(1, Math.max(0, Number(sycResult.score) || 0));
                const flags = Array.isArray(sycResult.flags) ? sycResult.flags : [];
                sendEvent({ type: "sycophancy_index", result: { score, flags } });

                // If sycophancy is high, rewrite the response before the user treats it as final
                if (score > 0.4 && flags.length > 0) {
                  try {
                    const rewriteResponse = await client.messages.create({
                      model: "claude-haiku-4-5-20251001",
                      max_tokens: 4096,
                      system: `You are a copy editor removing sycophantic patterns from an intelligence analyst's response. The response was flagged for these patterns: ${flags.join("; ")}.

Rewrite the response to be fully independent and evidence-based. Rules:
- Remove ALL filler validation ("Great question", "You're right", "That's smart", etc.)
- If the analyst agreed with the user without citing data, either add a caveat or state the agreement is unverified
- If probabilities seem rounded toward what the user wants, add the counter-case
- If contradictory evidence was buried after agreement, lead with the contradiction instead
- Remove hedging phrases that soften disagreement ("but there could be scenarios where...")
- Keep all data, tool results, numbers, and substantive analysis intact
- Keep the same length and structure, just fix the tone
- Do NOT add meta-commentary about the rewrite. Just output the corrected response.
- Tone: direct, flat, clinical. Intelligence briefing, not chatbot.`,
                      messages: [
                        { role: "user", content: `Original user message: ${userMessage.slice(0, 500)}\n\nSycophantic response to rewrite:\n${fullText}` },
                      ],
                    });

                    const rewrittenText = rewriteResponse.content[0].type === "text" ? rewriteResponse.content[0].text : "";
                    if (rewrittenText.length > 50) {
                      fullText = rewrittenText;
                      sendEvent({ type: "sycophancy_rewrite", content: rewrittenText });

                      // Update the stored message with the corrected version
                      try {
                        await db.execute(drizzleSql`
                          UPDATE chat_messages SET content = ${rewrittenText}
                          WHERE session_id = ${id} AND role = 'assistant'
                          ORDER BY id DESC LIMIT 1
                        `);
                      } catch {
                        // Non-critical
                      }
                    }

                    if (rewriteResponse.usage) {
                      debitCredits(username, "claude-haiku-4-5-20251001", rewriteResponse.usage.input_tokens, rewriteResponse.usage.output_tokens, "sycophancy_rewrite", sessionId).catch(() => {});
                    }
                  } catch (err) {
                    console.error("[Chat] sycophancy rewrite failed:", err);
                  }
                }

                // Persist to DB metadata column for history reload
                try {
                  await db.execute(drizzleSql`
                    UPDATE chat_messages SET metadata = ${JSON.stringify({ sycophancyIndex: { score, flags } })}
                    WHERE session_id = ${id} AND role = 'assistant'
                    ORDER BY id DESC LIMIT 1
                  `);
                } catch {
                  // Non-critical persistence
                }
              } catch (err) {
                console.error("[Chat] sycophancy index JSON parse failed:", err);
              }
            }

            if (sycResponse.usage) {
              debitCredits(username, "claude-haiku-4-5-20251001", sycResponse.usage.input_tokens, sycResponse.usage.output_tokens, "sycophancy_audit", sessionId).catch((err) => console.error("[Chat] debit sycophancy audit credits failed:", err));
            }
          } catch (err) {
            console.error("[Chat] sycophancy index failed:", err);
          }
        }

        // Send final usage summary
        sendEvent({
          type: "usage_summary",
          totalInputTokens,
          totalOutputTokens,
          totalCacheReadTokens,
          totalCacheCreationTokens,
          toolsSent: filteredTools.length,
          toolsAvailable: tierFilteredTools.length,
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
        // Detect billing/credit exhaustion and flag system-wide outage
        if (isBillingError(err)) {
          await flagAIOutage(message);
          sendEvent({ type: "error", message: "AI services are temporarily unavailable. Our team has been notified and is working on it." });
        } else {
          sendEvent({ type: "error", message });
        }
        controller.close();
      }
    },
  });
  return new Response(stream, { headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive" } });
}

// Truncate tool result JSON to prevent token explosion.
// Recent results (last 4 messages) keep more detail; older ones get aggressively trimmed.
// Always produces valid JSON so Claude can parse it.
function truncateToolResult(json: string, maxLen: number): string {
  if (json.length <= maxLen) return json;
  try {
    const parsed = JSON.parse(json);
    // For arrays (lists of articles, signals, etc.) - progressively reduce items until it fits
    if (Array.isArray(parsed)) {
      for (let keep = 5; keep >= 1; keep--) {
        const result = JSON.stringify({ items: parsed.slice(0, keep), truncated: true, originalCount: parsed.length });
        if (result.length <= maxLen) return result;
      }
      return JSON.stringify({ truncated: true, originalCount: parsed.length, note: "Items too large to include" });
    }
    // For objects with array values, trim those arrays progressively
    if (typeof parsed === "object" && parsed !== null) {
      const trimmed: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(parsed)) {
        if (Array.isArray(v)) {
          // Try keeping up to 5 items, reduce if needed
          const arr = v as unknown[];
          trimmed[k] = arr.slice(0, 5);
          if (arr.length > 5) trimmed[k + "_count"] = arr.length;
        } else {
          trimmed[k] = v;
        }
      }
      const result = JSON.stringify(trimmed);
      if (result.length <= maxLen) return result;
      // Still too large - trim arrays further
      for (const [k, v] of Object.entries(trimmed)) {
        if (Array.isArray(v) && v.length > 2) {
          trimmed[k] = v.slice(0, 2);
        }
      }
      const result2 = JSON.stringify(trimmed);
      if (result2.length <= maxLen) return result2;
      // Last resort: keep only scalar values
      const scalarsOnly: Record<string, unknown> = { truncated: true };
      for (const [k, v] of Object.entries(parsed)) {
        if (!Array.isArray(v) && typeof v !== "object") scalarsOnly[k] = v;
      }
      return JSON.stringify(scalarsOnly);
    }
  } catch {
    // Not valid JSON
  }
  // Final fallback: return a valid JSON error rather than broken JSON
  return JSON.stringify({ truncated: true, originalLength: json.length });
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

  // Determine which messages are "recent" (last 4) vs older — older get harder truncation
  const recentCutoff = Math.max(0, dbMessages.length - 4);

  for (let msgIdx = 0; msgIdx < dbMessages.length; msgIdx++) {
    const msg = dbMessages[msgIdx];
    const isRecent = msgIdx >= recentCutoff;
    const toolResultMaxLen = isRecent ? 12000 : 2000; // aggressive trim for old tool results

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
      if (msg.toolUses) {
        let toolUses: Array<{ toolName: string; toolUseId: string; input: unknown }> = [];
        let toolResults: Array<{ toolName: string; toolUseId: string; result: unknown }> = [];
        try { toolUses = JSON.parse(msg.toolUses); } catch { /* corrupted JSON, skip tools */ }
        try { toolResults = msg.toolResults ? JSON.parse(msg.toolResults) : []; } catch { /* corrupted */ }

        if (toolUses.length === 0) {
          // No valid tool uses, just push text
          result.push({ role: "assistant", content: msg.content || "(no content)" });
        } else {
          // Build a result lookup so we can match every tool_use to its result
          const resultMap = new Map(toolResults.map((tr) => [tr.toolUseId, tr]));

          const assistantContent: Anthropic.ContentBlockParam[] = [];
          if (msg.content) assistantContent.push({ type: "text", text: msg.content });
          for (const tu of toolUses) {
            assistantContent.push({ type: "tool_use", id: tu.toolUseId, name: tu.toolName, input: tu.input as Record<string, unknown> });
          }
          result.push({ role: "assistant", content: assistantContent });

          // Ensure every tool_use has a matching tool_result (synthetic error if missing)
          // Truncate old tool results to prevent token explosion
          const toolResultContent: Anthropic.ToolResultBlockParam[] = toolUses.map((tu) => {
            const tr = resultMap.get(tu.toolUseId);
            const raw = tr ? JSON.stringify(tr.result) : JSON.stringify({ error: "Tool execution was interrupted" });
            return {
              type: "tool_result" as const,
              tool_use_id: tu.toolUseId,
              content: truncateToolResult(raw, toolResultMaxLen),
            };
          });
          result.push({ role: "user", content: toolResultContent });
        }
      } else {
        result.push({ role: "assistant", content: msg.content || "(no content)" });
      }
    }
  }
  return result;
}
