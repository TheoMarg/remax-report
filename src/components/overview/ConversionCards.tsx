import type { ConversionRates } from '../../hooks/useConversionRates';

function fmtPct(n: number | null): string {
  if (n == null) return '—';
  return `${n}%`;
}

function fmtRatio(n: number | null): string {
  if (n == null) return '—';
  return `${n}:1`;
}

interface Props {
  total: ConversionRates;
  byOffice: Record<string, ConversionRates>;
}

const OFFICE_LABELS: Record<string, string> = { larissa: 'Λάρισα', katerini: 'Κατερίνη' };

const RATIOS: { label: string; pctKey: keyof ConversionRates; ratioKey: keyof ConversionRates }[] = [
  { label: 'Reg → Excl', pctKey: 'reg_to_excl_pct', ratioKey: 'reg_to_excl' },
  { label: 'Excl → Close', pctKey: 'excl_to_closing_pct', ratioKey: 'excl_to_closing' },
  { label: 'Show → Offer', pctKey: 'showing_to_offer_pct', ratioKey: 'showing_to_offer' },
  { label: 'Offer → Close', pctKey: 'offer_to_closing_pct', ratioKey: 'offer_to_closing' },
];

export function ConversionCards({ total, byOffice }: Props) {
  const offices = Object.entries(byOffice).sort(([a], [b]) => a.localeCompare(b));

  return (
    <div className="bg-surface-card rounded-xl border border-border-default p-5">
      <h3 className="text-sm font-semibold text-text-primary mb-3">
        Conversion Rates (Property-based)
      </h3>
      <div className="grid grid-cols-4 gap-3">
        {RATIOS.map(r => {
          const pct = total[r.pctKey] as number | null;
          const ratio = total[r.ratioKey] as number | null;
          return (
            <div key={r.label} className="bg-surface rounded-lg p-3 border border-border-subtle">
              <div className="text-[9px] font-semibold uppercase tracking-wider text-text-muted mb-1">{r.label}</div>
              <div className="text-lg font-bold text-brand-blue">{fmtPct(pct)}</div>
              <div className="text-[10px] text-text-muted">{fmtRatio(ratio)}</div>
              {offices.length > 0 && (
                <div className="mt-2 pt-2 border-t border-border-subtle space-y-0.5">
                  {offices.map(([key, conv]) => (
                    <div key={key} className="flex items-center justify-between text-[10px]">
                      <span className="text-text-muted">{OFFICE_LABELS[key] || key}</span>
                      <span className="font-semibold tabular-nums">{fmtPct(conv[r.pctKey] as number | null)}</span>
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
