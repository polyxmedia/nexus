"use client";

import { Badge } from "@/components/ui/badge";

interface OsintEvent {
  title: string;
  url: string;
  source: string;
  country: string;
  date: string;
  tone: string;
}

interface OsintEventsData {
  query: string;
  timespan: string;
  resultCount: number;
  events: OsintEvent[];
  error?: string;
}

interface OsintEntitiesData {
  articlesProcessed: number;
  topActors: [string, number][];
  topTopics: [string, number][];
  scenarioMatches: [string, number][];
  sentimentBreakdown: {
    positive: number;
    neutral: number;
    negative: number;
  };
  error?: string;
}

type OsintData = OsintEventsData | OsintEntitiesData;

function isEventsData(data: OsintData): data is OsintEventsData {
  return "events" in data;
}

function isEntitiesData(data: OsintData): data is OsintEntitiesData {
  return "topActors" in data;
}

function sentimentColor(key: string): string {
  if (key === "positive") return "text-accent-emerald";
  if (key === "negative") return "text-accent-rose";
  return "text-navy-400";
}

export function OsintWidget({ data }: { data: OsintData }) {
  if (data.error) {
    return (
      <div className="my-2 border border-accent-rose/30 rounded bg-accent-rose/5 px-3 py-2 text-xs text-accent-rose">
        {data.error}
      </div>
    );
  }

  if (isEventsData(data)) {
    const events = (data.events ?? []).slice(0, 10);

    return (
      <div className="my-2 border border-navy-700 rounded bg-navy-900/80 p-4">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-[10px] uppercase tracking-wider text-navy-500 font-mono">
            OSINT Events
          </span>
          <Badge variant="category">{data.query}</Badge>
          <Badge className="bg-accent-cyan/20 text-accent-cyan border-accent-cyan/30">
            {data.resultCount} event{data.resultCount !== 1 ? "s" : ""}
          </Badge>
        </div>

        <div className="space-y-2">
          {events.map((event, i) => (
            <div key={i} className="flex flex-col gap-0.5">
              <div className="flex items-center gap-2">
                <a
                  href={event.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-mono text-accent-cyan hover:underline leading-snug"
                >
                  {event.title}
                </a>
                <Badge className="bg-navy-800 text-navy-300 border-navy-700 text-[9px] shrink-0">
                  {event.country}
                </Badge>
              </div>
              <div className="flex items-center gap-2 text-[10px] font-mono text-navy-500">
                <span>{event.source}</span>
                <span>{event.date}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (isEntitiesData(data)) {
    const sentiment = data.sentimentBreakdown;

    return (
      <div className="my-2 border border-navy-700 rounded bg-navy-900/80 p-4">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-[10px] uppercase tracking-wider text-navy-500 font-mono">
            OSINT Entity Analysis
          </span>
          <Badge className="bg-accent-cyan/20 text-accent-cyan border-accent-cyan/30">
            {data.articlesProcessed} articles
          </Badge>
        </div>

        {/* Sentiment Breakdown */}
        <div className="flex items-center gap-4 mb-3 text-[11px] font-mono">
          {(["positive", "neutral", "negative"] as const).map((key) => (
            <div key={key} className="flex items-center gap-1.5">
              <span className="text-navy-500 capitalize">{key}</span>
              <span className={`font-bold ${sentimentColor(key)}`}>
                {sentiment[key]}
              </span>
            </div>
          ))}
        </div>

        {/* Top Actors */}
        {data.topActors.length > 0 && (
          <div className="mb-2">
            <div className="text-[10px] uppercase tracking-wider text-navy-500 font-mono mb-1">
              Top Actors
            </div>
            <div className="flex flex-wrap gap-1">
              {data.topActors.map(([name, count]) => (
                <Badge key={name} className="bg-navy-800 text-navy-300 border-navy-700">
                  {name} ({count})
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Top Topics */}
        {data.topTopics.length > 0 && (
          <div className="mb-2">
            <div className="text-[10px] uppercase tracking-wider text-navy-500 font-mono mb-1">
              Top Topics
            </div>
            <div className="flex flex-wrap gap-1">
              {data.topTopics.map(([name, count]) => (
                <Badge key={name} className="bg-accent-cyan/10 text-accent-cyan border-accent-cyan/20">
                  {name} ({count})
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Scenario Matches */}
        {data.scenarioMatches.length > 0 && (
          <div>
            <div className="text-[10px] uppercase tracking-wider text-navy-500 font-mono mb-1">
              Scenario Matches
            </div>
            <div className="flex flex-wrap gap-1">
              {data.scenarioMatches.map(([name, count]) => (
                <Badge key={name} className="bg-accent-amber/10 text-accent-amber border-accent-amber/20">
                  {name} ({count})
                </Badge>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  return null;
}
