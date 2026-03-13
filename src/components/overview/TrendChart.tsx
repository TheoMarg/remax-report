import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import type { MonthTrend } from '../../lib/metrics';

interface Props {
  data: MonthTrend[];
  isLoading: boolean;
}

function formatK(v: number): string {
  if (v >= 1000) return `${(v / 1000).toFixed(0)}K`;
  return String(v);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-border-default rounded-xl shadow-lg p-4 text-xs">
      <div className="font-bold text-text-primary mb-2 text-sm">{label}</div>
      <div className="space-y-1.5">
        {payload.map((p: { name: string; value: number; color: string }, i: number) => (
          <div key={i} className="flex justify-between gap-6 items-center">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ backgroundColor: p.color }} />
              <span className="text-text-secondary">{p.name}</span>
            </span>
            <span className="font-bold text-text-primary stat-number">
              {p.name === 'Τζίρος' ? `€${p.value.toLocaleString('el-GR')}` : p.value.toLocaleString('el-GR')}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function TrendChart({ data, isLoading }: Props) {
  if (isLoading) {
    return (
      <div className="card-premium p-5 h-[380px] flex items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <div className="w-6 h-6 border-2 border-brand-blue border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-text-muted">Φόρτωση τάσεων...</span>
        </div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="card-premium p-5 h-[380px] flex items-center justify-center">
        <span className="text-sm text-text-muted">Δεν υπάρχουν δεδομένα τάσεων</span>
      </div>
    );
  }

  return (
    <div className="card-premium p-5">
      <div className="flex items-center gap-2 mb-5">
        <div className="w-7 h-7 rounded-lg bg-brand-gold/10 flex items-center justify-center text-sm">📈</div>
        <h3 className="text-sm font-bold text-text-primary">6-Month Trend (Τάσεις 6μήνου)</h3>
      </div>
      <ResponsiveContainer width="100%" height={300}>
        <ComposedChart data={data} margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#EFECEA" vertical={false} />
          <XAxis
            dataKey="month"
            tick={{ fontSize: 11, fill: '#8A94A0' }}
            axisLine={{ stroke: '#DDD8D0' }}
            tickLine={false}
          />
          <YAxis
            yAxisId="left"
            tick={{ fontSize: 11, fill: '#8A94A0' }}
            axisLine={false}
            tickLine={false}
            tickFormatter={formatK}
          />
          <YAxis
            yAxisId="right"
            orientation="right"
            tick={{ fontSize: 11, fill: '#8A94A0' }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v: number) => `€${formatK(v)}`}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            wrapperStyle={{ fontSize: '11px', paddingTop: '16px' }}
            iconType="rect"
            iconSize={8}
          />
          <Bar
            yAxisId="left"
            dataKey="registrations"
            name="Καταγραφές"
            fill="#1B5299"
            radius={[4, 4, 0, 0]}
            barSize={18}
          />
          <Bar
            yAxisId="left"
            dataKey="exclusives"
            name="Νέες Αποκλειστικές"
            fill="#168F80"
            radius={[4, 4, 0, 0]}
            barSize={18}
          />
          <Bar
            yAxisId="left"
            dataKey="closings"
            name="Κλεισίματα"
            fill="#D4722A"
            radius={[4, 4, 0, 0]}
            barSize={18}
          />
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="gci"
            name="Τζίρος"
            stroke="#C9961A"
            strokeWidth={3}
            dot={{ r: 5, fill: '#C9961A', strokeWidth: 2, stroke: '#fff' }}
            activeDot={{ r: 7, strokeWidth: 2, stroke: '#fff' }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
