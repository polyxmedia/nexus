import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { eq, desc } from "drizzle-orm";
import Anthropic from "@anthropic-ai/sdk";
import { TOOL_DEFINITIONS, executeTool } from "@/lib/chat/tools";
import { SYSTEM_PROMPT } from "@/lib/chat/prompt";

const MODEL = "claude-sonnet-4-20250514";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await params;
  const id = parseInt(sessionId, 10);

  try {
    const session = db
      .select()
      .from(schema.chatSessions)
      .where(eq(schema.chatSessions.id, id))
      .get();

    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    const messages = db
      .select()
      .from(schema.chatMessages)
      .where(eq(schema.chatMessages.sessionId, id))
      .orderBy(schema.chatMessages.createdAt)
      .all();

    return NextResponse.json({ session, messages });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await params;
  const id = parseInt(sessionId, 10);

  const body = await req.json();
  const userMessage = body.message as string;

  if (!userMessage?.trim()) {
    return NextResponse.json({ error: "Message required" }, { status: 400 });
  }

  // Verify session exists
  const session = db
    .select()
    .from(schema.chatSessions)
    .where(eq(schema.chatSessions.id, id))
    .get();

  if (!session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  // Get API key
  const apiKeySetting = db
    .select()
    .from(schema.settings)
    .where(eq(schema.settings.key, "anthropic_api_key"))
    .get();

  const apiKey = apiKeySetting?.value || process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: "Anthropic API key not configured" },
      { status: 500 }
    );
  }

  // Persist user message
  db.insert(schema.chatMessages)
    .values({
      sessionId: id,
      role: "user",
      content: userMessage,
    })
    .run();

  // Auto-title: use first user message
  if (session.title === "New Chat") {
    const title = userMessage.slice(0, 50) + (userMessage.length > 50 ? "..." : "");
    db.update(schema.chatSessions)
      .set({ title, updatedAt: new Date().toISOString() })
      .where(eq(schema.chatSessions.id, id))
      .run();
  } else {
    db.update(schema.chatSessions)
      .set({ updatedAt: new Date().toISOString() })
      .where(eq(schema.chatSessions.id, id))
      .run();
  }

  // Build message history from DB
  const dbMessages = db
    .select()
    .from(schema.chatMessages)
    .where(eq(schema.chatMessages.sessionId, id))
    .orderBy(schema.chatMessages.createdAt)
    .all();

  const anthropicMessages = buildAnthropicMessages(dbMessages);

  // SSE stream
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      function sendEvent(data: Record<string, unknown>) {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify(data)}\n\n`)
        );
      }

      try {
        const client = new Anthropic({ apiKey });
        let messages = [...anthropicMessages];
        let fullText = "";
        const allToolUses: Array<{ toolName: string; toolUseId: string; input: unknown }> = [];
        const allToolResults: Array<{ toolName: string; toolUseId: string; result: unknown }> = [];

        // Agentic loop
        let continueLoop = true;
        while (continueLoop) {
          const response = await client.messages.create({
            model: MODEL,
            max_tokens: 4096,
            system: SYSTEM_PROMPT,
            tools: TOOL_DEFINITIONS,
            messages,
            stream: true,
          });

          let currentToolUseId = "";
          let currentToolName = "";
          let currentToolInput = "";
          let stopReason = "";

          for await (const event of response) {
            if (event.type === "content_block_start") {
              if (event.content_block.type === "tool_use") {
                currentToolUseId = event.content_block.id;
                currentToolName = event.content_block.name;
                currentToolInput = "";
                sendEvent({
                  type: "tool_start",
                  toolName: currentToolName,
                  toolUseId: currentToolUseId,
                });
              }
            } else if (event.type === "content_block_delta") {
              if (event.delta.type === "text_delta") {
                fullText += event.delta.text;
                sendEvent({ type: "text_delta", delta: event.delta.text });
              } else if (event.delta.type === "input_json_delta") {
                currentToolInput += event.delta.partial_json;
              }
            } else if (event.type === "message_delta") {
              stopReason = event.delta.stop_reason || "";
            }
          }

          if (stopReason === "tool_use") {
            // Parse and execute the tool
            let parsedInput: Record<string, unknown> = {};
            try {
              parsedInput = currentToolInput
                ? JSON.parse(currentToolInput)
                : {};
            } catch {
              parsedInput = {};
            }

            allToolUses.push({
              toolName: currentToolName,
              toolUseId: currentToolUseId,
              input: parsedInput,
            });

            const toolResult = await executeTool(currentToolName, parsedInput);

            allToolResults.push({
              toolName: currentToolName,
              toolUseId: currentToolUseId,
              result: toolResult,
            });

            sendEvent({
              type: "tool_result",
              toolName: currentToolName,
              toolUseId: currentToolUseId,
              result: toolResult,
            });

            // Append assistant tool_use + tool result to messages for next iteration
            messages = [
              ...messages,
              {
                role: "assistant" as const,
                content: [
                  ...(fullText
                    ? [{ type: "text" as const, text: fullText }]
                    : []),
                  {
                    type: "tool_use" as const,
                    id: currentToolUseId,
                    name: currentToolName,
                    input: parsedInput,
                  },
                ],
              },
              {
                role: "user" as const,
                content: [
                  {
                    type: "tool_result" as const,
                    tool_use_id: currentToolUseId,
                    content: JSON.stringify(toolResult),
                  },
                ],
              },
            ];

            // Reset text accumulator for next streaming pass
            fullText = "";
          } else {
            // end_turn or max_tokens
            continueLoop = false;
          }
        }

        // Persist assistant message
        db.insert(schema.chatMessages)
          .values({
            sessionId: id,
            role: "assistant",
            content: fullText,
            toolUses: allToolUses.length > 0 ? JSON.stringify(allToolUses) : null,
            toolResults:
              allToolResults.length > 0 ? JSON.stringify(allToolResults) : null,
          })
          .run();

        sendEvent({ type: "done" });
        controller.close();
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Stream error";
        sendEvent({ type: "error", message });
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}

function buildAnthropicMessages(
  dbMessages: Array<{
    role: string;
    content: string;
    toolUses: string | null;
    toolResults: string | null;
  }>
): Anthropic.MessageParam[] {
  const result: Anthropic.MessageParam[] = [];

  for (const msg of dbMessages) {
    if (msg.role === "user") {
      result.push({ role: "user", content: msg.content });
    } else if (msg.role === "assistant") {
      // If this message had tool uses, reconstruct the full exchange
      if (msg.toolUses && msg.toolResults) {
        const toolUses = JSON.parse(msg.toolUses) as Array<{
          toolName: string;
          toolUseId: string;
          input: unknown;
        }>;
        const toolResults = JSON.parse(msg.toolResults) as Array<{
          toolName: string;
          toolUseId: string;
          result: unknown;
        }>;

        // Assistant message with tool_use blocks
        const assistantContent: Anthropic.ContentBlockParam[] = [];
        for (const tu of toolUses) {
          assistantContent.push({
            type: "tool_use",
            id: tu.toolUseId,
            name: tu.toolName,
            input: tu.input as Record<string, unknown>,
          });
        }
        if (msg.content) {
          assistantContent.push({ type: "text", text: msg.content });
        }
        result.push({ role: "assistant", content: assistantContent });

        // User message with tool_result blocks
        const toolResultContent: Anthropic.ToolResultBlockParam[] =
          toolResults.map((tr) => ({
            type: "tool_result" as const,
            tool_use_id: tr.toolUseId,
            content: JSON.stringify(tr.result),
          }));
        result.push({ role: "user", content: toolResultContent });
      } else {
        result.push({ role: "assistant", content: msg.content });
      }
    }
  }

  return result;
}
