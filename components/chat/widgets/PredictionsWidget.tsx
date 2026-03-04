"use client";

import { DataGrid, type Column } from "@/components/ui/data-grid";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";

interface Prediction {
  id: number;
  claim: string;
  deadline: string;
  confidence: number;
  category: string;
  outcome: string;
}

interface PredictionsData {
  count: number;
  predictions: Prediction[];
  error?: string;
}

const outcomeStyle: Record<string, string> = {
  confirmed: "bg-accent-emerald/20 text-accent-emerald border-accent-emerald/30",
  denied: "bg-accent-rose/20 text-accent-rose border-accent-rose/30",
  partial: "bg-accent-amber/20 text-accent-amber border-accent-amber/30",
  expired: "bg-navy-700 text-navy-400",
  pending: "bg-accent-cyan/20 text-accent-cyan border-accent-cyan/30",
};

const columns: Column<Prediction>[] = [
  {
    key: "claim",
    header: "Prediction",
    accessor: (row) => (
      <span className="text-navy-200">{row.claim}</span>
    ),
  },
  {
    key: "deadline",
    header: "Deadline",
    accessor: (row) => formatDate(row.deadline),
    sortAccessor: (row) => row.deadline,
    className: "whitespace-nowrap",
  },
  {
    key: "confidence",
    header: "Conf",
    accessor: (row) => `${(row.confidence * 100).toFixed(0)}%`,
    sortAccessor: (row) => row.confidence,
  },
  {
    key: "outcome",
    header: "Outcome",
    accessor: (row) => (
      <Badge className={outcomeStyle[row.outcome] || ""}>{row.outcome}</Badge>
    ),
  },
];

export function PredictionsWidget({ data }: { data: PredictionsData }) {
  if (data.error) {
    return (
      <div className="my-2 border border-accent-rose/30 rounded bg-accent-rose/5 px-3 py-2 text-xs text-accent-rose">
        {data.error}
      </div>
    );
  }

  return (
    <div className="my-2">
      <div className="text-[10px] uppercase tracking-wider text-navy-500 mb-1.5 font-mono">
        Predictions ({data.count})
      </div>
      <DataGrid
        data={data.predictions}
        columns={columns}
        keyExtractor={(row) => row.id}
        emptyMessage="No predictions found"
      />
    </div>
  );
}
