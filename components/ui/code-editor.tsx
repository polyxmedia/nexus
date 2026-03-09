"use client";

import { useRef, useEffect, useMemo } from "react";
import { EditorState } from "@codemirror/state";
import { EditorView, keymap, lineNumbers, highlightActiveLineGutter, highlightActiveLine, drawSelection, rectangularSelection, crosshairCursor, highlightSpecialChars } from "@codemirror/view";
import { defaultKeymap, history, historyKeymap, indentWithTab } from "@codemirror/commands";
import { foldGutter, indentOnInput, bracketMatching, foldKeymap } from "@codemirror/language";
import { markdown } from "@codemirror/lang-markdown";

// Custom NEXUS dark theme matching navy palette
const nexusTheme = EditorView.theme(
  {
    "&": {
      backgroundColor: "transparent",
      color: "#c4c4c4",
      fontSize: "12px",
      fontFamily: "'IBM Plex Mono', monospace",
    },
    ".cm-content": {
      caretColor: "#22d3ee",
      lineHeight: "1.6",
      padding: "12px 0",
    },
    ".cm-cursor, .cm-dropCursor": {
      borderLeftColor: "#22d3ee",
    },
    "&.cm-focused .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection":
      {
        backgroundColor: "#22d3ee15",
      },
    ".cm-gutters": {
      backgroundColor: "transparent",
      color: "#3a3a4a",
      border: "none",
      borderRight: "1px solid #1a1a2e",
      paddingRight: "4px",
    },
    ".cm-gutter.cm-lineNumbers .cm-gutterElement": {
      padding: "0 8px 0 12px",
      minWidth: "32px",
      fontSize: "10px",
      fontFamily: "'IBM Plex Mono', monospace",
    },
    ".cm-activeLineGutter": {
      backgroundColor: "transparent",
      color: "#6a6a8a",
    },
    ".cm-activeLine": {
      backgroundColor: "#ffffff04",
    },
    ".cm-foldGutter .cm-gutterElement": {
      padding: "0 4px",
      color: "#3a3a4a",
      fontSize: "10px",
    },
    ".cm-foldGutter .cm-gutterElement:hover": {
      color: "#8a8aaa",
    },
    ".cm-foldPlaceholder": {
      backgroundColor: "#22d3ee10",
      border: "1px solid #22d3ee30",
      color: "#22d3ee80",
      borderRadius: "3px",
      padding: "0 4px",
      margin: "0 2px",
    },
    "&.cm-focused": {
      outline: "none",
    },
    ".cm-scroller": {
      overflow: "auto",
      fontFamily: "'IBM Plex Mono', monospace",
    },
    // Markdown syntax highlighting
    ".cm-header": { color: "#22d3ee" },
    ".cm-strong": { color: "#f59e0b", fontWeight: "bold" },
    ".cm-emphasis": { color: "#a78bfa", fontStyle: "italic" },
    ".cm-link": { color: "#22d3ee", textDecoration: "underline" },
    ".cm-url": { color: "#3a8a8a" },
    ".cm-comment": { color: "#4a4a6a" },
    ".cm-meta": { color: "#6a6a8a" },
    ".cm-string": { color: "#10b981" },
  },
  { dark: true }
);

interface CodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  height?: string;
  readOnly?: boolean;
}

export function CodeEditor({ value, onChange, height = "320px", readOnly = false }: CodeEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  // Stable extension ref
  const handleUpdate = useMemo(
    () =>
      EditorView.updateListener.of((update) => {
        if (update.docChanged) {
          onChangeRef.current(update.state.doc.toString());
        }
      }),
    []
  );

  useEffect(() => {
    if (!containerRef.current) return;

    const state = EditorState.create({
      doc: value,
      extensions: [
        lineNumbers(),
        highlightActiveLineGutter(),
        highlightSpecialChars(),
        history(),
        foldGutter(),
        drawSelection(),
        indentOnInput(),
        bracketMatching(),
        rectangularSelection(),
        crosshairCursor(),
        highlightActiveLine(),
        keymap.of([...defaultKeymap, ...historyKeymap, ...foldKeymap, indentWithTab]),
        markdown(),
        nexusTheme,
        EditorView.lineWrapping,
        handleUpdate,
        ...(readOnly ? [EditorState.readOnly.of(true)] : []),
      ],
    });

    const view = new EditorView({
      state,
      parent: containerRef.current,
    });

    viewRef.current = view;

    return () => {
      view.destroy();
      viewRef.current = null;
    };
    // Only create once
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync external value changes (e.g. reset to default)
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    const currentValue = view.state.doc.toString();
    if (currentValue !== value) {
      view.dispatch({
        changes: { from: 0, to: currentValue.length, insert: value },
      });
    }
  }, [value]);

  return (
    <div
      ref={containerRef}
      className="border border-navy-700/50 rounded overflow-hidden bg-navy-950/80"
      style={{ height, minHeight: "200px" }}
    />
  );
}
