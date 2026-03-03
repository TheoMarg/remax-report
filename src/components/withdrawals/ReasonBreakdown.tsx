import type { WithdrawalReason } from '../../lib/types';
import { WITHDRAWAL_CATEGORIES } from '../../lib/metrics';

interface Props {
  rows: WithdrawalReason[];
}

// Build a reason → color lookup
const REASON_COLOR = new Map<string, string>();
for (const cat of WITHDRAWAL_CATEGORIES) {
  for (const r of cat.reasons) {
    REASON_COLOR.set(r, cat.color);
  }
}

export function ReasonBreakdown({ rows }: Props) {
  // Sum by reason across all rows
  const reasonTotals = new Map<string, number>();
  for (const r of rows) {
    reasonTotals.set(r.reason, (reasonTotals.get(r.reason) || 0) + r.cnt);
  }

  const total = Array.from(reasonTotals.values()).reduce((s, v) => s + v, 0);

  const sorted = Array.from(reasonTotals.entries())
    .map(([reason, cnt]) => ({ reason, cnt }))
    .filter(r => r.cnt > 0)
    .sort((a, b) => b.cnt - a.cnt);

  const maxValue = Math.max(...sorted.map(r => r.cnt), 1);

  if (sorted.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-[#DDD8D0] p-5 text-center">
        <span className="text-sm text-[#8A94A0]">Δεν υπάρχουν δεδομένα</span>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-[#DDD8D0] p-5">
      <h3 className="text-sm font-semibold text-[#0C1E3C] mb-4">Κατανομή Λόγων Απόσυρσης</h3>
      <div className="space-y-2">
        {sorted.map(r => {
          const widthPct = Math.max((r.cnt / maxValue) * 100, 6);
          const color = REASON_COLOR.get(r.reason) || '#8A94A0';
          const pct = total > 0 ? Math.round((r.cnt / total) * 100) : 0;
          return (
            <div key={r.reason} className="flex items-center gap-3">
              <div className="w-[150px] shrink-0 text-right">
                <span className="text-xs font-medium text-[#3A4550]">
                  {r.reason}
                </span>
              </div>
              <div className="flex-1">
                <div className="h-6 bg-[#F7F6F3] rounded overflow-hidden">
                  <div
                    className="h-full rounded flex items-center transition-all duration-500"
                    style={{ width: `${widthPct}%`, backgroundColor: color }}
                  >
                    <span className="text-[10px] font-bold text-white pl-2 whitespace-nowrap">
                      {r.cnt.toLocaleString('el-GR')}
                    </span>
                  </div>
                </div>
              </div>
              <div className="w-10 shrink-0 text-right">
                <span className="text-[10px] font-semibold text-[#8A94A0] tabular-nums">{pct}%</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
