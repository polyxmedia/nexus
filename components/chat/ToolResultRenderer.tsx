"use client";

import { SignalsWidget } from "./widgets/SignalsWidget";
import { SnapshotWidget } from "./widgets/SnapshotWidget";
import { SentimentWidget } from "./widgets/SentimentWidget";
import { GameTheoryWidget } from "./widgets/GameTheoryWidget";
import { ThesisWidget } from "./widgets/ThesisWidget";
import { PredictionsWidget } from "./widgets/PredictionsWidget";
import { PortfolioWidget } from "./widgets/PortfolioWidget";
import { EsotericWidget } from "./widgets/EsotericWidget";
import { QuoteWidget } from "./widgets/QuoteWidget";
import { PriceHistoryWidget } from "./widgets/PriceHistoryWidget";
import { MonteCarloWidget } from "./widgets/MonteCarloWidget";
import { WebSearchWidget } from "./widgets/WebSearchWidget";
import { OsintWidget } from "./widgets/OsintWidget";
import { CalendarWidget } from "./widgets/CalendarWidget";
import { OptionsFlowWidget } from "./widgets/OptionsFlowWidget";
import { PortfolioRiskWidget } from "./widgets/PortfolioRiskWidget";
import { MacroWidget } from "./widgets/MacroWidget";
import { KnowledgeWidget } from "./widgets/KnowledgeWidget";
import { SaveKnowledgeWidget } from "./widgets/SaveKnowledgeWidget";
import { TimelineWidget } from "./widgets/TimelineWidget";

interface ToolResultRendererProps {
  toolName: string;
  result: unknown;
}

/* eslint-disable @typescript-eslint/no-explicit-any */
export function ToolResultRenderer({ toolName, result }: ToolResultRendererProps) {
  const data = result as any;

  switch (toolName) {
    case "get_signals":
      return <SignalsWidget data={data} />;
    case "get_market_snapshot":
      return <SnapshotWidget data={data} />;
    case "get_market_sentiment":
      return <SentimentWidget data={data} />;
    case "get_game_theory":
      return <GameTheoryWidget data={data} />;
    case "get_active_thesis":
      return <ThesisWidget data={data} />;
    case "get_predictions":
      return <PredictionsWidget data={data} />;
    case "get_portfolio":
      return <PortfolioWidget data={data} />;
    case "get_esoteric_reading":
      return <EsotericWidget data={data} />;
    case "get_live_quote":
      return <QuoteWidget data={data} />;
    case "get_price_history":
      return <PriceHistoryWidget data={data} />;
    case "monte_carlo_simulation":
      return <MonteCarloWidget data={data} />;
    case "web_search":
      return <WebSearchWidget data={data} />;
    case "get_osint_events":
    case "extract_osint_entities":
      return <OsintWidget data={data} />;
    case "get_economic_calendar":
      return <CalendarWidget data={data} />;
    case "get_options_flow":
      return <OptionsFlowWidget data={data} />;
    case "get_portfolio_risk":
      return <PortfolioRiskWidget data={data} />;
    case "get_macro_data":
      return <MacroWidget data={data} />;
    case "search_knowledge":
      return <KnowledgeWidget data={data} />;
    case "add_knowledge":
      return <SaveKnowledgeWidget data={data} />;
    case "get_timeline":
      return <TimelineWidget data={data} />;
    case "get_operator_context":
      return (
        <div className="my-2 border border-accent-cyan/30 rounded bg-accent-cyan/5 px-3 py-2 text-xs text-accent-cyan flex items-center gap-2">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-accent-cyan animate-pulse" />
          Operator context loaded
        </div>
      );
    default:
      return (
        <div className="my-2 border border-navy-700 rounded bg-navy-900/60 p-3 text-xs text-navy-400 font-mono">
          <div className="text-[10px] uppercase tracking-wider text-navy-500 mb-1">
            {toolName}
          </div>
          <pre className="overflow-x-auto whitespace-pre-wrap">
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      );
  }
}
