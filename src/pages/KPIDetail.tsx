import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import type { Period } from '../lib/types';
import { useMetrics } from '../hooks/useMetrics';
import { useTeams, useTeamMembers } from '../hooks/useAgents';
import { KPI_DEFS } from '../lib/metrics';
import { KpiSelector } from '../components/kpis/KpiSelector';
import { MetricSection } from '../components/kpis/MetricSection';
import { AnimatedSection } from '../components/animations/AnimatedSection';
import { ExportPdfButton } from '../components/export/ExportPdfButton';

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

  const totalAgents = metrics.filter(m => !m.is_team).length;

  return (
    <div id="page-kpis" className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-[1600px] mx-auto">
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
                📊 ΑΝΑΛΥΤΙΚΑ KPIs
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight">
              KPI Detail (Αναλυτικοί Δείκτες)
            </h2>
            <p className="text-lg sm:text-xl font-light text-white/80 mt-1">
              {period.label}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <ExportPdfButton elementId="page-kpis" filename={`KPIs_${period.label}.pdf`} />
            <div className="bg-white/10 backdrop-blur-sm rounded-xl px-5 py-3 border border-white/10">
              <div className="text-3xl font-bold stat-number">{totalAgents}</div>
              <div className="text-[11px] text-white/60 font-medium uppercase tracking-wider">ΣΥΝΕΡΓΑΤΕΣ</div>
            </div>
          </div>
        </div>
      </motion.div>

      <AnimatedSection delay={0.15}>
        <KpiSelector kpis={KPI_DEFS} activeKey={activeKpi} onChange={setActiveKpi} />
      </AnimatedSection>

      <AnimatedSection delay={0.25}>
        <MetricSection
          def={activeDef}
          metrics={metrics}
          teams={teams ?? []}
          teamMembers={teamMembers ?? []}
          period={period}
        />
      </AnimatedSection>
    </div>
  );
}
