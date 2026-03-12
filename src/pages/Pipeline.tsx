import { useState } from 'react';
import type { Period } from '../lib/types';
import type { StageName } from '../hooks/useStageFlow';

const STAGE_TABS: { key: StageName; label: string }[] = [
  { key: 'registration', label: 'Activation (Καταγραφές)' },
  { key: 'exclusive', label: 'Exclusive (Αποκλειστικές)' },
  { key: 'showing', label: 'Showing (Υποδείξεις)' },
  { key: 'offer', label: 'Offer (Προσφορές)' },
  { key: 'closing', label: 'Closing (Κλεισίματα)' },
];

interface Props {
  period: Period;
}

export function Pipeline({ period }: Props) {
  const [activeStage, setActiveStage] = useState<StageName>('registration');

  return (
    <div className="max-w-[1600px] mx-auto px-6 py-6 space-y-6">
      <h2 className="text-xl font-semibold text-text-primary">
        Pipeline (Ροή Ακινήτων)
      </h2>

      {/* Stage tabs */}
      <div className="flex gap-1 bg-surface-light rounded-lg p-1">
        {STAGE_TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveStage(tab.key)}
            className={`flex-1 px-3 py-2 text-sm font-medium rounded-md transition-all ${
              activeStage === tab.key
                ? 'bg-surface-card text-brand-blue shadow-sm'
                : 'text-text-muted hover:text-text-primary'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Placeholder content */}
      <div className="card-premium p-8 text-center">
        <p className="text-text-muted">
          Stage: <span className="font-semibold text-text-primary">{activeStage}</span>
          {' | '}Period: {period.label}
        </p>
        <p className="text-sm text-text-muted mt-2">
          Flow visualization, unique KPIs, charts, and 4-level comparison will be built in Cycle C.
        </p>
      </div>
    </div>
  );
}
