import { useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts';
import type { PropertyJourney } from '../../lib/types';
import type { StageName } from '../../hooks/useStageFlow';

const STAGE_FLAG: Record<StageName, keyof PropertyJourney> = {
  registration: 'has_registration',
  exclusive: 'has_exclusive',
  published: 'has_published',
  showing: 'has_showing',
  offer: 'has_offer',
  closing: 'has_closing',
};

const STAGE_COLORS: Record<StageName, string> = {
  registration: '#1B5299',
  exclusive: '#168F80',
  published: '#6B5CA5',
  showing: '#6B5CA5',
  offer: '#C9961A',
  closing: '#D4722A',
};

const PIE_COLORS = ['#1B5299', '#168F80', '#6B5CA5', '#C9961A', '#D4722A', '#C0392B', '#3498DB', '#2ECC71'];

interface Props {
  journeys: PropertyJourney[];
  stage: StageName;
}

export function PipelineCharts({ journeys, stage }: Props) {
  const flag = STAGE_FLAG[stage];
  const stageJourneys = journeys.filter(j => j[flag]);
  const color = STAGE_COLORS[stage];

  // Bar chart: count per agent
  const agentBars = useMemo(() => {
    const map: Record<string, { name: string; count: number; gci: number }> = {};
    for (const j of stageJourneys) {
      const name = j.canonical_name || `Agent ${j.agent_id}`;
      if (!map[name]) map[name] = { name, count: 0, gci: 0 };
      map[name].count++;
      if (stage === 'closing') map[name].gci += j.gci || 0;
    }
    return Object.values(map).sort((a, b) => b.count - a.count).slice(0, 15);
  }, [stageJourneys, stage]);

  // Pie chart: subcategory distribution
  const subcatPie = useMemo(() => {
    const map: Record<string, number> = {};
    for (const j of stageJourneys) {
      const cat = j.subcategory || j.category || 'Άλλο';
      map[cat] = (map[cat] || 0) + 1;
    }
    return Object.entries(map)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 8)
      .map(([name, value]) => ({ name, value }));
  }, [stageJourneys]);

  if (stageJourneys.length === 0) return null;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Bar chart */}
      <div className="bg-surface rounded-lg p-4 border border-border-subtle">
        <h4 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">
          {stage === 'closing' ? 'Κλεισίματα ανά Σύμβουλο' : 'Ανά Σύμβουλο'}
        </h4>
        <ResponsiveContainer width="100%" height={Math.max(agentBars.length * 28 + 20, 120)}>
          <BarChart data={agentBars} layout="vertical" margin={{ left: 0, right: 16, top: 4, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--color-border-subtle)" />
            <XAxis type="number" tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }} />
            <YAxis
              type="category"
              dataKey="name"
              width={110}
              tick={{ fontSize: 10, fill: 'var(--color-text-secondary)' }}
            />
            <Tooltip
              contentStyle={{ background: 'var(--color-surface-card)', border: '1px solid var(--color-border-default)', borderRadius: '8px', fontSize: '12px' }}
              formatter={(value) => [String(value != null ? Number(value).toLocaleString('el-GR') : ''), stage === 'closing' ? 'Κλεισίματα' : 'Ακίνητα']}
            />
            <Bar dataKey="count" fill={color} radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Pie chart */}
      <div className="bg-surface rounded-lg p-4 border border-border-subtle">
        <h4 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">
          Κατανομή Τύπου
        </h4>
        <ResponsiveContainer width="100%" height={220}>
          <PieChart>
            <Pie
              data={subcatPie}
              cx="50%"
              cy="50%"
              innerRadius={50}
              outerRadius={85}
              paddingAngle={2}
              dataKey="value"
              label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
              labelLine={false}
              style={{ fontSize: 10 }}
            >
              {subcatPie.map((_, i) => (
                <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{ background: 'var(--color-surface-card)', border: '1px solid var(--color-border-default)', borderRadius: '8px', fontSize: '12px' }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
