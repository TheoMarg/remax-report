import type { WithdrawalTeamRow } from '../../lib/metrics';

interface Props {
  teams: WithdrawalTeamRow[];
}

const CAT_COLORS = {
  passive: '#8A94A0',
  active: '#DC3545',
  closings: '#1D7A4E',
};

export function WithdrawalTeamBreakdown({ teams }: Props) {
  // Filter out teams with 0 withdrawals
  const visible = teams.filter(t => t.total > 0);

  if (visible.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-[#DDD8D0] p-5 text-center">
        <span className="text-sm text-[#8A94A0]">Δεν υπάρχουν δεδομένα</span>
      </div>
    );
  }

  const maxTotal = Math.max(...visible.map(t => t.total), 1);
  const grandTotal = visible.reduce((s, t) => s + t.total, 0);

  return (
    <div className="bg-white rounded-lg border border-[#DDD8D0] p-5">
      <h3 className="text-sm font-semibold text-[#0C1E3C] mb-3">Ανά Ομάδα</h3>

      {/* Column headers */}
      <div className="flex items-center gap-2 px-2 py-2 text-[10px] font-semibold uppercase tracking-wider text-[#8A94A0] border-b border-[#DDD8D0]">
        <span className="w-[120px] shrink-0">Ομάδα</span>
        <span className="flex-1 text-center">Κατανομή</span>
        <span className="w-10 text-right">Παθ.</span>
        <span className="w-10 text-right">Ενεργ.</span>
        <span className="w-10 text-right">Κλεισ.</span>
        <span className="w-10 text-right">Σύν.</span>
      </div>

      <div>
        {visible.map(team => {
          const pPct = team.total > 0 ? (team.passive / team.total) * 100 : 0;
          const aPct = team.total > 0 ? (team.active / team.total) * 100 : 0;
          const cPct = team.total > 0 ? (team.closings / team.total) * 100 : 0;
          const barWidth = (team.total / maxTotal) * 100;

          return (
            <div
              key={team.team_id ?? 'ind'}
              className="flex items-center gap-2 px-2 py-3 border-b border-[#F0EEEB] hover:bg-[#F7F6F3] transition-colors"
            >
              {/* Team name */}
              <div className="w-[120px] shrink-0 min-w-0">
                <span className="text-xs font-semibold text-[#0C1E3C] truncate block">
                  {team.team_name}
                </span>
              </div>

              {/* Stacked bar */}
              <div className="flex-1">
                <div
                  className="h-6 rounded-full overflow-hidden flex"
                  style={{ width: `${Math.max(barWidth, 10)}%` }}
                >
                  {team.passive > 0 && (
                    <div
                      className="h-full"
                      style={{ width: `${pPct}%`, backgroundColor: CAT_COLORS.passive }}
                      title={`Παθητικές: ${team.passive}`}
                    />
                  )}
                  {team.active > 0 && (
                    <div
                      className="h-full"
                      style={{ width: `${aPct}%`, backgroundColor: CAT_COLORS.active }}
                      title={`Ενεργές: ${team.active}`}
                    />
                  )}
                  {team.closings > 0 && (
                    <div
                      className="h-full"
                      style={{ width: `${cPct}%`, backgroundColor: CAT_COLORS.closings }}
                      title={`Κλεισίματα: ${team.closings}`}
                    />
                  )}
                </div>
              </div>

              {/* Numbers */}
              <span className="w-10 text-right text-xs font-medium tabular-nums" style={{ color: CAT_COLORS.passive }}>
                {team.passive || '—'}
              </span>
              <span className="w-10 text-right text-xs font-medium tabular-nums" style={{ color: CAT_COLORS.active }}>
                {team.active || '—'}
              </span>
              <span className="w-10 text-right text-xs font-medium tabular-nums" style={{ color: CAT_COLORS.closings }}>
                {team.closings || '—'}
              </span>
              <span className="w-10 text-right text-sm font-bold text-[#0C1E3C] tabular-nums">
                {team.total}
              </span>
            </div>
          );
        })}
      </div>

      {/* Totals row */}
      {visible.length > 1 && (
        <div className="flex items-center gap-2 px-2 py-2.5 border-t-2 border-[#DDD8D0] bg-[#F7F6F3]">
          <span className="w-[120px] shrink-0 text-xs font-bold text-[#0C1E3C]">Σύνολο</span>
          <div className="flex-1" />
          <span className="w-10 text-right text-xs font-bold tabular-nums" style={{ color: CAT_COLORS.passive }}>
            {visible.reduce((s, t) => s + t.passive, 0)}
          </span>
          <span className="w-10 text-right text-xs font-bold tabular-nums" style={{ color: CAT_COLORS.active }}>
            {visible.reduce((s, t) => s + t.active, 0)}
          </span>
          <span className="w-10 text-right text-xs font-bold tabular-nums" style={{ color: CAT_COLORS.closings }}>
            {visible.reduce((s, t) => s + t.closings, 0)}
          </span>
          <span className="w-10 text-right text-sm font-bold text-[#0C1E3C] tabular-nums">
            {grandTotal}
          </span>
        </div>
      )}

      {/* Legend */}
      <div className="flex items-center gap-5 text-[10px] text-[#8A94A0] pt-2.5 mt-1 px-2">
        <span><span className="inline-block w-2 h-2 rounded-full mr-1" style={{ backgroundColor: CAT_COLORS.passive }} />Παθητικές</span>
        <span><span className="inline-block w-2 h-2 rounded-full mr-1" style={{ backgroundColor: CAT_COLORS.active }} />Ενεργές</span>
        <span><span className="inline-block w-2 h-2 rounded-full mr-1" style={{ backgroundColor: CAT_COLORS.closings }} />Κλεισίματα</span>
      </div>
    </div>
  );
}
