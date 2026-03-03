import type { TeamKpiBreakdown } from '../../lib/metrics';

interface Props {
  teams: TeamKpiBreakdown[];
  hasAcc: boolean;
}

export function TeamBreakdownTab({ teams, hasAcc }: Props) {
  return (
    <div className="space-y-4">
      {teams.map((team) => (
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

          {/* Team totals */}
          <div className="flex items-center gap-4">
            <div>
              <div className="text-xs text-[#8A94A0]">CRM</div>
              <div className="text-lg font-bold text-[#0C1E3C]">{team.crm.toLocaleString('el-GR')}</div>
            </div>
            {hasAcc && (
              <div>
                <div className="text-xs text-[#8A94A0]">ACC</div>
                <div className="text-lg font-bold text-[#0C1E3C]">{team.acc.toLocaleString('el-GR')}</div>
              </div>
            )}
          </div>

          {/* Member list */}
          {team.members.length > 0 && (
            <div className="border-t border-[#DDD8D0] pt-2 space-y-1">
              {team.members.map((m) => (
                <div key={m.agent_id} className="flex items-center justify-between px-2 py-1">
                  <span className="text-xs text-[#0C1E3C] truncate">{m.name}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-semibold text-[#0C1E3C]">{m.crm.toLocaleString('el-GR')}</span>
                    {hasAcc && (
                      <span className="text-xs text-[#8A94A0]">{m.acc.toLocaleString('el-GR')}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}

      {teams.length === 0 && (
        <div className="text-sm text-[#8A94A0] text-center py-4">Δεν υπάρχουν δεδομένα teams</div>
      )}
    </div>
  );
}
