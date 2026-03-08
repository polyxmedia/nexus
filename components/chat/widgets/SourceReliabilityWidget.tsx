"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */

function reliabilityColor(r: string): string {
  if (r === "A") return "#10b981";
  if (r === "B") return "#06b6d4";
  if (r === "C") return "#f59e0b";
  return "#f43f5e";
}

export function SourceReliabilityWidget({ data }: { data: any }) {
  if (data.error) {
    return (
      <div className="my-2 border border-accent-rose/30 rounded bg-accent-rose/5 px-3 py-2 text-xs text-accent-rose">
        {data.error}
      </div>
    );
  }

  const {
    domain,
    name,
    reliability,
    category,
    region,
    biasDirection,
    specialties = [],
    stateAffiliated,
    trackRecord,
    admiraltyRating,
    informationAccuracy,
    accuracyExplanation,
    notes,
  } = data;

  return (
    <div className="my-2 border border-navy-700/40 rounded bg-navy-900/60 p-4">
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="font-mono text-[9px] uppercase tracking-widest text-navy-500 mb-1">
            Source Assessment
          </div>
          <div className="font-mono text-sm text-navy-200">{name || domain}</div>
          {domain && name && <div className="font-mono text-[10px] text-navy-500">{domain}</div>}
        </div>
        <div className="text-right">
          {admiraltyRating && (
            <div className="font-mono text-2xl font-bold" style={{ color: reliabilityColor(reliability) }}>
              {admiraltyRating}
            </div>
          )}
          <div className="font-mono text-[9px] text-navy-600">NATO/Admiralty</div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-3">
        <div>
          <div className="font-mono text-[9px] text-navy-600">Reliability</div>
          <div className="font-mono text-sm" style={{ color: reliabilityColor(reliability) }}>
            {reliability} - {reliability === "A" ? "Completely reliable" : reliability === "B" ? "Usually reliable" : reliability === "C" ? "Fairly reliable" : "Not usually reliable"}
          </div>
        </div>
        <div>
          <div className="font-mono text-[9px] text-navy-600">Information Accuracy</div>
          <div className="font-mono text-sm text-navy-300">{informationAccuracy}/6</div>
          {accuracyExplanation && <div className="font-mono text-[9px] text-navy-500">{accuracyExplanation}</div>}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-3">
        {category && (
          <div>
            <div className="font-mono text-[9px] text-navy-600">Category</div>
            <div className="font-mono text-[10px] text-navy-300">{category}</div>
          </div>
        )}
        {region && (
          <div>
            <div className="font-mono text-[9px] text-navy-600">Region</div>
            <div className="font-mono text-[10px] text-navy-300">{region}</div>
          </div>
        )}
        {biasDirection && (
          <div>
            <div className="font-mono text-[9px] text-navy-600">Bias</div>
            <div className="font-mono text-[10px] text-navy-300">{biasDirection}</div>
          </div>
        )}
      </div>

      {stateAffiliated && (
        <div className="font-mono text-[9px] text-accent-amber/80 mb-2">State-affiliated media</div>
      )}

      {trackRecord != null && (
        <div className="mb-2">
          <div className="font-mono text-[9px] text-navy-600 mb-1">Track Record</div>
          <div className="h-1 w-full bg-navy-800 rounded-full overflow-hidden">
            <div className="h-full rounded-full bg-accent-cyan" style={{ width: `${trackRecord * 100}%`, opacity: 0.7 }} />
          </div>
        </div>
      )}

      {specialties.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {specialties.map((s: string) => (
            <span key={s} className="font-mono text-[8px] text-navy-500 border border-navy-800 rounded px-1 py-0.5">{s}</span>
          ))}
        </div>
      )}

      {notes && <div className="font-mono text-[9px] text-navy-500">{notes}</div>}
    </div>
  );
}
