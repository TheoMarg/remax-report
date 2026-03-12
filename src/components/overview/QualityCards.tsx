import type { QualityMetrics } from '../../hooks/useQualityMetrics';

const OFFICE_LABELS: Record<string, string> = { larissa: 'Λάρισα', katerini: 'Κατερίνη' };

interface Props {
  total: QualityMetrics;
  byOffice: Record<string, QualityMetrics>;
}

const METRICS: { label: string; key: keyof QualityMetrics; suffix: string; color: string }[] = [
  { label: 'Excl → Offer', key: 'avg_days_excl_to_offer', suffix: 'd', color: '#168F80' },
  { label: 'Offer → Close', key: 'avg_days_offer_to_closing', suffix: 'd', color: '#6B5CA5' },
  { label: 'Total Journey', key: 'avg_days_total_journey', suffix: 'd', color: '#1B5299' },
  { label: 'Price Delta %', key: 'avg_price_delta_pct', suffix: '%', color: '#D4722A' },
];

export function QualityCards({ total, byOffice }: Props) {
  const offices = Object.entries(byOffice).sort(([a], [b]) => a.localeCompare(b));

  return (
    <div className="bg-surface-card rounded-xl border border-border-default p-5">
      <h3 className="text-sm font-semibold text-text-primary mb-3">
        Quality Metrics (Property Journey)
      </h3>
      <div className="grid grid-cols-4 gap-3">
        {METRICS.map(m => {
          const val = total[m.key] as number | null;
          return (
            <div key={m.label} className="bg-surface rounded-lg p-3 border border-border-subtle">
              <div className="text-[9px] font-semibold uppercase tracking-wider text-text-muted mb-1">{m.label}</div>
              <div className="text-lg font-bold" style={{ color: m.color }}>
                {val != null ? `${val}${m.suffix}` : '—'}
              </div>
              {offices.length > 0 && (
                <div className="mt-2 pt-2 border-t border-border-subtle space-y-0.5">
                  {offices.map(([key, qm]) => {
                    const officeVal = qm[m.key] as number | null;
                    return (
                      <div key={key} className="flex items-center justify-between text-[10px]">
                        <span className="text-text-muted">{OFFICE_LABELS[key] || key}</span>
                        <span className="font-semibold tabular-nums">
                          {officeVal != null ? `${officeVal}${m.suffix}` : '—'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
