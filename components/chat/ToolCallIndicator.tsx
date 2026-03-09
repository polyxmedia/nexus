"use client";

import { useState, useEffect } from "react";
import { Loader2, Check, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

const TOOL_LABELS: Record<string, string> = {
  // Core intelligence
  get_signals: "Scanning signal convergence",
  get_market_snapshot: "Loading market technicals",
  get_market_sentiment: "Reading market sentiment",
  get_game_theory: "Running game theory analysis",
  get_active_thesis: "Loading active thesis",
  get_predictions: "Loading prediction tracker",
  get_prediction_feedback: "Analysing prediction accuracy",
  get_portfolio: "Fetching portfolio positions",
  get_live_quote: "Getting live quote",
  get_price_history: "Pulling price history",
  monte_carlo_simulation: "Running Monte Carlo simulation",
  // Research & OSINT
  web_search: "Searching global news",
  get_osint_events: "Scanning OSINT feeds",
  extract_osint_entities: "Extracting entities from OSINT",
  get_esoteric_reading: "Consulting esoteric cycles",
  get_economic_calendar: "Checking economic calendar",
  // Risk & options
  get_options_flow: "Analysing options flow",
  get_portfolio_risk: "Computing portfolio risk",
  get_macro_data: "Pulling macro data from FRED",
  get_market_regime: "Detecting market regime",
  get_correlation_monitor: "Checking correlation breaks",
  get_systemic_risk: "Computing systemic risk",
  get_gamma_exposure: "Mapping gamma exposure",
  get_short_interest: "Checking short interest",
  // Intelligence
  search_knowledge: "Searching knowledge bank",
  save_to_knowledge: "Saving to knowledge bank",
  add_knowledge: "Adding to knowledge bank",
  get_timeline: "Building timeline",
  get_iw_status: "Checking I&W status",
  get_collection_gaps: "Auditing collection gaps",
  get_operator_context: "Loading operator context",
  assess_source_reliability: "Assessing source reliability",
  create_ach_analysis: "Running ACH analysis",
  analyze_central_bank_statement: "Analysing central bank tone",
  get_economic_nowcast: "Running economic nowcast",
  get_change_points: "Detecting change points",
  get_gpr_index: "Pulling GPR index",
  get_narratives: "Loading narrative snapshot",
  // Alt data
  get_prediction_markets: "Checking prediction markets",
  get_congressional_trading: "Checking congressional trades",
  get_on_chain: "Reading on-chain data",
  get_shipping_intelligence: "Tracking shipping intel",
  get_ai_progression: "Checking AI progression",
  // Advanced analysis
  search_historical_parallels: "Finding historical parallels",
  get_actor_profile: "Loading actor profile",
  generate_narrative_report: "Generating narrative briefing",
  run_bayesian_analysis: "Running Bayesian game analysis",
  // Memory & artifacts
  recall_memory: "Recalling memories",
  save_memory: "Saving to memory",
  delete_memory: "Removing memory",
  create_artifact: "Creating artifact",
  save_document_to_knowledge: "Saving document to knowledge bank",
};

interface ToolCallIndicatorProps {
  toolName: string;
  status: "loading" | "done" | "error";
}

export function ToolCallIndicator({ toolName, status }: ToolCallIndicatorProps) {
  const [elapsed, setElapsed] = useState(0);
  const label = TOOL_LABELS[toolName] || toolName.replace(/_/g, " ");

  useEffect(() => {
    if (status !== "loading") return;
    const start = Date.now();
    const interval = setInterval(() => {
      setElapsed(((Date.now() - start) / 1000));
    }, 100);
    return () => clearInterval(interval);
  }, [status]);

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-wider py-1",
        status === "loading" && "text-accent-cyan",
        status === "done" && "text-navy-500",
        status === "error" && "text-accent-rose"
      )}
    >
      {status === "loading" && (
        <Loader2 className="h-3 w-3 animate-spin" />
      )}
      {status === "done" && <Check className="h-3 w-3" />}
      {status === "error" && <AlertCircle className="h-3 w-3" />}
      <span>{label}{status === "loading" ? "..." : ""}</span>
      {status === "loading" && elapsed > 0.5 && (
        <span className="text-navy-600">{elapsed.toFixed(1)}s</span>
      )}
    </div>
  );
}
