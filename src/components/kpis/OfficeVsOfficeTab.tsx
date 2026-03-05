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
          <div key={o.office} className="bg-surface rounded-xl p-4 space-y-3">
            <div className="text-sm font-bold text-text-primary">{label}</div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="text-xs text-text-muted">CRM Σύνολο</div>
                <div className="text-xl font-bold text-text-primary">{o.crm.toLocaleString('el-GR')}</div>
              </div>
              {hasAcc && (
                <div>
                  <div className="text-xs text-text-muted">Accountability Report</div>
                  <div className="text-xl font-bold text-text-primary">{o.acc.toLocaleString('el-GR')}</div>
                </div>
              )}
            </div>
            <div className="flex items-center gap-4 text-xs text-text-muted">
              <span>{o.agents} agents</span>
              <span>Μ.Ο. ανά συνεργάτη/μήνα: <span className="font-semibold text-text-primary">{o.moPerAgent.toLocaleString('el-GR')}</span></span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
