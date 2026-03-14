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
import { ArtifactWidget } from "./widgets/ArtifactWidget";
import { MemoryWidget } from "./widgets/MemoryWidget";
import { DocumentWidget } from "./widgets/DocumentWidget";
import { DocumentDownloadWidget } from "./widgets/DocumentDownloadWidget";
import { ScenarioBranchesWidget } from "./widgets/ScenarioBranchesWidget";
import { CustomGameTheoryWidget } from "./widgets/CustomGameTheoryWidget";
import { VesselTrackingWidget } from "./widgets/VesselTrackingWidget";
import { CollapsibleWrapper } from "./widgets/CollapsibleCard";

interface ToolResultRendererProps {
  toolName: string;
  result: unknown;
}

// Tools that have CollapsibleCard built-in (don't need wrapper)
const SELF_COLLAPSIBLE = new Set([
  "get_live_quote",
  "get_price_history",
  "monte_carlo_simulation",
  "get_market_snapshot",
  "create_artifact",
]);

// Tiny status widgets that shouldn't be collapsible
const SKIP_COLLAPSE = new Set([
  "get_operator_context",
  "save_to_knowledge",
  "add_knowledge",
  "recall_memory",
  "save_memory",
  "delete_memory",
  "save_document_to_knowledge",
  "generate_document",
]);

// Human-readable labels for tool names
const TOOL_LABELS: Record<string, string> = {
  get_signals: "Signals",
  get_market_sentiment: "Sentiment",
  get_game_theory: "Game Theory",
  get_active_thesis: "Active Thesis",
  get_predictions: "Predictions",
  get_portfolio: "Portfolio",
  get_esoteric_reading: "Cyclical Analysis",
  web_search: "Web Search",
  get_osint_events: "OSINT Events",
  extract_osint_entities: "OSINT Entities",
  get_economic_calendar: "Economic Calendar",
  get_options_flow: "Options Flow",
  get_portfolio_risk: "Portfolio Risk",
  get_macro_data: "Macro Data",
  search_knowledge: "Knowledge Bank",
  get_timeline: "Timeline",
  get_market_regime: "Market Regime",
  get_on_chain: "On-Chain",
  get_shipping_intelligence: "Shipping Intel",
  get_ai_progression: "AI Progression",
  get_iw_status: "IW Status",
  get_systemic_risk: "Systemic Risk",
  get_economic_nowcast: "Economic Nowcast",
  get_gpr_index: "GPR Index",
  get_change_points: "Change Points",
  get_prediction_feedback: "Prediction Feedback",
  get_prediction_markets: "Prediction Markets",
  get_congressional_trading: "Congressional Trading",
  get_correlation_monitor: "Correlation Monitor",
  assess_source_reliability: "Source Reliability",
  create_ach_analysis: "ACH Analysis",
  analyze_central_bank_statement: "Central Bank",
  get_collection_gaps: "Collection Gaps",
  get_narratives: "Narratives",
  get_short_interest: "Short Interest",
  get_gamma_exposure: "Gamma Exposure",
  run_bayesian_analysis: "Bayesian Analysis",
  search_historical_parallels: "Historical Parallels",
  get_actor_profile: "Actor Profile",
  recall_memory: "Memory",
  save_memory: "Memory",
  delete_memory: "Memory",
  create_artifact: "Artifact",
  save_document_to_knowledge: "Document",
  generate_narrative_report: "Narrative Report",
  generate_document: "Document",
  create_custom_game_theory: "Custom Game Theory",
  get_vip_movements: "VIP Movements",
  get_vessel_tracking: "Vessel Tracking",
  get_scenario_branches: "Scenario Branches",
};

/* eslint-disable @typescript-eslint/no-explicit-any */
export function ToolResultRenderer({ toolName, result }: ToolResultRendererProps) {
  const data = result as any;

  let widget: React.ReactNode;

  switch (toolName) {
    case "get_signals":
      widget = <SignalsWidget data={data} />;
      break;
    case "get_market_snapshot":
      widget = <SnapshotWidget data={data} />;
      break;
    case "get_market_sentiment":
      widget = <SentimentWidget data={data} />;
      break;
    case "get_game_theory":
      widget = <GameTheoryWidget data={data} />;
      break;
    case "get_active_thesis":
    case "generate_thesis":
      widget = <ThesisWidget data={data} />;
      break;
    case "get_predictions":
      widget = <PredictionsWidget data={data} />;
      break;
    case "get_portfolio":
      widget = <PortfolioWidget data={data} />;
      break;
    case "get_esoteric_reading":
      widget = <EsotericWidget data={data} />;
      break;
    case "get_live_quote":
      widget = <QuoteWidget data={data} />;
      break;
    case "get_price_history":
      widget = <PriceHistoryWidget data={data} />;
      break;
    case "monte_carlo_simulation":
      widget = <MonteCarloWidget data={data} />;
      break;
    case "web_search":
      widget = <WebSearchWidget data={data} />;
      break;
    case "get_osint_events":
    case "extract_osint_entities":
      widget = <OsintWidget data={data} />;
      break;
    case "get_economic_calendar":
      widget = <CalendarWidget data={data} />;
      break;
    case "get_options_flow":
      widget = <OptionsFlowWidget data={data} />;
      break;
    case "get_portfolio_risk":
      widget = <PortfolioRiskWidget data={data} />;
      break;
    case "get_macro_data":
      widget = <MacroWidget data={data} />;
      break;
    case "search_knowledge":
      widget = <KnowledgeWidget data={data} />;
      break;
    case "add_knowledge":
    case "save_to_knowledge":
      widget = <SaveKnowledgeWidget data={data} />;
      break;
    case "get_timeline":
      widget = <TimelineWidget data={data} />;
      break;
    case "get_market_regime":
      widget = <MarketRegimeWidget data={data} />;
      break;
    case "get_on_chain":
      widget = <OnChainWidget data={data} />;
      break;
    case "get_shipping_intelligence":
      widget = <ShippingWidget data={data} />;
      break;
    case "get_ai_progression":
      widget = <AIProgressionWidget data={data} />;
      break;
    case "get_iw_status":
      widget = <IWStatusWidget data={data} />;
      break;
    case "get_systemic_risk":
      widget = <SystemicRiskWidget data={data} />;
      break;
    case "get_economic_nowcast":
      widget = <NowcastWidget data={data} />;
      break;
    case "get_gpr_index":
      widget = <GPRWidget data={data} />;
      break;
    case "get_change_points":
      widget = <ChangePointsWidget data={data} />;
      break;
    case "get_prediction_feedback":
      widget = <PredictionFeedbackWidget data={data} />;
      break;
    case "get_prediction_markets":
      widget = <PredictionMarketsWidget data={data} />;
      break;
    case "get_congressional_trading":
      widget = <CongressionalTradingWidget data={data} />;
      break;
    case "get_correlation_monitor":
      widget = <CorrelationWidget data={data} />;
      break;
    case "assess_source_reliability":
      widget = <SourceReliabilityWidget data={data} />;
      break;
    case "create_ach_analysis":
      widget = <ACHWidget data={data} />;
      break;
    case "analyze_central_bank_statement":
      widget = <CentralBankWidget data={data} />;
      break;
    case "get_collection_gaps":
      widget = <CollectionGapsWidget data={data} />;
      break;
    case "get_narratives":
      widget = <NarrativesWidget data={data} />;
      break;
    case "get_short_interest":
      widget = <ShortInterestWidget data={data} />;
      break;
    case "get_gamma_exposure":
      widget = <GammaExposureWidget data={data} />;
      break;
    case "run_bayesian_analysis":
      widget = <BayesianWidget data={data} />;
      break;
    case "search_historical_parallels":
      widget = <ParallelsWidget data={data} />;
      break;
    case "get_actor_profile":
      widget = <ActorProfileWidget data={data} />;
      break;
    case "recall_memory":
    case "save_memory":
    case "delete_memory":
      widget = <MemoryWidget result={data} />;
      break;
    case "create_artifact":
      widget = <ArtifactWidget result={data} />;
      break;
    case "save_document_to_knowledge":
      widget = <DocumentWidget result={data} />;
      break;
    case "generate_document":
      widget = <DocumentDownloadWidget data={data} />;
      break;
    case "create_custom_game_theory":
      widget = <CustomGameTheoryWidget data={data} />;
      break;
    case "get_vessel_tracking":
      widget = <VesselTrackingWidget data={data} />;
      break;
    case "get_scenario_branches":
      widget = <ScenarioBranchesWidget data={data} />;
      break;
    case "get_operator_context":
      return (
        <div className="my-2 border border-accent-cyan/30 rounded bg-accent-cyan/5 px-3 py-2 text-xs text-accent-cyan flex items-center gap-2">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-accent-cyan animate-pulse" />
          Operator context loaded
        </div>
      );
    default:
      return (
        <CollapsibleWrapper title={toolName} defaultOpen={false}>
          <div className="my-2 border border-navy-700 rounded bg-navy-900/60 p-3 text-xs text-navy-400 font-mono">
            <div className="text-[10px] uppercase tracking-wider text-navy-500 mb-1">
              {toolName}
            </div>
            <pre className="overflow-x-auto whitespace-pre-wrap">
              {JSON.stringify(result, null, 2)}
            </pre>
          </div>
        </CollapsibleWrapper>
      );
  }

  // Widgets with built-in CollapsibleCard or tiny status widgets don't need wrapping
  if (SELF_COLLAPSIBLE.has(toolName) || SKIP_COLLAPSE.has(toolName)) {
    return widget;
  }

  // Wrap all other widgets with CollapsibleWrapper
  const label = TOOL_LABELS[toolName] || toolName.replace(/^get_/, "").replace(/_/g, " ");
  return (
    <CollapsibleWrapper title={label}>
      {widget}
    </CollapsibleWrapper>
  );
}
