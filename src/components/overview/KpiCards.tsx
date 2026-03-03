import type { KpiSummary } from '../../lib/metrics';

interface Props {
  kpis: KpiSummary[];
}

const OFFICE_SHORT: Record<string, string> = {
  larissa: 'Λάρισα',
  katerini: 'Κατερίνη',
};

function DeltaBadge({ delta, hasAcc }: { delta: number; hasAcc: boolean }) {
  if (!hasAcc) {
    return <span className="text-[10px] text-[#8A94A0]">Μόνο CRM</span>;
  }
  if (delta === 0) {
    return <span className="text-[10px] text-[#8A94A0] bg-[#F7F6F3] px-1.5 py-0.5 rounded">= 0</span>;
  }
  const isPositive = delta > 0;
  return (
    <span
      className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
        isPositive
          ? 'text-[#1D7A4E] bg-[#1D7A4E]/10'
          : 'text-[#DC3545] bg-[#DC3545]/10'
      }`}
    >
      {isPositive ? '+' : ''}{delta}
    </span>
  );
}

export function KpiCards({ kpis }: Props) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-3">
      {kpis.map((kpi) => {
        const hasAcc = kpi.key !== 'published';
        return (
          <div
            key={kpi.key}
            className="bg-white rounded-lg border border-[#DDD8D0] p-4 relative overflow-hidden"
          >
            <div
              className="absolute top-0 left-0 right-0 h-1"
              style={{ backgroundColor: kpi.color }}
            />
            <div className="text-xs font-medium text-[#8A94A0] mb-2 mt-1">
              {kpi.label}
            </div>
            <div className="text-2xl font-bold text-[#0C1E3C]">
              {kpi.crm.toLocaleString('el-GR')}
              {kpi.sale != null && kpi.rent != null && (
                <span className="text-xs font-normal text-[#8A94A0] ml-2">
                  <span className="text-[#1B5299]">Πωλήσεις {kpi.sale}</span>
                  {' / '}
                  <span className="text-[#D4722A]">Ενοικιάσεις {kpi.rent}</span>
                </span>
              )}
            </div>
            {/* Per-office breakdown */}
            <div className="flex items-center gap-2 text-xs text-[#8A94A0] mb-1">
              {kpi.byOffice.map((o) => (
                <span key={o.office}>
                  {OFFICE_SHORT[o.office] || o.office}: <span className="font-semibold text-[#0C1E3C]">{o.crm.toLocaleString('el-GR')}</span>
                </span>
              ))}
            </div>
            {hasAcc && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-[#8A94A0]">
                  Accountability Report: {kpi.acc.toLocaleString('el-GR')}
                </span>
                <DeltaBadge delta={kpi.delta} hasAcc={hasAcc} />
              </div>
            )}
            {!hasAcc && (
              <DeltaBadge delta={0} hasAcc={false} />
            )}
          </div>
        );
      })}
    </div>
  );
}
