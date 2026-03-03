import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Legend,
} from 'recharts';
import type { AgentKpiRow } from '../../lib/metrics';

interface Props {
  agents: AgentKpiRow[];
  hasAcc: boolean;
  companyAvg: number;
}

export function ChartTab({ agents, hasAcc, companyAvg }: Props) {
  const chartData = agents.map((a) => ({
    name: a.name.length > 12 ? a.name.substring(0, 12) + '…' : a.name,
    CRM: a.crm,
    ACC: a.acc,
  }));

  return (
    <div className="h-[400px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 60 }}>
          <XAxis
            dataKey="name"
            tick={{ fontSize: 11, fill: '#8A94A0' }}
            angle={-45}
            textAnchor="end"
            interval={0}
          />
          <YAxis tick={{ fontSize: 11, fill: '#8A94A0' }} />
          <Tooltip
            contentStyle={{
              borderRadius: 8,
              border: '1px solid #DDD8D0',
              fontSize: 12,
            }}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Bar dataKey="CRM" fill="#1B5299" radius={[3, 3, 0, 0]} />
          {hasAcc && <Bar dataKey="ACC" fill="#C9961A" radius={[3, 3, 0, 0]} />}
          <ReferenceLine
            y={companyAvg}
            stroke="#0C1E3C"
            strokeDasharray="6 3"
            label={{
              value: `M.O. ${companyAvg.toLocaleString('el-GR')}`,
              position: 'right',
              fontSize: 11,
              fill: '#0C1E3C',
            }}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
