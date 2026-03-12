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

  const totalReg = rows.reduce((s, r) => s + r.registrations, 0);

  return (
    <div id="page-funnel" className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-[1600px] mx-auto">
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
                🔻 FUNNEL ΑΝΑΛΥΣΗ
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight">
              Funnel ανα Τυπο Ακινητου
            </h2>
            <p className="text-lg sm:text-xl font-light text-white/80 mt-1">
              {period.label}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <ExportPdfButton elementId="page-funnel" filename={`Funnel_${period.label}.pdf`} />
            <div className="bg-white/10 backdrop-blur-sm rounded-xl px-5 py-3 border border-white/10">
              <div className="text-3xl font-bold stat-number">{totalReg.toLocaleString('el-GR')}</div>
              <div className="text-[11px] text-white/60 font-medium uppercase tracking-wider">ΚΑΤΑΓΡΑΦΕΣ</div>
            </div>
          </div>
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
