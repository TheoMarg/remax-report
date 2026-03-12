import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import type { WithdrawalCategorySummary } from '../../lib/metrics';

interface Props {
  categories: WithdrawalCategorySummary[];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-white border border-border-default rounded-xl shadow-lg p-4 text-xs">
      <div className="font-bold text-text-primary mb-1">{d.name}</div>
      <div className="text-text-secondary">
        {d.value.toLocaleString('el-GR')} αποσύρσεις ({d.pct}%)
      </div>
    </div>
  );
}

const RADIAN = Math.PI / 180;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function renderLabel({ cx, cy, midAngle, innerRadius, outerRadius, pct }: any) {
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  if (pct < 5) return null;
  return (
    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={11} fontWeight={700}>
      {pct}%
    </text>
  );
}

export function WithdrawalChart({ categories }: Props) {
  const total = categories.reduce((s, c) => s + c.total, 0);
  const data = categories
    .filter(c => c.total > 0)
    .map(c => ({
      name: c.label,
      value: c.total,
      color: c.color,
      pct: total > 0 ? Math.round((c.total / total) * 100) : 0,
    }));

  if (data.length === 0) {
    return (
      <div className="card-premium p-5 h-[300px] flex items-center justify-center">
        <span className="text-sm text-text-muted">Δεν υπάρχουν δεδομένα</span>
      </div>
    );
  }

  return (
    <div className="card-premium p-5">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-7 h-7 rounded-lg bg-brand-purple/10 flex items-center justify-center text-sm">🥧</div>
        <h3 className="text-sm font-bold text-text-primary">Κατανομή Κατηγοριών</h3>
      </div>
      <ResponsiveContainer width="100%" height={260}>
        <PieChart>
          <Pie data={data} cx="50%" cy="50%" innerRadius={50} outerRadius={100} dataKey="value" nameKey="name" paddingAngle={2} strokeWidth={0} label={renderLabel} labelLine={false}>
            {data.map((d, i) => <Cell key={i} fill={d.color} />)}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
        </PieChart>
      </ResponsiveContainer>
      <div className="flex justify-center gap-5 mt-2">
        {data.map(d => (
          <div key={d.name} className="flex items-center gap-1.5 text-xs text-text-secondary">
            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: d.color }} />
            <span>{d.name}</span>
            <span className="font-bold text-text-primary stat-number">{d.value.toLocaleString('el-GR')}</span>
            <span className="text-[10px] text-text-muted">({d.pct}%)</span>
          </div>
        ))}
      </div>
    </div>
  );
}
