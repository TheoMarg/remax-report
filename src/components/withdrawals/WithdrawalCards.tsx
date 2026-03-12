import type { WithdrawalCategorySummary } from '../../lib/metrics';

interface Props {
  categories: WithdrawalCategorySummary[];
}

export function WithdrawalCards({ categories }: Props) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {categories.map(cat => {
        const visibleReasons = cat.reasons.filter(r => r.cnt > 0);
        return (
          <div
            key={cat.key}
            className="card-premium p-5 flex flex-col relative overflow-hidden"
          >
            <div className="absolute top-0 left-0 right-0 h-[3px]" style={{ background: `linear-gradient(90deg, ${cat.color}, ${cat.color}66)` }} />

            <div className="flex items-baseline justify-between mb-4 mt-1">
              <div className="flex items-center gap-2.5">
                <div
                  className="w-3 h-3 rounded-full shrink-0"
                  style={{ backgroundColor: cat.color }}
                />
                <h4 className="text-sm font-bold text-text-primary">{cat.label}</h4>
              </div>
              <span className="text-2xl font-extrabold stat-number" style={{ color: cat.color }}>
                {cat.total.toLocaleString('el-GR')}
              </span>
            </div>

            <div className="space-y-2 flex-1">
              {visibleReasons.length > 0 ? (
                visibleReasons.map(r => {
                  const pct = cat.total > 0 ? Math.round((r.cnt / cat.total) * 100) : 0;
                  return (
                    <div key={r.reason} className="flex items-center justify-between text-xs gap-2">
                      <span className="text-text-secondary truncate">{r.reason}</span>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="text-text-primary font-semibold tabular-nums">{r.cnt.toLocaleString('el-GR')}</span>
                        <span className="text-text-muted text-[10px] tabular-nums w-8 text-right">{pct}%</span>
                      </div>
                    </div>
                  );
                })
              ) : (
                <span className="text-[11px] text-text-muted">Κανένα περιστατικό</span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
