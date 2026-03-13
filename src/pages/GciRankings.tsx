import { useMemo } from 'react';
import { motion } from 'framer-motion';
import type { Period } from '../lib/types';
import { useMetrics } from '../hooks/useMetrics';
import { computeGciRankings, computeOfficeComparison } from '../lib/metrics';
import { GciChart } from '../components/gci/GciChart';
import { GciRankTable } from '../components/gci/GciRankTable';
import { GciOfficeTable } from '../components/gci/GciOfficeTable';
import { AnimatedSection } from '../components/animations/AnimatedSection';
import { ExportPdfButton } from '../components/export/ExportPdfButton';

interface Props {
  period: Period;
}

export function GciRankings({ period }: Props) {
  const { data: metrics, isLoading, error } = useMetrics(period);
  const rankings = useMemo(() => (metrics ? computeGciRankings(metrics) : []), [metrics]);
  const companyAvg = useMemo(() => {
    if (rankings.length === 0) return 0;
    return Math.round(rankings.reduce((s, r) => s + r.gci, 0) / rankings.length);
  }, [rankings]);
  const offices = useMemo(() => (metrics ? computeOfficeComparison(metrics) : []), [metrics]);

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

  if (!metrics) return null;

  return (
    <div id="page-gci" className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-[1600px] mx-auto">
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
              GCI Rankings
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold">GCI Rankings (Κατάταξη Τζίρου)</h2>
            <p className="text-white/60 text-sm mt-1">{rankings.length} συνεργατες</p>
          </div>
          <ExportPdfButton elementId="page-gci" filename={`gci-${period.label}.pdf`} />
        </div>
      </motion.div>

      <AnimatedSection delay={0.15}>
        <GciChart rankings={rankings} companyAvg={companyAvg} />
      </AnimatedSection>

      <AnimatedSection delay={0.25}>
        <GciRankTable rankings={rankings} companyAvg={companyAvg} />
      </AnimatedSection>

      <AnimatedSection delay={0.35}>
        <GciOfficeTable offices={offices} />
      </AnimatedSection>
    </div>
  );
}
