import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import type { FunnelByTypeRow } from '../../lib/metrics';

interface Props {
  rows: FunnelByTypeRow[];
}

const STAGE_COLORS: Record<string, string> = {
  registrations: '#1B5299',
  exclusives: '#168F80',
  published: '#1D7A4E',
  showings: '#6B5CA5',
  closings: '#D4722A',
};

const STAGE_NAMES: Record<string, string> = {
  registrations: 'Καταγραφές',
  exclusives: 'Αποκλειστικές',
  published: 'Δημοσιευμένα',
  showings: 'Υποδείξεις',
  closings: 'Κλεισίματα',
};

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
            <span className="font-bold text-text-primary stat-number">{p.value.toLocaleString('el-GR')}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function FunnelBarChart({ rows }: Props) {
  const top8 = rows.slice(0, 8);
  const rest = rows.slice(8);

  let chartData = top8.map(r => ({
    name: r.subcategory.length > 18 ? r.subcategory.slice(0, 16) + '…' : r.subcategory,
    registrations: r.registrations,
    exclusives: r.exclusives,
    published: r.published,
    showings: r.showings,
    closings: r.closings,
  }));

  if (rest.length > 0) {
    chartData.push({
      name: 'Λοιπά',
      registrations: rest.reduce((s, r) => s + r.registrations, 0),
      exclusives: rest.reduce((s, r) => s + r.exclusives, 0),
      published: rest.reduce((s, r) => s + r.published, 0),
      showings: rest.reduce((s, r) => s + r.showings, 0),
      closings: rest.reduce((s, r) => s + r.closings, 0),
    });
  }

  if (chartData.length === 0) {
    return (
      <div className="card-premium p-5 h-[340px] flex items-center justify-center">
        <span className="text-sm text-text-muted">Δεν υπάρχουν δεδομένα</span>
      </div>
    );
  }

  return (
    <div className="card-premium p-5">
      <div className="flex items-center gap-2 mb-5">
        <div className="w-7 h-7 rounded-lg bg-brand-blue/10 flex items-center justify-center text-sm">📊</div>
        <h3 className="text-sm font-bold text-text-primary">Ανά Υποκατηγορία (Top 8)</h3>
      </div>
      <ResponsiveContainer width="100%" height={320}>
        <BarChart data={chartData} margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#EFECEA" vertical={false} />
          <XAxis
            dataKey="name"
            tick={{ fontSize: 10, fill: '#8A94A0' }}
            axisLine={{ stroke: '#DDD8D0' }}
            tickLine={false}
            interval={0}
            angle={-25}
            textAnchor="end"
            height={60}
          />
          <YAxis tick={{ fontSize: 11, fill: '#8A94A0' }} axisLine={false} tickLine={false} />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            wrapperStyle={{ fontSize: '11px', paddingTop: '16px' }}
            iconType="rect"
            iconSize={8}
          />
          {Object.entries(STAGE_COLORS).map(([key, color]) => (
            <Bar
              key={key}
              dataKey={key}
              name={STAGE_NAMES[key]}
              fill={color}
              radius={[4, 4, 0, 0]}
              barSize={12}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
