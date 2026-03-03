import type { TeamKpiBreakdown } from '../../lib/metrics';

interface Props {
  teams: TeamKpiBreakdown[];
  hasAcc: boolean;
}

export function TeamBreakdownTab({ teams, hasAcc }: Props) {
  return (
    <div className="space-y-4">
      {teams.map((team) => {
        const memberCrmTotal = team.members.reduce((s, m) => s + m.crm, 0);
        const memberAccTotal = team.members.reduce((s, m) => s + m.acc, 0);

        return (
          <div
            key={team.team_id ?? 'none'}
            className="bg-[#F7F6F3] rounded-lg p-4 space-y-3"
          >
            {/* Team header */}
            <div className="flex items-center justify-between">
              <div className="text-sm font-bold text-[#0C1E3C]">{team.team_name}</div>
              <span className="text-xs text-[#8A94A0] bg-white px-2 py-0.5 rounded">
                {team.pctOfCompany}% εταιρείας
              </span>
            </div>

            {/* Member list with column headers */}
            {team.members.length > 0 && (
              <div className="space-y-0.5">
                {/* Column headers */}
                <div className="flex items-center justify-between px-2 pb-1 border-b border-[#DDD8D0]">
                  <span className="text-[10px] text-[#8A94A0]">Συνεργάτης</span>
                  <div className="flex items-center gap-6">
                    <span className="text-[10px] text-[#8A94A0] w-12 text-right">CRM</span>
                    {hasAcc && (
                      <span className="text-[10px] text-[#8A94A0] w-12 text-right">Acc. Rep.</span>
                    )}
                  </div>
                </div>

                {/* Members */}
                {team.members.map((m) => (
                  <div key={m.agent_id} className="flex items-center justify-between px-2 py-1 hover:bg-white/50 rounded">
                    <span className="text-xs text-[#0C1E3C] truncate">{m.name}</span>
                    <div className="flex items-center gap-6">
                      <span className="text-xs font-semibold text-[#0C1E3C] w-12 text-right">{m.crm.toLocaleString('el-GR')}</span>
                      {hasAcc && (
                        <span className="text-xs text-[#8A94A0] w-12 text-right">{m.acc.toLocaleString('el-GR')}</span>
                      )}
                    </div>
                  </div>
                ))}

                {/* Totals row */}
                <div className="flex items-center justify-between px-2 pt-1 border-t border-[#DDD8D0]">
                  <span className="text-xs font-bold text-[#0C1E3C]">Σύνολο</span>
                  <div className="flex items-center gap-6">
                    <span className="text-xs font-bold text-[#0C1E3C] w-12 text-right">{memberCrmTotal.toLocaleString('el-GR')}</span>
                    {hasAcc && (
                      <span className="text-xs font-bold text-[#8A94A0] w-12 text-right">{memberAccTotal.toLocaleString('el-GR')}</span>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })}

      {teams.length === 0 && (
        <div className="text-sm text-[#8A94A0] text-center py-4">Δεν υπάρχουν δεδομένα teams</div>
      )}
    </div>
  );
}
