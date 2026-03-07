"use client";

import { Metric } from "@/components/ui/metric";

interface StressTests {
  [scenario: string]: number | string;
}

interface PortfolioRiskData {
  var95?: number;
  var99?: number;
  cvar95?: number;
  beta?: number;
  sharpe?: number;
  stressTests?: StressTests;
  error?: string;
}

const sharpeColor = (v: number): "green" | "red" | "neutral" => {
  if (v >= 1) return "green";
  if (v < 0) return "red";
  return "neutral";
};

const sharpeLabel = (v: number) => {
  if (v >= 2) return "Excellent";
  if (v >= 1) return "Good";
  if (v >= 0) return "Low";
  return "Negative";
};

export function PortfolioRiskWidget({ data }: { data: PortfolioRiskData }) {
  if (data.error) {
    return (
      <div className="my-2 border border-accent-rose/30 rounded bg-accent-rose/5 px-3 py-2 text-xs text-accent-rose">
        {data.error}
      </div>
    );
  }

  return (
    <div className="my-2 border border-navy-700 rounded bg-navy-900/80 p-4">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-[10px] uppercase tracking-wider text-navy-500 font-mono">
          Portfolio Risk
        </span>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Metric
          label="VaR 95%"
          value={
            data.var95 != null
              ? `${(data.var95 * 100).toFixed(2)}%`
              : "N/A"
          }
          change={
            data.var95 != null && Math.abs(data.var95) > 0.03
              ? "Elevated"
              : undefined
          }
          changeColor={
            data.var95 != null && Math.abs(data.var95) > 0.03
              ? "red"
              : "neutral"
          }
        />
        <Metric
          label="VaR 99%"
          value={
            data.var99 != null
              ? `${(data.var99 * 100).toFixed(2)}%`
              : "N/A"
          }
        />
        <Metric
          label="CVaR 95%"
          value={
            data.cvar95 != null
              ? `${(data.cvar95 * 100).toFixed(2)}%`
              : "N/A"
          }
        />
      </div>

      <div className="grid grid-cols-3 gap-4 mt-2">
        <Metric
          label="Beta"
          value={data.beta?.toFixed(2) ?? "N/A"}
          change={
            data.beta != null
              ? data.beta > 1
                ? "High vol"
                : data.beta < 0.5
                  ? "Defensive"
                  : "Moderate"
              : undefined
          }
          changeColor={
            data.beta != null
              ? data.beta > 1.5
                ? "red"
                : data.beta < 0.5
                  ? "green"
                  : "neutral"
              : "neutral"
          }
        />
        <Metric
          label="Sharpe"
          value={data.sharpe?.toFixed(2) ?? "N/A"}
          change={data.sharpe != null ? sharpeLabel(data.sharpe) : undefined}
          changeColor={
            data.sharpe != null ? sharpeColor(data.sharpe) : "neutral"
          }
        />
      </div>

      {data.stressTests && Object.keys(data.stressTests).length > 0 && (
        <div className="mt-3 border-t border-navy-700 pt-3">
          <span className="text-[10px] uppercase tracking-wider text-navy-500 font-mono">
            Stress Tests
          </span>
          <div className="mt-2 space-y-1">
            {Object.entries(data.stressTests).map(([scenario, impact]) => {
              const numericImpact =
                typeof impact === "number" ? impact : parseFloat(String(impact));
              const isNeg = !isNaN(numericImpact) && numericImpact < 0;
              return (
                <div
                  key={scenario}
                  className="flex items-center justify-between text-xs"
                >
                  <span className="text-navy-300">{scenario}</span>
                  <span
                    className={
                      isNeg ? "text-accent-rose" : "text-accent-emerald"
                    }
                  >
                    {!isNaN(numericImpact)
                      ? `${numericImpact > 0 ? "+" : ""}${(numericImpact * 100).toFixed(2)}%`
                      : String(impact)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
