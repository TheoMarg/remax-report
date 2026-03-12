import type { Period } from '../lib/types';

interface Props {
  period: Period;
}

export function AgentProfile({ period }: Props) {
  return (
    <div className="max-w-[1600px] mx-auto px-6 py-6 space-y-6">
      <h2 className="text-xl font-semibold text-text-primary">
        Agent Profile (Προφίλ Συνεργάτη)
      </h2>
      <div className="card-premium p-8 text-center">
        <p className="text-text-muted">Period: {period.label}</p>
        <p className="text-sm text-text-muted mt-2">
          Full agent drill-down: WPS, PQS, conversions, quality, business plan, mandates, stuck alerts, activity. Built in Cycle J.
        </p>
      </div>
    </div>
  );
}
