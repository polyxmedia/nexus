import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { eq } from "drizzle-orm";
import Anthropic from "@anthropic-ai/sdk";
import { TOOL_DEFINITIONS, executeTool } from "@/lib/chat/tools";
import { loadPrompt } from "@/lib/prompts/loader";
import { getChatModel } from "@/lib/ai/model";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await params;
  const id = parseInt(sessionId, 10);
  try {
    const sessionRows = await db.select().from(schema.chatSessions).where(eq(schema.chatSessions.id, id));
    const session = sessionRows[0];
    if (!session) return NextResponse.json({ error: "Session not found" }, { status: 404 });
    const messages = await db.select().from(schema.chatMessages).where(eq(schema.chatMessages.sessionId, id)).orderBy(schema.chatMessages.createdAt);
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
  if (!userMessage?.trim()) return NextResponse.json({ error: "Message required" }, { status: 400 });

  const sessionRows = await db.select().from(schema.chatSessions).where(eq(schema.chatSessions.id, id));
  const session = sessionRows[0];
  if (!session) return NextResponse.json({ error: "Session not found" }, { status: 404 });

  const apiKeyRows = await db.select().from(schema.settings).where(eq(schema.settings.key, "anthropic_api_key"));
  const apiKeySetting = apiKeyRows[0];
  const apiKey = apiKeySetting?.value || process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "Anthropic API key not configured" }, { status: 500 });

  await db.insert(schema.chatMessages).values({ sessionId: id, role: "user", content: userMessage });

  if (session.title === "New Chat") {
    const title = userMessage.slice(0, 50) + (userMessage.length > 50 ? "..." : "");
    await db.update(schema.chatSessions).set({ title, updatedAt: new Date().toISOString() }).where(eq(schema.chatSessions.id, id));
  } else {
    await db.update(schema.chatSessions).set({ updatedAt: new Date().toISOString() }).where(eq(schema.chatSessions.id, id));
  }

  const dbMessages = await db.select().from(schema.chatMessages).where(eq(schema.chatMessages.sessionId, id)).orderBy(schema.chatMessages.createdAt);
  const anthropicMessages = buildAnthropicMessages(dbMessages);

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
            system: await loadPrompt("chat_system"),
            tools: TOOL_DEFINITIONS,
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

function buildAnthropicMessages(dbMessages: Array<{ role: string; content: string; toolUses: string | null; toolResults: string | null }>): Anthropic.MessageParam[] {
  const result: Anthropic.MessageParam[] = [];
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
