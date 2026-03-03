import type { FunnelStep } from '../../lib/metrics';

interface Props {
  steps: FunnelStep[];
}

export function SalesFunnel({ steps }: Props) {
  const maxValue = Math.max(...steps.map(s => s.value), 1);

  return (
    <div className="bg-white rounded-lg border border-[#DDD8D0] p-5">
      <h3 className="text-sm font-semibold text-[#0C1E3C] mb-4">Funnel Πωλήσεων</h3>
      <div className="space-y-2.5">
        {steps.map((step, i) => {
          const widthPct = Math.max((step.value / maxValue) * 100, 8);
          return (
            <div key={step.label} className="flex items-center gap-3">
              {/* Label */}
              <div className="w-[130px] shrink-0 text-right">
                <span className="text-xs font-medium text-[#0C1E3C]">{step.label}</span>
              </div>
              {/* Bar */}
              <div className="flex-1 relative">
                <div className="h-8 bg-[#F7F6F3] rounded overflow-hidden">
                  <div
                    className="h-full rounded flex items-center transition-all duration-500"
                    style={{
                      width: `${widthPct}%`,
                      backgroundColor: step.color,
                    }}
                  >
                    <span className="text-xs font-bold text-white pl-2.5 whitespace-nowrap">
                      {step.value.toLocaleString('el-GR')}
                    </span>
                  </div>
                </div>
              </div>
              {/* Conversion rate */}
              <div className="w-[50px] shrink-0">
                {step.rate !== null && (
                  <span className="text-[10px] font-semibold text-[#8A94A0]">
                    {step.rate}%
                  </span>
                )}
              </div>
              {/* Arrow connector */}
              {i < steps.length - 1 && (
                <div className="absolute -bottom-2 left-[160px] text-[#DDD8D0] text-xs hidden">
                  ↓
                </div>
              )}
            </div>
          );
        })}
      </div>
      <div className="mt-3 text-[10px] text-[#8A94A0]">
        Ποσοστά: μετατροπή από προηγούμενο στάδιο. Τιμές &gt;100% σημαίνουν ότι μετρώνται και ακίνητα προηγούμενων περιόδων.
      </div>
    </div>
  );
}
