import { useMemo } from 'react';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import type { PropertyJourney } from '../../lib/types';

const MONTH_SHORT = ['Ιαν', 'Φεβ', 'Μαρ', 'Απρ', 'Μάι', 'Ιούν', 'Ιούλ', 'Αύγ', 'Σεπ', 'Οκτ', 'Νοέ', 'Δεκ'];

const TRANSITIONS = [
  { key: 'reg_excl', label: 'Reg→Excl', color: '#1B5299', field: 'days_reg_to_excl' as const },
  { key: 'excl_show', label: 'Excl→Show', color: '#168F80', dateFrom: 'dt_exclusive' as const, dateTo: 'dt_first_showing' as const },
  { key: 'show_offer', label: 'Show→Offer', color: '#6B5CA5', dateFrom: 'dt_first_showing' as const, dateTo: 'dt_offer' as const },
  { key: 'offer_close', label: 'Offer→Close', color: '#D4722A', field: 'days_offer_to_closing' as const },
] as const;

function daysBetween(from: string, to: string): number {
  return Math.max(0, Math.round((new Date(to).getTime() - new Date(from).getTime()) / 86400000));
}

function fmtMonth(month: string): string {
  const [, m] = month.split('-');
  return MONTH_SHORT[parseInt(m) - 1] || month;
}

interface Props {
  journeys: PropertyJourney[];
}

export function VelocityTrend({ journeys }: Props) {
  const { chartData, bottleneck } = useMemo(() => {
    // Group journeys by month of dt_registration
    const monthBuckets = new Map<string, PropertyJourney[]>();
    for (const j of journeys) {
      if (!j.dt_registration) continue;
      const month = j.dt_registration.slice(0, 7);
      if (!monthBuckets.has(month)) monthBuckets.set(month, []);
      monthBuckets.get(month)!.push(j);
    }

    const months = Array.from(monthBuckets.keys()).sort();

    const chartData = months.map(month => {
      const bucket = monthBuckets.get(month)!;

      // Reg→Excl
      const regExcl = bucket.filter(j => j.days_reg_to_excl != null).map(j => j.days_reg_to_excl!);
      const avgRegExcl = regExcl.length > 0 ? Math.round(regExcl.reduce((s, v) => s + v, 0) / regExcl.length) : null;

      // Excl→Show (computed from dates)
      const exclShow = bucket
        .filter(j => j.dt_exclusive && j.dt_first_showing)
        .map(j => daysBetween(j.dt_exclusive!, j.dt_first_showing!));
      const avgExclShow = exclShow.length > 0 ? Math.round(exclShow.reduce((s, v) => s + v, 0) / exclShow.length) : null;

      // Show→Offer
      const showOffer = bucket
        .filter(j => j.dt_first_showing && j.dt_offer)
        .map(j => daysBetween(j.dt_first_showing!, j.dt_offer!));
      const avgShowOffer = showOffer.length > 0 ? Math.round(showOffer.reduce((s, v) => s + v, 0) / showOffer.length) : null;

      // Offer→Close
      const offerClose = bucket.filter(j => j.days_offer_to_closing != null).map(j => j.days_offer_to_closing!);
      const avgOfferClose = offerClose.length > 0 ? Math.round(offerClose.reduce((s, v) => s + v, 0) / offerClose.length) : null;

      return {
        month,
        monthLabel: fmtMonth(month),
        reg_excl: avgRegExcl,
        excl_show: avgExclShow,
        show_offer: avgShowOffer,
        offer_close: avgOfferClose,
      };
    });

    // Find current bottleneck (last 3 months avg)
    const recent = chartData.slice(-3);
    const transitionAvgs: { key: string; label: string; avg: number }[] = [];
    for (const t of TRANSITIONS) {
      const vals = recent.map(d => d[t.key as keyof typeof d] as number | null).filter((v): v is number => v != null);
      if (vals.length > 0) {
        transitionAvgs.push({
          key: t.key,
          label: t.label,
          avg: Math.round(vals.reduce((s, v) => s + v, 0) / vals.length),
        });
      }
    }
    const bottleneck = transitionAvgs.length > 0
      ? transitionAvgs.reduce((max, t) => t.avg > max.avg ? t : max, transitionAvgs[0])
      : null;

    return { chartData, bottleneck };
  }, [journeys]);

  if (chartData.length < 2) return null;

  return (
    <div className="card-premium p-5">
      <h3 className="text-sm font-semibold text-text-primary mb-1">
        Deal Velocity Trend (Ταχύτητα Pipeline)
      </h3>
      <p className="text-xs text-text-muted mb-4">
        Average days per stage transition per registration month
      </p>

      <div className="h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
            <XAxis
              dataKey="monthLabel"
              tick={{ fontSize: 11, fill: '#8A94A0' }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 10, fill: '#8A94A0' }}
              axisLine={false}
              tickLine={false}
              label={{ value: 'Ημέρες', angle: -90, position: 'insideLeft', fontSize: 10, fill: '#8A94A0' }}
            />
            <Tooltip
              contentStyle={{
                borderRadius: 12,
                border: '1px solid #DDD8D0',
                fontSize: 12,
                boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
              }}
              formatter={(value: number, name: string) => [`${value}d`, name]}
              labelFormatter={(label) => `${label}`}
            />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            {TRANSITIONS.map(t => (
              <Line
                key={t.key}
                type="monotone"
                dataKey={t.key}
                name={t.label}
                stroke={t.color}
                strokeWidth={2}
                dot={{ r: 3 }}
                connectNulls
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {bottleneck && (
        <div className="mt-3 flex items-center gap-2 px-3 py-2 bg-amber-50 rounded-lg border border-amber-200">
          <span className="text-xs font-semibold text-amber-800">
            Bottleneck: {bottleneck.label} ({bottleneck.avg} ημέρες μ.ο.)
          </span>
        </div>
      )}
    </div>
  );
}
