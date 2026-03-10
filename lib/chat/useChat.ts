"use client";

import { useState, useCallback, useRef } from "react";
import type { FileAttachment } from "@/components/chat/ChatInput";

export type { FileAttachment };

export interface ToolCall {
  toolName: string;
  toolUseId: string;
  status: "loading" | "done" | "error";
  result?: unknown;
}

export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  creditsUsed: number;
  creditsRemaining?: number;
  unlimited?: boolean;
  model: string;
  elapsedMs: number;
}

export interface MetaAnalysisResult {
  issues_found: Array<{ id: string; severity: "high" | "medium" | "low"; detail: string }>;
  suggested_adjustment: { original_probability: number; adjusted_probability: number; reason: string } | null;
  confidence_in_adjustment: "high" | "medium" | "low";
  missing_data: string[];
}

export interface ChatTurn {
  id: string;
  role: "user" | "assistant";
  content: string;
  toolCalls: ToolCall[];
  suggestions?: string[];
  metaAnalysis?: MetaAnalysisResult;
  tokenUsage?: TokenUsage;
  /** File attachments (user turns only, client-side display) */
  files?: Array<{ name: string; type: string; size: number; previewUrl?: string }>;
}

export interface ChatMessage {
  id: number;
  sessionId: number;
  role: string;
  content: string;
  toolUses: string | null;
  toolResults: string | null;
  model: string | null;
  inputTokens: number | null;
  outputTokens: number | null;
  creditsUsed: number | null;
  elapsedMs: number | null;
  createdAt: string;
}

export function useChat(sessionId: string) {
  const [turns, setTurns] = useState<ChatTurn[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [upgradeRequired, setUpgradeRequired] = useState(false);
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

  const modelRef = useRef<string | undefined>(undefined);

  const setModel = useCallback((model: string | undefined) => {
    modelRef.current = model;
  }, []);

  const sendMessage = useCallback(
    async (message: string, files?: FileAttachment[]) => {
      if (isStreaming || (!message.trim() && !files?.length)) return;

      // Add user turn
      const userTurn: ChatTurn = {
        id: `user-${Date.now()}`,
        role: "user",
        content: message,
        toolCalls: [],
        files: files?.map((f) => ({ name: f.name, type: f.type, size: f.size, previewUrl: f.previewUrl })),
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
        // Strip previewUrl before sending (client-only field)
        const apiFiles = files?.map(({ previewUrl: _p, ...rest }) => rest);
        const res = await fetch(`/api/chat/${sessionId}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message, files: apiFiles?.length ? apiFiles : undefined, model: modelRef.current }),
          signal: controller.signal,
        });

        if (!res.ok) {
          let errorMsg = `HTTP ${res.status}`;
          try {
            const errData = await res.json();
            errorMsg = errData.error || errorMsg;
            if (errData.upgrade) {
              setUpgradeRequired(true);
            }
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
              } else if (event.type === "token_usage" || event.type === "usage_summary") {
                setTurns((prev) => {
                  const updated = [...prev];
                  const last = updated[updated.length - 1];
                  if (last && last.role === "assistant") {
                    updated[updated.length - 1] = {
                      ...last,
                      tokenUsage: {
                        inputTokens: event.inputTokens ?? event.totalInputTokens ?? 0,
                        outputTokens: event.outputTokens ?? event.totalOutputTokens ?? 0,
                        creditsUsed: event.creditsUsed ?? event.totalCreditsUsed ?? 0,
                        creditsRemaining: event.creditsRemaining,
                        unlimited: event.unlimited ?? false,
                        model: event.model ?? "",
                        elapsedMs: event.elapsedMs ?? 0,
                      },
                    };
                  }
                  return updated;
                });
              } else if (event.type === "meta_analysis") {
                setTurns((prev) => {
                  const updated = [...prev];
                  const last = updated[updated.length - 1];
                  if (last && last.role === "assistant") {
                    updated[updated.length - 1] = {
                      ...last,
                      metaAnalysis: event.result as MetaAnalysisResult,
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

  return { turns, isStreaming, sendMessage, stop, loadHistory, upgradeRequired, setModel };
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

      const turn: ChatTurn = {
        id: `db-${msg.id}`,
        role: "assistant",
        content: msg.content,
        toolCalls,
      };

      if (msg.creditsUsed != null && msg.model) {
        turn.tokenUsage = {
          inputTokens: msg.inputTokens ?? 0,
          outputTokens: msg.outputTokens ?? 0,
          creditsUsed: msg.creditsUsed,
          model: msg.model,
          elapsedMs: msg.elapsedMs ?? 0,
        };
      }

      turns.push(turn);
    }
  }

  return turns;
}
