"use client";

import { useEffect, useState, useCallback, memo, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { PageContainer } from "@/components/layout/page-container";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Save,
  Loader2,
  RotateCcw,
  Sparkles,
  Eye,
  Plus,
  Trash2,
  ArrowLeft,
  Grid3X3,
  Type,
  Palette,
  Layout,
  Send,
} from "lucide-react";
import Link from "next/link";
import { RADAR_PATHS, RADAR_CIRCLE } from "@/lib/icons/radar-paths";

interface TagConfig {
  tag: string;
  color: string;
}

interface OGConfig {
  title: string;
  subtitle: string;
  label: string;
  topBar: string;
  tags: TagConfig[];
  accentColor: string;
  backgroundColor: string;
  titleColor: string;
  subtitleColor: string;
  labelColor: string;
  showGrid: boolean;
  showAccentLine: boolean;
  showRadar: boolean;
  gridSpacing: number;
  gridOpacity: number;
  bottomLeft: string;
  bottomRight: string;
  titleSize: number;
  subtitleSize: number;
  radarColor: string;
  radarOpacity: number;
  radarSize: number;
}

const DEFAULT_CONFIG: OGConfig = {
  title: "NEXUS Intelligence",
  subtitle:
    "Geopolitical-market convergence analysis. Four primary signal layers. AI-driven intelligence before consensus.",
  label: "Signal Intelligence",
  topBar: "NEXUS / Intelligence Platform",
  tags: [
    { tag: "GEO", color: "#06b6d4" },
    { tag: "MKT", color: "#f43f5e" },
    { tag: "OSI", color: "#8b5cf6" },
    { tag: "SYS", color: "#f59e0b" },
  ],
  accentColor: "#06b6d4",
  backgroundColor: "#000000",
  titleColor: "#e8e8e8",
  subtitleColor: "#555555",
  labelColor: "#06b6d4",
  showGrid: true,
  showAccentLine: true,
  showRadar: true,
  gridSpacing: 60,
  gridOpacity: 0.03,
  bottomLeft: "nexushq.xyz",
  bottomRight: "A Polyxmedia Product",
  titleSize: 64,
  subtitleSize: 20,
  radarColor: "#06b6d4",
  radarOpacity: 0.08,
  radarSize: 420,
};

const RadarSVG = ({ color, size: s }: { color: string; size: number }) => (
  <svg
    width={s}
    height={s}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth="1"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    {RADAR_PATHS.map((d) => (
      <path key={d} d={d} />
    ))}
    <circle cx={RADAR_CIRCLE.cx} cy={RADAR_CIRCLE.cy} r={RADAR_CIRCLE.r} />
  </svg>
);

const RadarSVGSmall = ({ color }: { color: string }) => (
  <svg
    width={16}
    height={16}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    {RADAR_PATHS.map((d) => (
      <path key={d} d={d} />
    ))}
    <circle cx={RADAR_CIRCLE.cx} cy={RADAR_CIRCLE.cy} r={RADAR_CIRCLE.r} />
  </svg>
);

const OGPreview = memo(function OGPreview({ config }: { config: OGConfig }) {
  const c = config;

  return (
    <div className="relative overflow-hidden w-full rounded-md" style={{ aspectRatio: "1200/630" }}>
      <div
        className="absolute inset-0 flex flex-col"
        style={{
          background: c.backgroundColor,
          fontFamily: "'IBM Plex Mono', monospace",
          overflow: "hidden",
        }}
      >
        {/* Grid overlay */}
        {c.showGrid && (
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: `linear-gradient(rgba(255,255,255,${c.gridOpacity}) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,${c.gridOpacity}) 1px, transparent 1px)`,
              backgroundSize: `${c.gridSpacing / 1200 * 100}% ${c.gridSpacing / 630 * 100}%`,
            }}
          />
        )}

        {/* Left accent line */}
        {c.showAccentLine && (
          <div
            className="absolute top-0 bottom-0"
            style={{
              left: "6.67%",
              width: 1,
              background: `linear-gradient(to bottom, transparent, ${c.accentColor}66, transparent)`,
            }}
          />
        )}

        {/* Bottom accent line */}
        {c.showAccentLine && (
          <div
            className="absolute left-0 right-0"
            style={{
              bottom: "11.1%",
              height: 1,
              background: `linear-gradient(to right, transparent, ${c.accentColor}33, transparent)`,
            }}
          />
        )}

        {/* Radar icon - background watermark */}
        {c.showRadar && (
          <div
            className="absolute flex items-center justify-center"
            style={{
              right: "5%",
              top: "50%",
              transform: "translateY(-50%)",
              opacity: c.radarOpacity,
            }}
          >
            <RadarSVG color={c.radarColor} size={Math.round(c.radarSize * 280 / 420)} />
          </div>
        )}

        {/* Top bar */}
        <div className="flex items-center gap-[0.8%] relative" style={{ padding: "7% 6.67% 0" }}>
          <RadarSVGSmall color={c.accentColor} />
          <span
            style={{
              color: "#555555",
              fontSize: "clamp(8px, 1.08vw, 13px)",
              letterSpacing: "0.25em",
              textTransform: "uppercase",
            }}
          >
            {c.topBar}
          </span>
        </div>

        {/* Main content */}
        <div
          className="flex flex-col flex-1 justify-center relative"
          style={{ padding: "0 8.33%" }}
        >
          <div
            style={{
              fontSize: "clamp(8px, 1.17vw, 14px)",
              letterSpacing: "0.3em",
              color: c.labelColor,
              textTransform: "uppercase",
              marginBottom: "3.8%",
            }}
          >
            {c.label}
          </div>

          <div
            style={{
              fontSize: `clamp(24px, ${c.titleSize / 1200 * 100}vw, ${c.titleSize}px)`,
              fontWeight: 700,
              color: c.titleColor,
              lineHeight: 1.05,
              letterSpacing: "-0.02em",
              marginBottom: "4.4%",
              maxWidth: "62.5%",
            }}
          >
            {c.title}
          </div>

          <div
            style={{
              fontSize: `clamp(10px, ${c.subtitleSize / 1200 * 100}vw, ${c.subtitleSize}px)`,
              color: c.subtitleColor,
              lineHeight: 1.5,
              maxWidth: "50%",
              marginBottom: "7%",
            }}
          >
            {c.subtitle}
          </div>

          {/* Tags */}
          <div className="flex gap-[1.2%]">
            {c.tags.map(({ tag, color }) => (
              <div
                key={tag}
                style={{
                  padding: "0.6% 1.5%",
                  borderRadius: 6,
                  border: `1px solid ${color}40`,
                  background: `${color}15`,
                  color,
                  fontSize: "clamp(7px, 1.08vw, 13px)",
                  letterSpacing: "0.2em",
                  fontWeight: 700,
                }}
              >
                {tag}
              </div>
            ))}
          </div>
        </div>

        {/* Bottom bar */}
        <div
          className="flex items-center justify-between relative"
          style={{ padding: "0 6.67% 5.7%" }}
        >
          <span
            style={{
              color: "#333333",
              fontSize: "clamp(7px, 1vw, 12px)",
              letterSpacing: "0.2em",
              textTransform: "uppercase",
            }}
          >
            {c.bottomLeft}
          </span>
          <span
            style={{
              color: "#333333",
              fontSize: "clamp(7px, 1vw, 12px)",
              letterSpacing: "0.2em",
              textTransform: "uppercase",
            }}
          >
            {c.bottomRight}
          </span>
        </div>
      </div>
    </div>
  );
});

function ColorInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <div
        className="w-6 h-6 rounded border border-navy-600 cursor-pointer relative overflow-hidden flex-shrink-0"
        style={{ background: value }}
      >
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="absolute inset-0 opacity-0 cursor-pointer"
        />
      </div>
      <span className="text-[10px] font-mono text-navy-400 uppercase tracking-wider min-w-[70px]">
        {label}
      </span>
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-7 text-xs font-mono w-24"
      />
    </div>
  );
}

export default function OGDesignerPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [config, setConfig] = useState<OGConfig>(DEFAULT_CONFIG);
  const [previewConfig, setPreviewConfig] = useState<OGConfig>(DEFAULT_CONFIG);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<"text" | "colors" | "layout" | "tags">("text");

  // Debounce preview updates to avoid re-rendering the heavy preview on every keystroke
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setPreviewConfig(config);
    }, 150);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [config]);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  const loadConfig = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/og-designer");
      if (res.ok) {
        const data = await res.json();
        if (data.config) {
          const merged = { ...DEFAULT_CONFIG, ...data.config };
          setConfig(merged);
          setPreviewConfig(merged);
        }
      }
    } catch {
      // Use defaults
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    setError(null);
    try {
      const res = await fetch("/api/admin/og-designer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "save", config }),
      });
      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Failed to save");
      }
    } catch {
      setError("Network error");
    } finally {
      setSaving(false);
    }
  };

  const handleGenerate = async () => {
    if (!aiPrompt.trim()) return;
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/og-designer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "generate", config, prompt: aiPrompt }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.config) {
        const merged = { ...DEFAULT_CONFIG, ...data.config };
        setConfig(merged);
        setPreviewConfig(merged);
        setAiPrompt("");
      } else {
        setError(data.error || "Generation failed");
      }
    } catch {
      setError("Network error");
    } finally {
      setGenerating(false);
    }
  };

  const updateConfig = (partial: Partial<OGConfig>) => {
    setConfig((prev) => ({ ...prev, ...partial }));
  };

  const updateTag = (index: number, field: keyof TagConfig, value: string) => {
    const newTags = [...config.tags];
    newTags[index] = { ...newTags[index], [field]: value };
    updateConfig({ tags: newTags });
  };

  const addTag = () => {
    updateConfig({ tags: [...config.tags, { tag: "NEW", color: "#06b6d4" }] });
  };

  const removeTag = (index: number) => {
    updateConfig({ tags: config.tags.filter((_, i) => i !== index) });
  };

  if (status === "loading" || loading) {
    return (
      <PageContainer title="OG Image Designer">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-5 w-5 animate-spin text-navy-400" />
        </div>
      </PageContainer>
    );
  }

  const sections = [
    { id: "text" as const, label: "Text", icon: Type },
    { id: "colors" as const, label: "Colors", icon: Palette },
    { id: "layout" as const, label: "Layout", icon: Layout },
    { id: "tags" as const, label: "Tags", icon: Grid3X3 },
  ];

  return (
    <PageContainer title="OG Image Designer">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link
            href="/admin"
            className="flex items-center gap-1.5 text-[11px] text-navy-400 hover:text-navy-200 transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Admin
          </Link>
          <span className="text-navy-600">/</span>
          <span className="text-[11px] font-mono text-navy-200 uppercase tracking-wider">
            OG Image Designer
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => { setConfig(DEFAULT_CONFIG); setPreviewConfig(DEFAULT_CONFIG); }}
            className="gap-1.5"
          >
            <RotateCcw className="h-3 w-3" />
            Reset
          </Button>
          <a
            href="/opengraph-image"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Button variant="outline" size="sm" className="gap-1.5">
              <Eye className="h-3 w-3" />
              View Live
            </Button>
          </a>
          <Button
            size="sm"
            onClick={handleSave}
            disabled={saving}
            className="gap-1.5"
          >
            {saving ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Save className="h-3 w-3" />
            )}
            {saved ? "Saved" : "Save"}
          </Button>
        </div>
      </div>

      {/* AI Designer */}
      <div className="border border-navy-700/40 rounded-lg bg-navy-900/20 p-4 mb-6">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="h-3.5 w-3.5 text-accent-amber" />
          <span className="text-[10px] font-mono uppercase tracking-wider text-navy-300">
            AI Design Assistant
          </span>
        </div>
        <div className="flex gap-2">
          <Input
            value={aiPrompt}
            onChange={(e) => setAiPrompt(e.target.value)}
            placeholder="Describe what you want... e.g. 'make it more aggressive with red accents' or 'clean minimal style with just the title'"
            className="flex-1 text-sm"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleGenerate();
              }
            }}
          />
          <Button
            size="sm"
            onClick={handleGenerate}
            disabled={generating || !aiPrompt.trim()}
            className="gap-1.5"
          >
            {generating ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Send className="h-3 w-3" />
            )}
            Generate
          </Button>
        </div>
        <p className="text-[10px] text-navy-500 mt-2">
          Claude will redesign the OG image based on your description. You can iterate on the results.
        </p>
      </div>

      {/* Error display */}
      {error && (
        <div className="flex items-center justify-between border border-accent-rose/30 rounded-lg bg-accent-rose/[0.05] px-4 py-2.5 mb-6">
          <span className="text-[11px] font-mono text-accent-rose">{error}</span>
          <button onClick={() => setError(null)} className="text-accent-rose/60 hover:text-accent-rose text-xs ml-4">
            Dismiss
          </button>
        </div>
      )}

      {/* Full-width preview */}
      <div className="mb-6">
        <div className="text-[10px] font-mono uppercase tracking-wider text-navy-400 mb-3">
          Preview (1200x630)
        </div>
        <div className="border border-navy-700/40 rounded-lg overflow-hidden bg-navy-900/20 p-3">
          <OGPreview config={previewConfig} />
        </div>
        <p className="text-[10px] text-navy-500 mt-2">
          This is how the image will appear when shared on Twitter, LinkedIn, Slack, etc.
        </p>
      </div>

      <div>
          {/* Section tabs */}
          <div className="flex gap-0 border-b border-navy-700 mb-4">
            {sections.map((s) => (
              <button
                key={s.id}
                onClick={() => setActiveSection(s.id)}
                className={`flex items-center gap-1.5 px-4 py-2 text-[11px] font-medium uppercase tracking-wider border-b-2 transition-colors ${
                  activeSection === s.id
                    ? "text-navy-100 border-navy-100"
                    : "text-navy-500 border-transparent hover:text-navy-300"
                }`}
              >
                <s.icon className="h-3.5 w-3.5" />
                {s.label}
              </button>
            ))}
          </div>

          <div className="space-y-4">
            {/* Text Section */}
            {activeSection === "text" && (
              <>
                <div>
                  <label className="text-[10px] font-mono uppercase tracking-wider text-navy-400 mb-1.5 block">
                    Title
                  </label>
                  <Input
                    value={config.title}
                    onChange={(e) => updateConfig({ title: e.target.value })}
                    className="text-sm"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-mono uppercase tracking-wider text-navy-400 mb-1.5 block">
                    Subtitle
                  </label>
                  <textarea
                    value={config.subtitle}
                    onChange={(e) => updateConfig({ subtitle: e.target.value })}
                    rows={3}
                    className="w-full rounded-md border border-navy-700 bg-navy-900/60 px-3 py-2 text-sm text-navy-100 placeholder:text-navy-500 focus:outline-none focus:ring-1 focus:ring-navy-500"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-mono uppercase tracking-wider text-navy-400 mb-1.5 block">
                      Label (above title)
                    </label>
                    <Input
                      value={config.label}
                      onChange={(e) => updateConfig({ label: e.target.value })}
                      className="text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-mono uppercase tracking-wider text-navy-400 mb-1.5 block">
                      Top Bar
                    </label>
                    <Input
                      value={config.topBar}
                      onChange={(e) => updateConfig({ topBar: e.target.value })}
                      className="text-sm"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-mono uppercase tracking-wider text-navy-400 mb-1.5 block">
                      Bottom Left
                    </label>
                    <Input
                      value={config.bottomLeft}
                      onChange={(e) => updateConfig({ bottomLeft: e.target.value })}
                      className="text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-mono uppercase tracking-wider text-navy-400 mb-1.5 block">
                      Bottom Right
                    </label>
                    <Input
                      value={config.bottomRight}
                      onChange={(e) => updateConfig({ bottomRight: e.target.value })}
                      className="text-sm"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-mono uppercase tracking-wider text-navy-400 mb-1.5 block">
                      Title Size
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="range"
                        min={28}
                        max={80}
                        value={config.titleSize}
                        onChange={(e) => updateConfig({ titleSize: Number(e.target.value) })}
                        className="flex-1 accent-accent-cyan"
                      />
                      <span className="text-[10px] font-mono text-navy-400 w-8 text-right">
                        {config.titleSize}
                      </span>
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-mono uppercase tracking-wider text-navy-400 mb-1.5 block">
                      Subtitle Size
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="range"
                        min={10}
                        max={28}
                        value={config.subtitleSize}
                        onChange={(e) => updateConfig({ subtitleSize: Number(e.target.value) })}
                        className="flex-1 accent-accent-cyan"
                      />
                      <span className="text-[10px] font-mono text-navy-400 w-8 text-right">
                        {config.subtitleSize}
                      </span>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* Colors Section */}
            {activeSection === "colors" && (
              <div className="space-y-3">
                <ColorInput
                  label="Background"
                  value={config.backgroundColor}
                  onChange={(v) => updateConfig({ backgroundColor: v })}
                />
                <ColorInput
                  label="Accent"
                  value={config.accentColor}
                  onChange={(v) => updateConfig({ accentColor: v })}
                />
                <ColorInput
                  label="Title"
                  value={config.titleColor}
                  onChange={(v) => updateConfig({ titleColor: v })}
                />
                <ColorInput
                  label="Subtitle"
                  value={config.subtitleColor}
                  onChange={(v) => updateConfig({ subtitleColor: v })}
                />
                <ColorInput
                  label="Label"
                  value={config.labelColor}
                  onChange={(v) => updateConfig({ labelColor: v })}
                />

                {/* Radar icon controls */}
                <div className="border-t border-navy-700/40 pt-3 mt-3 space-y-3">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-navy-400 block">
                    Radar Icon
                  </span>
                  <ColorInput
                    label="Color"
                    value={config.radarColor}
                    onChange={(v) => updateConfig({ radarColor: v })}
                  />
                  <div>
                    <label className="text-[10px] font-mono uppercase tracking-wider text-navy-400 mb-1.5 block">
                      Opacity
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="range"
                        min={1}
                        max={40}
                        value={Math.round(config.radarOpacity * 100)}
                        onChange={(e) =>
                          updateConfig({ radarOpacity: Number(e.target.value) / 100 })
                        }
                        className="flex-1 accent-accent-cyan"
                      />
                      <span className="text-[10px] font-mono text-navy-400 w-8 text-right">
                        {(config.radarOpacity * 100).toFixed(0)}%
                      </span>
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-mono uppercase tracking-wider text-navy-400 mb-1.5 block">
                      Size
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="range"
                        min={200}
                        max={600}
                        value={config.radarSize}
                        onChange={(e) =>
                          updateConfig({ radarSize: Number(e.target.value) })
                        }
                        className="flex-1 accent-accent-cyan"
                      />
                      <span className="text-[10px] font-mono text-navy-400 w-12 text-right">
                        {config.radarSize}px
                      </span>
                    </div>
                  </div>
                </div>

                <div className="border-t border-navy-700/40 pt-3 mt-3">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-navy-400 block mb-3">
                    Presets
                  </span>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      {
                        name: "Cyan Intel",
                        accent: "#06b6d4",
                        bg: "#000000",
                        title: "#e8e8e8",
                        label: "#06b6d4",
                      },
                      {
                        name: "Amber Warning",
                        accent: "#f59e0b",
                        bg: "#0a0a00",
                        title: "#f0e0c0",
                        label: "#f59e0b",
                      },
                      {
                        name: "Rose Alert",
                        accent: "#f43f5e",
                        bg: "#0a0000",
                        title: "#f0c0c0",
                        label: "#f43f5e",
                      },
                      {
                        name: "Emerald Ops",
                        accent: "#10b981",
                        bg: "#000a04",
                        title: "#c0f0d8",
                        label: "#10b981",
                      },
                      {
                        name: "Purple Spec",
                        accent: "#8b5cf6",
                        bg: "#050008",
                        title: "#d8c8f0",
                        label: "#8b5cf6",
                      },
                      {
                        name: "Ghost",
                        accent: "#444444",
                        bg: "#000000",
                        title: "#888888",
                        label: "#444444",
                      },
                    ].map((preset) => (
                      <button
                        key={preset.name}
                        onClick={() =>
                          updateConfig({
                            accentColor: preset.accent,
                            backgroundColor: preset.bg,
                            titleColor: preset.title,
                            labelColor: preset.label,
                          })
                        }
                        className="border border-navy-700/40 rounded px-3 py-2 text-[10px] font-mono uppercase tracking-wider text-navy-400 hover:text-navy-200 hover:border-navy-600/60 transition-colors text-left"
                      >
                        <div
                          className="w-3 h-3 rounded-full mb-1.5"
                          style={{ background: preset.accent }}
                        />
                        {preset.name}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Layout Section */}
            {activeSection === "layout" && (
              <div className="space-y-4">
                <div className="space-y-3">
                  {[
                    { key: "showGrid" as const, label: "Grid overlay" },
                    { key: "showAccentLine" as const, label: "Left accent line" },
                    { key: "showRadar" as const, label: "Radar graphic" },
                  ].map(({ key, label }) => (
                    <label
                      key={key}
                      className="flex items-center justify-between cursor-pointer group"
                    >
                      <span className="text-[10px] font-mono uppercase tracking-wider text-navy-400 group-hover:text-navy-200 transition-colors">
                        {label}
                      </span>
                      <button
                        onClick={() => updateConfig({ [key]: !config[key] })}
                        className={`relative w-9 h-5 rounded-full transition-colors ${
                          config[key] ? "bg-accent-cyan" : "bg-navy-700"
                        }`}
                      >
                        <div
                          className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
                            config[key] ? "left-[18px]" : "left-0.5"
                          }`}
                        />
                      </button>
                    </label>
                  ))}
                </div>

                {config.showGrid && (
                  <div className="border-t border-navy-700/40 pt-3 space-y-3">
                    <div>
                      <label className="text-[10px] font-mono uppercase tracking-wider text-navy-400 mb-1.5 block">
                        Grid Spacing
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="range"
                          min={20}
                          max={120}
                          value={config.gridSpacing}
                          onChange={(e) =>
                            updateConfig({ gridSpacing: Number(e.target.value) })
                          }
                          className="flex-1 accent-accent-cyan"
                        />
                        <span className="text-[10px] font-mono text-navy-400 w-8 text-right">
                          {config.gridSpacing}px
                        </span>
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] font-mono uppercase tracking-wider text-navy-400 mb-1.5 block">
                        Grid Opacity
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="range"
                          min={1}
                          max={15}
                          value={Math.round(config.gridOpacity * 100)}
                          onChange={(e) =>
                            updateConfig({ gridOpacity: Number(e.target.value) / 100 })
                          }
                          className="flex-1 accent-accent-cyan"
                        />
                        <span className="text-[10px] font-mono text-navy-400 w-8 text-right">
                          {(config.gridOpacity * 100).toFixed(0)}%
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Tags Section */}
            {activeSection === "tags" && (
              <div className="space-y-3">
                {config.tags.map((tag, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <div
                      className="w-6 h-6 rounded border border-navy-600 cursor-pointer relative overflow-hidden flex-shrink-0"
                      style={{ background: tag.color }}
                    >
                      <input
                        type="color"
                        value={tag.color}
                        onChange={(e) => updateTag(i, "color", e.target.value)}
                        className="absolute inset-0 opacity-0 cursor-pointer"
                      />
                    </div>
                    <Input
                      value={tag.tag}
                      onChange={(e) => updateTag(i, "tag", e.target.value)}
                      className="w-20 h-7 text-xs font-mono uppercase"
                    />
                    <Input
                      value={tag.color}
                      onChange={(e) => updateTag(i, "color", e.target.value)}
                      className="w-24 h-7 text-xs font-mono"
                    />
                    <button
                      onClick={() => removeTag(i)}
                      className="text-navy-500 hover:text-accent-rose transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
                <button
                  onClick={addTag}
                  className="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-wider text-navy-400 hover:text-navy-200 transition-colors"
                >
                  <Plus className="h-3 w-3" />
                  Add tag
                </button>
              </div>
            )}
          </div>
      </div>
    </PageContainer>
  );
}
