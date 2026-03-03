import { useMemo } from 'react';
import type { Period } from '../lib/types';
import { useMetrics } from '../hooks/useMetrics';
import { useTrend } from '../hooks/useTrend';
import {
  computeKpis,
  computeTopAgent,
  computeTopTeam,
  computeOfficeComparison,
  computeFunnel,
  aggregateByMonth,
} from '../lib/metrics';
import { TopPerformers } from '../components/overview/TopPerformers';
import { KpiCards } from '../components/overview/KpiCards';
import { SalesFunnel } from '../components/overview/SalesFunnel';
import { TrendChart } from '../components/overview/TrendChart';
import { OfficeComparison } from '../components/overview/OfficeComparison';

interface Props {
  period: Period;
}

export function Overview({ period }: Props) {
  const { data: metrics, isLoading, error } = useMetrics(period);
  const { data: trendRaw, isLoading: trendLoading } = useTrend(period);

  // ── Compute derived data ──
  const kpis = useMemo(
    () => (metrics ? computeKpis(metrics) : []),
    [metrics]
  );

  const topAgentLarissa = useMemo(
    () => (metrics ? computeTopAgent(metrics, 'larissa') : null),
    [metrics]
  );

  const topAgentKaterini = useMemo(
    () => (metrics ? computeTopAgent(metrics, 'katerini') : null),
    [metrics]
  );

  const topTeam = useMemo(
    () => (metrics ? computeTopTeam(metrics) : null),
    [metrics]
  );

  const offices = useMemo(
    () => (metrics ? computeOfficeComparison(metrics) : []),
    [metrics]
  );

  const funnel = useMemo(
    () => (metrics ? computeFunnel(metrics) : []),
    [metrics]
  );

  const trendData = useMemo(
    () => (trendRaw ? aggregateByMonth(trendRaw) : []),
    [trendRaw]
  );

  // ── Loading / Error states ──
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

  const totalAgents = metrics?.filter(m => !m.is_team).length ?? 0;

  return (
    <div className="p-6 space-y-5">
      {/* Title */}
      <div className="flex items-baseline justify-between">
        <h2 className="text-xl font-bold text-[#0C1E3C]">
          Σύνοψη — {period.label}
        </h2>
        <span className="text-xs text-[#8A94A0]">
          {totalAgents} συνεργάτες
        </span>
      </div>

      {/* Section 1: Top Performers */}
      <TopPerformers topAgentLarissa={topAgentLarissa} topAgentKaterini={topAgentKaterini} topTeam={topTeam} />

      {/* Section 2: KPI Cards */}
      <KpiCards kpis={kpis} />

      {/* Section 3 & 4: Funnel + Office (side by side on large screens) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <SalesFunnel steps={funnel} />
        <OfficeComparison offices={offices} />
      </div>

      {/* Section 5: Trend Chart */}
      <TrendChart data={trendData} isLoading={trendLoading} />
    </div>
  );
}
