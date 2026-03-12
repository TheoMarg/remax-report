import type { StageFlowResult, StageName } from '../../hooks/useStageFlow';

const STAGE_LABELS: Record<StageName, string> = {
  registration: 'Καταγραφές',
  exclusive: 'Αποκλειστικές',
  published: 'Δημοσιευμένα',
  showing: 'Υποδείξεις',
  offer: 'Προσφορές',
  closing: 'Κλεισίματα',
};

const STAGE_COLORS: Record<StageName, string> = {
  registration: '#1B5299',
  exclusive: '#168F80',
  published: '#3498DB',
  showing: '#6B5CA5',
  offer: '#C9961A',
  closing: '#D4722A',
};

interface Props {
  flows: StageFlowResult[];
  activeStage: StageName;
  onStageClick: (stage: StageName) => void;
}

export function PipelineFlowHeader({ flows, activeStage, onStageClick }: Props) {
  return (
    <div className="flex items-stretch gap-0 overflow-x-auto">
      {flows.map((flow, i) => {
        const isActive = flow.stage === activeStage;
        const color = STAGE_COLORS[flow.stage];
        const nextFlow = i < flows.length - 1 ? flows[i + 1] : null;

        return (
          <div key={flow.stage} className="flex items-stretch flex-1 min-w-0">
            {/* Stage card */}
            <button
              onClick={() => onStageClick(flow.stage)}
              className={`flex-1 min-w-[120px] rounded-lg p-3 border-2 transition-all text-left ${
                isActive
                  ? 'bg-surface-card shadow-md'
                  : 'bg-surface hover:bg-surface-card border-transparent'
              }`}
              style={{ borderColor: isActive ? color : undefined }}
            >
              <div className="text-[10px] font-semibold uppercase tracking-wider text-text-muted mb-1">
                {STAGE_LABELS[flow.stage]}
              </div>
              <div className="text-xl font-bold" style={{ color }}>
                {flow.inflow}
              </div>
              <div className="flex items-center gap-2 mt-1 text-[10px] text-text-muted">
                {flow.stage !== 'closing' && (
                  <>
                    <span className="text-brand-green font-medium">→{flow.outflow}</span>
                    <span className="text-brand-red">✕{flow.dropout}</span>
                  </>
                )}
                {flow.stage === 'closing' && (
                  <span className="text-brand-green font-semibold">GCI</span>
                )}
              </div>
            </button>

            {/* Arrow connector */}
            {nextFlow && (
              <div className="flex flex-col items-center justify-center w-10 shrink-0">
                <div className="text-[9px] font-bold text-text-muted mb-0.5">
                  {flow.conversion_pct != null ? `${flow.conversion_pct}%` : '—'}
                </div>
                <svg width="24" height="12" viewBox="0 0 24 12" className="text-border-default">
                  <path d="M0 6h18m0 0l-4-4m4 4l-4 4" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
