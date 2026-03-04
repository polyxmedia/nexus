"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { PageContainer } from "@/components/layout/page-container";
import { BriefingCard } from "@/components/ui/briefing-card";
import { Metric } from "@/components/ui/metric";
import { StatusDot } from "@/components/ui/status-dot";
import { DataGrid } from "@/components/ui/data-grid";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Markdown } from "@/components/ui/markdown";
import { TradeSuggestionCard } from "@/components/trading/trade-suggestion-card";
import { TradeApprovalModal } from "@/components/trading/trade-approval-modal";
import { useDismissedTrades } from "@/components/trading/use-dismissed-trades";

interface TradingAction {
  ticker: string;
  direction: "BUY" | "SELL" | "HOLD";
  rationale: string;
  entryCondition: string;
  riskLevel: string;
  confidence: number;
  sources: string[];
}

interface ThesisDetail {
  id: number;
  title: string;
  status: string;
  generatedAt: string;
  validUntil: string;
  marketRegime: string;
  volatilityOutlook: string;
  convergenceDensity: number;
  overallConfidence: number;
  tradingActions: TradingAction[];
  executiveSummary: string;
  situationAssessment: string;
  riskScenarios: string;
  layerInputs: {
    celestial: { activeEvents: string[]; convergenceIntensity: number };
    hebrew: { activeHolidays: string[]; shmitaRelevance: string | null };
    geopolitical: { activeEvents: string[]; escalationRisk: number };
    market: { regime: string; volatilityOutlook: string };
    gameTheory: {
      activeScenarios: string[];
      analyses: Array<{
        scenarioId: string;
        marketAssessment: {
          mostLikelyOutcome: string;
          direction: string;
          confidence: number;
          keySectors: string[];
        };
      }>;
    };
  };
  symbols: string[];
}

export default function ThesisDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [thesis, setThesis] = useState<ThesisDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [approvalAction, setApprovalAction] = useState<TradingAction | null>(null);
  const dismissed = useDismissedTrades();

  useEffect(() => {
    fetch(`/api/thesis/${id}`)
      .then((r) => r.json())
      .then((data) => {
        setThesis(data.thesis || null);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [id]);

  const closeThesis = async () => {
    if (!thesis) return;
    try {
      await fetch(`/api/thesis/${thesis.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "expired" }),
      });
      setThesis({ ...thesis, status: "expired" });
    } catch {
      // ignore
    }
  };

  if (loading) {
    return (
      <PageContainer title="Thesis" subtitle="Loading...">
        <div className="space-y-4">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-60 w-full" />
        </div>
      </PageContainer>
    );
  }

  if (!thesis) {
    return (
      <PageContainer title="Thesis Not Found">
        <p className="text-xs text-navy-500">Thesis #{id} not found.</p>
      </PageContainer>
    );
  }

  return (
    <PageContainer
      title={thesis.title}
      subtitle={`Generated ${new Date(thesis.generatedAt).toLocaleString()} | Valid until ${new Date(thesis.validUntil).toLocaleString()}`}
      actions={
        <div className="flex items-center gap-2">
          <StatusDot
            color={thesis.status === "active" ? "green" : thesis.status === "expired" ? "red" : "gray"}
            label={thesis.status}
          />
          {thesis.status === "active" && (
            <Button variant="ghost" size="sm" onClick={closeThesis}>
              Close Thesis
            </Button>
          )}
        </div>
      }
    >
      {/* Metrics Row */}
      <div className="grid grid-cols-5 gap-3 mb-6">
        <div className="border border-navy-700 rounded px-4">
          <Metric label="Regime" value={thesis.marketRegime.replace("_", " ")} />
        </div>
        <div className="border border-navy-700 rounded px-4">
          <Metric label="Volatility" value={thesis.volatilityOutlook} />
        </div>
        <div className="border border-navy-700 rounded px-4">
          <Metric label="Convergence" value={`${thesis.convergenceDensity.toFixed(1)}/10`} />
        </div>
        <div className="border border-navy-700 rounded px-4">
          <Metric label="Confidence" value={`${(thesis.overallConfidence * 100).toFixed(0)}%`} />
        </div>
        <div className="border border-navy-700 rounded px-4">
          <Metric label="Escalation Risk" value={`${(thesis.layerInputs.geopolitical.escalationRisk * 100).toFixed(0)}%`} />
        </div>
      </div>

      {/* Briefing Sections */}
      <div className="space-y-4 mb-6">
        <BriefingCard title="Executive Summary">
          <Markdown>{thesis.executiveSummary}</Markdown>
        </BriefingCard>
        <BriefingCard title="Situation Assessment">
          <Markdown>{thesis.situationAssessment}</Markdown>
        </BriefingCard>
        <BriefingCard title="Risk Scenarios">
          <Markdown>{thesis.riskScenarios}</Markdown>
        </BriefingCard>
      </div>

      {/* Trading Actions */}
      {thesis.tradingActions.length > 0 && (
        <div className="mb-6">
          <h3 className="text-[10px] font-medium uppercase tracking-widest text-navy-500 mb-2">
            Trading Actions
          </h3>
          <p className="text-xs text-navy-400 mb-3">
            Review and confirm these actions before executing. All trades require your approval.
          </p>
          <div className="space-y-1.5">
            {thesis.tradingActions
              .filter((a) => !dismissed.isDismissed(thesis.id, a.ticker, a.direction))
              .map((action, i) => (
                <TradeSuggestionCard
                  key={`${action.ticker}-${action.direction}-${i}`}
                  action={action}
                  executed={dismissed.isExecuted(thesis.id, action.ticker, action.direction)}
                  onApprove={() => setApprovalAction(action)}
                  onDecline={() => dismissed.dismiss(thesis.id, action.ticker, action.direction)}
                />
              ))}
          </div>
        </div>
      )}

      {/* Trade Approval Modal */}
      <TradeApprovalModal
        action={approvalAction}
        thesisContext={{
          id: thesis.id,
          title: thesis.title,
          marketRegime: thesis.marketRegime,
          volatilityOutlook: thesis.volatilityOutlook,
          convergenceDensity: thesis.convergenceDensity,
          overallConfidence: thesis.overallConfidence,
          layerInputs: thesis.layerInputs,
        }}
        onClose={() => setApprovalAction(null)}
        onExecuted={(ticker, direction) => {
          if (thesis) dismissed.markExecuted(thesis.id, ticker, direction);
          setApprovalAction(null);
        }}
      />

      {/* Game Theory Scenarios */}
      {thesis.layerInputs.gameTheory.analyses.length > 0 && (
        <div className="mb-6">
          <h3 className="text-[10px] font-medium uppercase tracking-widest text-navy-500 mb-2">
            Game Theory Analysis
          </h3>
          <DataGrid
            data={thesis.layerInputs.gameTheory.analyses}
            keyExtractor={(a) => a.scenarioId}
            columns={[
              {
                key: "scenario",
                header: "Scenario",
                accessor: (row) => row.scenarioId.replace(/-/g, " "),
              },
              {
                key: "outcome",
                header: "Most Likely Outcome",
                accessor: (row) => row.marketAssessment.mostLikelyOutcome,
                className: "max-w-md",
              },
              {
                key: "direction",
                header: "Direction",
                accessor: (row) => row.marketAssessment.direction,
              },
              {
                key: "confidence",
                header: "Confidence",
                accessor: (row) => `${(row.marketAssessment.confidence * 100).toFixed(0)}%`,
                sortAccessor: (row) => row.marketAssessment.confidence,
              },
              {
                key: "sectors",
                header: "Key Sectors",
                accessor: (row) => row.marketAssessment.keySectors.join(", "),
              },
            ]}
          />
        </div>
      )}

      {/* Layer Inputs Summary */}
      <div className="grid grid-cols-3 gap-4">
        {thesis.layerInputs.celestial.activeEvents.length > 0 && (
          <div className="border border-navy-700 rounded p-4">
            <h4 className="text-[10px] uppercase tracking-wider text-navy-500 mb-2">Celestial Events</h4>
            <ul className="space-y-1">
              {thesis.layerInputs.celestial.activeEvents.map((e, i) => (
                <li key={i} className="text-xs text-navy-300">{e}</li>
              ))}
            </ul>
          </div>
        )}
        {thesis.layerInputs.hebrew.activeHolidays.length > 0 && (
          <div className="border border-navy-700 rounded p-4">
            <h4 className="text-[10px] uppercase tracking-wider text-navy-500 mb-2">Hebrew Calendar</h4>
            <ul className="space-y-1">
              {thesis.layerInputs.hebrew.activeHolidays.map((h, i) => (
                <li key={i} className="text-xs text-navy-300">{h}</li>
              ))}
            </ul>
          </div>
        )}
        {thesis.layerInputs.geopolitical.activeEvents.length > 0 && (
          <div className="border border-navy-700 rounded p-4">
            <h4 className="text-[10px] uppercase tracking-wider text-navy-500 mb-2">Geopolitical Events</h4>
            <ul className="space-y-1">
              {thesis.layerInputs.geopolitical.activeEvents.map((e, i) => (
                <li key={i} className="text-xs text-navy-300">{e}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </PageContainer>
  );
}
