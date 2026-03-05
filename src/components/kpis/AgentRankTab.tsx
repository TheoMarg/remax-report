import type { AgentKpiRow } from '../../lib/metrics';
import { AgentLink } from '../ui/AgentLink';

const OFFICE_SHORT: Record<string, string> = {
  larissa: 'Λάρισα',
  katerini: 'Κατερίνη',
};

const RANK_BG: Record<number, string> = {
  0: 'bg-[#FFD700]/10',
  1: 'bg-[#C0C0C0]/10',
  2: 'bg-[#CD7F32]/10',
};

const MEDAL: Record<number, string> = {
  0: '#FFD700',
  1: '#C0C0C0',
  2: '#CD7F32',
};

interface Props {
  agents: AgentKpiRow[];
  hasAcc: boolean;
  companyAvg: number;
  kpiColor: string;
}

export function AgentRankTab({ agents, hasAcc, companyAvg, kpiColor }: Props) {
  const maxCrm = Math.max(...agents.map(a => a.crm), 1);
  const hasSaleRent = agents.some(a => a.sale != null && a.rent != null);
  const avgIdx = agents.findIndex(a => a.crm < companyAvg);

  return (
    <div>
      {/* Column headers */}
      <div className="flex items-center gap-3 px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-text-muted border-b border-border-default">
        <span className="w-7 text-right">#</span>
        <span className="flex-1">Συνεργάτης</span>
        <span className="w-[220px] text-center">Απόδοση</span>
        <span className="w-12 text-right">CRM</span>
        {hasSaleRent && (
          <span className="w-28 text-center">
            <span className="text-brand-blue">Πώληση</span>
            {' / '}
            <span className="text-brand-orange">Ενοικίαση</span>
          </span>
        )}
        {hasAcc && (
          <>
            <span className="w-20 text-right">Accountability</span>
            <span className="w-14 text-right">Διαφορά</span>
          </>
        )}
      </div>

      {/* Agent rows */}
      <div>
        {agents.map((agent, i) => {
          const barPct = maxCrm > 0 ? (agent.crm / maxCrm) * 100 : 0;
          const aboveAvg = agent.crm >= companyAvg;
          const medalColor = MEDAL[i];
          const rowBg = RANK_BG[i] || '';
          const showAvgLine = avgIdx === i && avgIdx > 0;

          return (
            <div key={agent.agent_id}>
              {showAvgLine && (
                <div className="flex items-center gap-2 px-3 py-1.5">
                  <div className="flex-1 border-t-2 border-dashed border-brand-gold/50" />
                  <span className="text-[10px] font-semibold text-brand-gold whitespace-nowrap">
                    M.O. Εταιρείας: {companyAvg.toLocaleString('el-GR')}
                  </span>
                  <div className="flex-1 border-t-2 border-dashed border-brand-gold/50" />
                </div>
              )}
              <div className={`flex items-center gap-3 px-3 py-2.5 border-b border-border-subtle transition-colors hover:bg-surface ${rowBg}`}>
                <span className="w-7 text-right text-xs font-bold" style={{ color: medalColor || '#8A94A0' }}>
                  #{i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <AgentLink agentId={agent.agent_id} name={agent.name} className="text-sm font-semibold text-text-primary truncate block" />
                  <div className="text-[11px] text-text-muted">
                    {OFFICE_SHORT[agent.office || ''] || agent.office || '—'}
                  </div>
                </div>
                <div className="w-[220px]">
                  <div className="h-5 bg-border-subtle rounded-full overflow-hidden relative">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${Math.max(barPct, 2)}%`, backgroundColor: aboveAvg ? kpiColor : `${kpiColor}66` }}
                    />
                    {companyAvg > 0 && (
                      <div className="absolute top-0 h-full w-[2px] bg-brand-gold" style={{ left: `${(companyAvg / maxCrm) * 100}%` }} />
                    )}
                  </div>
                </div>
                <div className="w-12 text-right">
                  <span className="text-base font-bold text-text-primary">{agent.crm.toLocaleString('el-GR')}</span>
                </div>
                {hasSaleRent && (
                  <div className="w-28 flex justify-center gap-1 text-[11px] font-medium">
                    <span className="text-brand-blue">{agent.sale ?? 0}</span>
                    <span className="text-text-muted">/</span>
                    <span className="text-brand-orange">{agent.rent ?? 0}</span>
                  </div>
                )}
                {hasAcc && (
                  <>
                    <div className="w-20 text-right text-sm text-text-muted">{agent.acc.toLocaleString('el-GR')}</div>
                    <div className="w-14 text-right">
                      <span
                        className={`text-xs font-bold px-1.5 py-0.5 rounded-full ${
                          agent.delta > 0
                            ? 'text-brand-green bg-brand-green/10'
                            : agent.delta < 0
                            ? 'text-brand-red bg-brand-red/10'
                            : 'text-text-muted'
                        }`}
                      >
                        {agent.delta > 0 ? '+' : ''}{agent.delta.toLocaleString('el-GR')}
                      </span>
                    </div>
                  </>
                )}
              </div>
            </div>
          );
        })}

        {avgIdx === -1 && agents.length > 0 && (
          <div className="flex items-center gap-2 px-3 py-1.5">
            <div className="flex-1 border-t-2 border-dashed border-brand-gold/50" />
            <span className="text-[10px] font-semibold text-brand-gold whitespace-nowrap">
              M.O. Εταιρείας: {companyAvg.toLocaleString('el-GR')}
            </span>
            <div className="flex-1 border-t-2 border-dashed border-brand-gold/50" />
          </div>
        )}
      </div>

      <div className="flex items-center justify-between text-xs text-text-muted border-t border-border-default pt-3 mt-1 px-3">
        <span>{agents.length} συνεργάτες</span>
        <div className="flex items-center gap-4">
          {hasSaleRent && (
            <span>
              <span className="inline-block w-2 h-2 rounded-full bg-brand-blue mr-1" />Πώληση
              <span className="inline-block w-2 h-2 rounded-full bg-brand-orange ml-3 mr-1" />Ενοικίαση
            </span>
          )}
          <span>
            <span className="inline-block w-3 h-[2px] bg-brand-gold mr-1 align-middle" />
            M.O. = {companyAvg.toLocaleString('el-GR')}
          </span>
        </div>
      </div>
    </div>
  );
}
