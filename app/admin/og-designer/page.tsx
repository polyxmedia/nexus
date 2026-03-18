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
  Image as ImageIcon,
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
  backgroundImage: string;
  backgroundOverlay: number;
  gradientEnabled: boolean;
  gradientFrom: string;
  gradientTo: string;
  gradientAngle: number;
  titleColor: string;
  subtitleColor: string;
  labelColor: string;
  topBarColor: string;
  bottomBarColor: string;
  showGrid: boolean;
  showAccentLine: boolean;
  showRadar: boolean;
  gridSpacing: number;
  gridOpacity: number;
  bottomLeft: string;
  bottomRight: string;
  titleSize: number;
  titleWeight: number;
  subtitleSize: number;
  labelSize: number;
  tagSize: number;
  contentPaddingLeft: number;
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
  backgroundImage: "",
  backgroundOverlay: 0.6,
  gradientEnabled: false,
  gradientFrom: "#000000",
  gradientTo: "#0a0a1a",
  gradientAngle: 135,
  titleColor: "#e8e8e8",
  subtitleColor: "#555555",
  labelColor: "#06b6d4",
  topBarColor: "#555555",
  bottomBarColor: "#333333",
  showGrid: true,
  showAccentLine: true,
  showRadar: true,
  gridSpacing: 60,
  gridOpacity: 0.03,
  bottomLeft: "nexushq.xyz",
  bottomRight: "A Polyxmedia Product",
  titleSize: 64,
  titleWeight: 700,
  subtitleSize: 20,
  labelSize: 14,
  tagSize: 13,
  contentPaddingLeft: 100,
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
  const padPct = (c.contentPaddingLeft / 1200) * 100;

  return (
    <div className="relative overflow-hidden w-full rounded-md" style={{ aspectRatio: "1200/630" }}>
      <div
        className="absolute inset-0 flex flex-col"
        style={{
          background: c.gradientEnabled
            ? `linear-gradient(${c.gradientAngle}deg, ${c.gradientFrom}, ${c.gradientTo})`
            : c.backgroundColor,
          fontFamily: "'IBM Plex Mono', monospace",
          overflow: "hidden",
        }}
      >
        {/* Background image */}
        {c.backgroundImage && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={c.backgroundImage}
            alt=""
            className="absolute inset-0 w-full h-full object-cover"
          />
        )}

        {/* Dark overlay */}
        {c.backgroundImage && c.backgroundOverlay > 0 && (
          <div
            className="absolute inset-0"
            style={{ background: `rgba(0,0,0,${c.backgroundOverlay})` }}
          />
        )}

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
              left: `${padPct - 1.67}%`,
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

        {/* Radar icon */}
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
        <div
          className="flex items-center gap-[0.8%] relative"
          style={{ padding: `7% ${padPct}% 0` }}
        >
          <RadarSVGSmall color={c.accentColor} />
          <span
            style={{
              color: c.topBarColor,
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
          style={{ padding: `0 ${padPct}%` }}
        >
          <div
            style={{
              fontSize: `clamp(8px, ${c.labelSize / 1200 * 100}vw, ${c.labelSize}px)`,
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
              fontWeight: c.titleWeight,
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
                  fontSize: `clamp(7px, ${c.tagSize / 1200 * 100}vw, ${c.tagSize}px)`,
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
          style={{ padding: `0 ${padPct}% 5.7%` }}
        >
          <span
            style={{
              color: c.bottomBarColor,
              fontSize: "clamp(7px, 1vw, 12px)",
              letterSpacing: "0.2em",
              textTransform: "uppercase",
            }}
          >
            {c.bottomLeft}
          </span>
          <span
            style={{
              color: c.bottomBarColor,
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

// ── Control components ──

function ColorRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="grid grid-cols-[140px_1fr] items-center gap-3">
      <span className="text-[10px] font-mono text-navy-400 uppercase tracking-wider truncate">
        {label}
      </span>
      <div className="flex items-center gap-2">
        <div
          className="w-7 h-7 rounded border border-navy-600 cursor-pointer relative overflow-hidden shrink-0"
          style={{ background: value }}
        >
          <input
            type="color"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="absolute inset-0 opacity-0 cursor-pointer"
          />
        </div>
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-7 text-xs font-mono flex-1"
        />
      </div>
    </div>
  );
}

function SliderRow({
  label,
  value,
  min,
  max,
  step,
  suffix,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  suffix?: string;
  onChange: (v: number) => void;
}) {
  return (
    <div className="grid grid-cols-[140px_1fr] items-center gap-3">
      <span className="text-[10px] font-mono text-navy-400 uppercase tracking-wider truncate">
        {label}
      </span>
      <div className="flex items-center gap-2">
        <input
          type="range"
          min={min}
          max={max}
          step={step || 1}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="flex-1 accent-accent-cyan h-1"
        />
        <span className="text-[10px] font-mono text-navy-400 w-12 text-right tabular-nums shrink-0">
          {typeof step === "number" && step < 1 ? value.toFixed(2) : value}{suffix || ""}
        </span>
      </div>
    </div>
  );
}

function ToggleRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="grid grid-cols-[140px_1fr] items-center gap-3">
      <span className="text-[10px] font-mono text-navy-400 uppercase tracking-wider truncate">
        {label}
      </span>
      <button
        onClick={() => onChange(!value)}
        className={`relative w-9 h-5 rounded-full transition-colors shrink-0 ${
          value ? "bg-accent-cyan" : "bg-navy-700"
        }`}
      >
        <div
          className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
            value ? "left-[18px]" : "left-0.5"
          }`}
        />
      </button>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[10px] font-mono uppercase tracking-wider text-navy-500 pt-3 pb-1 border-t border-navy-700/30 first:border-0 first:pt-0">
      {children}
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
  const [activeSection, setActiveSection] = useState<"text" | "colors" | "background" | "layout" | "tags">("text");

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
    { id: "background" as const, label: "Background", icon: ImageIcon },
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
            placeholder="Describe what you want... e.g. 'dark cinematic with red accents' or 'clean minimal with gradient background'"
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

      {/* Controls */}
      <div>
        {/* Section tabs */}
        <div className="flex gap-0 border-b border-navy-700 mb-5">
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

        <div className="space-y-3 max-w-2xl">
          {/* ── Text Section ── */}
          {activeSection === "text" && (
            <>
              <div className="grid grid-cols-[140px_1fr] items-start gap-3">
                <span className="text-[10px] font-mono text-navy-400 uppercase tracking-wider pt-2">Title</span>
                <Input
                  value={config.title}
                  onChange={(e) => updateConfig({ title: e.target.value })}
                  className="text-sm"
                />
              </div>
              <div className="grid grid-cols-[140px_1fr] items-start gap-3">
                <span className="text-[10px] font-mono text-navy-400 uppercase tracking-wider pt-2">Subtitle</span>
                <textarea
                  value={config.subtitle}
                  onChange={(e) => updateConfig({ subtitle: e.target.value })}
                  rows={3}
                  className="w-full rounded-md border border-navy-700 bg-navy-900/60 px-3 py-2 text-sm text-navy-100 placeholder:text-navy-500 focus:outline-none focus:ring-1 focus:ring-navy-500"
                />
              </div>
              <div className="grid grid-cols-[140px_1fr] items-center gap-3">
                <span className="text-[10px] font-mono text-navy-400 uppercase tracking-wider">Label</span>
                <Input
                  value={config.label}
                  onChange={(e) => updateConfig({ label: e.target.value })}
                  className="text-sm"
                />
              </div>
              <div className="grid grid-cols-[140px_1fr] items-center gap-3">
                <span className="text-[10px] font-mono text-navy-400 uppercase tracking-wider">Top Bar</span>
                <Input
                  value={config.topBar}
                  onChange={(e) => updateConfig({ topBar: e.target.value })}
                  className="text-sm"
                />
              </div>
              <div className="grid grid-cols-[140px_1fr] items-center gap-3">
                <span className="text-[10px] font-mono text-navy-400 uppercase tracking-wider">Bottom Left</span>
                <Input
                  value={config.bottomLeft}
                  onChange={(e) => updateConfig({ bottomLeft: e.target.value })}
                  className="text-sm"
                />
              </div>
              <div className="grid grid-cols-[140px_1fr] items-center gap-3">
                <span className="text-[10px] font-mono text-navy-400 uppercase tracking-wider">Bottom Right</span>
                <Input
                  value={config.bottomRight}
                  onChange={(e) => updateConfig({ bottomRight: e.target.value })}
                  className="text-sm"
                />
              </div>

              <SectionLabel>Typography</SectionLabel>
              <SliderRow label="Title Size" value={config.titleSize} min={28} max={80} suffix="px" onChange={(v) => updateConfig({ titleSize: v })} />
              <SliderRow label="Title Weight" value={config.titleWeight} min={400} max={900} step={100} onChange={(v) => updateConfig({ titleWeight: v })} />
              <SliderRow label="Subtitle Size" value={config.subtitleSize} min={10} max={28} suffix="px" onChange={(v) => updateConfig({ subtitleSize: v })} />
              <SliderRow label="Label Size" value={config.labelSize} min={10} max={20} suffix="px" onChange={(v) => updateConfig({ labelSize: v })} />
              <SliderRow label="Tag Size" value={config.tagSize} min={9} max={18} suffix="px" onChange={(v) => updateConfig({ tagSize: v })} />
            </>
          )}

          {/* ── Colors Section ── */}
          {activeSection === "colors" && (
            <>
              <ColorRow label="Accent" value={config.accentColor} onChange={(v) => updateConfig({ accentColor: v })} />
              <ColorRow label="Title" value={config.titleColor} onChange={(v) => updateConfig({ titleColor: v })} />
              <ColorRow label="Subtitle" value={config.subtitleColor} onChange={(v) => updateConfig({ subtitleColor: v })} />
              <ColorRow label="Label" value={config.labelColor} onChange={(v) => updateConfig({ labelColor: v })} />
              <ColorRow label="Top Bar" value={config.topBarColor} onChange={(v) => updateConfig({ topBarColor: v })} />
              <ColorRow label="Bottom Bar" value={config.bottomBarColor} onChange={(v) => updateConfig({ bottomBarColor: v })} />

              <SectionLabel>Radar Icon</SectionLabel>
              <ColorRow label="Radar Color" value={config.radarColor} onChange={(v) => updateConfig({ radarColor: v })} />
              <SliderRow label="Radar Opacity" value={Math.round(config.radarOpacity * 100)} min={1} max={40} suffix="%" onChange={(v) => updateConfig({ radarOpacity: v / 100 })} />
              <SliderRow label="Radar Size" value={config.radarSize} min={200} max={600} suffix="px" onChange={(v) => updateConfig({ radarSize: v })} />

              <SectionLabel>Presets</SectionLabel>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { name: "Cyan Intel", accent: "#06b6d4", bg: "#000000", title: "#e8e8e8", label: "#06b6d4" },
                  { name: "Amber Warning", accent: "#f59e0b", bg: "#0a0a00", title: "#f0e0c0", label: "#f59e0b" },
                  { name: "Rose Alert", accent: "#f43f5e", bg: "#0a0000", title: "#f0c0c0", label: "#f43f5e" },
                  { name: "Emerald Ops", accent: "#10b981", bg: "#000a04", title: "#c0f0d8", label: "#10b981" },
                  { name: "Purple Spec", accent: "#8b5cf6", bg: "#050008", title: "#d8c8f0", label: "#8b5cf6" },
                  { name: "Ghost", accent: "#444444", bg: "#000000", title: "#888888", label: "#444444" },
                ].map((preset) => (
                  <button
                    key={preset.name}
                    onClick={() =>
                      updateConfig({
                        accentColor: preset.accent,
                        backgroundColor: preset.bg,
                        titleColor: preset.title,
                        labelColor: preset.label,
                        radarColor: preset.accent,
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
            </>
          )}

          {/* ── Background Section ── */}
          {activeSection === "background" && (
            <>
              <SectionLabel>Solid Background</SectionLabel>
              <ColorRow label="Color" value={config.backgroundColor} onChange={(v) => updateConfig({ backgroundColor: v })} />

              <SectionLabel>Gradient</SectionLabel>
              <ToggleRow label="Use Gradient" value={config.gradientEnabled} onChange={(v) => updateConfig({ gradientEnabled: v })} />
              {config.gradientEnabled && (
                <>
                  <ColorRow label="From" value={config.gradientFrom} onChange={(v) => updateConfig({ gradientFrom: v })} />
                  <ColorRow label="To" value={config.gradientTo} onChange={(v) => updateConfig({ gradientTo: v })} />
                  <SliderRow label="Angle" value={config.gradientAngle} min={0} max={360} suffix="deg" onChange={(v) => updateConfig({ gradientAngle: v })} />

                  <div className="grid grid-cols-4 gap-2 pt-1">
                    {[
                      { name: "Deep Space", from: "#000000", to: "#0a0a2e", angle: 135 },
                      { name: "Midnight", from: "#0f0c29", to: "#302b63", angle: 135 },
                      { name: "Dark Ocean", from: "#000000", to: "#003545", angle: 160 },
                      { name: "Ember", from: "#0a0000", to: "#1a0505", angle: 180 },
                    ].map((g) => (
                      <button
                        key={g.name}
                        onClick={() => updateConfig({ gradientFrom: g.from, gradientTo: g.to, gradientAngle: g.angle })}
                        className="border border-navy-700/30 rounded px-2 py-2 text-[9px] font-mono uppercase tracking-wider text-navy-500 hover:text-navy-300 hover:border-navy-600/40 transition-colors"
                      >
                        <div
                          className="w-full h-3 rounded mb-1.5"
                          style={{ background: `linear-gradient(${g.angle}deg, ${g.from}, ${g.to})` }}
                        />
                        {g.name}
                      </button>
                    ))}
                  </div>
                </>
              )}

              <SectionLabel>Background Image</SectionLabel>
              <div className="grid grid-cols-[140px_1fr] items-center gap-3">
                <span className="text-[10px] font-mono text-navy-400 uppercase tracking-wider">Image URL</span>
                <Input
                  value={config.backgroundImage}
                  onChange={(e) => updateConfig({ backgroundImage: e.target.value })}
                  placeholder="https://example.com/image.jpg"
                  className="text-sm"
                />
              </div>
              {config.backgroundImage && (
                <>
                  <SliderRow
                    label="Overlay Opacity"
                    value={Math.round(config.backgroundOverlay * 100)}
                    min={0}
                    max={95}
                    suffix="%"
                    onChange={(v) => updateConfig({ backgroundOverlay: v / 100 })}
                  />
                  <div className="grid grid-cols-[140px_1fr] items-center gap-3">
                    <span className="text-[10px] font-mono text-navy-400 uppercase tracking-wider">Clear</span>
                    <button
                      onClick={() => updateConfig({ backgroundImage: "" })}
                      className="flex items-center gap-1.5 text-[10px] font-mono text-accent-rose hover:text-accent-rose/80 transition-colors"
                    >
                      <Trash2 className="h-3 w-3" />
                      Remove Image
                    </button>
                  </div>
                </>
              )}
              <p className="text-[10px] text-navy-500 ml-[152px]">
                Use a publicly accessible URL. The dark overlay helps text remain readable.
              </p>
            </>
          )}

          {/* ── Layout Section ── */}
          {activeSection === "layout" && (
            <>
              <ToggleRow label="Grid Overlay" value={config.showGrid} onChange={(v) => updateConfig({ showGrid: v })} />
              <ToggleRow label="Accent Lines" value={config.showAccentLine} onChange={(v) => updateConfig({ showAccentLine: v })} />
              <ToggleRow label="Radar Graphic" value={config.showRadar} onChange={(v) => updateConfig({ showRadar: v })} />

              <SectionLabel>Spacing</SectionLabel>
              <SliderRow label="Content Left" value={config.contentPaddingLeft} min={60} max={200} suffix="px" onChange={(v) => updateConfig({ contentPaddingLeft: v })} />

              {config.showGrid && (
                <>
                  <SectionLabel>Grid</SectionLabel>
                  <SliderRow label="Grid Spacing" value={config.gridSpacing} min={20} max={120} suffix="px" onChange={(v) => updateConfig({ gridSpacing: v })} />
                  <SliderRow label="Grid Opacity" value={Math.round(config.gridOpacity * 100)} min={1} max={15} suffix="%" onChange={(v) => updateConfig({ gridOpacity: v / 100 })} />
                </>
              )}
            </>
          )}

          {/* ── Tags Section ── */}
          {activeSection === "tags" && (
            <>
              {config.tags.map((tag, i) => (
                <div key={i} className="grid grid-cols-[140px_1fr] items-center gap-3">
                  <span className="text-[10px] font-mono text-navy-400 uppercase tracking-wider">
                    Tag {i + 1}
                  </span>
                  <div className="flex items-center gap-2">
                    <div
                      className="w-7 h-7 rounded border border-navy-600 cursor-pointer relative overflow-hidden shrink-0"
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
                      className="text-navy-500 hover:text-accent-rose transition-colors shrink-0"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
              <div className="grid grid-cols-[140px_1fr] items-center gap-3">
                <span />
                <button
                  onClick={addTag}
                  className="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-wider text-navy-400 hover:text-navy-200 transition-colors"
                >
                  <Plus className="h-3 w-3" />
                  Add tag
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </PageContainer>
  );
}
