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
import { MarketRegimeWidget } from "./widgets/MarketRegimeWidget";
import { OnChainWidget } from "./widgets/OnChainWidget";
import { ShippingWidget } from "./widgets/ShippingWidget";
import { AIProgressionWidget } from "./widgets/AIProgressionWidget";
import { IWStatusWidget } from "./widgets/IWStatusWidget";
import { SystemicRiskWidget } from "./widgets/SystemicRiskWidget";
import { NowcastWidget } from "./widgets/NowcastWidget";
import { GPRWidget } from "./widgets/GPRWidget";
import { ChangePointsWidget } from "./widgets/ChangePointsWidget";
import { PredictionFeedbackWidget } from "./widgets/PredictionFeedbackWidget";
import { PredictionMarketsWidget } from "./widgets/PredictionMarketsWidget";
import { CongressionalTradingWidget } from "./widgets/CongressionalTradingWidget";
import { CorrelationWidget } from "./widgets/CorrelationWidget";
import { SourceReliabilityWidget } from "./widgets/SourceReliabilityWidget";
import { ACHWidget } from "./widgets/ACHWidget";
import { CentralBankWidget } from "./widgets/CentralBankWidget";
import { CollectionGapsWidget } from "./widgets/CollectionGapsWidget";
import { NarrativesWidget } from "./widgets/NarrativesWidget";
import { ShortInterestWidget } from "./widgets/ShortInterestWidget";
import { GammaExposureWidget } from "./widgets/GammaExposureWidget";
import { BayesianWidget } from "./widgets/BayesianWidget";
import { ParallelsWidget } from "./widgets/ParallelsWidget";
import { ActorProfileWidget } from "./widgets/ActorProfileWidget";

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
    case "save_to_knowledge":
      return <SaveKnowledgeWidget data={data} />;
    case "get_timeline":
      return <TimelineWidget data={data} />;
    case "get_market_regime":
      return <MarketRegimeWidget data={data} />;
    case "get_on_chain":
      return <OnChainWidget data={data} />;
    case "get_shipping_intelligence":
      return <ShippingWidget data={data} />;
    case "get_ai_progression":
      return <AIProgressionWidget data={data} />;
    case "get_iw_status":
      return <IWStatusWidget data={data} />;
    case "get_systemic_risk":
      return <SystemicRiskWidget data={data} />;
    case "get_economic_nowcast":
      return <NowcastWidget data={data} />;
    case "get_gpr_index":
      return <GPRWidget data={data} />;
    case "get_change_points":
      return <ChangePointsWidget data={data} />;
    case "get_prediction_feedback":
      return <PredictionFeedbackWidget data={data} />;
    case "get_prediction_markets":
      return <PredictionMarketsWidget data={data} />;
    case "get_congressional_trading":
      return <CongressionalTradingWidget data={data} />;
    case "get_correlation_monitor":
      return <CorrelationWidget data={data} />;
    case "assess_source_reliability":
      return <SourceReliabilityWidget data={data} />;
    case "create_ach_analysis":
      return <ACHWidget data={data} />;
    case "analyze_central_bank_statement":
      return <CentralBankWidget data={data} />;
    case "get_collection_gaps":
      return <CollectionGapsWidget data={data} />;
    case "get_narratives":
      return <NarrativesWidget data={data} />;
    case "get_short_interest":
      return <ShortInterestWidget data={data} />;
    case "get_gamma_exposure":
      return <GammaExposureWidget data={data} />;
    case "run_bayesian_analysis":
      return <BayesianWidget data={data} />;
    case "search_historical_parallels":
      return <ParallelsWidget data={data} />;
    case "get_actor_profile":
      return <ActorProfileWidget data={data} />;
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
