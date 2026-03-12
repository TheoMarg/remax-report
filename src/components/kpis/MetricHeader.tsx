import type { KpiDef, OfficeKpiComparison } from '../../lib/metrics';

const OFFICE_SHORT: Record<string, string> = {
  larissa: 'Λάρισα',
  katerini: 'Κατερίνη',
};

interface Props {
  def: KpiDef;
  crm: number;
  acc: number;
  delta: number;
  officeBreakdown: OfficeKpiComparison[];
  totalAgents: number;
  companyAvg: number;
}

export function MetricHeader({ def, crm, acc, delta, officeBreakdown, totalAgents, companyAvg }: Props) {
  const hasAcc = def.accField !== null;

  return (
    <div className="card-premium p-6 relative overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-1.5 rounded-t-xl" style={{ background: `linear-gradient(90deg, ${def.color}, ${def.color}88)` }} />

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-5 mt-1">
        <div className="border-r border-border-subtle pr-4">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-text-muted mb-1.5">CRM ΣΥΝΟΛΟ</div>
          <div className="text-3xl font-extrabold stat-number" style={{ color: def.color }}>
            {crm.toLocaleString('el-GR')}
          </div>
        </div>

        {hasAcc ? (
          <div className="border-r border-border-subtle pr-4">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-text-muted mb-1.5">
              ACCOUNTABILITY REPORT
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-text-primary stat-number">{acc.toLocaleString('el-GR')}</span>
              {delta !== 0 && (
                <span
                  className={`text-xs font-bold px-2 py-0.5 rounded-full inline-flex items-center gap-0.5 ${
                    delta > 0
                      ? 'text-brand-green bg-brand-green/10'
                      : 'text-brand-red bg-brand-red/10'
                  }`}
                >
                  <span className="text-[8px]">{delta > 0 ? '\u25B2' : '\u25BC'}</span>
                  {delta > 0 ? '+' : ''}{delta.toLocaleString('el-GR')}
                </span>
              )}
            </div>
            <div className="text-[10px] text-text-muted mt-0.5">
              {delta > 0 ? 'CRM > ACC' : delta < 0 ? 'CRM < ACC' : 'CRM = ACC'}
            </div>
          </div>
        ) : (
          <div className="border-r border-border-subtle pr-4">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-text-muted mb-1.5">
              ACCOUNTABILITY REPORT
            </div>
            <div className="text-sm text-text-muted italic">Δεν υπάρχει</div>
          </div>
        )}

        <div className="border-r border-border-subtle pr-4">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-text-muted mb-1.5">Μ.Ο. ΕΤΑΙΡΕΙΑΣ</div>
          <div className="text-2xl font-bold text-brand-gold stat-number">{companyAvg.toLocaleString('el-GR')}</div>
          <div className="text-[10px] text-text-muted mt-0.5">
            ανά συνεργάτη · {totalAgents} συνεργάτες
          </div>
        </div>

        {officeBreakdown.map((o, i) => (
          <div key={o.office} className={i < officeBreakdown.length - 1 ? 'border-r border-border-subtle pr-4' : ''}>
            <div className="text-[10px] font-semibold uppercase tracking-wider text-text-muted mb-1.5">
              {OFFICE_SHORT[o.office] || o.office}
            </div>
            <div className="text-2xl font-bold text-text-primary stat-number">{o.crm.toLocaleString('el-GR')}</div>
            <div className="text-[10px] text-text-muted mt-0.5">
              {o.agents} συνεργάτες · μ.ό. {o.moPerAgent.toLocaleString('el-GR')}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
