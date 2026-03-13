import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import type { Period } from '../lib/types';
import { usePropertyJourneys } from '../hooks/usePropertyJourneys';
import { usePipelineValue } from '../hooks/usePipelineValue';
import { useStuckAlerts } from '../hooks/useStuckAlerts';
import { useActiveExclusives } from '../hooks/useActiveExclusives';
import { useTrend } from '../hooks/useTrend';
import { AnimatedSection } from '../components/animations/AnimatedSection';
import { ExportPdfButton } from '../components/export/ExportPdfButton';
import { PropertyLink } from '../components/ui/PropertyLink';
import { AgentLink } from '../components/ui/AgentLink';
import { formatDateEL } from '../lib/propertyMetrics';
import { aggregateByMonth } from '../lib/metrics';


function fmtEur(n: number | null | undefined): string {
  if (n == null) return '—';
  return `€${n.toLocaleString('el-GR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function fmt(n: number | null | undefined): string {
  if (n == null) return '—';
  return n.toLocaleString('el-GR');
}

interface Props {
  period: Period;
}

export function Insights({ period }: Props) {
  const { data: journeys = [], isLoading: journeysLoading } = usePropertyJourneys(period);
  const { data: pipeline = [], isLoading: pipelineLoading } = usePipelineValue();
  const { data: stuckAlerts = [], isLoading: stuckLoading } = useStuckAlerts();
  const { data: exclusives = [] } = useActiveExclusives();
  const { data: trendMetrics = [] } = useTrend(period);
  const [insightTab, setInsightTab] = useState<'pricing' | 'seasonality' | 'pipeline' | 'aging' | 'cooperation' | 'stuck'>('pricing');

  const isLoading = journeysLoading || pipelineLoading || stuckLoading;

  // ═══ PRICING INTELLIGENCE ═══
  const pricingInsights = useMemo(() => {
    const withReductions = journeys.filter(j => j.price_reduction_count > 0);
    const threeOrMore = journeys.filter(j => j.price_reduction_count >= 3);
    const withDelta = journeys.filter(j => j.price_delta_pct != null && j.has_closing);
    const avgDelta = withDelta.length > 0
      ? Math.round(withDelta.reduce((s, j) => s + (j.price_delta_pct ?? 0), 0) / withDelta.length * 10) / 10
      : null;

    // Overpriced: properties with 2+ reductions and no showing
    const overpriced = journeys.filter(j => j.price_reduction_count >= 2 && !j.has_showing && !j.has_closing);

    // Time to first reduction (avg days from registration to first price change)
    // We can approximate: properties with reductions that have registration date
    const avgReductions = withReductions.length > 0
      ? Math.round(withReductions.reduce((s, j) => s + j.price_reduction_count, 0) / withReductions.length * 10) / 10
      : 0;

    return { withReductions: withReductions.length, threeOrMore: threeOrMore.length, avgDelta, overpriced: overpriced.length, avgReductions };
  }, [journeys]);

  // ═══ SEASONALITY ═══
  const seasonalityData = useMemo(() => {
    const monthTrend = aggregateByMonth(trendMetrics);
    return monthTrend;
  }, [trendMetrics]);

  // ═══ PIPELINE VALUE ═══
  const pipelineSummary = useMemo(() => {
    const totalProperties = pipeline.reduce((s, p) => s + p.active_properties, 0);
    const totalListingValue = pipeline.reduce((s, p) => s + p.total_listing_value, 0);
    const exclusiveValue = pipeline.reduce((s, p) => s + (p.exclusive_value || 0), 0);
    const withShowings = pipeline.reduce((s, p) => s + p.with_showings, 0);
    const withOffers = pipeline.reduce((s, p) => s + p.with_offers, 0);
    const offerPipelineValue = pipeline.reduce((s, p) => s + (p.offer_pipeline_value || 0), 0);

    // Per-agent breakdown (top 10)
    const topAgents = [...pipeline]
      .sort((a, b) => b.total_listing_value - a.total_listing_value)
      .slice(0, 10);

    return { totalProperties, totalListingValue, exclusiveValue, withShowings, withOffers, offerPipelineValue, topAgents };
  }, [pipeline]);

  // ═══ AGING & AT-RISK ═══
  const agingAlerts = useMemo(() => {
    const now = new Date();
    const in30d = new Date(Date.now() + 30 * 86400000);

    // Stale listings: >90 days, no showing
    const stale = journeys.filter(j => !j.has_closing && !j.has_showing && j.days_on_market != null && j.days_on_market > 90);

    // Expiring exclusives
    const expiring = exclusives.filter(e => {
      if (!e.end_date) return false;
      const end = new Date(e.end_date);
      return end >= now && end <= in30d;
    });

    // 3+ price reductions (active)
    const multiReduction = journeys.filter(j => !j.has_closing && j.price_reduction_count >= 3);

    // Dormant: has exclusive but no showing in period
    const dormant = journeys.filter(j => !j.has_closing && j.has_exclusive && !j.has_showing && j.days_on_market != null && j.days_on_market > 60);

    return { stale, expiring, multiReduction, dormant };
  }, [journeys, exclusives]);

  // ═══ COOPERATION ═══
  const cooperationInsights = useMemo(() => {
    // Inter-agent showings: property agent ≠ showing agent context
    // We can approximate from journeys with showings
    const withShowings = journeys.filter(j => j.has_showing && j.total_showings > 0);
    const totalShowings = withShowings.reduce((s, j) => s + j.total_showings, 0);
    const avgShowingsPerProperty = withShowings.length > 0
      ? Math.round(totalShowings / withShowings.length * 10) / 10
      : 0;

    // Properties with unique_clients > 1
    const multiClient = journeys.filter(j => j.unique_clients > 1);

    return { totalShowings, avgShowingsPerProperty, multiClient: multiClient.length, propertiesWithShowings: withShowings.length };
  }, [journeys]);

  const STAGE_COLORS: Record<string, string> = {
    registered: '#1B5299',
    exclusive: '#168F80',
    published: '#1D7A4E',
    showing: '#6B5CA5',
    offer: '#C9961A',
  };

  if (isLoading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-brand-blue border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-text-muted">Φόρτωση insights...</span>
        </div>
      </div>
    );
  }

  const TABS = [
    { key: 'pricing', label: 'Pricing Intel' },
    { key: 'seasonality', label: 'Εποχικότητα' },
    { key: 'pipeline', label: 'Pipeline €' },
    { key: 'aging', label: 'At-Risk' },
    { key: 'cooperation', label: 'Συνεργασία' },
    { key: 'stuck', label: 'Stuck Alerts' },
  ] as const;

  return (
    <div id="page-insights" className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-[1600px] mx-auto">
      {/* ── Hero ── */}
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
              Insights
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold">{period.label}</h2>
            <p className="text-white/60 text-sm mt-1">Ανάλυση αγοράς, pipeline, κίνδυνοι & ευκαιρίες</p>
          </div>
          <ExportPdfButton elementId="page-insights" filename={`insights-${period.label}.pdf`} />
        </div>
      </motion.div>

      {/* ── Tab navigation ── */}
      <div className="flex gap-1 bg-surface-light rounded-xl p-1 overflow-x-auto">
        {TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setInsightTab(tab.key)}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-all whitespace-nowrap ${
              insightTab === tab.key
                ? 'bg-surface-card text-brand-blue shadow-sm'
                : 'text-text-muted hover:text-text-primary'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ═══════════════════════ */}
      {/* PRICING INTELLIGENCE   */}
      {/* ═══════════════════════ */}
      {insightTab === 'pricing' && (
        <AnimatedSection delay={0.1}>
          <div className="space-y-5">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="card-premium p-4 text-center">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-text-muted mb-1">Μειώσεις Τιμής</div>
                <div className="text-2xl font-bold text-brand-red">{pricingInsights.withReductions}</div>
                <div className="text-xs text-text-muted">ακίνητα με μειώσεις</div>
              </div>
              <div className="card-premium p-4 text-center">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-text-muted mb-1">3+ Μειώσεις</div>
                <div className="text-2xl font-bold text-red-600">{pricingInsights.threeOrMore}</div>
                <div className="text-xs text-text-muted">υπερτιμημένα</div>
              </div>
              <div className="card-premium p-4 text-center">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-text-muted mb-1">Μ.Ο. Μειώσεων</div>
                <div className="text-2xl font-bold text-brand-gold">{pricingInsights.avgReductions}</div>
                <div className="text-xs text-text-muted">ανά ακίνητο</div>
              </div>
              <div className="card-premium p-4 text-center">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-text-muted mb-1">Price Delta</div>
                <div className="text-2xl font-bold text-brand-blue">{pricingInsights.avgDelta != null ? `${pricingInsights.avgDelta}%` : '—'}</div>
                <div className="text-xs text-text-muted">listing vs closing</div>
              </div>
            </div>

            <div className="card-premium p-5">
              <h3 className="text-sm font-semibold text-text-primary mb-3">
                Χωρίς Ζήτηση (2+ μειώσεις, 0 υποδείξεις): {pricingInsights.overpriced}
              </h3>
              <p className="text-xs text-text-muted">
                Ακίνητα που έχουν υποστεί 2+ μειώσεις τιμής αλλά δεν έχουν λάβει καμία υπόδειξη.
                Σημαίνει ότι η τιμή ίσως χρειάζεται περαιτέρω αναπροσαρμογή ή επανεξέταση στρατηγικής.
              </p>
            </div>
          </div>
        </AnimatedSection>
      )}

      {/* ═══════════════════════ */}
      {/* SEASONALITY            */}
      {/* ═══════════════════════ */}
      {insightTab === 'seasonality' && (
        <AnimatedSection delay={0.1}>
          <div className="space-y-5">
            {/* Monthly heatmap-style table */}
            <div className="card-premium p-5">
              <h3 className="text-sm font-semibold text-text-primary mb-4">Μηνιαία Εξέλιξη KPIs</h3>
              {seasonalityData.length > 0 ? (
                <div className="h-[350px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={seasonalityData} margin={{ top: 10, right: 10, left: 0, bottom: 30 }}>
                      <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#8A94A0' }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 10, fill: '#8A94A0' }} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #DDD8D0', fontSize: 12, boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }} />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                      <Bar dataKey="registrations" name="Καταγραφές" fill="#1B5299" radius={[3, 3, 0, 0]} />
                      <Bar dataKey="exclusives" name="Αποκλειστικές" fill="#168F80" radius={[3, 3, 0, 0]} />
                      <Bar dataKey="closings" name="Κλεισίματα" fill="#D4722A" radius={[3, 3, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <p className="text-xs text-text-muted italic text-center py-8">Δεν υπάρχουν αρκετά δεδομένα εποχικότητας</p>
              )}
            </div>

            {/* Best/Worst months */}
            {seasonalityData.length > 0 && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                <div className="card-premium p-5">
                  <h4 className="text-sm font-semibold text-green-700 mb-2">Καλύτεροι Μήνες (Κλεισίματα)</h4>
                  {[...seasonalityData].sort((a, b) => b.closings - a.closings).slice(0, 3).map((m, i) => (
                    <div key={m.month} className="flex items-center justify-between py-1.5 text-sm border-b border-border-subtle">
                      <span className="font-medium">#{i + 1} {m.month}</span>
                      <span className="font-bold text-green-700">{m.closings} κλεισίματα</span>
                    </div>
                  ))}
                </div>
                <div className="card-premium p-5">
                  <h4 className="text-sm font-semibold text-red-700 mb-2">Χειρότεροι Μήνες (Κλεισίματα)</h4>
                  {[...seasonalityData].sort((a, b) => a.closings - b.closings).slice(0, 3).map((m, i) => (
                    <div key={m.month} className="flex items-center justify-between py-1.5 text-sm border-b border-border-subtle">
                      <span className="font-medium">#{i + 1} {m.month}</span>
                      <span className="font-bold text-red-700">{m.closings} κλεισίματα</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </AnimatedSection>
      )}

      {/* ═══════════════════════ */}
      {/* PIPELINE VALUE          */}
      {/* ═══════════════════════ */}
      {insightTab === 'pipeline' && (
        <AnimatedSection delay={0.1}>
          <div className="space-y-5">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              <div className="card-premium p-4 text-center">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-text-muted mb-1">Ενεργά Ακίνητα</div>
                <div className="text-2xl font-bold text-brand-blue">{fmt(pipelineSummary.totalProperties)}</div>
              </div>
              <div className="card-premium p-4 text-center">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-text-muted mb-1">Αξία Portfolio</div>
                <div className="text-xl font-bold text-brand-gold">{fmtEur(pipelineSummary.totalListingValue)}</div>
              </div>
              <div className="card-premium p-4 text-center">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-text-muted mb-1">Αξία Αποκλ.</div>
                <div className="text-xl font-bold text-brand-teal">{fmtEur(pipelineSummary.exclusiveValue)}</div>
              </div>
              <div className="card-premium p-4 text-center">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-text-muted mb-1">Με Υποδείξεις</div>
                <div className="text-2xl font-bold text-brand-purple">{fmt(pipelineSummary.withShowings)}</div>
              </div>
              <div className="card-premium p-4 text-center">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-text-muted mb-1">Με Προσφορές</div>
                <div className="text-2xl font-bold text-brand-gold">{fmt(pipelineSummary.withOffers)}</div>
              </div>
              <div className="card-premium p-4 text-center">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-text-muted mb-1">Offer Pipeline</div>
                <div className="text-xl font-bold text-green-700">{fmtEur(pipelineSummary.offerPipelineValue)}</div>
              </div>
            </div>

            {/* Top 10 agents by pipeline value */}
            <div className="card-premium p-5">
              <h3 className="text-sm font-semibold text-text-primary mb-3">Top 10 Agents — Αξία Portfolio</h3>
              <div className="h-[350px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={pipelineSummary.topAgents.map(a => ({
                      name: a.canonical_name?.split(' ')[0] || `#${a.agent_id}`,
                      listing: a.total_listing_value,
                      exclusive: a.exclusive_value || 0,
                    }))}
                    layout="vertical"
                    margin={{ top: 10, right: 20, left: 80, bottom: 10 }}
                  >
                    <XAxis type="number" tick={{ fontSize: 10, fill: '#8A94A0' }} axisLine={false} tickLine={false} tickFormatter={v => fmtEur(v)} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: '#8A94A0' }} axisLine={false} tickLine={false} width={75} />
                    <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #DDD8D0', fontSize: 12 }} formatter={(v: number | undefined) => fmtEur(v ?? 0)} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Bar dataKey="listing" name="Listing Value" fill="#1B5299" radius={[0, 4, 4, 0]} />
                    <Bar dataKey="exclusive" name="Exclusive Value" fill="#168F80" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </AnimatedSection>
      )}

      {/* ═══════════════════════ */}
      {/* AGING & AT-RISK        */}
      {/* ═══════════════════════ */}
      {insightTab === 'aging' && (
        <AnimatedSection delay={0.1}>
          <div className="space-y-5">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="card-premium p-4 text-center border-l-4 border-l-red-400">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-text-muted mb-1">Stale (&gt;90d, 0 υποδ.)</div>
                <div className="text-2xl font-bold text-red-600">{agingAlerts.stale.length}</div>
              </div>
              <div className="card-premium p-4 text-center border-l-4 border-l-amber-400">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-text-muted mb-1">Λήξη &lt;30d</div>
                <div className="text-2xl font-bold text-amber-600">{agingAlerts.expiring.length}</div>
              </div>
              <div className="card-premium p-4 text-center border-l-4 border-l-orange-400">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-text-muted mb-1">3+ Μειώσεις</div>
                <div className="text-2xl font-bold text-orange-600">{agingAlerts.multiReduction.length}</div>
              </div>
              <div className="card-premium p-4 text-center border-l-4 border-l-gray-400">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-text-muted mb-1">Dormant (&gt;60d)</div>
                <div className="text-2xl font-bold text-gray-600">{agingAlerts.dormant.length}</div>
              </div>
            </div>

            {/* Stale listings detail */}
            {agingAlerts.stale.length > 0 && (
              <div className="card-premium p-5">
                <h3 className="text-sm font-semibold text-red-700 mb-3">Ακίνητα χωρίς ζήτηση (&gt;90 ημέρες, 0 υποδείξεις)</h3>
                <div className="overflow-x-auto max-h-[300px] overflow-y-auto">
                  <table className="w-full text-xs">
                    <thead className="sticky top-0 bg-surface-card">
                      <tr className="text-text-muted border-b border-border-default text-[10px] uppercase tracking-wider">
                        <th className="text-left pb-2 pr-3 font-semibold">Code</th>
                        <th className="text-left pb-2 pr-3 font-semibold">Συνεργάτης</th>
                        <th className="text-left pb-2 pr-3 font-semibold">Τύπος</th>
                        <th className="text-right pb-2 pr-3 font-semibold">DOM</th>
                        <th className="text-right pb-2 font-semibold">Μειώσεις</th>
                      </tr>
                    </thead>
                    <tbody>
                      {agingAlerts.stale
                        .sort((a, b) => (b.days_on_market ?? 0) - (a.days_on_market ?? 0))
                        .slice(0, 20)
                        .map(j => (
                          <tr key={j.property_id} className="border-b border-border-subtle">
                            <td className="py-2 pr-3">
                              <PropertyLink propertyId={j.property_id} code={j.property_code || j.property_id} className="text-xs font-medium" />
                            </td>
                            <td className="py-2 pr-3">
                              <AgentLink agentId={j.agent_id} name={j.canonical_name || `#${j.agent_id}`} className="text-xs" />
                            </td>
                            <td className="py-2 pr-3 text-text-secondary">{j.subcategory || '—'}</td>
                            <td className="py-2 pr-3 text-right font-bold text-red-600">{j.days_on_market}d</td>
                            <td className="py-2 text-right tabular-nums">{j.price_reduction_count}</td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Expiring exclusives */}
            {agingAlerts.expiring.length > 0 && (
              <div className="card-premium p-5">
                <h3 className="text-sm font-semibold text-amber-700 mb-3">Αποκλειστικές που λήγουν σε 30 ημέρες</h3>
                <div className="overflow-x-auto max-h-[250px] overflow-y-auto">
                  <table className="w-full text-xs">
                    <thead className="sticky top-0 bg-surface-card">
                      <tr className="text-text-muted border-b border-border-default text-[10px] uppercase tracking-wider">
                        <th className="text-left pb-2 pr-3 font-semibold">Code</th>
                        <th className="text-left pb-2 pr-3 font-semibold">Τύπος</th>
                        <th className="text-left pb-2 pr-3 font-semibold">Περιοχή</th>
                        <th className="text-right pb-2 pr-3 font-semibold">Τιμή</th>
                        <th className="text-right pb-2 font-semibold">Λήξη</th>
                      </tr>
                    </thead>
                    <tbody>
                      {agingAlerts.expiring
                        .sort((a, b) => (a.end_date ?? '').localeCompare(b.end_date ?? ''))
                        .map(e => (
                          <tr key={e.id} className="border-b border-border-subtle">
                            <td className="py-2 pr-3">
                              <PropertyLink propertyId={e.property_id} code={e.property_code || e.property_id} className="text-xs font-medium" />
                            </td>
                            <td className="py-2 pr-3 text-text-secondary">{e.subcategory || '—'}</td>
                            <td className="py-2 pr-3 text-text-secondary">{e.area || '—'}</td>
                            <td className="py-2 pr-3 text-right tabular-nums">{fmtEur(e.price)}</td>
                            <td className="py-2 text-right font-semibold text-amber-600">{formatDateEL(e.end_date)}</td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </AnimatedSection>
      )}

      {/* ═══════════════════════ */}
      {/* COOPERATION             */}
      {/* ═══════════════════════ */}
      {insightTab === 'cooperation' && (
        <AnimatedSection delay={0.1}>
          <div className="space-y-5">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="card-premium p-4 text-center">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-text-muted mb-1">Σύνολο Υποδείξεων</div>
                <div className="text-2xl font-bold text-brand-purple">{fmt(cooperationInsights.totalShowings)}</div>
              </div>
              <div className="card-premium p-4 text-center">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-text-muted mb-1">Ακίνητα με Υποδ.</div>
                <div className="text-2xl font-bold text-brand-blue">{fmt(cooperationInsights.propertiesWithShowings)}</div>
              </div>
              <div className="card-premium p-4 text-center">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-text-muted mb-1">M.O. Υποδ./Ακίνητο</div>
                <div className="text-2xl font-bold text-brand-teal">{cooperationInsights.avgShowingsPerProperty}</div>
              </div>
              <div className="card-premium p-4 text-center">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-text-muted mb-1">Multi-Client</div>
                <div className="text-2xl font-bold text-brand-gold">{fmt(cooperationInsights.multiClient)}</div>
                <div className="text-xs text-text-muted">2+ πελάτες</div>
              </div>
            </div>

            <div className="card-premium p-5">
              <h3 className="text-sm font-semibold text-text-primary mb-2">Ανάλυση Συνεργασίας</h3>
              <p className="text-xs text-text-muted">
                Ακίνητα με πολλαπλούς πελάτες (unique_clients &gt; 1) δείχνουν υψηλή ζήτηση ή καλή συνεργασία μεταξύ agents.
                {cooperationInsights.multiClient > 0 && ` Υπάρχουν ${cooperationInsights.multiClient} ακίνητα με 2+ μοναδικούς πελάτες.`}
              </p>
            </div>
          </div>
        </AnimatedSection>
      )}

      {/* ═══════════════════════ */}
      {/* STUCK ALERTS            */}
      {/* ═══════════════════════ */}
      {insightTab === 'stuck' && (
        <AnimatedSection delay={0.1}>
          <div className="space-y-5">
            <div className="card-premium p-5">
              <h3 className="text-sm font-semibold text-brand-red mb-1">
                Stuck Properties ({stuckAlerts.length})
              </h3>
              <p className="text-xs text-text-muted mb-4">
                Ακίνητα που ξεπερνούν το 150% του μέσου χρόνου στο ίδιο στάδιο (ίδιο γραφείο × κατηγορία)
              </p>

              {stuckAlerts.length === 0 ? (
                <p className="text-sm text-green-700 text-center py-6">Δεν υπάρχουν stuck alerts!</p>
              ) : (
                <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
                  <table className="w-full text-xs">
                    <thead className="sticky top-0 bg-surface-card">
                      <tr className="text-text-muted border-b border-border-default text-[10px] uppercase tracking-wider">
                        <th className="text-left pb-2 pr-3 font-semibold">Code</th>
                        <th className="text-left pb-2 pr-3 font-semibold">Συνεργάτης</th>
                        <th className="text-left pb-2 pr-3 font-semibold">Στάδιο</th>
                        <th className="text-left pb-2 pr-3 font-semibold">Κατηγορία</th>
                        <th className="text-right pb-2 pr-3 font-semibold">Ημέρες</th>
                        <th className="text-right pb-2 pr-3 font-semibold">M.O.</th>
                        <th className="text-right pb-2 font-semibold">+Ημέρες</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stuckAlerts
                        .sort((a, b) => b.days_over_avg - a.days_over_avg)
                        .map(alert => (
                          <tr key={alert.property_id} className="border-b border-border-subtle hover:bg-red-50/50">
                            <td className="py-2 pr-3">
                              <PropertyLink propertyId={alert.property_id} code={alert.property_code || alert.property_id} className="text-xs font-medium" />
                            </td>
                            <td className="py-2 pr-3">
                              <AgentLink agentId={alert.agent_id} name={alert.canonical_name || `#${alert.agent_id}`} className="text-xs" />
                            </td>
                            <td className="py-2 pr-3">
                              <span
                                className="px-2 py-0.5 rounded-full text-[10px] font-semibold text-white"
                                style={{ backgroundColor: STAGE_COLORS[alert.current_stage] || '#8A94A0' }}
                              >
                                {alert.current_stage}
                              </span>
                            </td>
                            <td className="py-2 pr-3 text-text-secondary">{alert.subcategory || '—'}</td>
                            <td className="py-2 pr-3 text-right font-bold text-brand-red">{alert.days_since_activity}d</td>
                            <td className="py-2 pr-3 text-right text-text-muted">{alert.office_avg_days}d</td>
                            <td className="py-2 text-right">
                              <span className="text-xs font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-full">
                                +{alert.days_over_avg}d
                              </span>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Stuck by stage summary */}
            {stuckAlerts.length > 0 && (
              <div className="card-premium p-5">
                <h3 className="text-sm font-semibold text-text-primary mb-3">Κατανομή ανά Στάδιο</h3>
                <div className="flex flex-wrap gap-3">
                  {Object.entries(
                    stuckAlerts.reduce((acc, a) => {
                      acc[a.current_stage] = (acc[a.current_stage] || 0) + 1;
                      return acc;
                    }, {} as Record<string, number>),
                  )
                    .sort(([, a], [, b]) => b - a)
                    .map(([stage, count]) => (
                      <div key={stage} className="flex items-center gap-2 px-3 py-2 bg-surface rounded-lg border border-border-subtle">
                        <span
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: STAGE_COLORS[stage] || '#8A94A0' }}
                        />
                        <span className="text-sm font-medium text-text-primary capitalize">{stage}</span>
                        <span className="text-sm font-bold text-brand-red">{count}</span>
                      </div>
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
