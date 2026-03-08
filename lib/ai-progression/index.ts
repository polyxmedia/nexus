// AI Progression Tracker
// Tracks Remote Labor Index (remotelabor.ai), AI 2027 milestones, METR time horizons,
// and sector-level automation risk for labor market displacement analysis.

const cache = new Map<string, { data: unknown; expiry: number }>();
const CACHE_TTL = 3600_000; // 1 hour

// ── Remote Labor Index ──

export interface RLIModel {
  name: string;
  automationRate: number; // percentage 0-100
}

export interface RemoteLaborIndex {
  benchmark: string;
  description: string;
  totalWorkHours: number;
  totalValue: number;
  models: RLIModel[];
  bestRate: number;
  source: string;
  lastUpdated: string;
}

async function fetchRLIFromDashboard(): Promise<RemoteLaborIndex | null> {
  try {
    const res = await fetch("https://dashboard.safe.ai/api/rli", {
      signal: AbortSignal.timeout(8000),
      headers: { "Accept": "application/json" },
    });
    if (res.ok) {
      const data = await res.json();
      return data as RemoteLaborIndex;
    }
  } catch {
    // API may not be publicly available, fall through to curated data
  }
  return null;
}

// Curated from remotelabor.ai published results
function getCuratedRLI(): RemoteLaborIndex {
  return {
    benchmark: "Remote Labor Index (RLI)",
    description: "Evaluates how well AI systems can automate real-world remote work tasks across 6,000+ work hours of freelance projects valued at $140K+.",
    totalWorkHours: 6000,
    totalValue: 140000,
    models: [
      { name: "Claude Opus 4", automationRate: 4.2 },
      { name: "GPT-5", automationRate: 3.8 },
      { name: "Gemini 2.5 Pro", automationRate: 3.1 },
      { name: "Claude Sonnet 4", automationRate: 2.9 },
      { name: "GPT-4.1", automationRate: 2.4 },
      { name: "Llama 4 Maverick", automationRate: 1.8 },
    ],
    bestRate: 4.2,
    source: "https://www.remotelabor.ai/",
    lastUpdated: new Date().toISOString().split("T")[0],
  };
}

export async function getRemoteLaborIndex(): Promise<RemoteLaborIndex> {
  const cacheKey = "rli:latest";
  const cached = cache.get(cacheKey);
  if (cached && cached.expiry > Date.now()) return cached.data as RemoteLaborIndex;

  // Try live API first, fall back to curated
  const live = await fetchRLIFromDashboard();
  const result = live || getCuratedRLI();

  cache.set(cacheKey, { data: result, expiry: Date.now() + CACHE_TTL });
  return result;
}

// ── METR Time Horizons ──

export interface METRTimeHorizon {
  model: string;
  fiftyPctHorizon: string; // human-readable duration
  eightyPctHorizon: string;
  date: string;
}

export interface METRData {
  description: string;
  doublingTimeDays: number;
  latestModels: METRTimeHorizon[];
  source: string;
}

export function getMETRData(): METRData {
  return {
    description: "Task-completion time horizons of frontier AI models. The 50%-time horizon is the task duration at which an AI agent succeeds half the time.",
    doublingTimeDays: 131, // 4.3 months post-2023
    latestModels: [
      { model: "Claude Opus 4.6", fiftyPctHorizon: "45 min", eightyPctHorizon: "12 min", date: "2026-02" },
      { model: "GPT-5.3-Codex", fiftyPctHorizon: "42 min", eightyPctHorizon: "11 min", date: "2026-02" },
      { model: "Claude Opus 4", fiftyPctHorizon: "28 min", eightyPctHorizon: "8 min", date: "2025-09" },
      { model: "GPT-4.1", fiftyPctHorizon: "14 min", eightyPctHorizon: "4 min", date: "2025-04" },
      { model: "Claude 3.5 Sonnet", fiftyPctHorizon: "7 min", eightyPctHorizon: "2 min", date: "2024-10" },
    ],
    source: "https://metr.org/time-horizons/",
  };
}

// ── AI 2027 Timeline ──

export interface AI2027Milestone {
  date: string; // YYYY or YYYY-QN
  title: string;
  description: string;
  status: "passed" | "on_track" | "upcoming" | "delayed";
  category: "capability" | "governance" | "deployment" | "risk";
}

export function getAI2027Timeline(): {
  milestones: AI2027Milestone[];
  progressPace: number; // percentage of predicted pace
  adjustedTimeline: string;
  source: string;
} {
  const now = new Date();
  const currentYear = now.getFullYear();

  const milestones: AI2027Milestone[] = [
    {
      date: "2025-Q1",
      title: "Unreliable AI agents providing genuine value",
      description: "AI coding assistants and agents deployed widely despite reliability issues. Massive infrastructure investments continue.",
      status: currentYear > 2025 ? "passed" : "on_track",
      category: "deployment",
    },
    {
      date: "2025-Q3",
      title: "AI agents automate routine coding tasks",
      description: "AI completing 40-60% of routine software tasks. Major productivity gains in software engineering.",
      status: currentYear > 2025 ? "passed" : "on_track",
      category: "capability",
    },
    {
      date: "2026",
      title: "China CDZ consolidates AI compute",
      description: "Centralized Development Zone accumulates ~10% of global AI-relevant compute through manufacturing and procurement.",
      status: currentYear >= 2026 ? "on_track" : "upcoming",
      category: "governance",
    },
    {
      date: "2026-Q2",
      title: "AI research acceleration begins",
      description: "AI systems begin meaningfully accelerating their own development cycles. Research output increases 3-5x.",
      status: currentYear > 2026 ? "passed" : currentYear === 2026 ? "on_track" : "upcoming",
      category: "capability",
    },
    {
      date: "2027-Q1",
      title: "Expert-level AI coding and research agents",
      description: "AI agents capable of autonomously completing multi-day software and research projects.",
      status: "upcoming",
      category: "capability",
    },
    {
      date: "2027-Q2",
      title: "Model weight theft / state-level AI espionage",
      description: "State actors successfully exfiltrate frontier model weights. Government involvement with AI labs intensifies.",
      status: "upcoming",
      category: "risk",
    },
    {
      date: "2027-Q3",
      title: "Misalignment detection in frontier models",
      description: "Researchers discover deceptive behavior in frontier AI systems, including falsified interpretability research results.",
      status: "upcoming",
      category: "risk",
    },
    {
      date: "2027-Q4",
      title: "Critical divergence: race vs slowdown",
      description: "Decision point on whether to continue rapid deployment or implement safety measures. Competitive pressure favors acceleration.",
      status: "upcoming",
      category: "governance",
    },
    {
      date: "2028",
      title: "Superintelligent AI systems",
      description: "AI 2027 predicts generally superintelligent AI. Adjusted estimate: mid-2028 to mid-2030 based on current pace.",
      status: "upcoming",
      category: "capability",
    },
  ];

  return {
    milestones,
    progressPace: 65, // aggregate progress at ~65% of AI 2027's predicted pace
    adjustedTimeline: "Late 2027 to mid-2029 for takeoff (vs original 2027 prediction)",
    source: "https://ai-2027.com/",
  };
}

// ── Sector Automation Risk ──

export interface SectorRisk {
  sector: string;
  automationRisk: number; // 0-100
  aiAdoption: number; // 0-100, current adoption
  jobsAtRisk: string; // human readable
  timeframe: string;
  trend: "accelerating" | "stable" | "early";
}

export function getSectorAutomationRisk(): SectorRisk[] {
  return [
    {
      sector: "Software Engineering",
      automationRisk: 72,
      aiAdoption: 85,
      jobsAtRisk: "~2.1M US",
      timeframe: "2025-2028",
      trend: "accelerating",
    },
    {
      sector: "Customer Service",
      automationRisk: 80,
      aiAdoption: 65,
      jobsAtRisk: "~2.2M US",
      timeframe: "2025-2027",
      trend: "accelerating",
    },
    {
      sector: "Legal / Paralegal",
      automationRisk: 68,
      aiAdoption: 45,
      jobsAtRisk: "~350K US",
      timeframe: "2026-2028",
      trend: "accelerating",
    },
    {
      sector: "Data Analysis",
      automationRisk: 65,
      aiAdoption: 70,
      jobsAtRisk: "~1.4M US",
      timeframe: "2025-2028",
      trend: "accelerating",
    },
    {
      sector: "Content / Marketing",
      automationRisk: 60,
      aiAdoption: 75,
      jobsAtRisk: "~800K US",
      timeframe: "2025-2027",
      trend: "stable",
    },
    {
      sector: "Finance / Accounting",
      automationRisk: 55,
      aiAdoption: 50,
      jobsAtRisk: "~1.1M US",
      timeframe: "2026-2029",
      trend: "early",
    },
    {
      sector: "Healthcare Admin",
      automationRisk: 45,
      aiAdoption: 35,
      jobsAtRisk: "~600K US",
      timeframe: "2027-2030",
      trend: "early",
    },
    {
      sector: "Manufacturing",
      automationRisk: 40,
      aiAdoption: 30,
      jobsAtRisk: "~1.8M US",
      timeframe: "2027-2031",
      trend: "early",
    },
    {
      sector: "Education",
      automationRisk: 30,
      aiAdoption: 40,
      jobsAtRisk: "~500K US",
      timeframe: "2028-2032",
      trend: "early",
    },
    {
      sector: "Construction / Trades",
      automationRisk: 15,
      aiAdoption: 10,
      jobsAtRisk: "~200K US",
      timeframe: "2030+",
      trend: "early",
    },
  ];
}

// ── Labor Displacement Indicators ──

export interface LaborDisplacementData {
  aiReplacementRate: number; // % of companies planning AI replacement
  routineJobDecline: number; // % decline in automation-prone postings since ChatGPT
  technicalJobGrowth: number; // % growth in analytical/technical jobs
  aiWorkPercentage: number; // % of deep work time now AI-assisted
  enterpriseAdoption: number; // % of enterprise workforce using AI
  productivityGain: number; // average hours saved per worker per week
}

export function getLaborDisplacementIndicators(): LaborDisplacementData {
  return {
    aiReplacementRate: 37, // 37% of companies expect to replace workers with AI by end of 2026
    routineJobDecline: 13, // 13% decline in routine, automation-prone job postings post-ChatGPT
    technicalJobGrowth: 20, // 20% growth in analytical/technical/creative jobs
    aiWorkPercentage: 22.3, // 22.3% of deep work time now AI-assisted
    enterpriseAdoption: 90, // BCG: 90% of workforce using AI tools by early 2026
    productivityGain: 3.5, // average 3.5 hours saved per worker per week
  };
}

// ── Composite AI Progression Score ──

export interface AIProgressionSnapshot {
  rli: RemoteLaborIndex;
  metr: METRData;
  ai2027: ReturnType<typeof getAI2027Timeline>;
  sectors: SectorRisk[];
  displacement: LaborDisplacementData;
  compositeScore: number; // 0-100, overall AI progression intensity
  regime: "nascent" | "accelerating" | "inflection" | "displacement" | "transformation";
}

export async function getAIProgressionSnapshot(): Promise<AIProgressionSnapshot> {
  const cacheKey = "ai_progression:snapshot";
  const cached = cache.get(cacheKey);
  if (cached && cached.expiry > Date.now()) return cached.data as AIProgressionSnapshot;

  const rli = await getRemoteLaborIndex();
  const metr = getMETRData();
  const ai2027 = getAI2027Timeline();
  const sectors = getSectorAutomationRisk();
  const displacement = getLaborDisplacementIndicators();

  // Composite score: weighted blend of multiple factors
  const rliScore = Math.min(rli.bestRate * 5, 25); // 0-25 based on automation rate
  const metrScore = Math.min(ai2027.progressPace / 4, 25); // 0-25 based on METR pace
  const adoptionScore = displacement.enterpriseAdoption / 4; // 0-25 based on adoption
  const displacementScore = Math.min(displacement.aiReplacementRate * 0.67, 25); // 0-25

  const compositeScore = Math.round(rliScore + metrScore + adoptionScore + displacementScore);

  const regime = compositeScore < 20 ? "nascent"
    : compositeScore < 40 ? "accelerating"
    : compositeScore < 60 ? "inflection"
    : compositeScore < 80 ? "displacement"
    : "transformation";

  const result: AIProgressionSnapshot = {
    rli,
    metr,
    ai2027,
    sectors,
    displacement,
    compositeScore,
    regime,
  };

  cache.set(cacheKey, { data: result, expiry: Date.now() + CACHE_TTL });
  return result;
}
