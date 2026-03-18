"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { CodeEditor } from "@/components/ui/code-editor";
import { Loader2, CheckCircle2, Save, RotateCcw, ChevronDown, ChevronRight } from "lucide-react";
import type { PromptEntry } from "./types";

export function PromptEditor({
  prompt,
  onSave,
  onReset,
}: {
  prompt: PromptEntry;
  onSave: (key: string, value: string) => Promise<void>;
  onReset: (key: string) => Promise<void>;
}) {
  const [expanded, setExpanded] = useState(false);
  const [value, setValue] = useState(prompt.value);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [showDefault, setShowDefault] = useState(false);

  const isDirty = value !== prompt.value;
  const isModifiedFromDefault = prompt.isOverridden;

  const handleSave = async () => {
    setSaving(true);
    await onSave(prompt.key, value);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleReset = async () => {
    setResetting(true);
    await onReset(prompt.key);
    setValue(prompt.defaultValue);
    setResetting(false);
  };

  const charCount = value.length;
  const lineCount = value.split("\n").length;

  return (
    <div className="border border-navy-700/50 rounded overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-navy-800/30 transition-colors text-left"
      >
        <div className="flex items-center gap-3 min-w-0">
          {expanded ? (
            <ChevronDown className="h-3.5 w-3.5 text-navy-500 shrink-0" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5 text-navy-500 shrink-0" />
          )}
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-[12px] font-medium text-navy-200">
                {prompt.label}
              </span>
              {isModifiedFromDefault && (
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-accent-amber/15 text-accent-amber font-mono uppercase tracking-wider">
                  Modified
                </span>
              )}
            </div>
            <span className="text-[10px] text-navy-500 block truncate">
              {prompt.description}
            </span>
          </div>
        </div>
        <span className="text-[10px] text-navy-600 font-mono shrink-0 ml-3">
          {charCount.toLocaleString()} chars
        </span>
      </button>

      {expanded && (
        <div className="border-t border-navy-700/50 p-4 space-y-3">
          <CodeEditor
            value={value}
            onChange={setValue}
            height="320px"
          />

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-[10px] text-navy-600 font-mono">
                {lineCount} lines
              </span>
              <span className="text-[10px] text-navy-600 font-mono">
                {prompt.key}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowDefault(!showDefault)}
                className="text-[10px] text-navy-500 hover:text-navy-300 transition-colors underline"
              >
                {showDefault ? "Hide default" : "View default"}
              </button>

              {isModifiedFromDefault && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleReset}
                  disabled={resetting}
                  className="text-[10px] text-navy-400 hover:text-accent-amber"
                >
                  {resetting ? (
                    <Loader2 className="h-3 w-3 animate-spin mr-1" />
                  ) : (
                    <RotateCcw className="h-3 w-3 mr-1" />
                  )}
                  Reset to default
                </Button>
              )}

              <Button
                variant="outline"
                size="sm"
                onClick={handleSave}
                disabled={saving || !isDirty}
              >
                {saving ? (
                  <Loader2 className="h-3 w-3 animate-spin mr-1" />
                ) : saved ? (
                  <CheckCircle2 className="h-3 w-3 text-accent-emerald mr-1" />
                ) : (
                  <Save className="h-3 w-3 mr-1" />
                )}
                {saved ? "Saved" : "Save"}
              </Button>
            </div>
          </div>

          {showDefault && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] text-navy-500 uppercase tracking-wider font-medium">
                  Default prompt
                </span>
                <button
                  onClick={() => {
                    setValue(prompt.defaultValue);
                    setShowDefault(false);
                  }}
                  className="text-[10px] text-navy-500 hover:text-navy-300 transition-colors underline"
                >
                  Restore this
                </button>
              </div>
              <CodeEditor
                value={prompt.defaultValue}
                onChange={() => {}}
                height="240px"
                readOnly
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
