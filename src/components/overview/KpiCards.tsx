import type { KpiSummary } from '../../lib/metrics';
import { StaggerContainer, StaggerItem } from '../animations/AnimatedSection';

interface Props {
  kpis: KpiSummary[];
}

const OFFICE_SHORT: Record<string, string> = {
  larissa: 'Λάρισα',
  katerini: 'Κατερίνη',
  teams: 'Teams',
};

function DeltaBadge({ delta, hasAcc }: { delta: number; hasAcc: boolean }) {
  if (!hasAcc) {
    return <span className="text-[10px] text-text-muted">Μόνο CRM</span>;
  }
  if (delta === 0) {
    return <span className="text-[10px] text-text-muted bg-surface px-1.5 py-0.5 rounded-full">= 0</span>;
  }
  const isPositive = delta > 0;
  return (
    <span
      className={`text-[10px] font-semibold px-2 py-0.5 rounded-full inline-flex items-center gap-0.5 ${
        isPositive
          ? 'text-brand-green bg-brand-green/10'
          : 'text-brand-red bg-brand-red/10'
      }`}
    >
      <span className="text-[8px]">{isPositive ? '▲' : '▼'}</span>
      {isPositive ? '+' : ''}{delta}
    </span>
  );
}

export function KpiCards({ kpis }: Props) {
  return (
    <StaggerContainer className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-3">
      {kpis.map((kpi) => {
        const hasAcc = kpi.key !== 'published';
        return (
          <StaggerItem key={kpi.key}>
            <div
              className="card-premium p-4 relative overflow-hidden group"
            >
              {/* Color accent strip */}
              <div
                className="absolute top-0 left-0 right-0 h-[3px]"
                style={{ background: `linear-gradient(90deg, ${kpi.color}, ${kpi.color}66)` }}
              />
              <div className="text-[11px] font-medium text-text-muted mb-2 mt-1">
                {kpi.label}
              </div>
              <div className="text-2xl font-extrabold text-text-primary stat-number">
                {kpi.crm.toLocaleString('el-GR')}
              </div>
              {kpi.sale != null && kpi.rent != null && (
                <div className="text-[10px] text-text-muted mt-1 flex gap-1.5">
                  <span className="text-brand-blue">Π {kpi.sale}</span>
                  <span className="text-text-muted">/</span>
                  <span className="text-brand-orange">Ε {kpi.rent}</span>
                </div>
              )}
              {/* Per-office breakdown */}
              <div className="grid grid-cols-[auto_1fr_auto] gap-x-2 gap-y-0.5 text-[10px] text-text-muted mt-2 pt-2 border-t border-border-subtle items-center">
                {kpi.byOffice.filter(o => o.office !== 'teams').map((o) => (
                  <>
                    <span key={`${o.office}-label`}>{OFFICE_SHORT[o.office] || o.office}:</span>
                    <span key={`${o.office}-crm`} className="font-semibold text-text-primary text-right">{o.crm.toLocaleString('el-GR')}</span>
                    <span key={`${o.office}-sr`} className="text-[9px] text-right">
                      {o.sale != null && o.rent != null ? (
                        <>
                          <span className="text-brand-blue">Π{o.sale}</span>
                          <span className="text-text-muted">/</span>
                          <span className="text-brand-orange">Ε{o.rent}</span>
                        </>
                      ) : null}
                    </span>
                  </>
                ))}
                {kpi.byOffice.filter(o => o.office === 'teams').map((o) => (
                  <div key={o.office} className="col-span-3 grid grid-cols-[auto_1fr_auto] gap-x-2 items-center bg-brand-gold/10 px-1.5 py-0.5 rounded-md border border-brand-gold/20 -mx-1.5">
                    <span className="text-brand-gold font-semibold">Teams:</span>
                    <span className="font-semibold text-text-primary text-right">{o.crm.toLocaleString('el-GR')}</span>
                    <span className="text-[9px] text-right">
                      {o.sale != null && o.rent != null ? (
                        <>
                          <span className="text-brand-blue">Π{o.sale}</span>
                          <span className="text-text-muted">/</span>
                          <span className="text-brand-orange">Ε{o.rent}</span>
                        </>
                      ) : null}
                    </span>
                  </div>
                ))}
              </div>
              {hasAcc && (
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-[10px] text-text-muted">
                    ACC: {kpi.acc.toLocaleString('el-GR')}
                  </span>
                  <DeltaBadge delta={kpi.delta} hasAcc={hasAcc} />
                </div>
              )}
              {!hasAcc && (
                <div className="mt-2">
                  <DeltaBadge delta={0} hasAcc={false} />
                </div>
              )}
            </div>
          </StaggerItem>
        );
      })}
    </StaggerContainer>
  );
}
