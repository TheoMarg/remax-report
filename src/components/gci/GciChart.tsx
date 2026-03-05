import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Cell,
} from 'recharts';
import type { GciRanking } from '../../lib/metrics';

const MEDAL_COLORS: Record<number, string> = {
  1: '#FFD700',
  2: '#C0C0C0',
  3: '#CD7F32',
};

const DEFAULT_COLOR = '#1B5299';

interface Props {
  rankings: GciRanking[];
  companyAvg: number;
}

export function GciChart({ rankings, companyAvg }: Props) {
  const chartData = rankings.map(r => ({
    name: r.name.length > 12 ? r.name.substring(0, 12) + '…' : r.name,
    GCI: r.gci,
    rank: r.rank,
  }));

  return (
    <div className="card-premium p-5">
      <h3 className="text-sm font-semibold text-text-primary mb-4">GCI ανά Συνεργάτη</h3>
      <div className="h-[400px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 60 }}>
            <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#8A94A0' }} angle={-45} textAnchor="end" interval={0} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: '#8A94A0' }} axisLine={false} tickLine={false} />
            <Tooltip
              contentStyle={{ borderRadius: 12, border: '1px solid #DDD8D0', fontSize: 12, boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}
              formatter={(value: number | undefined) => `€${(value ?? 0).toLocaleString('el-GR')}`}
            />
            <Bar dataKey="GCI" radius={[4, 4, 0, 0]}>
              {chartData.map((entry, i) => (
                <Cell key={i} fill={MEDAL_COLORS[entry.rank] || DEFAULT_COLOR} />
              ))}
            </Bar>
            <ReferenceLine
              y={companyAvg}
              stroke="#C9961A"
              strokeDasharray="6 3"
              label={{ value: `M.O. €${companyAvg.toLocaleString('el-GR')}`, position: 'right', fontSize: 11, fill: '#C9961A' }}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
