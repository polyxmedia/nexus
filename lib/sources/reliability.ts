// Source Reliability Scoring - NATO/Admiralty Rating System
// Rates intelligence sources on two axes:
// - Source Reliability: A (completely reliable) through F (cannot be judged)
// - Information Accuracy: 1 (confirmed) through 6 (truth cannot be determined)

export type SourceReliability = "A" | "B" | "C" | "D" | "E" | "F";
export type InformationAccuracy = 1 | 2 | 3 | 4 | 5 | 6;
export type SourceCategory = "wire" | "broadsheet" | "tabloid" | "state" | "independent" | "think-tank" | "government" | "military" | "academic" | "social" | "blog" | "data-provider";
export type BiasDirection = "left" | "center-left" | "center" | "center-right" | "right" | "state-aligned" | "unknown";

export interface SourceProfile {
  domain: string;
  name: string;
  reliability: SourceReliability;
  category: SourceCategory;
  region: string;
  biasDirection: BiasDirection;
  specialties: string[];
  stateAffiliated: boolean;
  trackRecord: number; // 0-1
  notes: string;
}

// A - Completely Reliable
const A_SOURCES: SourceProfile[] = [
  { domain: "reuters.com", name: "Reuters", reliability: "A", category: "wire", region: "global", biasDirection: "center", specialties: ["markets", "geopolitics", "energy"], stateAffiliated: false, trackRecord: 0.95, notes: "Gold standard wire service. Minimal editorial bias." },
  { domain: "apnews.com", name: "Associated Press", reliability: "A", category: "wire", region: "global", biasDirection: "center", specialties: ["breaking-news", "politics"], stateAffiliated: false, trackRecord: 0.95, notes: "Cooperative wire service. Fact-focused reporting." },
  { domain: "bloomberg.com", name: "Bloomberg", reliability: "A", category: "broadsheet", region: "global", biasDirection: "center", specialties: ["markets", "finance", "energy", "technology"], stateAffiliated: false, trackRecord: 0.93, notes: "Premier financial data and news. Terminal-grade intelligence." },
  { domain: "ft.com", name: "Financial Times", reliability: "A", category: "broadsheet", region: "global", biasDirection: "center", specialties: ["finance", "geopolitics", "trade", "europe"], stateAffiliated: false, trackRecord: 0.93, notes: "Gold standard for international business and finance." },
  { domain: "wsj.com", name: "Wall Street Journal", reliability: "A", category: "broadsheet", region: "us", biasDirection: "center-right", specialties: ["markets", "business", "policy"], stateAffiliated: false, trackRecord: 0.92, notes: "News section is A-grade. Opinion section leans right." },
  { domain: "economist.com", name: "The Economist", reliability: "A", category: "broadsheet", region: "global", biasDirection: "center", specialties: ["geopolitics", "economics", "analysis"], stateAffiliated: false, trackRecord: 0.92, notes: "Deep analytical coverage. Classical liberal editorial line." },
  { domain: "bbc.com", name: "BBC News", reliability: "A", category: "broadsheet", region: "global", biasDirection: "center", specialties: ["world-affairs", "uk", "africa"], stateAffiliated: false, trackRecord: 0.91, notes: "Public broadcaster. Comprehensive global coverage." },
  { domain: "bbc.co.uk", name: "BBC News", reliability: "A", category: "broadsheet", region: "global", biasDirection: "center", specialties: ["world-affairs", "uk", "africa"], stateAffiliated: false, trackRecord: 0.91, notes: "Public broadcaster. Comprehensive global coverage." },
  { domain: "afp.com", name: "AFP", reliability: "A", category: "wire", region: "global", biasDirection: "center", specialties: ["breaking-news", "europe", "africa"], stateAffiliated: false, trackRecord: 0.93, notes: "French wire service. Strong in Francophone Africa and Europe." },
  { domain: "npr.org", name: "NPR", reliability: "A", category: "broadsheet", region: "us", biasDirection: "center-left", specialties: ["politics", "culture", "science"], stateAffiliated: false, trackRecord: 0.90, notes: "US public radio. Thorough reporting." },
];

// B - Usually Reliable
const B_SOURCES: SourceProfile[] = [
  { domain: "nytimes.com", name: "New York Times", reliability: "B", category: "broadsheet", region: "us", biasDirection: "center-left", specialties: ["politics", "investigations", "foreign-affairs"], stateAffiliated: false, trackRecord: 0.88, notes: "Paper of record. Strong investigations. Editorial leans left." },
  { domain: "washingtonpost.com", name: "Washington Post", reliability: "B", category: "broadsheet", region: "us", biasDirection: "center-left", specialties: ["politics", "national-security", "tech"], stateAffiliated: false, trackRecord: 0.87, notes: "Strong on DC/national security. Editorial board leans left." },
  { domain: "theguardian.com", name: "The Guardian", reliability: "B", category: "broadsheet", region: "uk", biasDirection: "center-left", specialties: ["uk", "environment", "investigations"], stateAffiliated: false, trackRecord: 0.86, notes: "Quality investigative work. Progressive editorial stance." },
  { domain: "spiegel.de", name: "Der Spiegel", reliability: "B", category: "broadsheet", region: "europe", biasDirection: "center-left", specialties: ["europe", "investigations", "germany"], stateAffiliated: false, trackRecord: 0.85, notes: "Germany's premier investigative magazine." },
  { domain: "scmp.com", name: "South China Morning Post", reliability: "B", category: "broadsheet", region: "asia", biasDirection: "center", specialties: ["china", "asia", "trade"], stateAffiliated: false, trackRecord: 0.83, notes: "Best English-language China coverage. Alibaba-owned, but editorially independent." },
  { domain: "aljazeera.com", name: "Al Jazeera English", reliability: "B", category: "broadsheet", region: "middle-east", biasDirection: "center", specialties: ["middle-east", "africa", "conflict"], stateAffiliated: true, trackRecord: 0.82, notes: "Qatar-funded. Strong MENA coverage. Be aware of Qatar geopolitical interests." },
  { domain: "rand.org", name: "RAND Corporation", reliability: "B", category: "think-tank", region: "us", biasDirection: "center", specialties: ["defense", "policy", "analysis"], stateAffiliated: false, trackRecord: 0.90, notes: "Premier defense research. Rigorous methodology." },
  { domain: "brookings.edu", name: "Brookings Institution", reliability: "B", category: "think-tank", region: "us", biasDirection: "center-left", specialties: ["policy", "economics", "governance"], stateAffiliated: false, trackRecord: 0.87, notes: "Centrist-to-left think tank. Deep policy analysis." },
  { domain: "cfr.org", name: "Council on Foreign Relations", reliability: "B", category: "think-tank", region: "us", biasDirection: "center", specialties: ["foreign-policy", "geopolitics"], stateAffiliated: false, trackRecord: 0.88, notes: "Establishment foreign policy analysis." },
  { domain: "iiss.org", name: "IISS", reliability: "B", category: "think-tank", region: "uk", biasDirection: "center", specialties: ["defense", "security", "military-balance"], stateAffiliated: false, trackRecord: 0.90, notes: "Military balance data. Defense analysis gold standard." },
  { domain: "chathamhouse.org", name: "Chatham House", reliability: "B", category: "think-tank", region: "uk", biasDirection: "center", specialties: ["geopolitics", "trade", "security"], stateAffiliated: false, trackRecord: 0.88, notes: "Royal Institute of International Affairs." },
  { domain: "bellingcat.com", name: "Bellingcat", reliability: "B", category: "independent", region: "global", biasDirection: "center", specialties: ["osint", "investigations", "conflict"], stateAffiliated: false, trackRecord: 0.89, notes: "Open-source investigation pioneers. Exceptional verification methodology." },
  { domain: "janes.com", name: "Janes", reliability: "B", category: "data-provider", region: "global", biasDirection: "center", specialties: ["defense", "military", "weapons-systems"], stateAffiliated: false, trackRecord: 0.92, notes: "Defense intelligence database. Industry standard for military equipment data." },
  { domain: "csis.org", name: "CSIS", reliability: "B", category: "think-tank", region: "us", biasDirection: "center", specialties: ["defense", "geopolitics", "technology"], stateAffiliated: false, trackRecord: 0.87, notes: "Center for Strategic and International Studies." },
  { domain: "atlanticcouncil.org", name: "Atlantic Council", reliability: "B", category: "think-tank", region: "us", biasDirection: "center", specialties: ["transatlantic", "security", "energy"], stateAffiliated: false, trackRecord: 0.85, notes: "Transatlantic security focus. DGC Lab for disinformation tracking." },
  { domain: "nikkei.com", name: "Nikkei", reliability: "B", category: "broadsheet", region: "asia", biasDirection: "center", specialties: ["japan", "asia", "markets"], stateAffiliated: false, trackRecord: 0.86, notes: "Japan's financial paper. Owns FT." },
  { domain: "lemonde.fr", name: "Le Monde", reliability: "B", category: "broadsheet", region: "europe", biasDirection: "center-left", specialties: ["france", "europe", "africa"], stateAffiliated: false, trackRecord: 0.86, notes: "France's paper of record." },
  { domain: "carnegieendowment.org", name: "Carnegie Endowment", reliability: "B", category: "think-tank", region: "us", biasDirection: "center", specialties: ["nuclear", "asia", "russia"], stateAffiliated: false, trackRecord: 0.88, notes: "Global peace and nuclear policy." },
];

// C - Fairly Reliable
const C_SOURCES: SourceProfile[] = [
  { domain: "cnn.com", name: "CNN", reliability: "C", category: "broadsheet", region: "us", biasDirection: "center-left", specialties: ["breaking-news", "politics", "us"], stateAffiliated: false, trackRecord: 0.78, notes: "24hr news cycle. Breaking news first, depth later. Editorial leans left." },
  { domain: "nbcnews.com", name: "NBC News", reliability: "C", category: "broadsheet", region: "us", biasDirection: "center-left", specialties: ["politics", "investigations"], stateAffiliated: false, trackRecord: 0.78, notes: "US broadcast network. Decent investigative unit." },
  { domain: "abcnews.go.com", name: "ABC News", reliability: "C", category: "broadsheet", region: "us", biasDirection: "center-left", specialties: ["politics", "us"], stateAffiliated: false, trackRecord: 0.77, notes: "US broadcast network." },
  { domain: "cbsnews.com", name: "CBS News", reliability: "C", category: "broadsheet", region: "us", biasDirection: "center-left", specialties: ["politics", "us"], stateAffiliated: false, trackRecord: 0.77, notes: "US broadcast network." },
  { domain: "politico.com", name: "Politico", reliability: "C", category: "independent", region: "us", biasDirection: "center", specialties: ["politics", "policy", "congress"], stateAffiliated: false, trackRecord: 0.80, notes: "DC insider politics. Good sourcing but horse-race tendency." },
  { domain: "politico.eu", name: "Politico EU", reliability: "C", category: "independent", region: "europe", biasDirection: "center", specialties: ["eu-policy", "brussels"], stateAffiliated: false, trackRecord: 0.80, notes: "EU policy coverage." },
  { domain: "thehill.com", name: "The Hill", reliability: "C", category: "independent", region: "us", biasDirection: "center", specialties: ["congress", "politics"], stateAffiliated: false, trackRecord: 0.75, notes: "Capitol Hill politics." },
  { domain: "foreignpolicy.com", name: "Foreign Policy", reliability: "C", category: "independent", region: "global", biasDirection: "center", specialties: ["foreign-affairs", "geopolitics"], stateAffiliated: false, trackRecord: 0.83, notes: "Foreign affairs magazine. Good analysis." },
  { domain: "foreignaffairs.com", name: "Foreign Affairs", reliability: "C", category: "independent", region: "global", biasDirection: "center", specialties: ["foreign-policy", "analysis"], stateAffiliated: false, trackRecord: 0.85, notes: "CFR's journal. Academic rigor." },
  { domain: "defenseone.com", name: "Defense One", reliability: "C", category: "independent", region: "us", biasDirection: "center", specialties: ["defense", "military", "technology"], stateAffiliated: false, trackRecord: 0.82, notes: "Defense industry and policy." },
  { domain: "breakingdefense.com", name: "Breaking Defense", reliability: "C", category: "independent", region: "us", biasDirection: "center", specialties: ["defense", "procurement"], stateAffiliated: false, trackRecord: 0.80, notes: "Defense procurement and strategy." },
  { domain: "thedrive.com", name: "The War Zone (The Drive)", reliability: "C", category: "independent", region: "us", biasDirection: "center", specialties: ["military", "aviation", "weapons"], stateAffiliated: false, trackRecord: 0.80, notes: "Military technology and OSINT analysis." },
  { domain: "middleeasteye.net", name: "Middle East Eye", reliability: "C", category: "independent", region: "middle-east", biasDirection: "center-left", specialties: ["middle-east", "conflict"], stateAffiliated: false, trackRecord: 0.75, notes: "MENA coverage. Some Qatar influence concerns." },
  { domain: "theintercept.com", name: "The Intercept", reliability: "C", category: "independent", region: "us", biasDirection: "left", specialties: ["national-security", "surveillance", "investigations"], stateAffiliated: false, trackRecord: 0.78, notes: "National security investigations. Strong left editorial." },
  { domain: "propublica.org", name: "ProPublica", reliability: "C", category: "independent", region: "us", biasDirection: "center-left", specialties: ["investigations", "accountability"], stateAffiliated: false, trackRecord: 0.85, notes: "Nonprofit investigative journalism. High quality." },
  { domain: "axios.com", name: "Axios", reliability: "C", category: "independent", region: "us", biasDirection: "center", specialties: ["politics", "tech", "business"], stateAffiliated: false, trackRecord: 0.78, notes: "Concise news format. Good scoops." },
  { domain: "navalnews.com", name: "Naval News", reliability: "C", category: "independent", region: "global", biasDirection: "center", specialties: ["naval", "maritime", "defense"], stateAffiliated: false, trackRecord: 0.82, notes: "Naval and maritime defense coverage." },
];

// D - Not Usually Reliable
const D_SOURCES: SourceProfile[] = [
  { domain: "dailymail.co.uk", name: "Daily Mail", reliability: "D", category: "tabloid", region: "uk", biasDirection: "right", specialties: ["uk", "celebrity"], stateAffiliated: false, trackRecord: 0.55, notes: "Tabloid. Sensationalist headlines. Occasionally breaks stories others won't." },
  { domain: "nypost.com", name: "New York Post", reliability: "D", category: "tabloid", region: "us", biasDirection: "right", specialties: ["us", "politics"], stateAffiliated: false, trackRecord: 0.58, notes: "Murdoch tabloid. Verify all claims independently." },
  { domain: "foxnews.com", name: "Fox News", reliability: "D", category: "broadsheet", region: "us", biasDirection: "right", specialties: ["us-politics"], stateAffiliated: false, trackRecord: 0.55, notes: "News reporting C-grade, opinion content is propaganda-tier. Separate carefully." },
  { domain: "msnbc.com", name: "MSNBC", reliability: "D", category: "broadsheet", region: "us", biasDirection: "left", specialties: ["us-politics"], stateAffiliated: false, trackRecord: 0.55, notes: "Left-leaning editorial heavily colors news coverage." },
  { domain: "breitbart.com", name: "Breitbart", reliability: "D", category: "independent", region: "us", biasDirection: "right", specialties: ["us-politics", "immigration"], stateAffiliated: false, trackRecord: 0.40, notes: "Far-right editorial. High bias, low accuracy." },
  { domain: "huffpost.com", name: "HuffPost", reliability: "D", category: "independent", region: "us", biasDirection: "left", specialties: ["politics", "social"], stateAffiliated: false, trackRecord: 0.55, notes: "Progressive editorial. Blog-style origins." },
  { domain: "thesun.co.uk", name: "The Sun", reliability: "D", category: "tabloid", region: "uk", biasDirection: "right", specialties: ["uk"], stateAffiliated: false, trackRecord: 0.50, notes: "UK tabloid. Sensationalism over accuracy." },
  { domain: "newsmax.com", name: "Newsmax", reliability: "D", category: "independent", region: "us", biasDirection: "right", specialties: ["us-politics"], stateAffiliated: false, trackRecord: 0.40, notes: "Right-wing outlet. Low factual accuracy." },
  { domain: "dailywire.com", name: "Daily Wire", reliability: "D", category: "independent", region: "us", biasDirection: "right", specialties: ["us-politics", "culture"], stateAffiliated: false, trackRecord: 0.45, notes: "Conservative media company. High editorial bias." },
  { domain: "jacobin.com", name: "Jacobin", reliability: "D", category: "independent", region: "us", biasDirection: "left", specialties: ["politics", "labor"], stateAffiliated: false, trackRecord: 0.55, notes: "Socialist magazine. Strong ideological lens." },
];

// E - Unreliable (State Propaganda)
const E_SOURCES: SourceProfile[] = [
  { domain: "rt.com", name: "RT (Russia Today)", reliability: "E", category: "state", region: "russia", biasDirection: "state-aligned", specialties: ["russia", "anti-west"], stateAffiliated: true, trackRecord: 0.25, notes: "Russian state propaganda. Kremlin funded and directed." },
  { domain: "sputniknews.com", name: "Sputnik", reliability: "E", category: "state", region: "russia", biasDirection: "state-aligned", specialties: ["russia"], stateAffiliated: true, trackRecord: 0.20, notes: "Russian state media. Disinformation vector." },
  { domain: "cgtn.com", name: "CGTN", reliability: "E", category: "state", region: "china", biasDirection: "state-aligned", specialties: ["china"], stateAffiliated: true, trackRecord: 0.30, notes: "Chinese state broadcaster. CCP mouthpiece." },
  { domain: "xinhuanet.com", name: "Xinhua", reliability: "E", category: "state", region: "china", biasDirection: "state-aligned", specialties: ["china"], stateAffiliated: true, trackRecord: 0.30, notes: "Chinese state news agency. Official CCP positions." },
  { domain: "globaltimes.cn", name: "Global Times", reliability: "E", category: "state", region: "china", biasDirection: "state-aligned", specialties: ["china", "nationalism"], stateAffiliated: true, trackRecord: 0.25, notes: "CCP nationalist tabloid. Hawkish propaganda." },
  { domain: "tass.com", name: "TASS", reliability: "E", category: "state", region: "russia", biasDirection: "state-aligned", specialties: ["russia"], stateAffiliated: true, trackRecord: 0.30, notes: "Russian state wire service. Official government positions." },
  { domain: "kcna.kp", name: "KCNA", reliability: "E", category: "state", region: "north-korea", biasDirection: "state-aligned", specialties: ["north-korea"], stateAffiliated: true, trackRecord: 0.10, notes: "North Korean state media. Total propaganda." },
  { domain: "presstv.ir", name: "Press TV", reliability: "E", category: "state", region: "iran", biasDirection: "state-aligned", specialties: ["iran", "middle-east"], stateAffiliated: true, trackRecord: 0.25, notes: "Iranian state English-language. IRGC influence." },
  { domain: "telesurtv.net", name: "TeleSUR", reliability: "E", category: "state", region: "latin-america", biasDirection: "state-aligned", specialties: ["latin-america"], stateAffiliated: true, trackRecord: 0.30, notes: "Venezuelan state-funded. Anti-Western framing." },
  { domain: "farsnews.ir", name: "Fars News", reliability: "E", category: "state", region: "iran", biasDirection: "state-aligned", specialties: ["iran"], stateAffiliated: true, trackRecord: 0.20, notes: "Semi-official Iranian news. IRGC-affiliated." },
];

// Build domain lookup map
const ALL_SOURCES: SourceProfile[] = [...A_SOURCES, ...B_SOURCES, ...C_SOURCES, ...D_SOURCES, ...E_SOURCES];
const SOURCE_MAP = new Map<string, SourceProfile>();
for (const source of ALL_SOURCES) {
  SOURCE_MAP.set(source.domain, source);
}

const DEFAULT_PROFILE: SourceProfile = {
  domain: "unknown",
  name: "Unknown Source",
  reliability: "F",
  category: "blog",
  region: "unknown",
  biasDirection: "unknown",
  specialties: [],
  stateAffiliated: false,
  trackRecord: 0.3,
  notes: "Unrecognized source. Cannot assess reliability.",
};

export function getSourceProfile(domain: string): SourceProfile {
  // Normalize domain
  const normalized = domain.toLowerCase().replace(/^www\./, "");
  const profile = SOURCE_MAP.get(normalized);
  if (profile) return profile;

  // Try partial match (e.g., "uk.reuters.com" -> "reuters.com")
  for (const [key, val] of SOURCE_MAP) {
    if (normalized.endsWith(`.${key}`) || normalized.includes(key)) {
      return val;
    }
  }

  return { ...DEFAULT_PROFILE, domain: normalized };
}

export function getReliabilityScore(reliability: SourceReliability): number {
  const scores: Record<SourceReliability, number> = {
    A: 1.0,
    B: 0.8,
    C: 0.6,
    D: 0.4,
    E: 0.2,
    F: 0.3,
  };
  return scores[reliability];
}

export function assessInformation(
  sources: string[],
  crossRefCount?: number
): { accuracy: InformationAccuracy; explanation: string } {
  if (sources.length === 0) return { accuracy: 6, explanation: "No sources available for verification" };

  const profiles = sources.map(s => getSourceProfile(s));
  const reliableCount = profiles.filter(p => ["A", "B"].includes(p.reliability)).length;
  const uniqueCategories = new Set(profiles.map(p => p.category)).size;
  const refs = crossRefCount ?? sources.length;

  if (refs >= 3 && reliableCount >= 2) {
    return { accuracy: 1, explanation: `Confirmed by ${reliableCount} reliable sources across ${uniqueCategories} categories` };
  }
  if (refs >= 2 && reliableCount >= 1) {
    return { accuracy: 2, explanation: `Probably true. Corroborated by ${refs} sources including ${reliableCount} reliable` };
  }
  if (reliableCount >= 1) {
    return { accuracy: 3, explanation: "Possibly true. Reported by reliable source but not independently confirmed" };
  }
  if (profiles.some(p => p.reliability === "C")) {
    return { accuracy: 4, explanation: "Doubtful. Source is only fairly reliable, no corroboration" };
  }
  if (profiles.every(p => ["D", "E", "F"].includes(p.reliability))) {
    return { accuracy: 5, explanation: "Improbable. Only unreliable or unknown sources report this" };
  }
  return { accuracy: 6, explanation: "Truth cannot be determined from available sources" };
}

export function computeCompositeConfidence(
  sourceReliability: SourceReliability,
  infoAccuracy: InformationAccuracy
): number {
  const relScore = getReliabilityScore(sourceReliability);
  const accScore = Math.max(0, (7 - infoAccuracy) / 6); // 1->1.0, 6->0.17
  return Math.round(relScore * 0.4 + accScore * 0.6 * 100) / 100;
}

export function formatAdmiraltyRating(reliability: SourceReliability, accuracy: InformationAccuracy): string {
  return `${reliability}${accuracy}`;
}

export function getSourcesBySpecialty(specialty: string): SourceProfile[] {
  return ALL_SOURCES.filter(s => s.specialties.includes(specialty));
}

export function getSourcesByReliability(...levels: SourceReliability[]): SourceProfile[] {
  return ALL_SOURCES.filter(s => levels.includes(s.reliability));
}

export function getAllSourceProfiles(): SourceProfile[] {
  return ALL_SOURCES;
}
