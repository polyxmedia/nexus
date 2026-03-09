"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { cn } from "@/lib/utils";
import {
  Radio,
  X,
  Newspaper,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Rss,
  AlertTriangle,
  TrendingUp,
  Globe,
  Fuel,
  Tv,
  Camera,
  Volume2,
  VolumeX,
  Play,
  Square,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
} from "lucide-react";

// ── News types ──

interface NewsArticle {
  title: string;
  url: string;
  source: string;
  date: string;
  category: "world" | "markets" | "conflict" | "energy";
  description?: string;
}

// ── Source registry ──

interface SourceDef {
  id: string;
  label: string;
  icon: typeof Newspaper;
  description: string;
}

const AVAILABLE_SOURCES: SourceDef[] = [
  { id: "news", label: "Live News", icon: Newspaper, description: "Real-time global news wire" },
  { id: "live-tv", label: "Live TV", icon: Tv, description: "24/7 video news streams" },
  { id: "worldcam", label: "World Cams", icon: Camera, description: "Live webcams from global hotspots" },
];

const CATEGORY_CONFIG: Record<string, { icon: typeof Globe; color: string; label: string }> = {
  world: { icon: Globe, color: "text-accent-cyan", label: "WORLD" },
  markets: { icon: TrendingUp, color: "text-accent-emerald", label: "MKT" },
  conflict: { icon: AlertTriangle, color: "text-accent-rose", label: "CONF" },
  energy: { icon: Fuel, color: "text-accent-amber", label: "NRG" },
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.floor(hrs / 24)}d`;
}

// ── News Feed Plugin ──

function NewsFeedPlugin() {
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState<string>("all");
  const scrollRef = useRef<HTMLDivElement>(null);

  const fetchNews = useCallback(async () => {
    try {
      const params = category !== "all" ? `?category=${category}&limit=50` : "?limit=50";
      const res = await fetch(`/api/news${params}`);
      if (res.ok) {
        const data = await res.json();
        setArticles(Array.isArray(data) ? data : []);
      }
    } catch {
      // silent
    }
    setLoading(false);
  }, [category]);

  useEffect(() => {
    fetchNews();
    const interval = setInterval(fetchNews, 120_000); // refresh every 2 min
    return () => clearInterval(interval);
  }, [fetchNews]);

  const filtered = articles;

  return (
    <div className="flex flex-col h-full">
      {/* Category filter bar */}
      <div className="flex items-center gap-0 border-b border-navy-700 shrink-0">
        {["all", "world", "markets", "conflict", "energy"].map((cat) => (
          <button
            key={cat}
            onClick={() => setCategory(cat)}
            className={cn(
              "px-3 py-1.5 text-[9px] font-mono uppercase tracking-wider transition-colors",
              category === cat
                ? "text-navy-100 bg-navy-800/60"
                : "text-navy-600 hover:text-navy-400"
            )}
          >
            {cat}
          </button>
        ))}
        <div className="flex-1" />
        <div className="flex items-center gap-1.5 px-3">
          <Rss className="h-2.5 w-2.5 text-accent-emerald animate-pulse" />
          <span className="text-[8px] font-mono text-navy-600">{filtered.length} items</span>
        </div>
      </div>

      {/* Articles */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto overflow-x-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <span className="text-[10px] font-mono text-navy-600 animate-pulse">Loading wire...</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <span className="text-[10px] font-mono text-navy-600">No articles</span>
          </div>
        ) : (
          <div className="divide-y divide-navy-700/60">
            {filtered.map((article, i) => {
              const catConf = CATEGORY_CONFIG[article.category] || CATEGORY_CONFIG.world;
              const CatIcon = catConf.icon;
              return (
                <a
                  key={`${article.url}-${i}`}
                  href={article.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-start gap-2.5 px-3 py-2 hover:bg-navy-800/30 transition-colors group"
                >
                  <CatIcon className={cn("h-3 w-3 mt-0.5 shrink-0 opacity-60", catConf.color)} />
                  <div className="flex-1 min-w-0">
                    <div className="text-[11px] text-navy-200 leading-tight line-clamp-2 group-hover:text-navy-100 transition-colors">
                      {article.title}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[9px] font-mono text-navy-500">{article.source}</span>
                      <span className="text-[9px] font-mono text-navy-700">{timeAgo(article.date)}</span>
                    </div>
                  </div>
                  <ExternalLink className="h-2.5 w-2.5 text-navy-700 group-hover:text-navy-500 shrink-0 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                </a>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Live TV Channels ──

interface LiveChannel {
  id: string;
  name: string;
  shortName: string;
  region: "global" | "us" | "eu" | "asia" | "mideast";
  channelId: string;
}

const LIVE_CHANNELS: LiveChannel[] = [
  // Verified 24/7 live streams
  { id: "aje", name: "Al Jazeera English", shortName: "AJE", region: "mideast", channelId: "UCNye-wNBqNL5ZzHSJj3l8Bg" },
  { id: "f24", name: "France 24", shortName: "F24", region: "eu", channelId: "UCQfwfsi5VrQ8yKZ-UWmAEFg" },
  { id: "dw", name: "DW News", shortName: "DW", region: "eu", channelId: "UCknLrEdhRCp1aegoMqRaCZg" },
  { id: "sky", name: "Sky News", shortName: "SKY", region: "eu", channelId: "UCoMdktPbSTixAyNGwb-UYkQ" },
  { id: "wion", name: "WION", shortName: "WION", region: "asia", channelId: "UC_gUM8rL-Lrg6O3adPW9K1g" },
  { id: "euro", name: "Euronews", shortName: "EURO", region: "eu", channelId: "UCSrZ3UV4jOidv8ppoVuvW9Q" },
  { id: "nbc", name: "NBC News NOW", shortName: "NBC", region: "us", channelId: "UCeY0bbntWzzVIaj2z3QigXg" },
  { id: "cbs", name: "CBS News 24/7", shortName: "CBS", region: "us", channelId: "UC8p1vwvWtl6T73JiExfWs1g" },
  { id: "abc", name: "ABC News Live", shortName: "ABC", region: "us", channelId: "UCBi2mrWuNuyYy4gbM6fU18Q" },
  { id: "cna", name: "CNA", shortName: "CNA", region: "asia", channelId: "UC83jt4dlz1Gjl58fzQrrKZg" },
  { id: "nhk", name: "NHK World", shortName: "NHK", region: "asia", channelId: "UCSPEjw8F2nQDtmUKPFNF7_A" },
];

const REGION_LABELS: Record<string, string> = {
  all: "ALL",
  global: "GLOBAL",
  us: "US",
  eu: "EU",
  asia: "ASIA",
  mideast: "MENA",
};

function LiveTVPlugin() {
  const [activeChannel, setActiveChannel] = useState<LiveChannel>(LIVE_CHANNELS[0]);
  const [regionFilter, setRegionFilter] = useState("all");
  const [muted, setMuted] = useState(true);
  const [playing, setPlaying] = useState(true);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const filtered = regionFilter === "all"
    ? LIVE_CHANNELS
    : LIVE_CHANNELS.filter((c) => c.region === regionFilter);

  const regions = ["all", ...Array.from(new Set(LIVE_CHANNELS.map((c) => c.region)))];

  const currentIndex = filtered.findIndex((c) => c.id === activeChannel.id);

  const goNext = () => {
    const nextIdx = (currentIndex + 1) % filtered.length;
    setActiveChannel(filtered[nextIdx]);
    setPlaying(true);
  };

  const goPrev = () => {
    const prevIdx = (currentIndex - 1 + filtered.length) % filtered.length;
    setActiveChannel(filtered[prevIdx]);
    setPlaying(true);
  };

  const embedUrl = playing
    ? `https://www.youtube.com/embed/live_stream?channel=${activeChannel.channelId}&autoplay=1&mute=${muted ? 1 : 0}&controls=1&modestbranding=1&rel=0`
    : "";

  return (
    <div className="flex flex-col h-full">
      {/* Region filter + channel selector */}
      <div className="flex items-center gap-0 border-b border-navy-700 shrink-0">
        {regions.map((r) => (
          <button
            key={r}
            onClick={() => setRegionFilter(r)}
            className={cn(
              "px-2.5 py-1.5 text-[9px] font-mono uppercase tracking-wider transition-colors",
              regionFilter === r
                ? "text-navy-100 bg-navy-800/60"
                : "text-navy-600 hover:text-navy-400"
            )}
          >
            {REGION_LABELS[r] || r.toUpperCase()}
          </button>
        ))}
        <div className="flex-1" />
        <div className="flex items-center gap-1 px-2">
          <div className="h-1.5 w-1.5 rounded-full bg-accent-rose animate-pulse" />
          <span className="text-[8px] font-mono text-navy-600">LIVE</span>
        </div>
      </div>

      {/* Video + channel list */}
      <div className="flex-1 flex overflow-hidden">
        {/* Video area */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Player */}
          <div className="flex-1 relative bg-black">
            {playing ? (
              <iframe
                ref={iframeRef}
                src={embedUrl}
                className="absolute inset-0 w-full h-full"
                allow="autoplay; encrypted-media"
                allowFullScreen
                title={activeChannel.name}
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                <button
                  onClick={() => setPlaying(true)}
                  className="flex items-center gap-2 text-navy-500 hover:text-navy-300 transition-colors"
                >
                  <Play className="h-6 w-6" />
                  <span className="text-[10px] font-mono uppercase tracking-wider">Resume</span>
                </button>
              </div>
            )}
          </div>

          {/* Controls bar */}
          <div className="flex items-center gap-1 px-2 py-1 border-t border-navy-700 bg-navy-950 shrink-0">
            <button onClick={goPrev} className="p-0.5 text-navy-600 hover:text-navy-300 transition-colors">
              <ChevronLeft className="h-3 w-3" />
            </button>
            <div className="flex-1 min-w-0 text-center">
              <span className="text-[9px] font-mono text-accent-cyan tracking-wider">{activeChannel.shortName}</span>
              <span className="text-[9px] font-mono text-navy-600 ml-2">{activeChannel.name}</span>
            </div>
            <button onClick={goNext} className="p-0.5 text-navy-600 hover:text-navy-300 transition-colors">
              <ChevronRight className="h-3 w-3" />
            </button>
            <div className="w-px h-3 bg-navy-700/30 mx-1" />
            <button
              onClick={() => setMuted(!muted)}
              className="p-0.5 text-navy-600 hover:text-navy-300 transition-colors"
              title={muted ? "Unmute" : "Mute"}
            >
              {muted ? <VolumeX className="h-3 w-3" /> : <Volume2 className="h-3 w-3" />}
            </button>
            <button
              onClick={() => setPlaying(!playing)}
              className="p-0.5 text-navy-600 hover:text-navy-300 transition-colors"
              title={playing ? "Stop" : "Play"}
            >
              {playing ? <Square className="h-3 w-3" /> : <Play className="h-3 w-3" />}
            </button>
          </div>
        </div>

        {/* Channel list sidebar */}
        <div className="w-28 shrink-0 border-l border-navy-700 overflow-y-auto">
          {filtered.map((ch) => (
            <button
              key={ch.id}
              onClick={() => { setActiveChannel(ch); setPlaying(true); }}
              className={cn(
                "w-full flex items-center gap-2 px-2 py-2 text-left transition-colors border-b border-navy-700/40",
                activeChannel.id === ch.id
                  ? "bg-accent-cyan/5 text-accent-cyan"
                  : "text-navy-500 hover:text-navy-300 hover:bg-navy-800/20"
              )}
            >
              <div className="min-w-0">
                <div className="text-[9px] font-mono font-medium tracking-wider truncate">{ch.shortName}</div>
                <div className="text-[8px] text-navy-600 truncate">{ch.region.toUpperCase()}</div>
              </div>
              {activeChannel.id === ch.id && (
                <div className="ml-auto h-1.5 w-1.5 rounded-full bg-accent-rose animate-pulse shrink-0" />
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── World Webcams Plugin ──

interface WorldCam {
  id: string;
  city: string;
  country: string;
  region: "europe" | "mideast" | "asia" | "americas";
  youtubeId: string;
}

const WORLD_CAMS: WorldCam[] = [
  // Europe
  { id: "kyiv", city: "Kyiv", country: "Ukraine", region: "europe", youtubeId: "2cyQML2QDKM" },
  { id: "london", city: "London", country: "UK", region: "europe", youtubeId: "64dzOviuBnE" },
  { id: "paris", city: "Paris", country: "France", region: "europe", youtubeId: "cTEdKxg3NbA" },
  { id: "warsaw", city: "Warsaw", country: "Poland", region: "europe", youtubeId: "p5SXdnSKtZ4" },
  { id: "berlin", city: "Berlin", country: "Germany", region: "europe", youtubeId: "KebuV8VPjmA" },
  { id: "rome", city: "Rome", country: "Italy", region: "europe", youtubeId: "RiLiDzFHNBw" },
  // Middle East
  { id: "dubai", city: "Dubai", country: "UAE", region: "mideast", youtubeId: "K50LSm7_bfQ" },
  { id: "jerusalem", city: "Jerusalem", country: "Israel", region: "mideast", youtubeId: "KQLA-bqOH-c" },
  { id: "istanbul", city: "Istanbul", country: "Turkey", region: "mideast", youtubeId: "m4JlalCP_tU" },
  { id: "mecca", city: "Mecca", country: "Saudi Arabia", region: "mideast", youtubeId: "SuBuidpSiEQ" },
  // Asia
  { id: "tokyo", city: "Tokyo", country: "Japan", region: "asia", youtubeId: "DjYZk8nrXVY" },
  { id: "seoul", city: "Seoul", country: "South Korea", region: "asia", youtubeId: "68Gh0hIwXJM" },
  { id: "taipei", city: "Taipei", country: "Taiwan", region: "asia", youtubeId: "CjVQJdIrDJ0" },
  { id: "mumbai", city: "Mumbai", country: "India", region: "asia", youtubeId: "ByED80IKdIU" },
  // Americas
  { id: "nyc", city: "New York", country: "USA", region: "americas", youtubeId: "1-iS7LArMPA" },
  { id: "dc", city: "Washington DC", country: "USA", region: "americas", youtubeId: "Mv2pXBW8khg" },
  { id: "miami", city: "Miami", country: "USA", region: "americas", youtubeId: "VCi9V-knnCk" },
  { id: "mexico", city: "Mexico City", country: "Mexico", region: "americas", youtubeId: "N6jf6bZXEWg" },
];

const CAM_REGION_LABELS: Record<string, string> = {
  all: "ALL",
  europe: "EU",
  mideast: "MENA",
  asia: "ASIA",
  americas: "AMER",
};

function WorldCamPlugin() {
  const [activeCam, setActiveCam] = useState<WorldCam>(WORLD_CAMS[0]);
  const [regionFilter, setRegionFilter] = useState("all");
  const [cycling, setCycling] = useState(false);
  const [playing, setPlaying] = useState(true);
  const cycleRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const filtered = regionFilter === "all"
    ? WORLD_CAMS
    : WORLD_CAMS.filter((c) => c.region === regionFilter);

  const regions = ["all", ...Array.from(new Set(WORLD_CAMS.map((c) => c.region)))];
  const currentIndex = filtered.findIndex((c) => c.id === activeCam.id);

  const goNext = useCallback(() => {
    const pool = regionFilter === "all" ? WORLD_CAMS : WORLD_CAMS.filter((c) => c.region === regionFilter);
    const idx = pool.findIndex((c) => c.id === activeCam.id);
    const nextIdx = (idx + 1) % pool.length;
    setActiveCam(pool[nextIdx]);
    setPlaying(true);
  }, [activeCam.id, regionFilter]);

  const goPrev = () => {
    const prevIdx = (currentIndex - 1 + filtered.length) % filtered.length;
    setActiveCam(filtered[prevIdx]);
    setPlaying(true);
  };

  // Auto-cycle every 30s
  useEffect(() => {
    if (cycling) {
      cycleRef.current = setInterval(goNext, 30_000);
    }
    return () => {
      if (cycleRef.current) clearInterval(cycleRef.current);
    };
  }, [cycling, goNext]);

  const embedUrl = playing
    ? `https://www.youtube.com/embed/${activeCam.youtubeId}?autoplay=1&mute=1&controls=0&modestbranding=1&rel=0`
    : "";

  return (
    <div className="flex flex-col h-full">
      {/* Region filter */}
      <div className="flex items-center gap-0 border-b border-navy-700 shrink-0">
        {regions.map((r) => (
          <button
            key={r}
            onClick={() => setRegionFilter(r)}
            className={cn(
              "px-2.5 py-1.5 text-[9px] font-mono uppercase tracking-wider transition-colors",
              regionFilter === r
                ? "text-navy-100 bg-navy-800/60"
                : "text-navy-600 hover:text-navy-400"
            )}
          >
            {CAM_REGION_LABELS[r] || r.toUpperCase()}
          </button>
        ))}
        <div className="flex-1" />
        <button
          onClick={() => setCycling(!cycling)}
          className={cn(
            "flex items-center gap-1 px-2.5 py-1.5 text-[9px] font-mono uppercase tracking-wider transition-colors",
            cycling ? "text-accent-cyan" : "text-navy-600 hover:text-navy-400"
          )}
        >
          <RefreshCw className={cn("h-2.5 w-2.5", cycling && "animate-spin")} />
          Cycle
        </button>
        <div className="flex items-center gap-1 px-2">
          <div className="h-1.5 w-1.5 rounded-full bg-accent-emerald animate-pulse" />
          <span className="text-[8px] font-mono text-navy-600">LIVE</span>
        </div>
      </div>

      {/* Video + cam list */}
      <div className="flex-1 flex overflow-hidden">
        {/* Video area */}
        <div className="flex-1 flex flex-col min-w-0">
          <div className="flex-1 relative bg-black">
            {playing ? (
              <iframe
                src={embedUrl}
                className="absolute inset-0 w-full h-full"
                allow="autoplay; encrypted-media"
                allowFullScreen
                title={`${activeCam.city} webcam`}
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                <button
                  onClick={() => setPlaying(true)}
                  className="flex items-center gap-2 text-navy-500 hover:text-navy-300 transition-colors"
                >
                  <Play className="h-6 w-6" />
                  <span className="text-[10px] font-mono uppercase tracking-wider">Resume</span>
                </button>
              </div>
            )}
          </div>

          {/* Controls */}
          <div className="flex items-center gap-1 px-2 py-1 border-t border-navy-700 bg-navy-950 shrink-0">
            <button onClick={goPrev} className="p-0.5 text-navy-600 hover:text-navy-300 transition-colors">
              <ChevronLeft className="h-3 w-3" />
            </button>
            <div className="flex-1 min-w-0 text-center">
              <span className="text-[9px] font-mono text-accent-cyan tracking-wider">{activeCam.city.toUpperCase()}</span>
              <span className="text-[9px] font-mono text-navy-600 ml-2">{activeCam.country}</span>
            </div>
            <button onClick={goNext} className="p-0.5 text-navy-600 hover:text-navy-300 transition-colors">
              <ChevronRight className="h-3 w-3" />
            </button>
            <div className="w-px h-3 bg-navy-700/30 mx-1" />
            <button
              onClick={() => setPlaying(!playing)}
              className="p-0.5 text-navy-600 hover:text-navy-300 transition-colors"
              title={playing ? "Stop" : "Play"}
            >
              {playing ? <Square className="h-3 w-3" /> : <Play className="h-3 w-3" />}
            </button>
          </div>
        </div>

        {/* Cam list sidebar */}
        <div className="w-28 shrink-0 border-l border-navy-700 overflow-y-auto">
          {filtered.map((cam) => (
            <button
              key={cam.id}
              onClick={() => { setActiveCam(cam); setPlaying(true); }}
              className={cn(
                "w-full flex items-center gap-2 px-2 py-2 text-left transition-colors border-b border-navy-700/40",
                activeCam.id === cam.id
                  ? "bg-accent-cyan/5 text-accent-cyan"
                  : "text-navy-500 hover:text-navy-300 hover:bg-navy-800/20"
              )}
            >
              <div className="min-w-0">
                <div className="text-[9px] font-mono font-medium tracking-wider truncate">{cam.city.toUpperCase()}</div>
                <div className="text-[8px] text-navy-600 truncate">{cam.country}</div>
              </div>
              {activeCam.id === cam.id && (
                <div className="ml-auto h-1.5 w-1.5 rounded-full bg-accent-emerald animate-pulse shrink-0" />
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Main Sources Panel ──

export function SourcesPanel() {
  const [open, setOpen] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem("wr:sources_open") === "1" || localStorage.getItem("wr:plugins_open") === "1";
  });
  const [activeSources, setActiveSources] = useState<string[]>(() => {
    if (typeof window === "undefined") return ["news"];
    try {
      const stored = localStorage.getItem("wr:active_sources") || localStorage.getItem("wr:active_plugins");
      return stored ? JSON.parse(stored) : ["news"];
    } catch {
      return ["news"];
    }
  });
  const [height, setHeight] = useState(() => {
    if (typeof window === "undefined") return 280;
    const stored = parseInt(localStorage.getItem("wr:sources_height") || localStorage.getItem("wr:plugins_height") || "320");
    return Math.max(180, Math.min(600, stored));
  });
  const [showPicker, setShowPicker] = useState(false);
  const resizing = useRef(false);
  const startY = useRef(0);
  const startHeight = useRef(280);

  // Persist state
  useEffect(() => {
    localStorage.setItem("wr:sources_open", open ? "1" : "0");
  }, [open]);

  useEffect(() => {
    localStorage.setItem("wr:active_sources", JSON.stringify(activeSources));
  }, [activeSources]);

  useEffect(() => {
    localStorage.setItem("wr:sources_height", String(height));
  }, [height]);

  // Resize handle
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    resizing.current = true;
    startY.current = e.clientY;
    startHeight.current = height;

    const onMove = (ev: MouseEvent) => {
      if (!resizing.current) return;
      const delta = startY.current - ev.clientY;
      setHeight(Math.max(180, Math.min(600, startHeight.current + delta)));
    };
    const onUp = () => {
      resizing.current = false;
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  }, [height]);

  const toggleSource = (id: string) => {
    setActiveSources((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  };

  return (
    <>
      {/* Sources toggle button */}
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          "absolute bottom-3 right-3 z-30 pointer-events-auto flex items-center gap-1.5 px-2.5 py-1.5 rounded border transition-all",
          open
            ? "bg-accent-cyan/10 border-accent-cyan/30 text-accent-cyan"
            : "bg-navy-900/90 border-navy-700 text-navy-500 hover:text-navy-300 hover:border-navy-600"
        )}
      >
        <Radio className="h-3.5 w-3.5" />
        <span className="text-[9px] font-mono uppercase tracking-wider">Sources</span>
        {open ? <ChevronDown className="h-3 w-3" /> : <ChevronUp className="h-3 w-3" />}
      </button>

      {/* Panel */}
      <div
        className={cn(
          "absolute left-0 right-0 bottom-0 z-20 pointer-events-auto transition-all duration-300 ease-in-out",
          open ? "" : "translate-y-full"
        )}
        style={{ height: open ? height : 0 }}
      >
        {/* Resize handle */}
        <div
          onMouseDown={handleMouseDown}
          className="absolute top-0 left-0 right-0 h-1.5 cursor-ns-resize z-10 group"
        >
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-12 h-0.5 rounded-full bg-navy-700/40 group-hover:bg-navy-500/60 transition-colors" />
        </div>

        <div className="h-full bg-navy-900/98 backdrop-blur-sm border-t border-navy-700 flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-3 py-1.5 border-b border-navy-700 shrink-0">
            <div className="flex items-center gap-2">
              <Radio className="h-3 w-3 text-accent-cyan" />
              <span className="text-[9px] font-mono uppercase tracking-wider text-navy-400">Sources</span>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setShowPicker(!showPicker)}
                className="text-[9px] font-mono text-navy-600 hover:text-navy-300 px-2 py-0.5 rounded border border-navy-700/30 hover:border-navy-600 transition-colors"
              >
                {showPicker ? "Done" : "+ Add"}
              </button>
              <button onClick={() => setOpen(false)} className="text-navy-600 hover:text-navy-300 transition-colors">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* Source picker overlay */}
          {showPicker && (
            <div className="absolute top-10 right-3 z-30 bg-navy-900 border border-navy-700 rounded-lg p-3 w-60 shadow-xl">
              <div className="text-[9px] font-mono text-navy-500 uppercase tracking-wider mb-2">Available Sources</div>
              <div className="space-y-1.5">
                {AVAILABLE_SOURCES.map((p) => {
                  const active = activeSources.includes(p.id);
                  return (
                    <button
                      key={p.id}
                      onClick={() => toggleSource(p.id)}
                      className={cn(
                        "w-full flex items-center gap-2.5 px-2.5 py-2 rounded border text-left transition-all",
                        active
                          ? "border-accent-cyan/30 bg-accent-cyan/5 text-navy-200"
                          : "border-navy-700/30 text-navy-500 hover:text-navy-300 hover:border-navy-600"
                      )}
                    >
                      <p.icon className="h-3.5 w-3.5 shrink-0" />
                      <div>
                        <div className="text-[10px] font-mono">{p.label}</div>
                        <div className="text-[9px] text-navy-600">{p.description}</div>
                      </div>
                      {active && <div className="ml-auto h-1.5 w-1.5 rounded-full bg-accent-cyan shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Source content area */}
          <div className="flex-1 overflow-hidden flex">
            {activeSources.length === 0 ? (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <Radio className="h-5 w-5 text-navy-700 mx-auto mb-2" />
                  <p className="text-[10px] font-mono text-navy-600">No sources active</p>
                  <p className="text-[9px] text-navy-700 mt-0.5">Click &quot;+ Add&quot; to enable sources</p>
                </div>
              </div>
            ) : (
              activeSources.map((sourceId) => {
                const sourceDef = AVAILABLE_SOURCES.find((p) => p.id === sourceId);
                if (!sourceDef) return null;

                return (
                  <div
                    key={sourceId}
                    className="flex-1 min-w-0 border-r border-navy-700 last:border-r-0 flex flex-col"
                  >
                    {/* Source tab label */}
                    <div className="flex items-center gap-1.5 px-3 py-1 border-b border-navy-700/60 shrink-0">
                      <sourceDef.icon className="h-2.5 w-2.5 text-accent-cyan" />
                      <span className="text-[8px] font-mono uppercase tracking-wider text-navy-500">{sourceDef.label}</span>
                    </div>

                    {/* Source body */}
                    <div className="flex-1 overflow-hidden">
                      {sourceId === "news" && <NewsFeedPlugin />}
                      {sourceId === "live-tv" && <LiveTVPlugin />}
                      {sourceId === "worldcam" && <WorldCamPlugin />}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </>
  );
}
