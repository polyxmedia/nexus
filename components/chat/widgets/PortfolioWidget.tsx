"use client";

import { DataGrid, type Column } from "@/components/ui/data-grid";
import { Metric } from "@/components/ui/metric";
import { Badge } from "@/components/ui/badge";

interface Position {
  ticker: string;
  quantity: number;
  averagePrice: number;
  currentPrice: number;
  ppl: number;
  fxPpl?: number;
}

interface PortfolioData {
  environment?: string;
  account?: {
    total?: number;
    free?: number;
    invested?: number;
    pieCash?: number;
    ppl?: number;
    result?: number;
  };
  positions?: Position[];
  error?: string;
}

const columns: Column<Position>[] = [
  {
    key: "ticker",
    header: "Ticker",
    accessor: (row) => (
      <span className="font-mono font-bold text-navy-200">{row.ticker}</span>
    ),
    sortAccessor: (row) => row.ticker,
  },
  {
    key: "quantity",
    header: "Qty",
    accessor: (row) => row.quantity?.toFixed(2),
    sortAccessor: (row) => row.quantity,
  },
  {
    key: "avgPrice",
    header: "Avg Price",
    accessor: (row) => row.averagePrice?.toFixed(2),
    sortAccessor: (row) => row.averagePrice,
  },
  {
    key: "currentPrice",
    header: "Current",
    accessor: (row) => row.currentPrice?.toFixed(2),
    sortAccessor: (row) => row.currentPrice,
  },
  {
    key: "ppl",
    header: "P&L",
    accessor: (row) => (
      <span
        className={
          row.ppl > 0
            ? "text-accent-emerald"
            : row.ppl < 0
              ? "text-accent-rose"
              : "text-navy-400"
        }
      >
        {row.ppl > 0 ? "+" : ""}
        {row.ppl?.toFixed(2)}
      </span>
    ),
    sortAccessor: (row) => row.ppl,
  },
];

export function PortfolioWidget({ data }: { data: PortfolioData }) {
  if (data.error) {
    return (
      <div className="my-2 border border-accent-rose/30 rounded bg-accent-rose/5 px-3 py-2 text-xs text-accent-rose">
        {data.error}
      </div>
    );
  }

  const account = data.account;
  const positions = data.positions || [];

  return (
    <div className="my-2 space-y-3">
      <div className="flex items-center gap-2">
        <span className="text-[10px] uppercase tracking-wider text-navy-500 font-mono">
          Portfolio
        </span>
        <Badge variant="category">{data.environment}</Badge>
      </div>

      {account && (
        <div className="grid grid-cols-4 gap-4 border border-navy-700 rounded bg-navy-900/80 p-3">
          <Metric label="Total" value={account.total?.toFixed(2) ?? "N/A"} />
          <Metric label="Invested" value={account.invested?.toFixed(2) ?? "N/A"} />
          <Metric label="Free Cash" value={account.free?.toFixed(2) ?? "N/A"} />
          <Metric
            label="P&L"
            value={account.ppl?.toFixed(2) ?? "N/A"}
            changeColor={
              (account.ppl ?? 0) > 0
                ? "green"
                : (account.ppl ?? 0) < 0
                  ? "red"
                  : "neutral"
            }
          />
        </div>
      )}

      {positions.length > 0 && (
        <DataGrid
          data={positions}
          columns={columns}
          keyExtractor={(row) => row.ticker}
          emptyMessage="No positions"
        />
      )}
    </div>
  );
}
