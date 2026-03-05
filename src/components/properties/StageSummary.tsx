import type { StageSummaryRow } from '../../lib/types';

interface Props {
  stages: StageSummaryRow[];
}

export function StageSummary({ stages }: Props) {
  if (stages.length === 0) return null;

  return (
    <div className="card-premium p-4">
      <h3 className="text-sm font-semibold text-text-primary mb-3">
        Μέσος Χρόνος ανά Στάδιο
      </h3>
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        {stages.map(s => (
          <div
            key={`${s.from}-${s.to}`}
            className="text-center p-3 rounded-xl bg-surface"
          >
            <p className="text-[10px] text-text-muted uppercase tracking-wide mb-1">
              {s.label}
            </p>
            <p className="text-xl font-bold text-text-primary">
              {s.avgDays}
              <span className="text-xs font-normal text-text-muted ml-1">ημ.</span>
            </p>
            <p className="text-[10px] text-text-muted tabular-nums">
              {s.minDays}–{s.maxDays} ημ. ({s.count})
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
