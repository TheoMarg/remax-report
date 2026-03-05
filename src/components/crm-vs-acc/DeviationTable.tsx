import { useState } from 'react';
import type { AgentKpiRow } from '../../lib/metrics';
import { KPI_DEFS, rankAgentsByKpi } from '../../lib/metrics';
import type { CombinedMetric } from '../../lib/types';

const OFFICE_SHORT: Record<string, string> = {
  larissa: 'Λάρισα',
  katerini: 'Κατερίνη',
};

interface Props {
  metrics: CombinedMetric[];
}

export function DeviationTable({ metrics }: Props) {
  const defsWithAcc = KPI_DEFS.filter(d => d.accField !== null);
  const [activeKpi, setActiveKpi] = useState(defsWithAcc[0].key);
  const activeDef = defsWithAcc.find(d => d.key === activeKpi) || defsWithAcc[0];

  const agents: AgentKpiRow[] = rankAgentsByKpi(metrics, activeDef.crmField, activeDef.accField)
    .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));

  return (
    <div className="card-premium p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-text-primary">Απόκλιση ανά Συνεργάτη</h3>
        <select
          value={activeKpi}
          onChange={e => setActiveKpi(e.target.value)}
          className="text-xs border border-border-default rounded-lg px-2 py-1.5 text-text-primary bg-surface-card focus:outline-none focus:ring-1 focus:ring-brand-blue"
        >
          {defsWithAcc.map(d => (
            <option key={d.key} value={d.key}>{d.label}</option>
          ))}
        </select>
      </div>

      <div className="flex items-center gap-3 px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-text-muted border-b border-border-default">
        <span className="w-7 text-right">#</span>
        <span className="flex-1">Συνεργάτης</span>
        <span className="w-14 text-right">CRM</span>
        <span className="w-14 text-right">ACC</span>
        <span className="w-16 text-right">Διαφορά</span>
      </div>

      <div>
        {agents.map((agent, i) => (
          <div key={agent.agent_id} className="flex items-center gap-3 px-3 py-2.5 border-b border-border-subtle transition-colors hover:bg-surface">
            <span className="w-7 text-right text-xs font-bold text-text-muted">#{i + 1}</span>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold text-text-primary truncate">{agent.name}</div>
              <div className="text-[11px] text-text-muted">
                {OFFICE_SHORT[agent.office || ''] || agent.office || '—'}
              </div>
            </div>
            <div className="w-14 text-right text-sm font-medium text-text-primary">{agent.crm.toLocaleString('el-GR')}</div>
            <div className="w-14 text-right text-sm text-text-muted">{agent.acc.toLocaleString('el-GR')}</div>
            <div className="w-16 text-right">
              <span
                className={`text-xs font-bold px-1.5 py-0.5 rounded-full ${
                  agent.delta >= 0
                    ? 'text-brand-green bg-brand-green/10'
                    : 'text-brand-red bg-brand-red/10'
                }`}
              >
                {agent.delta > 0 ? '+' : ''}{agent.delta.toLocaleString('el-GR')}
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="text-xs text-text-muted pt-3 mt-1 px-3 border-t border-border-default">
        {agents.length} συνεργάτες — ταξινόμηση κατά |Διαφορά| φθίνουσα
      </div>
    </div>
  );
}
