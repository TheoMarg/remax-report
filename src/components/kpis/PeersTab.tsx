import type { AgentKpiRow } from '../../lib/metrics';

const OFFICE_SHORT: Record<string, string> = {
  larissa: 'Λάρισα',
  katerini: 'Κατερίνη',
};

interface Props {
  agents: AgentKpiRow[];
  hasAcc: boolean;
  officeAvg: number;
  officeName: string;
}

export function PeersTab({ agents, hasAcc, officeAvg, officeName }: Props) {
  const officeLabel = OFFICE_SHORT[officeName] || officeName;
  const hasSaleRent = agents.some(a => a.sale != null);
  const totalCrm = agents.reduce((s, a) => s + a.crm, 0);
  const totalAcc = agents.reduce((s, a) => s + a.acc, 0);
  const totalSale = agents.reduce((s, a) => s + (a.sale ?? 0), 0);
  const totalRent = agents.reduce((s, a) => s + (a.rent ?? 0), 0);

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-3 px-3 pb-1 border-b border-border-default">
        <span className="w-7" />
        <div className="flex-1 text-[10px] text-text-muted">Συνεργάτης</div>
        {hasSaleRent && (
          <>
            <div className="w-14 text-right text-[10px] text-brand-blue">Πωλήσεις</div>
            <div className="w-14 text-right text-[10px] text-brand-orange">Ενοικ.</div>
          </>
        )}
        <div className="w-14 text-right text-[10px] text-text-muted">CRM</div>
        {hasAcc && <div className="w-14 text-right text-[10px] text-text-muted">Acc. Rep.</div>}
        <div className="w-16 text-right text-[10px] text-text-muted">vs avg</div>
      </div>

      {agents.map((agent, i) => {
        const aboveAvg = agent.crm >= officeAvg;
        return (
          <div key={agent.agent_id} className="flex items-center gap-3 px-3 py-1.5 rounded-lg hover:bg-surface">
            <span className="w-7 text-right text-xs font-bold text-text-muted">#{i + 1}</span>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-text-primary truncate">{agent.name}</div>
            </div>
            {hasSaleRent && (
              <>
                <div className="w-14 text-right text-sm text-brand-blue">{(agent.sale ?? 0).toLocaleString('el-GR')}</div>
                <div className="w-14 text-right text-sm text-brand-orange">{(agent.rent ?? 0).toLocaleString('el-GR')}</div>
              </>
            )}
            <div className="w-14 text-right text-sm font-semibold text-text-primary">{agent.crm.toLocaleString('el-GR')}</div>
            {hasAcc && <div className="w-14 text-right text-sm text-text-muted">{agent.acc.toLocaleString('el-GR')}</div>}
            <div className="w-16 text-right">
              <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${aboveAvg ? 'text-brand-green bg-brand-green/10' : 'text-brand-red bg-brand-red/10'}`}>
                {aboveAvg ? '≥' : '<'} avg
              </span>
            </div>
          </div>
        );
      })}

      {agents.length === 0 && (
        <div className="text-sm text-text-muted text-center py-4">Δεν βρέθηκαν agents</div>
      )}

      {agents.length > 0 && (
        <div className="flex items-center gap-3 px-3 pt-2 border-t border-border-default">
          <span className="w-7" />
          <div className="flex-1 text-xs font-bold text-text-primary">{agents.length} συνεργάτες ({officeLabel})</div>
          {hasSaleRent && (
            <>
              <div className="w-14 text-right text-xs font-bold text-brand-blue">{totalSale.toLocaleString('el-GR')}</div>
              <div className="w-14 text-right text-xs font-bold text-brand-orange">{totalRent.toLocaleString('el-GR')}</div>
            </>
          )}
          <div className="w-14 text-right text-xs font-bold text-text-primary">{totalCrm.toLocaleString('el-GR')}</div>
          {hasAcc && <div className="w-14 text-right text-xs font-bold text-text-muted">{totalAcc.toLocaleString('el-GR')}</div>}
          <div className="w-16 text-right text-[10px] text-text-muted">avg {officeAvg.toLocaleString('el-GR')}</div>
        </div>
      )}
    </div>
  );
}
