// ── Chinese Numerology & Esoteric Forecasting Engine ──
// Cultural decision-making frameworks used by state actors and market participants

// ═══════════════════════════════════════════════════════════
// CHINESE NUMEROLOGY
// ═══════════════════════════════════════════════════════════

const DIGIT_SCORES: Record<number, number> = {
  0: 0, 1: 0, 2: 1, 3: 1, 4: -2, 5: -1, 6: 1, 7: -1, 8: 2, 9: 1,
};

const DIGIT_MEANINGS: Record<number, string> = {
  0: "Wholeness",
  1: "Unity, independence",
  2: "Good things in pairs (双喜)",
  3: "Growth, birth (生 shēng)",
  4: "Death (死 sǐ) - strongly avoided",
  5: "Crying, mourning (呜 wū)",
  6: "Smooth flow, happiness (流 liú)",
  7: "Gone, departed (去 qù)",
  8: "Wealth, prosperity (发 fā / 发财 fācái)",
  9: "Longevity, eternity (久 jiǔ)",
};

export interface NumerologyScore {
  number: string;
  totalScore: number;
  digitBreakdown: Array<{ digit: number; score: number; meaning: string }>;
  patterns: string[];
  sentiment: "strongly_auspicious" | "auspicious" | "neutral" | "inauspicious" | "strongly_inauspicious";
}

export function scoreChineseNumerology(input: string | number): NumerologyScore {
  const numStr = String(input).replace(/[^0-9]/g, "");
  const digits = numStr.split("").map(Number);

  let totalScore = 0;
  const digitBreakdown = digits.map(d => {
    const score = DIGIT_SCORES[d] || 0;
    totalScore += score;
    return { digit: d, score, meaning: DIGIT_MEANINGS[d] || "" };
  });

  // Pattern bonuses
  const patterns: string[] = [];
  if (numStr.includes("888")) { totalScore += 4; patterns.push("Triple prosperity (888)"); }
  else if (numStr.includes("88")) { totalScore += 2; patterns.push("Double prosperity (88)"); }
  if (numStr.includes("168")) { totalScore += 3; patterns.push("All the way to prosperity (168 一路发)"); }
  if (numStr.includes("68")) { totalScore += 2; patterns.push("Prosperous life (68)"); }
  if (numStr.includes("99")) { totalScore += 1; patterns.push("Double longevity (99)"); }
  if (numStr.includes("44")) { totalScore -= 3; patterns.push("Double death (44)"); }
  if (numStr.includes("14")) { totalScore -= 2; patterns.push("Will die (14 要死 yào sǐ)"); }
  if (numStr.includes("514")) { totalScore -= 3; patterns.push("I will die (514 我要死)"); }
  if (numStr.includes("666")) { totalScore += 2; patterns.push("Everything smooth (666 六六大顺)"); }

  const sentiment = totalScore >= 4 ? "strongly_auspicious"
    : totalScore >= 2 ? "auspicious"
    : totalScore >= -1 ? "neutral"
    : totalScore >= -3 ? "inauspicious"
    : "strongly_inauspicious";

  return { number: numStr, totalScore, digitBreakdown, patterns, sentiment };
}

// Score a date for Chinese numerological auspiciousness
export function scoreDateNumerology(date: Date): NumerologyScore & { dateComponents: string } {
  const y = date.getFullYear();
  const m = date.getMonth() + 1;
  const d = date.getDate();
  const dateStr = `${y}${String(m).padStart(2, "0")}${String(d).padStart(2, "0")}`;
  const score = scoreChineseNumerology(dateStr);
  return { ...score, dateComponents: `${y}-${m}-${d}` };
}

// ═══════════════════════════════════════════════════════════
// CHINESE SEXAGENARY CYCLE (天干地支)
// ═══════════════════════════════════════════════════════════

export const HEAVENLY_STEMS = [
  { index: 1, chinese: "甲", pinyin: "Jiǎ", element: "Wood", polarity: "Yang" },
  { index: 2, chinese: "乙", pinyin: "Yǐ", element: "Wood", polarity: "Yin" },
  { index: 3, chinese: "丙", pinyin: "Bǐng", element: "Fire", polarity: "Yang" },
  { index: 4, chinese: "丁", pinyin: "Dīng", element: "Fire", polarity: "Yin" },
  { index: 5, chinese: "戊", pinyin: "Wù", element: "Earth", polarity: "Yang" },
  { index: 6, chinese: "己", pinyin: "Jǐ", element: "Earth", polarity: "Yin" },
  { index: 7, chinese: "庚", pinyin: "Gēng", element: "Metal", polarity: "Yang" },
  { index: 8, chinese: "辛", pinyin: "Xīn", element: "Metal", polarity: "Yin" },
  { index: 9, chinese: "壬", pinyin: "Rén", element: "Water", polarity: "Yang" },
  { index: 10, chinese: "癸", pinyin: "Guǐ", element: "Water", polarity: "Yin" },
] as const;

export const EARTHLY_BRANCHES = [
  { index: 1, chinese: "子", pinyin: "Zǐ", animal: "Rat", element: "Water", polarity: "Yang" },
  { index: 2, chinese: "丑", pinyin: "Chǒu", animal: "Ox", element: "Earth", polarity: "Yin" },
  { index: 3, chinese: "寅", pinyin: "Yín", animal: "Tiger", element: "Wood", polarity: "Yang" },
  { index: 4, chinese: "卯", pinyin: "Mǎo", animal: "Rabbit", element: "Wood", polarity: "Yin" },
  { index: 5, chinese: "辰", pinyin: "Chén", animal: "Dragon", element: "Earth", polarity: "Yang" },
  { index: 6, chinese: "巳", pinyin: "Sì", animal: "Snake", element: "Fire", polarity: "Yin" },
  { index: 7, chinese: "午", pinyin: "Wǔ", animal: "Horse", element: "Fire", polarity: "Yang" },
  { index: 8, chinese: "未", pinyin: "Wèi", animal: "Goat", element: "Earth", polarity: "Yin" },
  { index: 9, chinese: "申", pinyin: "Shēn", animal: "Monkey", element: "Metal", polarity: "Yang" },
  { index: 10, chinese: "酉", pinyin: "Yǒu", animal: "Rooster", element: "Metal", polarity: "Yin" },
  { index: 11, chinese: "戌", pinyin: "Xū", animal: "Dog", element: "Earth", polarity: "Yang" },
  { index: 12, chinese: "亥", pinyin: "Hài", animal: "Pig", element: "Water", polarity: "Yin" },
] as const;

// Six Harmonies (stable pairings)
const HARMONIES: Array<[number, number, string]> = [
  [1, 2, "Earth"],   // Rat-Ox
  [3, 12, "Wood"],   // Tiger-Pig
  [4, 11, "Fire"],   // Rabbit-Dog
  [5, 10, "Metal"],  // Dragon-Rooster
  [6, 9, "Water"],   // Snake-Monkey
  [7, 8, "Fire"],    // Horse-Goat
];

// Six Clashes (conflict pairings)
const CLASHES: Array<[number, number, string]> = [
  [1, 7, "Water-Fire direct opposition"],    // Rat-Horse
  [2, 8, "Earth clash"],                      // Ox-Goat
  [3, 9, "Wood-Metal clash"],                 // Tiger-Monkey
  [4, 10, "Wood-Metal clash"],                // Rabbit-Rooster
  [5, 11, "Earth clash"],                     // Dragon-Dog
  [6, 12, "Fire-Water clash"],                // Snake-Pig
];

export interface SexagenaryCycleInfo {
  year: number;
  cycleNumber: number; // 1-60
  stem: typeof HEAVENLY_STEMS[number];
  branch: typeof EARTHLY_BRANCHES[number];
  element: string;
  polarity: string;
  animal: string;
  label: string; // e.g., "Jiǎ-Zǐ (Wood Rat)"
  harmonies: string[];
  clashes: string[];
  cyclePosition: string; // "early" | "mid" | "late" in the 60-year cycle
}

export function getSexagenaryCycle(year: number): SexagenaryCycleInfo {
  const stemIdx = ((year - 3) % 10) || 10;
  const branchIdx = ((year - 3) % 12) || 12;
  const cycleNumber = ((year - 3) % 60) || 60;

  const stem = HEAVENLY_STEMS[stemIdx - 1];
  const branch = EARTHLY_BRANCHES[branchIdx - 1];

  // Find harmonies and clashes for this year's branch
  const harmonies: string[] = [];
  const clashes: string[] = [];

  for (const [a, b, result] of HARMONIES) {
    if (branchIdx === a) harmonies.push(`${EARTHLY_BRANCHES[b - 1].animal} (${result})`);
    if (branchIdx === b) harmonies.push(`${EARTHLY_BRANCHES[a - 1].animal} (${result})`);
  }
  for (const [a, b, desc] of CLASHES) {
    if (branchIdx === a) clashes.push(`${EARTHLY_BRANCHES[b - 1].animal} (${desc})`);
    if (branchIdx === b) clashes.push(`${EARTHLY_BRANCHES[a - 1].animal} (${desc})`);
  }

  const cyclePosition = cycleNumber <= 20 ? "early" : cycleNumber <= 40 ? "mid" : "late";

  return {
    year,
    cycleNumber,
    stem,
    branch,
    element: stem.element,
    polarity: stem.polarity,
    animal: branch.animal,
    label: `${stem.pinyin}-${branch.pinyin} (${stem.element} ${branch.animal})`,
    harmonies,
    clashes,
    cyclePosition,
  };
}

// ═══════════════════════════════════════════════════════════
// FIVE ELEMENTS INTERACTION
// ═══════════════════════════════════════════════════════════

const ELEMENT_ORDER = ["Wood", "Fire", "Earth", "Metal", "Water"] as const;

// Productive cycle: Wood feeds Fire feeds Earth feeds Metal feeds Water feeds Wood
export function isProductiveRelation(from: string, to: string): boolean {
  const fromIdx = ELEMENT_ORDER.indexOf(from as typeof ELEMENT_ORDER[number]);
  const toIdx = ELEMENT_ORDER.indexOf(to as typeof ELEMENT_ORDER[number]);
  if (fromIdx === -1 || toIdx === -1) return false;
  return (fromIdx + 1) % 5 === toIdx;
}

// Destructive cycle: Wood parts Earth, Earth dams Water, Water quenches Fire, Fire melts Metal, Metal chops Wood
export function isDestructiveRelation(from: string, to: string): boolean {
  const fromIdx = ELEMENT_ORDER.indexOf(from as typeof ELEMENT_ORDER[number]);
  const toIdx = ELEMENT_ORDER.indexOf(to as typeof ELEMENT_ORDER[number]);
  if (fromIdx === -1 || toIdx === -1) return false;
  return (fromIdx + 2) % 5 === toIdx;
}

export function getElementRelation(a: string, b: string): "productive" | "destructive" | "neutral" {
  if (isProductiveRelation(a, b) || isProductiveRelation(b, a)) return "productive";
  if (isDestructiveRelation(a, b) || isDestructiveRelation(b, a)) return "destructive";
  return "neutral";
}

// ═══════════════════════════════════════════════════════════
// LO SHU FLYING STARS (年飞星)
// ═══════════════════════════════════════════════════════════

const STAR_MEANINGS: Record<number, { name: string; element: string; nature: string; financial: string; score: number }> = {
  1: { name: "White Water Star", element: "Water", nature: "Auspicious", financial: "Career luck, new opportunities, networking gains", score: 1 },
  2: { name: "Black Earth Star", element: "Earth", nature: "Inauspicious", financial: "Illness star, obstacles to wealth, medical expenses", score: -2 },
  3: { name: "Jade Wood Star", element: "Wood", nature: "Inauspicious", financial: "Legal disputes, lawsuits, hostile takeovers, regulatory risk", score: -1 },
  4: { name: "Green Wood Star", element: "Wood", nature: "Neutral", financial: "Academic success, creativity, R&D breakthroughs", score: 0 },
  5: { name: "Yellow Earth Star", element: "Earth", nature: "Highly Inauspicious", financial: "Catastrophe star, major losses, systemic risk, black swan events", score: -3 },
  6: { name: "White Metal Star", element: "Metal", nature: "Auspicious", financial: "Authority, windfall gains, government contracts, institutional backing", score: 2 },
  7: { name: "Red Metal Star", element: "Metal", nature: "Inauspicious", financial: "Theft, fraud, cybercrime, loss through deception", score: -1 },
  8: { name: "White Earth Star", element: "Earth", nature: "Highly Auspicious", financial: "Strongest wealth star (current period 2004-2024), property, material prosperity", score: 3 },
  9: { name: "Purple Fire Star", element: "Fire", nature: "Auspicious", financial: "Future prosperity star (ruling 2024-2044), celebrations, IPOs, expansions", score: 2 },
};

function sumDigits(n: number): number {
  let sum = 0;
  while (n > 0) { sum += n % 10; n = Math.floor(n / 10); }
  return sum;
}

export function getAnnualFlyingStar(year: number): number {
  if (year >= 2000) {
    const lastTwo = year % 100;
    let ds = sumDigits(lastTwo);
    while (ds >= 10) ds = sumDigits(ds);
    let star = 9 - ds;
    if (star <= 0) star += 9;
    return star;
  }
  let ds = sumDigits(year);
  while (ds >= 10) ds = sumDigits(ds);
  let star = 11 - ds;
  if (star > 9) star -= 9;
  return star;
}

export interface FlyingStarReading {
  year: number;
  centerStar: number;
  starInfo: typeof STAR_MEANINGS[number];
  grid: number[][]; // 3x3 Lo Shu with stars placed
  financialOutlook: string;
}

export function getFlyingStarReading(year: number): FlyingStarReading {
  const centerStar = getAnnualFlyingStar(year);
  const starInfo = STAR_MEANINGS[centerStar];

  // Build the flying star grid (Lo Shu flight path)
  // Standard Lo Shu: 4 9 2 / 3 5 7 / 8 1 6
  // Flight order: center, NW, W, NE, S, N, SW, E, SE
  const loShuPositions = [4, 3, 8, 9, 5, 1, 2, 7, 6]; // position order in Lo Shu
  const flightOrder = [4, 3, 8, 1, 5, 9, 2, 7, 6]; // star 5 is center by default

  // Place stars: center star goes to center, then increment through positions
  const grid: number[][] = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
  // Positions in Lo Shu: =SE(4), [1]=S(9), [2]=SW(2)
  //                       [1]=E(3),  [1][1]=C(5), [1][2]=W(7)
  //                       [2]=NE(8), [2][1]=N(1), [2][2]=NW(6)
  const positionMap: Array<[number, number]> = [
    [0, 0], [0, 1], [0, 2],
    [1, 0], [1, 1], [1, 2],
    [2, 0], [2, 1], [2, 2],
  ];
  const loShuBase = [4, 9, 2, 3, 5, 7, 8, 1, 6];
  const offset = centerStar - 5;

  for (let i = 0; i < 9; i++) {
    let star = loShuBase[i] + offset;
    if (star > 9) star -= 9;
    if (star < 1) star += 9;
    const [r, c] = positionMap[i];
    grid[r][c] = star;
  }

  const financialOutlook = starInfo.score >= 2
    ? "Favorable year for expansion and wealth accumulation"
    : starInfo.score >= 0
      ? "Neutral year requiring careful positioning"
      : starInfo.score >= -2
        ? "Challenging year with elevated risk of losses"
        : "Dangerous year: heightened systemic risk, defensive positioning recommended";

  return { year, centerStar, starInfo, grid, financialOutlook };
}

// ═══════════════════════════════════════════════════════════
// GANN SQUARE OF 9
// ═══════════════════════════════════════════════════════════

export interface GannLevel {
  angle: number;
  label: string;
  resistance: number;
  support: number;
}

export function gannSquareOf9(pivotPrice: number): GannLevel[] {
  const sqrtPrice = Math.sqrt(pivotPrice);
  const angles = [
    { angle: 45, label: "1/8 rotation" },
    { angle: 90, label: "1/4 rotation (cardinal)" },
    { angle: 120, label: "1/3 rotation (trine)" },
    { angle: 135, label: "3/8 rotation" },
    { angle: 180, label: "1/2 rotation (opposition)" },
    { angle: 225, label: "5/8 rotation" },
    { angle: 240, label: "2/3 rotation" },
    { angle: 270, label: "3/4 rotation (cardinal)" },
    { angle: 315, label: "7/8 rotation" },
    { angle: 360, label: "Full rotation" },
  ];

  return angles.map(({ angle, label }) => {
    const increment = angle / 360;
    return {
      angle,
      label,
      resistance: Math.round(Math.pow(sqrtPrice + increment, 2) * 100) / 100,
      support: Math.round(Math.pow(sqrtPrice - increment, 2) * 100) / 100,
    };
  });
}

// ═══════════════════════════════════════════════════════════
// GANN TIME CYCLES
// ═══════════════════════════════════════════════════════════

export interface GannTimeCycle {
  name: string;
  days: number;
  years: number;
  basis: string;
  nextDate: string; // ISO date from a reference
}

export function getGannCycles(fromDate: Date): GannTimeCycle[] {
  const cycles = [
    { name: "Minor", days: 365, years: 1, basis: "Earth orbital period" },
    { name: "Intermediate", days: 1826, years: 5, basis: "Quarter of 20-year cycle" },
    { name: "Major", days: 3652, years: 10, basis: "Half of Jupiter-Saturn synodic" },
    { name: "Master", days: 7253, years: 19.86, basis: "Jupiter-Saturn conjunction cycle" },
    { name: "Grand", days: 21915, years: 60, basis: "Chinese sexagenary / triple Jupiter-Saturn" },
    { name: "Great", days: 32872, years: 90, basis: "Gann Master Time Period" },
  ];

  return cycles.map(c => {
    const next = new Date(fromDate.getTime() + c.days * 86400000);
    return { ...c, nextDate: next.toISOString().split("T")[0] };
  });
}

// ═══════════════════════════════════════════════════════════
// MARTIN ARMSTRONG PI CYCLE (Economic Confidence Model)
// ═══════════════════════════════════════════════════════════

const PI_CYCLE_DAYS = 3141.59; // pi * 1000

export interface PiCyclePoint {
  label: string;
  date: string;
  type: "peak" | "trough";
  daysFromNow: number;
}

export function getArmstrongPiCycle(referenceDate: Date): PiCyclePoint[] {
  // Known anchor: 2015.75 = Oct 1, 2015 (peak)
  const anchor = new Date("2015-10-01").getTime();
  const halfCycle = PI_CYCLE_DAYS / 2;
  const quarterCycle = PI_CYCLE_DAYS / 4;
  const points: PiCyclePoint[] = [];

  // Generate points from 2007 to 2035
  for (let i = -3; i <= 6; i++) {
    const peakMs = anchor + i * PI_CYCLE_DAYS * 86400000;
    const troughMs = anchor + (i - 0.5) * PI_CYCLE_DAYS * 86400000;

    const peakDate = new Date(peakMs);
    const troughDate = new Date(troughMs);

    if (peakDate.getFullYear() >= 2007 && peakDate.getFullYear() <= 2035) {
      points.push({
        label: `ECM Peak ${peakDate.getFullYear()}`,
        date: peakDate.toISOString().split("T")[0],
        type: "peak",
        daysFromNow: Math.round((peakMs - referenceDate.getTime()) / 86400000),
      });
    }
    if (troughDate.getFullYear() >= 2007 && troughDate.getFullYear() <= 2035) {
      points.push({
        label: `ECM Trough ${troughDate.getFullYear()}`,
        date: troughDate.toISOString().split("T")[0],
        type: "trough",
        daysFromNow: Math.round((troughMs - referenceDate.getTime()) / 86400000),
      });
    }
  }

  return points.sort((a, b) => a.date.localeCompare(b.date));
}

// ═══════════════════════════════════════════════════════════
// LUNAR CYCLE (Market Impact)
// ═══════════════════════════════════════════════════════════

// Synodic month = 29.53059 days
const SYNODIC_MONTH = 29.53059;

export interface LunarPhase {
  phase: "new_moon" | "waxing_crescent" | "first_quarter" | "waxing_gibbous" | "full_moon" | "waning_gibbous" | "last_quarter" | "waning_crescent";
  dayInCycle: number;
  illumination: number; // 0-1
  marketBias: "bullish" | "bearish" | "neutral";
  basisPoints: number; // expected daily adjustment per academic research
}

export function getLunarPhase(date: Date): LunarPhase {
  // Known new moon reference: Jan 6, 2000 18:14 UTC
  const knownNewMoon = new Date("2000-01-06T18:14:00Z").getTime();
  const diffDays = (date.getTime() - knownNewMoon) / 86400000;
  const dayInCycle = ((diffDays % SYNODIC_MONTH) + SYNODIC_MONTH) % SYNODIC_MONTH;

  // Phase determination (8 phases, each ~3.69 days)
  const phaseIndex = Math.floor(dayInCycle / (SYNODIC_MONTH / 8));
  const phases: LunarPhase["phase"][] = [
    "new_moon", "waxing_crescent", "first_quarter", "waxing_gibbous",
    "full_moon", "waning_gibbous", "last_quarter", "waning_crescent",
  ];

  // Illumination approximation (cosine model)
  const illumination = (1 - Math.cos(2 * Math.PI * dayInCycle / SYNODIC_MONTH)) / 2;

  // Market bias from academic research (Yuan, Zheng & Zhu)
  // New moon period: higher returns, Full moon period: lower returns
  // Cosine model: positive near new moon (day 0), negative near full moon (day ~14.76)
  const cosine = Math.cos(2 * Math.PI * dayInCycle / SYNODIC_MONTH);
  const basisPoints = Math.round(cosine * 3); // ~3bp daily swing

  const marketBias = cosine > 0.3 ? "bullish" : cosine < -0.3 ? "bearish" : "neutral";

  return {
    phase: phases[phaseIndex] || "new_moon",
    dayInCycle: Math.round(dayInCycle * 100) / 100,
    illumination: Math.round(illumination * 1000) / 1000,
    marketBias,
    basisPoints,
  };
}

// ═══════════════════════════════════════════════════════════
// PYTHAGOREAN NUMEROLOGY (for ticker/company names)
// ═══════════════════════════════════════════════════════════

const PYTHAGOREAN_MAP: Record<string, number> = {
  A: 1, B: 2, C: 3, D: 4, E: 5, F: 6, G: 7, H: 8, I: 9,
  J: 1, K: 2, L: 3, M: 4, N: 5, O: 6, P: 7, Q: 8, R: 9,
  S: 1, T: 2, U: 3, V: 4, W: 5, X: 6, Y: 7, Z: 8,
};

const PERSONAL_YEAR_THEMES: Record<number, { theme: string; market: string }> = {
  1: { theme: "New beginnings, independence", market: "Market initiation, new trends emerge, IPO activity" },
  2: { theme: "Patience, partnership, cooperation", market: "Consolidation, M&A activity, sideways markets" },
  3: { theme: "Creativity, expansion, expression", market: "Growth phase, tech rallies, consumer spending up" },
  4: { theme: "Foundation, structure, hard work", market: "Infrastructure investment, regulatory frameworks, building" },
  5: { theme: "Change, volatility, freedom", market: "HIGH VOLATILITY, disruption, paradigm shifts, crypto surges" },
  6: { theme: "Responsibility, harmony, balance", market: "Stability, dividend stocks, defensive positioning" },
  7: { theme: "Analysis, introspection, research", market: "Cautious markets, R&D spending, value over growth" },
  8: { theme: "Power, material success, authority", market: "PEAK PROSPERITY, institutional confidence, bull market climax" },
  9: { theme: "Completion, endings, transformation", market: "Cycle endings, corrections, sector rotation, bear market risk" },
};

function reduceToDigit(n: number): number {
  while (n > 9 && n !== 11 && n !== 22 && n !== 33) {
    let sum = 0;
    while (n > 0) { sum += n % 10; n = Math.floor(n / 10); }
    n = sum;
  }
  return n;
}

export function getNameNumerology(name: string): { value: number; reducedValue: number; meaning: string } {
  const cleaned = name.toUpperCase().replace(/[^A-Z]/g, "");
  let total = 0;
  for (const ch of cleaned) {
    total += PYTHAGOREAN_MAP[ch] || 0;
  }
  const reduced = reduceToDigit(total);
  const theme = PERSONAL_YEAR_THEMES[reduced] || PERSONAL_YEAR_THEMES[reduced % 9 || 9];
  return {
    value: total,
    reducedValue: reduced,
    meaning: theme?.theme || "",
  };
}

export function getUniversalYearNumber(year: number): { number: number; theme: string; market: string } {
  const reduced = reduceToDigit(sumDigits(year));
  const info = PERSONAL_YEAR_THEMES[reduced] || PERSONAL_YEAR_THEMES[reduced % 9 || 9];
  return { number: reduced, ...info };
}

// ═══════════════════════════════════════════════════════════
// KONDRATIEFF WAVE
// ═══════════════════════════════════════════════════════════

export interface KondratieffPosition {
  wave: number;
  season: "Spring" | "Summer" | "Autumn" | "Winter";
  yearInWave: number;
  characteristics: string;
  marketImplication: string;
}

export function getKondratieffPosition(year: number): KondratieffPosition {
  // 5th wave started ~1970, 6th wave ~2010
  // Each wave ~54 years, each season ~13.5 years
  const waveStart = 2010; // 6th wave
  const waveDuration = 54;
  const seasonDuration = waveDuration / 4;

  const yearInWave = year - waveStart;
  const seasonIndex = Math.floor(yearInWave / seasonDuration);

  const seasons: Array<{ season: KondratieffPosition["season"]; chars: string; market: string }> = [
    { season: "Spring", chars: "Recovery, new tech adoption, rising prices, innovation boom", market: "Buy growth, tech, innovation. Early bull market. AI, biotech, clean energy leading." },
    { season: "Summer", chars: "Expansion peak, inflation pressure, geopolitical tension, commodity boom", market: "Rotate to commodities, inflation hedges. War risk elevated. Peak before correction." },
    { season: "Autumn", chars: "Financialization, speculation, asset bubbles, wealth inequality", market: "Financial assets inflate. Leverage increases. Watch for blow-off top. Gold accumulation phase." },
    { season: "Winter", chars: "Deleveraging, deflation, depression, creative destruction", market: "Cash is king. Defensive positioning. Government bonds. Wait for spring." },
  ];

  const idx = Math.max(0, Math.min(3, seasonIndex));
  const info = seasons[idx];

  return {
    wave: 6,
    season: info.season,
    yearInWave,
    characteristics: info.chars,
    marketImplication: info.market,
  };
}

// ═══════════════════════════════════════════════════════════
// COMPOSITE ESOTERIC READING FOR A DATE
// ═══════════════════════════════════════════════════════════

export interface EsotericReading {
  date: string;
  chineseNumerology: NumerologyScore;
  sexagenaryCycle: SexagenaryCycleInfo;
  flyingStars: FlyingStarReading;
  lunarPhase: LunarPhase;
  universalYear: { number: number; theme: string; market: string };
  gannCycles: GannTimeCycle[];
  piCycle: PiCyclePoint[];
  kondratieff: KondratieffPosition;
  compositeScore: number; // -10 to +10
  compositeOutlook: string;
}

export function getEsotericReading(date: Date): EsotericReading {
  const year = date.getFullYear();
  const dateStr = date.toISOString().split("T")[0];

  const chineseNumerology = scoreDateNumerology(date);
  const sexagenaryCycle = getSexagenaryCycle(year);
  const flyingStars = getFlyingStarReading(year);
  const lunarPhase = getLunarPhase(date);
  const universalYear = getUniversalYearNumber(year);
  const gannCycles = getGannCycles(date);
  const piCycle = getArmstrongPiCycle(date);
  const kondratieff = getKondratieffPosition(year);

  // Composite scoring (cultural context only, does NOT feed trading intensity)
  // These indicators are kept for curiosity/cultural context display.
  let score = 0;

  // Chinese numerology of the date
  score += Math.max(-3, Math.min(3, chineseNumerology.totalScore / 2));

  // Flying star center
  score += flyingStars.starInfo.score / 2;

  // Lunar phase
  score += lunarPhase.basisPoints / 2;

  // Universal year energy
  if (universalYear.number === 8) score += 2;
  if (universalYear.number === 5) score -= 1;
  if (universalYear.number === 9) score -= 0.5;

  // Sexagenary clashes
  score -= sexagenaryCycle.clashes.length * 0.5;
  score += sexagenaryCycle.harmonies.length * 0.3;

  // Pi cycle proximity (within 30 days of a turn = significant)
  const nearPi = piCycle.filter(p => Math.abs(p.daysFromNow) <= 30);
  if (nearPi.length > 0) {
    score += nearPi[0].type === "peak" ? 1 : -1;
  }

  // Kondratieff season
  if (kondratieff.season === "Spring") score += 1;
  if (kondratieff.season === "Winter") score -= 1;

  score = Math.round(Math.max(-10, Math.min(10, score)) * 100) / 100;

  const compositeOutlook = score >= 3
    ? "Multiple esoteric indicators align favorably. Expansion and prosperity signals dominant."
    : score >= 1
      ? "Mildly favorable alignment. Proceed with moderate confidence."
      : score >= -1
        ? "Mixed signals across esoteric frameworks. Exercise caution and wait for clarity."
        : score >= -3
          ? "Unfavorable alignment. Elevated risk of disruption, losses, or instability."
          : "Strongly adverse convergence. Defensive positioning recommended across all frameworks.";

  // NOTE: compositeScore is for cultural context display only.
  // Stripped from trading composite: lunar phase, Chinese zodiac, numerology,
  // flying stars, Kondratieff. These do NOT feed signal intensity or thesis confidence.
  // Kept in trading composite: Hebrew calendar, Islamic calendar, dual calendar
  // overlap, evangelical prophecy dates (fed as first-class event layers, not here).

  return {
    date: dateStr,
    chineseNumerology,
    sexagenaryCycle,
    flyingStars,
    lunarPhase,
    universalYear,
    gannCycles,
    piCycle,
    kondratieff,
    compositeScore: score,
    compositeOutlook,
  };
}
