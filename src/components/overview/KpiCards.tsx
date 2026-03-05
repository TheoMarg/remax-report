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
    return <span className="text-[10px] text-text-muted bg-surface px-1.5 py-0.5 rounded">= 0</span>;
  }
  const isPositive = delta > 0;
  return (
    <span
      className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
        isPositive
          ? 'text-brand-green bg-brand-green/10'
          : 'text-brand-red bg-brand-red/10'
      }`}
    >
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
            <div className="card-premium p-4 relative overflow-hidden">
              <div
                className="absolute top-0 left-0 right-0 h-1 rounded-t-xl"
                style={{ backgroundColor: kpi.color }}
              />
              <div className="text-xs font-medium text-text-muted mb-2 mt-1">
                {kpi.label}
              </div>
              <div className="text-2xl font-bold text-text-primary">
                {kpi.crm.toLocaleString('el-GR')}
                {kpi.sale != null && kpi.rent != null && (
                  <span className="text-xs font-normal text-text-muted ml-2">
                    <span className="text-brand-blue">Π {kpi.sale}</span>
                    {' / '}
                    <span className="text-brand-orange">Ε {kpi.rent}</span>
                  </span>
                )}
              </div>
              {/* Per-office breakdown */}
              <div className="flex items-center gap-2 text-xs text-text-muted mb-1 flex-wrap">
                {kpi.byOffice.map((o) => (
                  <span key={o.office}>
                    {OFFICE_SHORT[o.office] || o.office}: <span className="font-semibold text-text-primary">{o.crm.toLocaleString('el-GR')}</span>
                    {o.sale != null && o.rent != null && (
                      <span className="text-[10px] ml-0.5">
                        (<span className="text-brand-blue">{o.sale}</span>/<span className="text-brand-orange">{o.rent}</span>)
                      </span>
                    )}
                  </span>
                ))}
              </div>
              {hasAcc && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-text-muted">
                    ACC: {kpi.acc.toLocaleString('el-GR')}
                  </span>
                  <DeltaBadge delta={kpi.delta} hasAcc={hasAcc} />
                </div>
              )}
              {!hasAcc && <DeltaBadge delta={0} hasAcc={false} />}
            </div>
          </StaggerItem>
        );
      })}
    </StaggerContainer>
  );
}
