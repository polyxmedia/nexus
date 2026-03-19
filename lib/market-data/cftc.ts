/**
 * CFTC Commitment of Traders (COT) Data
 * =======================================
 * Free weekly data from the CFTC. No API key needed.
 *
 * Shows how commercial hedgers vs speculators are positioned in futures.
 * When commercials and specs diverge massively, reversals follow.
 * Commercials are usually right at extremes.
 *
 * Source: CFTC via Quandl/data.gov open datasets
 */

const CFTC_API = "https://publicreporting.cftc.gov/resource/jun7-fc8e.json";

// Key futures contracts to track
const TRACKED_CONTRACTS: Record<string, string> = {
  "CRUDE OIL, LIGHT SWEET": "WTI Crude",
  "GOLD": "Gold",
  "SILVER": "Silver",
  "NATURAL GAS": "Natural Gas",
  "E-MINI S&P 500": "S&P 500",
  "NASDAQ MINI": "Nasdaq",
  "U.S. DOLLAR INDEX": "Dollar Index",
  "EURO FX": "Euro",
  "JAPANESE YEN": "Japanese Yen",
  "BRITISH POUND": "British Pound",
  "10-YEAR U.S. TREASURY NOTES": "10Y Treasury",
  "2-YEAR U.S. TREASURY NOTES": "2Y Treasury",
  "CORN": "Corn",
  "SOYBEANS": "Soybeans",
  "WHEAT-SRW": "Wheat",
  "COPPER": "Copper",
};

export interface COTPosition {
  contract: string;
  displayName: string;
  reportDate: string;
  // Commercial (hedgers - usually the "smart money")
  commercialLong: number;
  commercialShort: number;
  commercialNet: number;
  // Non-commercial (speculators - large traders, hedge funds)
  specLong: number;
  specShort: number;
  specNet: number;
  // Non-reportable (retail)
  retailNet: number;
  // Derived
  openInterest: number;
  specNetPctOI: number; // spec net as % of open interest (extremes signal reversals)
  commercialNetPctOI: number;
}

export interface COTAnalysis {
  positions: COTPosition[];
  extremePositions: Array<{
    contract: string;
    direction: "extremely_long" | "extremely_short";
    specNetPctOI: number;
    signal: string;
  }>;
  reportDate: string;
  summary: string;
}

/**
 * Fetch latest COT data for tracked contracts.
 */
export async function getCOTData(): Promise<COTAnalysis> {
  try {
    // CFTC Socrata API - futures only, most recent report
    const params = new URLSearchParams({
      "$order": "report_date_as_yyyy_mm_dd DESC",
      "$limit": "200",
      "$where": `report_date_as_yyyy_mm_dd > '${getDateWeeksAgo(2)}'`,
    });

    const res = await fetch(`${CFTC_API}?${params}`, {
      signal: AbortSignal.timeout(12_000),
      headers: { "Accept": "application/json" },
    });

    if (!res.ok) {
      console.error(`[CFTC] API returned ${res.status}`);
      return fallbackCOT();
    }

    const raw = await res.json();
    if (!Array.isArray(raw) || raw.length === 0) return fallbackCOT();

    const reportDate = raw[0]?.report_date_as_yyyy_mm_dd || "";
    const positions: COTPosition[] = [];

    for (const row of raw) {
      const contractName = (row.contract_market_name || "").toUpperCase();
      const displayName = findDisplayName(contractName);
      if (!displayName) continue;

      // Skip duplicates (take first/most recent)
      if (positions.some(p => p.displayName === displayName)) continue;

      const commLong = parseInt(row.comm_positions_long_all || "0", 10);
      const commShort = parseInt(row.comm_positions_short_all || "0", 10);
      const specLong = parseInt(row.noncomm_positions_long_all || "0", 10);
      const specShort = parseInt(row.noncomm_positions_short_all || "0", 10);
      const nonrepLong = parseInt(row.nonrept_positions_long_all || "0", 10);
      const nonrepShort = parseInt(row.nonrept_positions_short_all || "0", 10);
      const oi = parseInt(row.open_interest_all || "1", 10);

      const specNet = specLong - specShort;
      const commNet = commLong - commShort;
      const retailNet = nonrepLong - nonrepShort;

      positions.push({
        contract: contractName,
        displayName,
        reportDate: row.report_date_as_yyyy_mm_dd || reportDate,
        commercialLong: commLong,
        commercialShort: commShort,
        commercialNet: commNet,
        specLong,
        specShort,
        specNet,
        retailNet,
        openInterest: oi,
        specNetPctOI: oi > 0 ? Math.round((specNet / oi) * 10000) / 100 : 0,
        commercialNetPctOI: oi > 0 ? Math.round((commNet / oi) * 10000) / 100 : 0,
      });
    }

    // Detect extreme positions
    const extremes: COTAnalysis["extremePositions"] = [];
    for (const p of positions) {
      if (p.specNetPctOI > 30) {
        extremes.push({
          contract: p.displayName,
          direction: "extremely_long",
          specNetPctOI: p.specNetPctOI,
          signal: `Speculators are extremely long ${p.displayName} (${p.specNetPctOI}% of OI). Commercials are likely short. Contrarian signal: potential reversal lower.`,
        });
      } else if (p.specNetPctOI < -30) {
        extremes.push({
          contract: p.displayName,
          direction: "extremely_short",
          specNetPctOI: p.specNetPctOI,
          signal: `Speculators are extremely short ${p.displayName} (${p.specNetPctOI}% of OI). Commercials are likely long. Contrarian signal: potential reversal higher.`,
        });
      }
    }

    const summary = `COT report dated ${reportDate}. ${positions.length} contracts tracked. ` +
      `${extremes.length} extreme positioning${extremes.length > 0 ? ": " + extremes.map(e => `${e.contract} (${e.direction})`).join(", ") : ""}.`;

    return { positions, extremePositions: extremes, reportDate, summary };
  } catch (err) {
    console.error("[CFTC] COT fetch failed:", err);
    return fallbackCOT();
  }
}

function findDisplayName(contractName: string): string | null {
  for (const [key, display] of Object.entries(TRACKED_CONTRACTS)) {
    if (contractName.includes(key)) return display;
  }
  return null;
}

function getDateWeeksAgo(weeks: number): string {
  const d = new Date();
  d.setDate(d.getDate() - weeks * 7);
  return d.toISOString().split("T")[0];
}

function fallbackCOT(): COTAnalysis {
  return {
    positions: [],
    extremePositions: [],
    reportDate: "",
    summary: "COT data unavailable. CFTC API may be temporarily offline.",
  };
}
