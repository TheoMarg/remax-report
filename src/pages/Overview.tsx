import type { Period } from '../lib/types';
import { useMetrics } from '../hooks/useMetrics';

interface Props {
  period: Period;
}

export function Overview({ period }: Props) {
  const { data: metrics, isLoading, error } = useMetrics(period);

  if (isLoading) {
    return <div className="p-6 text-[#8A94A0]">Loading metrics...</div>;
  }

  if (error) {
    return <div className="p-6 text-[#DC3545]">Error loading data: {String(error)}</div>;
  }

  const totalRows = metrics?.length ?? 0;

  return (
    <div className="p-6">
      <h2 className="text-xl font-bold text-[#0C1E3C] mb-4">
        Overview &mdash; {period.label}
      </h2>
      <div className="bg-white rounded-lg border border-[#DDD8D0] p-6">
        <p className="text-[#8A94A0]">
          {totalRows} agent/month records loaded from Supabase.
        </p>
        <p className="text-[#8A94A0] mt-2">
          Cycle 1 will build the full Executive Summary here.
        </p>
      </div>
    </div>
  );
}
