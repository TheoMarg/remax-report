import { useState } from 'react';
import type { KpiSummary } from '../../lib/metrics';
import { StaggerContainer, StaggerItem } from '../animations/AnimatedSection';
import { formatPercentileSummary } from '../../lib/percentiles';
import type { DrilldownMetric } from '../shared/DrilldownDrawer';

interface Props {
  kpis: KpiSummary[];
  /** Per-KPI individual agent values for percentile computation */
  agentValues?: Record<string, number[]>;
  /** Open drilldown for evidence */
  onDrilldown?: (metric: DrilldownMetric, title: string, count: number) => void;
}

const OFFICE_SHORT: Record<string, string> = {
  larissa: 'Λάρισα',
  katerini: 'Κατερίνη',
  teams: 'Ομάδες',
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

const DRILLDOWN_KEYS: Record<string, DrilldownMetric> = {
  registrations: 'registrations',
  exclusives: 'exclusives',
  showings: 'showings',
  offers: 'offers',
  closings: 'closings',
  billing: 'billing',
};

export function KpiCards({ kpis, agentValues, onDrilldown }: Props) {
  const [hoveredKpi, setHoveredKpi] = useState<string | null>(null);

  return (
    <StaggerContainer className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-3">
      {kpis.map((kpi) => {
        const hasAcc = kpi.key !== 'published';
        const pctSummary = agentValues?.[kpi.key]
          ? formatPercentileSummary(agentValues[kpi.key])
          : '';
        return (
          <StaggerItem key={kpi.key}>
            <div
              className="card-premium p-4 relative overflow-hidden group"
              onMouseEnter={() => setHoveredKpi(kpi.key)}
              onMouseLeave={() => setHoveredKpi(null)}
            >
              {/* Percentile tooltip */}
              {hoveredKpi === kpi.key && pctSummary && (
                <div className="absolute z-10 bottom-full left-1/2 -translate-x-1/2 mb-1 bg-text-primary text-white text-[9px] px-2.5 py-1.5 rounded-lg whitespace-nowrap shadow-lg pointer-events-none">
                  {pctSummary}
                </div>
              )}
              {/* Color accent strip */}
              <div
                className="absolute top-0 left-0 right-0 h-[3px]"
                style={{ background: `linear-gradient(90deg, ${kpi.color}, ${kpi.color}66)` }}
              />
              <div className="text-[11px] font-medium text-text-muted mb-2 mt-1">
                {kpi.label}
              </div>
              {onDrilldown && DRILLDOWN_KEYS[kpi.key] ? (
                <button
                  onClick={() => onDrilldown(DRILLDOWN_KEYS[kpi.key], kpi.label, kpi.crm)}
                  className="text-2xl font-extrabold text-text-primary stat-number hover:text-brand-blue transition-colors cursor-pointer"
                >
                  {kpi.crm.toLocaleString('el-GR')}
                </button>
              ) : (
                <div className="text-2xl font-extrabold text-text-primary stat-number">
                  {kpi.crm.toLocaleString('el-GR')}
                </div>
              )}
              {kpi.sale != null && kpi.rent != null && (kpi.sale > 0 || kpi.rent > 0) && (
                <div className="text-[10px] text-text-muted mt-1 flex gap-1.5">
                  <span className="text-brand-blue">Π {kpi.sale}</span>
                  <span className="text-text-muted">/</span>
                  <span className="text-brand-orange">Ε {kpi.rent}</span>
                </div>
              )}
              {/* Per-office breakdown */}
              <div className="grid grid-cols-[auto_1fr_auto] gap-x-2 gap-y-0.5 text-[10px] text-text-muted mt-2 pt-2 border-t border-border-subtle items-center">
                {kpi.byOffice.filter(o => o.office !== 'teams').map((o) => {
                  const hasSR = o.sale != null && o.rent != null && (o.sale > 0 || o.rent > 0);
                  return (
                    <div key={o.office} className="col-span-3 grid grid-cols-[auto_1fr_auto] gap-x-2 items-center">
                      <span>{OFFICE_SHORT[o.office] || o.office}:</span>
                      <span className="font-semibold text-text-primary text-right">{o.crm.toLocaleString('el-GR')}</span>
                      <span className="text-[9px] text-right">
                        {hasSR ? (
                          <>
                            <span className="text-brand-blue">Π{o.sale}</span>
                            <span className="text-text-muted">/</span>
                            <span className="text-brand-orange">Ε{o.rent}</span>
                          </>
                        ) : null}
                      </span>
                    </div>
                  );
                })}
                {kpi.byOffice.filter(o => o.office === 'teams').map((o) => {
                  const hasSR = o.sale != null && o.rent != null && (o.sale > 0 || o.rent > 0);
                  return (
                    <div key={o.office} className="col-span-3 grid grid-cols-[auto_1fr_auto] gap-x-2 items-center bg-brand-gold/10 px-1.5 py-0.5 rounded-md border border-brand-gold/20 -mx-1.5">
                      <span className="text-brand-gold font-semibold">Ομάδες:</span>
                      <span className="font-semibold text-text-primary text-right">{o.crm.toLocaleString('el-GR')}</span>
                      <span className="text-[9px] text-right">
                        {hasSR ? (
                          <>
                            <span className="text-brand-blue">Π{o.sale}</span>
                            <span className="text-text-muted">/</span>
                            <span className="text-brand-orange">Ε{o.rent}</span>
                          </>
                        ) : null}
                      </span>
                    </div>
                  );
                })}
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
