import type { TeamKpiBreakdown } from '../../lib/metrics';

interface Props {
  teams: TeamKpiBreakdown[];
  hasAcc: boolean;
  kpiColor: string;
}

export function TeamBreakdownTab({ teams, hasAcc, kpiColor }: Props) {
  // Global max across all teams for consistent bar scaling
  const globalMaxCrm = Math.max(...teams.map(t => t.crm), 1);
  const hasSaleRent = teams.some(t => t.members.some(m => m.sale != null && m.rent != null));

  return (
    <div className="space-y-4">
      {teams.map((team) => {
        const memberCrmTotal = team.members.reduce((s, m) => s + m.crm, 0);
        const memberAccTotal = team.members.reduce((s, m) => s + m.acc, 0);
        const teamMax = Math.max(...team.members.map(m => m.crm), 1);
        const teamBarPct = globalMaxCrm > 0 ? (team.crm / globalMaxCrm) * 100 : 0;

        return (
          <div
            key={team.team_id ?? 'none'}
            className="bg-white rounded-lg border border-[#DDD8D0] overflow-hidden"
          >
            {/* Team header */}
            <div className="px-4 py-3 border-b border-[#EFECEA]" style={{ borderLeft: `4px solid ${kpiColor}` }}>
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm font-bold text-[#0C1E3C]">{team.team_name}</div>
                <div className="flex items-center gap-3">
                  <span className="text-lg font-bold text-[#0C1E3C]">{team.crm.toLocaleString('el-GR')}</span>
                  {hasAcc && (
                    <span className="text-sm text-[#8A94A0]">
                      acc {team.acc.toLocaleString('el-GR')}
                    </span>
                  )}
                  <span className="text-[10px] font-semibold text-[#8A94A0] bg-[#F7F6F3] px-2 py-0.5 rounded-full">
                    {team.pctOfCompany}% εταιρείας
                  </span>
                </div>
              </div>
              {/* Team bar (% of global max) */}
              <div className="h-2 bg-[#F0EEEB] rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${Math.max(teamBarPct, 2)}%`, backgroundColor: kpiColor }}
                />
              </div>
            </div>

            {/* Member list */}
            {team.members.length > 0 && (
              <div className="px-4 py-2">
                {/* Column headers */}
                <div className="flex items-center gap-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-[#8A94A0] border-b border-[#F0EEEB]">
                  <span className="flex-1">Μέλος</span>
                  <span className="w-[140px] text-center">Απόδοση</span>
                  <span className="w-10 text-right">CRM</span>
                  {hasSaleRent && (
                    <span className="w-20 text-center">
                      <span className="text-[#1B5299]">Πώληση</span>
                      {' / '}
                      <span className="text-[#D4722A]">Ενοικίαση</span>
                    </span>
                  )}
                  {hasAcc && (
                    <>
                      <span className="w-20 text-right">Accountability</span>
                      <span className="w-14 text-right">Διαφορά</span>
                    </>
                  )}
                </div>

                {/* Members */}
                {team.members.map((m) => {
                  const barPct = teamMax > 0 ? (m.crm / teamMax) * 100 : 0;
                  return (
                    <div
                      key={m.agent_id}
                      className="flex items-center gap-3 py-2 border-b border-[#F0EEEB] last:border-b-0 hover:bg-[#F7F6F3] transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <span className="text-xs font-medium text-[#0C1E3C] truncate block">{m.name}</span>
                      </div>

                      {/* Mini bar */}
                      <div className="w-[140px]">
                        <div className="h-3.5 bg-[#F0EEEB] rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{
                              width: `${Math.max(barPct, 3)}%`,
                              backgroundColor: `${kpiColor}99`,
                            }}
                          />
                        </div>
                      </div>

                      <span className="w-10 text-right text-sm font-bold text-[#0C1E3C]">
                        {m.crm.toLocaleString('el-GR')}
                      </span>

                      {hasSaleRent && (
                        <div className="w-20 flex justify-center gap-0.5 text-[11px] font-medium">
                          <span className="text-[#1B5299]">{m.sale ?? 0}</span>
                          <span className="text-[#8A94A0]">/</span>
                          <span className="text-[#D4722A]">{m.rent ?? 0}</span>
                        </div>
                      )}

                      {hasAcc && (
                        <>
                          <span className="w-20 text-right text-xs text-[#8A94A0]">
                            {m.acc.toLocaleString('el-GR')}
                          </span>
                          <div className="w-14 text-right">
                            <span
                              className={`text-[10px] font-bold px-1 py-0.5 rounded ${
                                m.delta > 0
                                  ? 'text-[#1D7A4E] bg-[#1D7A4E]/10'
                                  : m.delta < 0
                                  ? 'text-[#DC3545] bg-[#DC3545]/10'
                                  : 'text-[#8A94A0]'
                              }`}
                            >
                              {m.delta > 0 ? '+' : ''}{m.delta.toLocaleString('el-GR')}
                            </span>
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}

                {/* Totals row */}
                <div className="flex items-center gap-3 pt-2 mt-1 border-t border-[#DDD8D0]">
                  <span className="flex-1 text-xs font-bold text-[#0C1E3C]">
                    Σύνολο ({team.members.length} μέλη)
                  </span>
                  <span className="w-[140px]" />
                  <span className="w-10 text-right text-sm font-bold text-[#0C1E3C]">
                    {memberCrmTotal.toLocaleString('el-GR')}
                  </span>
                  {hasSaleRent && <span className="w-20" />}
                  {hasAcc && (
                    <>
                      <span className="w-20 text-right text-xs font-bold text-[#8A94A0]">
                        {memberAccTotal.toLocaleString('el-GR')}
                      </span>
                      <span className="w-14" />
                    </>
                  )}
                </div>
              </div>
            )}

            {team.members.length === 0 && (
              <div className="px-4 py-3 text-xs text-[#8A94A0] italic">Δεν υπάρχουν μέλη</div>
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
