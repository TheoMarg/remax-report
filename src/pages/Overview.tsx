import { useMemo } from 'react';
import { motion } from 'framer-motion';
import type { Period } from '../lib/types';
import { useMetrics } from '../hooks/useMetrics';
import { useTrend } from '../hooks/useTrend';
import { usePropertyJourneys } from '../hooks/usePropertyJourneys';
import { useConversionRates } from '../hooks/useConversionRates';
import { useQualityMetrics } from '../hooks/useQualityMetrics';
import {
  computeKpis,
  computeTopAgent,
  computeTopTeam,
  computeOfficeComparison,
  aggregateByMonth,
  KPI_DEFS,
  individualsOnly,
} from '../lib/metrics';
import { TopPerformers } from '../components/overview/TopPerformers';
import { KpiCards } from '../components/overview/KpiCards';
import { ConversionCards } from '../components/overview/ConversionCards';
import { QualityCards } from '../components/overview/QualityCards';
import { SalesFunnel } from '../components/overview/SalesFunnel';
import { TrendChart } from '../components/overview/TrendChart';
import { OfficeComparison } from '../components/overview/OfficeComparison';
import { AnimatedSection } from '../components/animations/AnimatedSection';
import { ExportPdfButton } from '../components/export/ExportPdfButton';
import { DrilldownDrawer } from '../components/shared/DrilldownDrawer';
import { useDrilldown } from '../hooks/useDrilldown';
import { useAgentTargets } from '../hooks/useAgentTargets';
import { usePacing } from '../hooks/usePacing';

interface Props {
  period: Period;
}

export function Overview({ period }: Props) {
  const { drilldown, openDrilldown, closeDrilldown } = useDrilldown();
  const { data: metrics, isLoading, error } = useMetrics(period);
  const { data: trendRaw, isLoading: trendLoading } = useTrend(period);
  const { data: journeys = [] } = usePropertyJourneys(period);

  // Pacing
  const currentYear = new Date().getFullYear();
  const { data: targets } = useAgentTargets(currentYear);
  const pacingData = usePacing(metrics, targets);
  const onTrackPct = useMemo(() => {
    if (pacingData.length === 0) return null;
    const onTrack = pacingData.filter(a =>
      a.metrics.some(m => m.status === 'ahead' || m.status === 'on_track')
    ).length;
    return Math.round((onTrack / pacingData.length) * 100);
  }, [pacingData]);

  // v2: conversion rates & quality metrics (total + by office)
  const { total: convTotal, segments: convByOffice } = useConversionRates(journeys, 'office');
  const { total: qualityTotal, segments: qualityByOffice } = useQualityMetrics(journeys, 'office');

  const kpis = useMemo(() => (metrics ? computeKpis(metrics) : []), [metrics]);

  // Per-KPI agent-level values for percentile tooltips
  const agentValues = useMemo(() => {
    if (!metrics) return {};
    const individuals = individualsOnly(metrics);
    const result: Record<string, number[]> = {};
    for (const def of KPI_DEFS) {
      const values: number[] = [];
      const agentMap = new Map<number, number>();
      for (const m of individuals) {
        agentMap.set(m.agent_id, (agentMap.get(m.agent_id) || 0) + (Number(m[def.crmField]) || 0));
      }
      for (const v of agentMap.values()) values.push(v);
      result[def.key] = values;
    }
    return result;
  }, [metrics]);
  const topAgentLarissa = useMemo(() => (metrics ? computeTopAgent(metrics, 'larissa') : null), [metrics]);
  const topAgentKaterini = useMemo(() => (metrics ? computeTopAgent(metrics, 'katerini') : null), [metrics]);
  const topTeam = useMemo(() => (metrics ? computeTopTeam(metrics) : null), [metrics]);
  const offices = useMemo(() => (metrics ? computeOfficeComparison(metrics) : []), [metrics]);
  const funnel = useMemo(() => {
    if (journeys.length === 0) return [];
    const reg = journeys.filter(j => j.has_registration).length;
    const excl = journeys.filter(j => j.has_exclusive).length;
    const pub = journeys.filter(j => j.has_published).length;
    const show = journeys.filter(j => j.has_showing).length;
    const offer = journeys.filter(j => j.has_offer).length;
    const close = journeys.filter(j => j.has_closing).length;
    const steps = [
      { label: 'Registrations (Καταγραφές)', value: reg },
      { label: 'Exclusives (Αποκλειστικές)', value: excl },
      { label: 'Published (Δημοσιευμένα)', value: pub },
      { label: 'Showings (Υποδείξεις)', value: show },
      { label: 'Offers (Προσφορές)', value: offer },
      { label: 'Closings (Κλεισίματα)', value: close },
    ];
    const COLORS = ['#1B5299', '#168F80', '#1D7A4E', '#6B5CA5', '#C9961A', '#D4722A'];
    return steps.map((s, i) => ({
      ...s,
      rate: i === 0 ? null : steps[i - 1].value > 0 ? Math.round((s.value / steps[i - 1].value) * 100) : null,
      color: COLORS[i],
    }));
  }, [journeys]);
  const trendData = useMemo(() => (trendRaw ? aggregateByMonth(trendRaw) : []), [trendRaw]);

  if (isLoading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-brand-blue border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-text-muted">Φορτωση δεδομενων...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <div className="bg-brand-red/5 border border-brand-red/20 rounded-xl p-5">
          <span className="text-sm text-brand-red">Σφαλμα φορτωσης: {error instanceof Error ? error.message : JSON.stringify(error)}</span>
        </div>
      </div>
    );
  }

  const totalAgents = metrics?.filter(m => !m.is_team).length ?? 0;

  return (
    <div id="page-overview" className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-[1600px] mx-auto">
      {/* Hero Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
        className="hero-gradient rounded-2xl p-6 sm:p-8 text-white relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/3 translate-x-1/3" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/4" />

        <div className="relative z-10 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider bg-white/15 text-white/80 backdrop-blur-sm">
                📊 ΑΝΑΦΟΡΑ BROKER
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight">
              Overview (Σύνοψη)
            </h2>
            <p className="text-lg sm:text-xl font-light text-white/80 mt-1">
              {period.label}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <ExportPdfButton elementId="page-overview" filename={`Συνοψη_${period.label}.pdf`} />
            {onTrackPct !== null && (
              <div className="bg-white/10 backdrop-blur-sm rounded-xl px-5 py-3 border border-white/10">
                <div className="text-3xl font-bold stat-number">{onTrackPct}%</div>
                <div className="text-[11px] text-white/60 font-medium uppercase tracking-wider">ON PACE</div>
              </div>
            )}
            <div className="bg-white/10 backdrop-blur-sm rounded-xl px-5 py-3 border border-white/10">
              <div className="text-3xl font-bold stat-number">{totalAgents}</div>
              <div className="text-[11px] text-white/60 font-medium uppercase tracking-wider">ΣΥΝΕΡΓΑΤΕΣ</div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Top Performers */}
      <AnimatedSection delay={0.15}>
        <TopPerformers topAgentLarissa={topAgentLarissa} topAgentKaterini={topAgentKaterini} topTeam={topTeam} />
      </AnimatedSection>

      {/* KPI Cards */}
      <AnimatedSection delay={0.25}>
        <KpiCards
          kpis={kpis}
          agentValues={agentValues}
          onDrilldown={(metric, title, count) => openDrilldown({ metric, period, title, count })}
        />
      </AnimatedSection>

      {/* v2: Conversion Rates */}
      {journeys.length > 0 && (
        <AnimatedSection delay={0.3}>
          <ConversionCards total={convTotal} byOffice={convByOffice} />
        </AnimatedSection>
      )}

      {/* v2: Quality Metrics */}
      {journeys.length > 0 && (
        <AnimatedSection delay={0.35}>
          <QualityCards total={qualityTotal} byOffice={qualityByOffice} />
        </AnimatedSection>
      )}

      {/* Funnel + Office Comparison */}
      <AnimatedSection delay={0.4}>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <SalesFunnel steps={funnel} />
          <OfficeComparison offices={offices} />
        </div>
      </AnimatedSection>

      {/* Trend Chart */}
      <AnimatedSection delay={0.5}>
        <TrendChart data={trendData} isLoading={trendLoading} />
      </AnimatedSection>

      {/* Drilldown Drawer */}
      {drilldown && (
        <DrilldownDrawer
          metric={drilldown.metric}
          period={drilldown.period}
          agentId={drilldown.agentId}
          title={drilldown.title}
          count={drilldown.count}
          onClose={closeDrilldown}
        />
      )}
    </div>
  );
}
