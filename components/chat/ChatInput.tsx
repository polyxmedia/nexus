"use client";

import { useState, useRef, useCallback, useEffect, type ChangeEvent, type DragEvent } from "react";
import { ArrowUp, Square, Paperclip, X, FileText, Image as ImageIcon, Mic, MicOff, Phone, PhoneOff, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { VoiceWaveform } from "./VoiceWaveform";

export interface FileAttachment {
  name: string;
  type: string;
  size: number;
  /** Base64-encoded data only (no data URL prefix) — sent to API */
  data: string;
  /** Full data URL for thumbnail preview (images only, client-side only) */
  previewUrl?: string;
}

export const CHAT_MODELS = [
  { id: "claude-sonnet-4-6", label: "Sonnet 4.6", shortLabel: "S4.6" },
  { id: "claude-opus-4-6", label: "Opus 4.6", shortLabel: "O4.6" },
  { id: "claude-haiku-4-5-20251001", label: "Haiku 4.5", shortLabel: "H4.5" },
] as const;

interface ChatInputProps {
  onSend: (message: string, files?: FileAttachment[]) => void;
  onStop: () => void;
  isStreaming: boolean;
  disabled?: boolean;
  /** Model selection */
  selectedModel?: string;
  onModelChange?: (model: string) => void;
  /** Voice mode props (operator+ only) */
  voiceAvailable?: boolean;
  voiceEnabled?: boolean;
  isListening?: boolean;
  isSpeaking?: boolean;
  transcript?: string;
  onToggleVoice?: () => void;
  onStartListening?: () => void;
  onStopListening?: () => void;
  onStopSpeaking?: () => void;
  onCallToggle?: () => void;
  audioStream?: MediaStream | null;
}

const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5 MB
const MAX_TEXT_SIZE = 512 * 1024;        // 512 KB

const ACCEPT_TYPES = [
  "image/jpeg", "image/png", "image/gif", "image/webp",
  ".txt", ".md", ".csv", ".json", ".ts", ".tsx", ".js",
  ".jsx", ".py", ".yaml", ".yml", ".xml", ".html", ".css", ".sql",
].join(",");

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

async function readFile(file: File): Promise<FileAttachment | null> {
  const isImage = file.type.startsWith("image/");
  const maxSize = isImage ? MAX_IMAGE_SIZE : MAX_TEXT_SIZE;
  if (file.size > maxSize) return null;

  return new Promise((resolve) => {
    const reader = new FileReader();
    if (isImage) {
      reader.onload = () => {
        const dataUrl = reader.result as string;
        const base64 = dataUrl.split(",")[1];
        resolve({ name: file.name, type: file.type, size: file.size, data: base64, previewUrl: dataUrl });
      };
      reader.readAsDataURL(file);
    } else {
      reader.onload = () => {
        resolve({ name: file.name, type: file.type, size: file.size, data: reader.result as string });
      };
      reader.readAsText(file);
    }
  });
}

export function ChatInput({
  onSend, onStop, isStreaming, disabled,
  selectedModel, onModelChange,
  voiceAvailable, voiceEnabled, isListening, isSpeaking, transcript,
  onToggleVoice, onStartListening, onStopListening, onStopSpeaking,
  onCallToggle, audioStream,
}: ChatInputProps) {
  const [modelOpen, setModelOpen] = useState(false);
  const modelMenuRef = useRef<HTMLDivElement>(null);

  // Close model menu on outside click
  useEffect(() => {
    if (!modelOpen) return;
    const handler = (e: MouseEvent) => {
      if (modelMenuRef.current && !modelMenuRef.current.contains(e.target as Node)) {
        setModelOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [modelOpen]);
  const [value, setValue] = useState("");
  const [files, setFiles] = useState<FileAttachment[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetHeight = useCallback(() => {
    if (textareaRef.current) textareaRef.current.style.height = "auto";
  }, []);

  const handleSend = useCallback(() => {
    const trimmed = value.trim();
    if ((!trimmed && files.length === 0) || disabled) return;
    onSend(trimmed, files.length > 0 ? files : undefined);
    setValue("");
    setFiles([]);
    resetHeight();
    // re-focus textarea after send
    requestAnimationFrame(() => textareaRef.current?.focus());
  }, [value, files, disabled, onSend, resetHeight]);

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

  const addFiles = useCallback(async (raw: File[]) => {
    const results = await Promise.all(raw.map(readFile));
    const valid = results.filter((f): f is FileAttachment => f !== null);
    if (valid.length) setFiles((prev) => [...prev, ...valid]);
  }, []);

  const handleFileChange = useCallback(
    async (e: ChangeEvent<HTMLInputElement>) => {
      const selected = Array.from(e.target.files || []);
      await addFiles(selected);
      e.target.value = "";
    },
    [addFiles]
  );

  const handlePaste = useCallback(
    async (e: React.ClipboardEvent) => {
      const imageItems = Array.from(e.clipboardData.items).filter((i) =>
        i.type.startsWith("image/")
      );
      if (!imageItems.length) return;
      e.preventDefault();
      const rawFiles = imageItems.map((i) => i.getAsFile()).filter((f): f is File => f !== null);
      await addFiles(rawFiles);
    },
    [addFiles]
  );

  // Drag and drop
  const handleDragOver = useCallback((e: DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);
  const handleDragLeave = useCallback((e: DragEvent) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) setIsDragging(false);
  }, []);
  const handleDrop = useCallback(
    async (e: DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const dropped = Array.from(e.dataTransfer.files);
      await addFiles(dropped);
    },
    [addFiles]
  );

  const removeFile = useCallback((idx: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== idx));
  }, []);

  const canSend = (value.trim().length > 0 || files.length > 0) && !disabled;

  return (
    <div className="px-4 pb-5 pt-2">
      <div
        className={cn(
          "rounded-2xl border bg-navy-900/80 backdrop-blur-sm transition-all duration-150",
          isDragging
            ? "border-accent-cyan/50 ring-1 ring-accent-cyan/30 bg-accent-cyan/[0.03]"
            : "border-navy-700/50 focus-within:border-accent-cyan/30 focus-within:ring-1 focus-within:ring-accent-cyan/20"
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {/* Drag overlay hint */}
        {isDragging && (
          <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none">
            <span className="font-mono text-[11px] text-accent-cyan tracking-wider uppercase">
              Drop files to attach
            </span>
          </div>
        )}

        {/* File chips */}
        {files.length > 0 && (
          <div className="flex flex-wrap gap-2 px-4 pt-3 pb-0">
            {files.map((f, i) => (
              <div
                key={i}
                className="group flex items-center gap-2 rounded-lg border border-navy-600/40 bg-navy-800/70 pl-2 pr-1.5 py-1.5 text-[11px] font-mono text-navy-300 max-w-[200px]"
              >
                {f.previewUrl ? (
                  <img
                    src={f.previewUrl}
                    alt={f.name}
                    className="h-5 w-5 rounded object-cover flex-shrink-0"
                  />
                ) : (
                  <FileText className="h-3.5 w-3.5 text-accent-amber flex-shrink-0" />
                )}
                <span className="truncate flex-1">{f.name}</span>
                <span className="text-navy-600 flex-shrink-0">{formatBytes(f.size)}</span>
                <button
                  onClick={() => removeFile(i)}
                  className="flex-shrink-0 flex items-center justify-center h-4 w-4 rounded text-navy-600 hover:text-navy-200 hover:bg-navy-700/60 transition-all"
                  aria-label="Remove file"
                >
                  <X className="h-2.5 w-2.5" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Voice waveform + transcript */}
        {(isListening || voiceEnabled) && (
          <div className="px-4 pt-3 pb-1 space-y-2">
            {audioStream && (
              <VoiceWaveform stream={audioStream} />
            )}
            {transcript && (
              <div className="flex items-center gap-2">
                <span className="relative flex h-2 w-2 shrink-0">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent-rose opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-accent-rose" />
                </span>
                <span className="font-mono text-[11px] text-navy-300 truncate">
                  {transcript}
                </span>
              </div>
            )}
            {voiceEnabled && !transcript && !audioStream && (
              <div className="flex items-center justify-center gap-2 py-1">
                <span className="relative flex h-2 w-2 shrink-0">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent-emerald opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-accent-emerald" />
                </span>
                <span className="font-mono text-[10px] text-accent-emerald uppercase tracking-wider">
                  {isSpeaking ? "Speaking..." : "Call active"}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Textarea */}
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onInput={handleInput}
          onPaste={handlePaste}
          placeholder={files.length > 0 ? "Add a message or send files…" : "Ask NEXUS…"}
          disabled={disabled}
          rows={1}
          className={cn(
            "w-full resize-none bg-transparent px-4 pt-3 pb-2",
            "text-[16px] md:text-sm text-navy-100 font-mono placeholder:text-navy-600",
            "focus:outline-none",
            "disabled:cursor-not-allowed disabled:opacity-50",
          )}
          style={{ maxHeight: "200px" }}
        />

        {/* Bottom action bar */}
        <div className="flex items-center gap-2 px-3 pb-3 pt-1">
          {/* Attach */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled}
            title="Attach file (images, text, code)"
            className={cn(
              "flex items-center justify-center h-8 w-8 rounded-lg transition-all",
              "text-navy-500 hover:text-navy-300 hover:bg-navy-800/70",
              "disabled:opacity-40 disabled:cursor-not-allowed"
            )}
          >
            <Paperclip className="h-[15px] w-[15px]" />
          </button>

          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept={ACCEPT_TYPES}
            onChange={handleFileChange}
            className="hidden"
          />

          {/* Voice controls (operator+ only) */}
          {voiceAvailable && (
            <>
              {/* Mic button - also interrupts TTS when AI is speaking */}
              <button
                type="button"
                onClick={() => {
                  if (isSpeaking) {
                    onStopSpeaking?.();
                    onStartListening?.();
                  } else if (isListening) {
                    onStopListening?.();
                  } else {
                    onStartListening?.();
                  }
                }}
                disabled={disabled || isStreaming}
                title={isSpeaking ? "Interrupt and speak" : isListening ? "Stop recording" : "Voice input"}
                className={cn(
                  "flex items-center justify-center h-8 w-8 rounded-lg transition-all",
                  isListening
                    ? "bg-accent-rose/10 border border-accent-rose/30 text-accent-rose animate-pulse"
                    : "text-navy-500 hover:text-navy-300 hover:bg-navy-800/70",
                  "disabled:opacity-40 disabled:cursor-not-allowed"
                )}
              >
                {isListening ? (
                  <MicOff className="h-[15px] w-[15px]" />
                ) : (
                  <Mic className="h-[15px] w-[15px]" />
                )}
              </button>

              {/* Voice call toggle (TTS + listening) */}
              <button
                type="button"
                onClick={() => onCallToggle?.()}
                disabled={disabled || isStreaming}
                title={
                  voiceEnabled
                    ? "End voice call"
                    : "Start voice call"
                }
                className={cn(
                  "flex items-center justify-center h-8 w-8 rounded-lg transition-all",
                  voiceEnabled
                    ? "bg-accent-emerald/10 border border-accent-emerald/30 text-accent-emerald"
                    : "text-navy-500 hover:text-navy-300 hover:bg-navy-800/70",
                  isSpeaking && "animate-pulse",
                  "disabled:opacity-40 disabled:cursor-not-allowed"
                )}
              >
                {voiceEnabled ? (
                  <PhoneOff className="h-[15px] w-[15px]" />
                ) : (
                  <Phone className="h-[15px] w-[15px]" />
                )}
              </button>
            </>
          )}

          {/* Model selector */}
          {onModelChange && (
            <div className="relative" ref={modelMenuRef}>
              <button
                type="button"
                onClick={() => setModelOpen((v) => !v)}
                disabled={isStreaming}
                className={cn(
                  "flex items-center gap-1 h-7 rounded-md px-2 transition-all",
                  "font-mono text-[10px] uppercase tracking-wider",
                  "text-navy-500 hover:text-navy-300 hover:bg-navy-800/70",
                  "disabled:opacity-40 disabled:cursor-not-allowed"
                )}
              >
                {CHAT_MODELS.find((m) => m.id === selectedModel)?.shortLabel ?? "S4.6"}
                <ChevronDown className="h-2.5 w-2.5" />
              </button>
              {modelOpen && (
                <div className="absolute bottom-full left-0 mb-1 w-40 rounded-lg border border-navy-700/60 bg-navy-900 shadow-lg overflow-hidden z-50">
                  {CHAT_MODELS.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => {
                        onModelChange(m.id);
                        setModelOpen(false);
                      }}
                      className={cn(
                        "flex items-center justify-between w-full px-3 py-2 text-left transition-colors",
                        "font-mono text-[11px]",
                        m.id === selectedModel
                          ? "text-accent-cyan bg-accent-cyan/5"
                          : "text-navy-400 hover:text-navy-200 hover:bg-navy-800/60"
                      )}
                    >
                      {m.label}
                      {m.id === selectedModel && (
                        <span className="text-[9px] text-accent-cyan">active</span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="flex-1" />

          {/* Keyboard hint */}
          <span className="hidden md:block font-mono text-[10px] text-navy-700 select-none mr-1">
            ⇧↵ newline
          </span>

          {/* Send / Stop */}
          {isStreaming && (
            <button
              type="button"
              onClick={onStop}
              title="Stop generating"
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent-rose/10 border border-accent-rose/20 text-accent-rose hover:bg-accent-rose/20 hover:border-accent-rose/30 transition-all"
            >
              <Square className="h-3.5 w-3.5" fill="currentColor" />
            </button>
          )}
          <button
            type="button"
            onClick={handleSend}
            disabled={!canSend}
            title={isStreaming ? "Queue message (will send after current response)" : "Send message"}
            className={cn(
              "flex h-8 w-8 items-center justify-center rounded-lg transition-all",
              canSend
                ? isStreaming
                  ? "bg-accent-amber/10 border border-accent-amber/30 text-accent-amber hover:bg-accent-amber/20 hover:border-accent-amber/40"
                  : "bg-accent-cyan/10 border border-accent-cyan/30 text-accent-cyan hover:bg-accent-cyan/20 hover:border-accent-cyan/40"
                : "bg-navy-800/40 border border-navy-700/30 text-navy-700 cursor-not-allowed"
            )}
          >
            <ArrowUp className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Drop hint below box */}
      <p className="mt-1.5 text-center font-mono text-[9px] text-navy-800 select-none">
        Drag &amp; drop files · Paste images
      </p>
    </div>
  );
}
