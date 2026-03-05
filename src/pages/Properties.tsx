import { useMemo } from 'react';
import { motion } from 'framer-motion';
import type { Period } from '../lib/types';
import { useClosings } from '../hooks/useClosings';
import { useAgents } from '../hooks/useAgents';
import { assemblePropertyCards, computeStageSummary } from '../lib/propertyMetrics';
import { StageSummary } from '../components/properties/StageSummary';
import { PropertyCard } from '../components/properties/PropertyCard';
import { AnimatedSection } from '../components/animations/AnimatedSection';
import { ExportPdfButton } from '../components/export/ExportPdfButton';

interface Props {
  period: Period;
}

export function Properties({ period }: Props) {
  const { data, isLoading, error } = useClosings(period);
  const { data: agents } = useAgents();

  const cards = useMemo(
    () => data && agents ? assemblePropertyCards(data.closings, data.events, data.showings, agents) : [],
    [data, agents],
  );

  const stageSummary = useMemo(() => computeStageSummary(cards), [cards]);

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
    <div id="page-properties" className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-[1600px] mx-auto">
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
              ΑΚΙΝΗΤΑ
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold">{period.label}</h2>
            <p className="text-white/60 text-sm mt-1">{cards.length.toLocaleString('el-GR')} κλεισμενα ακινητα</p>
          </div>
          <ExportPdfButton elementId="page-properties" filename={`akinita-${period.label}.pdf`} />
        </div>
      </motion.div>

      <AnimatedSection delay={0.15}>
        <StageSummary stages={stageSummary} />
      </AnimatedSection>

      <AnimatedSection delay={0.25}>
        {cards.length === 0 ? (
          <div className="card-premium p-12 flex flex-col items-center justify-center text-center">
            <p className="text-sm font-semibold text-text-primary mb-1">Δεν βρεθηκαν κλεισιματα</p>
            <p className="text-xs text-text-muted">Δεν υπαρχουν κλεισμενα ακινητα για την περιοδο {period.label}.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {(() => {
              const siblingIds = cards.map(c => c.closing.property_id).filter(Boolean) as string[];
              return cards.map(card => (
                <PropertyCard key={card.closing.id} card={card} siblingPropertyIds={siblingIds} />
              ));
            })()}
          </div>
        )}
      </AnimatedSection>
    </div>
  );
}
