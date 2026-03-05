import type { TeamKpiBreakdown } from '../../lib/metrics';

interface Props {
  teams: TeamKpiBreakdown[];
  hasAcc: boolean;
  kpiColor: string;
}

export function TeamBreakdownTab({ teams, hasAcc, kpiColor }: Props) {
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
          <div key={team.team_id ?? 'none'} className="bg-surface-card rounded-xl border border-border-default overflow-hidden">
            <div className="px-4 py-3 border-b border-border-subtle" style={{ borderLeft: `4px solid ${kpiColor}` }}>
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm font-bold text-text-primary">{team.team_name}</div>
                <div className="flex items-center gap-3">
                  <span className="text-lg font-bold text-text-primary">{team.crm.toLocaleString('el-GR')}</span>
                  {hasAcc && <span className="text-sm text-text-muted">acc {team.acc.toLocaleString('el-GR')}</span>}
                  <span className="text-[10px] font-semibold text-text-muted bg-surface px-2 py-0.5 rounded-full">
                    {team.pctOfCompany}% εταιρείας
                  </span>
                </div>
              </div>
              <div className="h-2 bg-border-subtle rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all duration-500" style={{ width: `${Math.max(teamBarPct, 2)}%`, backgroundColor: kpiColor }} />
              </div>
            </div>

            {team.members.length > 0 && (
              <div className="px-4 py-2">
                <div className="flex items-center gap-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-text-muted border-b border-border-subtle">
                  <span className="flex-1">Μέλος</span>
                  <span className="w-[140px] text-center">Απόδοση</span>
                  <span className="w-10 text-right">CRM</span>
                  {hasSaleRent && (
                    <span className="w-20 text-center">
                      <span className="text-brand-blue">Πώληση</span>{' / '}<span className="text-brand-orange">Ενοικίαση</span>
                    </span>
                  )}
                  {hasAcc && (
                    <>
                      <span className="w-20 text-right">Accountability</span>
                      <span className="w-14 text-right">Διαφορά</span>
                    </>
                  )}
                </div>

                {team.members.map((m) => {
                  const barPct = teamMax > 0 ? (m.crm / teamMax) * 100 : 0;
                  return (
                    <div key={m.agent_id} className="flex items-center gap-3 py-2 border-b border-border-subtle last:border-b-0 hover:bg-surface transition-colors">
                      <div className="flex-1 min-w-0">
                        <span className="text-xs font-medium text-text-primary truncate block">{m.name}</span>
                      </div>
                      <div className="w-[140px]">
                        <div className="h-3.5 bg-border-subtle rounded-full overflow-hidden">
                          <div className="h-full rounded-full transition-all duration-500" style={{ width: `${Math.max(barPct, 3)}%`, backgroundColor: `${kpiColor}99` }} />
                        </div>
                      </div>
                      <span className="w-10 text-right text-sm font-bold text-text-primary">{m.crm.toLocaleString('el-GR')}</span>
                      {hasSaleRent && (
                        <div className="w-20 flex justify-center gap-0.5 text-[11px] font-medium">
                          <span className="text-brand-blue">{m.sale ?? 0}</span>
                          <span className="text-text-muted">/</span>
                          <span className="text-brand-orange">{m.rent ?? 0}</span>
                        </div>
                      )}
                      {hasAcc && (
                        <>
                          <span className="w-20 text-right text-xs text-text-muted">{m.acc.toLocaleString('el-GR')}</span>
                          <div className="w-14 text-right">
                            <span className={`text-[10px] font-bold px-1 py-0.5 rounded-full ${m.delta > 0 ? 'text-brand-green bg-brand-green/10' : m.delta < 0 ? 'text-brand-red bg-brand-red/10' : 'text-text-muted'}`}>
                              {m.delta > 0 ? '+' : ''}{m.delta.toLocaleString('el-GR')}
                            </span>
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}

                <div className="flex items-center gap-3 pt-2 mt-1 border-t border-border-default">
                  <span className="flex-1 text-xs font-bold text-text-primary">Σύνολο ({team.members.length} μέλη)</span>
                  <span className="w-[140px]" />
                  <span className="w-10 text-right text-sm font-bold text-text-primary">{memberCrmTotal.toLocaleString('el-GR')}</span>
                  {hasSaleRent && <span className="w-20" />}
                  {hasAcc && (
                    <>
                      <span className="w-20 text-right text-xs font-bold text-text-muted">{memberAccTotal.toLocaleString('el-GR')}</span>
                      <span className="w-14" />
                    </>
                  )}
                </div>
              </div>
            )}

            {team.members.length === 0 && (
              <div className="px-4 py-3 text-xs text-text-muted italic">Δεν υπάρχουν μέλη</div>
            )}
          </div>
        );
      })}

      {teams.length === 0 && (
        <div className="text-sm text-text-muted text-center py-4">Δεν υπάρχουν δεδομένα teams</div>
      )}
    </div>
  );
}
