import type { AgentKpiRow } from '../../lib/metrics';

interface Props {
  agents: AgentKpiRow[];
  companyAvg: number;
}

export function VsCompanyTab({ agents, companyAvg }: Props) {
  const maxCrm = Math.max(...agents.map(a => a.crm), companyAvg, 1);

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        {agents.map((agent) => {
          const pct = maxCrm > 0 ? (agent.crm / maxCrm) * 100 : 0;
          const avgPct = maxCrm > 0 ? (companyAvg / maxCrm) * 100 : 0;
          const aboveAvg = agent.crm >= companyAvg;

          return (
            <div key={agent.agent_id} className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs text-[#0C1E3C] font-medium truncate">{agent.name}</span>
                <span className={`text-xs font-bold ${aboveAvg ? 'text-[#1D7A4E]' : 'text-[#DC3545]'}`}>
                  {agent.crm.toLocaleString('el-GR')}
                </span>
              </div>
              <div className="relative h-4 bg-[#F7F6F3] rounded overflow-hidden">
                {/* Agent bar */}
                <div
                  className={`absolute inset-y-0 left-0 rounded ${aboveAvg ? 'bg-[#1D7A4E]/20' : 'bg-[#DC3545]/20'}`}
                  style={{ width: `${pct}%` }}
                />
                {/* M.O. marker */}
                <div
                  className="absolute inset-y-0 w-0.5 bg-[#0C1E3C]/40"
                  style={{ left: `${avgPct}%` }}
                />
              </div>
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
