import type { FunnelStep } from '../../lib/metrics';

interface Props {
  steps: FunnelStep[];
}

export function SalesFunnel({ steps }: Props) {
  const maxValue = Math.max(...steps.map(s => s.value), 1);

  return (
    <div className="card-premium p-5">
      <h3 className="text-sm font-semibold text-text-primary mb-4">Funnel Πωλήσεων</h3>
      <div className="space-y-2.5">
        {steps.map((step) => {
          const widthPct = Math.max((step.value / maxValue) * 100, 8);
          return (
            <div key={step.label} className="flex items-center gap-3">
              <div className="w-[130px] shrink-0 text-right">
                <span className="text-xs font-medium text-text-primary">{step.label}</span>
              </div>
              <div className="flex-1 relative">
                <div className="h-8 bg-surface rounded-lg overflow-hidden">
                  <div
                    className="h-full rounded-lg flex items-center transition-all duration-500"
                    style={{ width: `${widthPct}%`, backgroundColor: step.color }}
                  >
                    <span className="text-xs font-bold text-white pl-2.5 whitespace-nowrap">
                      {step.value.toLocaleString('el-GR')}
                    </span>
                  </div>
                </div>
              </div>
              <div className="w-[50px] shrink-0">
                {step.rate !== null && (
                  <span className="text-[10px] font-semibold text-text-muted">{step.rate}%</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-3 text-[10px] text-text-muted">
        Ποσοστά: μετατροπή από προηγούμενο στάδιο. Τιμές &gt;100% σημαίνουν ότι μετρώνται και ακίνητα προηγούμενων περιόδων.
      </div>
    </div>
  );
}
