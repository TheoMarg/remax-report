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

  return (
    <div className="space-y-3">
      <div className="text-xs text-[#8A94A0]">
        Μ.Ο. {officeLabel}: <span className="font-semibold text-[#0C1E3C]">{officeAvg.toLocaleString('el-GR')}</span>
      </div>

      <div className="space-y-1">
        {agents.map((agent, i) => {
          const aboveAvg = agent.crm >= officeAvg;
          return (
            <div
              key={agent.agent_id}
              className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-[#F7F6F3]"
            >
              <span className="w-7 text-right text-sm font-bold text-[#8A94A0]">#{i + 1}</span>

              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-[#0C1E3C] truncate">{agent.name}</div>
              </div>

              <div className="text-right">
                <div className="text-sm font-bold text-[#0C1E3C]">{agent.crm.toLocaleString('el-GR')}</div>
              </div>

              {hasAcc && (
                <div className="text-right w-16">
                  <div className="text-sm text-[#8A94A0]">{agent.acc.toLocaleString('el-GR')}</div>
                </div>
              )}

              {/* vs M.O. indicator */}
              <div className="w-16 text-right">
                <span
                  className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                    aboveAvg
                      ? 'text-[#1D7A4E] bg-[#1D7A4E]/10'
                      : 'text-[#DC3545] bg-[#DC3545]/10'
                  }`}
                >
                  {aboveAvg ? '≥' : '<'} M.O.
                </span>
              </div>
            </div>
          );
        })}

        {agents.length === 0 && (
          <div className="text-sm text-[#8A94A0] text-center py-4">Δεν βρέθηκαν agents</div>
        )}
      </div>
    </div>
  );
}
