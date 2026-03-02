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
    <div className="bg-white border border-[#DDD8D0] rounded-lg shadow-lg p-3 text-xs">
      <div className="font-semibold text-[#0C1E3C] mb-1.5">{label}</div>
      {payload.map((p: { name: string; value: number; color: string }, i: number) => (
        <div key={i} className="flex justify-between gap-4">
          <span style={{ color: p.color }}>{p.name}</span>
          <span className="font-medium text-[#0C1E3C]">
            {p.name === 'GCI' ? `€${p.value.toLocaleString('el-GR')}` : p.value.toLocaleString('el-GR')}
          </span>
        </div>
      ))}
    </div>
  );
}

export function TrendChart({ data, isLoading }: Props) {
  if (isLoading) {
    return (
      <div className="bg-white rounded-lg border border-[#DDD8D0] p-5 h-[340px] flex items-center justify-center">
        <span className="text-sm text-[#8A94A0]">Φόρτωση τάσεων...</span>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-[#DDD8D0] p-5 h-[340px] flex items-center justify-center">
        <span className="text-sm text-[#8A94A0]">Δεν υπάρχουν δεδομένα τάσεων</span>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-[#DDD8D0] p-5">
      <h3 className="text-sm font-semibold text-[#0C1E3C] mb-4">Τάσεις 6μήνου</h3>
      <ResponsiveContainer width="100%" height={280}>
        <ComposedChart data={data} margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#EFECEA" />
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
            wrapperStyle={{ fontSize: '11px' }}
            iconType="rect"
            iconSize={8}
          />
          <Bar
            yAxisId="left"
            dataKey="registrations"
            name="Καταγραφές"
            fill="#1B5299"
            radius={[2, 2, 0, 0]}
            barSize={16}
          />
          <Bar
            yAxisId="left"
            dataKey="exclusives"
            name="Αποκλειστικές"
            fill="#168F80"
            radius={[2, 2, 0, 0]}
            barSize={16}
          />
          <Bar
            yAxisId="left"
            dataKey="closings"
            name="Κλεισίματα"
            fill="#D4722A"
            radius={[2, 2, 0, 0]}
            barSize={16}
          />
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="gci"
            name="GCI"
            stroke="#C9961A"
            strokeWidth={2.5}
            dot={{ r: 4, fill: '#C9961A', strokeWidth: 0 }}
            activeDot={{ r: 6 }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
