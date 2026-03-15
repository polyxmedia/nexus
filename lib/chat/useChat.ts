"use client";

import { useState, useCallback, useRef, useEffect } from "react";
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

export interface SycophancyIndex {
  score: number; // 0.0 (independent) to 1.0 (maximally sycophantic)
  flags: string[]; // specific sycophancy patterns detected
}

export interface ChatTurn {
  id: string;
  role: "user" | "assistant";
  content: string;
  toolCalls: ToolCall[];
  suggestions?: string[];
  metaAnalysis?: MetaAnalysisResult;
  sycophancyIndex?: SycophancyIndex;
  tokenUsage?: TokenUsage;
  /** File attachments (user turns only, client-side display) */
  files?: Array<{ name: string; type: string; size: number; previewUrl?: string }>;
  /** Message is queued and waiting to be processed */
  pending?: boolean;
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
  metadata: string | null;
  createdAt: string;
}

export function useChat(sessionId: string) {
  const [turns, setTurns] = useState<ChatTurn[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [upgradeRequired, setUpgradeRequired] = useState(false);
  const [creditsExhausted, setCreditsExhausted] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const pendingQueue = useRef<Array<{ message: string; files?: FileAttachment[] }>>([]);

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
      if (!message.trim() && !files?.length) return;

      // If already streaming, queue as pending train-of-thought
      if (isStreaming) {
        const pendingTurn: ChatTurn = {
          id: `pending-${Date.now()}-${pendingQueue.current.length}`,
          role: "user",
          content: message,
          toolCalls: [],
          pending: true,
          files: mapFilesForDisplay(files),
        };
        pendingQueue.current.push({ message, files });
        setTurns((prev) => [...prev, pendingTurn]);
        return;
      }

      // Add user turn
      const userTurn: ChatTurn = {
        id: `user-${Date.now()}`,
        role: "user",
        content: message,
        toolCalls: [],
        files: mapFilesForDisplay(files),
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
            if (errData.topup) {
              setCreditsExhausted(true);
            } else if (errData.upgrade) {
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
                  const idx = findLastAssistantIndex(updated);
                  if (idx >= 0) {
                    updated[idx] = { ...updated[idx], content: updated[idx].content + event.delta };
                  }
                  return updated;
                });
              } else if (event.type === "tool_start") {
                setTurns((prev) => {
                  const updated = [...prev];
                  const idx = findLastAssistantIndex(updated);
                  if (idx >= 0) {
                    updated[idx] = {
                      ...updated[idx],
                      toolCalls: [
                        ...updated[idx].toolCalls,
                        { toolName: event.toolName, toolUseId: event.toolUseId, status: "loading" },
                      ],
                    };
                  }
                  return updated;
                });
              } else if (event.type === "tool_result") {
                setTurns((prev) => {
                  const updated = [...prev];
                  const idx = findLastAssistantIndex(updated);
                  if (idx >= 0) {
                    updated[idx] = {
                      ...updated[idx],
                      toolCalls: updated[idx].toolCalls.map((tc) =>
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
                  const idx = findLastAssistantIndex(updated);
                  if (idx >= 0) {
                    updated[idx] = {
                      ...updated[idx],
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
              } else if (event.type === "sycophancy_index") {
                setTurns((prev) => {
                  const updated = [...prev];
                  const idx = findLastAssistantIndex(updated);
                  if (idx >= 0) {
                    updated[idx] = { ...updated[idx], sycophancyIndex: event.result as SycophancyIndex };
                  }
                  return updated;
                });
              } else if (event.type === "meta_analysis") {
                setTurns((prev) => {
                  const updated = [...prev];
                  const idx = findLastAssistantIndex(updated);
                  if (idx >= 0) {
                    updated[idx] = { ...updated[idx], metaAnalysis: event.result as MetaAnalysisResult };
                  }
                  return updated;
                });
              } else if (event.type === "suggestions") {
                setTurns((prev) => {
                  const updated = [...prev];
                  const idx = findLastAssistantIndex(updated);
                  if (idx >= 0) {
                    updated[idx] = { ...updated[idx], suggestions: event.suggestions as string[] };
                  }
                  return updated;
                });
              } else if (event.type === "error") {
                setTurns((prev) => {
                  const updated = [...prev];
                  const idx = findLastAssistantIndex(updated);
                  if (idx >= 0) {
                    updated[idx] = {
                      ...updated[idx],
                      content: updated[idx].content || `Error: ${event.message}`,
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
            const idx = findLastAssistantIndex(updated);
            if (idx >= 0 && !updated[idx].content) {
              updated[idx] = { ...updated[idx], content: `Error: ${message}` };
            }
            return updated;
          });
        }
      } finally {
        setIsStreaming(false);
        abortRef.current = null;
        // Notify sidebar to refresh credits after chat response
        window.dispatchEvent(new CustomEvent("nexus:credits-changed"));

        // Mark that drain should happen (actual drain is in useEffect watching isStreaming)
        // We don't drain here because React state (isStreaming=false) hasn't flushed yet.
      }
    },
    [sessionId, isStreaming]
  );

  // Stable ref for sendMessage so the drain callback can call it
  const sendMessageRef = useRef(sendMessage);
  sendMessageRef.current = sendMessage;

  // Drain pending queue when streaming stops (reactive, no timing heuristic)
  const prevStreamingRef = useRef(false);
  useEffect(() => {
    // Only drain on transition from streaming -> not streaming
    if (prevStreamingRef.current && !isStreaming && pendingQueue.current.length > 0) {
      const queued = [...pendingQueue.current];
      pendingQueue.current = [];

      const combinedMessage = queued.map((q) => q.message).join("\n\n");
      const combinedFiles = queued.flatMap((q) => q.files ?? []);

      // Remove pending turns from UI (they'll be replaced by the real send)
      setTurns((prev) => prev.filter((t) => !t.pending));

      // Send on next frame to ensure state has flushed
      requestAnimationFrame(() => {
        sendMessageRef.current(combinedMessage, combinedFiles.length > 0 ? combinedFiles : undefined);
      });
    }
    prevStreamingRef.current = isStreaming;
  }, [isStreaming]);

  const stop = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  return { turns, isStreaming, sendMessage, stop, loadHistory, upgradeRequired, creditsExhausted, setModel };
}

function mapFilesForDisplay(files?: FileAttachment[]) {
  return files?.map((f) => ({ name: f.name, type: f.type, size: f.size, previewUrl: f.previewUrl }));
}

/** Find the last non-pending assistant turn index (skips pending user messages appended after it) */
function findLastAssistantIndex(turns: ChatTurn[]): number {
  for (let i = turns.length - 1; i >= 0; i--) {
    if (turns[i].role === "assistant") return i;
  }
  return -1;
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

      // Restore sycophancy index from persisted metadata
      if (msg.metadata) {
        try {
          const meta = JSON.parse(msg.metadata);
          if (meta.sycophancyIndex) {
            turn.sycophancyIndex = meta.sycophancyIndex;
          }
        } catch {
          // corrupted metadata, skip
        }
      }

      turns.push(turn);
    }
  }

  return turns;
}
