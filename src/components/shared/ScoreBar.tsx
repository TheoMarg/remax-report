interface Props {
  label: string;
  score: number;
  maxScore?: number;
  rank?: number;
  color?: string;
}

export function ScoreBar({ label, score, maxScore = 100, rank, color = '#1B5299' }: Props) {
  const pct = maxScore > 0 ? Math.min((score / maxScore) * 100, 100) : 0;

  return (
    <div className="flex items-center gap-3">
      {rank !== undefined && (
        <span className="text-sm font-bold text-text-muted w-6 text-right">#{rank}</span>
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <span className="text-sm font-medium text-text-primary truncate">{label}</span>
          <span className="text-sm font-bold stat-number ml-2" style={{ color }}>
            {score.toFixed(1)}
          </span>
        </div>
        <div className="h-2 bg-surface-light rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${pct}%`, backgroundColor: color }}
          />
        </div>
      </div>
    </div>
  );
}
