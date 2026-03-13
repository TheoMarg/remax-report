import { useState, useMemo } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  ReferenceLine, Legend,
} from 'recharts';
import { useForecast } from '../../hooks/useForecast';


const MONTH_SHORT = ['Ιαν', 'Φεβ', 'Μαρ', 'Απρ', 'Μάι', 'Ιούν', 'Ιούλ', 'Αύγ', 'Σεπ', 'Οκτ', 'Νοέ', 'Δεκ'];

function fmtEur(n: number | null | undefined): string {
  if (n == null) return '—';
  return `€${n.toLocaleString('el-GR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function fmtMonth(month: string): string {
  const [yr, mo] = month.split('-');
  return `${MONTH_SHORT[parseInt(mo) - 1]} '${yr.slice(2)}`;
}

export function RevenueForecast() {
  const [officeFilter, setOfficeFilter] = useState<string>('all');
  const [whatIfPct, setWhatIfPct] = useState(0);
  const { data: forecast = [], isLoading } = useForecast(officeFilter);

  const { chartData, todayMonth: _todayMonth, methodTable, quarterlyGci } = useMemo(() => {
    const now = new Date();
    const todayMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    // Apply what-if adjustment to forecast months
    const adjustFactor = 1 + whatIfPct / 100;
    const chartData = forecast.map(f => ({
      month: fmtMonth(f.month),
      rawMonth: f.month,
      actual: f.actual,
      forecast: f.actual == null ? Math.round(f.ensemble * adjustFactor) : null,
      confidence_low: f.actual == null ? Math.round(f.confidence_low * adjustFactor) : null,
      confidence_high: f.actual == null ? Math.round(f.confidence_high * adjustFactor) : null,
    }));

    // Method comparison table (only forecast months)
    const methodTable = forecast
      .filter(f => f.actual == null)
      .map(f => ({
        month: fmtMonth(f.month),
        moving_avg: Math.round(f.moving_avg * adjustFactor),
        linear_trend: Math.round(f.linear_trend * adjustFactor),
        yoy_growth: f.yoy_growth != null ? Math.round(f.yoy_growth * adjustFactor) : null,
        seasonal: f.seasonal != null ? Math.round(f.seasonal * adjustFactor) : null,
        ensemble: Math.round(f.ensemble * adjustFactor),
      }));

    // Quarterly GCI from next 3 forecast months
    const forecastMonths = forecast.filter(f => f.actual == null).slice(0, 3);
    const quarterlyGci = forecastMonths.reduce((s, f) => s + Math.round(f.ensemble * adjustFactor), 0);

    return { chartData, todayMonth, methodTable, quarterlyGci };
  }, [forecast, whatIfPct]);

  if (isLoading) {
    return (
      <div className="card-premium p-5">
        <div className="h-[300px] flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-brand-blue border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if (chartData.length === 0) {
    return (
      <div className="card-premium p-5 text-center">
        <p className="text-sm text-text-muted">Δεν υπάρχουν αρκετά δεδομένα για πρόβλεψη.</p>
      </div>
    );
  }

  // Find the boundary index between actual and forecast
  const boundaryIdx = chartData.findIndex(d => d.actual == null);

  return (
    <div className="space-y-5">
      {/* Header controls */}
      <div className="flex flex-wrap items-center gap-4">
        <select
          value={officeFilter}
          onChange={e => setOfficeFilter(e.target.value)}
          className="text-sm border border-border-default rounded-lg px-3 py-2 bg-surface-card text-text-primary"
        >
          <option value="all">Όλα τα γραφεία</option>
          <option value="larissa">Λάρισα</option>
          <option value="katerini">Κατερίνη</option>
        </select>
      </div>

      {/* Chart */}
      <div className="card-premium p-5">
        <h4 className="text-sm font-semibold text-text-primary mb-4">GCI Forecast — 6 Month Projection</h4>
        <div className="h-[350px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 5 }}>
              <defs>
                <linearGradient id="actualGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#1B5299" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#1B5299" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="forecastGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#168F80" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#168F80" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="confGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#168F80" stopOpacity={0.1} />
                  <stop offset="95%" stopColor="#168F80" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="month"
                tick={{ fontSize: 10, fill: '#8A94A0' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 10, fill: '#8A94A0' }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v: number) => `€${(v / 1000).toFixed(0)}k`}
              />
              <Tooltip
                contentStyle={{
                  borderRadius: 12,
                  border: '1px solid #DDD8D0',
                  fontSize: 12,
                  boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                }}
                formatter={(value, name) => [fmtEur(Number(value) || 0), String(name)]}
              />
              <Legend wrapperStyle={{ fontSize: 11 }} />

              {/* Confidence band */}
              <Area
                type="monotone"
                dataKey="confidence_high"
                stroke="none"
                fill="url(#confGrad)"
                name="Confidence High"
                legendType="none"
              />
              <Area
                type="monotone"
                dataKey="confidence_low"
                stroke="none"
                fill="#ffffff"
                name="Confidence Low"
                legendType="none"
              />

              {/* Actual GCI */}
              <Area
                type="monotone"
                dataKey="actual"
                stroke="#1B5299"
                strokeWidth={2}
                fill="url(#actualGrad)"
                name="Actual GCI"
                connectNulls={false}
              />

              {/* Forecast */}
              <Area
                type="monotone"
                dataKey="forecast"
                stroke="#168F80"
                strokeWidth={2}
                strokeDasharray="6 3"
                fill="url(#forecastGrad)"
                name="Forecast (Ensemble)"
                connectNulls={false}
              />

              {/* Today line */}
              {boundaryIdx > 0 && (
                <ReferenceLine
                  x={chartData[boundaryIdx - 1]?.month}
                  stroke="#8A94A0"
                  strokeDasharray="3 3"
                  label={{ value: 'Σήμερα', position: 'top', fontSize: 10, fill: '#8A94A0' }}
                />
              )}
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Method comparison table */}
      {methodTable.length > 0 && (
        <div className="card-premium p-5">
          <h4 className="text-sm font-semibold text-text-primary mb-3">Method Comparison (Σύγκριση Μεθόδων)</h4>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-surface-light text-text-muted text-[10px] uppercase tracking-wider">
                  <th className="text-left px-3 py-2">Μήνας</th>
                  <th className="text-right px-3 py-2">Moving Avg</th>
                  <th className="text-right px-3 py-2">Linear</th>
                  <th className="text-right px-3 py-2">YoY</th>
                  <th className="text-right px-3 py-2">Seasonal</th>
                  <th className="text-right px-3 py-2 font-bold">Ensemble</th>
                </tr>
              </thead>
              <tbody>
                {methodTable.map(row => (
                  <tr key={row.month} className="border-t border-border-subtle">
                    <td className="px-3 py-2 font-medium">{row.month}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{fmtEur(row.moving_avg)}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{fmtEur(row.linear_trend)}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{row.yoy_growth != null ? fmtEur(row.yoy_growth) : '—'}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{row.seasonal != null ? fmtEur(row.seasonal) : '—'}</td>
                    <td className="px-3 py-2 text-right tabular-nums font-bold text-brand-teal">{fmtEur(row.ensemble)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* What-if slider */}
      <div className="card-premium p-5">
        <h4 className="text-sm font-semibold text-text-primary mb-3">What-If Scenario (Τι θα γινόταν αν...)</h4>
        <div className="flex flex-wrap items-center gap-4">
          <label className="text-xs text-text-muted">Αν τα closings αλλάξουν κατά:</label>
          <div className="flex items-center gap-3 flex-1 min-w-[200px]">
            <span className="text-xs text-text-muted w-8 text-right">-30%</span>
            <input
              type="range"
              min={-30}
              max={30}
              value={whatIfPct}
              onChange={e => setWhatIfPct(Number(e.target.value))}
              className="flex-1 accent-brand-blue"
            />
            <span className="text-xs text-text-muted w-8">+30%</span>
          </div>
          <div className="text-sm font-bold text-brand-blue tabular-nums min-w-[50px] text-center">
            {whatIfPct > 0 ? '+' : ''}{whatIfPct}%
          </div>
          <div className="text-sm">
            Projected Q GCI: <span className="font-bold text-brand-gold">{fmtEur(quarterlyGci)}</span>
          </div>
        </div>
      </div>

      {/* Disclaimer */}
      <p className="text-[10px] text-text-muted italic text-center">
        Βασισμένο σε ιστορικά δεδομένα. Η πρόβλεψη είναι ενδεικτική.
      </p>
    </div>
  );
}
