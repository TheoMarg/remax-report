import type { ConversionRates } from '../../hooks/useConversionRates';

function fmtRatio(n: number | null): string {
  if (n == null) return '—';
  return `${n.toLocaleString('el-GR', { minimumFractionDigits: 1, maximumFractionDigits: 2 })}:1`;
}

interface Props {
  total: ConversionRates;
  byOffice: Record<string, ConversionRates>;
}

const OFFICE_LABELS: Record<string, string> = { larissa: 'Λάρισα', katerini: 'Κατερίνη' };

const RATIOS: { label: string; ratioKey: keyof ConversionRates; totalKey: keyof ConversionRates; passedKey: keyof ConversionRates }[] = [
  { label: 'Καταγραφή → Ανάθεση', ratioKey: 'reg_to_excl', totalKey: 'reg_count', passedKey: 'excl_count' },
  { label: 'Ανάθεση → Κλείσιμο', ratioKey: 'excl_to_closing', totalKey: 'excl_count', passedKey: 'closing_count' },
  { label: 'Υπόδειξη → Προσφορά', ratioKey: 'showing_to_offer', totalKey: 'showing_count', passedKey: 'offer_count' },
  { label: 'Προσφορά → Κλείσιμο', ratioKey: 'offer_to_closing', totalKey: 'offer_count', passedKey: 'closing_count' },
];

export function ConversionCards({ total, byOffice }: Props) {
  const offices = Object.entries(byOffice).sort(([a], [b]) => a.localeCompare(b));

  return (
    <div className="bg-surface-card rounded-xl border border-border-default p-5">
      <h3 className="text-sm font-semibold text-text-primary mb-3">
        Αναλογίες Μετατροπής (Property-based)
      </h3>
      <div className="grid grid-cols-4 gap-3">
        {RATIOS.map(r => {
          const ratio = total[r.ratioKey] as number | null;
          const totalCount = total[r.totalKey] as number;
          const passedCount = total[r.passedKey] as number;
          return (
            <div key={r.label} className="bg-surface rounded-lg p-3 border border-border-subtle">
              <div className="text-[9px] font-semibold tracking-wider text-text-muted mb-1">{r.label}</div>
              <div className="text-lg font-bold text-brand-blue">{fmtRatio(ratio)}</div>
              <div className="text-[10px] text-text-muted">{totalCount} → {passedCount}</div>
              {offices.length > 0 && (
                <div className="mt-2 pt-2 border-t border-border-subtle space-y-0.5">
                  {offices.map(([key, conv]) => (
                    <div key={key} className="flex items-center justify-between text-[10px]">
                      <span className="text-text-muted">{OFFICE_LABELS[key] || key}</span>
                      <span className="font-semibold tabular-nums">{fmtRatio(conv[r.ratioKey] as number | null)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
