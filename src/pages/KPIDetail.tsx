import { useState, useMemo } from 'react';
import type { Period } from '../lib/types';
import { useMetrics } from '../hooks/useMetrics';
import { useTeams, useTeamMembers } from '../hooks/useAgents';
import {
  KPI_DEFS,
  computeFourClub,
} from '../lib/metrics';
import { KpiSelector } from '../components/kpis/KpiSelector';
import { MetricSection } from '../components/kpis/MetricSection';
import { FourClubSection } from '../components/kpis/FourClubSection';

interface Props {
  period: Period;
}

export function KPIDetail({ period }: Props) {
  const { data: metrics, isLoading, error } = useMetrics(period);
  const { data: teams } = useTeams();
  const { data: teamMembers } = useTeamMembers();
  const [activeKpi, setActiveKpi] = useState(KPI_DEFS[0].key);

  const activeDef = useMemo(
    () => KPI_DEFS.find(d => d.key === activeKpi) || KPI_DEFS[0],
    [activeKpi],
  );

  const fourClub = useMemo(
    () => (metrics ? computeFourClub(metrics) : []),
    [metrics],
  );

  // Loading
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

  // Error
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

  if (!metrics) return null;

  return (
    <div className="p-6 space-y-5">
      {/* Title */}
      <h2 className="text-xl font-bold text-[#0C1E3C]">
        KPIs Αναλυτικά — {period.label}
      </h2>

      {/* KPI Selector */}
      <KpiSelector kpis={KPI_DEFS} activeKey={activeKpi} onChange={setActiveKpi} />

      {/* Active Metric Section */}
      <MetricSection
        def={activeDef}
        metrics={metrics}
        teams={teams ?? []}
        teamMembers={teamMembers ?? []}
      />

      {/* 4 Club — only for exclusives */}
      {activeKpi === 'exclusives' && <FourClubSection agents={fourClub} />}
    </div>
  );
}
