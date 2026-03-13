import { useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import type { PropertyJourney } from '../../lib/types';

function fmtPct(n: number): string {
  return `${Math.round(n)}%`;
}

interface Props {
  journeys: PropertyJourney[];
}

export function PriceElasticity({ journeys }: Props) {
  // Group properties by price reduction count
  const analysis = useMemo(() => {
    const withPrice = journeys.filter(j => j.listing_price && j.listing_price > 0);
    if (withPrice.length === 0) return null;

    // Buckets: 0, 1, 2, 3+
    const buckets = [
      { label: '0 reductions', reductions: 0, filter: (j: PropertyJourney) => j.price_reduction_count === 0 },
      { label: '1 reduction', reductions: 1, filter: (j: PropertyJourney) => j.price_reduction_count === 1 },
      { label: '2 reductions', reductions: 2, filter: (j: PropertyJourney) => j.price_reduction_count === 2 },
      { label: '3+ reductions', reductions: 3, filter: (j: PropertyJourney) => j.price_reduction_count >= 3 },
    ];

    const data = buckets.map(bucket => {
      const props = withPrice.filter(bucket.filter);
      const closed = props.filter(j => j.has_closing);
      const total = props.length;
      const closedCount = closed.length;
      const closedPct = total > 0 ? Math.round((closedCount / total) * 100) : 0;

      const avgDom = closed.length > 0
        ? Math.round(closed.filter(j => j.days_total_journey != null).reduce((s, j) => s + j.days_total_journey!, 0) / Math.max(closed.filter(j => j.days_total_journey != null).length, 1))
        : null;

      const avgDiscount = closed.length > 0
        ? Math.round(closed.filter(j => j.price_delta_pct != null).reduce((s, j) => s + Math.abs(j.price_delta_pct!), 0) / Math.max(closed.filter(j => j.price_delta_pct != null).length, 1) * 10) / 10
        : null;

      return {
        name: bucket.label,
        total,
        closed: closedCount,
        'Closed %': closedPct,
        'Avg DOM': avgDom,
        'Avg Discount %': avgDiscount,
      };
    });

    // Insight text
    const with1or2 = withPrice.filter(j => j.price_reduction_count >= 1 && j.price_reduction_count <= 2 && j.has_closing);
    const without = withPrice.filter(j => j.price_reduction_count === 0 && j.has_closing);
    const dom1or2 = with1or2.filter(j => j.days_total_journey != null);
    const dom0 = without.filter(j => j.days_total_journey != null);
    const avgDom1or2 = dom1or2.length > 0 ? dom1or2.reduce((s, j) => s + j.days_total_journey!, 0) / dom1or2.length : null;
    const avgDom0 = dom0.length > 0 ? dom0.reduce((s, j) => s + j.days_total_journey!, 0) / dom0.length : null;

    let insight: string | null = null;
    if (avgDom1or2 != null && avgDom0 != null && avgDom0 > 0) {
      const faster = Math.round(((avgDom0 - avgDom1or2) / avgDom0) * 100);
      if (faster > 0) {
        insight = `Properties with 1-2 price reductions close in ${Math.round(avgDom1or2)} days — ${faster}% faster than those without.`;
      }
    }

    return { data, insight };
  }, [journeys]);

  if (!analysis || analysis.data.every(d => d.total === 0)) return null;

  return (
    <div className="bg-surface-card rounded-xl border border-border-default p-4 space-y-4">
      <h3 className="text-sm font-semibold text-text-primary">
        Price Elasticity (Ελαστικότητα Τιμής)
      </h3>

      {/* Bar chart: Closed % by reduction bucket */}
      <div className="h-[220px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={analysis.data} margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-subtle)" vertical={false} />
            <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }} />
            <YAxis tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }} />
            <Tooltip contentStyle={{ background: 'var(--color-surface-card)', border: '1px solid var(--color-border-default)', borderRadius: '8px', fontSize: '12px' }} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Bar dataKey="Closed %" fill="#1D7A4E" radius={[4, 4, 0, 0]} />
            <Bar dataKey="Avg DOM" fill="#6B5CA5" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-left text-text-muted border-b border-border-default">
              <th className="pb-2 pr-3 font-medium">Reductions</th>
              <th className="pb-2 pr-3 font-medium text-right">Total</th>
              <th className="pb-2 pr-3 font-medium text-right">Closed</th>
              <th className="pb-2 pr-3 font-medium text-right">Closed %</th>
              <th className="pb-2 pr-3 font-medium text-right">Avg DOM</th>
              <th className="pb-2 font-medium text-right">Avg Discount</th>
            </tr>
          </thead>
          <tbody>
            {analysis.data.map(row => (
              <tr key={row.name} className="border-b border-border-subtle">
                <td className="py-1.5 pr-3 font-medium">{row.name}</td>
                <td className="py-1.5 pr-3 text-right tabular-nums">{row.total}</td>
                <td className="py-1.5 pr-3 text-right tabular-nums">{row.closed}</td>
                <td className="py-1.5 pr-3 text-right tabular-nums font-semibold text-brand-green">{fmtPct(row['Closed %'])}</td>
                <td className="py-1.5 pr-3 text-right tabular-nums">{row['Avg DOM'] ?? '—'}d</td>
                <td className="py-1.5 text-right tabular-nums">{row['Avg Discount %'] != null ? `${row['Avg Discount %']}%` : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Insight */}
      {analysis.insight && (
        <div className="bg-brand-teal/5 border border-brand-teal/20 rounded-lg px-4 py-2.5 text-xs text-text-secondary">
          {analysis.insight}
        </div>
      )}
    </div>
  );
}
