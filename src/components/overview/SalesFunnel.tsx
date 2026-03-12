import type { FunnelStep } from '../../lib/metrics';

interface Props {
  steps: FunnelStep[];
}

export function SalesFunnel({ steps }: Props) {
  const maxValue = Math.max(...steps.map(s => s.value), 1);

  return (
    <div className="card-premium p-5">
      <div className="flex items-center gap-2 mb-5">
        <div className="w-7 h-7 rounded-lg bg-brand-blue/10 flex items-center justify-center text-sm">🔻</div>
        <h3 className="text-sm font-bold text-text-primary">Funnel Πωλήσεων</h3>
      </div>
      <div className="space-y-3">
        {steps.map((step) => {
          const widthPct = Math.max((step.value / maxValue) * 100, 10);
          return (
            <div key={step.label} className="flex items-center gap-3">
              <div className="w-[120px] shrink-0 text-right">
                <span className="text-[11px] font-medium text-text-secondary">{step.label}</span>
              </div>
              <div className="flex-1 relative">
                <div className="h-9 bg-surface rounded-lg overflow-hidden">
                  <div
                    className="h-full rounded-lg flex items-center transition-all duration-700 ease-out"
                    style={{
                      width: `${widthPct}%`,
                      background: `linear-gradient(90deg, ${step.color}, ${step.color}CC)`,
                    }}
                  >
                    <span className="text-xs font-bold text-white pl-3 whitespace-nowrap drop-shadow-sm">
                      {step.value.toLocaleString('el-GR')}
                    </span>
                  </div>
                </div>
              </div>
              <div className="w-[50px] shrink-0 text-right">
                {step.rate !== null && (
                  <span className="text-[11px] font-bold text-text-muted tabular-nums">
                    {step.rate}%
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-4 pt-3 border-t border-border-subtle text-[10px] text-text-muted leading-relaxed">
        Ποσοστά: μετατροπή από προηγούμενο στάδιο. Τιμές &gt;100% σημαίνουν ότι μετρώνται και ακίνητα προηγούμενων περιόδων.
      </div>
    </div>
  );
}
