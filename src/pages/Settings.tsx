import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import type { Period } from '../lib/types';
import { useKpiWeights } from '../hooks/useKpiWeights';
import { usePqsWeights } from '../hooks/usePqsWeights';
import { useSubcategoryWeights } from '../hooks/useSubcategoryWeights';
import { useMetrics } from '../hooks/useMetrics';
import { useAgents } from '../hooks/useAgents';
import { usePortfolioQuality } from '../hooks/usePortfolioQuality';
import { usePricingData } from '../hooks/usePricingData';
import { useWeightedScores } from '../hooks/useWeightedScores';
import { usePortfolioScores } from '../hooks/usePortfolioScores';
import { computeOfficeDirectedPQS } from '../lib/marketability';
import { AnimatedSection } from '../components/animations/AnimatedSection';
import { ScoreBar } from '../components/shared/ScoreBar';
import type { PropertyPricing } from '../lib/types';

const WPS_LABELS: Record<string, string> = {
  registrations: 'Καταγραφές',
  exclusives: 'Αποκλειστικές',
  showings: 'Υποδείξεις',
  offers: 'Προσφορές',
  closings: 'Κλεισίματα',
};

const PQS_LABELS: Record<string, string> = {
  freshness: 'Freshness (DOM)',
  exclusive_ratio: 'Exclusive Ratio',
  activity_level: 'Activity Level',
  pricing_accuracy: 'Pricing Accuracy',
  pipeline_depth: 'Pipeline Depth',
  demand_score: 'Demand Score',
};

interface Props {
  period: Period;
}

export function Settings({ period }: Props) {
  const { data: kpiWeights = [], updateWeights: updateKpi, isUpdating: kpiUpdating } = useKpiWeights();
  const { data: pqsWeights = [], updateWeights: updatePqs, isUpdating: pqsUpdating } = usePqsWeights();
  const { data: subcatWeights = [], updateWeights: updateSubcat, isUpdating: subcatUpdating } = useSubcategoryWeights();
  const { data: allMetrics = [] } = useMetrics(period);
  const { data: agents = [] } = useAgents();
  const { data: qualityData = [] } = usePortfolioQuality();
  const { data: activePricingRaw = [] } = usePricingData('active');
  const activePricing = activePricingRaw as PropertyPricing[];

  const [kpiDraft, setKpiDraft] = useState<Record<string, number>>({});
  const [pqsDraft, setPqsDraft] = useState<Record<string, number>>({});
  const [subcatDraft, setSubcatDraft] = useState<Record<string, { weight: number; notes: string }>>({});
  const [saved, setSaved] = useState<'kpi' | 'pqs' | 'subcat' | null>(null);

  // Initialize drafts from DB
  useEffect(() => {
    if (kpiWeights.length > 0 && Object.keys(kpiDraft).length === 0) {
      const draft: Record<string, number> = {};
      for (const w of kpiWeights) draft[w.metric_key] = w.weight;
      setKpiDraft(draft);
    }
  }, [kpiWeights]);

  useEffect(() => {
    if (pqsWeights.length > 0 && Object.keys(pqsDraft).length === 0) {
      const draft: Record<string, number> = {};
      for (const w of pqsWeights) draft[w.metric_key] = w.weight;
      setPqsDraft(draft);
    }
  }, [pqsWeights]);

  useEffect(() => {
    if (subcatWeights.length > 0 && Object.keys(subcatDraft).length === 0) {
      const draft: Record<string, { weight: number; notes: string }> = {};
      for (const w of subcatWeights) {
        draft[w.subcategory] = { weight: w.weight, notes: w.notes ?? '' };
      }
      setSubcatDraft(draft);
    }
  }, [subcatWeights]);

  // Preview rankings with draft weights
  const startDates = useMemo(() => {
    const map: Record<number, string | null> = {};
    for (const a of agents) map[a.agent_id] = a.start_date;
    return map;
  }, [agents]);

  const previewKpiWeights = useMemo(
    () => Object.entries(kpiDraft).map(([metric_key, weight]) => ({ id: 0, metric_key, weight, updated_by: null, updated_at: '' })),
    [kpiDraft],
  );
  const previewPqsWeights = useMemo(
    () => Object.entries(pqsDraft).map(([metric_key, weight]) => ({ id: 0, metric_key, weight, updated_by: null, updated_at: '' })),
    [pqsDraft],
  );

  const previewWps = useWeightedScores(allMetrics, previewKpiWeights, startDates);
  const previewPqs = usePortfolioScores(qualityData, previewPqsWeights);

  const hasKpiChanges = useMemo(() => {
    return kpiWeights.some(w => kpiDraft[w.metric_key] !== w.weight);
  }, [kpiWeights, kpiDraft]);

  const hasPqsChanges = useMemo(() => {
    return pqsWeights.some(w => pqsDraft[w.metric_key] !== w.weight);
  }, [pqsWeights, pqsDraft]);

  async function handleSaveKpi() {
    const updates = Object.entries(kpiDraft).map(([metric_key, weight]) => ({ metric_key, weight }));
    await updateKpi(updates);
    setSaved('kpi');
    setTimeout(() => setSaved(null), 2000);
  }

  async function handleSavePqs() {
    const updates = Object.entries(pqsDraft).map(([metric_key, weight]) => ({ metric_key, weight }));
    await updatePqs(updates);
    setSaved('pqs');
    setTimeout(() => setSaved(null), 2000);
  }

  const hasSubcatChanges = useMemo(() => {
    return subcatWeights.some(w => {
      const d = subcatDraft[w.subcategory];
      return d && (d.weight !== w.weight || d.notes !== (w.notes ?? ''));
    });
  }, [subcatWeights, subcatDraft]);

  // Live preview: Top 5 agents by Office-Directed PQS using draft weights
  const previewOfficeDirected = useMemo(() => {
    const entries = Object.entries(subcatDraft);
    if (entries.length === 0 || activePricing.length === 0) return [];
    const draftWeights = entries.map(([subcategory, d]) => ({
      id: 0, subcategory, transaction_type: null as string | null, weight: d.weight, notes: d.notes || null, updated_by: null, updated_at: '',
    }));
    const basePqsMap = new Map(previewPqs.map(p => [p.agent_id, p.pqs]));
    return computeOfficeDirectedPQS(activePricing, draftWeights, basePqsMap);
  }, [subcatDraft, activePricing, previewPqs]);

  async function handleSaveSubcat() {
    const updates = Object.entries(subcatDraft).map(([subcategory, d]) => ({
      subcategory,
      transaction_type: null,
      weight: d.weight,
      notes: d.notes || null,
    }));
    await updateSubcat(updates);
    setSaved('subcat');
    setTimeout(() => setSaved(null), 2000);
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-[1600px] mx-auto">
      {/* Hero */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="hero-gradient rounded-2xl p-6 sm:p-8 text-white relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="relative z-10">
          <span className="inline-block text-[10px] font-bold uppercase tracking-widest text-white/60 bg-white/10 px-2.5 py-1 rounded-full mb-3">
            Settings
          </span>
          <h2 className="text-2xl sm:text-3xl font-bold">Ρυθμίσεις Scoring</h2>
          <p className="text-white/60 text-sm mt-1">Βάρη WPS & PQS — μόνο για Operations Manager</p>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ═══ WPS Weights ═══ */}
        <AnimatedSection delay={0.1}>
          <div className="card-premium p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-text-primary">WPS Weights (Performance)</h3>
              <button
                onClick={handleSaveKpi}
                disabled={!hasKpiChanges || kpiUpdating}
                className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  hasKpiChanges
                    ? 'bg-brand-blue text-white hover:bg-brand-blue/90'
                    : 'bg-surface-light text-text-muted cursor-not-allowed'
                }`}
              >
                {kpiUpdating ? 'Saving...' : saved === 'kpi' ? 'Saved!' : 'Save'}
              </button>
            </div>

            <div className="space-y-4">
              {Object.entries(WPS_LABELS).map(([key, label]) => (
                <div key={key}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-text-primary font-medium">{label}</span>
                    <span className="text-sm font-bold text-brand-blue tabular-nums">
                      {(kpiDraft[key] ?? 1).toFixed(1)}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="5"
                    step="0.5"
                    value={kpiDraft[key] ?? 1}
                    onChange={e => setKpiDraft(prev => ({ ...prev, [key]: parseFloat(e.target.value) }))}
                    className="w-full h-2 bg-surface-light rounded-full appearance-none cursor-pointer accent-brand-blue"
                  />
                  <div className="flex justify-between text-[9px] text-text-muted mt-0.5">
                    <span>0</span>
                    <span>5</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Preview rankings */}
            <div className="mt-5 pt-4 border-t border-border-subtle">
              <h4 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">Preview — Top 5 WPS</h4>
              <div className="space-y-2">
                {previewWps.slice(0, 5).map((w, i) => (
                  <ScoreBar
                    key={w.agent_id}
                    label={w.canonical_name || `Agent #${w.agent_id}`}
                    score={w.wps}
                    maxScore={previewWps[0]?.wps || 100}
                    rank={i + 1}
                    color="#1B5299"
                  />
                ))}
              </div>
            </div>
          </div>
        </AnimatedSection>

        {/* ═══ PQS Weights ═══ */}
        <AnimatedSection delay={0.15}>
          <div className="card-premium p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-text-primary">PQS Weights (Portfolio Quality)</h3>
              <button
                onClick={handleSavePqs}
                disabled={!hasPqsChanges || pqsUpdating}
                className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  hasPqsChanges
                    ? 'bg-brand-teal text-white hover:bg-brand-teal/90'
                    : 'bg-surface-light text-text-muted cursor-not-allowed'
                }`}
              >
                {pqsUpdating ? 'Saving...' : saved === 'pqs' ? 'Saved!' : 'Save'}
              </button>
            </div>

            <div className="space-y-4">
              {Object.entries(PQS_LABELS).map(([key, label]) => (
                <div key={key}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-text-primary font-medium">{label}</span>
                    <span className="text-sm font-bold text-brand-teal tabular-nums">
                      {(pqsDraft[key] ?? 1).toFixed(1)}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="5"
                    step="0.5"
                    value={pqsDraft[key] ?? 1}
                    onChange={e => setPqsDraft(prev => ({ ...prev, [key]: parseFloat(e.target.value) }))}
                    className="w-full h-2 bg-surface-light rounded-full appearance-none cursor-pointer accent-brand-teal"
                  />
                  <div className="flex justify-between text-[9px] text-text-muted mt-0.5">
                    <span>0</span>
                    <span>5</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Preview rankings */}
            <div className="mt-5 pt-4 border-t border-border-subtle">
              <h4 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">Preview — Top 5 PQS</h4>
              <div className="space-y-2">
                {previewPqs.slice(0, 5).map((p, i) => (
                  <ScoreBar
                    key={p.agent_id}
                    label={p.canonical_name || `Agent #${p.agent_id}`}
                    score={p.pqs}
                    maxScore={previewPqs[0]?.pqs || 100}
                    rank={i + 1}
                    color="#168F80"
                  />
                ))}
              </div>
            </div>
          </div>
        </AnimatedSection>
      </div>

      {/* ═══ Subcategory Weights ═══ */}
      {subcatWeights.length > 0 && (
        <AnimatedSection delay={0.2}>
          <div className="card-premium p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-semibold text-text-primary">
                  Subcategory Weights (Κατεύθυνση Χαρτοφυλακίου — Office-Directed PQS)
                </h3>
                <p className="text-xs text-text-muted mt-1">
                  Αυξήστε τα weights σε κατηγορίες που θέλετε να ενθαρρύνετε. Οι agents με ακίνητα σε αυτές τις κατηγορίες θα ανεβαίνουν στο ranking.
                </p>
              </div>
              <button
                onClick={handleSaveSubcat}
                disabled={!hasSubcatChanges || subcatUpdating}
                className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  hasSubcatChanges
                    ? 'bg-brand-gold text-white hover:bg-brand-gold/90'
                    : 'bg-surface-light text-text-muted cursor-not-allowed'
                }`}
              >
                {subcatUpdating ? 'Saving...' : saved === 'subcat' ? 'Saved!' : 'Save'}
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-surface-light text-text-muted text-[10px] uppercase tracking-wider">
                    <th className="text-left px-3 py-2">Subcategory</th>
                    <th className="text-center px-3 py-2">Weight</th>
                    <th className="text-left px-3 py-2">Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(subcatDraft).map(([subcat, d]) => (
                    <tr key={subcat} className="border-t border-border-subtle">
                      <td className="px-3 py-2 font-medium text-text-primary">{subcat}</td>
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-2 justify-center">
                          <input
                            type="range"
                            min="0"
                            max="5"
                            step="0.5"
                            value={d.weight}
                            onChange={e => setSubcatDraft(prev => ({
                              ...prev,
                              [subcat]: { ...prev[subcat], weight: parseFloat(e.target.value) },
                            }))}
                            className="w-24 accent-brand-gold"
                          />
                          <span className="text-xs font-bold text-brand-gold tabular-nums w-8 text-right">
                            {d.weight.toFixed(1)}
                          </span>
                        </div>
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="text"
                          value={d.notes}
                          onChange={e => setSubcatDraft(prev => ({
                            ...prev,
                            [subcat]: { ...prev[subcat], notes: e.target.value },
                          }))}
                          placeholder="—"
                          className="text-xs w-full bg-transparent border-b border-border-subtle focus:border-brand-gold outline-none py-0.5 text-text-primary"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Live preview: Top 5 Office-Directed PQS */}
            {previewOfficeDirected.length > 0 && (
              <div className="mt-5 pt-4 border-t border-border-subtle">
                <h4 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">Preview — Top 5 Office-Directed PQS</h4>
                <div className="space-y-2">
                  {previewOfficeDirected.slice(0, 5).map((p, i) => (
                    <ScoreBar
                      key={p.agent_id}
                      label={p.canonical_name || `Agent #${p.agent_id}`}
                      score={p.score}
                      maxScore={previewOfficeDirected[0]?.score || 100}
                      rank={i + 1}
                      color="#C9961A"
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        </AnimatedSection>
      )}
    </div>
  );
}
