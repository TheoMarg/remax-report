import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Legend,
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
} from 'recharts';
import type { Period } from '../lib/types';
import { useAgentDetail } from '../hooks/useAgentDetail';
import { useAgents } from '../hooks/useAgents';
import { useMetrics } from '../hooks/useMetrics';
import { usePropertyJourneys } from '../hooks/usePropertyJourneys';
import { usePortfolioQuality } from '../hooks/usePortfolioQuality';
import { useKpiWeights } from '../hooks/useKpiWeights';
import { usePqsWeights } from '../hooks/usePqsWeights';
import { useStuckAlerts } from '../hooks/useStuckAlerts';
import { useAgentActivity } from '../hooks/useAgentActivity';
import { useConversionRates } from '../hooks/useConversionRates';
import { useQualityMetrics } from '../hooks/useQualityMetrics';
import { useWeightedScores } from '../hooks/useWeightedScores';
import { usePortfolioScores } from '../hooks/usePortfolioScores';
import { KPI_DEFS, individualsOnly, rankAgentsByKpi } from '../lib/metrics';
import { formatDateEL } from '../lib/propertyMetrics';
import { PropertyLink } from '../components/ui/PropertyLink';
import { EntityLink } from '../components/shared/EntityLink';
import { StatusBadge } from '../components/shared/StatusBadge';
import { GaugeMeter } from '../components/shared/GaugeMeter';
import { TrendSparkline } from '../components/shared/TrendSparkline';
import { AnimatedSection } from '../components/animations/AnimatedSection';
import { ExportPdfButton } from '../components/export/ExportPdfButton';

const OFFICE_LABEL: Record<string, string> = { larissa: 'Λάρισα', katerini: 'Κατερίνη' };

function fmt(n: number | null | undefined): string {
  if (n == null) return '—';
  return n.toLocaleString('el-GR');
}

function fmtEur(n: number | null | undefined): string {
  if (n == null) return '—';
  return `€${n.toLocaleString('el-GR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function fmtPct(n: number | null | undefined): string {
  if (n == null) return '—';
  return `${n}%`;
}

interface Props {
  period: Period;
}

export function AgentProfile({ period }: Props) {
  const { data: agents = [] } = useAgents();
  const individualAgents = useMemo(
    () => agents.filter(a => !a.is_team && a.is_active).sort((a, b) => a.canonical_name.localeCompare(b.canonical_name, 'el')),
    [agents],
  );
  const [selectedAgentId, setSelectedAgentId] = useState<number | null>(null);
  const agentId = selectedAgentId ?? individualAgents[0]?.agent_id ?? null;

  const {
    profile, metrics: agentMetrics, closings, portfolio,
    showingsCount, targets, withdrawals, isLoading,
  } = useAgentDetail(agentId);

  const { data: allMetrics = [] } = useMetrics(period);
  const { data: journeys = [] } = usePropertyJourneys(period);
  const { data: qualityData = [] } = usePortfolioQuality();
  const { data: kpiWeights = [] } = useKpiWeights();
  const { data: pqsWeights = [] } = usePqsWeights();
  const { data: stuckAlerts = [] } = useStuckAlerts();
  const { data: activity = [] } = useAgentActivity(period);

  const agent = profile.data;
  const metricsData = agentMetrics.data ?? [];
  const currentYear = new Date().getFullYear().toString();

  // ── Rookie check ──
  const isRookie = useMemo(() => {
    if (!agent?.start_date) return false;
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    return new Date(agent.start_date) > sixMonthsAgo;
  }, [agent]);

  // ── YTD aggregation ──
  const ytd = useMemo(() => {
    const rows = metricsData.filter(m => m.period_start.startsWith(currentYear));
    return {
      gci: rows.reduce((s, m) => s + (m.gci || 0), 0),
      closings: rows.reduce((s, m) => s + (m.crm_closings || 0), 0),
      registrations: rows.reduce((s, m) => s + (m.crm_registrations || 0), 0),
      exclusives: rows.reduce((s, m) => s + (m.crm_exclusives || 0), 0),
      showings: rows.reduce((s, m) => s + (m.crm_showings || 0), 0),
      offers: rows.reduce((s, m) => s + (m.crm_offers || 0), 0),
      billing: rows.reduce((s, m) => s + (m.crm_billing || 0), 0),
    };
  }, [metricsData, currentYear]);

  // ── Monthly GCI trend ──
  const monthlyGci = useMemo(() =>
    metricsData
      .filter(m => m.period_start.startsWith(currentYear))
      .sort((a, b) => a.period_start.localeCompare(b.period_start))
      .map(m => m.gci || 0),
    [metricsData, currentYear],
  );

  // ── WPS & PQS scores ──
  const startDates = useMemo(() => {
    const map: Record<number, string | null> = {};
    for (const a of agents) map[a.agent_id] = a.start_date;
    return map;
  }, [agents]);

  const wpsResults = useWeightedScores(allMetrics, kpiWeights, startDates);
  const pqsResults = usePortfolioScores(qualityData, pqsWeights);
  const myWps = wpsResults.find(w => w.agent_id === agentId);
  const myWpsRank = wpsResults.findIndex(w => w.agent_id === agentId) + 1;
  const myPqs = pqsResults.find(p => p.agent_id === agentId);
  const myPqsRank = pqsResults.findIndex(p => p.agent_id === agentId) + 1;

  // ── Conversion rates: agent vs office vs company ──
  const agentJourneys = useMemo(() => journeys.filter(j => j.agent_id === agentId), [journeys, agentId]);
  const officeJourneys = useMemo(() => agent?.office ? journeys.filter(j => j.office === agent.office) : [], [journeys, agent]);
  const { total: agentConv } = useConversionRates(agentJourneys);
  const { total: officeConv } = useConversionRates(officeJourneys);
  const { total: companyConv } = useConversionRates(journeys);
  const { total: agentQuality } = useQualityMetrics(agentJourneys);
  const { total: companyQuality } = useQualityMetrics(journeys);

  // ── Stuck alerts ──
  const myStuckAlerts = useMemo(() => stuckAlerts.filter(a => a.agent_id === agentId), [stuckAlerts, agentId]);

  // ── Portfolio ──
  const portfolioItems = portfolio.data ?? [];
  const recentClosings = closings.data ?? [];
  const agentTargets = targets.data;
  const totalShowings = showingsCount.data ?? 0;
  const withdrawalData = withdrawals.data ?? {};
  const allWithdrawalReasons = Object.entries(withdrawalData).sort(([, a], [, b]) => b - a);
  const totalWithdrawals = allWithdrawalReasons.reduce((s, [, cnt]) => s + cnt, 0);

  // ── Property IDs for navigation ──
  const allPropertyIds = useMemo(() => {
    const closingIds = recentClosings.map(c => c.property_id).filter(Boolean) as string[];
    const portfolioIds = portfolioItems.map(e => e.property_id).filter(Boolean) as string[];
    return [...new Set([...closingIds, ...portfolioIds])];
  }, [recentClosings, portfolioItems]);

  // ── Radar data (WPS + PQS dimensions) ──
  const radarData = useMemo(() => {
    if (!myWps && !myPqs) return [];
    const dims: { metric: string; agent: number; max: number }[] = [];
    if (myWps) {
      const entries = Object.entries(myWps.breakdown);
      for (const [key, val] of entries) {
        const maxVal = Math.max(...wpsResults.map(w => w.breakdown[key] ?? 0), 1);
        dims.push({ metric: key.charAt(0).toUpperCase() + key.slice(1), agent: Math.round((val / maxVal) * 100), max: 100 });
      }
    }
    if (myPqs) {
      for (const [key, val] of Object.entries(myPqs.dimensions)) {
        dims.push({ metric: key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()), agent: Math.round(val), max: 100 });
      }
    }
    return dims;
  }, [myWps, myPqs, wpsResults]);

  // ── ACC Activity for this agent ──
  const agentActivity = useMemo(() => {
    if (!agentId) return null;
    const rows = activity.filter(a => a.agent_id === agentId);
    if (rows.length === 0) return null;
    return {
      cold_calls: rows.reduce((s, r) => s + r.total_cold_calls, 0),
      follow_ups: rows.reduce((s, r) => s + r.total_follow_ups, 0),
      meetings: rows.reduce((s, r) => s + r.total_meetings, 0),
      leads: rows.reduce((s, r) => s + r.total_leads, 0),
      marketing: rows.reduce((s, r) => s + r.total_marketing_actions, 0),
      social: rows.reduce((s, r) => s + r.total_social, 0),
      cultivation: rows.reduce((s, r) => s + r.total_cultivation, 0),
      absences: rows.reduce((s, r) => s + r.total_absences, 0),
    };
  }, [activity, agentId]);

  // ── Reporting accuracy (CRM vs ACC per KPI) ──
  const accuracyData = useMemo(() => {
    if (!agentId) return [];
    const individuals = individualsOnly(allMetrics);
    const defsWithAcc = KPI_DEFS.filter(d => d.accField !== null);

    return defsWithAcc.map(def => {
      const ranked = rankAgentsByKpi(individuals, def.crmField, def.accField);
      const row = ranked.find(a => a.agent_id === agentId);
      return {
        kpi: def.label,
        crm: row?.crm ?? 0,
        acc: row?.acc ?? 0,
        delta: row?.delta ?? 0,
        color: def.color,
      };
    });
  }, [allMetrics, agentId]);

  // ── Portfolio mix analysis ──
  const portfolioMix = useMemo(() => {
    const items = portfolio.data ?? [];
    if (items.length === 0) return null;
    const counts = new Map<string, number>();
    for (const e of items) {
      const sc = e.properties?.subcategory || 'Άλλο';
      counts.set(sc, (counts.get(sc) ?? 0) + 1);
    }
    const total = items.length;
    const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]);
    const maxPct = sorted.length > 0 ? (sorted[0][1] / total) * 100 : 0;
    const isDiversified = maxPct <= 40;
    const isConcentrated = maxPct > 60;
    return { sorted, total, isDiversified, isConcentrated, maxPct };
  }, [portfolio.data]);

  // ── Expiring exclusives ──
  const expiringMandates = useMemo(() => {
    const now = new Date();
    const in30d = new Date();
    in30d.setDate(in30d.getDate() + 30);

    return portfolioItems.filter(e => {
      if (!e.end_date) return false;
      const end = new Date(e.end_date);
      return end >= now && end <= in30d;
    });
  }, [portfolioItems]);

  if (!agentId || (isLoading && !agent)) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 max-w-[1600px] mx-auto space-y-6">
        <div className="card-premium p-5">
          <label className="text-sm font-semibold text-text-primary mr-3">Επιλογή Συνεργάτη</label>
          <select
            value={agentId ?? ''}
            onChange={e => setSelectedAgentId(Number(e.target.value))}
            className="text-sm border border-border-default rounded-lg px-3 py-2 bg-surface-card text-text-primary"
          >
            <option value="">Επιλέξτε...</option>
            {individualAgents.map(a => (
              <option key={a.agent_id} value={a.agent_id}>{a.canonical_name}</option>
            ))}
          </select>
        </div>
        {isLoading && (
          <div className="flex items-center justify-center min-h-[300px]">
            <div className="w-8 h-8 border-3 border-brand-blue border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </div>
    );
  }

  return (
    <div id="page-agent-profile" className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-[1600px] mx-auto">
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
            <span className="inline-block text-[10px] font-bold tracking-widest text-white/60 bg-white/10 px-2.5 py-1 rounded-full mb-3">
              Agent Profile
            </span>
            <div className="flex items-center gap-3">
              <h2 className="text-2xl sm:text-3xl font-bold">
                {agent?.canonical_name || `Agent #${agentId}`}
              </h2>
              {isRookie && <StatusBadge status="rookie" />}
              {agent?.is_active === false && <StatusBadge status="closed" />}
            </div>
            <div className="flex items-center gap-3 mt-2 text-white/60 text-sm">
              {agent?.office && (
                <EntityLink type="office" id={agent.office} label={OFFICE_LABEL[agent.office] || agent.office} className="text-sm text-white/80 hover:text-white" />
              )}
              {agent?.start_date && <span>Μέλος από: {formatDateEL(agent.start_date)}</span>}
              {agent?.email && <span>{agent.email}</span>}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <select
              value={agentId}
              onChange={e => setSelectedAgentId(Number(e.target.value))}
              className="text-xs border border-white/20 rounded-lg px-3 py-2 bg-white/10 text-white focus:outline-none focus:ring-1 focus:ring-white/40 backdrop-blur-sm"
            >
              {individualAgents.map(a => (
                <option key={a.agent_id} value={a.agent_id} className="text-text-primary bg-surface-card">{a.canonical_name}</option>
              ))}
            </select>
            <ExportPdfButton elementId="page-agent-profile" filename={`agent-${agent?.canonical_name || agentId}-${period.label}.pdf`} />
          </div>
        </div>
      </motion.div>

      {/* ═══ Row 1: Scores + Radar ═══ */}
      <AnimatedSection delay={0.1}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* WPS */}
          <div className="card-premium p-5">
            <div className="text-[10px] font-semibold tracking-wider text-text-muted mb-2">WPS Score</div>
            <div className="flex items-baseline gap-2 mb-3">
              <span className="text-3xl font-bold text-brand-blue">{myWps?.wps.toFixed(1) ?? '—'}</span>
              <span className="text-sm text-text-muted">#{myWpsRank} of {wpsResults.length}</span>
              {isRookie && <span className="text-xs text-brand-purple font-semibold">x2 rookie</span>}
            </div>
            {myWps && (
              <div className="space-y-1.5">
                {Object.entries(myWps.breakdown).map(([key, val]) => (
                  <div key={key} className="flex items-center gap-2 text-xs">
                    <span className="w-20 text-text-muted truncate capitalize">{key}</span>
                    <div className="flex-1 h-2 bg-surface-light rounded-full overflow-hidden">
                      <div className="h-full bg-brand-blue/60 rounded-full" style={{ width: `${Math.min((val / (myWps.wps || 1)) * 100, 100)}%` }} />
                    </div>
                    <span className="w-10 text-right tabular-nums font-medium">{val.toFixed(0)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* PQS */}
          <div className="card-premium p-5">
            <div className="text-[10px] font-semibold tracking-wider text-text-muted mb-2">PQS Score</div>
            <div className="flex items-baseline gap-2 mb-3">
              <span className="text-3xl font-bold text-brand-teal">{myPqs?.pqs.toFixed(1) ?? '—'}</span>
              <span className="text-sm text-text-muted">#{myPqsRank} of {pqsResults.length}</span>
              {portfolioMix && (
                <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                  portfolioMix.isDiversified ? 'bg-green-100 text-green-700' :
                  portfolioMix.isConcentrated ? 'bg-red-100 text-red-700' :
                  'bg-yellow-100 text-yellow-700'
                }`}>
                  {portfolioMix.isDiversified ? 'Diversified' : portfolioMix.isConcentrated ? 'Concentrated' : 'Moderate'}
                </span>
              )}
            </div>
            {myPqs && (
              <div className="space-y-1.5">
                {Object.entries(myPqs.dimensions).map(([key, val]) => (
                  <div key={key} className="flex items-center gap-2 text-xs">
                    <span className="w-20 text-text-muted truncate capitalize">{key.replace(/_/g, ' ')}</span>
                    <div className="flex-1 h-2 bg-surface-light rounded-full overflow-hidden">
                      <div className="h-full bg-brand-teal/60 rounded-full" style={{ width: `${Math.min(val, 100)}%` }} />
                    </div>
                    <span className="w-10 text-right tabular-nums font-medium">{val.toFixed(0)}</span>
                  </div>
                ))}
              </div>
            )}
            {/* Portfolio mix breakdown */}
            {portfolioMix && portfolioMix.sorted.length > 0 && (
              <div className="mt-3 pt-2 border-t border-border-subtle">
                <div className="text-[9px] font-semibold tracking-wider text-text-muted mb-1.5">Portfolio Mix</div>
                <div className="flex flex-wrap gap-1.5">
                  {portfolioMix.sorted.map(([sc, count]) => (
                    <span key={sc} className="text-[10px] bg-surface-light border border-border-subtle rounded px-1.5 py-0.5 text-text-secondary">
                      {sc}: <span className="font-bold text-text-primary">{count}</span>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Radar */}
          {radarData.length > 0 && (
            <div className="card-premium p-5">
              <div className="text-[10px] font-semibold tracking-wider text-text-muted mb-2">Performance Radar</div>
              <div className="h-[230px]">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={radarData} outerRadius="70%">
                    <PolarGrid stroke="#EFECEA" />
                    <PolarAngleAxis dataKey="metric" tick={{ fontSize: 9, fill: '#8A94A0' }} />
                    <PolarRadiusAxis tick={false} axisLine={false} domain={[0, 100]} />
                    <Radar name="Agent" dataKey="agent" stroke="#1B5299" fill="#1B5299" fillOpacity={0.2} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>
      </AnimatedSection>

      {/* ═══ Row 2: YTD KPIs + GCI trend ═══ */}
      <AnimatedSection delay={0.15}>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
          {[
            { label: 'GCI', value: fmtEur(ytd.gci), color: '#C9961A' },
            { label: 'Κλεισίματα', value: fmt(ytd.closings), color: '#D4722A' },
            { label: 'Καταγραφές', value: fmt(ytd.registrations), color: '#1B5299' },
            { label: 'Αποκλειστικές', value: fmt(ytd.exclusives), color: '#168F80' },
            { label: 'Υποδείξεις', value: fmt(ytd.showings), color: '#6B5CA5' },
            { label: 'Προσφορές', value: fmt(ytd.offers), color: '#C9961A' },
          ].map(kpi => (
            <div key={kpi.label} className="card-premium p-4 text-center">
              <div className="text-[10px] font-semibold tracking-wider text-text-muted mb-1">{kpi.label}</div>
              <div className="text-xl font-bold" style={{ color: kpi.color }}>{kpi.value}</div>
            </div>
          ))}
        </div>
        {monthlyGci.length >= 2 && (
          <div className="flex items-center gap-3 mt-3 card-premium p-3">
            <span className="text-xs text-text-muted">GCI trend {currentYear}:</span>
            <TrendSparkline data={monthlyGci} width={200} height={32} color="#C9961A" />
          </div>
        )}
      </AnimatedSection>

      {/* ═══ Row 3: Business Plan + Conversions + Quality ═══ */}
      <AnimatedSection delay={0.2}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Business Plan */}
          <div className="card-premium p-5">
            <h3 className="text-sm font-semibold text-text-primary mb-3">Business Plan {currentYear}</h3>
            {agentTargets && (agentTargets.gci_target || agentTargets.exclusives_target) ? (
              <div className="flex flex-wrap justify-center gap-6">
                {agentTargets.gci_target != null && agentTargets.gci_target > 0 && (
                  <GaugeMeter value={ytd.gci} target={agentTargets.gci_target} label="GCI Target" size={130} />
                )}
                {agentTargets.gci_realistic != null && agentTargets.gci_realistic > 0 && (
                  <GaugeMeter value={ytd.gci} target={agentTargets.gci_realistic} label="GCI Realistic" size={130} />
                )}
                {agentTargets.exclusives_target != null && agentTargets.exclusives_target > 0 && (
                  <GaugeMeter value={ytd.exclusives} target={agentTargets.exclusives_target} label="Αποκλειστικές" size={130} />
                )}
              </div>
            ) : (
              <p className="text-xs text-text-muted italic text-center py-4">Δεν έχουν οριστεί στόχοι</p>
            )}
          </div>

          {/* Conversion Rates */}
          <div className="card-premium p-5">
            <h3 className="text-sm font-semibold text-text-primary mb-3">Αναλογίες Μετατροπής ({period.label})</h3>
            <table className="w-full text-xs">
              <thead>
                <tr className="text-text-muted border-b border-border-default">
                  <th className="text-left pb-1.5 font-medium">Ratio</th>
                  <th className="text-right pb-1.5 font-medium text-brand-blue">Agent</th>
                  <th className="text-right pb-1.5 font-medium text-brand-gold">Office</th>
                  <th className="text-right pb-1.5 font-medium text-text-secondary">Company</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { label: 'Καταγραφή → Ανάθεση', a: agentConv.reg_to_excl, o: officeConv.reg_to_excl, c: companyConv.reg_to_excl },
                  { label: 'Ανάθεση → Κλείσιμο', a: agentConv.excl_to_closing, o: officeConv.excl_to_closing, c: companyConv.excl_to_closing },
                  { label: 'Υπόδειξη → Προσφορά', a: agentConv.showing_to_offer, o: officeConv.showing_to_offer, c: companyConv.showing_to_offer },
                  { label: 'Προσφορά → Κλείσιμο', a: agentConv.offer_to_closing, o: officeConv.offer_to_closing, c: companyConv.offer_to_closing },
                ].map(row => {
                  const fmtR = (v: number | null) => v != null ? `${v.toLocaleString('el-GR', { minimumFractionDigits: 1, maximumFractionDigits: 2 })}:1` : '—';
                  return (
                  <tr key={row.label} className="border-b border-border-subtle">
                    <td className="py-2 text-text-primary font-medium">{row.label}</td>
                    <td className={`py-2 text-right font-semibold tabular-nums ${
                      row.a != null && row.c != null ? (row.a < row.c ? 'text-green-600' : row.a > row.c ? 'text-red-600' : '') : ''
                    }`}>{fmtR(row.a)}</td>
                    <td className="py-2 text-right tabular-nums">{fmtR(row.o)}</td>
                    <td className="py-2 text-right tabular-nums text-text-secondary">{fmtR(row.c)}</td>
                  </tr>);
                })}
              </tbody>
            </table>
          </div>

          {/* Quality Metrics */}
          <div className="card-premium p-5">
            <h3 className="text-sm font-semibold text-text-primary mb-3">Δείκτες Ποιότητας</h3>
            <table className="w-full text-xs">
              <thead>
                <tr className="text-text-muted border-b border-border-default">
                  <th className="text-left pb-1.5 font-medium">Metric</th>
                  <th className="text-right pb-1.5 font-medium text-brand-blue">Agent</th>
                  <th className="text-right pb-1.5 font-medium text-text-secondary">Company</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { label: 'Καταγραφή → Ανάθεση', a: agentQuality.avg_days_reg_to_excl, c: companyQuality.avg_days_reg_to_excl, s: 'd' },
                  { label: 'Ανάθεση → Προσφορά', a: agentQuality.avg_days_excl_to_offer, c: companyQuality.avg_days_excl_to_offer, s: 'd' },
                  { label: 'Προσφορά → Κλείσιμο', a: agentQuality.avg_days_offer_to_closing, c: companyQuality.avg_days_offer_to_closing, s: 'd' },
                  { label: 'Συνολική Διαδρομή', a: agentQuality.avg_days_total_journey, c: companyQuality.avg_days_total_journey, s: 'd' },
                  { label: 'Διαφορά Τιμής', a: agentQuality.avg_price_delta_pct, c: companyQuality.avg_price_delta_pct, s: '%' },
                ].map(row => (
                  <tr key={row.label} className="border-b border-border-subtle">
                    <td className="py-2 text-text-primary font-medium">{row.label}</td>
                    <td className="py-2 text-right font-semibold tabular-nums">
                      {row.a != null ? `${row.a}${row.s}` : '—'}
                    </td>
                    <td className="py-2 text-right tabular-nums text-text-secondary">
                      {row.c != null ? `${row.c}${row.s}` : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </AnimatedSection>

      {/* ═══ Row 4: Reporting Accuracy ═══ */}
      {accuracyData.length > 0 && (
        <AnimatedSection delay={0.25}>
          <div className="card-premium p-5">
            <h3 className="text-sm font-semibold text-text-primary mb-3">Reporting Accuracy — CRM vs ACC</h3>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={accuracyData} margin={{ top: 10, right: 10, left: 0, bottom: 40 }}>
                  <XAxis dataKey="kpi" tick={{ fontSize: 10, fill: '#8A94A0' }} angle={-30} textAnchor="end" interval={0} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: '#8A94A0' }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #DDD8D0', fontSize: 12, boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="crm" name="CRM" fill="#1B5299" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="acc" name="ACC" fill="#C9961A" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </AnimatedSection>
      )}

      {/* ═══ Row 5: Activity (ACC) + Summary ═══ */}
      <AnimatedSection delay={0.3}>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* ACC Activity */}
          {agentActivity && (
            <div className="card-premium p-5">
              <h3 className="text-sm font-semibold text-text-primary mb-1">Δραστηριότητα (ACC)</h3>
              <p className="text-[10px] text-text-muted mb-3">Πηγή: Αυτο-αναφορά ({period.label})</p>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: 'Cold Calls', value: agentActivity.cold_calls },
                  { label: 'Follow Ups', value: agentActivity.follow_ups },
                  { label: 'Συναντήσεις', value: agentActivity.meetings },
                  { label: 'Επαφές', value: agentActivity.leads },
                  { label: 'Μάρκετινγκ', value: agentActivity.marketing },
                  { label: 'Social', value: agentActivity.social },
                  { label: 'Καλλιέργεια', value: agentActivity.cultivation },
                  { label: 'Απουσίες', value: agentActivity.absences },
                ].map(item => (
                  <div key={item.label} className="flex items-center justify-between px-3 py-2 bg-surface rounded-lg border border-border-subtle">
                    <span className="text-xs text-text-muted">{item.label}</span>
                    <span className="text-sm font-bold text-text-primary">{fmt(item.value)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Showings + Withdrawals + Stuck */}
          <div className="space-y-4">
            <div className="card-premium p-5">
              <div className="grid grid-cols-2 gap-3">
                <div className="text-center p-3 bg-surface rounded-lg border border-border-subtle">
                  <span className="text-xs text-text-muted block mb-1">Υποδείξεις (All-time)</span>
                  <span className="text-2xl font-bold text-brand-purple">{fmt(totalShowings)}</span>
                </div>
                <div className="text-center p-3 bg-surface rounded-lg border border-border-subtle">
                  <span className="text-xs text-text-muted block mb-1">Αποσύρσεις (YTD)</span>
                  <span className="text-2xl font-bold text-brand-red">{fmt(totalWithdrawals)}</span>
                </div>
              </div>
              {allWithdrawalReasons.length > 0 && (
                <div className="mt-3 space-y-1">
                  {allWithdrawalReasons.slice(0, 5).map(([reason, cnt]) => (
                    <div key={reason} className="flex items-center gap-2 text-xs">
                      <span className="text-text-secondary flex-1 truncate">{reason}</span>
                      <span className="font-semibold tabular-nums">{cnt}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Expiring mandates alert */}
            {expiringMandates.length > 0 && (
              <div className="card-premium p-4 border-l-4 border-l-amber-400">
                <h4 className="text-xs font-semibold text-amber-700 mb-2">
                  Αποκλειστικές που λήγουν σε 30 ημέρες ({expiringMandates.length})
                </h4>
                {expiringMandates.map(e => (
                  <div key={e.id} className="flex items-center justify-between text-xs py-1">
                    <PropertyLink propertyId={e.property_id!} code={e.property_code || e.property_id!} className="text-xs font-medium" />
                    <span className="text-amber-600 font-medium">{formatDateEL(e.end_date)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </AnimatedSection>

      {/* ═══ Row 6: Active Mandates ═══ */}
      <AnimatedSection delay={0.35}>
        <div className="card-premium p-5">
          <h3 className="text-sm font-semibold text-text-primary mb-3">
            Ενεργές Αποκλειστικές ({portfolioItems.length})
          </h3>
          {portfolioItems.length === 0 ? (
            <p className="text-xs text-text-muted italic">Δεν υπάρχουν ενεργές αποκλειστικές</p>
          ) : (
            <div className="overflow-x-auto max-h-[300px] overflow-y-auto">
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-surface-card">
                  <tr className="text-left text-text-muted border-b border-border-default text-[10px] tracking-wider">
                    <th className="pb-2 pr-3 font-semibold">Code</th>
                    <th className="pb-2 pr-3 font-semibold">Τύπος</th>
                    <th className="pb-2 pr-3 font-semibold">Περιοχή</th>
                    <th className="pb-2 pr-3 font-semibold text-right">Τιμή</th>
                    <th className="pb-2 pr-3 font-semibold text-right">DOM</th>
                    <th className="pb-2 font-semibold text-right">Λήξη</th>
                  </tr>
                </thead>
                <tbody>
                  {portfolioItems.map(e => {
                    const p = e.properties;
                    const propId = e.property_id ?? p?.property_id;
                    const code = e.property_code || p?.property_code || propId || '—';
                    const thirtyDaysFromNow = new Date(Date.now() + 30 * 86400000);
                    const isExpiringSoon = e.end_date && new Date(e.end_date) <= thirtyDaysFromNow;
                    return (
                      <tr key={e.id} className={`border-b border-border-subtle ${isExpiringSoon ? 'bg-amber-50' : ''}`}>
                        <td className="py-2 pr-3">
                          {propId ? <PropertyLink propertyId={propId} code={code} className="text-xs font-medium" siblingIds={allPropertyIds} /> : <span className="text-text-muted">{code}</span>}
                        </td>
                        <td className="py-2 pr-3 text-text-secondary">{p?.subcategory || '—'}</td>
                        <td className="py-2 pr-3 text-text-secondary truncate max-w-[120px]">{p?.area || '—'}</td>
                        <td className="py-2 pr-3 text-right tabular-nums">{fmtEur(p?.price)}</td>
                        <td className="py-2 pr-3 text-right tabular-nums">{p?.days_on_market ?? '—'}</td>
                        <td className={`py-2 text-right tabular-nums ${isExpiringSoon ? 'text-amber-600 font-semibold' : 'text-text-muted'}`}>
                          {formatDateEL(e.end_date)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </AnimatedSection>

      {/* ═══ Row 7: Stuck Alerts ═══ */}
      {myStuckAlerts.length > 0 && (
        <AnimatedSection delay={0.4}>
          <div className="card-premium p-5">
            <h3 className="text-sm font-semibold text-brand-red mb-3">
              Stuck Alerts ({myStuckAlerts.length})
            </h3>
            <div className="space-y-2">
              {myStuckAlerts.map(alert => (
                <div key={alert.property_id} className="flex items-center gap-3 text-xs bg-red-50 rounded-lg px-4 py-2.5 border border-red-100">
                  <PropertyLink propertyId={alert.property_id} code={alert.property_code || alert.property_id} className="text-xs font-medium" />
                  <span className="text-text-muted">{alert.subcategory}</span>
                  <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-[10px] font-semibold">{alert.current_stage}</span>
                  <span className="ml-auto font-bold text-brand-red">{alert.days_since_activity}d</span>
                  <span className="text-text-muted">(avg: {alert.office_avg_days}d, +{alert.days_over_avg}d)</span>
                </div>
              ))}
            </div>
          </div>
        </AnimatedSection>
      )}

      {/* ═══ Row 8: Recent Closings ═══ */}
      <AnimatedSection delay={0.45}>
        <div className="card-premium p-5">
          <h3 className="text-sm font-semibold text-text-primary mb-3">
            Πρόσφατα Κλεισίματα ({recentClosings.length})
          </h3>
          {recentClosings.length === 0 ? (
            <p className="text-xs text-text-muted italic">Δεν υπάρχουν κλεισίματα</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-left text-text-muted border-b border-border-default text-[10px] tracking-wider">
                    <th className="pb-2 pr-3 font-semibold">Code</th>
                    <th className="pb-2 pr-3 font-semibold">Περιοχή</th>
                    <th className="pb-2 pr-3 font-semibold text-right">Τιμή</th>
                    <th className="pb-2 pr-3 font-semibold text-right">GCI</th>
                    <th className="pb-2 font-semibold text-right">Ημ/νία</th>
                  </tr>
                </thead>
                <tbody>
                  {recentClosings.map(c => (
                    <tr key={c.id} className="border-b border-border-subtle">
                      <td className="py-2 pr-3">
                        {c.property_id ? (
                          <PropertyLink propertyId={c.property_id} code={c.property_code || c.property_id} className="text-xs font-medium" siblingIds={allPropertyIds} />
                        ) : (
                          <span className="text-text-muted">{c.property_code || '—'}</span>
                        )}
                      </td>
                      <td className="py-2 pr-3 text-text-secondary truncate max-w-[120px]">{c.properties?.area || '—'}</td>
                      <td className="py-2 pr-3 text-right tabular-nums">{fmtEur(c.price ?? c.properties?.price)}</td>
                      <td className="py-2 pr-3 text-right tabular-nums font-medium text-brand-gold">{fmtEur(c.gci)}</td>
                      <td className="py-2 text-right tabular-nums text-text-muted">{formatDateEL(c.closing_date)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </AnimatedSection>
    </div>
  );
}
