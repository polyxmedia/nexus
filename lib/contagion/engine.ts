/**
 * Cross-Asset Contagion Engine
 *
 * Models how a shock in one asset/sector cascades through the financial
 * system to related assets. Captures 2nd and 3rd order effects that
 * most analysts miss.
 *
 * "500M barrels of oil released" -> crude down -> airlines up ->
 * petrochemicals margins improve -> EV stocks pull back ->
 * inflation expectations shift -> rate-sensitive assets rally
 *
 * The money is in the cascade.
 */

// ── Types ──

export interface ContagionEdge {
  from: string;
  to: string;
  relationship: "supply_chain" | "competitor" | "hedge" | "currency" | "commodity_input" | "sector" | "macro" | "policy";
  direction: "positive" | "negative" | "complex";
  strength: number; // 0-1
  lag: "immediate" | "1d" | "1w" | "1m";
  mechanism: string;
}

export interface ContagionEvent {
  trigger: string;
  sourceAsset: string;
  shockMagnitude: number; // e.g., -0.10 for 10% drop
  shockType: "price" | "policy" | "geopolitical" | "supply" | "demand";
}

export interface ContagionImpact {
  asset: string;
  expectedMove: number;
  direction: "up" | "down";
  confidence: number;
  order: number;
  pathway: string[];
  mechanism: string;
  lag: string;
  tradingImplication: string;
}

export interface ContagionResult {
  trigger: ContagionEvent;
  propagatedAt: string;
  impacts: ContagionImpact[];
  totalAssetsAffected: number;
  highestOrderReached: number;
}

// ── Contagion Graph ──

const EDGES: ContagionEdge[] = [
  // ─── ENERGY CHAIN ───
  { from: "CL", to: "JETS", relationship: "supply_chain", direction: "negative", strength: 0.75, lag: "immediate", mechanism: "Fuel costs are 25-35% of airline operating expenses; crude price spikes compress margins directly" },
  { from: "CL", to: "OIH", relationship: "supply_chain", direction: "positive", strength: 0.85, lag: "immediate", mechanism: "Higher crude prices increase drilling activity and demand for oil field services" },
  { from: "CL", to: "VLO", relationship: "supply_chain", direction: "complex", strength: 0.6, lag: "1d", mechanism: "Refiner margins depend on crack spread (refined product price minus crude cost); rapid crude moves compress spreads temporarily" },
  { from: "CL", to: "LYB", relationship: "commodity_input", direction: "negative", strength: 0.55, lag: "1d", mechanism: "Petrochemical feedstock costs rise with crude, compressing margins for ethylene and polyethylene producers" },
  { from: "CL", to: "TAN", relationship: "competitor", direction: "positive", strength: 0.4, lag: "1w", mechanism: "Expensive fossil fuels accelerate renewable energy adoption and investment thesis" },
  { from: "CL", to: "UUP", relationship: "currency", direction: "positive", strength: 0.35, lag: "1d", mechanism: "Petrodollar recycling: oil exporters receive USD, increasing demand for dollar assets" },
  { from: "CL", to: "TIP", relationship: "macro", direction: "positive", strength: 0.6, lag: "1w", mechanism: "Energy is 7-8% of CPI; sustained crude moves feed through to inflation expectations within weeks" },
  { from: "CL", to: "XLY", relationship: "macro", direction: "negative", strength: 0.45, lag: "1w", mechanism: "Higher gas prices reduce consumer discretionary spending power, especially lower-income households" },
  { from: "CL", to: "IYT", relationship: "supply_chain", direction: "negative", strength: 0.65, lag: "immediate", mechanism: "Transportation sector fuel costs directly impacted; trucking, shipping, rail margins compress" },
  { from: "CL", to: "XLE", relationship: "sector", direction: "positive", strength: 0.9, lag: "immediate", mechanism: "Energy sector ETF moves almost 1:1 with crude oil prices" },
  { from: "CL", to: "EEM", relationship: "macro", direction: "positive", strength: 0.3, lag: "1w", mechanism: "Many EM economies are commodity exporters; higher oil benefits Russia, Brazil, Middle East, Nigeria" },
  { from: "CL", to: "XOM", relationship: "sector", direction: "positive", strength: 0.85, lag: "immediate", mechanism: "ExxonMobil revenue directly tied to crude price realization" },
  { from: "CL", to: "CVX", relationship: "sector", direction: "positive", strength: 0.85, lag: "immediate", mechanism: "Chevron upstream earnings scale with crude price" },

  // ─── NATURAL GAS CHAIN ───
  { from: "NG", to: "XLU", relationship: "commodity_input", direction: "negative", strength: 0.55, lag: "1d", mechanism: "Natural gas is primary fuel for electricity generation; higher gas = higher utility input costs" },
  { from: "NG", to: "UNG", relationship: "sector", direction: "positive", strength: 0.95, lag: "immediate", mechanism: "UNG directly tracks natural gas futures" },
  { from: "NG", to: "LNG", relationship: "supply_chain", direction: "positive", strength: 0.7, lag: "immediate", mechanism: "Cheniere Energy profits from LNG export arbitrage; higher gas prices widen international spreads" },

  // ─── RATES CHAIN ───
  { from: "FED_RATE", to: "XLF", relationship: "macro", direction: "positive", strength: 0.7, lag: "immediate", mechanism: "Higher rates widen bank net interest margins; loan yields rise faster than deposit costs" },
  { from: "FED_RATE", to: "QQQ", relationship: "macro", direction: "negative", strength: 0.65, lag: "immediate", mechanism: "Growth stocks valued on discounted cash flows; higher rates increase discount rate, reducing present value" },
  { from: "FED_RATE", to: "VNQ", relationship: "macro", direction: "negative", strength: 0.7, lag: "1d", mechanism: "REITs compete with risk-free rate for yield investors; higher rates = cap rate expansion = lower property values" },
  { from: "FED_RATE", to: "UUP", relationship: "currency", direction: "positive", strength: 0.6, lag: "immediate", mechanism: "Higher US rates attract carry trade capital flows into dollar-denominated assets" },
  { from: "FED_RATE", to: "GLD", relationship: "macro", direction: "negative", strength: 0.5, lag: "1d", mechanism: "Gold pays no yield; higher real rates increase the opportunity cost of holding gold" },
  { from: "FED_RATE", to: "EEM", relationship: "macro", direction: "negative", strength: 0.6, lag: "1w", mechanism: "EM countries with dollar-denominated debt face higher servicing costs; capital flows reverse to US" },
  { from: "FED_RATE", to: "XHB", relationship: "macro", direction: "negative", strength: 0.75, lag: "1w", mechanism: "Mortgage rates track Treasury yields; higher rates reduce housing affordability and transaction volume" },
  { from: "FED_RATE", to: "TLT", relationship: "macro", direction: "negative", strength: 0.85, lag: "immediate", mechanism: "Long-duration Treasury bond prices fall as yields rise (inverse price-yield relationship)" },
  { from: "FED_RATE", to: "HYG", relationship: "macro", direction: "negative", strength: 0.5, lag: "1d", mechanism: "High-yield bonds face repricing as risk-free rate rises; credit spreads often widen" },

  // ─── CREDIT CHAIN ───
  { from: "HYG", to: "XLF", relationship: "macro", direction: "positive", strength: 0.45, lag: "1d", mechanism: "Credit stress in high-yield signals banking sector loan loss risk; bank stocks correlate with credit conditions" },
  { from: "HYG", to: "IWM", relationship: "macro", direction: "positive", strength: 0.5, lag: "1d", mechanism: "Small caps rely on credit markets for funding; tight credit conditions disproportionately hit smaller companies" },

  // ─── DOLLAR CHAIN ───
  { from: "UUP", to: "EEM", relationship: "currency", direction: "negative", strength: 0.65, lag: "immediate", mechanism: "Strong dollar increases EM debt burden (dollar-denominated) and reduces commodity export revenues" },
  { from: "UUP", to: "GLD", relationship: "currency", direction: "negative", strength: 0.55, lag: "immediate", mechanism: "Gold priced in USD; stronger dollar makes gold more expensive for international buyers" },
  { from: "UUP", to: "CL", relationship: "currency", direction: "negative", strength: 0.35, lag: "1d", mechanism: "Commodities priced in USD; strong dollar reduces demand from non-dollar economies" },
  { from: "UUP", to: "SPY", relationship: "macro", direction: "negative", strength: 0.25, lag: "1w", mechanism: "S&P 500 companies earn ~40% of revenue abroad; strong dollar reduces translated earnings" },

  // ─── GEOPOLITICAL: TAIWAN ───
  { from: "TAIWAN_CONFLICT", to: "SMH", relationship: "supply_chain", direction: "negative", strength: 0.9, lag: "immediate", mechanism: "TSMC produces 90% of advanced chips; Taiwan conflict halts semiconductor supply globally" },
  { from: "TAIWAN_CONFLICT", to: "TSM", relationship: "supply_chain", direction: "negative", strength: 0.95, lag: "immediate", mechanism: "TSMC operations directly at risk in any Taiwan contingency" },
  { from: "TAIWAN_CONFLICT", to: "ITA", relationship: "macro", direction: "positive", strength: 0.8, lag: "immediate", mechanism: "Defense spending surges in response to Pacific theater escalation" },
  { from: "TAIWAN_CONFLICT", to: "BDRY", relationship: "supply_chain", direction: "negative", strength: 0.7, lag: "1d", mechanism: "Taiwan Strait carries 50% of global container traffic; disruption collapses shipping routes" },
  { from: "TAIWAN_CONFLICT", to: "AAPL", relationship: "supply_chain", direction: "negative", strength: 0.7, lag: "1d", mechanism: "Apple's chip supply from TSMC and assembly in China/Taiwan both disrupted" },
  { from: "TAIWAN_CONFLICT", to: "GLD", relationship: "hedge", direction: "positive", strength: 0.6, lag: "immediate", mechanism: "Safe-haven demand spikes during major geopolitical crises" },
  { from: "TAIWAN_CONFLICT", to: "VIX", relationship: "macro", direction: "positive", strength: 0.85, lag: "immediate", mechanism: "Geopolitical uncertainty drives volatility premium across all asset classes" },

  // ─── GEOPOLITICAL: HORMUZ ───
  { from: "HORMUZ_CLOSURE", to: "CL", relationship: "supply_chain", direction: "positive", strength: 0.95, lag: "immediate", mechanism: "21% of global oil passes through Strait of Hormuz; closure removes ~21M barrels/day from market" },
  { from: "HORMUZ_CLOSURE", to: "NG", relationship: "supply_chain", direction: "positive", strength: 0.8, lag: "immediate", mechanism: "Qatar is world's largest LNG exporter; Hormuz closure blocks LNG tanker routes" },
  { from: "HORMUZ_CLOSURE", to: "ITA", relationship: "macro", direction: "positive", strength: 0.7, lag: "1d", mechanism: "Military response to keep strait open drives defense spending and contractor revenue" },
  { from: "HORMUZ_CLOSURE", to: "GLD", relationship: "hedge", direction: "positive", strength: 0.65, lag: "immediate", mechanism: "Middle East crisis triggers safe-haven flows into gold" },

  // ─── GEOPOLITICAL: RUSSIA/UKRAINE ───
  { from: "RUSSIA_SANCTIONS", to: "WEAT", relationship: "supply_chain", direction: "positive", strength: 0.75, lag: "1d", mechanism: "Russia and Ukraine together export ~30% of global wheat; sanctions and conflict disrupt supply" },
  { from: "RUSSIA_SANCTIONS", to: "NG", relationship: "supply_chain", direction: "positive", strength: 0.7, lag: "1d", mechanism: "European gas supply historically ~40% Russian; sanctions force expensive LNG alternatives" },
  { from: "RUSSIA_SANCTIONS", to: "URA", relationship: "supply_chain", direction: "positive", strength: 0.5, lag: "1w", mechanism: "Russia enriches ~44% of global uranium; sanctions create supply uncertainty for nuclear fuel" },
  { from: "RUSSIA_SANCTIONS", to: "PALL", relationship: "supply_chain", direction: "positive", strength: 0.6, lag: "1d", mechanism: "Russia produces ~40% of global palladium; sanctions disrupt automotive catalyst supply chain" },

  // ─── CHINA CHAIN ───
  { from: "CHINA_STIMULUS", to: "COPX", relationship: "macro", direction: "positive", strength: 0.75, lag: "1w", mechanism: "China consumes 50% of global copper; infrastructure stimulus directly increases copper demand" },
  { from: "CHINA_STIMULUS", to: "FXI", relationship: "macro", direction: "positive", strength: 0.8, lag: "immediate", mechanism: "Stimulus directly supports Chinese equity valuations and earnings growth" },
  { from: "CHINA_STIMULUS", to: "EWA", relationship: "macro", direction: "positive", strength: 0.6, lag: "1w", mechanism: "Australia exports iron ore, coal, LNG to China; stimulus increases commodity import demand" },
  { from: "CHINA_STIMULUS", to: "BHP", relationship: "macro", direction: "positive", strength: 0.65, lag: "1w", mechanism: "BHP's iron ore revenue heavily dependent on Chinese steel production" },
  { from: "CHINA_SLOWDOWN", to: "COPX", relationship: "macro", direction: "negative", strength: 0.75, lag: "1w", mechanism: "Chinese construction slowdown reduces copper demand; property crisis amplifies effect" },
  { from: "CHINA_SLOWDOWN", to: "EWA", relationship: "macro", direction: "negative", strength: 0.6, lag: "1w", mechanism: "Australian commodity exports decline with Chinese demand" },
  { from: "CHINA_SLOWDOWN", to: "LVMH", relationship: "macro", direction: "negative", strength: 0.5, lag: "1w", mechanism: "Chinese consumers are largest luxury goods market; slowdown reduces discretionary spending" },

  // ─── SEMICONDUCTOR CHAIN ───
  { from: "SMH", to: "NVDA", relationship: "sector", direction: "positive", strength: 0.85, lag: "immediate", mechanism: "NVIDIA is largest SMH component; sector-wide moves directly impact" },
  { from: "SMH", to: "AMD", relationship: "sector", direction: "positive", strength: 0.8, lag: "immediate", mechanism: "AMD competes in same markets; sector sentiment flows through" },
  { from: "SMH", to: "AAPL", relationship: "supply_chain", direction: "positive", strength: 0.5, lag: "1d", mechanism: "Apple is TSMC's largest customer; chip supply constraints affect product launches" },
  { from: "SMH", to: "MSFT", relationship: "supply_chain", direction: "positive", strength: 0.4, lag: "1d", mechanism: "Microsoft's AI infrastructure depends on GPU/chip availability from NVIDIA, AMD" },

  // ─── VOLATILITY CHAIN ───
  { from: "VIX", to: "SPY", relationship: "hedge", direction: "negative", strength: 0.8, lag: "immediate", mechanism: "VIX measures implied volatility of S&P 500 options; spikes inversely correlate with equity prices" },
  { from: "VIX", to: "GLD", relationship: "hedge", direction: "positive", strength: 0.4, lag: "1d", mechanism: "Rising volatility triggers safe-haven demand flows into gold" },
  { from: "VIX", to: "TLT", relationship: "hedge", direction: "positive", strength: 0.45, lag: "immediate", mechanism: "Flight to quality during volatility spikes pushes Treasury prices up (yields down)" },
  { from: "VIX", to: "HYG", relationship: "macro", direction: "negative", strength: 0.55, lag: "1d", mechanism: "Volatility spikes widen credit spreads; high-yield bonds sell off as risk appetite contracts" },

  // ─── GOLD CHAIN ───
  { from: "GLD", to: "GDX", relationship: "sector", direction: "positive", strength: 0.9, lag: "immediate", mechanism: "Gold miners are leveraged play on gold price; 3-5x sensitivity to spot price changes" },
  { from: "GLD", to: "SLV", relationship: "sector", direction: "positive", strength: 0.7, lag: "1d", mechanism: "Silver and gold are correlated precious metals; silver often moves with gold but with higher beta" },

  // ─── CRYPTO CHAIN ───
  { from: "BTC", to: "ETH", relationship: "sector", direction: "positive", strength: 0.8, lag: "immediate", mechanism: "Crypto market follows Bitcoin's lead; ETH beta to BTC is approximately 1.2-1.5x" },
  { from: "BTC", to: "MSTR", relationship: "sector", direction: "positive", strength: 0.9, lag: "immediate", mechanism: "MicroStrategy holds ~190K BTC; stock acts as leveraged Bitcoin proxy" },
  { from: "BTC", to: "COIN", relationship: "sector", direction: "positive", strength: 0.75, lag: "immediate", mechanism: "Coinbase trading revenue correlates with crypto market volume and price levels" },

  // ─── INFLATION CHAIN ───
  { from: "TIP", to: "GLD", relationship: "macro", direction: "positive", strength: 0.5, lag: "1w", mechanism: "Rising inflation expectations increase gold's appeal as inflation hedge" },
  { from: "TIP", to: "TLT", relationship: "macro", direction: "negative", strength: 0.6, lag: "1d", mechanism: "Higher inflation expectations push nominal yields up, depressing long-duration bond prices" },
  { from: "TIP", to: "XLU", relationship: "macro", direction: "negative", strength: 0.35, lag: "1w", mechanism: "Inflation erodes real returns of bond-proxy utility stocks; rate hike expectations hurt valuations" },
];

// Aliases: map common names to canonical tickers/events
const ALIASES: Record<string, string> = {
  "crude oil": "CL", "oil": "CL", "wti": "CL", "brent": "CL", "crude": "CL",
  "USO": "CL", "uso": "CL",
  "natural gas": "NG", "natgas": "NG", "UNG": "NG",
  "gold": "GLD", "gld": "GLD", "xau": "GLD",
  "silver": "SLV", "slv": "SLV",
  "bitcoin": "BTC", "btc": "BTC",
  "ethereum": "ETH", "eth": "ETH",
  "dollar": "UUP", "usd": "UUP", "dxy": "UUP",
  "fed": "FED_RATE", "federal reserve": "FED_RATE", "interest rate": "FED_RATE", "fed rate": "FED_RATE",
  "taiwan": "TAIWAN_CONFLICT", "taiwan strait": "TAIWAN_CONFLICT", "tsmc": "TAIWAN_CONFLICT",
  "hormuz": "HORMUZ_CLOSURE", "strait of hormuz": "HORMUZ_CLOSURE",
  "russia": "RUSSIA_SANCTIONS", "russia sanctions": "RUSSIA_SANCTIONS", "ukraine": "RUSSIA_SANCTIONS",
  "china stimulus": "CHINA_STIMULUS", "china slowdown": "CHINA_SLOWDOWN",
  "semiconductors": "SMH", "chips": "SMH",
  "volatility": "VIX", "vix": "VIX",
  "inflation": "TIP", "cpi": "TIP",
  "SPY": "SPY", "spy": "SPY", "s&p": "SPY", "sp500": "SPY",
};

function resolveAsset(input: string): string {
  return ALIASES[input.toLowerCase()] || ALIASES[input] || input.toUpperCase();
}

// ── Order decay factors ──
const ORDER_DECAY: Record<number, number> = {
  1: 1.0,
  2: 0.55,
  3: 0.30,
};

// ── Core Functions ──

/**
 * Get all contagion edges originating from a specific asset.
 */
export function getContagionEdges(asset: string): ContagionEdge[] {
  const resolved = resolveAsset(asset);
  return EDGES.filter(e => e.from === resolved);
}

/**
 * Get all edges in the contagion graph.
 */
export function getFullGraph(): { edges: ContagionEdge[]; assets: string[] } {
  const assets = new Set<string>();
  for (const edge of EDGES) {
    assets.add(edge.from);
    assets.add(edge.to);
  }
  return { edges: EDGES, assets: [...assets].sort() };
}

/**
 * Find all contagion paths between two assets.
 */
export function findContagionPaths(
  from: string,
  to: string,
  maxDepth: number = 3,
): ContagionEdge[][] {
  const resolvedFrom = resolveAsset(from);
  const resolvedTo = resolveAsset(to);
  const paths: ContagionEdge[][] = [];

  function dfs(current: string, target: string, path: ContagionEdge[], visited: Set<string>) {
    if (path.length > maxDepth) return;
    if (current === target && path.length > 0) {
      paths.push([...path]);
      return;
    }

    const edges = EDGES.filter(e => e.from === current && !visited.has(e.to));
    for (const edge of edges) {
      visited.add(edge.to);
      path.push(edge);
      dfs(edge.to, target, path, visited);
      path.pop();
      visited.delete(edge.to);
    }
  }

  const visited = new Set<string>([resolvedFrom]);
  dfs(resolvedFrom, resolvedTo, [], visited);
  return paths;
}

/**
 * Propagate a shock through the contagion graph.
 * This is the main function. Given "oil drops 10%", it returns
 * every asset affected, the expected move, and the causal chain.
 */
export function propagateShock(
  event: ContagionEvent,
  maxOrder: number = 3,
): ContagionResult {
  const source = resolveAsset(event.sourceAsset);
  const impacts = new Map<string, ContagionImpact>();

  function propagate(
    currentAsset: string,
    currentMagnitude: number,
    order: number,
    pathway: string[],
    visited: Set<string>,
  ) {
    if (order > maxOrder) return;

    const edges = EDGES.filter(e => e.from === currentAsset);

    for (const edge of edges) {
      if (visited.has(edge.to)) continue;

      // Calculate expected move
      const decay = ORDER_DECAY[order] || 0.15;
      let moveSign = 1;
      if (edge.direction === "negative") moveSign = -1;
      if (edge.direction === "complex") moveSign = currentMagnitude > 0 ? 0.5 : -0.5;

      const expectedMove = currentMagnitude * edge.strength * moveSign * decay;
      const absMove = Math.abs(expectedMove);

      // Skip negligible moves
      if (absMove < 0.001) continue;

      const direction: "up" | "down" = expectedMove > 0 ? "up" : "down";
      const fullPathway = [...pathway, edge.to];

      // Build mechanism chain
      const mechanismParts: string[] = [];
      if (order === 1) {
        mechanismParts.push(edge.mechanism);
      } else {
        mechanismParts.push(`Via ${pathway[pathway.length - 1]}: ${edge.mechanism}`);
      }

      // Generate trading implication
      const tradingImplication = generateTradingImplication(
        edge.to, direction, absMove, order, edge.lag,
      );

      const impact: ContagionImpact = {
        asset: edge.to,
        expectedMove: Math.round(expectedMove * 10000) / 10000,
        direction,
        confidence: Math.max(0.1, edge.strength * decay * (1 - (order - 1) * 0.2)),
        order,
        pathway: fullPathway,
        mechanism: mechanismParts.join(". "),
        lag: edge.lag,
        tradingImplication,
      };

      // Keep highest-confidence impact per asset
      const existing = impacts.get(edge.to);
      if (!existing || impact.confidence > existing.confidence) {
        impacts.set(edge.to, impact);
      }

      // Recurse for next order
      visited.add(edge.to);
      propagate(edge.to, expectedMove, order + 1, fullPathway, visited);
      visited.delete(edge.to);
    }
  }

  const visited = new Set<string>([source]);
  propagate(source, event.shockMagnitude, 1, [source], visited);

  // Sort by absolute expected move
  const sortedImpacts = [...impacts.values()].sort(
    (a, b) => Math.abs(b.expectedMove) - Math.abs(a.expectedMove),
  );

  const highestOrder = sortedImpacts.reduce((max, i) => Math.max(max, i.order), 0);

  return {
    trigger: event,
    propagatedAt: new Date().toISOString(),
    impacts: sortedImpacts,
    totalAssetsAffected: sortedImpacts.length,
    highestOrderReached: highestOrder,
  };
}

function generateTradingImplication(
  asset: string,
  direction: "up" | "down",
  magnitude: number,
  order: number,
  lag: string,
): string {
  const action = direction === "up" ? "Long" : "Short";
  const urgency = order === 1 ? "immediate" : order === 2 ? "near-term" : "watch for";
  const size = magnitude > 0.05 ? "significant" : magnitude > 0.02 ? "moderate" : "minor";

  if (magnitude < 0.01) {
    return `Monitor ${asset} for confirmation; expected move is ${size}`;
  }

  const pct = (magnitude * 100).toFixed(1);

  if (order === 1) {
    return `${action} ${asset} (${pct}% expected move, ${lag} lag). Direct ${order === 1 ? "first" : "second"}-order effect.`;
  }

  return `${urgency}: ${action} ${asset} if ${pct}%+ move materializes (${lag} lag, order-${order} cascade)`;
}

/**
 * Get a human-readable summary of contagion results.
 */
export function summarizeContagion(result: ContagionResult): string {
  const lines: string[] = [];
  lines.push(`Shock: ${result.trigger.trigger} (${result.trigger.sourceAsset} ${(result.trigger.shockMagnitude * 100).toFixed(1)}%)`);
  lines.push(`Affected: ${result.totalAssetsAffected} assets across ${result.highestOrderReached} orders`);
  lines.push("");

  for (const impact of result.impacts.slice(0, 15)) {
    const arrow = impact.direction === "up" ? "+" : "";
    lines.push(
      `[Order ${impact.order}] ${impact.asset}: ${arrow}${(impact.expectedMove * 100).toFixed(2)}% (${impact.lag}) | ${impact.mechanism.slice(0, 100)}`,
    );
  }

  return lines.join("\n");
}
