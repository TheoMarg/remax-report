import type { PacingResult } from '../../lib/pacing';
import { PACING_COLORS, PACING_LABELS } from '../../lib/pacing';

interface Props {
  pacing: PacingResult;
  compact?: boolean;
}

export function PacingBadge({ pacing, compact = false }: Props) {
  const color = PACING_COLORS[pacing.status];
  const label = PACING_LABELS[pacing.status];

  if (compact) {
    return (
      <span
        className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-md"
        style={{ backgroundColor: `${color}15`, color }}
        title={`${pacing.metric}: ${pacing.pct_of_pace}% of pace (${pacing.actual}/${Math.round(pacing.ideal)} ideal)`}
      >
        {pacing.pct_of_pace}%
      </span>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <div className="flex-1">
        <div className="flex items-center justify-between text-[10px] mb-1">
          <span className="font-medium text-text-secondary">{pacing.metric}</span>
          <span className="font-semibold" style={{ color }}>
            {label} ({pacing.pct_of_pace}%)
          </span>
        </div>
        <div className="h-2 bg-surface-light rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all"
            style={{
              width: `${Math.min(pacing.pct_of_pace, 100)}%`,
              backgroundColor: color,
            }}
          />
        </div>
        <div className="flex justify-between text-[9px] text-text-muted mt-0.5">
          <span>{pacing.actual} / {pacing.target}</span>
          <span>Need {pacing.required_weekly}/wk</span>
        </div>
      </div>
    </div>
  );
}
