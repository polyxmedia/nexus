"use client";

import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import { ChevronUp, ChevronDown } from "lucide-react";

export interface Column<T> {
  key: string;
  header: string;
  accessor: (row: T) => React.ReactNode;
  sortAccessor?: (row: T) => string | number;
  className?: string;
  headerClassName?: string;
}

interface DataGridProps<T> {
  data: T[];
  columns: Column<T>[];
  keyExtractor: (row: T) => string | number;
  onRowClick?: (row: T) => void;
  emptyMessage?: string;
  className?: string;
  filterFn?: (row: T, query: string) => boolean;
  searchPlaceholder?: string;
}

export function DataGrid<T>({
  data,
  columns,
  keyExtractor,
  onRowClick,
  emptyMessage = "No data",
  className,
  filterFn,
  searchPlaceholder = "Filter...",
}: DataGridProps<T>) {
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [filterQuery, setFilterQuery] = useState("");

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const processed = useMemo(() => {
    let rows = [...data];

    // Filter
    if (filterQuery && filterFn) {
      rows = rows.filter((row) => filterFn(row, filterQuery));
    }

    // Sort
    if (sortKey) {
      const col = columns.find((c) => c.key === sortKey);
      if (col?.sortAccessor) {
        rows.sort((a, b) => {
          const va = col.sortAccessor!(a);
          const vb = col.sortAccessor!(b);
          const cmp = typeof va === "number" && typeof vb === "number"
            ? va - vb
            : String(va).localeCompare(String(vb));
          return sortDir === "asc" ? cmp : -cmp;
        });
      }
    }

    return rows;
  }, [data, sortKey, sortDir, filterQuery, filterFn, columns]);

  return (
    <div className={cn("border border-navy-700 rounded", className)}>
      {filterFn && (
        <div className="border-b border-navy-700 p-2">
          <input
            type="text"
            value={filterQuery}
            onChange={(e) => setFilterQuery(e.target.value)}
            placeholder={searchPlaceholder}
            className="w-full bg-navy-900 text-xs text-navy-200 px-3 py-1.5 rounded border border-navy-700 outline-none focus:border-navy-500 font-mono placeholder:text-navy-600"
          />
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-navy-700">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={cn(
                    "px-3 py-2 text-left text-[10px] font-medium uppercase tracking-wider text-navy-500",
                    col.sortAccessor && "cursor-pointer select-none hover:text-navy-300",
                    col.headerClassName
                  )}
                  onClick={() => col.sortAccessor && handleSort(col.key)}
                >
                  <span className="flex items-center gap-1">
                    {col.header}
                    {sortKey === col.key && (
                      sortDir === "asc" ? (
                        <ChevronUp className="h-3 w-3" />
                      ) : (
                        <ChevronDown className="h-3 w-3" />
                      )
                    )}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {processed.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-3 py-8 text-center text-xs text-navy-500"
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              processed.map((row) => (
                <tr
                  key={keyExtractor(row)}
                  className={cn(
                    "border-b border-navy-800 last:border-0 transition-colors",
                    onRowClick && "cursor-pointer hover:bg-navy-800/50"
                  )}
                  onClick={() => onRowClick?.(row)}
                >
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={cn(
                        "px-3 py-2 text-xs text-navy-300",
                        col.className
                      )}
                    >
                      {col.accessor(row)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <div className="border-t border-navy-700 px-3 py-1.5">
        <span className="text-[10px] text-navy-600">
          {processed.length} of {data.length} rows
        </span>
      </div>
    </div>
  );
}
