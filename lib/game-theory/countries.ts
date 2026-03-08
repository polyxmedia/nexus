// ── Country data for Global Scenario Planner ──

export interface GeoCountry {
  code: string;
  name: string;
  lat: number;
  lng: number;
  actorId?: string;
  region: string;
  weight: number; // 1-3, marker sizing
}

export interface PowerProfile {
  military: number;
  nuclear: number;
  economic: number;
  energy: number;
  tech: number;
  intel: number;
  cyber: number;
  proxy: number;
  diplomatic: number;
}

export const COUNTRIES: GeoCountry[] = [
  // North America
  { code: "US", name: "United States", lat: 39.8, lng: -98.5, actorId: "us", region: "North America", weight: 3 },
  { code: "CA", name: "Canada", lat: 56.1, lng: -106.3, region: "North America", weight: 2 },
  { code: "MX", name: "Mexico", lat: 23.6, lng: -102.5, region: "North America", weight: 2 },
  // South America
  { code: "BR", name: "Brazil", lat: -14.2, lng: -51.9, region: "South America", weight: 2 },
  { code: "AR", name: "Argentina", lat: -38.4, lng: -63.6, region: "South America", weight: 1 },
  { code: "CO", name: "Colombia", lat: 4.6, lng: -74.3, region: "South America", weight: 1 },
  { code: "VE", name: "Venezuela", lat: 6.4, lng: -66.6, region: "South America", weight: 1 },
  { code: "CL", name: "Chile", lat: -35.7, lng: -71.5, region: "South America", weight: 1 },
  // Europe
  { code: "GB", name: "United Kingdom", lat: 55.4, lng: -3.4, region: "Europe", weight: 2 },
  { code: "FR", name: "France", lat: 46.2, lng: 2.2, actorId: "eu", region: "Europe", weight: 3 },
  { code: "DE", name: "Germany", lat: 51.2, lng: 10.5, actorId: "eu", region: "Europe", weight: 3 },
  { code: "IT", name: "Italy", lat: 41.9, lng: 12.6, actorId: "eu", region: "Europe", weight: 2 },
  { code: "ES", name: "Spain", lat: 40.5, lng: -3.7, actorId: "eu", region: "Europe", weight: 2 },
  { code: "PL", name: "Poland", lat: 51.9, lng: 19.1, actorId: "eu", region: "Europe", weight: 2 },
  { code: "NL", name: "Netherlands", lat: 52.1, lng: 5.3, actorId: "eu", region: "Europe", weight: 1 },
  { code: "SE", name: "Sweden", lat: 60.1, lng: 18.6, region: "Europe", weight: 1 },
  { code: "NO", name: "Norway", lat: 60.5, lng: 8.5, region: "Europe", weight: 1 },
  { code: "FI", name: "Finland", lat: 61.9, lng: 25.7, region: "Europe", weight: 1 },
  { code: "PT", name: "Portugal", lat: 39.4, lng: -8.2, actorId: "eu", region: "Europe", weight: 1 },
  { code: "RO", name: "Romania", lat: 45.9, lng: 25.0, actorId: "eu", region: "Europe", weight: 1 },
  { code: "GR", name: "Greece", lat: 39.1, lng: 21.8, actorId: "eu", region: "Europe", weight: 1 },
  { code: "BE", name: "Belgium", lat: 50.5, lng: 4.5, actorId: "eu", region: "Europe", weight: 1 },
  { code: "DK", name: "Denmark", lat: 56.3, lng: 9.5, region: "Europe", weight: 1 },
  { code: "AT", name: "Austria", lat: 47.5, lng: 14.6, actorId: "eu", region: "Europe", weight: 1 },
  { code: "CZ", name: "Czechia", lat: 49.8, lng: 15.5, actorId: "eu", region: "Europe", weight: 1 },
  { code: "HU", name: "Hungary", lat: 47.2, lng: 19.5, actorId: "eu", region: "Europe", weight: 1 },
  { code: "IE", name: "Ireland", lat: 53.1, lng: -7.7, actorId: "eu", region: "Europe", weight: 1 },
  { code: "BG", name: "Bulgaria", lat: 42.7, lng: 25.5, actorId: "eu", region: "Europe", weight: 1 },
  { code: "HR", name: "Croatia", lat: 45.1, lng: 15.2, actorId: "eu", region: "Europe", weight: 1 },
  { code: "CH", name: "Switzerland", lat: 46.8, lng: 8.2, region: "Europe", weight: 1 },
  { code: "RS", name: "Serbia", lat: 44.0, lng: 21.0, region: "Europe", weight: 1 },
  // Eastern Europe
  { code: "UA", name: "Ukraine", lat: 48.4, lng: 31.2, region: "Eastern Europe", weight: 2 },
  { code: "BY", name: "Belarus", lat: 53.7, lng: 27.9, region: "Eastern Europe", weight: 1 },
  { code: "GE", name: "Georgia", lat: 42.3, lng: 43.4, region: "Eastern Europe", weight: 1 },
  // Russia & Central Asia
  { code: "RU", name: "Russia", lat: 61.5, lng: 105.3, actorId: "russia", region: "Russia & Central Asia", weight: 3 },
  { code: "KZ", name: "Kazakhstan", lat: 48.0, lng: 68.0, region: "Central Asia", weight: 1 },
  { code: "UZ", name: "Uzbekistan", lat: 41.4, lng: 64.6, region: "Central Asia", weight: 1 },
  // Middle East
  { code: "TR", name: "Turkey", lat: 38.9, lng: 35.2, region: "Middle East", weight: 2 },
  { code: "IR", name: "Iran", lat: 32.4, lng: 53.7, actorId: "iran", region: "Middle East", weight: 3 },
  { code: "IQ", name: "Iraq", lat: 33.2, lng: 43.7, region: "Middle East", weight: 1 },
  { code: "SY", name: "Syria", lat: 34.8, lng: 39.0, region: "Middle East", weight: 1 },
  { code: "SA", name: "Saudi Arabia", lat: 23.9, lng: 45.1, actorId: "saudi", region: "Middle East", weight: 3 },
  { code: "AE", name: "UAE", lat: 23.4, lng: 53.8, region: "Middle East", weight: 2 },
  { code: "IL", name: "Israel", lat: 31.0, lng: 34.9, actorId: "israel", region: "Middle East", weight: 2 },
  { code: "JO", name: "Jordan", lat: 30.6, lng: 36.2, region: "Middle East", weight: 1 },
  { code: "LB", name: "Lebanon", lat: 33.9, lng: 35.9, region: "Middle East", weight: 1 },
  { code: "YE", name: "Yemen", lat: 15.6, lng: 48.5, region: "Middle East", weight: 1 },
  { code: "QA", name: "Qatar", lat: 25.4, lng: 51.2, region: "Middle East", weight: 1 },
  { code: "KW", name: "Kuwait", lat: 29.3, lng: 47.5, region: "Middle East", weight: 1 },
  // South Asia
  { code: "IN", name: "India", lat: 20.6, lng: 79.0, region: "South Asia", weight: 3 },
  { code: "PK", name: "Pakistan", lat: 30.4, lng: 69.3, region: "South Asia", weight: 2 },
  { code: "AF", name: "Afghanistan", lat: 33.9, lng: 67.7, region: "South Asia", weight: 1 },
  { code: "BD", name: "Bangladesh", lat: 23.7, lng: 90.4, region: "South Asia", weight: 1 },
  // East Asia
  { code: "CN", name: "China", lat: 35.9, lng: 104.2, actorId: "china", region: "East Asia", weight: 3 },
  { code: "JP", name: "Japan", lat: 36.2, lng: 138.3, region: "East Asia", weight: 3 },
  { code: "KR", name: "South Korea", lat: 35.9, lng: 127.8, region: "East Asia", weight: 2 },
  { code: "KP", name: "North Korea", lat: 40.3, lng: 127.5, actorId: "dprk", region: "East Asia", weight: 2 },
  { code: "TW", name: "Taiwan", lat: 23.7, lng: 121.0, region: "East Asia", weight: 2 },
  { code: "MN", name: "Mongolia", lat: 46.9, lng: 103.8, region: "East Asia", weight: 1 },
  // Southeast Asia
  { code: "ID", name: "Indonesia", lat: -0.8, lng: 113.9, region: "Southeast Asia", weight: 2 },
  { code: "PH", name: "Philippines", lat: 12.9, lng: 121.8, region: "Southeast Asia", weight: 1 },
  { code: "VN", name: "Vietnam", lat: 14.1, lng: 108.3, region: "Southeast Asia", weight: 1 },
  { code: "TH", name: "Thailand", lat: 15.9, lng: 100.9, region: "Southeast Asia", weight: 1 },
  { code: "MM", name: "Myanmar", lat: 21.9, lng: 96.0, region: "Southeast Asia", weight: 1 },
  { code: "MY", name: "Malaysia", lat: 4.2, lng: 101.9, region: "Southeast Asia", weight: 1 },
  { code: "SG", name: "Singapore", lat: 1.4, lng: 103.8, region: "Southeast Asia", weight: 1 },
  // Africa
  { code: "EG", name: "Egypt", lat: 26.8, lng: 30.8, region: "Africa", weight: 2 },
  { code: "NG", name: "Nigeria", lat: 9.1, lng: 8.7, region: "Africa", weight: 2 },
  { code: "ZA", name: "South Africa", lat: -30.6, lng: 22.9, region: "Africa", weight: 2 },
  { code: "ET", name: "Ethiopia", lat: 9.1, lng: 40.5, region: "Africa", weight: 1 },
  { code: "KE", name: "Kenya", lat: -0.0, lng: 37.9, region: "Africa", weight: 1 },
  { code: "SO", name: "Somalia", lat: 5.2, lng: 46.2, region: "Africa", weight: 1 },
  { code: "SD", name: "Sudan", lat: 12.9, lng: 30.2, region: "Africa", weight: 1 },
  { code: "LY", name: "Libya", lat: 26.3, lng: 17.2, region: "Africa", weight: 1 },
  { code: "DZ", name: "Algeria", lat: 28.0, lng: 1.7, region: "Africa", weight: 1 },
  { code: "MA", name: "Morocco", lat: 31.8, lng: -7.1, region: "Africa", weight: 1 },
  // Oceania
  { code: "AU", name: "Australia", lat: -25.3, lng: 133.8, region: "Oceania", weight: 2 },
  { code: "NZ", name: "New Zealand", lat: -40.9, lng: 174.9, region: "Oceania", weight: 1 },
];

// ── Capability scores (0-100) ──

const CAPABILITY_SCORES: Record<string, PowerProfile> = {
  // Full actor profiles
  us:     { military: 95, nuclear: 95, economic: 90, energy: 70, tech: 90, intel: 95, cyber: 90, proxy: 60, diplomatic: 85 },
  china:  { military: 75, nuclear: 60, economic: 85, energy: 30, tech: 80, intel: 70, cyber: 85, proxy: 30, diplomatic: 60 },
  russia: { military: 65, nuclear: 95, economic: 30, energy: 80, tech: 40, intel: 70, cyber: 75, proxy: 60, diplomatic: 40 },
  iran:   { military: 30, nuclear: 20, economic: 15, energy: 60, tech: 20, intel: 40, cyber: 40, proxy: 85, diplomatic: 25 },
  israel: { military: 60, nuclear: 40, economic: 25, energy: 10, tech: 70, intel: 90, cyber: 80, proxy: 20, diplomatic: 35 },
  saudi:  { military: 35, nuclear: 0,  economic: 45, energy: 90, tech: 25, intel: 35, cyber: 20, proxy: 30, diplomatic: 40 },
  eu:     { military: 50, nuclear: 30, economic: 80, energy: 20, tech: 65, intel: 60, cyber: 55, proxy: 15, diplomatic: 75 },
  dprk:   { military: 25, nuclear: 30, economic: 5,  energy: 5,  tech: 15, intel: 20, cyber: 45, proxy: 10, diplomatic: 5 },
  // Non-actor country contributions
  GB: { military: 30, nuclear: 20, economic: 30, energy: 15, tech: 25, intel: 35, cyber: 30, proxy: 15, diplomatic: 30 },
  JP: { military: 20, nuclear: 0,  economic: 40, energy: 5,  tech: 40, intel: 20, cyber: 25, proxy: 0,  diplomatic: 25 },
  KR: { military: 20, nuclear: 0,  economic: 25, energy: 5,  tech: 35, intel: 15, cyber: 20, proxy: 0,  diplomatic: 15 },
  IN: { military: 40, nuclear: 25, economic: 30, energy: 10, tech: 25, intel: 25, cyber: 20, proxy: 15, diplomatic: 30 },
  AU: { military: 15, nuclear: 0,  economic: 15, energy: 20, tech: 15, intel: 20, cyber: 15, proxy: 0,  diplomatic: 15 },
  TR: { military: 30, nuclear: 0,  economic: 15, energy: 5,  tech: 10, intel: 20, cyber: 10, proxy: 20, diplomatic: 20 },
  PK: { military: 25, nuclear: 25, economic: 10, energy: 5,  tech: 10, intel: 15, cyber: 10, proxy: 20, diplomatic: 10 },
  TW: { military: 15, nuclear: 0,  economic: 20, energy: 5,  tech: 40, intel: 15, cyber: 20, proxy: 0,  diplomatic: 10 },
  BR: { military: 15, nuclear: 0,  economic: 20, energy: 15, tech: 10, intel: 10, cyber: 10, proxy: 5,  diplomatic: 15 },
  EG: { military: 20, nuclear: 0,  economic: 10, energy: 10, tech: 5,  intel: 15, cyber: 5,  proxy: 10, diplomatic: 15 },
  UA: { military: 25, nuclear: 0,  economic: 5,  energy: 5,  tech: 10, intel: 15, cyber: 15, proxy: 10, diplomatic: 10 },
  CA: { military: 10, nuclear: 0,  economic: 20, energy: 25, tech: 15, intel: 15, cyber: 10, proxy: 0,  diplomatic: 20 },
  AE: { military: 15, nuclear: 0,  economic: 20, energy: 30, tech: 10, intel: 15, cyber: 10, proxy: 5,  diplomatic: 15 },
  ID: { military: 10, nuclear: 0,  economic: 15, energy: 10, tech: 5,  intel: 10, cyber: 5,  proxy: 5,  diplomatic: 10 },
  NG: { military: 10, nuclear: 0,  economic: 10, energy: 20, tech: 5,  intel: 5,  cyber: 5,  proxy: 5,  diplomatic: 10 },
  ZA: { military: 10, nuclear: 0,  economic: 10, energy: 10, tech: 5,  intel: 10, cyber: 5,  proxy: 5,  diplomatic: 10 },
};

const DEFAULT_CAPABILITY: PowerProfile = {
  military: 5, nuclear: 0, economic: 5, energy: 5, tech: 5, intel: 5, cyber: 5, proxy: 5, diplomatic: 5,
};

const POWER_DIMENSIONS: (keyof PowerProfile)[] = [
  "military", "nuclear", "economic", "energy", "tech", "intel", "cyber", "proxy", "diplomatic",
];

export function getCountryCapability(code: string): PowerProfile {
  const country = COUNTRIES.find(c => c.code === code);
  if (country?.actorId && CAPABILITY_SCORES[country.actorId]) {
    return CAPABILITY_SCORES[country.actorId];
  }
  return CAPABILITY_SCORES[code] || DEFAULT_CAPABILITY;
}

export function computeTeamPower(countryCodes: string[]): PowerProfile {
  if (countryCodes.length === 0) {
    return { ...DEFAULT_CAPABILITY };
  }

  const profiles = countryCodes.map(c => getCountryCapability(c));
  const result = { ...DEFAULT_CAPABILITY };

  for (const dim of POWER_DIMENSIONS) {
    const scores = profiles.map(p => p[dim]).sort((a, b) => b - a);
    let total = 0;
    for (let i = 0; i < scores.length; i++) {
      // Diminishing returns: 100%, 40%, 25%, 18%...
      total += scores[i] * (1 / (1 + i * 1.5));
    }
    result[dim] = Math.min(100, Math.round(total));
  }

  return result;
}

export function computePowerBalance(blue: PowerProfile, red: PowerProfile): {
  blueAdvantages: string[];
  redAdvantages: string[];
  contested: string[];
  overallBalance: number; // -1 (red dominant) to 1 (blue dominant)
} {
  const blueAdvantages: string[] = [];
  const redAdvantages: string[] = [];
  const contested: string[] = [];
  let blueTotal = 0;
  let redTotal = 0;

  for (const dim of POWER_DIMENSIONS) {
    const diff = blue[dim] - red[dim];
    if (diff > 15) blueAdvantages.push(dim);
    else if (diff < -15) redAdvantages.push(dim);
    else contested.push(dim);
    blueTotal += blue[dim];
    redTotal += red[dim];
  }

  const total = blueTotal + redTotal;
  const overallBalance = total > 0 ? (blueTotal - redTotal) / total : 0;

  return { blueAdvantages, redAdvantages, contested, overallBalance };
}
