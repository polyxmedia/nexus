"use client";

import { useState, useRef, useCallback } from "react";
import { ArrowRight, Square } from "lucide-react";
import { cn } from "@/lib/utils";

interface ChatInputProps {
  onSend: (message: string) => void;
  onStop: () => void;
  isStreaming: boolean;
  disabled?: boolean;
}

export function ChatInput({ onSend, onStop, isStreaming, disabled }: ChatInputProps) {
  const [value, setValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = useCallback(() => {
    const trimmed = value.trim();
    if (!trimmed || isStreaming || disabled) return;
    onSend(trimmed);
    setValue("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  }, [value, isStreaming, disabled, onSend]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend]
  );

  const handleInput = useCallback(() => {
    const el = textareaRef.current;
    if (el) {
      el.style.height = "auto";
      el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
    }
  }, []);

  return (
    <div className="bg-navy-950 px-4 pb-4 pt-3">
      <div className="relative">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onInput={handleInput}
          placeholder="Ask NEXUS..."
          disabled={disabled}
          rows={1}
          className={cn(
            "w-full resize-none rounded-xl border border-navy-700/50 bg-navy-800/80 pl-4 pr-11 py-2.5",
            "text-sm text-navy-100 font-mono placeholder:text-navy-500",
            "focus:border-accent-cyan/40 focus:outline-none focus:ring-1 focus:ring-accent-cyan/30",
            "disabled:cursor-not-allowed disabled:opacity-50",
            "max-h-[200px]"
          )}
        />

        {isStreaming ? (
          <button
            onClick={onStop}
            className="absolute right-3 bottom-2.5 flex h-7 w-7 items-center justify-center rounded-md text-accent-rose hover:text-accent-rose/80 transition-colors"
          >
            <Square className="h-3.5 w-3.5" fill="currentColor" />
          </button>
        ) : (
          <button
            onClick={handleSend}
            disabled={!value.trim() || disabled}
            className={cn(
              "absolute right-3 bottom-2.5 flex h-7 w-7 items-center justify-center rounded-md transition-colors",
              value.trim() && !disabled
                ? "text-accent-cyan hover:text-accent-cyan/80"
                : "text-navy-600 cursor-not-allowed"
            )}
          >
            <ArrowRight className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}
