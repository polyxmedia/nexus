"use client";

import { useEffect, useState, useRef } from "react";
import { X, Plane, Eye, Loader2, ExternalLink, MapPin } from "lucide-react";
import L from "leaflet";
import type { AircraftState } from "@/lib/warroom/types";
import { decodeCallsign } from "@/lib/warroom/callsign-decode";

interface AircraftDetailPanelProps {
  aircraft: AircraftState | null;
  onClose: () => void;
  onWatch?: (aircraft: AircraftState) => void;
  isWatched?: boolean;
}

interface AircraftMeta {
  icao24: string;
  registration: string | null;
  manufacturer: string | null;
  model: string | null;
  typecode: string | null;
  operator: string | null;
  owner: string | null;
  built: string | null;
  categoryDescription: string | null;
  imageUrl: string | null;
  imageSource: string | null;
}

interface TrackPoint {
  time: number;
  lat: number;
  lng: number;
  altitude: number;
  heading: number;
  onGround: boolean;
}

interface DetailData {
  meta: AircraftMeta;
  track: TrackPoint[];
}

function headingToCardinal(deg: number): string {
  const dirs = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
  return dirs[Math.round(deg / 22.5) % 16];
}

function formatTime(ts: number): string {
  return new Date(ts * 1000).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function TrackMiniMap({ track, isMilitary }: { track: TrackPoint[]; isMilitary: boolean }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!containerRef.current || track.length < 2) return;
    if (mapRef.current) {
      mapRef.current.remove();
      mapRef.current = null;
    }

    const miniMap = L.map(containerRef.current, {
      zoomControl: false,
      attributionControl: false,
      dragging: false,
      scrollWheelZoom: false,
      doubleClickZoom: false,
      boxZoom: false,
      keyboard: false,
      touchZoom: false,
    });

    L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png", {
      subdomains: "abcd",
    }).addTo(miniMap);

    const coords: L.LatLngExpression[] = track.map((p) => [p.lat, p.lng]);
    const color = isMilitary ? "#f43f5e" : "#06b6d4";

    L.polyline(coords, { color, weight: 2, opacity: 0.8 }).addTo(miniMap);

    // Start marker
    L.circleMarker(coords[0], {
      radius: 4,
      color: "#555",
      fillColor: "#3d3d3d",
      fillOpacity: 1,
      weight: 1,
    }).addTo(miniMap);

    // Current position marker
    L.circleMarker(coords[coords.length - 1], {
      radius: 5,
      color: "rgba(255,255,255,0.3)",
      fillColor: color,
      fillOpacity: 1,
      weight: 1,
    }).addTo(miniMap);

    const bounds = L.latLngBounds(coords);
    miniMap.fitBounds(bounds, { padding: [15, 15] });
    mapRef.current = miniMap;

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [track, isMilitary]);

  return (
    <div
      ref={containerRef}
      className="rounded-md overflow-hidden border border-navy-700/20"
      style={{ height: "140px", width: "100%" }}
    />
  );
}

export function AircraftDetailModal({
  aircraft,
  onClose,
  onWatch,
  isWatched,
}: AircraftDetailPanelProps) {
  const [detail, setDetail] = useState<DetailData | null>(null);
  const [loading, setLoading] = useState(false);
  const [prevIcao, setPrevIcao] = useState<string | null>(null);

  useEffect(() => {
    if (!aircraft) {
      setDetail(null);
      setPrevIcao(null);
      return;
    }

    // Don't refetch if same aircraft
    if (aircraft.icao24 === prevIcao) return;

    setPrevIcao(aircraft.icao24);
    setLoading(true);
    setDetail(null);

    fetch(`/api/warroom/aircraft/${aircraft.icao24}`)
      .then((r) => r.json())
      .then((d) => {
        setDetail(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [aircraft, prevIcao]);

  if (!aircraft) return null;

  const decoded = aircraft.isMilitary ? decodeCallsign(aircraft.callsign) : null;
  const altFt = Math.round(aircraft.altitude * 3.281);
  const speedKts = Math.round(aircraft.velocity * 1.944);
  const altBand = altFt < 1000 ? "GND" : altFt < 10000 ? "LOW" : altFt < 33000 ? "MID" : "HIGH";
  const mach = aircraft.velocity / 343;

  const meta = detail?.meta;
  const track = detail?.track || [];
  const displayModel = meta?.model || decoded?.platform || null;
  const displayManufacturer = meta?.manufacturer || null;

  // Compute track stats
  const trackDuration = track.length >= 2
    ? track[track.length - 1].time - track[0].time
    : 0;
  const trackDurationMin = Math.round(trackDuration / 60);
  const maxAlt = track.length > 0
    ? Math.max(...track.map((p) => p.altitude))
    : aircraft.altitude;

  return (
    <div className="absolute bottom-0 left-[21rem] z-40 pointer-events-auto w-96 rounded-t-lg border border-b-0 border-navy-700/40 bg-navy-900/95 backdrop-blur-md wr-shadow-lg overflow-hidden max-h-[calc(100vh-6rem)] overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-navy-700/20 sticky top-0 bg-navy-900/95 backdrop-blur-md z-10">
        <div className="flex items-center gap-2.5 min-w-0">
          <Plane className={`h-4 w-4 ${aircraft.isMilitary ? "text-accent-rose" : "text-navy-400"}`} />
          <div className="min-w-0">
            <div className="text-xs font-semibold text-navy-100 font-mono truncate">
              {aircraft.callsign || aircraft.icao24}
            </div>
            <div className="text-[9px] text-navy-500 uppercase tracking-wider">
              {aircraft.isMilitary ? "MILITARY" : "CIVILIAN"}
              {meta?.registration && ` / ${meta.registration}`}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-0.5 shrink-0">
          {onWatch && (
            <button
              onClick={() => onWatch(aircraft)}
              className={`p-1 rounded transition-colors ${
                isWatched
                  ? "bg-accent-cyan/15 text-accent-cyan"
                  : "text-navy-500 hover:text-navy-300 hover:bg-navy-800/60"
              }`}
              title={isWatched ? "Remove from watchlist" : "Add to watchlist"}
            >
              <Eye className="h-3.5 w-3.5" />
            </button>
          )}
          <button
            onClick={onClose}
            className="text-navy-500 hover:text-navy-300 hover:bg-navy-800/60 rounded p-1 transition-colors"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <div className="px-3 py-2.5 space-y-3">
        {/* Aircraft Photo */}
        {meta?.imageUrl && (
          <div className="rounded-md overflow-hidden border border-navy-700/30">
            <img
              src={meta.imageUrl}
              alt={displayModel || aircraft.callsign || aircraft.icao24}
              className="w-full h-36 object-cover"
              loading="lazy"
            />
            {meta.imageSource && (
              <div className="text-[8px] text-navy-600 px-2 py-0.5 bg-navy-800/80">
                Photo: {meta.imageSource}
              </div>
            )}
          </div>
        )}

        {loading && !meta && (
          <div className="flex items-center justify-center py-4 gap-2 text-[10px] text-navy-500">
            <Loader2 className="h-3 w-3 animate-spin" />
            Loading aircraft data...
          </div>
        )}

        {/* Aircraft Identity */}
        <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-[11px]">
          <span className="text-navy-500">Callsign</span>
          <span className="text-navy-100 font-mono font-medium">{aircraft.callsign || "N/A"}</span>

          <span className="text-navy-500">ICAO24</span>
          <span className="text-navy-300 font-mono">{aircraft.icao24}</span>

          <span className="text-navy-500">Origin</span>
          <span className="text-navy-300">{aircraft.originCountry}</span>

          {displayManufacturer && (
            <>
              <span className="text-navy-500">Manufacturer</span>
              <span className="text-navy-200">{displayManufacturer}</span>
            </>
          )}

          {displayModel && (
            <>
              <span className="text-navy-500">Aircraft</span>
              <span className="text-accent-cyan font-medium">{displayModel}</span>
            </>
          )}

          {meta?.typecode && (
            <>
              <span className="text-navy-500">Type Code</span>
              <span className="text-navy-300 font-mono">{meta.typecode}</span>
            </>
          )}

          {meta?.operator && (
            <>
              <span className="text-navy-500">Operator</span>
              <span className="text-navy-200">{meta.operator}</span>
            </>
          )}

          {meta?.owner && meta.owner !== meta.operator && (
            <>
              <span className="text-navy-500">Owner</span>
              <span className="text-navy-300">{meta.owner}</span>
            </>
          )}

          {meta?.built && (
            <>
              <span className="text-navy-500">Built</span>
              <span className="text-navy-300">{meta.built}</span>
            </>
          )}

          {meta?.categoryDescription && (
            <>
              <span className="text-navy-500">Category</span>
              <span className="text-navy-300">{meta.categoryDescription}</span>
            </>
          )}

          {decoded && (
            <>
              <span className="text-navy-500">Unit</span>
              <span className="text-accent-amber">{decoded.unit}</span>
              {decoded.role && (
                <>
                  <span className="text-navy-500">Role</span>
                  <span className="text-navy-300">{decoded.role}</span>
                </>
              )}
            </>
          )}
        </div>

        {/* Flight Data */}
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-navy-800/40 rounded px-2 py-2 text-center">
            <div className="text-[9px] text-navy-500 uppercase">Alt</div>
            <div className="text-xs font-mono font-medium text-navy-100">{altFt.toLocaleString()}</div>
            <div className="text-[9px] text-navy-500">ft ({altBand})</div>
          </div>
          <div className="bg-navy-800/40 rounded px-2 py-2 text-center">
            <div className="text-[9px] text-navy-500 uppercase">Spd</div>
            <div className="text-xs font-mono font-medium text-navy-100">{speedKts}</div>
            <div className="text-[9px] text-navy-500">kts (M{mach.toFixed(2)})</div>
          </div>
          <div className="bg-navy-800/40 rounded px-2 py-2 text-center">
            <div className="text-[9px] text-navy-500 uppercase">Hdg</div>
            <div className="text-xs font-mono font-medium text-navy-100">{Math.round(aircraft.heading)}&deg;</div>
            <div className="text-[9px] text-navy-500">{headingToCardinal(aircraft.heading)}</div>
          </div>
        </div>

        {/* Position */}
        <div className="flex gap-3 text-[10px] text-navy-400 font-mono">
          <span>{aircraft.lat.toFixed(4)}&deg;{aircraft.lat >= 0 ? "N" : "S"}</span>
          <span>{aircraft.lng.toFixed(4)}&deg;{aircraft.lng >= 0 ? "E" : "W"}</span>
          <span>{Math.round(aircraft.altitude).toLocaleString()}m</span>
        </div>

        {/* Flight Track */}
        {track.length >= 2 && (
          <div className="border-t border-navy-700/20 pt-3">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5">
                <MapPin className="h-3 w-3 text-accent-cyan" />
                <span className="text-[10px] font-semibold uppercase tracking-widest text-navy-500">
                  Flight Track
                </span>
              </div>
              <span className="text-[10px] text-navy-500 font-mono">
                {trackDurationMin}min / {track.length} pts
              </span>
            </div>

            {/* Mini track map */}
            <TrackMiniMap track={track} isMilitary={aircraft.isMilitary} />

              {/* Track data summary */}
              <div className="grid grid-cols-3 gap-2 mt-2 text-[9px]">
                <div>
                  <span className="text-navy-600">Start</span>
                  <div className="text-navy-400 font-mono">{formatTime(track[0].time)}</div>
                </div>
                <div className="text-center">
                  <span className="text-navy-600">Max Alt</span>
                  <div className="text-navy-400 font-mono">{Math.round(maxAlt * 3.281).toLocaleString()} ft</div>
                </div>
                <div className="text-right">
                  <span className="text-navy-600">Now</span>
                  <div className="text-navy-400 font-mono">{formatTime(track[track.length - 1].time)}</div>
                </div>
              </div>
          </div>
        )}

        {/* External Links */}
        <div className="border-t border-navy-700/20 pt-2 flex flex-wrap gap-2">
          <a
            href={`https://globe.adsbexchange.com/?icao=${aircraft.icao24}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-[10px] text-navy-500 hover:text-accent-cyan transition-colors"
          >
            <ExternalLink className="h-2.5 w-2.5" />
            ADS-B Exchange
          </a>
          <a
            href={`https://www.flightradar24.com/${aircraft.callsign || aircraft.icao24}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-[10px] text-navy-500 hover:text-accent-cyan transition-colors"
          >
            <ExternalLink className="h-2.5 w-2.5" />
            Flightradar24
          </a>
          {meta?.registration && (
            <a
              href={`https://www.planespotters.net/hex/${aircraft.icao24}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-[10px] text-navy-500 hover:text-accent-cyan transition-colors"
            >
              <ExternalLink className="h-2.5 w-2.5" />
              Planespotters
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
