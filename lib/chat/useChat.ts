"use client";

import { useState, useCallback, useRef } from "react";

export interface ToolCall {
  toolName: string;
  toolUseId: string;
  status: "loading" | "done" | "error";
  result?: unknown;
}

export interface ChatTurn {
  id: string;
  role: "user" | "assistant";
  content: string;
  toolCalls: ToolCall[];
  suggestions?: string[];
}

export interface ChatMessage {
  id: number;
  sessionId: number;
  role: string;
  content: string;
  toolUses: string | null;
  toolResults: string | null;
  createdAt: string;
}

export function useChat(sessionId: number) {
  const [turns, setTurns] = useState<ChatTurn[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const loadHistory = useCallback(async () => {
    try {
      const res = await fetch(`/api/chat/${sessionId}`);
      const data = await res.json();
      if (data.messages) {
        const loaded = dbMessagesToTurns(data.messages as ChatMessage[]);
        setTurns(loaded);
      }
      return data.session;
    } catch {
      // ignore
    }
  }, [sessionId]);

  const sendMessage = useCallback(
    async (message: string) => {
      if (isStreaming || !message.trim()) return;

      // Add user turn
      const userTurn: ChatTurn = {
        id: `user-${Date.now()}`,
        role: "user",
        content: message,
        toolCalls: [],
      };

      const assistantTurn: ChatTurn = {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: "",
        toolCalls: [],
      };

      setTurns((prev) => [...prev, userTurn, assistantTurn]);
      setIsStreaming(true);

      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const res = await fetch(`/api/chat/${sessionId}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message }),
          signal: controller.signal,
        });

        if (!res.ok) {
          let errorMsg = `HTTP ${res.status}`;
          try {
            const errData = await res.json();
            errorMsg = errData.error || errorMsg;
          } catch {
            // not JSON, use status code
          }
          throw new Error(errorMsg);
        }

        if (!res.body) {
          throw new Error("Empty response from server");
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });

          // Process complete SSE events
          const lines = buffer.split("\n\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            const dataMatch = line.match(/^data: (.+)$/m);
            if (!dataMatch) continue;

            try {
              const event = JSON.parse(dataMatch[1]);

              if (event.type === "text_delta") {
                setTurns((prev) => {
                  const updated = [...prev];
                  const last = updated[updated.length - 1];
                  if (last && last.role === "assistant") {
                    updated[updated.length - 1] = {
                      ...last,
                      content: last.content + event.delta,
                    };
                  }
                  return updated;
                });
              } else if (event.type === "tool_start") {
                setTurns((prev) => {
                  const updated = [...prev];
                  const last = updated[updated.length - 1];
                  if (last && last.role === "assistant") {
                    updated[updated.length - 1] = {
                      ...last,
                      toolCalls: [
                        ...last.toolCalls,
                        {
                          toolName: event.toolName,
                          toolUseId: event.toolUseId,
                          status: "loading",
                        },
                      ],
                    };
                  }
                  return updated;
                });
              } else if (event.type === "tool_result") {
                setTurns((prev) => {
                  const updated = [...prev];
                  const last = updated[updated.length - 1];
                  if (last && last.role === "assistant") {
                    updated[updated.length - 1] = {
                      ...last,
                      toolCalls: last.toolCalls.map((tc) =>
                        tc.toolUseId === event.toolUseId
                          ? { ...tc, status: "done" as const, result: event.result }
                          : tc
                      ),
                    };
                  }
                  return updated;
                });
              } else if (event.type === "suggestions") {
                setTurns((prev) => {
                  const updated = [...prev];
                  const last = updated[updated.length - 1];
                  if (last && last.role === "assistant") {
                    updated[updated.length - 1] = {
                      ...last,
                      suggestions: event.suggestions as string[],
                    };
                  }
                  return updated;
                });
              } else if (event.type === "error") {
                setTurns((prev) => {
                  const updated = [...prev];
                  const last = updated[updated.length - 1];
                  if (last && last.role === "assistant") {
                    updated[updated.length - 1] = {
                      ...last,
                      content: last.content || `Error: ${event.message}`,
                    };
                  }
                  return updated;
                });
              }
              // "done" type just means stream is complete
            } catch {
              // skip malformed events
            }
          }
        }
      } catch (err: unknown) {
        if (err instanceof DOMException && err.name === "AbortError") {
          // User cancelled
        } else {
          const message =
            err instanceof Error ? err.message : "Connection failed";
          setTurns((prev) => {
            const updated = [...prev];
            const last = updated[updated.length - 1];
            if (last && last.role === "assistant" && !last.content) {
              updated[updated.length - 1] = {
                ...last,
                content: `Error: ${message}`,
              };
            }
            return updated;
          });
        }
      } finally {
        setIsStreaming(false);
        abortRef.current = null;
      }
    },
    [sessionId, isStreaming]
  );

  const stop = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  return { turns, isStreaming, sendMessage, stop, loadHistory };
}

function dbMessagesToTurns(messages: ChatMessage[]): ChatTurn[] {
  const turns: ChatTurn[] = [];

  for (const msg of messages) {
    if (msg.role === "user") {
      turns.push({
        id: `db-${msg.id}`,
        role: "user",
        content: msg.content,
        toolCalls: [],
      });
    } else if (msg.role === "assistant") {
      const toolCalls: ToolCall[] = [];

      if (msg.toolUses && msg.toolResults) {
        const uses = JSON.parse(msg.toolUses) as Array<{
          toolName: string;
          toolUseId: string;
        }>;
        const results = JSON.parse(msg.toolResults) as Array<{
          toolName: string;
          toolUseId: string;
          result: unknown;
        }>;

        for (const use of uses) {
          const result = results.find(
            (r) => r.toolUseId === use.toolUseId
          );
          toolCalls.push({
            toolName: use.toolName,
            toolUseId: use.toolUseId,
            status: "done",
            result: result?.result,
          });
        }
      }

      turns.push({
        id: `db-${msg.id}`,
        role: "assistant",
        content: msg.content,
        toolCalls,
      });
    }
  }

  return turns;
}
