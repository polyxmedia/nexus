"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { GlobeMethods } from "react-globe.gl";
import type {
  ActorWithGeo,
  ScenarioWithAnalysis,
  AircraftState,
  VesselState,
  OsintEvent,
  SatellitePosition,
  WarRoomLayerVisibility,
} from "@/lib/warroom/types";
import type { AllianceLink, ConflictZone, StrategicLocation } from "@/lib/warroom/geo-constants";
import { ACTOR_COORDS } from "@/lib/warroom/geo-constants";
import { decodeCallsign as decodeGlobeCallsign } from "@/lib/warroom/callsign-decode";
import * as THREE from "three";

// Lazy import Globe (already dynamically imported at page level, but typed here)
import Globe from "react-globe.gl";

// ── Earth shaders (ported from 3dsolarsystem.online) ──

const earthVertexShader = `
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vWorldNormal;
  varying vec3 vPosition;
  varying vec3 vWorldPosition;

  void main() {
    vUv = uv;
    vNormal = normalize(normalMatrix * normal);
    vWorldNormal = normalize(mat3(modelMatrix) * normal);
    vPosition = (modelViewMatrix * vec4(position, 1.0)).xyz;
    vWorldPosition = (modelMatrix * vec4(position, 1.0)).xyz;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const earthFragmentShader = `
  uniform sampler2D dayTexture;
  uniform sampler2D nightTexture;
  uniform sampler2D cloudsTexture;
  uniform vec3 sunPosition;
  uniform float cloudOpacity;

  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vWorldNormal;
  varying vec3 vPosition;
  varying vec3 vWorldPosition;

  vec3 adjustSaturation(vec3 color, float saturation) {
    float grey = dot(color, vec3(0.2126, 0.7152, 0.0722));
    return mix(vec3(grey), color, saturation);
  }

  vec3 adjustContrast(vec3 color, float contrast) {
    return (color - 0.5) * contrast + 0.5;
  }

  void main() {
    vec3 sunDir = normalize(sunPosition - vWorldPosition);
    float sunFacing = dot(vWorldNormal, sunDir);
    float dayFactor = smoothstep(-0.1, 0.2, sunFacing);

    vec4 dayColor = texture2D(dayTexture, vUv);
    vec4 nightColor = texture2D(nightTexture, vUv);
    vec4 clouds = texture2D(cloudsTexture, vUv);

    // Color grade the day texture
    vec3 gradedDay = dayColor.rgb;
    gradedDay = adjustSaturation(gradedDay, 0.85);
    gradedDay = adjustContrast(gradedDay, 1.08);
    gradedDay.b += 0.02;
    gradedDay.g += 0.01;

    // City lights with warm orange tint
    vec3 cityLights = nightColor.rgb * 2.5;
    cityLights.r *= 1.1;
    cityLights.b *= 0.85;

    float diffuse = max(sunFacing, 0.0);

    // Day side with diffuse lighting
    vec3 dayLit = gradedDay * (0.15 + diffuse * 0.85);

    // Cloud overlay on day side
    float cloudBlend = clouds.r * cloudOpacity * dayFactor;
    dayLit = mix(dayLit, vec3(1.0) * (0.15 + diffuse * 0.85), cloudBlend);

    // Night side city lights
    vec3 nightLit = cityLights * 0.6;

    vec3 surfaceColor = mix(nightLit, dayLit, dayFactor);

    gl_FragColor = vec4(surfaceColor, 1.0);
  }
`;

const atmosphereVertexShader = `
  varying vec3 vNormal;
  varying vec3 vPosition;
  varying vec3 vWorldPosition;
  varying vec3 vWorldNormal;

  void main() {
    vNormal = normalize(normalMatrix * normal);
    vWorldNormal = normalize(mat3(modelMatrix) * normal);
    vPosition = (modelViewMatrix * vec4(position, 1.0)).xyz;
    vWorldPosition = (modelMatrix * vec4(position, 1.0)).xyz;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const atmosphereFragmentShader = `
  uniform vec3 sunPosition;

  varying vec3 vNormal;
  varying vec3 vPosition;
  varying vec3 vWorldPosition;
  varying vec3 vWorldNormal;

  void main() {
    vec3 viewDir = normalize(-vPosition);
    vec3 sunDir = normalize(sunPosition - vWorldPosition);
    float sunFacing = dot(vWorldNormal, sunDir);
    float dayFactor = smoothstep(-0.3, 0.2, sunFacing);

    float fresnel = 1.0 - abs(dot(viewDir, vNormal));
    float glow = pow(fresnel, 1.5);

    glow *= smoothstep(0.0, 0.3, fresnel);
    glow *= 1.0 - smoothstep(0.6, 1.0, fresnel);

    // Reduce on dark side but keep 30% visible
    glow *= (0.3 + dayFactor * 0.7);

    vec3 blueColor = vec3(0.3, 0.6, 1.0);
    vec3 lightBlue = vec3(0.55, 0.8, 1.0);
    float whiteMix = smoothstep(0.4, 0.7, fresnel) * 0.3;
    vec3 atmosphereColor = mix(blueColor, lightBlue, whiteMix);

    gl_FragColor = vec4(atmosphereColor * glow, glow * 0.65);
  }
`;

// ── Build custom earth material + atmosphere ──

function createEarthMaterial(): THREE.ShaderMaterial {
  const loader = new THREE.TextureLoader();
  const dayTex = loader.load("/textures/earth_day.jpg");
  const nightTex = loader.load("/textures/earth_night.jpg");
  const cloudsTex = loader.load("/textures/earth_clouds.jpg");

  // Set texture quality
  for (const tex of [dayTex, nightTex, cloudsTex]) {
    tex.minFilter = THREE.LinearMipmapLinearFilter;
    tex.magFilter = THREE.LinearFilter;
    tex.anisotropy = 8;
  }

  // Sun position - top-right for good day/night split
  const sunPos = new THREE.Vector3(100, 60, 80);

  return new THREE.ShaderMaterial({
    vertexShader: earthVertexShader,
    fragmentShader: earthFragmentShader,
    uniforms: {
      dayTexture: { value: dayTex },
      nightTexture: { value: nightTex },
      cloudsTexture: { value: cloudsTex },
      sunPosition: { value: sunPos },
      cloudOpacity: { value: 0.35 },
    },
  });
}

function addAtmosphere(scene: THREE.Scene) {
  const sunPos = new THREE.Vector3(100, 60, 80);

  // Find the globe mesh to match its scale
  let globeRadius = 100; // default react-globe.gl radius
  scene.traverse((obj) => {
    if (obj instanceof THREE.Mesh && obj.geometry instanceof THREE.SphereGeometry) {
      const params = obj.geometry.parameters;
      if (params && params.radius > 50) {
        globeRadius = params.radius;
      }
    }
  });

  const atmosGeometry = new THREE.SphereGeometry(globeRadius * 1.015, 64, 64);
  const atmosMaterial = new THREE.ShaderMaterial({
    vertexShader: atmosphereVertexShader,
    fragmentShader: atmosphereFragmentShader,
    uniforms: {
      sunPosition: { value: sunPos },
    },
    side: THREE.BackSide,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });

  const atmosMesh = new THREE.Mesh(atmosGeometry, atmosMaterial);
  atmosMesh.name = "earth-atmosphere";
  scene.add(atmosMesh);

  return atmosMesh;
}

// ── Escalation colors (matching 2D map) ──

const ESCALATION_COLORS: Record<number, string> = {
  1: "#3b82f6",
  2: "#22c55e",
  3: "#eab308",
  4: "#f97316",
  5: "#ef4444",
};

// ── OSINT event colors ──

const OSINT_COLORS: Record<string, string> = {
  battles: "#ef4444",
  explosions: "#f97316",
  violence_against_civilians: "#f43f5e",
  protests: "#eab308",
  riots: "#f59e0b",
  strategic_developments: "#06b6d4",
};

// ── Satellite category colors ──

const SAT_COLORS: Record<string, string> = {
  military: "#f43f5e",
  navigation: "#06b6d4",
  weather: "#22c55e",
  comms: "#a78bfa",
  science: "#f59e0b",
  other: "#6b7280",
};

// ── Props ──

interface GlobeViewProps {
  actors: ActorWithGeo[];
  conflictZones: ConflictZone[];
  allianceLinks: AllianceLink[];
  strategicLocations: StrategicLocation[];
  scenarios: ScenarioWithAnalysis[];
  aircraft: AircraftState[];
  vessels: VesselState[];
  osintEvents: OsintEvent[];
  satellites: SatellitePosition[];
  layerVisibility: WarRoomLayerVisibility;
  onActorClick: (id: string) => void;
  onOsintEventClick: (event: OsintEvent) => void;
}

// ── Helper types for globe data ──

interface ActorPoint {
  type: "actor";
  id: string;
  lat: number;
  lng: number;
  color: string;
  name: string;
  colorGroup: string;
}

interface LocationPoint {
  type: "location";
  id: string;
  lat: number;
  lng: number;
  color: string;
  name: string;
  locationType: string;
}

interface OsintPoint {
  type: "osint";
  lat: number;
  lng: number;
  color: string;
  radius: number;
  event: OsintEvent;
}

interface VesselPoint {
  type: "vessel";
  lat: number;
  lng: number;
  color: string;
  name: string;
  vesselType: string;
  speed: number;
  course: number;
  flag: string;
  destination: string;
}

interface ArcData {
  startLat: number;
  startLng: number;
  endLat: number;
  endLng: number;
  color: string;
  type: string;
}

interface RingData {
  lat: number;
  lng: number;
  maxR: number;
  color: string;
  name: string;
}

type PointData = ActorPoint | LocationPoint | OsintPoint | VesselPoint;

export default function GlobeView({
  actors,
  conflictZones,
  allianceLinks,
  strategicLocations,
  aircraft,
  vessels,
  osintEvents,
  satellites,
  layerVisibility,
  onActorClick,
  onOsintEventClick,
}: GlobeViewProps) {
  const globeRef = useRef<GlobeMethods>(undefined);
  const containerRef = useRef<HTMLDivElement>(null);
  const atmosRef = useRef<THREE.Mesh | null>(null);
  const materialRef = useRef<THREE.ShaderMaterial | null>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });

  // Create custom earth material once
  const earthMaterial = useMemo(() => {
    const mat = createEarthMaterial();
    materialRef.current = mat;
    return mat;
  }, []);

  // Size tracking
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const update = () => {
      setDimensions({ width: el.clientWidth, height: el.clientHeight });
    };
    update();

    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Set initial camera position + add atmosphere
  useEffect(() => {
    if (globeRef.current) {
      globeRef.current.pointOfView({ lat: 25, lng: 45, altitude: 2.5 }, 0);

      // Add atmosphere glow to the scene
      const scene = globeRef.current.scene();
      if (scene && !atmosRef.current) {
        // Small delay to ensure globe mesh is in the scene
        setTimeout(() => {
          atmosRef.current = addAtmosphere(scene);
        }, 100);
      }
    }

    return () => {
      if (atmosRef.current) {
        atmosRef.current.geometry.dispose();
        (atmosRef.current.material as THREE.ShaderMaterial).dispose();
        atmosRef.current.removeFromParent();
        atmosRef.current = null;
      }
    };
  }, []);

  // ── Points data ──

  const pointsData = useMemo(() => {
    const pts: PointData[] = [];

    // Actors
    for (const actor of actors) {
      pts.push({
        type: "actor",
        id: actor.id,
        lat: actor.coords.lat,
        lng: actor.coords.lng,
        color: actor.color,
        name: actor.shortName || actor.name,
        colorGroup: actor.colorGroup,
      });
    }

    // Strategic locations
    for (const loc of strategicLocations) {
      pts.push({
        type: "location",
        id: loc.id,
        lat: loc.coords.lat,
        lng: loc.coords.lng,
        color: loc.type === "institution" ? "#f59e0b" : "#06b6d4",
        name: loc.name,
        locationType: loc.type,
      });
    }

    // OSINT events
    if (layerVisibility.osintMarkers) {
      for (const evt of osintEvents) {
        const radius = Math.min(0.3 + evt.fatalities * 0.05, 0.8);
        pts.push({
          type: "osint",
          lat: evt.lat,
          lng: evt.lng,
          color: OSINT_COLORS[evt.eventType] || "#6b7280",
          radius,
          event: evt,
        });
      }
    }

    // Vessels
    if (layerVisibility.vessels) {
      for (const v of vessels) {
        const vesselColors: Record<string, string> = {
          military: "#f43f5e",
          tanker: "#f59e0b",
          cargo: "#6b7280",
          passenger: "#06b6d4",
          fishing: "#22c55e",
          other: "#6b7280",
        };
        pts.push({
          type: "vessel",
          lat: v.lat,
          lng: v.lng,
          color: vesselColors[v.vesselType] || "#6b7280",
          name: v.name,
          vesselType: v.vesselType,
          speed: v.speed,
          course: v.course,
          flag: v.flag,
          destination: v.destination,
        });
      }
    }

    return pts;
  }, [actors, strategicLocations, osintEvents, vessels, layerVisibility]);

  // ── HTML Elements (aircraft + satellites rendered as SVG/HTML instead of 3D cylinders) ──

  interface HtmlMarker {
    markerType: "aircraft" | "satellite";
    lat: number;
    lng: number;
    alt: number;
    // aircraft fields
    callsign?: string;
    heading?: number;
    isMilitary?: boolean;
    altitude?: number;
    velocity?: number;
    originCountry?: string;
    // satellite fields
    color?: string;
    size?: number;
    name?: string;
    noradId?: string;
    altKm?: number;
    velocityKmS?: number;
    category?: string;
    country?: string;
  }

  const htmlMarkersData = useMemo(() => {
    const markers: HtmlMarker[] = [];

    // Aircraft as SVG icons
    if (layerVisibility.aircraft) {
      for (const ac of aircraft) {
        markers.push({
          markerType: "aircraft",
          lat: ac.lat,
          lng: ac.lng,
          alt: 0.01,
          callsign: ac.callsign,
          heading: ac.heading,
          isMilitary: ac.isMilitary,
          altitude: ac.altitude,
          velocity: ac.velocity,
          originCountry: ac.originCountry,
        });
      }
    }

    // Satellites as colored dots
    if (layerVisibility.satellites) {
      for (const sat of satellites) {
        markers.push({
          markerType: "satellite",
          lat: sat.lat,
          lng: sat.lng,
          alt: Math.min(sat.altKm / 6371, 0.12),
          color: SAT_COLORS[sat.category] || "#6b7280",
          size: sat.category === "military" ? 5 : 3,
          name: sat.name,
          noradId: sat.noradId,
          altKm: sat.altKm,
          velocityKmS: sat.velocityKmS,
          category: sat.category,
          country: sat.country,
        });
      }
    }

    return markers;
  }, [aircraft, satellites, layerVisibility.aircraft, layerVisibility.satellites]);

  const createHtmlElement = useCallback((d: object) => {
    const m = d as HtmlMarker;
    const el = document.createElement("div");

    if (m.markerType === "aircraft") {
      const color = m.isMilitary ? "#f43f5e" : "#a8a8a8";
      const sz = m.isMilitary ? 14 : 10;
      const pathD = m.isMilitary
        ? "M12 1 L14 9 L22 12 L14 13 L14 20 L17 22 L7 22 L10 20 L10 13 L2 12 L10 9 Z"
        : "M12 2 L13.5 8 L23 11.5 L13.5 13 L13 19 L16 22 L8 22 L11 19 L10.5 13 L1 11.5 L10.5 8 Z";

      const svgNS = "http://www.w3.org/2000/svg";
      const svg = document.createElementNS(svgNS, "svg");
      svg.setAttribute("viewBox", "0 0 24 24");
      svg.setAttribute("width", String(sz));
      svg.setAttribute("height", String(sz));
      svg.style.transform = `rotate(${Math.round(m.heading || 0)}deg)`;
      if (m.isMilitary) {
        svg.style.filter = "drop-shadow(0 0 4px rgba(244,63,94,0.6))";
      }
      const pathEl = document.createElementNS(svgNS, "path");
      pathEl.setAttribute("d", pathD);
      pathEl.setAttribute("fill", color);
      pathEl.setAttribute("stroke", "rgba(255,255,255,0.15)");
      pathEl.setAttribute("stroke-width", "0.5");
      svg.appendChild(pathEl);
      el.appendChild(svg);
      el.style.cssText = "cursor:pointer;transform:translate(-50%,-50%);";

      // Tooltip on hover
      const decoded = m.isMilitary ? decodeGlobeCallsign(m.callsign || "") : null;
      const altFt = Math.round((m.altitude || 0) * 3.281);
      const spdKts = Math.round((m.velocity || 0) * 1.944);

      el.title = "";
      el.addEventListener("mouseenter", () => {
        let tip = el.querySelector(".globe-tip") as HTMLDivElement;
        if (!tip) {
          tip = document.createElement("div");
          tip.className = "globe-tip";
          tip.style.cssText = "position:absolute;bottom:100%;left:50%;transform:translateX(-50%);background:rgba(0,10,30,0.92);border:1px solid rgba(100,120,160,0.25);border-radius:6px;padding:6px 10px;font-family:'IBM Plex Mono',monospace;font-size:10px;color:#d4d4d4;white-space:nowrap;pointer-events:none;z-index:999;";

          if (m.isMilitary) {
            const milLabel = document.createElement("div");
            milLabel.style.cssText = "color:#f43f5e;font-weight:700;font-size:9px;letter-spacing:.05em;";
            milLabel.textContent = "MILITARY";
            tip.appendChild(milLabel);
          }

          const callsignDiv = document.createElement("div");
          callsignDiv.style.cssText = "font-weight:600;color:#e5e5e5;";
          callsignDiv.textContent = m.callsign || "UNKNOWN";
          tip.appendChild(callsignDiv);

          if (decoded) {
            const unitDiv = document.createElement("div");
            unitDiv.style.cssText = "color:#f59e0b;font-size:9px;";
            unitDiv.textContent = decoded.unit;
            tip.appendChild(unitDiv);
          }

          if (decoded?.platform) {
            const platformDiv = document.createElement("div");
            platformDiv.style.cssText = "color:#06b6d4;font-size:9px;font-weight:600;";
            platformDiv.textContent = decoded.platform;
            tip.appendChild(platformDiv);
          }

          const countryDiv = document.createElement("div");
          countryDiv.style.opacity = "0.7";
          countryDiv.textContent = m.originCountry || "";
          tip.appendChild(countryDiv);

          const altDiv = document.createElement("div");
          altDiv.textContent = `ALT ${altFt.toLocaleString()} ft | ${spdKts} kts`;
          tip.appendChild(altDiv);

          el.appendChild(tip);
        }
        tip.style.display = "block";
      });
      el.addEventListener("mouseleave", () => {
        const tip = el.querySelector(".globe-tip") as HTMLDivElement;
        if (tip) tip.style.display = "none";
      });
    } else {
      // Satellite: small colored dot
      const color = m.color || "#6b7280";
      const sz = m.size || 3;
      const isMil = m.category === "military";

      const dot = document.createElement("div");
      dot.style.width = `${sz}px`;
      dot.style.height = `${sz}px`;
      dot.style.borderRadius = "50%";
      dot.style.background = color;
      if (isMil) {
        dot.style.boxShadow = `0 0 4px ${color}`;
      }
      el.appendChild(dot);
      el.style.cssText = "cursor:pointer;transform:translate(-50%,-50%);";

      el.addEventListener("mouseenter", () => {
        let tip = el.querySelector(".globe-tip") as HTMLDivElement;
        if (!tip) {
          tip = document.createElement("div");
          tip.className = "globe-tip";
          tip.style.cssText = "position:absolute;bottom:100%;left:50%;transform:translateX(-50%);background:rgba(0,10,30,0.92);border:1px solid rgba(100,120,160,0.25);border-radius:6px;padding:6px 10px;font-family:'IBM Plex Mono',monospace;font-size:10px;color:#d4d4d4;white-space:nowrap;pointer-events:none;z-index:999;";

          const nameDiv = document.createElement("div");
          nameDiv.style.cssText = `font-weight:600;color:${color};`;
          nameDiv.textContent = m.name || "UNKNOWN";
          tip.appendChild(nameDiv);

          const catDiv = document.createElement("div");
          catDiv.style.cssText = "text-transform:uppercase;font-size:9px;opacity:0.7;";
          catDiv.textContent = `${m.category} | ${m.country}`;
          tip.appendChild(catDiv);

          const noradDiv = document.createElement("div");
          noradDiv.textContent = `NORAD: ${m.noradId}`;
          tip.appendChild(noradDiv);

          const altDiv = document.createElement("div");
          altDiv.textContent = `ALT: ${(m.altKm || 0).toLocaleString()} km | ${(m.velocityKmS || 0).toFixed(1)} km/s`;
          tip.appendChild(altDiv);

          el.appendChild(tip);
        }
        tip.style.display = "block";
      });
      el.addEventListener("mouseleave", () => {
        const tip = el.querySelector(".globe-tip") as HTMLDivElement;
        if (tip) tip.style.display = "none";
      });
    }

    return el;
  }, []);

  // ── Arcs (alliance/adversary links) ──

  const arcsData = useMemo(() => {
    const arcs: ArcData[] = [];

    for (const link of allianceLinks) {
      const from = ACTOR_COORDS[link.from];
      const to = ACTOR_COORDS[link.to];
      if (!from || !to) continue;

      arcs.push({
        startLat: from.lat,
        startLng: from.lng,
        endLat: to.lat,
        endLng: to.lng,
        color: link.type === "alliance" ? "#06b6d4" : "#f43f5e",
        type: link.type,
      });
    }

    return arcs;
  }, [allianceLinks]);

  // ── Rings (conflict zones) ──

  const ringsData = useMemo(() => {
    return conflictZones.map((zone): RingData => ({
      lat: zone.center.lat,
      lng: zone.center.lng,
      maxR: zone.radiusKm / 200, // scale to degrees roughly
      color: ESCALATION_COLORS[zone.escalationLevel] || "#3b82f6",
      name: zone.name,
    }));
  }, [conflictZones]);

  // ── Labels ──

  const labelsData = useMemo(() => {
    const labels: { lat: number; lng: number; text: string; color: string; size: number }[] = [];

    for (const actor of actors) {
      labels.push({
        lat: actor.coords.lat,
        lng: actor.coords.lng,
        text: actor.shortName || actor.name,
        color: actor.color,
        size: 0.6,
      });
    }

    for (const loc of strategicLocations) {
      labels.push({
        lat: loc.coords.lat,
        lng: loc.coords.lng,
        text: loc.name,
        color: loc.type === "institution" ? "#f59e0b" : "#06b6d4",
        size: 0.4,
      });
    }

    return labels;
  }, [actors, strategicLocations]);

  // ── Accessors ──

  const getPointColor = useCallback((d: object) => {
    const pt = d as PointData;
    return pt.color;
  }, []);

  const getPointAltitude = useCallback(() => {
    return 0;
  }, []);

  const getPointRadius = useCallback((d: object) => {
    const pt = d as PointData;
    if (pt.type === "actor") return 0.5;
    if (pt.type === "location") return 0.3;
    if (pt.type === "osint") return pt.radius;
    if (pt.type === "vessel") return 0.15;
    return 0.15;
  }, []);

  const getPointLabel = useCallback((d: object) => {
    const pt = d as PointData;

    if (pt.type === "actor") {
      return `<div style="background:rgba(0,10,30,0.92);border:1px solid rgba(100,120,160,0.25);border-radius:6px;padding:6px 10px;font-family:'IBM Plex Mono',monospace;font-size:10px;color:#d4d4d4;">
        <div style="font-weight:600;color:${pt.color};margin-bottom:2px;">${pt.name}</div>
        <div style="opacity:0.7;text-transform:uppercase;font-size:9px;">${pt.colorGroup}</div>
      </div>`;
    }

    if (pt.type === "location") {
      return `<div style="background:rgba(0,10,30,0.92);border:1px solid rgba(100,120,160,0.25);border-radius:6px;padding:6px 10px;font-family:'IBM Plex Mono',monospace;font-size:10px;color:#d4d4d4;">
        <div style="font-weight:600;">${pt.name}</div>
        <div style="opacity:0.7;text-transform:uppercase;font-size:9px;">${pt.locationType}</div>
      </div>`;
    }

    if (pt.type === "osint") {
      const e = pt.event;
      return `<div style="background:rgba(0,10,30,0.92);border:1px solid rgba(100,120,160,0.25);border-radius:6px;padding:6px 10px;font-family:'IBM Plex Mono',monospace;font-size:10px;color:#d4d4d4;max-width:220px;">
        <div style="font-weight:600;color:${pt.color};margin-bottom:2px;">${e.eventType.replace(/_/g, " ")}</div>
        <div>${e.location}, ${e.country}</div>
        ${e.fatalities > 0 ? `<div style="color:#f43f5e;">KIA: ${e.fatalities}</div>` : ""}
        <div style="opacity:0.6;font-size:9px;">${e.date}</div>
      </div>`;
    }

    if (pt.type === "vessel") {
      return `<div style="background:rgba(0,10,30,0.92);border:1px solid rgba(100,120,160,0.25);border-radius:6px;padding:6px 10px;font-family:'IBM Plex Mono',monospace;font-size:10px;color:#d4d4d4;">
        <div style="font-weight:600;color:${pt.color};">${pt.name}</div>
        <div style="text-transform:uppercase;font-size:9px;opacity:0.7;">${pt.vesselType} | ${pt.flag}</div>
        <div>${pt.speed.toFixed(1)} kts | CRS ${Math.round(pt.course)}deg</div>
        ${pt.destination ? `<div style="opacity:0.6;">DEST: ${pt.destination}</div>` : ""}
      </div>`;
    }

    return "";
  }, []);

  // ── Click handlers ──

  const handlePointClick = useCallback(
    (d: object) => {
      const pt = d as PointData;
      if (pt.type === "actor") onActorClick(pt.id);
      if (pt.type === "osint") onOsintEventClick(pt.event);
    },
    [onActorClick, onOsintEventClick]
  );

  return (
    <div ref={containerRef} className="w-full h-full" style={{ background: "var(--color-navy-950)" }}>
      <Globe
        ref={globeRef}
        width={dimensions.width}
        height={dimensions.height}
        backgroundColor="rgba(0,0,8,1)"
        globeImageUrl="//unpkg.com/three-globe/example/img/earth-night.jpg"
        globeMaterial={earthMaterial}
        backgroundImageUrl="//unpkg.com/three-globe/example/img/night-sky.png"
        showAtmosphere={false}
        // Points
        pointsData={pointsData}
        pointLat="lat"
        pointLng="lng"
        pointColor={getPointColor}
        pointAltitude={getPointAltitude}
        pointRadius={getPointRadius}
        pointLabel={getPointLabel}
        pointsMerge={false}
        pointsTransitionDuration={300}
        onPointClick={handlePointClick}
        // Arcs (alliance/adversary links)
        arcsData={arcsData}
        arcStartLat="startLat"
        arcStartLng="startLng"
        arcEndLat="endLat"
        arcEndLng="endLng"
        arcColor="color"
        arcStroke={0.4}
        arcDashLength={0.4}
        arcDashGap={0.2}
        arcDashAnimateTime={4000}
        arcsTransitionDuration={300}
        arcAltitudeAutoScale={0.3}
        // Rings (conflict zones)
        ringsData={ringsData}
        ringLat="lat"
        ringLng="lng"
        ringColor="color"
        ringMaxRadius="maxR"
        ringPropagationSpeed={1}
        ringRepeatPeriod={1400}
        // Labels
        labelsData={labelsData}
        labelLat="lat"
        labelLng="lng"
        labelText="text"
        labelColor="color"
        labelSize="size"
        labelResolution={2}
        labelAltitude={0.01}
        labelIncludeDot={false}
        labelsTransitionDuration={300}
        // HTML Elements (aircraft SVG icons + satellite dots)
        htmlElementsData={htmlMarkersData}
        htmlLat="lat"
        htmlLng="lng"
        htmlAltitude="alt"
        htmlElement={createHtmlElement}
        htmlTransitionDuration={0}
      />
    </div>
  );
}
