"use client";

import "leaflet/dist/leaflet.css";
import { useEffect, useRef, useState } from "react";
import L from "leaflet";

interface ThreatPoint {
  lat: number;
  lng: number;
  label: string;
  intensity: number;
  briefing: string;
  detail: string;
}

const THREATS: ThreatPoint[] = [
  {
    lat: 26.5, lng: 56.3, label: "HORMUZ", intensity: 5,
    briefing: "STRAIT OF HORMUZ // CRITICAL CHOKEPOINT",
    detail: "20% of global seaborne crude transits daily. Closure probability elevated. Iranian IRGC naval activity detected.",
  },
  {
    lat: 20, lng: 40, label: "RED SEA", intensity: 4,
    briefing: "RED SEA CORRIDOR // SHIPPING DISRUPTION",
    detail: "Houthi anti-ship operations ongoing. Commercial rerouting via Cape of Good Hope. Insurance premiums +340%.",
  },
  {
    lat: 24, lng: 121, label: "TAIWAN STRAIT", intensity: 4,
    briefing: "TAIWAN STRAIT // GREY ZONE ESCALATION",
    detail: "PLA air incursions at 3-year high. Semiconductor supply chain at risk. TSMC fab concentration critical.",
  },
  {
    lat: 43, lng: 35, label: "BLACK SEA", intensity: 4,
    briefing: "BLACK SEA // CONTESTED WATERS",
    detail: "Grain corridor suspended. Naval mine threat persistent. Russian Black Sea Fleet repositioning south.",
  },
  {
    lat: 58, lng: 20, label: "BALTIC", intensity: 2,
    briefing: "BALTIC SEA // NATO FRONTIER",
    detail: "Swedish NATO integration active. Undersea cable monitoring intensified. Russian exclave Kaliningrad watch.",
  },
  {
    lat: 34, lng: 33, label: "E. MED", intensity: 3,
    briefing: "EASTERN MEDITERRANEAN // ENERGY DISPUTES",
    detail: "Offshore gas field tensions. Israeli naval operations expanded. Turkish EEZ claims unresolved.",
  },
];

const CONNECTIONS = [
  [0, 1], [0, 3], [3, 4], [5, 1],
];

// Ordered to minimise travel distance
const PAN_SEQUENCE = [0, 5, 1, 0, 3, 4, 3, 2];

export default function ThreatMapPreview() {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const [activeBriefing, setActiveBriefing] = useState<ThreatPoint | null>(null);
  const [briefingVisible, setBriefingVisible] = useState(false);
  const [typedText, setTypedText] = useState("");

  // Typewriter effect for briefing detail
  useEffect(() => {
    if (!activeBriefing || !briefingVisible) {
      setTypedText("");
      return;
    }

    const text = activeBriefing.detail;
    let i = 0;
    setTypedText("");
    const interval = setInterval(() => {
      i++;
      setTypedText(text.slice(0, i));
      if (i >= text.length) clearInterval(interval);
    }, 18);

    return () => clearInterval(interval);
  }, [activeBriefing, briefingVisible]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: [30, 45],
      zoom: 4,
      zoomControl: false,
      attributionControl: false,
      dragging: false,
      scrollWheelZoom: false,
      doubleClickZoom: false,
      touchZoom: false,
      boxZoom: false,
      keyboard: false,
    });

    L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png", {
      subdomains: "abcd",
      keepBuffer: 8,
      updateWhenZooming: false,
      updateWhenIdle: false,
    }).addTo(map);

    THREATS.forEach((t) => {
      const color = t.intensity >= 4 ? "#f43f5e" : "#f59e0b";
      const opacity = t.intensity >= 4 ? 0.8 : 0.6;

      const pulseIcon = L.divIcon({
        className: "",
        html: `
          <div style="position:relative;width:32px;height:32px;">
            <div style="
              position:absolute;inset:0;border-radius:50%;
              border:1px solid ${color}66;
              animation:threat-map-pulse 3s ease-out infinite;
            "></div>
            <div style="
              position:absolute;top:50%;left:50%;
              width:10px;height:10px;border-radius:50%;
              transform:translate(-50%,-50%);
              background:${color};opacity:${opacity};
              box-shadow:0 0 8px ${color}66, 0 0 16px ${color}26;
            "></div>
            <span style="
              position:absolute;left:34px;top:50%;transform:translateY(-50%);
              font-size:8px;font-family:'IBM Plex Mono',monospace;
              letter-spacing:0.1em;white-space:nowrap;
              color:${color}99;
            ">${t.label}</span>
          </div>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      });

      L.marker([t.lat, t.lng], { icon: pulseIcon, interactive: false }).addTo(map);
    });

    CONNECTIONS.forEach(([a, b]) => {
      L.polyline(
        [[THREATS[a].lat, THREATS[a].lng], [THREATS[b].lat, THREATS[b].lng]],
        { color: "#f43f5e", weight: 0.5, opacity: 0.12, dashArray: "4,4" }
      ).addTo(map);
    });

    mapRef.current = map;

    let step = 0;
    let timeout: ReturnType<typeof setTimeout>;

    const panNext = () => {
      const idx = PAN_SEQUENCE[step % PAN_SEQUENCE.length];
      const target = THREATS[idx];

      // Hide previous briefing
      setBriefingVisible(false);

      // Start slow pan
      map.panTo([target.lat, target.lng], {
        duration: 5,
        easeLinearity: 0.03,
        noMoveStart: true,
      });

      // Show briefing after pan completes
      setTimeout(() => {
        setActiveBriefing(target);
        setBriefingVisible(true);
      }, 5200);

      step++;
      // Total dwell: 5s pan + 6s reading time = 11s per location
      timeout = setTimeout(panNext, 11000);
    };

    const startDelay = setTimeout(() => {
      panNext();
    }, 3000);

    return () => {
      clearTimeout(startDelay);
      clearTimeout(timeout);
      map.remove();
      mapRef.current = null;
    };
  }, []);

  return (
    <div className="relative h-52 overflow-hidden bg-navy-950">
      <div ref={containerRef} className="absolute inset-0" style={{ opacity: 0.7 }} />

      {/* Grid overlay */}
      <div
        className="absolute inset-0 opacity-[0.04] pointer-events-none"
        style={{
          backgroundImage: `
            linear-gradient(rgba(244,63,94,0.5) 1px, transparent 1px),
            linear-gradient(90deg, rgba(244,63,94,0.5) 1px, transparent 1px)
          `,
          backgroundSize: "24px 24px",
        }}
      />

      {/* Briefing readout - Bond-style intel card */}
      <div
        className="absolute top-3 right-3 z-[500] pointer-events-none transition-all duration-700"
        style={{
          opacity: briefingVisible ? 1 : 0,
          transform: briefingVisible ? "translateY(0)" : "translateY(-8px)",
          maxWidth: "260px",
        }}
      >
        <div className="rounded border border-accent-rose/20 bg-navy-950/90 backdrop-blur-sm overflow-hidden">
          {/* Header bar */}
          <div className="flex items-center gap-2 px-3 py-1.5 border-b border-accent-rose/10 bg-accent-rose/[0.04]">
            <div className="h-1.5 w-1.5 rounded-full bg-accent-rose animate-pulse" />
            <span className="text-[8px] font-mono text-accent-rose/80 tracking-[0.2em]">
              INTEL BRIEFING
            </span>
            <span className="text-[8px] font-mono text-navy-600 ml-auto">
              {activeBriefing ? `INT-${activeBriefing.intensity}` : ""}
            </span>
          </div>
          {/* Content */}
          <div className="px-3 py-2.5">
            <div className="text-[9px] font-mono text-accent-rose/70 tracking-[0.15em] mb-1.5 leading-tight">
              {activeBriefing?.briefing}
            </div>
            <div className="text-[10px] font-mono text-navy-300 leading-relaxed">
              {typedText}
              {typedText.length < (activeBriefing?.detail.length || 0) && (
                <span className="inline-block w-1 h-2.5 bg-accent-rose/50 ml-0.5 animate-pulse" />
              )}
            </div>
          </div>
          {/* Bottom scanline */}
          <div className="h-px bg-gradient-to-r from-transparent via-accent-rose/20 to-transparent" />
        </div>
      </div>

      {/* Edge vignette */}
      <div className="absolute inset-0 pointer-events-none" style={{
        boxShadow: "inset 0 0 60px 20px rgba(0,0,0,0.6)",
      }} />

      {/* Labels */}
      <div className="absolute bottom-3 left-4 flex items-center gap-2 z-[500]">
        <div className="h-1.5 w-1.5 rounded-full bg-accent-rose animate-pulse" />
        <span className="text-[9px] text-accent-rose/60 tracking-[0.2em] font-mono">LIVE THREAT MAP</span>
      </div>
      <div className="absolute bottom-3 right-4 flex items-center gap-3 z-[500]">
        <div className="flex items-center gap-1.5">
          <div className="h-1 w-1 rounded-full bg-accent-rose/60" />
          <span className="text-[8px] text-navy-500 font-mono">HIGH</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-1 w-1 rounded-full bg-accent-amber/60" />
          <span className="text-[8px] text-navy-500 font-mono">MED</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-1 w-1 rounded-full bg-accent-cyan/60" />
          <span className="text-[8px] text-navy-500 font-mono">TRACK</span>
        </div>
      </div>

      <style>{`
        @keyframes threat-map-pulse {
          0% { transform: scale(1); opacity: 0.6; }
          100% { transform: scale(3); opacity: 0; }
        }
        .leaflet-tile-pane img {
          outline: none !important;
          border: none !important;
        }
        .leaflet-tile {
          outline: none !important;
          border: none !important;
          will-change: transform;
        }
        .leaflet-tile-container {
          will-change: transform;
        }
        .leaflet-fade-anim .leaflet-tile {
          transition: opacity 0.3s linear !important;
        }
      `}</style>
    </div>
  );
}
