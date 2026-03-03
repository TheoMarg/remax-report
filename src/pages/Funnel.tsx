import { useMemo } from 'react';
import type { Period } from '../lib/types';
import { useFunnel } from '../hooks/useFunnel';
import { computeFunnelByType } from '../lib/metrics';
import { FunnelTable } from '../components/funnel/FunnelTable';
import { FunnelBarChart } from '../components/funnel/FunnelBarChart';
import { FunnelNarrative } from '../components/funnel/FunnelNarrative';

interface Props {
  period: Period;
}

export function Funnel({ period }: Props) {
  const { data: raw, isLoading, error } = useFunnel(period);

  const rows = useMemo(
    () => (raw ? computeFunnelByType(raw) : []),
    [raw],
  );

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 border-2 border-[#1B5299] border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-[#8A94A0]">Φόρτωση δεδομένων...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-[#DC3545]/10 border border-[#DC3545]/20 rounded-lg p-4">
          <span className="text-sm text-[#DC3545]">
            Σφάλμα φόρτωσης: {error instanceof Error ? error.message : JSON.stringify(error)}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-5">
      <h2 className="text-xl font-bold text-[#0C1E3C]">
        Funnel ανά Τύπο Ακινήτου — {period.label}
      </h2>

      <FunnelTable rows={rows} />
      <FunnelBarChart rows={rows} />
      <FunnelNarrative rows={rows} />
    </div>
  );
}
