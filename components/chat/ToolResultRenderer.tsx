"use client";

import { SignalsWidget } from "./widgets/SignalsWidget";
import { SnapshotWidget } from "./widgets/SnapshotWidget";
import { SentimentWidget } from "./widgets/SentimentWidget";
import { GameTheoryWidget } from "./widgets/GameTheoryWidget";
import { ThesisWidget } from "./widgets/ThesisWidget";
import { PredictionsWidget } from "./widgets/PredictionsWidget";
import { PortfolioWidget } from "./widgets/PortfolioWidget";

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
