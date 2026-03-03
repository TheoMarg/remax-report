import type { AgentKpiRow } from '../../lib/metrics';

const OFFICE_SHORT: Record<string, string> = {
  larissa: 'Λάρισα',
  katerini: 'Κατερίνη',
};

const RANK_STYLES: Record<number, string> = {
  0: 'bg-[#FFD700]/15 border-[#FFD700]/40',
  1: 'bg-[#C0C0C0]/15 border-[#C0C0C0]/40',
  2: 'bg-[#CD7F32]/15 border-[#CD7F32]/40',
};

interface Props {
  agents: AgentKpiRow[];
  hasAcc: boolean;
  companyAvg: number;
}

export function AgentRankTab({ agents, hasAcc, companyAvg }: Props) {
  return (
    <div className="space-y-3">
      {/* Agent list */}
      <div className="space-y-1">
        {agents.map((agent, i) => {
          const rankStyle = RANK_STYLES[i] || '';
          return (
            <div
              key={agent.agent_id}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg border ${
                rankStyle || 'border-transparent hover:bg-[#F7F6F3]'
              }`}
            >
              {/* Rank */}
              <span className="w-7 text-right text-sm font-bold text-[#8A94A0]">
                #{i + 1}
              </span>

              {/* Name + office */}
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-[#0C1E3C] truncate">{agent.name}</div>
                <div className="text-xs text-[#8A94A0]">
                  {OFFICE_SHORT[agent.office || ''] || agent.office || '—'}
                </div>
              </div>

              {/* CRM */}
              <div className="text-right">
                <div className="text-sm font-bold text-[#0C1E3C]">{agent.crm.toLocaleString('el-GR')}</div>
                {agent.sale != null && agent.rent != null ? (
                  <div className="text-[10px] text-[#8A94A0]">
                    <span className="text-[#1B5299]">Πωλήσεις {agent.sale}</span>
                    {' / '}
                    <span className="text-[#D4722A]">Ενοικιάσεις {agent.rent}</span>
                  </div>
                ) : (
                  <div className="text-[10px] text-[#8A94A0]">CRM</div>
                )}
              </div>

              {/* Accountability Report + delta */}
              {hasAcc && (
                <div className="text-right w-20">
                  <div className="text-sm text-[#8A94A0]">{agent.acc.toLocaleString('el-GR')}</div>
                  <span
                    className={`text-[10px] font-semibold px-1 py-0.5 rounded ${
                      agent.delta > 0
                        ? 'text-[#1D7A4E] bg-[#1D7A4E]/10'
                        : agent.delta < 0
                        ? 'text-[#DC3545] bg-[#DC3545]/10'
                        : 'text-[#8A94A0]'
                    }`}
                  >
                    {agent.delta > 0 ? '+' : ''}{agent.delta.toLocaleString('el-GR')}
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="text-xs text-[#8A94A0] border-t border-[#DDD8D0] pt-2">
        {agents.length} συνεργάτες · Μέσος όρος ανά συνεργάτη/μήνα (Εταιρεία): <span className="font-semibold text-[#0C1E3C]">{companyAvg.toLocaleString('el-GR')}</span>
      </div>
    </div>
  );
}
