"use client";

import { BriefingCard } from "@/components/ui/briefing-card";
import { Badge } from "@/components/ui/badge";
import { Metric } from "@/components/ui/metric";
import { DataGrid, type Column } from "@/components/ui/data-grid";
import { Markdown } from "@/components/ui/markdown";

interface TradingAction {
  ticker: string;
  direction: string;
  rationale: string;
  confidence: number;
  riskLevel: string;
}

interface ThesisData {
  id?: number;
  title?: string;
  status?: string;
  generatedAt?: string;
  validUntil?: string;
  marketRegime?: string;
  volatilityOutlook?: string;
  convergenceDensity?: number;
  overallConfidence?: number;
  tradingActions?: TradingAction[];
  executiveSummary?: string;
  situationAssessment?: string;
  riskScenarios?: string;
  error?: string;
}

const actionColumns: Column<TradingAction>[] = [
  {
    key: "ticker",
    header: "Ticker",
    accessor: (row) => (
      <span className="font-mono font-bold text-navy-200">{row.ticker}</span>
    ),
  },
  {
    key: "direction",
    header: "Direction",
    accessor: (row) => (
      <Badge
        className={
          row.direction === "BUY"
            ? "bg-accent-emerald/20 text-accent-emerald border-accent-emerald/30"
            : row.direction === "SELL"
              ? "bg-accent-rose/20 text-accent-rose border-accent-rose/30"
              : "bg-navy-700 text-navy-300"
        }
      >
        {row.direction}
      </Badge>
    ),
  },
  {
    key: "confidence",
    header: "Conf",
    accessor: (row) => `${(row.confidence * 100).toFixed(0)}%`,
    sortAccessor: (row) => row.confidence,
  },
  {
    key: "risk",
    header: "Risk",
    accessor: (row) => row.riskLevel,
  },
  {
    key: "rationale",
    header: "Rationale",
    accessor: (row) => (
      <span className="text-navy-400">{row.rationale}</span>
    ),
  },
];

export function ThesisWidget({ data }: { data: ThesisData }) {
  if (data.error) {
    return (
      <div className="my-2 border border-accent-rose/30 rounded bg-accent-rose/5 px-3 py-2 text-xs text-accent-rose">
        {data.error}
      </div>
    );
  }

  return (
    <div className="my-2 space-y-3">
      <div className="text-[10px] uppercase tracking-wider text-navy-500 font-mono">
        Active Thesis: {data.title}
      </div>

      <div className="grid grid-cols-4 gap-4 border border-navy-700 rounded bg-navy-900/80 p-3">
        <Metric label="Regime" value={data.marketRegime?.replace("_", " ") ?? "N/A"} />
        <Metric label="Vol Outlook" value={data.volatilityOutlook ?? "N/A"} />
        <Metric
          label="Convergence"
          value={data.convergenceDensity?.toFixed(1) ?? "N/A"}
        />
        <Metric
          label="Confidence"
          value={
            data.overallConfidence
              ? `${(data.overallConfidence * 100).toFixed(0)}%`
              : "N/A"
          }
        />
      </div>

      {data.executiveSummary && (
        <BriefingCard title="Executive Summary">
          <Markdown>{data.executiveSummary}</Markdown>
        </BriefingCard>
      )}

      {data.tradingActions && data.tradingActions.length > 0 && (
        <div>
          <div className="text-[10px] uppercase tracking-wider text-navy-500 font-mono mb-1.5">
            Trading Actions
          </div>
          <DataGrid
            data={data.tradingActions}
            columns={actionColumns}
            keyExtractor={(row) => row.ticker}
          />
        </div>
      )}
    </div>
  );
}
