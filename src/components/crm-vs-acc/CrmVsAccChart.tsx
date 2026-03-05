import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import type { CrmVsAccRow } from '../../lib/metrics';

interface Props {
  rows: CrmVsAccRow[];
}

export function CrmVsAccChart({ rows }: Props) {
  const chartData = rows.map(r => ({
    name: r.label,
    CRM: r.crm,
    Accountability: r.acc,
  }));

  return (
    <div className="card-premium p-5">
      <h3 className="text-sm font-semibold text-text-primary mb-4">CRM vs Accountability — Σύγκριση KPIs</h3>
      <div className="h-[400px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 60 }}>
            <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#8A94A0' }} angle={-45} textAnchor="end" interval={0} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: '#8A94A0' }} axisLine={false} tickLine={false} />
            <Tooltip
              contentStyle={{ borderRadius: 12, border: '1px solid #DDD8D0', fontSize: 12, boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}
              formatter={(value: number | undefined) => (value ?? 0).toLocaleString('el-GR')}
            />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar dataKey="CRM" fill="#1B5299" radius={[4, 4, 0, 0]} />
            <Bar dataKey="Accountability" fill="#C9961A" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
