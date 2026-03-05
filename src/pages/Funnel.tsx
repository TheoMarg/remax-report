import { useMemo } from 'react';
import { motion } from 'framer-motion';
import type { Period } from '../lib/types';
import { useFunnel } from '../hooks/useFunnel';
import { computeFunnelByType } from '../lib/metrics';
import { FunnelTable } from '../components/funnel/FunnelTable';
import { FunnelBarChart } from '../components/funnel/FunnelBarChart';
import { FunnelNarrative } from '../components/funnel/FunnelNarrative';
import { AnimatedSection } from '../components/animations/AnimatedSection';
import { ExportPdfButton } from '../components/export/ExportPdfButton';

interface Props {
  period: Period;
}

export function Funnel({ period }: Props) {
  const { data: raw, isLoading, error } = useFunnel(period);
  const rows = useMemo(() => (raw ? computeFunnelByType(raw) : []), [raw]);

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

  return (
    <div id="page-funnel" className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-[1600px] mx-auto">
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
              FUNNEL
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold">{period.label}</h2>
            <p className="text-white/60 text-sm mt-1">{rows.length} υποκατηγοριες ακινητων</p>
          </div>
          <ExportPdfButton elementId="page-funnel" filename={`funnel-${period.label}.pdf`} />
        </div>
      </motion.div>

      <AnimatedSection delay={0.15}>
        <FunnelTable rows={rows} />
      </AnimatedSection>

      <AnimatedSection delay={0.25}>
        <FunnelBarChart rows={rows} />
      </AnimatedSection>

      <AnimatedSection delay={0.35}>
        <FunnelNarrative rows={rows} />
      </AnimatedSection>
    </div>
  );
}
