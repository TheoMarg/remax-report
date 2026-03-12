import type { Period } from '../lib/types';

interface Props {
  period: Period;
}

export function Insights({ period }: Props) {
  return (
    <div className="max-w-[1600px] mx-auto px-6 py-6 space-y-6">
      <h2 className="text-xl font-semibold text-text-primary">
        Insights (Ανάλυση & Ευρήματα)
      </h2>
      <div className="card-premium p-8 text-center">
        <p className="text-text-muted">Period: {period.label}</p>
        <p className="text-sm text-text-muted mt-2">
          Pricing intel summary, seasonality, pipeline value, aging alerts, cooperation analysis, stuck alerts. Built in Cycle K.
        </p>
      </div>
    </div>
  );
}
