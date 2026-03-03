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
            className="bg-white rounded-lg border border-[#DDD8D0] p-4 flex flex-col"
          >
            {/* Header */}
            <div className="flex items-baseline justify-between mb-3">
              <div className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full shrink-0"
                  style={{ backgroundColor: cat.color }}
                />
                <h4 className="text-sm font-semibold text-[#0C1E3C]">{cat.label}</h4>
              </div>
              <span className="text-2xl font-bold" style={{ color: cat.color }}>
                {cat.total.toLocaleString('el-GR')}
              </span>
            </div>

            {/* Reason list */}
            <div className="space-y-1.5 flex-1">
              {visibleReasons.length > 0 ? (
                visibleReasons.map(r => {
                  const pct = cat.total > 0 ? Math.round((r.cnt / cat.total) * 100) : 0;
                  return (
                    <div key={r.reason} className="flex items-center justify-between text-xs gap-2">
                      <span className="text-[#3A4550] truncate">{r.reason}</span>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="text-[#0C1E3C] font-semibold tabular-nums">
                          {r.cnt.toLocaleString('el-GR')}
                        </span>
                        <span className="text-[#8A94A0] text-[10px] tabular-nums w-8 text-right">
                          {pct}%
                        </span>
                      </div>
                    </div>
                  );
                })
              ) : (
                <span className="text-[11px] text-[#8A94A0]">Κανένα περιστατικό</span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
