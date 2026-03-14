import "server-only";
import { db, schema } from "@/lib/db";
import { and, eq } from "drizzle-orm";

const SEED_EDGES = [
  // ── Semiconductors ──
  { from: "TSMC", to: "AAPL", type: "supplier", strength: 0.9, evidence: "TSMC fabricates Apple's A-series and M-series chips" },
  { from: "TSMC", to: "NVDA", type: "supplier", strength: 0.85, evidence: "TSMC manufactures all NVIDIA GPUs" },
  { from: "TSMC", to: "AMD", type: "supplier", strength: 0.8, evidence: "TSMC fabricates AMD Ryzen and EPYC processors" },
  { from: "TSMC", to: "QCOM", type: "supplier", strength: 0.75, evidence: "TSMC manufactures Qualcomm Snapdragon chips" },
  { from: "TSMC", to: "AVGO", type: "supplier", strength: 0.7, evidence: "TSMC fabricates Broadcom networking chips" },
  { from: "ASML", to: "TSMC", type: "supplier", strength: 0.95, evidence: "ASML is sole supplier of EUV lithography machines" },
  { from: "ASML", to: "INTC", type: "supplier", strength: 0.8, evidence: "ASML supplies Intel with lithography equipment" },
  { from: "ASML", to: "Samsung", type: "supplier", strength: 0.8, evidence: "ASML supplies Samsung foundry" },
  { from: "LRCX", to: "TSMC", type: "supplier", strength: 0.65, evidence: "Lam Research supplies etch and deposition equipment" },

  // ── Consumer Tech ──
  { from: "AAPL", to: "Foxconn", type: "customer", strength: 0.85, evidence: "Foxconn assembles majority of iPhones" },
  { from: "AAPL", to: "CRUS", type: "customer", strength: 0.7, evidence: "Cirrus Logic supplies audio chips for iPhones" },
  { from: "MSFT", to: "NVDA", type: "customer", strength: 0.6, evidence: "Microsoft Azure is major NVIDIA GPU customer for AI" },
  { from: "GOOG", to: "NVDA", type: "customer", strength: 0.55, evidence: "Google Cloud uses NVIDIA GPUs for AI workloads" },

  // ── Energy ──
  { from: "Saudi Aramco", to: "CL", type: "supplier", strength: 0.95, evidence: "World's largest oil producer, ~12% of global supply" },
  { from: "CL", to: "XOM", type: "input", strength: 0.9, evidence: "ExxonMobil revenue directly tied to crude prices" },
  { from: "CL", to: "CVX", type: "input", strength: 0.85, evidence: "Chevron upstream earnings scale with crude" },
  { from: "CL", to: "VLO", type: "input", strength: 0.7, evidence: "Valero refining margins depend on crude cost" },
  { from: "NG", to: "LNG", type: "input", strength: 0.8, evidence: "Cheniere profits from LNG export margins" },
  { from: "CL", to: "JETS", type: "input", strength: 0.75, evidence: "Jet fuel is 25-35% of airline operating costs" },

  // ── Defense ──
  { from: "GE", to: "BA", type: "supplier", strength: 0.7, evidence: "GE Aviation supplies engines for Boeing aircraft" },
  { from: "RTX", to: "LMT", type: "competitor", strength: 0.6, evidence: "Raytheon and Lockheed compete for defense contracts" },
  { from: "BA", to: "SPR", type: "customer", strength: 0.8, evidence: "Spirit AeroSystems makes Boeing fuselages" },

  // ── Automotive ──
  { from: "TSLA", to: "PANA", type: "customer", strength: 0.65, evidence: "Panasonic supplies battery cells for Tesla" },
  { from: "TSLA", to: "ALB", type: "customer", strength: 0.5, evidence: "Albemarle supplies lithium for Tesla batteries" },
  { from: "ALB", to: "LIT", type: "input", strength: 0.7, evidence: "Lithium supply directly affects EV battery costs" },

  // ── Mining & Commodities ──
  { from: "BHP", to: "FE", type: "supplier", strength: 0.7, evidence: "BHP is world's largest iron ore producer" },
  { from: "RIO", to: "FE", type: "supplier", strength: 0.65, evidence: "Rio Tinto is major iron ore supplier" },
  { from: "FCX", to: "COPX", type: "supplier", strength: 0.75, evidence: "Freeport-McMoRan is world's largest public copper producer" },
  { from: "NEM", to: "GLD", type: "supplier", strength: 0.7, evidence: "Newmont is world's largest gold miner" },

  // ── Pharma ──
  { from: "LONZA", to: "MRNA", type: "supplier", strength: 0.7, evidence: "Lonza manufactures mRNA for Moderna vaccines" },
  { from: "TMO", to: "PFE", type: "supplier", strength: 0.5, evidence: "Thermo Fisher supplies lab equipment and reagents" },

  // ── Shipping & Logistics ──
  { from: "MAERSK", to: "BDRY", type: "supplier", strength: 0.8, evidence: "Maersk is world's largest container shipping company" },
  { from: "UPS", to: "AMZN", type: "supplier", strength: 0.6, evidence: "UPS handles significant Amazon last-mile delivery" },

  // ── Geopolitical nodes ──
  { from: "HORMUZ", to: "CL", type: "logistics", strength: 0.95, evidence: "21% of global oil transits Strait of Hormuz" },
  { from: "HORMUZ", to: "NG", type: "logistics", strength: 0.8, evidence: "Qatar LNG exports transit Hormuz" },
  { from: "SUEZ", to: "BDRY", type: "logistics", strength: 0.85, evidence: "12% of global trade transits Suez Canal" },
  { from: "MALACCA", to: "CL", type: "logistics", strength: 0.7, evidence: "25% of global oil transits Strait of Malacca" },
];

export async function seedSupplyChain(): Promise<{ inserted: number; skipped: number }> {
  let inserted = 0;
  let skipped = 0;

  for (const edge of SEED_EDGES) {
    // Check for duplicate
    const existing = await db.select().from(schema.supplyChainEdges)
      .where(and(
        eq(schema.supplyChainEdges.fromEntity, edge.from.toUpperCase()),
        eq(schema.supplyChainEdges.toEntity, edge.to.toUpperCase()),
        eq(schema.supplyChainEdges.relationshipType, edge.type),
      ));

    if (existing.length > 0) {
      skipped++;
      continue;
    }

    await db.insert(schema.supplyChainEdges).values({
      fromEntity: edge.from.toUpperCase(),
      toEntity: edge.to.toUpperCase(),
      relationshipType: edge.type,
      strength: edge.strength,
      lagDays: 0,
      source: "seed",
      confidence: 0.95,
      evidence: edge.evidence,
    });
    inserted++;
  }

  return { inserted, skipped };
}
