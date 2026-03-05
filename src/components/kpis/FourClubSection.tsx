import { useMemo } from 'react';
import type { CombinedMetric, Period } from '../../lib/types';
import { useFourClubDetail } from '../../hooks/useFourClubDetail';
import { individualsOnly } from '../../lib/metrics';

const OFFICE_SHORT: Record<string, string> = {
  larissa: 'Λάρισα',
  katerini: 'Κατερίνη',
};

const ALL_RESIDENTIAL_SUBS = [
  'Διαμέρισμα',
  'Μονοκατοικία',
  'Μεζονέτα',
  'Κτίριο Οικιστικό',
  'Γκαρσονιέρα',
  'Παραθεριστική Κατοικία',
  'Βίλα',
  'Συγκρότημα Κατοικιών',
] as const;

interface Props {
  period: Period;
  metrics: CombinedMetric[];
}

interface AgentDetail {
  agent_id: number;
  name: string;
  office: string | null;
  total: number;
  byType: Map<string, number>;
}

export function FourClubSection({ period, metrics }: Props) {
  const { data: detailRows, isLoading } = useFourClubDetail(period);

  const agents = useMemo(() => {
    if (!detailRows) return [];
    const nameMap = new Map<number, { name: string; office: string | null }>();
    for (const m of individualsOnly(metrics)) {
      if (!nameMap.has(m.agent_id)) {
        nameMap.set(m.agent_id, { name: m.canonical_name || `Agent #${m.agent_id}`, office: m.office });
      }
    }
    const agentMap = new Map<number, { total: number; byType: Map<string, number> }>();
    for (const row of detailRows) {
      if (!agentMap.has(row.agent_id)) agentMap.set(row.agent_id, { total: 0, byType: new Map() });
      const entry = agentMap.get(row.agent_id)!;
      entry.total += row.cnt;
      entry.byType.set(row.subcategory, (entry.byType.get(row.subcategory) || 0) + row.cnt);
    }
    for (const m of individualsOnly(metrics)) {
      if (!agentMap.has(m.agent_id)) agentMap.set(m.agent_id, { total: 0, byType: new Map() });
    }
    return Array.from(agentMap.entries())
      .map(([agent_id, data]) => {
        const info = nameMap.get(agent_id) || { name: `Agent #${agent_id}`, office: null };
        return { agent_id, name: info.name, office: info.office, total: data.total, byType: data.byType };
      })
      .sort((a, b) => b.total - a.total);
  }, [detailRows, metrics]);

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 py-4">
        <div className="w-4 h-4 border-2 border-brand-blue border-t-transparent rounded-full animate-spin" />
        <span className="text-xs text-text-muted">Φόρτωση...</span>
      </div>
    );
  }

  const achieved = agents.filter(a => a.total >= 4);
  const notAchieved = agents.filter(a => a.total > 0 && a.total < 4);
  const zero = agents.filter(a => a.total === 0);
  const totalCols = 2 + ALL_RESIDENTIAL_SUBS.length + 1 + 1;

  return (
    <div className="space-y-3">
      <p className="text-xs text-text-muted">
        Αποκλειστικές Κατοικιών — target: 4+ ανά συνεργάτη
      </p>

      {agents.length === 0 ? (
        <div className="text-sm text-text-muted text-center py-4">Δεν υπάρχουν δεδομένα</div>
      ) : (
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-border-default">
              <th className="w-8" />
              <th className="text-left text-[10px] text-text-muted font-normal pb-1" />
              {ALL_RESIDENTIAL_SUBS.map(sub => (
                <th key={sub} className="text-center text-[9px] text-text-muted font-normal pb-1 px-1 leading-tight">{sub}</th>
              ))}
              <th className="text-center text-[9px] font-bold text-text-primary pb-1 px-1">Σύνολο</th>
              <th className="w-14" />
            </tr>
          </thead>
          <tbody>
            {achieved.length > 0 && (
              <>
                <SectionHeader label="Επέτυχαν (4+)" color="#1D7A4E" cols={totalCols} />
                {achieved.map((a, i) => <AgentRow key={a.agent_id} agent={a} rank={i + 1} inClub />)}
              </>
            )}
            {notAchieved.length > 0 && (
              <>
                <SectionHeader label="Δεν επέτυχαν" color="#DC3545" cols={totalCols} />
                {notAchieved.map((a, i) => <AgentRow key={a.agent_id} agent={a} rank={achieved.length + i + 1} inClub={false} />)}
              </>
            )}
            {zero.length > 0 && (
              <>
                <SectionHeader label={`Χωρίς οικιστικές αποκλειστικές (${zero.length})`} color="#8A94A0" cols={totalCols} />
                {zero.map((a, i) => <AgentRow key={a.agent_id} agent={a} rank={achieved.length + notAchieved.length + i + 1} inClub={false} />)}
              </>
            )}
          </tbody>
        </table>
      )}
    </div>
  );
}

function SectionHeader({ label, color, cols }: { label: string; color: string; cols: number }) {
  return (
    <tr>
      <td colSpan={cols} className="pt-3 pb-1 px-1">
        <span className="text-xs font-bold" style={{ color }}>{label}</span>
      </td>
    </tr>
  );
}

function AgentRow({ agent, rank, inClub }: { agent: AgentDetail; rank: number; inClub: boolean }) {
  const bgClass = inClub ? 'bg-brand-green/5' : agent.total > 0 ? 'bg-brand-red/5' : '';

  return (
    <tr className={`${bgClass} hover:bg-surface/50`}>
      <td className="text-right text-xs font-bold text-text-muted py-1.5 px-1">#{rank}</td>
      <td className="py-1.5 px-1">
        <div className="text-sm font-medium text-text-primary truncate max-w-[10rem]">{agent.name}</div>
        <div className="text-[10px] text-text-muted">
          {OFFICE_SHORT[agent.office || ''] || agent.office || '—'}
        </div>
      </td>
      {ALL_RESIDENTIAL_SUBS.map(sub => {
        const val = agent.byType.get(sub) || 0;
        return (
          <td key={sub} className={`text-center text-xs py-1.5 px-1 ${val > 0 ? 'font-semibold text-text-primary' : 'text-border-default'}`}>
            {val > 0 ? val : '—'}
          </td>
        );
      })}
      <td className={`text-center text-sm font-bold py-1.5 px-1 ${inClub ? 'text-brand-green' : agent.total > 0 ? 'text-brand-red' : 'text-text-muted'}`}>
        {agent.total}
      </td>
      <td className="text-right py-1.5 px-1">
        {inClub && (
          <span className="text-[9px] font-bold text-brand-green bg-brand-green/10 px-1.5 py-0.5 rounded-full whitespace-nowrap">
            4 CLUB
          </span>
        )}
      </td>
    </tr>
  );
}
