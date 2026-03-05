import type { GciRanking } from '../../lib/metrics';
import { AgentLink } from '../ui/AgentLink';

const OFFICE_SHORT: Record<string, string> = {
  larissa: 'Λάρισα',
  katerini: 'Κατερίνη',
};

const RANK_BG: Record<number, string> = {
  1: 'bg-[#FFD700]/10',
  2: 'bg-[#C0C0C0]/10',
  3: 'bg-[#CD7F32]/10',
};

const MEDAL: Record<number, string> = {
  1: '#FFD700',
  2: '#C0C0C0',
  3: '#CD7F32',
};

interface Props {
  rankings: GciRanking[];
  companyAvg: number;
}

export function GciRankTable({ rankings, companyAvg }: Props) {
  const maxGci = Math.max(...rankings.map(r => r.gci), 1);
  const avgIdx = rankings.findIndex(r => r.gci < companyAvg);

  return (
    <div className="card-premium p-5">
      <h3 className="text-sm font-semibold text-text-primary mb-4">Κατάταξη GCI</h3>

      <div className="flex items-center gap-3 px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-text-muted border-b border-border-default">
        <span className="w-7 text-right">#</span>
        <span className="flex-1">Συνεργάτης</span>
        <span className="w-[220px] text-center">Απόδοση</span>
        <span className="w-20 text-right">GCI</span>
      </div>

      <div>
        {rankings.map((agent, i) => {
          const barPct = maxGci > 0 ? (agent.gci / maxGci) * 100 : 0;
          const aboveAvg = agent.gci >= companyAvg;
          const medalColor = MEDAL[agent.rank];
          const rowBg = RANK_BG[agent.rank] || '';
          const showAvgLine = avgIdx === i && avgIdx > 0;

          return (
            <div key={agent.agent_id}>
              {showAvgLine && (
                <div className="flex items-center gap-2 px-3 py-1.5">
                  <div className="flex-1 border-t-2 border-dashed border-brand-gold/50" />
                  <span className="text-[10px] font-semibold text-brand-gold whitespace-nowrap">
                    M.O. Εταιρείας: €{companyAvg.toLocaleString('el-GR')}
                  </span>
                  <div className="flex-1 border-t-2 border-dashed border-brand-gold/50" />
                </div>
              )}
              <div className={`flex items-center gap-3 px-3 py-2.5 border-b border-border-subtle transition-colors hover:bg-surface ${rowBg}`}>
                <span className="w-7 text-right text-xs font-bold" style={{ color: medalColor || '#8A94A0' }}>
                  #{agent.rank}
                </span>
                <div className="flex-1 min-w-0">
                  <AgentLink agentId={agent.agent_id} name={agent.name} className="text-sm font-semibold text-text-primary truncate block" />
                  <div className="text-[11px] text-text-muted">
                    {OFFICE_SHORT[agent.office || ''] || agent.office || '—'}
                  </div>
                </div>
                <div className="w-[220px]">
                  <div className="h-5 bg-border-subtle rounded-full overflow-hidden relative">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${Math.max(barPct, 2)}%`, backgroundColor: aboveAvg ? '#C9961A' : '#C9961A66' }}
                    />
                    {companyAvg > 0 && (
                      <div className="absolute top-0 h-full w-[2px] bg-brand-gold" style={{ left: `${(companyAvg / maxGci) * 100}%` }} />
                    )}
                  </div>
                </div>
                <div className="w-20 text-right">
                  <span className="text-base font-bold text-text-primary">€{agent.gci.toLocaleString('el-GR')}</span>
                </div>
              </div>
            </div>
          );
        })}

        {avgIdx === -1 && rankings.length > 0 && (
          <div className="flex items-center gap-2 px-3 py-1.5">
            <div className="flex-1 border-t-2 border-dashed border-brand-gold/50" />
            <span className="text-[10px] font-semibold text-brand-gold whitespace-nowrap">
              M.O. Εταιρείας: €{companyAvg.toLocaleString('el-GR')}
            </span>
            <div className="flex-1 border-t-2 border-dashed border-brand-gold/50" />
          </div>
        )}
      </div>

      <div className="flex items-center justify-between text-xs text-text-muted border-t border-border-default pt-3 mt-1 px-3">
        <span>{rankings.length} συνεργάτες</span>
        <span>
          <span className="inline-block w-3 h-[2px] bg-brand-gold mr-1 align-middle" />
          M.O. = €{companyAvg.toLocaleString('el-GR')}
        </span>
      </div>
    </div>
  );
}
