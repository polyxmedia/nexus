"use client";

interface CalcResult {
  label: string;
  expression: string;
  result: number | string;
}

interface CalculateData {
  results?: CalcResult[];
  variables?: Record<string, number>;
  error?: string;
}

export function CalculateWidget({ data }: { data: CalculateData }) {
  if (data.error) {
    return (
      <div className="border border-accent-rose/30 rounded bg-accent-rose/5 px-3 py-2 text-xs text-accent-rose">
        {data.error}
      </div>
    );
  }

  if (!data.results || data.results.length === 0) {
    return (
      <div className="border border-navy-700 rounded bg-navy-900/60 px-3 py-2 text-xs text-navy-400">
        No calculations performed
      </div>
    );
  }

  const hasErrors = data.results.some(
    (r) => typeof r.result === "string" && r.result.startsWith("ERROR:")
  );

  return (
    <div className="my-2 border border-navy-700 rounded bg-navy-900/80 p-4">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-[10px] uppercase tracking-wider text-navy-500 font-mono">
          Calculator
        </span>
        <span className="text-[10px] font-mono text-navy-600">
          {data.results.length} expression{data.results.length !== 1 ? "s" : ""}
        </span>
        {hasErrors && (
          <span className="text-[10px] font-mono text-accent-rose">
            has errors
          </span>
        )}
      </div>

      <div className="space-y-1.5">
        {data.results.map((r, i) => {
          const isError =
            typeof r.result === "string" && r.result.startsWith("ERROR:");
          const displayValue =
            typeof r.result === "number"
              ? formatNumber(r.result)
              : String(r.result);

          return (
            <div
              key={i}
              className={`flex items-baseline justify-between gap-3 px-2 py-1.5 rounded ${
                isError
                  ? "bg-accent-rose/5 border border-accent-rose/20"
                  : "bg-navy-900/60"
              }`}
            >
              <div className="flex items-baseline gap-2 min-w-0 flex-1">
                <span className="text-[10px] font-mono uppercase tracking-wider text-navy-500 shrink-0">
                  {r.label}
                </span>
                <span className="text-[10px] font-mono text-navy-600 truncate">
                  {r.expression}
                </span>
              </div>
              <span
                className={`text-sm font-mono font-medium tabular-nums shrink-0 ${
                  isError ? "text-accent-rose" : "text-accent-cyan"
                }`}
              >
                {displayValue}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function formatNumber(n: number): string {
  if (Number.isNaN(n) || !Number.isFinite(n)) return String(n);
  // Use locale formatting for readability
  if (Number.isInteger(n)) return n.toLocaleString("en-GB");
  // Show up to 4 decimal places, trimming trailing zeros
  const fixed = n.toFixed(4).replace(/0+$/, "").replace(/\.$/, "");
  // Add thousand separators to the integer part
  const [int, dec] = fixed.split(".");
  const formattedInt = Number(int).toLocaleString("en-GB");
  return dec ? `${formattedInt}.${dec}` : formattedInt;
}
