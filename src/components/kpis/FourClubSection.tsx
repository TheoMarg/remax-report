import type { FourClubAgent } from '../../lib/metrics';

const OFFICE_SHORT: Record<string, string> = {
  larissa: 'Λάρισα',
  katerini: 'Κατερίνη',
};

interface Props {
  agents: FourClubAgent[];
}

export function FourClubSection({ agents }: Props) {
  return (
    <div className="bg-white rounded-lg border border-[#DDD8D0] p-5">
      <h3 className="text-sm font-bold text-[#0C1E3C] mb-3">
        4 Club — Αποκλειστικές Κατοικίες
      </h3>
      <p className="text-xs text-[#8A94A0] mb-4">
        Agents με ≥4 αποκλειστικές κατοικίες (crm_exclusives_residential)
      </p>

      <div className="space-y-1">
        {agents.map((agent, i) => {
          const inClub = agent.count >= 4;
          return (
            <div
              key={agent.agent_id}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg ${
                inClub ? 'bg-[#1D7A4E]/5' : 'bg-[#DC3545]/5'
              }`}
            >
              <span className="w-7 text-right text-sm font-bold text-[#8A94A0]">#{i + 1}</span>
              <div className="flex-1 min-w-0">
                <span className="text-sm font-medium text-[#0C1E3C] truncate">{agent.name}</span>
                <span className="text-xs text-[#8A94A0] ml-2">
                  {OFFICE_SHORT[agent.office || ''] || agent.office || '—'}
                </span>
              </div>
              <div className={`text-sm font-bold ${inClub ? 'text-[#1D7A4E]' : 'text-[#DC3545]'}`}>
                {agent.count.toLocaleString('el-GR')}
              </div>
              {inClub && (
                <span className="text-[10px] font-semibold text-[#1D7A4E] bg-[#1D7A4E]/10 px-1.5 py-0.5 rounded">
                  4 CLUB
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
