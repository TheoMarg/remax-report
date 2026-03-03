import type { OfficeKpiComparison } from '../../lib/metrics';

const OFFICE_SHORT: Record<string, string> = {
  larissa: 'Λάρισα',
  katerini: 'Κατερίνη',
};

interface Props {
  offices: OfficeKpiComparison[];
  hasAcc: boolean;
}

export function OfficeVsOfficeTab({ offices, hasAcc }: Props) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {offices.map((o) => {
        const label = OFFICE_SHORT[o.office] || o.office;
        return (
          <div
            key={o.office}
            className="bg-[#F7F6F3] rounded-lg p-4 space-y-3"
          >
            <div className="text-sm font-bold text-[#0C1E3C]">{label}</div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="text-xs text-[#8A94A0]">CRM Σύνολο</div>
                <div className="text-xl font-bold text-[#0C1E3C]">{o.crm.toLocaleString('el-GR')}</div>
              </div>
              {hasAcc && (
                <div>
                  <div className="text-xs text-[#8A94A0]">ACC Σύνολο</div>
                  <div className="text-xl font-bold text-[#0C1E3C]">{o.acc.toLocaleString('el-GR')}</div>
                </div>
              )}
            </div>

            <div className="flex items-center gap-4 text-xs text-[#8A94A0]">
              <span>{o.agents} agents</span>
              <span>M.O./agent: <span className="font-semibold text-[#0C1E3C]">{o.moPerAgent.toLocaleString('el-GR')}</span></span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
