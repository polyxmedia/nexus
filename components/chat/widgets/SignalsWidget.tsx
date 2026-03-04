"use client";

import { DataGrid, type Column } from "@/components/ui/data-grid";
import { IntensityIndicator, Badge } from "@/components/ui/badge";
import { StatusDot } from "@/components/ui/status-dot";
import { formatDate } from "@/lib/utils";

interface Signal {
  id: number;
  title: string;
  date: string;
  intensity: number;
  category: string;
  layers: string[];
  status: string;
}

interface SignalsData {
  count: number;
  signals: Signal[];
  error?: string;
}

const statusColor = {
  upcoming: "cyan" as const,
  active: "green" as const,
  passed: "gray" as const,
};

const columns: Column<Signal>[] = [
  {
    key: "intensity",
    header: "Int",
    accessor: (row) => <IntensityIndicator intensity={row.intensity} />,
    sortAccessor: (row) => row.intensity,
    className: "w-20",
  },
  {
    key: "title",
    header: "Signal",
    accessor: (row) => (
      <span className="font-mono text-navy-200">{row.title}</span>
    ),
    sortAccessor: (row) => row.title,
  },
  {
    key: "date",
    header: "Date",
    accessor: (row) => formatDate(row.date),
    sortAccessor: (row) => row.date,
    className: "whitespace-nowrap",
  },
  {
    key: "category",
    header: "Type",
    accessor: (row) => (
      <Badge variant="category">{row.category}</Badge>
    ),
  },
  {
    key: "status",
    header: "Status",
    accessor: (row) => (
      <StatusDot
        color={statusColor[row.status as keyof typeof statusColor] || "gray"}
        label={row.status}
      />
    ),
  },
];

export function SignalsWidget({ data }: { data: SignalsData }) {
  if (data.error) {
    return <WidgetError message={data.error} />;
  }

  return (
    <div className="my-2">
      <div className="text-[10px] uppercase tracking-wider text-navy-500 mb-1.5 font-mono">
        Signals ({data.count})
      </div>
      <DataGrid
        data={data.signals}
        columns={columns}
        keyExtractor={(row) => row.id}
        emptyMessage="No signals found"
      />
    </div>
  );
}

function WidgetError({ message }: { message: string }) {
  return (
    <div className="my-2 border border-accent-rose/30 rounded bg-accent-rose/5 px-3 py-2 text-xs text-accent-rose">
      {message}
    </div>
  );
}
