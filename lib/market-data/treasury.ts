/**
 * US Treasury Auction Data
 * ========================
 * Free, no API key. TreasuryDirect API.
 *
 * Auction results show real demand for US debt.
 * A failed auction or low bid-to-cover is a crisis signal.
 * Foreign central bank participation declining = de-dollarization signal.
 */

const BASE_URL = "https://api.fiscaldata.treasury.gov/services/api/fiscal_service";

export interface TreasuryAuction {
  cusip: string;
  securityType: string; // Bill, Note, Bond, TIPS, FRN
  securityTerm: string; // 4-Week, 2-Year, 10-Year, etc.
  auctionDate: string;
  issueDate: string;
  maturityDate: string;
  highYield: number | null; // winning yield
  bidToCoverRatio: number | null; // demand indicator (>2.5 = strong, <2 = weak)
  totalAccepted: number | null; // $ millions
  totalTendered: number | null; // $ millions
  allocationPctIndirect: number | null; // foreign central bank proxy
  allocationPctDirect: number | null; // domestic buyers
  allocationPctPrimary: number | null; // primary dealers (forced buyers)
}

/**
 * Fetch recent Treasury auction results.
 * @param limit Number of recent auctions (default 20)
 * @param securityType Filter by type: Bill, Note, Bond, TIPS
 */
export async function getRecentAuctions(
  limit = 20,
  securityType?: string
): Promise<TreasuryAuction[]> {
  try {
    const params = new URLSearchParams({
      sort: "-auction_date",
      page: "[size]=" + limit,
      format: "json",
      fields: "cusip,security_type,security_term,auction_date,issue_date,maturity_date,high_yield,bid_to_cover_ratio,total_accepted,total_tendered,percentage_debt_purchased_by_direct_bidders,percentage_debt_purchased_by_indirect_bidders,percentage_debt_purchased_by_primary_dealers",
    });
    if (securityType) params.set("filter", `security_type:eq:${securityType}`);

    const url = `${BASE_URL}/v1/accounting/od/auctions_query?${params}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(10_000) });
    if (!res.ok) return [];

    const data = await res.json();
    const records = data?.data || [];

    return records.map((r: Record<string, string | null>) => ({
      cusip: r.cusip || "",
      securityType: r.security_type || "",
      securityTerm: r.security_term || "",
      auctionDate: r.auction_date || "",
      issueDate: r.issue_date || "",
      maturityDate: r.maturity_date || "",
      highYield: r.high_yield ? parseFloat(r.high_yield) : null,
      bidToCoverRatio: r.bid_to_cover_ratio ? parseFloat(r.bid_to_cover_ratio) : null,
      totalAccepted: r.total_accepted ? parseFloat(r.total_accepted) : null,
      totalTendered: r.total_tendered ? parseFloat(r.total_tendered) : null,
      allocationPctIndirect: r.percentage_debt_purchased_by_indirect_bidders ? parseFloat(r.percentage_debt_purchased_by_indirect_bidders) : null,
      allocationPctDirect: r.percentage_debt_purchased_by_direct_bidders ? parseFloat(r.percentage_debt_purchased_by_direct_bidders) : null,
      allocationPctPrimary: r.percentage_debt_purchased_by_primary_dealers ? parseFloat(r.percentage_debt_purchased_by_primary_dealers) : null,
    }));
  } catch (err) {
    console.error("[Treasury] Auction fetch failed:", err);
    return [];
  }
}

/**
 * Analyze recent auction health.
 * Returns stress indicators based on bid-to-cover and allocation patterns.
 */
export async function analyzeAuctionHealth(): Promise<{
  recentAuctions: TreasuryAuction[];
  avgBidToCover: number;
  weakAuctions: number; // bid-to-cover < 2.0
  avgIndirectPct: number; // foreign central bank proxy
  indirectTrend: "increasing" | "decreasing" | "stable";
  stress: "low" | "moderate" | "high";
  summary: string;
}> {
  const auctions = await getRecentAuctions(30);
  const withBtc = auctions.filter(a => a.bidToCoverRatio != null);

  const avgBtc = withBtc.length > 0
    ? withBtc.reduce((s, a) => s + (a.bidToCoverRatio || 0), 0) / withBtc.length
    : 0;

  const weakAuctions = withBtc.filter(a => (a.bidToCoverRatio || 0) < 2.0).length;

  const withIndirect = auctions.filter(a => a.allocationPctIndirect != null);
  const avgIndirect = withIndirect.length > 0
    ? withIndirect.reduce((s, a) => s + (a.allocationPctIndirect || 0), 0) / withIndirect.length
    : 0;

  // Trend: compare first half vs second half
  let indirectTrend: "increasing" | "decreasing" | "stable" = "stable";
  if (withIndirect.length >= 10) {
    const half = Math.floor(withIndirect.length / 2);
    const recentAvg = withIndirect.slice(0, half).reduce((s, a) => s + (a.allocationPctIndirect || 0), 0) / half;
    const olderAvg = withIndirect.slice(half).reduce((s, a) => s + (a.allocationPctIndirect || 0), 0) / (withIndirect.length - half);
    if (recentAvg > olderAvg * 1.05) indirectTrend = "increasing";
    else if (recentAvg < olderAvg * 0.95) indirectTrend = "decreasing";
  }

  const stress = weakAuctions >= 5 ? "high" : weakAuctions >= 2 ? "moderate" : "low";

  const summary = `${auctions.length} recent auctions. Avg bid-to-cover: ${avgBtc.toFixed(2)}. ` +
    `${weakAuctions} weak auctions (BTC < 2.0). ` +
    `Foreign participation avg ${avgIndirect.toFixed(1)}% (${indirectTrend}). ` +
    `Stress level: ${stress}.`;

  return {
    recentAuctions: auctions.slice(0, 10),
    avgBidToCover: Math.round(avgBtc * 100) / 100,
    weakAuctions,
    avgIndirectPct: Math.round(avgIndirect * 10) / 10,
    indirectTrend,
    stress,
    summary,
  };
}
