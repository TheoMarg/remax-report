import { useMemo } from 'react';
import type { AgentActivity } from '../../lib/types';

const MONTH_SHORT_EL = ['Ιαν', 'Φεβ', 'Μαρ', 'Απρ', 'Μάι', 'Ιούν', 'Ιούλ', 'Αύγ', 'Σεπ', 'Οκτ', 'Νοέ', 'Δεκ'];

function heatColor(value: number, max: number): string {
  if (value === 0 || max === 0) return '#F0F0F0'; // no data
  const ratio = value / max;
  if (ratio >= 0.7) return '#1D7A4E'; // green
  if (ratio >= 0.4) return '#C9961A'; // yellow
  if (ratio >= 0.15) return '#D4722A'; // orange
  return '#DC3545'; // red
}

function cellTextColor(value: number, max: number): string {
  if (value === 0 || max === 0) return '#8A94A0';
  const ratio = value / max;
  return ratio >= 0.4 ? '#FFFFFF' : '#0C1E3C';
}

interface Props {
  activity: AgentActivity[];
  agents: { agent_id: number; canonical_name: string; is_team: boolean }[];
}

export function ActivityHeatmap({ activity, agents }: Props) {
  const { rows, months, maxValue } = useMemo(() => {
    if (!activity || activity.length === 0) return { rows: [], months: [], maxValue: 0 };

    // Get unique months
    const monthSet = new Set<string>();
    const agentMonthMap = new Map<number, Map<string, number>>();
    const agentTotalMap = new Map<number, number>();

    for (const a of activity) {
      const agent = agents.find(ag => ag.agent_id === a.agent_id);
      if (!agent || agent.is_team) continue;

      const month = a.period_start.slice(0, 7);
      monthSet.add(month);

      if (!agentMonthMap.has(a.agent_id)) agentMonthMap.set(a.agent_id, new Map());
      const total =
        (a.total_cold_calls || 0) + (a.total_follow_ups || 0) + (a.total_digital_outreach || 0) +
        (a.total_meetings || 0) + (a.total_leads || 0) + (a.total_marketing_actions || 0) +
        (a.total_social || 0) + (a.total_cultivation || 0);

      agentMonthMap.get(a.agent_id)!.set(month, (agentMonthMap.get(a.agent_id)!.get(month) || 0) + total);
      agentTotalMap.set(a.agent_id, (agentTotalMap.get(a.agent_id) || 0) + total);
    }

    const months = Array.from(monthSet).sort();
    let maxValue = 0;

    const rows = Array.from(agentMonthMap.entries())
      .map(([agentId, monthData]) => {
        const agent = agents.find(a => a.agent_id === agentId);
        const values = months.map(m => {
          const v = monthData.get(m) || 0;
          if (v > maxValue) maxValue = v;
          return v;
        });
        return {
          agentId,
          name: agent?.canonical_name?.split(' ')[0] || `#${agentId}`,
          total: agentTotalMap.get(agentId) || 0,
          values,
        };
      })
      .sort((a, b) => b.total - a.total);

    return { rows, months, maxValue };
  }, [activity, agents]);

  if (rows.length === 0) return null;

  return (
    <div className="card-premium p-5">
      <h3 className="text-sm font-semibold text-text-primary mb-1">
        Activity Heatmap (Χάρτης Δραστηριότητας)
      </h3>
      <p className="text-xs text-text-muted mb-4">
        Color intensity: Green = high activity, Yellow = moderate, Red = low, Gray = no data
      </p>

      <div className="overflow-x-auto">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr>
              <th className="text-left pr-3 pb-2 font-medium text-text-muted sticky left-0 bg-surface-card z-10">Agent</th>
              {months.map(m => {
                const [yr, mo] = m.split('-');
                return (
                  <th key={m} className="text-center pb-2 font-medium text-text-muted px-1 min-w-[40px]">
                    {MONTH_SHORT_EL[parseInt(mo) - 1]}<br />
                    <span className="text-[8px]">{yr.slice(2)}</span>
                  </th>
                );
              })}
              <th className="text-right pl-3 pb-2 font-medium text-text-muted">Total</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(row => (
              <tr key={row.agentId}>
                <td className="pr-3 py-1 font-medium text-text-primary sticky left-0 bg-surface-card z-10 whitespace-nowrap">
                  {row.name}
                </td>
                {row.values.map((val, i) => (
                  <td key={months[i]} className="px-0.5 py-1 text-center">
                    <div
                      className="rounded-md px-1 py-1 text-[10px] font-bold tabular-nums mx-auto"
                      style={{
                        backgroundColor: heatColor(val, maxValue),
                        color: cellTextColor(val, maxValue),
                        minWidth: '32px',
                      }}
                      title={`${row.name} — ${months[i]}: ${val} actions`}
                    >
                      {val > 0 ? val : '·'}
                    </div>
                  </td>
                ))}
                <td className="pl-3 py-1 text-right tabular-nums font-semibold text-text-primary">
                  {row.total.toLocaleString('el-GR')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
