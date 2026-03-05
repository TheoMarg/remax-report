import type { OfficeSummary } from '../../lib/metrics';

const OFFICE_DISPLAY: Record<string, string> = {
  larissa: 'Λάρισα',
  katerini: 'Κατερίνη',
};

interface Props {
  offices: OfficeSummary[];
}

export function GciOfficeTable({ offices }: Props) {
  const sorted = [...offices].sort((a, b) => {
    if (a.office === 'larissa') return -1;
    if (b.office === 'larissa') return 1;
    return a.office.localeCompare(b.office);
  });

  return (
    <div className="card-premium p-5">
      <h3 className="text-sm font-semibold text-text-primary mb-3">GCI ανά Γραφείο</h3>
      <table className="w-full text-xs">
        <thead>
          <tr className="text-[10px] font-semibold uppercase tracking-wider text-text-muted border-b border-border-default">
            <th className="text-left py-2 pr-3">Γραφείο</th>
            <th className="text-right py-2 pr-3">Συνεργάτες</th>
            <th className="text-right py-2 pr-3">GCI</th>
            <th className="text-right py-2 pr-3">Κλεισίματα</th>
            <th className="text-right py-2 pr-3">Conv%</th>
            <th className="text-right py-2">M.O./Agent</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((o, i) => {
            const convPct = o.registrations > 0
              ? Math.round((o.closings / o.registrations) * 1000) / 10
              : null;
            const moPerAgent = o.agents > 0 ? Math.round(o.gci / o.agents) : 0;

            return (
              <tr key={i} className="border-b border-border-subtle last:border-0">
                <td className="py-2.5 pr-3 font-medium text-text-primary">
                  {OFFICE_DISPLAY[o.office] || o.office}
                </td>
                <td className="py-2.5 pr-3 text-right text-text-secondary">{o.agents}</td>
                <td className="py-2.5 pr-3 text-right font-bold text-text-primary">
                  €{o.gci.toLocaleString('el-GR')}
                </td>
                <td className="py-2.5 pr-3 text-right text-text-secondary">
                  {o.closings.toLocaleString('el-GR')}
                </td>
                <td className="py-2.5 pr-3 text-right text-text-secondary">
                  {convPct !== null ? `${convPct}%` : '—'}
                </td>
                <td className="py-2.5 text-right font-medium text-text-primary">
                  €{moPerAgent.toLocaleString('el-GR')}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
