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
      {/* Column headers */}
      <div className="flex items-center gap-3 px-3 pb-1 border-b border-[#DDD8D0]">
        <span className="w-7" />
        <div className="flex-1 text-[10px] text-[#8A94A0]">Συνεργάτης</div>
        {hasSaleRent && (
          <>
            <div className="w-14 text-right text-[10px] text-[#1B5299]">Πωλήσεις</div>
            <div className="w-14 text-right text-[10px] text-[#D4722A]">Ενοικ.</div>
          </>
        )}
        <div className="w-14 text-right text-[10px] text-[#8A94A0]">CRM</div>
        {hasAcc && <div className="w-14 text-right text-[10px] text-[#8A94A0]">Acc. Rep.</div>}
        <div className="w-16 text-right text-[10px] text-[#8A94A0]">vs avg</div>
      </div>

      {/* Agent rows */}
      {agents.map((agent, i) => {
        const aboveAvg = agent.crm >= officeAvg;
        return (
          <div
            key={agent.agent_id}
            className="flex items-center gap-3 px-3 py-1.5 rounded-lg hover:bg-[#F7F6F3]"
          >
            <span className="w-7 text-right text-xs font-bold text-[#8A94A0]">#{i + 1}</span>

            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-[#0C1E3C] truncate">{agent.name}</div>
            </div>

            {hasSaleRent && (
              <>
                <div className="w-14 text-right text-sm text-[#1B5299]">
                  {(agent.sale ?? 0).toLocaleString('el-GR')}
                </div>
                <div className="w-14 text-right text-sm text-[#D4722A]">
                  {(agent.rent ?? 0).toLocaleString('el-GR')}
                </div>
              </>
            )}

            <div className="w-14 text-right text-sm font-semibold text-[#0C1E3C]">
              {agent.crm.toLocaleString('el-GR')}
            </div>

            {hasAcc && (
              <div className="w-14 text-right text-sm text-[#8A94A0]">
                {agent.acc.toLocaleString('el-GR')}
              </div>
            )}

            <div className="w-16 text-right">
              <span
                className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                  aboveAvg
                    ? 'text-[#1D7A4E] bg-[#1D7A4E]/10'
                    : 'text-[#DC3545] bg-[#DC3545]/10'
                }`}
              >
                {aboveAvg ? '≥' : '<'} avg
              </span>
            </div>
          </div>
        );
      })}

      {agents.length === 0 && (
        <div className="text-sm text-[#8A94A0] text-center py-4">Δεν βρέθηκαν agents</div>
      )}

      {/* Totals + avg */}
      {agents.length > 0 && (
        <div className="flex items-center gap-3 px-3 pt-2 border-t border-[#DDD8D0]">
          <span className="w-7" />
          <div className="flex-1 text-xs font-bold text-[#0C1E3C]">
            {agents.length} συνεργάτες ({officeLabel})
          </div>
          {hasSaleRent && (
            <>
              <div className="w-14 text-right text-xs font-bold text-[#1B5299]">
                {totalSale.toLocaleString('el-GR')}
              </div>
              <div className="w-14 text-right text-xs font-bold text-[#D4722A]">
                {totalRent.toLocaleString('el-GR')}
              </div>
            </>
          )}
          <div className="w-14 text-right text-xs font-bold text-[#0C1E3C]">
            {totalCrm.toLocaleString('el-GR')}
          </div>
          {hasAcc && (
            <div className="w-14 text-right text-xs font-bold text-[#8A94A0]">
              {totalAcc.toLocaleString('el-GR')}
            </div>
          )}
          <div className="w-16 text-right text-[10px] text-[#8A94A0]">
            avg {officeAvg.toLocaleString('el-GR')}
          </div>
        </div>
      )}
    </div>
  );
}
