"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  Mail,
  Download,
  ExternalLink,
  Copy,
  Check,
  Radar,
  ArrowUpRight,
  Layers,
  Database,
  Cpu,
  Globe,
  Calendar,
  MapPin,
} from "lucide-react";

// ── Scroll Reveal ──

function useReveal(threshold = 0.12) {
  const [visible, setVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setVisible(true);
          obs.disconnect();
        }
      },
      { threshold }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, visible };
}

const anim = "transition-all duration-700 ease-out";
const hidden = "opacity-0 translate-y-6";
const shown = "opacity-100 translate-y-0";

// ── Primitives ──

function Ruled() {
  return (
    <div className="max-w-5xl mx-auto px-6">
      <div className="h-px bg-navy-800/60" />
    </div>
  );
}

function SectionLabel({ number, label }: { number: string; label: string }) {
  return (
    <div className="flex items-center gap-3 mb-8">
      <span className="font-mono text-[10px] text-navy-600 tracking-[0.3em]">{number}</span>
      <div className="h-px flex-1 bg-navy-800/40" />
      <span className="font-mono text-[10px] text-navy-500 uppercase tracking-[0.2em]">{label}</span>
    </div>
  );
}

// ── Press Coverage Data ──

const PRESS_COVERAGE: { publication: string; headline: string; date: string; category: string; url?: string }[] = [];

// ── Brand Colors ──

const BRAND_COLORS = [
  { name: "Navy 950", hex: "#000000", token: "navy-950", role: "Primary background" },
  { name: "Navy 900", hex: "#0a0a0a", token: "navy-900", role: "Surface" },
  { name: "Navy 800", hex: "#1a1a1a", token: "navy-800", role: "Border / divider" },
  { name: "Navy 700", hex: "#333333", token: "navy-700", role: "Muted element" },
  { name: "Navy 400", hex: "#8a8a8a", token: "navy-400", role: "Secondary text" },
  { name: "Navy 100", hex: "#d4d4d4", token: "navy-100", role: "Primary text" },
  { name: "Cyan", hex: "#06b6d4", token: "accent-cyan", role: "Primary accent" },
  { name: "Emerald", hex: "#10b981", token: "accent-emerald", role: "Positive / success" },
  { name: "Amber", hex: "#f59e0b", token: "accent-amber", role: "Warning / caution" },
  { name: "Rose", hex: "#f43f5e", token: "accent-rose", role: "Critical / alert" },
];

// ── Company Facts ──

const FACTS = [
  { icon: Calendar, label: "Founded", value: "2025", detail: "London, United Kingdom" },
  { icon: MapPin, label: "Headquarters", value: "London", detail: "United Kingdom" },
  { icon: Cpu, label: "AI Tools", value: "40+", detail: "Chat-integrated analysis tools" },
  { icon: Layers, label: "Signal Layers", value: "4+", detail: "GEO, MKT, OSI, SYS + narrative overlay" },
  { icon: Database, label: "Data Sources", value: "20+", detail: "Real-time intelligence feeds" },
  { icon: Globe, label: "Coverage", value: "Global", detail: "196 countries monitored" },
];

// ── Components ──

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button
      onClick={handleCopy}
      className="p-1.5 text-navy-600 hover:text-navy-300 transition-colors"
      title="Copy to clipboard"
    >
      {copied ? <Check className="w-3.5 h-3.5 text-accent-emerald" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  );
}

function PressItem({
  item,
  index,
}: {
  item: (typeof PRESS_COVERAGE)[number];
  index: number;
}) {
  const r = useReveal(0.1);
  return (
    <div
      ref={r.ref}
      className={`${anim} ${r.visible ? shown : hidden} group`}
      style={{ transitionDelay: `${index * 80}ms` }}
    >
      <div className="border-b border-navy-800/40 py-6 flex flex-col md:flex-row md:items-start gap-4 md:gap-8 group-hover:border-navy-700/60 transition-colors">
        {/* Left: metadata */}
        <div className="md:w-44 shrink-0 flex md:flex-col items-center md:items-start gap-3 md:gap-1">
          <span className="font-mono text-[10px] text-accent-cyan/70 uppercase tracking-wider">
            {item.publication}
          </span>
          <span className="font-mono text-[10px] text-navy-600">
            {new Date(item.date).toLocaleDateString("en-GB", {
              day: "numeric",
              month: "short",
              year: "numeric",
            })}
          </span>
          <span className="font-mono text-[9px] text-navy-700 border border-navy-800 rounded px-1.5 py-0.5 uppercase tracking-wider">
            {item.category}
          </span>
        </div>

        {/* Right: headline */}
        <div className="flex-1 flex items-start justify-between gap-4">
          <h3 className="font-sans text-[15px] text-navy-200 leading-relaxed group-hover:text-white transition-colors">
            {item.headline}
          </h3>
          <ArrowUpRight className="w-4 h-4 text-navy-700 group-hover:text-navy-400 transition-colors shrink-0 mt-1" />
        </div>
      </div>
    </div>
  );
}

function ColorSwatch({ color }: { color: (typeof BRAND_COLORS)[number] }) {
  return (
    <div className="group">
      <div
        className="w-full aspect-[3/2] rounded-lg border border-navy-800/60 mb-2 group-hover:border-navy-700 transition-colors"
        style={{ backgroundColor: color.hex }}
      />
      <div className="flex items-start justify-between">
        <div>
          <div className="font-mono text-[10px] text-navy-300">{color.name}</div>
          <div className="font-mono text-[9px] text-navy-600">{color.hex}</div>
        </div>
        <CopyButton text={color.hex} />
      </div>
      <div className="font-mono text-[9px] text-navy-600 mt-0.5">{color.role}</div>
    </div>
  );
}

function FactCard({
  fact,
  index,
}: {
  fact: (typeof FACTS)[number];
  index: number;
}) {
  const r = useReveal(0.1);
  const Icon = fact.icon;
  return (
    <div
      ref={r.ref}
      className={`${anim} ${r.visible ? shown : hidden} border border-navy-800/40 rounded-lg p-5 hover:border-navy-700/60 transition-colors`}
      style={{ transitionDelay: `${index * 60}ms` }}
    >
      <Icon className="w-4 h-4 text-navy-600 mb-3" />
      <div className="font-mono text-[10px] text-navy-500 uppercase tracking-wider mb-1">
        {fact.label}
      </div>
      <div className="font-sans text-2xl text-navy-100 font-semibold tracking-tight mb-1">
        {fact.value}
      </div>
      <div className="font-mono text-[10px] text-navy-600">{fact.detail}</div>
    </div>
  );
}

// ── Page ──

export default function MediaPage() {
  const heroR = useReveal(0.05);
  const contactR = useReveal(0.1);
  const brandR = useReveal(0.1);
  const boilerR = useReveal(0.1);
  const [boilerCopied, setBoilerCopied] = useState(false);

  const boilerplate = `Nexus Intelligence is a London-based integrated indicator platform that synthesises geopolitical, market microstructure, OSINT, systemic risk, shipping, and game theory data into actionable intelligence. The platform features four primary signal layers with AI-driven thesis generation, prediction tracking with Brier scoring, and direct trading integration. Calendar and celestial data are included as narrative/actor-belief overlay only. Built for analysts, portfolio managers, and institutional investors, Nexus processes 20+ real-time data feeds through 40+ specialised tools to identify convergence patterns between geopolitical events and market movements. Founded in 2025, the company operates from London, United Kingdom.`;

  const handleCopyBoilerplate = () => {
    navigator.clipboard.writeText(boilerplate);
    setBoilerCopied(true);
    setTimeout(() => setBoilerCopied(false), 2500);
  };

  return (
    <div className="pt-14 pb-24">
      {/* Classification header motif */}
      <div className="max-w-5xl mx-auto px-6 pt-6 pb-2">
        <div className="flex items-center justify-between">
          <span className="font-mono text-[9px] text-navy-700 tracking-[0.3em]">
            NEXUS / MEDIA RELATIONS
          </span>
          <span className="font-mono text-[9px] text-navy-800 tracking-wider">
            PUBLIC RELEASE
          </span>
        </div>
      </div>

      <Ruled />

      {/* ── 01 Hero ── */}
      <section className="max-w-5xl mx-auto px-6 pt-20 pb-16">
        <div
          ref={heroR.ref}
          className={`${anim} ${heroR.visible ? shown : hidden}`}
        >
          <div className="font-mono text-[10px] text-navy-600 tracking-[0.3em] mb-6">
            01
          </div>
          <h1 className="font-sans text-[clamp(2rem,5vw,3.5rem)] text-navy-100 font-semibold leading-[1.1] tracking-tight mb-6">
            Media &<br />
            <span className="text-navy-400">Press</span>
          </h1>
          <p className="font-sans text-[15px] text-navy-400 leading-relaxed max-w-xl">
            Resources for journalists, analysts, and media professionals covering
            the intersection of geopolitical intelligence and financial markets.
          </p>
        </div>
      </section>

      <Ruled />

      {/* ── 02 Press Contact ── */}
      <section className="max-w-5xl mx-auto px-6 py-16">
        <SectionLabel number="02" label="Press Contact" />
        <div
          ref={contactR.ref}
          className={`${anim} ${contactR.visible ? shown : hidden}`}
        >
          <div className="grid md:grid-cols-2 gap-8">
            {/* Email */}
            <div className="border border-navy-800/40 rounded-lg p-6 hover:border-navy-700/60 transition-colors">
              <Mail className="w-4 h-4 text-accent-cyan/60 mb-4" />
              <div className="font-mono text-[10px] text-navy-500 uppercase tracking-wider mb-2">
                Media Enquiries
              </div>
              <a
                href="mailto:media@nexushq.xyz"
                className="font-mono text-sm text-navy-200 hover:text-white transition-colors"
              >
                media@nexushq.xyz
              </a>
              <p className="font-sans text-[12px] text-navy-500 mt-3 leading-relaxed">
                For press enquiries, interview requests, and media partnerships.
                We aim to respond within 24 hours on business days.
              </p>
            </div>

            {/* Press Kit */}
            <div className="border border-navy-800/40 rounded-lg p-6 hover:border-navy-700/60 transition-colors">
              <Download className="w-4 h-4 text-accent-cyan/60 mb-4" />
              <div className="font-mono text-[10px] text-navy-500 uppercase tracking-wider mb-2">
                Press Kit
              </div>
              <p className="font-sans text-[12px] text-navy-400 leading-relaxed mb-4">
                Logos, brand guidelines, executive headshots, product screenshots,
                and company fact sheet in one download.
              </p>
              <button className="inline-flex items-center gap-2 px-4 py-2 bg-navy-100 text-navy-950 rounded-lg text-[11px] font-mono tracking-wider uppercase hover:bg-white transition-colors">
                <Download className="w-3 h-3" />
                Download Press Kit
              </button>
            </div>
          </div>
        </div>
      </section>

      <Ruled />

      {/* ── 03 Company Facts ── */}
      <section className="max-w-5xl mx-auto px-6 py-16">
        <SectionLabel number="03" label="Company Facts" />
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {FACTS.map((fact, i) => (
            <FactCard key={fact.label} fact={fact} index={i} />
          ))}
        </div>
      </section>

      <Ruled />

      {/* ── 04 Press Coverage ── */}
      <section className="max-w-5xl mx-auto px-6 py-16">
        <SectionLabel number="04" label="Coverage" />
        {PRESS_COVERAGE.length > 0 ? (
          <>
            <div>
              {PRESS_COVERAGE.map((item, i) => (
                <PressItem key={i} item={item} index={i} />
              ))}
            </div>
            <div className="mt-8 flex items-center gap-3">
              <div className="h-px flex-1 bg-navy-800/30" />
              <span className="font-mono text-[9px] text-navy-700 tracking-wider">
                Selected coverage. Full archive available on request.
              </span>
              <div className="h-px flex-1 bg-navy-800/30" />
            </div>
          </>
        ) : (
          <div className="border border-navy-800/40 rounded-lg p-8 text-center">
            <div className="font-mono text-[10px] text-navy-600 uppercase tracking-wider mb-2">
              Coverage coming soon
            </div>
            <p className="font-sans text-[13px] text-navy-500 max-w-md mx-auto">
              Nexus Intelligence launched in 2025. For press enquiries or early
              access for review, contact{" "}
              <a href="mailto:media@nexushq.xyz" className="text-accent-cyan/70 hover:text-accent-cyan transition-colors">
                media@nexushq.xyz
              </a>
            </p>
          </div>
        )}
      </section>

      <Ruled />

      {/* ── 05 Brand Assets ── */}
      <section className="max-w-5xl mx-auto px-6 py-16">
        <SectionLabel number="05" label="Brand Assets" />
        <div
          ref={brandR.ref}
          className={`${anim} ${brandR.visible ? shown : hidden}`}
        >
          {/* Logo */}
          <div className="mb-12">
            <div className="font-mono text-[10px] text-navy-500 uppercase tracking-wider mb-4">
              Logo
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              {/* Dark bg */}
              <div className="border border-navy-800/40 rounded-lg p-8 flex items-center justify-center bg-navy-950">
                <div className="flex items-center gap-3">
                  <Radar className="h-7 w-7 text-white" />
                  <span className="text-lg font-semibold tracking-[0.15em] text-navy-200 font-mono">
                    NEXUS{" "}
                    <span className="text-navy-400 font-normal">
                      Intelligence
                    </span>
                  </span>
                </div>
              </div>
              {/* Light bg */}
              <div className="border border-navy-800/40 rounded-lg p-8 flex items-center justify-center bg-navy-100">
                <div className="flex items-center gap-3">
                  <Radar className="h-7 w-7 text-navy-950" />
                  <span className="text-lg font-semibold tracking-[0.15em] text-navy-950 font-mono">
                    NEXUS{" "}
                    <span className="text-navy-700 font-normal">
                      Intelligence
                    </span>
                  </span>
                </div>
              </div>
            </div>
            <p className="font-sans text-[12px] text-navy-500 mt-3 leading-relaxed max-w-lg">
              The NEXUS wordmark uses IBM Plex Mono at semibold weight with
              0.15em letter-spacing. &quot;Intelligence&quot; is set at normal weight.
              The radar icon accompanies the wordmark at all sizes.
            </p>
          </div>

          {/* Colour palette */}
          <div className="mb-12">
            <div className="font-mono text-[10px] text-navy-500 uppercase tracking-wider mb-4">
              Colour Palette
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
              {BRAND_COLORS.map((c) => (
                <ColorSwatch key={c.token} color={c} />
              ))}
            </div>
          </div>

          {/* Typography */}
          <div>
            <div className="font-mono text-[10px] text-navy-500 uppercase tracking-wider mb-4">
              Typography
            </div>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="border border-navy-800/40 rounded-lg p-6">
                <div className="font-mono text-[10px] text-navy-600 uppercase tracking-wider mb-3">
                  IBM Plex Mono
                </div>
                <div className="font-mono text-2xl text-navy-200 mb-2">
                  ABCDEFGHIJKLMNOPQRSTUVWXYZ
                </div>
                <div className="font-mono text-sm text-navy-400 mb-3">
                  abcdefghijklmnopqrstuvwxyz 0123456789
                </div>
                <div className="font-mono text-[10px] text-navy-600 leading-relaxed">
                  Used for labels, data values, navigation, and system
                  identifiers. Set at 10-12px with wide tracking for labels.
                </div>
              </div>
              <div className="border border-navy-800/40 rounded-lg p-6">
                <div className="font-mono text-[10px] text-navy-600 uppercase tracking-wider mb-3">
                  IBM Plex Sans
                </div>
                <div className="font-sans text-2xl text-navy-200 mb-2">
                  ABCDEFGHIJKLMNOPQRSTUVWXYZ
                </div>
                <div className="font-sans text-sm text-navy-400 mb-3">
                  abcdefghijklmnopqrstuvwxyz 0123456789
                </div>
                <div className="font-mono text-[10px] text-navy-600 leading-relaxed">
                  Used for headlines, body copy, and long-form content.
                  Headlines set at semibold with tight tracking.
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Ruled />

      {/* ── 06 Boilerplate ── */}
      <section className="max-w-5xl mx-auto px-6 py-16">
        <SectionLabel number="06" label="Boilerplate" />
        <div
          ref={boilerR.ref}
          className={`${anim} ${boilerR.visible ? shown : hidden}`}
        >
          <div className="border border-navy-800/40 rounded-lg p-6 md:p-8 relative">
            <div className="font-mono text-[10px] text-navy-600 uppercase tracking-wider mb-4">
              About Nexus Intelligence
            </div>
            <p className="font-sans text-[14px] text-navy-300 leading-[1.8] max-w-3xl">
              {boilerplate}
            </p>
            <div className="mt-6 flex items-center gap-3">
              <button
                onClick={handleCopyBoilerplate}
                className="inline-flex items-center gap-2 px-3 py-1.5 border border-navy-800 rounded text-[10px] font-mono text-navy-400 hover:text-navy-200 hover:border-navy-700 transition-colors uppercase tracking-wider"
              >
                {boilerCopied ? (
                  <>
                    <Check className="w-3 h-3 text-accent-emerald" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" />
                    Copy Boilerplate
                  </>
                )}
              </button>
              <span className="font-mono text-[9px] text-navy-700">
                {boilerplate.split(" ").length} words
              </span>
            </div>
          </div>
        </div>
      </section>

      <Ruled />

      {/* ── CTA ── */}
      <section className="max-w-5xl mx-auto px-6 py-20 text-center">
        <div className="font-mono text-[10px] text-navy-600 tracking-[0.3em] mb-4">
          NEED SOMETHING ELSE?
        </div>
        <h2 className="font-sans text-2xl text-navy-200 mb-3">
          Get in touch with our team
        </h2>
        <p className="font-sans text-[13px] text-navy-500 mb-8 max-w-md mx-auto">
          For partnership enquiries, speaking requests, or anything not covered
          above.
        </p>
        <div className="flex items-center justify-center gap-4">
          <a
            href="mailto:media@nexushq.xyz"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-navy-100 text-navy-950 rounded-lg text-[11px] font-mono tracking-wider uppercase hover:bg-white transition-colors"
          >
            <Mail className="w-3.5 h-3.5" />
            Contact Press Team
          </a>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-5 py-2.5 border border-navy-800 text-navy-400 rounded-lg text-[11px] font-mono tracking-wider uppercase hover:text-navy-200 hover:border-navy-700 transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            Visit Platform
          </Link>
        </div>
      </section>
    </div>
  );
}
