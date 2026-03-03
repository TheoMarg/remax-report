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

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mt-1">
        {/* CRM total */}
        <div className="border-r border-[#EFECEA] pr-4">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-[#8A94A0] mb-1">CRM Σύνολο</div>
          <div className="text-3xl font-bold" style={{ color: def.color }}>
            {crm.toLocaleString('el-GR')}
          </div>
        </div>

        {/* Accountability Report total + delta */}
        {hasAcc ? (
          <div className="border-r border-[#EFECEA] pr-4">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-[#8A94A0] mb-1">
              Accountability Report
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-[#0C1E3C]">{acc.toLocaleString('el-GR')}</span>
              {delta !== 0 && (
                <span
                  title={`Διαφορά CRM - Accountability: ${delta > 0 ? '+' : ''}${delta}`}
                  className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                    delta > 0
                      ? 'text-[#1D7A4E] bg-[#1D7A4E]/10'
                      : 'text-[#DC3545] bg-[#DC3545]/10'
                  }`}
                >
                  {delta > 0 ? '+' : ''}{delta.toLocaleString('el-GR')}
                </span>
              )}
            </div>
            <div className="text-[10px] text-[#8A94A0] mt-0.5">
              {delta > 0 ? 'CRM > ACC' : delta < 0 ? 'CRM < ACC' : 'CRM = ACC'}
            </div>
          </div>
        ) : (
          <div className="border-r border-[#EFECEA] pr-4">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-[#8A94A0] mb-1">
              Accountability Report
            </div>
            <div className="text-sm text-[#8A94A0] italic">Δεν υπάρχει</div>
          </div>
        )}

        {/* Company avg */}
        <div className="border-r border-[#EFECEA] pr-4">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-[#8A94A0] mb-1">M.O. Εταιρείας</div>
          <div className="text-2xl font-bold text-[#C9961A]">{companyAvg.toLocaleString('el-GR')}</div>
          <div className="text-[10px] text-[#8A94A0] mt-0.5">
            ανά συνεργάτη · {totalAgents} συνεργάτες
          </div>
        </div>

        {/* Per-office */}
        {officeBreakdown.map((o, i) => (
          <div key={o.office} className={i < officeBreakdown.length - 1 ? 'border-r border-[#EFECEA] pr-4' : ''}>
            <div className="text-[10px] font-semibold uppercase tracking-wider text-[#8A94A0] mb-1">
              {OFFICE_SHORT[o.office] || o.office}
            </div>
            <div className="text-2xl font-bold text-[#0C1E3C]">{o.crm.toLocaleString('el-GR')}</div>
            <div className="text-[10px] text-[#8A94A0] mt-0.5">
              {o.agents} συνεργάτες · μ.ό. {o.moPerAgent.toLocaleString('el-GR')}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
