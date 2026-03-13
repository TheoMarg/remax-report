interface ComparisonRow {
  label: string;
  entity: number | string | null;
  team?: number | string | null;
  office: number | string | null;
  company: number | string | null;
}

interface Props {
  title?: string;
  rows: ComparisonRow[];
  entityLabel?: string;
  showTeam?: boolean;
  formatValue?: (val: number | string | null) => string;
  invertColor?: boolean;  // true = lower is better (for ratios)
}

function defaultFormat(val: number | string | null): string {
  if (val === null || val === undefined) return '—';
  if (typeof val === 'number') return val.toLocaleString('el-GR');
  return val;
}

function cellColor(entity: number | string | null, company: number | string | null): string {
  if (entity === null || company === null) return '';
  const e = typeof entity === 'number' ? entity : parseFloat(entity);
  const c = typeof company === 'number' ? company : parseFloat(company);
  if (isNaN(e) || isNaN(c)) return '';
  if (e > c) return 'bg-green-50 text-green-700';
  if (e < c) return 'bg-red-50 text-red-700';
  return '';
}

export function ComparisonTable({
  title,
  rows,
  entityLabel = 'Entity',
  showTeam = true,
  formatValue = defaultFormat,
  invertColor = false,
}: Props) {
  return (
    <div className="card-premium overflow-hidden">
      {title && (
        <div className="px-4 py-3 border-b border-border-subtle">
          <h4 className="text-sm font-semibold text-text-primary">{title}</h4>
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-surface-light text-text-muted text-xs tracking-wider">
              <th className="text-left px-4 py-2.5">Metric</th>
              <th className="text-right px-4 py-2.5 text-brand-blue">{entityLabel}</th>
              {showTeam && <th className="text-right px-4 py-2.5 text-brand-purple">Team</th>}
              <th className="text-right px-4 py-2.5 text-brand-gold">Office</th>
              <th className="text-right px-4 py-2.5 text-text-secondary">Company</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} className="border-t border-border-subtle">
                <td className="px-4 py-2.5 text-text-primary font-medium">{row.label}</td>
                <td className={`px-4 py-2.5 text-right font-semibold ${invertColor ? cellColor(row.company, row.entity) : cellColor(row.entity, row.company)}`}>
                  {formatValue(row.entity)}
                </td>
                {showTeam && (
                  <td className="px-4 py-2.5 text-right">{formatValue(row.team ?? null)}</td>
                )}
                <td className="px-4 py-2.5 text-right">{formatValue(row.office)}</td>
                <td className="px-4 py-2.5 text-right text-text-secondary">{formatValue(row.company)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
