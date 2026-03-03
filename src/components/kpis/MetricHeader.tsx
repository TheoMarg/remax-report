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
    <div className="bg-white rounded-lg border border-[#DDD8D0] p-5 relative overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-1.5" style={{ backgroundColor: def.color }} />

      <div className="flex flex-wrap items-start justify-between gap-4 mt-1">
        {/* CRM total */}
        <div>
          <div className="text-xs font-medium text-[#8A94A0] mb-1">CRM Σύνολο</div>
          <div className="text-3xl font-bold text-[#0C1E3C]">{crm.toLocaleString('el-GR')}</div>
        </div>

        {/* Accountability Report total + delta */}
        {hasAcc && (
          <div>
            <div className="text-xs font-medium text-[#8A94A0] mb-1">Accountability Report</div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-[#0C1E3C]">{acc.toLocaleString('el-GR')}</span>
              {delta !== 0 && (
                <span
                  className={`text-xs font-semibold px-2 py-0.5 rounded ${
                    delta > 0
                      ? 'text-[#1D7A4E] bg-[#1D7A4E]/10'
                      : 'text-[#DC3545] bg-[#DC3545]/10'
                  }`}
                >
                  {delta > 0 ? '+' : ''}{delta.toLocaleString('el-GR')}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Company avg */}
        <div>
          <div className="text-xs text-[#8A94A0] mb-1">Εταιρεία</div>
          <div className="text-xs text-[#8A94A0]">
            {totalAgents} συνεργάτες
          </div>
          <div className="text-xs text-[#8A94A0]">
            Μέσος όρος ανά συνεργάτη/μήνα: <span className="font-semibold text-[#0C1E3C]">{companyAvg.toLocaleString('el-GR')}</span>
          </div>
        </div>

        {/* Per-office */}
        <div className="flex gap-6">
          {officeBreakdown.map((o) => (
            <div key={o.office}>
              <div className="text-xs text-[#8A94A0] mb-1">{OFFICE_SHORT[o.office] || o.office}</div>
              <div className="text-lg font-bold text-[#0C1E3C]">{o.crm.toLocaleString('el-GR')}</div>
              <div className="text-xs text-[#8A94A0]">
                {o.agents} agents · avg/συνεργάτη/μήνα {o.moPerAgent.toLocaleString('el-GR')}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
