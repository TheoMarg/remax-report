import { useMemo } from 'react';
import type { PropertyJourney } from '../../lib/types';

const MONTH_SHORT_EL = ['Ιαν', 'Φεβ', 'Μαρ', 'Απρ', 'Μάι', 'Ιούν', 'Ιούλ', 'Αύγ', 'Σεπ', 'Οκτ', 'Νοέ', 'Δεκ'];

interface CohortRow {
  month: string;
  label: string;
  registered: number;
  exclPct: number;
  showPct: number;
  closePct: number;
  avgDays: number | null;
}

interface Props {
  journeys: PropertyJourney[];
}

export function CohortAnalysis({ journeys }: Props) {
  const cohorts = useMemo((): CohortRow[] => {
    // Group by month of dt_registration
    const groups = new Map<string, PropertyJourney[]>();
    for (const j of journeys) {
      if (!j.dt_registration) continue;
      const month = j.dt_registration.slice(0, 7); // 'YYYY-MM'
      if (!groups.has(month)) groups.set(month, []);
      groups.get(month)!.push(j);
    }

    return Array.from(groups.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-12) // Last 12 months
      .map(([month, props]) => {
        const total = props.length;
        const withExcl = props.filter(j => j.has_exclusive).length;
        const withShow = props.filter(j => j.has_showing).length;
        const withClose = props.filter(j => j.has_closing).length;
        const daysArr = props.filter(j => j.days_total_journey != null).map(j => j.days_total_journey!);
        const avgDays = daysArr.length > 0 ? Math.round(daysArr.reduce((a, b) => a + b, 0) / daysArr.length) : null;

        const [yr, mo] = month.split('-');
        const label = `${MONTH_SHORT_EL[parseInt(mo) - 1]} ${yr.slice(2)}`;

        return {
          month,
          label,
          registered: total,
          exclPct: total > 0 ? Math.round((withExcl / total) * 100) : 0,
          showPct: total > 0 ? Math.round((withShow / total) * 100) : 0,
          closePct: total > 0 ? Math.round((withClose / total) * 100) : 0,
          avgDays,
        };
      });
  }, [journeys]);

  if (cohorts.length === 0) return null;

  return (
    <div className="card-premium p-5">
      <h3 className="text-sm font-semibold text-text-primary mb-4">
        Cohort Analysis (Ανάλυση Γενιών Ακινήτων)
      </h3>

      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-left text-text-muted border-b border-border-default text-[10px] uppercase tracking-wider">
              <th className="pb-2 pr-3 font-medium">Month (Μήνας)</th>
              <th className="pb-2 pr-3 font-medium text-right">Registered</th>
              <th className="pb-2 pr-3 font-medium text-right">→ Exclusive %</th>
              <th className="pb-2 pr-3 font-medium text-right">→ Showing %</th>
              <th className="pb-2 pr-3 font-medium text-right">→ Closing %</th>
              <th className="pb-2 font-medium text-right">Avg Days</th>
            </tr>
          </thead>
          <tbody>
            {cohorts.map(row => (
              <tr key={row.month} className="border-b border-border-subtle">
                <td className="py-2 pr-3 font-medium text-text-primary">{row.label}</td>
                <td className="py-2 pr-3 text-right tabular-nums">{row.registered}</td>
                <td className="py-2 pr-3 text-right tabular-nums">
                  <CohortBar pct={row.exclPct} color="#168F80" />
                </td>
                <td className="py-2 pr-3 text-right tabular-nums">
                  <CohortBar pct={row.showPct} color="#6B5CA5" />
                </td>
                <td className="py-2 pr-3 text-right tabular-nums">
                  <CohortBar pct={row.closePct} color="#D4722A" />
                </td>
                <td className="py-2 text-right tabular-nums text-text-secondary">
                  {row.avgDays != null ? `${row.avgDays}d` : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="text-[10px] text-text-muted mt-3 pt-2 border-t border-border-subtle">
        Each row = properties registered in that month, tracking what % reached each milestone.
      </div>
    </div>
  );
}

function CohortBar({ pct, color }: { pct: number; color: string }) {
  return (
    <div className="flex items-center gap-1.5 justify-end">
      <div className="w-16 h-3 bg-surface-light rounded-full overflow-hidden">
        <div
          className="h-full rounded-full"
          style={{ width: `${Math.min(pct, 100)}%`, backgroundColor: color }}
        />
      </div>
      <span className="w-8 text-right font-semibold" style={{ color }}>{pct}%</span>
    </div>
  );
}
