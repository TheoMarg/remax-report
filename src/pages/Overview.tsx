import { useMemo } from 'react';
import { motion } from 'framer-motion';
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
import { AnimatedSection } from '../components/animations/AnimatedSection';
import { ExportPdfButton } from '../components/export/ExportPdfButton';

interface Props {
  period: Period;
}

export function Overview({ period }: Props) {
  const { data: metrics, isLoading, error } = useMetrics(period);
  const { data: trendRaw, isLoading: trendLoading } = useTrend(period);

  const kpis = useMemo(() => (metrics ? computeKpis(metrics) : []), [metrics]);
  const topAgentLarissa = useMemo(() => (metrics ? computeTopAgent(metrics, 'larissa') : null), [metrics]);
  const topAgentKaterini = useMemo(() => (metrics ? computeTopAgent(metrics, 'katerini') : null), [metrics]);
  const topTeam = useMemo(() => (metrics ? computeTopTeam(metrics) : null), [metrics]);
  const offices = useMemo(() => (metrics ? computeOfficeComparison(metrics) : []), [metrics]);
  const funnel = useMemo(() => (metrics ? computeFunnel(metrics) : []), [metrics]);
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
      {/* Hero header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="hero-gradient rounded-2xl p-6 sm:p-8 text-white relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />
        <div className="relative z-10 flex flex-wrap items-start justify-between gap-4">
          <div>
            <span className="inline-block text-[10px] font-bold uppercase tracking-widest text-white/60 bg-white/10 px-2.5 py-1 rounded-full mb-3">
              ΣΥΝΟΨΗ
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold">{period.label}</h2>
            <p className="text-white/60 text-sm mt-1">{totalAgents} συνεργατες</p>
          </div>
          <ExportPdfButton elementId="page-overview" filename={`synopsi-${period.label}.pdf`} />
        </div>
      </motion.div>

      <AnimatedSection delay={0.1}>
        <TopPerformers topAgentLarissa={topAgentLarissa} topAgentKaterini={topAgentKaterini} topTeam={topTeam} />
      </AnimatedSection>

      <AnimatedSection delay={0.2}>
        <KpiCards kpis={kpis} />
      </AnimatedSection>

      <AnimatedSection delay={0.3}>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <SalesFunnel steps={funnel} />
          <OfficeComparison offices={offices} />
        </div>
      </AnimatedSection>

      <AnimatedSection delay={0.4}>
        <TrendChart data={trendData} isLoading={trendLoading} />
      </AnimatedSection>
    </div>
  );
}
