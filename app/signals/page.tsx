"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PageContainer } from "@/components/layout/page-container";
import { DataGrid, type Column } from "@/components/ui/data-grid";
import { Badge, IntensityIndicator } from "@/components/ui/badge";
import { StatusDot } from "@/components/ui/status-dot";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

interface Signal {
  id: number;
  title: string;
  description: string;
  date: string;
  intensity: number;
  category: string;
  status: string;
  layers: string;
  marketSectors: string | null;
  hebrewHoliday: string | null;
  celestialType: string | null;
}

export default function SignalsPage() {
  const router = useRouter();
  const [signals, setSignals] = useState<Signal[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterIntensity, setFilterIntensity] = useState<number | null>(null);
  const [filterStatus, setFilterStatus] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams();
    if (filterIntensity) params.set("intensity", String(filterIntensity));
    if (filterStatus) params.set("status", filterStatus);

    fetch(`/api/signals?${params}`)
      .then((r) => r.json())
      .then((data) => {
        setSignals(Array.isArray(data) ? data : data.signals || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [filterIntensity, filterStatus]);

  const columns: Column<Signal>[] = [
    {
      key: "date",
      header: "Date",
      accessor: (row) =>
        new Date(row.date).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        }),
      sortAccessor: (row) => row.date,
    },
    {
      key: "intensity",
      header: "Level",
      accessor: (row) => <IntensityIndicator intensity={row.intensity} />,
      sortAccessor: (row) => row.intensity,
    },
    {
      key: "title",
      header: "Signal",
      accessor: (row) => (
        <span className="text-navy-200 font-medium">{row.title}</span>
      ),
    },
    {
      key: "category",
      header: "Category",
      accessor: (row) => <Badge variant="category">{row.category}</Badge>,
      sortAccessor: (row) => row.category,
    },
    {
      key: "layers",
      header: "Layers",
      accessor: (row) => {
        try {
          const layers: string[] = JSON.parse(row.layers);
          return layers.join(", ");
        } catch {
          return row.layers;
        }
      },
    },
    {
      key: "status",
      header: "Status",
      accessor: (row) => (
        <StatusDot
          color={
            row.status === "active"
              ? "green"
              : row.status === "upcoming"
                ? "cyan"
                : "gray"
          }
          label={row.status}
        />
      ),
      sortAccessor: (row) => row.status,
    },
  ];

  return (
    <PageContainer
      title="Signals"
      subtitle="Convergence event calendar"
      actions={
        <div className="flex items-center gap-2">
          <div className="flex gap-1">
            {[null, 1, 2, 3, 4, 5].map((level) => (
              <Button
                key={level ?? "all"}
                size="sm"
                variant={filterIntensity === level ? "default" : "ghost"}
                onClick={() => setFilterIntensity(level)}
              >
                {level === null ? "All" : `L${level}`}
              </Button>
            ))}
          </div>
          <div className="w-px h-6 bg-navy-700" />
          <div className="flex gap-1">
            {[null, "upcoming", "active", "passed"].map((status) => (
              <Button
                key={status ?? "all"}
                size="sm"
                variant={filterStatus === status ? "default" : "ghost"}
                onClick={() => setFilterStatus(status)}
              >
                {status === null ? "All" : status}
              </Button>
            ))}
          </div>
        </div>
      }
    >
      {loading ? (
        <Skeleton className="h-96 w-full" />
      ) : (
        <DataGrid
          data={signals}
          columns={columns}
          keyExtractor={(row) => row.id}
          onRowClick={(row) => router.push(`/signals/${row.id}`)}
          emptyMessage="No signals match the current filters"
          filterFn={(row, query) => {
            const q = query.toLowerCase();
            return (
              row.title.toLowerCase().includes(q) ||
              row.category.toLowerCase().includes(q) ||
              (row.hebrewHoliday?.toLowerCase().includes(q) ?? false) ||
              (row.celestialType?.toLowerCase().includes(q) ?? false)
            );
          }}
          searchPlaceholder="Filter signals..."
        />
      )}
    </PageContainer>
  );
}
