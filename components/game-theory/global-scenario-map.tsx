"use client";

import "leaflet/dist/leaflet.css";

import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { MapContainer, GeoJSON, TileLayer, Tooltip } from "react-leaflet";
import type { GeoCountry } from "@/lib/game-theory/countries";
import * as topojson from "topojson-client";
import type { Topology, GeometryCollection } from "topojson-specification";
import type { FeatureCollection, Feature, Geometry } from "geojson";
import L from "leaflet";

interface GlobalScenarioMapProps {
  countries: GeoCountry[];
  teams: Record<string, "blue" | "red">;
  onCountryClick: (code: string) => void;
}

const TEAM_COLORS = {
  blue: { fill: "#06b6d4", stroke: "#0e7490", hover: "#22d3ee" },
  red: { fill: "#f43f5e", stroke: "#be123c", hover: "#fb7185" },
  neutral: { fill: "#1e293b", stroke: "#334155", hover: "#475569" },
} as const;

// ISO numeric → ISO alpha-2 mapping for the countries we care about
const NUMERIC_TO_ALPHA2: Record<string, string> = {
  "840": "US", "124": "CA", "484": "MX",
  "076": "BR", "032": "AR", "170": "CO", "862": "VE", "152": "CL",
  "826": "GB", "250": "FR", "276": "DE", "380": "IT", "724": "ES",
  "616": "PL", "528": "NL", "752": "SE", "578": "NO", "246": "FI",
  "642": "RO", "300": "GR",
  "804": "UA", "112": "BY", "268": "GE",
  "643": "RU", "398": "KZ", "860": "UZ",
  "792": "TR", "364": "IR", "368": "IQ", "760": "SY",
  "682": "SA", "784": "AE", "376": "IL", "400": "JO",
  "422": "LB", "887": "YE", "634": "QA", "414": "KW",
  "356": "IN", "586": "PK", "004": "AF", "050": "BD",
  "156": "CN", "392": "JP", "410": "KR", "408": "KP", "158": "TW",
  "496": "MN",
  "360": "ID", "608": "PH", "704": "VN", "764": "TH",
  "104": "MM", "458": "MY", "702": "SG",
  "818": "EG", "566": "NG", "710": "ZA", "231": "ET",
  "404": "KE", "706": "SO", "729": "SD", "434": "LY",
  "012": "DZ", "504": "MA",
  "036": "AU", "554": "NZ",
};

// Also try name-based matching
const NAME_TO_ALPHA2: Record<string, string> = {
  "United States of America": "US", "United States": "US",
  "Canada": "CA", "Mexico": "MX",
  "Brazil": "BR", "Argentina": "AR", "Colombia": "CO", "Venezuela": "VE", "Chile": "CL",
  "United Kingdom": "GB", "France": "FR", "Germany": "DE", "Italy": "IT", "Spain": "ES",
  "Poland": "PL", "Netherlands": "NL", "Sweden": "SE", "Norway": "NO", "Finland": "FI",
  "Romania": "RO", "Greece": "GR",
  "Ukraine": "UA", "Belarus": "BY", "Georgia": "GE",
  "Russia": "RU", "Kazakhstan": "KZ", "Uzbekistan": "UZ",
  "Turkey": "TR", "Iran": "IR", "Iraq": "IQ", "Syria": "SY",
  "Saudi Arabia": "SA", "United Arab Emirates": "AE", "Israel": "IL", "Jordan": "JO",
  "Lebanon": "LB", "Yemen": "YE", "Qatar": "QA", "Kuwait": "KW",
  "India": "IN", "Pakistan": "PK", "Afghanistan": "AF", "Bangladesh": "BD",
  "China": "CN", "Japan": "JP", "South Korea": "KR", "North Korea": "KP", "Taiwan": "TW",
  "Mongolia": "MN",
  "Indonesia": "ID", "Philippines": "PH", "Vietnam": "VN", "Thailand": "TH",
  "Myanmar": "MM", "Malaysia": "MY", "Singapore": "SG",
  "Egypt": "EG", "Nigeria": "NG", "South Africa": "ZA", "Ethiopia": "ET",
  "Kenya": "KE", "Somalia": "SO", "Sudan": "SD", "Libya": "LY",
  "Algeria": "DZ", "Morocco": "MA",
  "Australia": "AU", "New Zealand": "NZ",
  "Portugal": "PT", "Belgium": "BE", "Denmark": "DK", "Austria": "AT",
  "Czechia": "CZ", "Hungary": "HU", "Ireland": "IE", "Bulgaria": "BG",
  "Croatia": "HR", "Switzerland": "CH", "Serbia": "RS",
  "Iceland": "IS", "Slovenia": "SI", "Slovakia": "SK", "Lithuania": "LT",
  "Latvia": "LV", "Estonia": "EE", "Albania": "AL", "Montenegro": "ME",
  "Kosovo": "XK", "Moldova": "MD", "Cuba": "CU", "Peru": "PE",
  // Alternative / abbreviated names in world-atlas
  "Dem. Rep. Korea": "KP", "Rep. of Korea": "KR",
  "Türkiye": "TR", "Turkiye": "TR",
  "Dem. Rep. Congo": "CD",
};

/**
 * Fix antimeridian-crossing polygons (Russia, Fiji, etc.).
 * Leaflet can't handle coordinates that jump from +170 to -170, so we detect
 * rings where consecutive points span > 180 degrees of longitude and shift
 * the negative-longitude points past +180 to keep the polygon continuous.
 */
function fixAntimeridian(feature: Feature): Feature {
  const geom = feature.geometry;
  if (geom.type !== "Polygon" && geom.type !== "MultiPolygon") return feature;

  function fixRing(ring: number[][]): number[][] {
    let needsFix = false;
    for (let i = 1; i < ring.length; i++) {
      if (Math.abs(ring[i][0] - ring[i - 1][0]) > 180) {
        needsFix = true;
        break;
      }
    }
    if (!needsFix) return ring;
    return ring.map(([lng, lat]) => [lng < 0 ? lng + 360 : lng, lat]);
  }

  if (geom.type === "Polygon") {
    return {
      ...feature,
      geometry: { ...geom, coordinates: geom.coordinates.map(fixRing) },
    };
  }

  // MultiPolygon
  return {
    ...feature,
    geometry: {
      ...geom,
      coordinates: (geom as GeoJSON.MultiPolygon).coordinates.map(
        (polygon) => polygon.map(fixRing)
      ),
    },
  };
}

function resolveCountryCode(feature: Feature): string | null {
  const props = feature.properties || {};

  // Try name first (world-atlas only provides name)
  const name = props.name || props.NAME || props.ADMIN || props.admin;
  if (name && NAME_TO_ALPHA2[name]) return NAME_TO_ALPHA2[name];

  // Try ISO_A2 directly
  if (props.ISO_A2 && props.ISO_A2 !== "-99") return props.ISO_A2;

  // Try ISO numeric
  const numeric = props.ISO_N3 || props.iso_n3;
  if (numeric && NUMERIC_TO_ALPHA2[numeric]) return NUMERIC_TO_ALPHA2[numeric];

  // Try ISO_A3 to ISO_A2 fallback
  const a3 = props.ISO_A3 || props.iso_a3;
  if (a3) {
    const a3map: Record<string, string> = {
      USA: "US", CAN: "CA", MEX: "MX", BRA: "BR", ARG: "AR", COL: "CO", VEN: "VE", CHL: "CL",
      GBR: "GB", FRA: "FR", DEU: "DE", ITA: "IT", ESP: "ES", POL: "PL", NLD: "NL", SWE: "SE",
      NOR: "NO", FIN: "FI", ROU: "RO", GRC: "GR", UKR: "UA", BLR: "BY", GEO: "GE",
      RUS: "RU", KAZ: "KZ", UZB: "UZ", TUR: "TR", IRN: "IR", IRQ: "IQ", SYR: "SY",
      SAU: "SA", ARE: "AE", ISR: "IL", JOR: "JO", LBN: "LB", YEM: "YE", QAT: "QA", KWT: "KW",
      IND: "IN", PAK: "PK", AFG: "AF", BGD: "BD", CHN: "CN", JPN: "JP", KOR: "KR", PRK: "KP",
      TWN: "TW", MNG: "MN", IDN: "ID", PHL: "PH", VNM: "VN", THA: "TH", MMR: "MM", MYS: "MY",
      SGP: "SG", EGY: "EG", NGA: "NG", ZAF: "ZA", ETH: "ET", KEN: "KE", SOM: "SO", SDN: "SD",
      LBY: "LY", DZA: "DZ", MAR: "MA", AUS: "AU", NZL: "NZ",
      PRT: "PT", BEL: "BE", DNK: "DK", AUT: "AT", CZE: "CZ", HUN: "HU",
      IRL: "IE", BGR: "BG", HRV: "HR", CHE: "CH", SRB: "RS",
    };
    if (a3map[a3]) return a3map[a3];
  }

  return null;
}

export default function GlobalScenarioMap({
  countries,
  teams,
  onCountryClick,
}: GlobalScenarioMapProps) {
  const [geoData, setGeoData] = useState<FeatureCollection | null>(null);
  const geoJsonRef = useRef<L.GeoJSON | null>(null);
  const countryCodes = useMemo(() => new Set(countries.map(c => c.code)), [countries]);

  // Load world boundaries
  useEffect(() => {
    import("world-atlas/countries-50m.json").then((topoData) => {
      const topo = topoData.default as unknown as Topology<{ countries: GeometryCollection }>;
      const fc = topojson.feature(topo, topo.objects.countries) as FeatureCollection;
      // Fix antimeridian crossing for Russia (and similar) - prevents horizontal
      // lines spanning the map. Shift negative longitudes past 180 for polygons
      // that straddle the antimeridian.
      fc.features = fc.features.map((f) => fixAntimeridian(f));
      setGeoData(fc);
    });
  }, []);

  // Style function based on team assignment
  const getStyle = useCallback(
    (feature: Feature | undefined): L.PathOptions => {
      if (!feature) return {};
      const code = resolveCountryCode(feature);
      const isTracked = code && countryCodes.has(code);
      const team = code ? teams[code] : undefined;

      if (!isTracked) {
        return {
          fillColor: "#0f172a",
          fillOpacity: 0.15,
          color: "#1e293b",
          weight: 0.3,
          opacity: 0.3,
        };
      }

      const colors = team ? TEAM_COLORS[team] : TEAM_COLORS.neutral;
      return {
        fillColor: colors.fill,
        fillOpacity: team ? 0.35 : 0.12,
        color: colors.stroke,
        weight: team ? 1 : 0.5,
        opacity: team ? 0.7 : 0.4,
      };
    },
    [teams, countryCodes]
  );

  // Event handlers per feature
  const onEachFeature = useCallback(
    (feature: Feature, layer: L.Layer) => {
      const code = resolveCountryCode(feature);
      const isTracked = code && countryCodes.has(code);

      if (!isTracked) return;

      const country = countries.find(c => c.code === code);
      const team = code ? teams[code] : undefined;
      const teamLabel = team === "blue" ? "BLUE FORCE" : team === "red" ? "RED FORCE" : "UNALIGNED";
      const teamColor = team === "blue" ? "#06b6d4" : team === "red" ? "#f43f5e" : "#666";

      const tooltipContent = `
        <div style="font-family:'IBM Plex Mono',monospace;font-size:10px">
          <div style="font-weight:700;color:#e5e5e5;margin-bottom:2px">${country?.name || code}</div>
          <div style="font-size:9px;color:${teamColor};letter-spacing:0.08em">${teamLabel}</div>
          ${country?.actorId ? '<div style="font-size:8px;color:#555;margin-top:2px">Core actor</div>' : ""}
        </div>
      `;

      (layer as L.Path).bindTooltip(tooltipContent, {
        direction: "top",
        offset: [0, -8],
        className: "warroom-tooltip",
      });

      const pathLayer = layer as L.Path;

      pathLayer.on("mouseover", () => {
        const colors = team ? TEAM_COLORS[team] : TEAM_COLORS.neutral;
        pathLayer.setStyle({
          fillOpacity: team ? 0.6 : 0.25,
          color: colors.hover,
          weight: team ? 1.5 : 1,
        });
      });

      pathLayer.on("mouseout", () => {
        if (geoJsonRef.current) {
          geoJsonRef.current.resetStyle(pathLayer);
        }
      });

      pathLayer.on("click", () => {
        if (code) onCountryClick(code);
      });
    },
    [countries, teams, countryCodes, onCountryClick]
  );

  // Force re-render when teams change
  const geoKey = useMemo(() => JSON.stringify(teams), [teams]);

  if (!geoData) {
    return (
      <div className="h-full w-full bg-[#050505] flex items-center justify-center">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 border border-navy-600 border-t-navy-300 rounded-full animate-spin" />
          <span className="text-[10px] font-mono text-navy-600">Loading boundaries</span>
        </div>
      </div>
    );
  }

  return (
    <MapContainer
      center={[25, 30]}
      zoom={3}
      minZoom={2}
      maxZoom={7}
      className="h-full w-full"
      zoomControl={true}
      attributionControl={false}
      style={{ background: "#050505" }}
    >
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png"
        attribution='&copy; <a href="https://carto.com/">CARTO</a>'
      />

      <GeoJSON
        key={geoKey}
        ref={(ref) => { geoJsonRef.current = ref; }}
        data={geoData}
        style={getStyle}
        onEachFeature={onEachFeature}
      />
    </MapContainer>
  );
}
