"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Major city coordinates for geocoding analytics data
// This is a lightweight client-side lookup, covers the most common cities
const CITY_COORDS: Record<string, [number, number]> = {
  // UK
  "london": [51.5074, -0.1278],
  "manchester": [53.4808, -2.2426],
  "birmingham": [52.4862, -1.8904],
  "leeds": [53.8008, -1.5491],
  "glasgow": [55.8642, -4.2518],
  "edinburgh": [55.9533, -3.1883],
  "liverpool": [53.4084, -2.9916],
  "bristol": [51.4545, -2.5879],
  "cardiff": [51.4816, -3.1791],
  "belfast": [54.5973, -5.9301],
  "newcastle": [54.9783, -1.6178],
  "sheffield": [53.3811, -1.4701],
  "nottingham": [52.9548, -1.1581],
  "southampton": [50.9097, -1.4044],
  "cambridge": [52.2053, 0.1218],
  "oxford": [51.7520, -1.2577],
  "brighton": [50.8225, -0.1372],
  "reading": [51.4543, -0.9781],
  "coventry": [52.4068, -1.5197],
  "leicester": [52.6369, -1.1398],
  "aberdeen": [57.1497, -2.0943],
  "bath": [51.3811, -2.3590],
  "york": [53.9591, -1.0815],
  "swansea": [51.6214, -3.9436],
  "exeter": [50.7184, -3.5339],
  "dundee": [56.4620, -2.9707],
  "portsmouth": [50.8198, -1.0880],
  "plymouth": [50.3755, -4.1427],
  "norwich": [52.6309, 1.2974],
  "stoke-on-trent": [53.0027, -2.1794],
  "wolverhampton": [52.5862, -2.1289],
  "derby": [52.9225, -1.4746],
  "hull": [53.7676, -0.3274],
  "sunderland": [54.9069, -1.3838],

  // US
  "new york": [40.7128, -74.0060],
  "los angeles": [34.0522, -118.2437],
  "chicago": [41.8781, -87.6298],
  "houston": [29.7604, -95.3698],
  "phoenix": [33.4484, -112.0740],
  "san francisco": [37.7749, -122.4194],
  "seattle": [47.6062, -122.3321],
  "miami": [25.7617, -80.1918],
  "boston": [42.3601, -71.0589],
  "washington": [38.9072, -77.0369],
  "dallas": [32.7767, -96.7970],
  "atlanta": [33.7490, -84.3880],
  "denver": [39.7392, -104.9903],
  "san diego": [32.7157, -117.1611],
  "austin": [30.2672, -97.7431],
  "portland": [45.5152, -122.6784],
  "las vegas": [36.1699, -115.1398],
  "nashville": [36.1627, -86.7816],
  "charlotte": [35.2271, -80.8431],
  "san antonio": [29.4241, -98.4936],
  "columbus": [39.9612, -82.9988],
  "indianapolis": [39.7684, -86.1581],
  "jacksonville": [30.3322, -81.6557],
  "san jose": [37.3382, -121.8863],
  "philadelphia": [39.9526, -75.1652],
  "detroit": [42.3314, -83.0458],
  "memphis": [35.1495, -90.0490],
  "baltimore": [39.2904, -76.6122],
  "milwaukee": [43.0389, -87.9065],
  "minneapolis": [44.9778, -93.2650],
  "pittsburgh": [40.4406, -79.9959],
  "raleigh": [35.7796, -78.6382],
  "salt lake city": [40.7608, -111.8910],
  "tampa": [27.9506, -82.4572],

  // Europe
  "paris": [48.8566, 2.3522],
  "berlin": [52.5200, 13.4050],
  "madrid": [40.4168, -3.7038],
  "rome": [41.9028, 12.4964],
  "amsterdam": [52.3676, 4.9041],
  "brussels": [50.8503, 4.3517],
  "vienna": [48.2082, 16.3738],
  "zurich": [47.3769, 8.5417],
  "stockholm": [59.3293, 18.0686],
  "oslo": [59.9139, 10.7522],
  "copenhagen": [55.6761, 12.5683],
  "helsinki": [60.1699, 24.9384],
  "dublin": [53.3498, -6.2603],
  "lisbon": [38.7223, -9.1393],
  "prague": [50.0755, 14.4378],
  "warsaw": [52.2297, 21.0122],
  "budapest": [47.4979, 19.0402],
  "bucharest": [44.4268, 26.1025],
  "milan": [45.4642, 9.1900],
  "barcelona": [41.3874, 2.1686],
  "munich": [48.1351, 11.5820],
  "frankfurt": [50.1109, 8.6821],
  "hamburg": [53.5511, 9.9937],
  "lyon": [45.7640, 4.8357],
  "marseille": [43.2965, 5.3698],
  "geneva": [46.2044, 6.1432],
  "athens": [37.9838, 23.7275],
  "istanbul": [41.0082, 28.9784],

  // Asia Pacific
  "tokyo": [35.6762, 139.6503],
  "singapore": [1.3521, 103.8198],
  "hong kong": [22.3193, 114.1694],
  "sydney": [33.8688, 151.2093],
  "melbourne": [-37.8136, 144.9631],
  "mumbai": [19.0760, 72.8777],
  "delhi": [28.7041, 77.1025],
  "bangalore": [12.9716, 77.5946],
  "shanghai": [31.2304, 121.4737],
  "beijing": [39.9042, 116.4074],
  "seoul": [37.5665, 126.9780],
  "taipei": [25.0330, 121.5654],
  "bangkok": [13.7563, 100.5018],
  "jakarta": [-6.2088, 106.8456],
  "kuala lumpur": [3.1390, 101.6869],
  "dubai": [25.2048, 55.2708],
  "tel aviv": [32.0853, 34.7818],
  "auckland": [-36.8485, 174.7633],
  "perth": [-31.9505, 115.8605],
  "brisbane": [-27.4698, 153.0251],
  "riyadh": [24.7136, 46.6753],
  "doha": [25.2854, 51.5310],

  // Americas
  "toronto": [43.6532, -79.3832],
  "vancouver": [49.2827, -123.1207],
  "montreal": [45.5017, -73.5673],
  "mexico city": [19.4326, -99.1332],
  "sao paulo": [-23.5505, -46.6333],
  "buenos aires": [-34.6037, -58.3816],
  "bogota": [4.7110, -74.0721],
  "lima": [-12.0464, -77.0428],
  "santiago": [-33.4489, -70.6693],

  // Africa
  "cairo": [30.0444, 31.2357],
  "lagos": [6.5244, 3.3792],
  "nairobi": [-1.2921, 36.8219],
  "cape town": [-33.9249, 18.4241],
  "johannesburg": [-26.2041, 28.0473],
  "casablanca": [33.5731, -7.5898],
  "accra": [5.6037, -0.1870],
};

// Country center coordinates as fallback
const COUNTRY_COORDS: Record<string, [number, number]> = {
  "GB": [54.0, -2.0], "US": [39.8, -98.6], "CA": [56.1, -106.3],
  "DE": [51.2, 10.4], "FR": [46.2, 2.2], "ES": [40.5, -3.7],
  "IT": [41.9, 12.6], "NL": [52.1, 5.3], "BE": [50.5, 4.5],
  "CH": [46.8, 8.2], "AT": [47.5, 14.6], "SE": [60.1, 18.6],
  "NO": [60.5, 8.5], "DK": [56.3, 9.5], "FI": [61.9, 25.7],
  "IE": [53.1, -8.0], "PT": [39.4, -8.2], "PL": [51.9, 19.1],
  "CZ": [49.8, 15.5], "RO": [45.9, 25.0], "HU": [47.2, 19.5],
  "GR": [39.1, 21.8], "TR": [39.0, 35.2], "RU": [61.5, 105.3],
  "UA": [48.4, 31.2], "JP": [36.2, 138.3], "CN": [35.9, 104.2],
  "KR": [35.9, 127.8], "IN": [20.6, 79.0], "AU": [-25.3, 133.8],
  "NZ": [-40.9, 174.9], "SG": [1.4, 103.8], "HK": [22.3, 114.2],
  "TW": [23.7, 121.0], "TH": [15.9, 100.9], "MY": [4.2, 101.9],
  "ID": [-0.8, 113.9], "PH": [12.9, 121.8], "VN": [14.1, 108.3],
  "AE": [23.4, 53.8], "SA": [23.9, 45.1], "IL": [31.0, 34.9],
  "EG": [26.8, 30.8], "ZA": [-30.6, 22.9], "NG": [9.1, 8.7],
  "KE": [-0.0, 37.9], "BR": [-14.2, -51.9], "MX": [23.6, -102.6],
  "AR": [-38.4, -63.6], "CO": [4.6, -74.3], "CL": [-35.7, -71.5],
  "PE": [-9.2, -75.0], "QA": [25.4, 51.2],
};

interface TrafficMapProps {
  cities: { city: string | null; country: string | null; count: number }[];
  countries: { country: string | null; count: number; uniqueVisitors: number }[];
}

function getCityCoords(city: string | null, country: string | null): [number, number] | null {
  if (city) {
    const key = city.toLowerCase().trim();
    if (CITY_COORDS[key]) return CITY_COORDS[key];
  }
  if (country && COUNTRY_COORDS[country]) {
    // Add slight jitter so multiple unknown cities in same country don't stack
    const base = COUNTRY_COORDS[country];
    const jitter = () => (Math.random() - 0.5) * 4;
    return [base[0] + jitter(), base[1] + jitter()];
  }
  return null;
}

export default function TrafficMap({ cities, countries }: TrafficMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    const map = L.map(mapRef.current, {
      center: [30, 0],
      zoom: 2,
      zoomControl: false,
      attributionControl: false,
      minZoom: 2,
      maxZoom: 8,
    });

    L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
      subdomains: "abcd",
    }).addTo(map);

    L.control.zoom({ position: "bottomright" }).addTo(map);

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Update markers when data changes
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // Clear existing layers (except tile layer)
    map.eachLayer((layer) => {
      if (!(layer instanceof L.TileLayer)) {
        map.removeLayer(layer);
      }
    });

    const maxCount = Math.max(...cities.map((c) => c.count), 1);
    const markers: L.CircleMarker[] = [];

    // Plot cities
    for (const city of cities) {
      const coords = getCityCoords(city.city, city.country);
      if (!coords) continue;

      const intensity = city.count / maxCount;
      const radius = Math.max(4, Math.min(20, 4 + intensity * 16));

      const marker = L.circleMarker(coords, {
        radius,
        fillColor: "#06b6d4",
        fillOpacity: 0.15 + intensity * 0.5,
        color: "#06b6d4",
        weight: 1,
        opacity: 0.3 + intensity * 0.5,
      }).addTo(map);

      // Pulse effect for high-traffic cities
      if (intensity > 0.3) {
        L.circleMarker(coords, {
          radius: radius + 6,
          fillColor: "#06b6d4",
          fillOpacity: 0.05,
          color: "#06b6d4",
          weight: 0.5,
          opacity: 0.15,
        }).addTo(map);
      }

      marker.bindTooltip(
        `<div style="font-family:'IBM Plex Mono',monospace;font-size:10px;letter-spacing:0.05em;">` +
        `<div style="color:#06b6d4;text-transform:uppercase;font-size:8px;letter-spacing:0.15em;margin-bottom:2px;">${city.city || "Unknown"}</div>` +
        `<div style="color:#e0e0e0;">${city.count} visits</div>` +
        `<div style="color:#6b7280;font-size:9px;">${city.country || ""}</div>` +
        `</div>`,
        {
          className: "nexus-tooltip-map",
          direction: "top",
          offset: [0, -radius],
        }
      );

      markers.push(marker);
    }

    // Also plot countries that don't have city-level data
    const citiedCountries = new Set(cities.map((c) => c.country).filter(Boolean));
    for (const country of countries) {
      if (!country.country || citiedCountries.has(country.country)) continue;
      const coords = COUNTRY_COORDS[country.country];
      if (!coords) continue;

      const intensity = country.count / maxCount;
      const radius = Math.max(4, Math.min(16, 4 + intensity * 12));

      const marker = L.circleMarker(coords, {
        radius,
        fillColor: "#f59e0b",
        fillOpacity: 0.15 + intensity * 0.4,
        color: "#f59e0b",
        weight: 1,
        opacity: 0.3 + intensity * 0.4,
      }).addTo(map);

      marker.bindTooltip(
        `<div style="font-family:'IBM Plex Mono',monospace;font-size:10px;">` +
        `<div style="color:#f59e0b;text-transform:uppercase;font-size:8px;letter-spacing:0.15em;margin-bottom:2px;">${country.country}</div>` +
        `<div style="color:#e0e0e0;">${country.count} visits</div>` +
        `</div>`,
        {
          className: "nexus-tooltip-map",
          direction: "top",
          offset: [0, -radius],
        }
      );

      markers.push(marker);
    }

    // Fit bounds if we have markers
    if (markers.length > 0) {
      const group = L.featureGroup(markers);
      map.fitBounds(group.getBounds().pad(0.3), { maxZoom: 5 });
    }
  }, [cities, countries]);

  return (
    <div className="relative w-full h-full rounded-lg overflow-hidden">
      <div ref={mapRef} className="w-full h-full" />
      <style jsx global>{`
        .nexus-tooltip-map {
          background: #0a0a0a !important;
          border: 1px solid #2a2a2a !important;
          border-radius: 4px !important;
          padding: 6px 8px !important;
          box-shadow: 0 4px 12px rgba(0,0,0,0.5) !important;
        }
        .nexus-tooltip-map::before {
          border-top-color: #2a2a2a !important;
        }
        .leaflet-tooltip-top::before {
          border-top-color: #2a2a2a !important;
        }
      `}</style>
    </div>
  );
}
