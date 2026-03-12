import type { Period } from '../lib/types';

interface Props {
  period: Period;
}

export function Accountability({ period }: Props) {
  return (
    <div className="max-w-[1600px] mx-auto px-6 py-6 space-y-6">
      <h2 className="text-xl font-semibold text-text-primary">
        Accountability (Αναφορές Συνεργατών)
      </h2>

      {/* Source banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 text-sm text-blue-800">
        Data source: Weekly agent self-reports (GrowthCFO). CRM data is the source of truth for verified metrics.
      </div>

      <div className="card-premium p-8 text-center">
        <p className="text-text-muted">Period: {period.label}</p>
        <p className="text-sm text-text-muted mt-2">
          10 sections: Activity KPIs, Declared Results, Conversion Tables, CRM vs ACC, Accuracy, Sanity Checks, Gauges, Percentiles, Effort Mix, Benchmarks. Built in Cycle H.
        </p>
      </div>
    </div>
  );
}
