"use client";

import { useState, useRef, useCallback, type ChangeEvent, type DragEvent } from "react";
import { ArrowUp, Square, Paperclip, X, FileText, Image as ImageIcon, Mic, MicOff, Volume2, VolumeX } from "lucide-react";
import { cn } from "@/lib/utils";

export interface FileAttachment {
  name: string;
  type: string;
  size: number;
  /** Base64-encoded data only (no data URL prefix) — sent to API */
  data: string;
  /** Full data URL for thumbnail preview (images only, client-side only) */
  previewUrl?: string;
}

interface ChatInputProps {
  onSend: (message: string, files?: FileAttachment[]) => void;
  onStop: () => void;
  isStreaming: boolean;
  disabled?: boolean;
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
  voiceAvailable, voiceEnabled, isListening, isSpeaking, transcript,
  onToggleVoice, onStartListening, onStopListening, onStopSpeaking,
}: ChatInputProps) {
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
    if ((!trimmed && files.length === 0) || isStreaming || disabled) return;
    onSend(trimmed, files.length > 0 ? files : undefined);
    setValue("");
    setFiles([]);
    resetHeight();
    // re-focus textarea after send
    requestAnimationFrame(() => textareaRef.current?.focus());
  }, [value, files, isStreaming, disabled, onSend, resetHeight]);

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
          "rounded-2xl border bg-navy-900/80 backdrop-blur-sm overflow-hidden transition-all duration-150",
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

        {/* Voice transcript indicator */}
        {isListening && transcript && (
          <div className="px-4 pt-2 pb-0">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent-rose opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-accent-rose" />
              </span>
              <span className="font-mono text-[11px] text-navy-400 italic truncate">
                {transcript}
              </span>
            </div>
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
            "text-sm text-navy-100 font-mono placeholder:text-navy-600",
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
            disabled={disabled || isStreaming}
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
              {/* Mic button */}
              <button
                type="button"
                onClick={() => {
                  if (isListening) {
                    onStopListening?.();
                  } else {
                    onStartListening?.();
                  }
                }}
                disabled={disabled || isStreaming}
                title={isListening ? "Stop recording" : "Voice input"}
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

              {/* Voice mode toggle (TTS) */}
              <button
                type="button"
                onClick={() => {
                  if (isSpeaking) {
                    onStopSpeaking?.();
                  } else {
                    onToggleVoice?.();
                  }
                }}
                title={
                  isSpeaking
                    ? "Stop speaking"
                    : voiceEnabled
                    ? "Disable voice responses"
                    : "Enable voice responses"
                }
                className={cn(
                  "flex items-center justify-center h-8 w-8 rounded-lg transition-all",
                  isSpeaking
                    ? "bg-accent-cyan/10 border border-accent-cyan/30 text-accent-cyan animate-pulse"
                    : voiceEnabled
                    ? "bg-accent-cyan/10 border border-accent-cyan/30 text-accent-cyan"
                    : "text-navy-500 hover:text-navy-300 hover:bg-navy-800/70"
                )}
              >
                {voiceEnabled || isSpeaking ? (
                  <Volume2 className="h-[15px] w-[15px]" />
                ) : (
                  <VolumeX className="h-[15px] w-[15px]" />
                )}
              </button>
            </>
          )}

          <div className="flex-1" />

          {/* Keyboard hint */}
          <span className="hidden md:block font-mono text-[10px] text-navy-700 select-none mr-1">
            ⇧↵ newline
          </span>

          {/* Send / Stop */}
          {isStreaming ? (
            <button
              type="button"
              onClick={onStop}
              title="Stop generating"
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent-rose/10 border border-accent-rose/20 text-accent-rose hover:bg-accent-rose/20 hover:border-accent-rose/30 transition-all"
            >
              <Square className="h-3.5 w-3.5" fill="currentColor" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSend}
              disabled={!canSend}
              title="Send message"
              className={cn(
                "flex h-8 w-8 items-center justify-center rounded-lg transition-all",
                canSend
                  ? "bg-accent-cyan/10 border border-accent-cyan/30 text-accent-cyan hover:bg-accent-cyan/20 hover:border-accent-cyan/40"
                  : "bg-navy-800/40 border border-navy-700/30 text-navy-700 cursor-not-allowed"
              )}
            >
              <ArrowUp className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Drop hint below box */}
      <p className="mt-1.5 text-center font-mono text-[9px] text-navy-800 select-none">
        Drag &amp; drop files · Paste images
      </p>
    </div>
  );
}
