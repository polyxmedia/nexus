import { db, schema } from "@/lib/db";
import { eq } from "drizzle-orm";
import { addKnowledge } from "./engine";
import { OPERATOR_BRIEFING } from "@/lib/chat/operator-briefing";

const XRP_THESIS_CONTENT = `# The XRP Thesis: Infrastructure for the Next Financial Order

XRP is not a cryptocurrency in the way most people understand the term. It is a pre-positioned settlement layer for a post-SWIFT financial architecture, built by an NSA-trained cryptographer, funded through the same lobbying infrastructure that sustains unconditional US military support for Israel, and entering its adoption phase precisely as the geopolitical conditions created by that same political apparatus generate structural demand for non-SWIFT cross-border settlement.

The same political apparatus that protects Israel from scrutiny deregulated crypto, dropped the SEC case, approved the ETFs, and installed the administration now launching strikes that create demand for XRP's core use case.

## The Structural Case

### 1. The Political Capture Pipeline
Ripple donated $25 million to Fairshake, the crypto super PAC. Fairshake spent in 65 congressional races in the 2024 cycle. Of those 65, 61 also featured spending from AIPAC. All 29 races targeted by the primary Fairshake super PAC also saw AIPAC spending. 100% overlap on the core targets.

Fairshake ($191M cash on hand for 2026) and AIPAC's United Democracy Project ($96M) are the two largest non-party super PACs in American politics. They target the same candidates, oppose the same progressives (Katie Porter, Jamaal Bowman, Cori Bush, Sherrod Brown), and produce the same outcomes.

Ripple's CLO Stuart Alderoty donated $300K+ to Trump-aligned PACs. A Ripple-linked lobbyist literally wrote the presidential social media post announcing XRP's inclusion in the US strategic crypto reserve. XRP surged 36% in one hour.

The pipeline: Ripple capital ($25M Fairshake + $5M inaugural fund + $300K+ PAC donations) -> political capture (same races as AIPAC, 61/65 overlap) -> regulatory outcome (SEC drops case, pro-crypto SEC chair installed) -> institutional infrastructure (7 ETFs approved, $1.5B AUM) -> geopolitical conditions (same administration launches Iran strikes, creating SWIFT disruption demand) -> XRP adoption benefits.

### 2. The NSA-to-SWIFT-Replacement Pipeline
David Schwartz, XRP Ledger's architect, filed US patent 5,025,369 in 1988 for a distributed computing system resembling DLT. He built encrypted systems for the NSA in the 1990s. He then designed the consensus protocol that XRP uses to settle transactions in 3-5 seconds at near-zero cost.

Schwartz stepped down as CTO in September 2025, moving to CTO Emeritus and the board. The technical architecture is complete. Arthur Britto, co-creator of the XRP Ledger, has never made a single public appearance. The first 32,569 blocks of the XRP Ledger were permanently deleted.

### 3. The SWIFT Disruption Thesis
The global cross-border payments market approached $1 quadrillion in 2024 (IMF). SWIFT processes roughly 45 million messages per business day across 11,000 institutions in 200+ countries. Cross-border payments revenue: $238 billion in 2026, growing to $336 billion by 2031.

Ripple's position: 300+ financial institution partnerships across 45 countries, CBDC platform engagements with 20+ central banks, $1.25B acquisition of Hidden Road (now Ripple Prime), $1B acquisition of GTreasury, six strategic acquisitions in 28 months.

$27 trillion sits in pre-funded correspondent banking accounts globally. XRP's value proposition is eliminating the need for these. Even 1% displacement = $270B in value flowing through XRP liquidity pools.

### 4. The Geopolitical Demand Catalyst
Operation Epic Fury (Feb 28, 2026) struck Iran. Hormuz is effectively closed. SWIFT has been weaponized as a sanctions tool against Russia and Iran. Countries sanctioned or threatened with SWIFT exclusion are actively seeking alternatives. On-chain data shows a spike in "sanctions-busting" flows through XRPL following the strikes.

The Bank of Israel published its digital shekel design document in March 2025, emphasizing interoperability with digital asset networks. GMT, Israel's largest financial services firm, is Ripple's official representative in Israel.

## 20-Year Price Projections

### Phase 1: Crisis and Compression (2026-2028) - $1-5 - 75% confidence
Current price ~$1.37. Down 62% from July 2025 high of $3.65 after five consecutive red months. ETF inflows need to reach $3-5B for sustained price above $3. SEC case fully resolved.

### Phase 2: Institutional Adoption (2028-2032) - $5-25 - 55% confidence
CBDC interoperability. If 3-5 central banks use Ripple's CBDC platform and XRP as bridge, liquidity requirement permanently raises the price floor. Ripple Prime brings $3T+ in annual clearing volume.

### Phase 3: Infrastructure Entrenchment (2032-2038) - $15-75 - 35% confidence
$5T daily SWIFT volume x 5% capture = $250B daily flow through XRP. At velocity of 10, requires $25B in XRP liquidity. With 55B circulating supply, prices XRP at roughly $45.

### Phase 4: Financial System Integration (2038-2042) - $50-200 - 20% confidence
De-dollarization trends need neutral bridge assets. AI-driven financial flows need instant settlement.

### Phase 5: New Financial Order (2042-2046) - $100-500+ or $0 - 10% confidence
Either XRP becomes global settlement infrastructure ($200-500) or is superseded ($0). Systemic fragmentation scenario: $30-80.

## What Each Price Level Implies
- $1-2: Speculative asset with ETF exposure
- $5-10: Regional settlement tool, select corridors
- $25-50: Major institutional settlement layer
- $100-200: Global bridge currency, SWIFT co-equal
- $500+: Dominant global settlement, full SWIFT replacement

## Risk Matrix
- War-driven risk-off 12+ months: 40% probability, HIGH impact
- CBDCs bypass XRP token entirely: 30%, HIGH impact
- Competing protocol captures market: 20%, HIGH impact
- Regulatory reversal (future admin): 15%, MEDIUM impact
- Quantum computing breaks XRPL: 10%, EXISTENTIAL
- Ripple centralization liability: 25%, HIGH impact

## Key Data Points
- 7 spot ETFs approved, $1.5B AUM, 810M XRP locked
- Ripple escrow: ~38B XRP releasing up to 1B/month
- Total supply: 100B fixed, circulating ~61B
- Market cap: ~$86B at $1.37
- Cross-border payments revenue: $238B in 2026, $336B by 2031
- $27T in nostro/vostro accounts globally

## The Supply Squeeze
ETFs lock XRP in custody. Institutional ODL requires liquidity pools. CBDC bridges require reserve balances. Ripple escrow releases are programmatic. As institutional demand absorbs supply from multiple directions simultaneously, circulating XRP tightens. This produces non-linear price moves.`;

export async function seedKnowledge() {
  // Check if already seeded
  const existing = db
    .select()
    .from(schema.knowledge)
    .where(eq(schema.knowledge.title, "The XRP Thesis: Infrastructure for the Next Financial Order"))
    ;

  if (existing) return { seeded: false, message: "Knowledge bank already seeded" };

  // Seed XRP thesis
  await addKnowledge({
    title: "The XRP Thesis: Infrastructure for the Next Financial Order",
    content: XRP_THESIS_CONTENT,
    category: "thesis",
    tags: JSON.stringify(["xrp", "ripple", "swift", "crypto", "settlement", "infrastructure", "aipac", "fairshake", "political-capture", "hormuz", "iran"]),
    source: "buildingbetter.tech / March 2026",
    confidence: 0.85,
    status: "active",
  });

  // Seed operator briefing
  await addKnowledge({
    title: "Operator Context: US-Iran War & Portfolio Positioning",
    content: OPERATOR_BRIEFING,
    category: "geopolitical",
    tags: JSON.stringify(["iran", "hormuz", "oil", "war", "portfolio", "gold", "shell", "rklb", "operator", "thesis"]),
    source: "Operator briefing / March 2026",
    confidence: 0.95,
    status: "active",
    validFrom: "2026-02-28",
  });

  return { seeded: true, message: "Seeded 2 knowledge entries" };
}
