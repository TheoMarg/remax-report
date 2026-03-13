import { useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { useDemandSupply, type DemandSupplyRow } from '../../hooks/useDemandSupply';

const STATUS_ICON: Record<string, string> = {
  green: '\u{1F7E2}',
  yellow: '\u{1F7E1}',
  red: '\u{1F534}',
};

function fmt(n: number): string {
  return n.toLocaleString('el-GR');
}

export function DemandIntelligence() {
  const { data: rows = [], isLoading, isError } = useDemandSupply();

  const { chartData, topGap } = useMemo(() => {
    const chartData = rows.slice(0, 12).map(r => ({
      name: r.category.length > 12 ? r.category.slice(0, 12) + '…' : r.category,
      fullName: r.category,
      demand: r.requestCount,
      supply: r.matchingSupply,
    }));

    const topGap = rows.length > 0 ? rows[0] : null;

    return { chartData, topGap };
  }, [rows]);

  if (isLoading) {
    return (
      <div className="card-premium p-5">
        <div className="h-[200px] flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-brand-blue border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if (isError || rows.length === 0) {
    return (
      <div className="card-premium p-5 text-center">
        <p className="text-sm text-text-muted">
          {isError ? 'Σφάλμα φόρτωσης demand data.' : 'Δεν υπάρχουν δεδομένα ζήτησης.'}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Table */}
      <div className="card-premium p-5">
        <h3 className="text-sm font-semibold text-text-primary mb-1">
          Demand Intelligence (Ζήτηση vs Προσφορά)
        </h3>
        <p className="text-xs text-text-muted mb-4">
          Αντιστοίχιση ζητήσεων πελατών με διαθέσιμα ακίνητα
        </p>

        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-surface-light text-text-muted text-[10px] uppercase tracking-wider">
                <th className="text-left px-3 py-2">Κατηγορία</th>
                <th className="text-right px-3 py-2">Ζητήσεις</th>
                <th className="text-right px-3 py-2">Ταίριασμα</th>
                <th className="text-right px-3 py-2">Κενό</th>
                <th className="text-center px-3 py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(row => (
                <tr key={row.category} className="border-t border-border-subtle">
                  <td className="px-3 py-2 font-medium text-text-primary">{row.category}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{fmt(row.requestCount)}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{fmt(row.matchingSupply)}</td>
                  <td className="px-3 py-2 text-right tabular-nums font-semibold">
                    <span className={row.gap > 0 ? 'text-brand-red' : 'text-brand-green'}>
                      {row.gap > 0 ? '+' : ''}{fmt(row.gap)}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-center">{STATUS_ICON[row.status]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Bar chart */}
      {chartData.length > 0 && (
        <div className="card-premium p-5">
          <h4 className="text-sm font-semibold text-text-primary mb-3">Demand vs Supply (Ζήτηση vs Προσφορά)</h4>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 30 }}>
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 10, fill: '#8A94A0' }}
                  axisLine={false}
                  tickLine={false}
                  angle={-25}
                  textAnchor="end"
                  height={60}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: '#8A94A0' }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: 12,
                    border: '1px solid #DDD8D0',
                    fontSize: 12,
                    boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                  }}
                  labelFormatter={(_, payload) => {
                    const item = payload?.[0]?.payload;
                    return item?.fullName ?? '';
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="demand" name="Ζητήσεις" fill="#6B5CA5" radius={[3, 3, 0, 0]} />
                <Bar dataKey="supply" name="Προσφορά" fill="#168F80" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Auto-generated insight */}
      {topGap && topGap.gap > 0 && (
        <div className="px-4 py-3 bg-amber-50 rounded-lg border border-amber-200">
          <p className="text-xs text-amber-800">
            <span className="font-semibold">Insight:</span>{' '}
            Υψηλή ζήτηση σε <strong>{topGap.category}</strong> ({topGap.requestCount} ζητήσεις, {topGap.matchingSupply} προσφορά)
            — ευκαιρία expansion στην κατηγορία αυτή.
          </p>
        </div>
      )}
    </div>
  );
}
