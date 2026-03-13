import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
} from 'recharts';
import type { Period, AgentActivity } from '../lib/types';
import { useMetrics } from '../hooks/useMetrics';
import { useAgentActivity } from '../hooks/useAgentActivity';
import { useAgents } from '../hooks/useAgents';
import { computeCrmVsAccSummary, rankAgentsByKpi, KPI_DEFS, individualsOnly, sumField } from '../lib/metrics';
import { CrmVsAccChart } from '../components/crm-vs-acc/CrmVsAccChart';
import { DeviationTable } from '../components/crm-vs-acc/DeviationTable';
import { AnimatedSection } from '../components/animations/AnimatedSection';
import { ExportPdfButton } from '../components/export/ExportPdfButton';
import { MiniKpiCard } from '../components/shared/MiniKpiCard';
import { GaugeMeter } from '../components/shared/GaugeMeter';
import { AgentLink } from '../components/ui/AgentLink';

// ── Activity KPI definitions ──

const ACTIVITY_KPIS: {
  key: string;
  label: string;
  fields: (keyof AgentActivity)[];
  icon: string;
}[] = [
  { key: 'outreach',  label: 'Προσέγγιση',        fields: ['total_cold_calls', 'total_follow_ups', 'total_digital_outreach'], icon: '📞' },
  { key: 'meetings',  label: 'Συναντήσεις',       fields: ['total_meetings'],   icon: '🤝' },
  { key: 'leads',     label: 'Επαφές',            fields: ['total_leads'],       icon: '👤' },
  { key: 'marketing', label: 'Μάρκετινγκ',        fields: ['total_marketing_actions'], icon: '📸' },
  { key: 'social',    label: 'Social & Content',  fields: ['total_social'],      icon: '📱' },
  { key: 'cultivation', label: 'Καλλιέργεια',     fields: ['total_cultivation'], icon: '🌱' },
  { key: '8x8',       label: 'Πρόγραμμα 8×8',     fields: ['total_8x8'],         icon: '8️⃣' },
  { key: '33touches', label: 'Πρόγραμμα 33 Touches', fields: ['total_33touches'], icon: '✋' },
  { key: 'absences',  label: 'Απουσίες',          fields: ['total_absences'],    icon: '🏖️' },
];

// ── Sanity check definitions ──

interface SanityCheck {
  label: string;
  description: string;
  check: (m: AggregatedAgent) => boolean;
  getValue: (m: AggregatedAgent) => string;
}

interface AggregatedAgent {
  agent_id: number;
  name: string;
  office: string | null;
  acc_registrations: number;
  acc_exclusives: number;
  acc_showings: number;
  acc_offers: number;
  acc_closings: number;
  acc_billing: number;
  crm_registrations: number;
  crm_exclusives: number;
  crm_showings: number;
  crm_offers: number;
  crm_closings: number;
  crm_billing: number;
}

const SANITY_CHECKS: SanityCheck[] = [
  {
    label: 'Κλεισίματα ≤ Προσφορές',
    description: 'Τα κλεισίματα δεν μπορεί να υπερβαίνουν τις προσφορές',
    check: (m) => m.acc_closings <= m.acc_offers || m.acc_offers === 0,
    getValue: (m) => `${m.acc_closings} / ${m.acc_offers}`,
  },
  {
    label: 'Αποκλειστικές ≤ Καταγραφές',
    description: 'Οι αποκλειστικές δεν μπορεί να υπερβαίνουν τις καταγραφές',
    check: (m) => m.acc_exclusives <= m.acc_registrations || m.acc_registrations === 0,
    getValue: (m) => `${m.acc_exclusives} / ${m.acc_registrations}`,
  },
  {
    label: 'Συμβόλαια ≤ Κλεισίματα',
    description: 'Οι συμβολαιοποιήσεις δεν μπορεί να υπερβαίνουν τα κλεισίματα',
    check: (m) => m.acc_billing <= m.acc_closings || m.acc_closings === 0,
    getValue: (m) => `${m.acc_billing} / ${m.acc_closings}`,
  },
  {
    label: 'CRM Closings ≈ ACC Closings',
    description: 'Μεγάλη απόκλιση CRM vs ACC στα κλεισίματα (>50%)',
    check: (m) => {
      if (m.crm_closings === 0 && m.acc_closings === 0) return true;
      const max = Math.max(m.crm_closings, m.acc_closings);
      if (max === 0) return true;
      return Math.abs(m.crm_closings - m.acc_closings) / max <= 0.5;
    },
    getValue: (m) => `CRM: ${m.crm_closings}, ACC: ${m.acc_closings}`,
  },
];

const OFFICE_SHORT: Record<string, string> = {
  larissa: 'Λάρισα',
  katerini: 'Κατερίνη',
};

interface Props {
  period: Period;
}

export function Accountability({ period }: Props) {
  const { data: metrics, isLoading: metricsLoading } = useMetrics(period);
  const { data: activity, isLoading: activityLoading } = useAgentActivity(period);
  const { data: agents = [] } = useAgents();
  const [selectedAgent, setSelectedAgent] = useState<number | 'all'>('all');
  const [sanityView, setSanityView] = useState<'summary' | 'detail'>('summary');

  const isLoading = metricsLoading || activityLoading;

  // ── Agent list for selector ──
  const agentOptions = useMemo(() => {
    if (!metrics) return [];
    const seen = new Map<number, string>();
    for (const m of metrics) {
      if (!m.is_team && !seen.has(m.agent_id)) {
        seen.set(m.agent_id, m.canonical_name || `Agent #${m.agent_id}`);
      }
    }
    return Array.from(seen.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name, 'el'));
  }, [metrics]);

  // ── Aggregate activity per agent then filter ──
  const activityAgg = useMemo(() => {
    if (!activity) return null;
    const map = new Map<number, Record<string, number>>();
    for (const a of activity) {
      const existing = map.get(a.agent_id) || {};
      for (const kpi of ACTIVITY_KPIS) {
        const sum = kpi.fields.reduce((s, f) => s + (Number(a[f]) || 0), 0);
        existing[kpi.key] = (existing[kpi.key] || 0) + sum;
      }
      map.set(a.agent_id, existing);
    }
    return map;
  }, [activity]);

  const activityTotals = useMemo(() => {
    if (!activityAgg) return null;
    const totals: Record<string, number> = {};
    if (selectedAgent === 'all') {
      for (const agentData of activityAgg.values()) {
        for (const [k, v] of Object.entries(agentData)) {
          totals[k] = (totals[k] || 0) + v;
        }
      }
    } else {
      const agentData = activityAgg.get(selectedAgent);
      if (agentData) Object.assign(totals, agentData);
    }
    return totals;
  }, [activityAgg, selectedAgent]);

  // ── Declared results (ACC fields) ──
  const declaredResults = useMemo(() => {
    if (!metrics) return null;
    const individuals = individualsOnly(metrics);
    const filtered = selectedAgent === 'all'
      ? individuals
      : individuals.filter(m => m.agent_id === selectedAgent);

    return {
      registrations: sumField(filtered, 'acc_registrations'),
      exclusives: sumField(filtered, 'acc_exclusives'),
      showings: sumField(filtered, 'acc_showings'),
      offers: sumField(filtered, 'acc_offers'),
      closings: sumField(filtered, 'acc_closings'),
      billing: sumField(filtered, 'acc_billing'),
    };
  }, [metrics, selectedAgent]);

  // ── CRM vs ACC summary ──
  const crmVsAccSummary = useMemo(() => {
    if (!metrics) return [];
    if (selectedAgent === 'all') return computeCrmVsAccSummary(metrics);
    // Filter to single agent
    const filtered = metrics.filter(m => m.agent_id === selectedAgent);
    return computeCrmVsAccSummary(filtered);
  }, [metrics, selectedAgent]);

  // ── Aggregated agents for sanity checks ──
  const aggregatedAgents = useMemo((): AggregatedAgent[] => {
    if (!metrics) return [];
    const individuals = individualsOnly(metrics);
    const map = new Map<number, AggregatedAgent>();

    for (const m of individuals) {
      const existing = map.get(m.agent_id);
      if (existing) {
        existing.acc_registrations += m.acc_registrations || 0;
        existing.acc_exclusives += m.acc_exclusives || 0;
        existing.acc_showings += m.acc_showings || 0;
        existing.acc_offers += m.acc_offers || 0;
        existing.acc_closings += m.acc_closings || 0;
        existing.acc_billing += m.acc_billing || 0;
        existing.crm_registrations += m.crm_registrations || 0;
        existing.crm_exclusives += m.crm_exclusives || 0;
        existing.crm_showings += m.crm_showings || 0;
        existing.crm_offers += m.crm_offers || 0;
        existing.crm_closings += m.crm_closings || 0;
        existing.crm_billing += m.crm_billing || 0;
      } else {
        map.set(m.agent_id, {
          agent_id: m.agent_id,
          name: m.canonical_name || `Agent #${m.agent_id}`,
          office: m.office,
          acc_registrations: m.acc_registrations || 0,
          acc_exclusives: m.acc_exclusives || 0,
          acc_showings: m.acc_showings || 0,
          acc_offers: m.acc_offers || 0,
          acc_closings: m.acc_closings || 0,
          acc_billing: m.acc_billing || 0,
          crm_registrations: m.crm_registrations || 0,
          crm_exclusives: m.crm_exclusives || 0,
          crm_showings: m.crm_showings || 0,
          crm_offers: m.crm_offers || 0,
          crm_closings: m.crm_closings || 0,
          crm_billing: m.crm_billing || 0,
        });
      }
    }

    return Array.from(map.values());
  }, [metrics]);

  // ── Sanity check results ──
  const sanityResults = useMemo(() => {
    const agents = selectedAgent === 'all'
      ? aggregatedAgents
      : aggregatedAgents.filter(a => a.agent_id === selectedAgent);

    return SANITY_CHECKS.map(check => {
      const failures = agents.filter(a => !check.check(a));
      return {
        ...check,
        passed: failures.length === 0,
        failCount: failures.length,
        totalAgents: agents.length,
        failures,
      };
    });
  }, [aggregatedAgents, selectedAgent]);

  // ── Effort Mix data ──
  const effortMixData = useMemo(() => {
    if (!activityAgg) return [];
    const agentMap = new Map(agents.map(a => [a.agent_id, a]));

    return Array.from(activityAgg.entries())
      .filter(([id]) => {
        const ag = agentMap.get(id);
        return ag && !ag.is_team;
      })
      .map(([id, data]) => {
        const ag = agentMap.get(id);
        return {
          name: ag?.canonical_name?.split(' ')[0] || `#${id}`,
          agent_id: id,
          'Κλήσεις': data['outreach'] || 0,
          'Συναντήσεις': data['meetings'] || 0,
          'Επαφές': data['leads'] || 0,
          'Μάρκετινγκ': data['marketing'] || 0,
          'Social': data['social'] || 0,
          'Καλλιέργεια': data['cultivation'] || 0,
          total: Object.values(data).reduce((s, v) => s + v, 0),
        };
      })
      .filter(d => d.total > 0)
      .sort((a, b) => b.total - a.total);
  }, [activityAgg, agents]);

  // ── Radar data for top 5 ──
  const radarData = useMemo(() => {
    const top5 = effortMixData.slice(0, 5);
    if (top5.length === 0) return [];

    const dims = ['Κλήσεις', 'Συναντήσεις', 'Επαφές', 'Μάρκετινγκ', 'Social', 'Καλλιέργεια'] as const;
    return dims.map(dim => {
      const point: Record<string, string | number> = { metric: dim };
      for (const agent of top5) {
        point[agent.name] = agent[dim];
      }
      return point;
    });
  }, [effortMixData]);

  // ── Percentile rankings ──
  const percentileData = useMemo(() => {
    if (!metrics) return [];
    const defsWithAcc = KPI_DEFS.filter(d => d.accField !== null);
    const individuals = individualsOnly(metrics);

    return defsWithAcc.map(def => {
      const ranked = rankAgentsByKpi(individuals, def.crmField, def.accField);
      const total = ranked.length;
      return {
        kpi: def.label,
        key: def.key,
        color: def.color,
        agents: ranked.map((a, i) => ({
          ...a,
          rank: i + 1,
          percentile: total > 1 ? Math.round(((total - i - 1) / (total - 1)) * 100) : 100,
        })),
      };
    });
  }, [metrics]);

  // ── Minimum targets (company aggregated activity) ──
  const targetGauges = useMemo(() => {
    if (!activityTotals || !activityAgg) return [];
    const agentCount = activityAgg.size || 1;

    // Per-agent monthly averages vs typical targets
    const avgColdCalls = Math.round((activityTotals['outreach'] || 0) / agentCount);
    const avgMeetings = Math.round((activityTotals['meetings'] || 0) / agentCount);
    const avgLeads = Math.round((activityTotals['leads'] || 0) / agentCount);

    return [
      { value: avgColdCalls, target: 120, label: 'M.O. Προσέγγιση / Agent' },
      { value: avgMeetings, target: 8, label: 'M.O. Συναντήσεις / Agent' },
      { value: avgLeads, target: 10, label: 'M.O. Επαφές / Agent' },
    ];
  }, [activityTotals, activityAgg]);

  if (isLoading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-brand-blue border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-text-muted">Φόρτωση δεδομένων accountability...</span>
        </div>
      </div>
    );
  }

  const selectedName = selectedAgent === 'all'
    ? 'Εταιρεία'
    : agentOptions.find(a => a.id === selectedAgent)?.name || '';

  const RADAR_COLORS = ['#1B5299', '#168F80', '#C9961A', '#DC3545', '#6B5CA5'];

  return (
    <div id="page-accountability" className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-[1600px] mx-auto">
      {/* ── Hero Header ── */}
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
              Accountability
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold">{period.label}</h2>
            <p className="text-white/60 text-sm mt-1">
              Αναφορές Συνεργατών &mdash; {selectedName}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <select
              value={selectedAgent}
              onChange={e => setSelectedAgent(e.target.value === 'all' ? 'all' : Number(e.target.value))}
              className="text-xs border border-white/20 rounded-lg px-3 py-2 bg-white/10 text-white focus:outline-none focus:ring-1 focus:ring-white/40 backdrop-blur-sm"
            >
              <option value="all" className="text-text-primary bg-surface-card">Όλοι οι Συνεργάτες</option>
              {agentOptions.map(a => (
                <option key={a.id} value={a.id} className="text-text-primary bg-surface-card">{a.name}</option>
              ))}
            </select>
            <ExportPdfButton elementId="page-accountability" filename={`accountability-${period.label}.pdf`} />
          </div>
        </div>
      </motion.div>

      {/* ── Source Banner ── */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 text-sm text-blue-800">
        Πηγή δεδομένων: Εβδομαδιαίες αυτο-αναφορές (GrowthCFO). Τα δεδομένα CRM αποτελούν την πηγή αλήθειας για επαλήθευση.
      </div>

      {/* ══════════════════════════════════════════ */}
      {/* SECTION 1: Activity KPIs (9 cards)        */}
      {/* ══════════════════════════════════════════ */}
      <AnimatedSection delay={0.1}>
        <div className="space-y-3">
          <h3 className="text-lg font-semibold text-text-primary">Δραστηριότητα (ACC)</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {ACTIVITY_KPIS.map(kpi => (
              <MiniKpiCard
                key={kpi.key}
                label={kpi.label}
                value={activityTotals?.[kpi.key]?.toLocaleString('el-GR') ?? '0'}
                subtitle={selectedAgent === 'all' ? 'Σύνολο εταιρείας' : undefined}
              />
            ))}
          </div>
        </div>
      </AnimatedSection>

      {/* ══════════════════════════════════════════ */}
      {/* SECTION 2: Declared Results (5 cards)     */}
      {/* ══════════════════════════════════════════ */}
      <AnimatedSection delay={0.15}>
        <div className="space-y-3">
          <h3 className="text-lg font-semibold text-text-primary">Δηλωμένα Αποτελέσματα (ACC)</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {declaredResults && [
              { label: 'Καταγραφές', value: declaredResults.registrations },
              { label: 'Αποκλειστικές', value: declaredResults.exclusives },
              { label: 'Υποδείξεις', value: declaredResults.showings },
              { label: 'Προσφορές', value: declaredResults.offers },
              { label: 'Κλεισίματα', value: declaredResults.closings },
              { label: 'Συμβόλαια', value: declaredResults.billing },
            ].map(item => (
              <MiniKpiCard
                key={item.label}
                label={item.label}
                value={item.value.toLocaleString('el-GR')}
              />
            ))}
          </div>
        </div>
      </AnimatedSection>

      {/* ══════════════════════════════════════════ */}
      {/* SECTION 3: CRM vs ACC Comparison          */}
      {/* ══════════════════════════════════════════ */}
      <AnimatedSection delay={0.2}>
        <CrmVsAccChart rows={crmVsAccSummary} />
      </AnimatedSection>

      {/* ══════════════════════════════════════════ */}
      {/* SECTION 4: Per-Agent Accuracy Matrix       */}
      {/* ══════════════════════════════════════════ */}
      {metrics && selectedAgent === 'all' && (
        <AnimatedSection delay={0.25}>
          <DeviationTable metrics={metrics} />
        </AnimatedSection>
      )}

      {/* ══════════════════════════════════════════ */}
      {/* SECTION 5: Sanity Checks                  */}
      {/* ══════════════════════════════════════════ */}
      <AnimatedSection delay={0.3}>
        <div className="card-premium p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-text-primary">Sanity Checks — Λογικοί Έλεγχοι</h3>
            <div className="flex gap-1 bg-surface-light rounded-lg p-0.5">
              <button
                onClick={() => setSanityView('summary')}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
                  sanityView === 'summary' ? 'bg-surface-card text-brand-blue shadow-sm' : 'text-text-muted'
                }`}
              >
                Σύνοψη
              </button>
              <button
                onClick={() => setSanityView('detail')}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
                  sanityView === 'detail' ? 'bg-surface-card text-brand-blue shadow-sm' : 'text-text-muted'
                }`}
              >
                Αναλυτικά
              </button>
            </div>
          </div>

          {sanityView === 'summary' ? (
            <div className="space-y-2">
              {sanityResults.map((check, i) => (
                <div
                  key={i}
                  className={`flex items-center justify-between px-4 py-3 rounded-lg border ${
                    check.passed
                      ? 'bg-green-50 border-green-200'
                      : 'bg-red-50 border-red-200'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-lg">{check.passed ? '✓' : '✗'}</span>
                    <div>
                      <div className="text-sm font-medium text-text-primary">{check.label}</div>
                      <div className="text-xs text-text-muted">{check.description}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    {check.passed ? (
                      <span className="text-xs font-semibold text-green-700">Pass</span>
                    ) : (
                      <span className="text-xs font-semibold text-red-700">
                        {check.failCount} / {check.totalAgents} agents
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {sanityResults
                .filter(c => !c.passed)
                .map((check, i) => (
                  <div key={i} className="space-y-2">
                    <div className="text-sm font-semibold text-red-700">{check.label}</div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-surface-light text-text-muted text-xs uppercase tracking-wider">
                            <th className="text-left px-3 py-2">Συνεργάτης</th>
                            <th className="text-left px-3 py-2">Γραφείο</th>
                            <th className="text-right px-3 py-2">Τιμές</th>
                          </tr>
                        </thead>
                        <tbody>
                          {check.failures.map(agent => (
                            <tr key={agent.agent_id} className="border-t border-border-subtle">
                              <td className="px-3 py-2">
                                <AgentLink agentId={agent.agent_id} name={agent.name} className="text-sm font-medium text-text-primary" />
                              </td>
                              <td className="px-3 py-2 text-xs text-text-muted">
                                {OFFICE_SHORT[agent.office || ''] || agent.office || '—'}
                              </td>
                              <td className="px-3 py-2 text-right text-xs font-mono text-red-600">
                                {check.getValue(agent)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
              {sanityResults.every(c => c.passed) && (
                <div className="text-center py-4 text-sm text-green-700">
                  Όλοι οι έλεγχοι πέρασαν επιτυχώς.
                </div>
              )}
            </div>
          )}
        </div>
      </AnimatedSection>

      {/* ══════════════════════════════════════════ */}
      {/* SECTION 6: Minimum Targets (Gauges)       */}
      {/* ══════════════════════════════════════════ */}
      {targetGauges.length > 0 && (
        <AnimatedSection delay={0.35}>
          <div className="card-premium p-5">
            <h3 className="text-sm font-semibold text-text-primary mb-4">
              Ελάχιστοι Στόχοι Δραστηριότητας {selectedAgent === 'all' ? '(M.O. ανά Agent)' : ''}
            </h3>
            <div className="flex flex-wrap justify-center gap-8">
              {targetGauges.map((g, i) => (
                <GaugeMeter key={i} value={g.value} target={g.target} label={g.label} size={140} />
              ))}
            </div>
          </div>
        </AnimatedSection>
      )}

      {/* ══════════════════════════════════════════ */}
      {/* SECTION 7: Effort Mix (Stacked Bar)       */}
      {/* ══════════════════════════════════════════ */}
      {effortMixData.length > 0 && selectedAgent === 'all' && (
        <AnimatedSection delay={0.4}>
          <div className="card-premium p-5">
            <h3 className="text-sm font-semibold text-text-primary mb-4">
              Effort Mix — Κατανομή Δραστηριοτήτων ανά Συνεργάτη
            </h3>
            <div className="h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={effortMixData}
                  margin={{ top: 10, right: 10, left: 0, bottom: 60 }}
                >
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 11, fill: '#8A94A0' }}
                    angle={-45}
                    textAnchor="end"
                    interval={0}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis tick={{ fontSize: 11, fill: '#8A94A0' }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{ borderRadius: 12, border: '1px solid #DDD8D0', fontSize: 12, boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}
                  />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="Κλήσεις" stackId="a" fill="#1B5299" />
                  <Bar dataKey="Συναντήσεις" stackId="a" fill="#168F80" />
                  <Bar dataKey="Επαφές" stackId="a" fill="#6B5CA5" />
                  <Bar dataKey="Μάρκετινγκ" stackId="a" fill="#C9961A" />
                  <Bar dataKey="Social" stackId="a" fill="#D4722A" />
                  <Bar dataKey="Καλλιέργεια" stackId="a" fill="#1D7A4E" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </AnimatedSection>
      )}

      {/* ══════════════════════════════════════════ */}
      {/* SECTION 8: Radar — Top 5 Effort Profile   */}
      {/* ══════════════════════════════════════════ */}
      {radarData.length > 0 && selectedAgent === 'all' && (
        <AnimatedSection delay={0.45}>
          <div className="card-premium p-5">
            <h3 className="text-sm font-semibold text-text-primary mb-4">
              Effort Profile — Top 5 Συνεργάτες
            </h3>
            <div className="h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={radarData} outerRadius="75%">
                  <PolarGrid stroke="#EFECEA" />
                  <PolarAngleAxis dataKey="metric" tick={{ fontSize: 11, fill: '#8A94A0' }} />
                  <PolarRadiusAxis tick={{ fontSize: 9, fill: '#8A94A0' }} />
                  {effortMixData.slice(0, 5).map((agent, i) => (
                    <Radar
                      key={agent.name}
                      name={agent.name}
                      dataKey={agent.name}
                      stroke={RADAR_COLORS[i]}
                      fill={RADAR_COLORS[i]}
                      fillOpacity={0.1}
                    />
                  ))}
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </AnimatedSection>
      )}

      {/* ══════════════════════════════════════════ */}
      {/* SECTION 9: Percentile Rankings             */}
      {/* ══════════════════════════════════════════ */}
      {selectedAgent !== 'all' && percentileData.length > 0 && (
        <AnimatedSection delay={0.35}>
          <div className="card-premium p-5">
            <h3 className="text-sm font-semibold text-text-primary mb-4">
              Θέση στο Percentile — {selectedName}
            </h3>
            <div className="space-y-3">
              {percentileData.map(kpi => {
                const agentEntry = kpi.agents.find(a => a.agent_id === selectedAgent);
                if (!agentEntry) return null;
                const pct = agentEntry.percentile;

                return (
                  <div key={kpi.key} className="flex items-center gap-3">
                    <div className="w-32 text-sm font-medium text-text-primary truncate">{kpi.kpi}</div>
                    <div className="flex-1 relative">
                      <div className="h-6 bg-surface-light rounded-full overflow-hidden relative">
                        {/* Background gradient */}
                        <div className="absolute inset-0 bg-gradient-to-r from-red-100 via-yellow-100 to-green-100 opacity-60" />
                        {/* Marker */}
                        <div
                          className="absolute top-0 h-full w-1 rounded-full"
                          style={{
                            left: `${pct}%`,
                            backgroundColor: kpi.color,
                            boxShadow: `0 0 6px ${kpi.color}40`,
                          }}
                        />
                        {/* Label */}
                        <div
                          className="absolute top-0 h-full flex items-center"
                          style={{ left: `${Math.min(pct, 90)}%` }}
                        >
                          <span className="text-[10px] font-bold ml-2" style={{ color: kpi.color }}>
                            #{agentEntry.rank}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="w-12 text-right">
                      <span className="text-xs font-bold" style={{ color: kpi.color }}>
                        P{pct}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="text-xs text-text-muted mt-3 pt-2 border-t border-border-subtle">
              P100 = κορυφή, P0 = τελευταίος. Βάσει CRM δεδομένων.
            </div>
          </div>
        </AnimatedSection>
      )}

      {/* ══════════════════════════════════════════ */}
      {/* SECTION 10: Per-Agent Accuracy Heatmap     */}
      {/* ══════════════════════════════════════════ */}
      {selectedAgent === 'all' && aggregatedAgents.length > 0 && (
        <AnimatedSection delay={0.5}>
          <AccuracyHeatmap agents={aggregatedAgents} />
        </AnimatedSection>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════
// Sub-component: Accuracy Heatmap
// ═══════════════════════════════════════════════

function AccuracyHeatmap({ agents }: { agents: AggregatedAgent[] }) {
  const KPI_COLS = [
    { label: 'Καταγρ.', crm: 'crm_registrations' as const, acc: 'acc_registrations' as const },
    { label: 'Αποκλ.', crm: 'crm_exclusives' as const, acc: 'acc_exclusives' as const },
    { label: 'Υποδ.', crm: 'crm_showings' as const, acc: 'acc_showings' as const },
    { label: 'Προσφ.', crm: 'crm_offers' as const, acc: 'acc_offers' as const },
    { label: 'Κλεισ.', crm: 'crm_closings' as const, acc: 'acc_closings' as const },
  ];

  function deviationColor(crm: number, acc: number): string {
    if (crm === 0 && acc === 0) return 'bg-gray-50 text-gray-400';
    const max = Math.max(crm, acc);
    if (max === 0) return 'bg-gray-50 text-gray-400';
    const pct = Math.abs(crm - acc) / max * 100;
    if (pct <= 10) return 'bg-green-50 text-green-700';
    if (pct <= 20) return 'bg-yellow-50 text-yellow-700';
    if (pct <= 30) return 'bg-orange-50 text-orange-700';
    return 'bg-red-50 text-red-700';
  }

  function deviationText(crm: number, acc: number): string {
    const delta = acc - crm;
    if (delta === 0) return '=';
    return (delta > 0 ? '+' : '') + delta;
  }

  // Sort by total absolute deviation descending
  const sorted = [...agents].sort((a, b) => {
    const devA = KPI_COLS.reduce((s, c) => s + Math.abs(a[c.crm] - a[c.acc]), 0);
    const devB = KPI_COLS.reduce((s, c) => s + Math.abs(b[c.crm] - b[c.acc]), 0);
    return devB - devA;
  });

  return (
    <div className="card-premium p-5">
      <h3 className="text-sm font-semibold text-text-primary mb-1">
        Accuracy Matrix — Απόκλιση ACC vs CRM ανά Agent
      </h3>
      <p className="text-xs text-text-muted mb-4">
        Χρωματισμός: Πράσινο ≤10% | Κίτρινο ≤20% | Πορτοκαλί ≤30% | Κόκκινο &gt;30%
      </p>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-surface-light text-text-muted text-[10px] uppercase tracking-wider">
              <th className="text-left px-3 py-2">Συνεργάτης</th>
              {KPI_COLS.map(c => (
                <th key={c.label} className="text-center px-3 py-2">{c.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map(agent => (
              <tr key={agent.agent_id} className="border-t border-border-subtle">
                <td className="px-3 py-2">
                  <AgentLink agentId={agent.agent_id} name={agent.name} className="text-sm font-medium text-text-primary" />
                  <div className="text-[10px] text-text-muted">
                    {OFFICE_SHORT[agent.office || ''] || agent.office || '—'}
                  </div>
                </td>
                {KPI_COLS.map(c => {
                  const crm = agent[c.crm];
                  const acc = agent[c.acc];
                  return (
                    <td key={c.label} className="px-2 py-2 text-center">
                      <span className={`inline-block text-xs font-bold px-2 py-1 rounded-md ${deviationColor(crm, acc)}`}>
                        {deviationText(crm, acc)}
                      </span>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
