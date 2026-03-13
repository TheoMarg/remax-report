import { useMemo } from 'react';
import { useAgentDetail } from '../../hooks/useAgentDetail';
import { usePropertyJourneys } from '../../hooks/usePropertyJourneys';
import { usePortfolioQuality } from '../../hooks/usePortfolioQuality';
import { useKpiWeights } from '../../hooks/useKpiWeights';
import { usePqsWeights } from '../../hooks/usePqsWeights';
import { useMetrics } from '../../hooks/useMetrics';
import { useStuckAlerts } from '../../hooks/useStuckAlerts';
import type { Period } from '../../lib/types';
import { useConversionRates } from '../../hooks/useConversionRates';
import { useQualityMetrics } from '../../hooks/useQualityMetrics';
import { useWeightedScores } from '../../hooks/useWeightedScores';
import { usePortfolioScores } from '../../hooks/usePortfolioScores';
import { PropertyLink } from '../ui/PropertyLink';
import { EntityLink } from '../shared/EntityLink';
import { StatusBadge } from '../shared/StatusBadge';
import { TrendSparkline } from '../shared/TrendSparkline';
import { useAgentTargets } from '../../hooks/useAgentTargets';
import { usePacing } from '../../hooks/usePacing';
import { formatDateEL } from '../../lib/propertyMetrics';

const OFFICE_LABEL: Record<string, string> = {
  larissa: 'Λάρισα',
  katerini: 'Κατερίνη',
};

const PQS_DIM_LABELS: Record<string, string> = {
  freshness: 'Freshness (DOM)',
  exclusive_ratio: 'Exclusive Ratio',
  activity_level: 'Activity Level',
  pricing_accuracy: 'Pricing Accuracy',
  pipeline_depth: 'Pipeline Depth',
  demand_score: 'Demand Score',
};

function fmt(n: number | null | undefined): string {
  if (n == null) return '—';
  return n.toLocaleString('el-GR');
}

function fmtEur(n: number | null | undefined): string {
  if (n == null) return '—';
  return `€${n.toLocaleString('el-GR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}


interface Props {
  agentId: number;
}

export function Agent360Content({ agentId }: Props) {
  const { profile, metrics, closings, portfolio, showingsCount, targets, withdrawals, isLoading } = useAgentDetail(agentId);
  // YTD period for journeys & comparisons (full current year)
  const currentYearStr = new Date().getFullYear().toString();
  const ytdPeriod = useMemo<Period>(() => ({
    type: 'year',
    start: `${currentYearStr}-01-01`,
    end: `${currentYearStr}-12-31`,
    label: `YTD ${currentYearStr}`,
  }), [currentYearStr]);

  // v2 data
  const { data: allMetrics = [] } = useMetrics(ytdPeriod);
  const { data: journeys = [] } = usePropertyJourneys(ytdPeriod);
  const { data: qualityData = [] } = usePortfolioQuality();
  const { data: kpiWeights = [] } = useKpiWeights();
  const { data: pqsWeights = [] } = usePqsWeights();
  const { data: stuckAlerts = [] } = useStuckAlerts();

  const agent = profile.data;
  const metricsData = metrics.data ?? [];

  // Rookie check
  const isRookie = (() => {
    if (!agent?.start_date) return false;
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    return new Date(agent.start_date) > sixMonthsAgo;
  })();

  // YTD aggregation
  const currentYear = new Date().getFullYear().toString();
  const ytdMetrics = metricsData.filter(m => m.period_start.startsWith(currentYear));
  const ytdGci = ytdMetrics.reduce((s, m) => s + (m.gci || 0), 0);
  const ytdClosings = ytdMetrics.reduce((s, m) => s + (m.crm_closings || 0), 0);
  const ytdRegistrations = ytdMetrics.reduce((s, m) => s + (m.crm_registrations || 0), 0);
  const ytdExclusives = ytdMetrics.reduce((s, m) => s + (m.crm_exclusives || 0), 0);
  const ytdShowings = ytdMetrics.reduce((s, m) => s + (m.crm_showings || 0), 0);
  const ytdOffers = ytdMetrics.reduce((s, m) => s + (m.crm_offers || 0), 0);

  // Monthly GCI trend for sparkline
  const monthlyGci = metricsData
    .filter(m => m.period_start.startsWith(currentYear))
    .sort((a, b) => a.period_start.localeCompare(b.period_start))
    .map(m => m.gci || 0);

  const portfolioItems = portfolio.data ?? [];
  const recentClosings = closings.data ?? [];
  const totalShowings = showingsCount.data ?? 0;
  const agentTargets = targets.data;
  const withdrawalData = withdrawals.data ?? {};

  // Portfolio mix analysis
  const portfolioMix = (() => {
    if (portfolioItems.length === 0) return null;
    const counts = new Map<string, number>();
    for (const e of portfolioItems) {
      const sc = e.properties?.subcategory || 'Άλλο';
      counts.set(sc, (counts.get(sc) ?? 0) + 1);
    }
    const total = portfolioItems.length;
    const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]);
    const maxPct = sorted.length > 0 ? (sorted[0][1] / total) * 100 : 0;
    return { isDiversified: maxPct <= 40, isConcentrated: maxPct > 60 };
  })();

  // WPS & PQS scores
  const startDates: Record<number, string | null> = {};
  if (agent) startDates[agentId] = agent.start_date;
  const wpsResults = useWeightedScores(allMetrics, kpiWeights, startDates);
  const pqsResults = usePortfolioScores(qualityData, pqsWeights);

  const myWps = wpsResults.find(w => w.agent_id === agentId);
  const myWpsRank = wpsResults.findIndex(w => w.agent_id === agentId) + 1;
  const myPqs = pqsResults.find(p => p.agent_id === agentId);
  const myPqsRank = pqsResults.findIndex(p => p.agent_id === agentId) + 1;

  // Conversion rates: agent vs office vs company
  const agentJourneys = journeys.filter(j => j.agent_id === agentId);
  const officeJourneys = agent?.office ? journeys.filter(j => j.office === agent.office) : [];
  const { total: agentConv } = useConversionRates(agentJourneys);
  const { total: officeConv } = useConversionRates(officeJourneys);
  const { total: companyConv } = useConversionRates(journeys);

  // Quality metrics
  const { total: agentQuality } = useQualityMetrics(agentJourneys);
  const { total: companyQuality } = useQualityMetrics(journeys);
  const { total: officeQuality } = useQualityMetrics(officeJourneys);

  // Target pacing
  const currentYearNum = new Date().getFullYear();
  const { data: allTargets } = useAgentTargets(currentYearNum);
  const allPacing = usePacing(allMetrics, allTargets);
  const agentPacing = useMemo(() => {
    const found = allPacing.find(p => p.agent_id === agentId);
    return found?.metrics ?? [];
  }, [allPacing, agentId]);
  const idealPctLabel = useMemo(() => {
    const now = new Date();
    const dayOfYear = Math.floor((now.getTime() - new Date(now.getFullYear(), 0, 0).getTime()) / 86400000);
    return Math.round((dayOfYear / 365) * 100);
  }, []);

  // KPI comparisons: office avg + company avg (excluding self)
  const kpiComparisons = useMemo(() => {
    if (allMetrics.length === 0) return null;
    const individuals = allMetrics.filter(m => !m.is_team && m.period_start.startsWith(currentYear));
    const agentOffice = agent?.office;
    const fields = [
      { key: 'gci', field: 'gci' },
      { key: 'closings', field: 'crm_closings' },
      { key: 'registrations', field: 'crm_registrations' },
      { key: 'exclusives', field: 'crm_exclusives' },
      { key: 'showings', field: 'crm_showings' },
      { key: 'offers', field: 'crm_offers' },
    ] as const;
    const result: Record<string, { officeAvg: number; companyAvg: number }> = {};
    for (const { key, field } of fields) {
      const officeMap = new Map<number, number>();
      const companyMap = new Map<number, number>();
      for (const m of individuals) {
        if (m.agent_id === agentId) continue;
        const val = Number(m[field as keyof typeof m]) || 0;
        companyMap.set(m.agent_id, (companyMap.get(m.agent_id) || 0) + val);
        if (agentOffice && m.office === agentOffice) {
          officeMap.set(m.agent_id, (officeMap.get(m.agent_id) || 0) + val);
        }
      }
      const officeVals = Array.from(officeMap.values());
      const companyVals = Array.from(companyMap.values());
      result[key] = {
        officeAvg: officeVals.length > 0 ? officeVals.reduce((s, v) => s + v, 0) / officeVals.length : 0,
        companyAvg: companyVals.length > 0 ? companyVals.reduce((s, v) => s + v, 0) / companyVals.length : 0,
      };
    }
    return result;
  }, [allMetrics, agentId, agent?.office, currentYear]);

  // Stuck alerts for this agent
  const myStuckAlerts = stuckAlerts.filter(a => a.agent_id === agentId);

  // Withdrawal reasons
  const allWithdrawalReasons = Object.entries(withdrawalData).sort(([, a], [, b]) => b - a);
  const totalWithdrawals = allWithdrawalReasons.reduce((s, [, cnt]) => s + cnt, 0);

  // Property IDs for navigation
  const closingPropertyIds = recentClosings.map(c => c.property_id).filter(Boolean) as string[];
  const portfolioPropertyIds = portfolioItems.map(e => e.property_id).filter(Boolean) as string[];
  const allPropertyIds = [...new Set([...closingPropertyIds, ...portfolioPropertyIds])];

  if (isLoading) {
    return (
      <div className="p-8 space-y-4">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="h-16 bg-surface-light rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="p-5 space-y-5">
      {/* ── Header ── */}
      <div>
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-bold text-text-primary">
            {agent?.canonical_name || `Agent #${agentId}`}
          </h2>
          {isRookie && <StatusBadge status="rookie" />}
          {agent?.is_active === false && <StatusBadge status="closed" />}
        </div>
        <div className="flex items-center gap-2 mt-1 text-sm text-text-muted flex-wrap">
          {agent?.office && (
            <EntityLink type="office" id={agent.office} label={OFFICE_LABEL[agent.office] || agent.office} className="text-sm" />
          )}
          {agent?.start_date && (
            <span className="text-xs">Μέλος από: {formatDateEL(agent.start_date)}</span>
          )}
        </div>
        {(agent?.email || agent?.phone) && (
          <div className="flex items-center gap-4 mt-1 text-xs text-text-muted">
            {agent.email && <span>{agent.email}</span>}
            {agent.phone && <span>{agent.phone}</span>}
          </div>
        )}
      </div>

      {/* ── WPS & PQS Scores ── */}
      {(myWps || myPqs) && (
        <div className="grid grid-cols-2 gap-3">
          {myWps && (
            <div className="bg-surface rounded-lg p-3 border border-border-subtle">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-text-muted mb-1">WPS Score (Απόδοση)</div>
              <div className="flex items-baseline gap-2">
                <span className="text-xl font-bold text-brand-blue">{myWps.wps.toFixed(1)}</span>
                <span className="text-xs text-text-muted">#{myWpsRank} of {wpsResults.length}</span>
              </div>
              {isRookie && <span className="text-[9px] text-brand-purple font-medium">x2 rookie bonus</span>}
              {/* WPS breakdown mini bars */}
              <div className="mt-2 space-y-1">
                {Object.entries(myWps.breakdown).map(([key, val]) => (
                  <div key={key} className="flex items-center gap-2 text-[10px]">
                    <span className="w-20 shrink-0 text-text-muted capitalize">{key}</span>
                    <div className="flex-1 h-1 bg-border-subtle rounded-full overflow-hidden">
                      <div className="h-full bg-brand-blue/60 rounded-full" style={{ width: `${Math.min((val / (myWps.wps || 1)) * 100, 100)}%` }} />
                    </div>
                    <span className="w-8 text-right tabular-nums">{val.toFixed(0)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {myPqs && (
            <div className="bg-surface rounded-lg p-3 border border-border-subtle">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-text-muted mb-1">PQS Score (Ποιότητα)</div>
              <div className="flex items-baseline gap-2">
                <span className="text-xl font-bold text-brand-teal">{myPqs.pqs.toFixed(1)}</span>
                <span className="text-xs text-text-muted">#{myPqsRank} of {pqsResults.length}</span>
                {portfolioMix && (
                  <span className={`text-[9px] font-semibold px-1 py-0.5 rounded ${
                    portfolioMix.isDiversified ? 'bg-green-100 text-green-700' :
                    portfolioMix.isConcentrated ? 'bg-red-100 text-red-700' :
                    'bg-yellow-100 text-yellow-700'
                  }`}>
                    Mix: {portfolioMix.isDiversified ? 'Div.' : portfolioMix.isConcentrated ? 'Conc.' : 'Mod.'}
                  </span>
                )}
              </div>
              <div className="mt-2 space-y-1">
                {Object.entries(myPqs.dimensions).map(([key, val]) => (
                  <div key={key} className="flex items-center gap-2 text-[10px]">
                    <span className="w-28 shrink-0 text-text-muted">{PQS_DIM_LABELS[key] ?? key}</span>
                    <div className="flex-1 h-1 bg-border-subtle rounded-full overflow-hidden">
                      <div className="h-full bg-brand-teal/60 rounded-full" style={{ width: `${Math.min(val, 100)}%` }} />
                    </div>
                    <span className="w-8 text-right tabular-nums">{val.toFixed(0)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Target Pacing ── */}
      {agentPacing.length > 0 && (
        <div className="bg-surface rounded-lg p-3 border border-border-subtle">
          <div className="text-[9px] font-semibold uppercase tracking-wider text-text-muted mb-2">
            Target Pacing (Πορεία Στόχων) — {idealPctLabel}% of year
          </div>
          <div className="space-y-1.5">
            {agentPacing.map(p => {
              const actualPct = p.target > 0 ? (p.actual / p.target) * 100 : 0;
              const idealPct = p.target > 0 ? (p.ideal / p.target) * 100 : 0;
              return (
                <div key={p.metric} className="flex items-center gap-2">
                  <span className="text-[10px] text-text-muted w-16 shrink-0 truncate">{p.metric}</span>
                  <div className="flex-1 h-2 bg-surface-light rounded-full overflow-hidden relative">
                    <div
                      className="absolute top-0 h-full w-px bg-text-muted/40"
                      style={{ left: `${Math.min(idealPct, 100)}%` }}
                    />
                    <div
                      className={`h-full rounded-full transition-all ${
                        p.status === 'ahead' ? 'bg-brand-green' :
                        p.status === 'on_track' ? 'bg-brand-blue' :
                        p.status === 'behind' ? 'bg-brand-gold' :
                        'bg-brand-red'
                      }`}
                      style={{ width: `${Math.min(actualPct, 100)}%` }}
                    />
                  </div>
                  <span className={`text-[10px] font-bold tabular-nums w-10 text-right ${
                    p.status === 'ahead' ? 'text-brand-green' :
                    p.status === 'on_track' ? 'text-brand-blue' :
                    p.status === 'behind' ? 'text-brand-gold' :
                    'text-brand-red'
                  }`}>
                    {Math.round(actualPct)}%
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── YTD KPI summary ── */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: 'GCI (Τζίρος)', value: fmtEur(ytdGci), raw: ytdGci, key: 'gci', color: '#C9961A', isEur: true },
          { label: 'Closings (Κλεισ.)', value: fmt(ytdClosings), raw: ytdClosings, key: 'closings', color: '#D4722A', isEur: false },
          { label: 'Registrations (Καταγρ.)', value: fmt(ytdRegistrations), raw: ytdRegistrations, key: 'registrations', color: '#1B5299', isEur: false },
          { label: 'Exclusives (Αποκλ.)', value: fmt(ytdExclusives), raw: ytdExclusives, key: 'exclusives', color: '#168F80', isEur: false },
          { label: 'Showings (Υποδ.)', value: fmt(ytdShowings), raw: ytdShowings, key: 'showings', color: '#6B5CA5', isEur: false },
          { label: 'Offers (Προσφ.)', value: fmt(ytdOffers), raw: ytdOffers, key: 'offers', color: '#C9961A', isEur: false },
        ].map(kpi => {
          const comp = kpiComparisons?.[kpi.key];
          const valueColor = comp
            ? kpi.raw > comp.companyAvg ? '#1D7A4E'
              : kpi.raw < comp.companyAvg * 0.7 ? '#C9372C'
              : kpi.color
            : kpi.color;
          return (
            <div key={kpi.label} className="bg-surface rounded-lg p-2.5 text-center border border-border-subtle">
              <div className="text-[9px] font-semibold uppercase tracking-wider text-text-muted">{kpi.label}</div>
              <div className="text-base font-bold mt-0.5" style={{ color: valueColor }}>{kpi.value}</div>
              {comp && (comp.officeAvg > 0 || comp.companyAvg > 0) && (
                <div className="mt-1 space-y-0.5">
                  {comp.officeAvg > 0 && (
                    <div className="text-[8px] text-text-muted">
                      Μ.Ο. Γραφ: <span className="font-semibold text-text-secondary">{kpi.isEur ? fmtEur(Math.round(comp.officeAvg)) : comp.officeAvg.toFixed(1)}</span>
                    </div>
                  )}
                  {comp.companyAvg > 0 && (
                    <div className="text-[8px] text-text-muted">
                      Μ.Ο. Εταιρ: <span className="font-semibold text-text-secondary">{kpi.isEur ? fmtEur(Math.round(comp.companyAvg)) : comp.companyAvg.toFixed(1)}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* GCI Trend sparkline */}
      {monthlyGci.length >= 2 && (
        <div className="flex items-center gap-3 bg-surface rounded-lg p-3 border border-border-subtle">
          <span className="text-xs text-text-muted">GCI trend {currentYear}:</span>
          <TrendSparkline data={monthlyGci} width={120} height={28} color="#C9961A" />
        </div>
      )}

      {/* ── Conversion Rates ── */}
      {agentJourneys.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-text-primary mb-2">Conversion Rates (Ποσοστά Μετατροπής) — {ytdPeriod.label}</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-text-muted border-b border-border-default">
                  <th className="text-left pb-1.5 pr-2 font-medium">Ratio</th>
                  <th className="text-right pb-1.5 px-2 font-medium text-brand-blue">Agent</th>
                  <th className="text-right pb-1.5 px-2 font-medium text-brand-gold">Office</th>
                  <th className="text-right pb-1.5 pl-2 font-medium text-text-secondary">Company</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { label: 'Reg → Excl', a: agentConv.reg_to_excl_pct, o: officeConv.reg_to_excl_pct, c: companyConv.reg_to_excl_pct },
                  { label: 'Excl → Close', a: agentConv.excl_to_closing_pct, o: officeConv.excl_to_closing_pct, c: companyConv.excl_to_closing_pct },
                  { label: 'Show → Offer', a: agentConv.showing_to_offer_pct, o: officeConv.showing_to_offer_pct, c: companyConv.showing_to_offer_pct },
                  { label: 'Offer → Close', a: agentConv.offer_to_closing_pct, o: officeConv.offer_to_closing_pct, c: companyConv.offer_to_closing_pct },
                ].map(row => (
                  <tr key={row.label} className="border-b border-border-subtle">
                    <td className="py-1.5 pr-2 text-text-primary font-medium">{row.label}</td>
                    <td className={`py-1.5 px-2 text-right font-semibold tabular-nums ${
                      row.a != null && row.c != null && row.a > row.c ? 'text-green-600' : row.a != null && row.c != null && row.a < row.c ? 'text-red-600' : ''
                    }`}>
                      {row.a != null ? `${row.a}%` : '—'}
                    </td>
                    <td className="py-1.5 px-2 text-right tabular-nums">{row.o != null ? `${row.o}%` : '—'}</td>
                    <td className="py-1.5 pl-2 text-right tabular-nums text-text-secondary">{row.c != null ? `${row.c}%` : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Quality Metrics ── */}
      {agentJourneys.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-text-primary mb-2">Quality Metrics (Δείκτες Ποιότητας)</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-text-muted border-b border-border-default">
                  <th className="text-left pb-1.5 pr-2 font-medium">Metric</th>
                  <th className="text-right pb-1.5 px-2 font-medium text-brand-blue">Agent</th>
                  <th className="text-right pb-1.5 px-2 font-medium text-brand-gold">Office</th>
                  <th className="text-right pb-1.5 pl-2 font-medium text-text-secondary">Company</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { label: 'Avg Reg → Excl', a: agentQuality.avg_days_reg_to_excl, o: officeQuality.avg_days_reg_to_excl, c: companyQuality.avg_days_reg_to_excl, suffix: 'd' },
                  { label: 'Avg Excl → Offer', a: agentQuality.avg_days_excl_to_offer, o: officeQuality.avg_days_excl_to_offer, c: companyQuality.avg_days_excl_to_offer, suffix: 'd' },
                  { label: 'Avg Offer → Close', a: agentQuality.avg_days_offer_to_closing, o: officeQuality.avg_days_offer_to_closing, c: companyQuality.avg_days_offer_to_closing, suffix: 'd' },
                  { label: 'Avg Total Journey', a: agentQuality.avg_days_total_journey, o: officeQuality.avg_days_total_journey, c: companyQuality.avg_days_total_journey, suffix: 'd' },
                  { label: 'Price Delta %', a: agentQuality.avg_price_delta_pct, o: officeQuality.avg_price_delta_pct, c: companyQuality.avg_price_delta_pct, suffix: '%' },
                ].map(row => (
                  <tr key={row.label} className="border-b border-border-subtle">
                    <td className="py-1.5 pr-2 text-text-primary font-medium">{row.label}</td>
                    <td className={`py-1.5 px-2 text-right font-semibold tabular-nums ${
                      row.suffix === 'd' && row.a != null && row.c != null
                        ? row.a < row.c ? 'text-green-600' : row.a > row.c ? 'text-red-600' : ''
                        : ''
                    }`}>
                      {row.a != null ? `${row.a}${row.suffix}` : '—'}
                    </td>
                    <td className="py-1.5 px-2 text-right tabular-nums text-text-muted">
                      {row.o != null ? `${row.o}${row.suffix}` : '—'}
                    </td>
                    <td className="py-1.5 pl-2 text-right tabular-nums text-text-secondary">
                      {row.c != null ? `${row.c}${row.suffix}` : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Targets ── */}
      {agentTargets && (agentTargets.gci_target || agentTargets.exclusives_target) && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-text-primary">Business Plan (Στόχοι) {currentYear}</h3>
          <div className="space-y-2">
            {agentTargets.gci_target != null && agentTargets.gci_target > 0 && (
              <TargetBar label="GCI Target" actual={ytdGci} target={agentTargets.gci_target} color="#C9961A" formatter={fmtEur} />
            )}
            {agentTargets.gci_realistic != null && agentTargets.gci_realistic > 0 && (
              <TargetBar label="GCI Realistic" actual={ytdGci} target={agentTargets.gci_realistic} color="#D4722A" formatter={fmtEur} />
            )}
            {agentTargets.exclusives_target != null && agentTargets.exclusives_target > 0 && (
              <TargetBar label="Exclusives" actual={ytdExclusives} target={agentTargets.exclusives_target} color="#168F80" formatter={fmt} />
            )}
          </div>
        </div>
      )}

      {/* ── Recent Closings ── */}
      <div>
        <h3 className="text-sm font-semibold text-text-primary mb-2">
          Recent Closings (Πρόσφατα Κλεισίματα) ({recentClosings.length})
        </h3>
        {recentClosings.length === 0 ? (
          <p className="text-xs text-text-muted italic">Δεν υπάρχουν κλεισίματα</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-text-muted border-b border-border-default">
                  <th className="pb-1.5 pr-3 font-medium">Κωδικός</th>
                  <th className="pb-1.5 pr-3 font-medium">Περιοχή</th>
                  <th className="pb-1.5 pr-3 font-medium text-right">Τιμή</th>
                  <th className="pb-1.5 pr-3 font-medium text-right">GCI</th>
                  <th className="pb-1.5 font-medium text-right">Ημ/νία</th>
                </tr>
              </thead>
              <tbody>
                {recentClosings.map(c => (
                  <tr key={c.id} className="border-b border-border-subtle">
                    <td className="py-1.5 pr-3">
                      {c.property_id ? (
                        <PropertyLink propertyId={c.property_id} code={c.property_code || c.property_id} className="text-xs font-medium" siblingIds={allPropertyIds} />
                      ) : (
                        <span className="text-text-muted">{c.property_code || '—'}</span>
                      )}
                    </td>
                    <td className="py-1.5 pr-3 text-text-secondary truncate max-w-[120px]">
                      {c.properties?.area || '—'}
                    </td>
                    <td className="py-1.5 pr-3 text-right tabular-nums">{fmtEur(c.price ?? c.properties?.price)}</td>
                    <td className="py-1.5 pr-3 text-right tabular-nums font-medium text-brand-gold">{fmtEur(c.gci)}</td>
                    <td className="py-1.5 text-right tabular-nums text-text-muted">{formatDateEL(c.closing_date)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Active Portfolio ── */}
      <div>
        <h3 className="text-sm font-semibold text-text-primary mb-2">
          Active Mandates (Ενεργές Εντολές) ({portfolioItems.length})
        </h3>
        {portfolioItems.length === 0 ? (
          <p className="text-xs text-text-muted italic">Δεν υπάρχουν ενεργές αποκλειστικές</p>
        ) : (
          <div className="overflow-x-auto max-h-[180px] overflow-y-auto">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-surface-card">
                <tr className="text-left text-text-muted border-b border-border-default">
                  <th className="pb-1.5 pr-3 font-medium">Κωδικός</th>
                  <th className="pb-1.5 pr-3 font-medium">Τύπος</th>
                  <th className="pb-1.5 pr-3 font-medium text-right">Τιμή</th>
                  <th className="pb-1.5 font-medium text-right">Λήξη</th>
                </tr>
              </thead>
              <tbody>
                {portfolioItems.map(e => {
                  const p = e.properties;
                  const propId = e.property_id ?? p?.property_id;
                  const code = e.property_code || p?.property_code || propId || '—';
                  return (
                    <tr key={e.id} className="border-b border-border-subtle">
                      <td className="py-1.5 pr-3">
                        {propId ? (
                          <PropertyLink propertyId={propId} code={code} className="text-xs font-medium" siblingIds={allPropertyIds} />
                        ) : (
                          <span className="text-text-muted">{code}</span>
                        )}
                      </td>
                      <td className="py-1.5 pr-3 text-text-secondary">{p?.subcategory || '—'}</td>
                      <td className="py-1.5 pr-3 text-right tabular-nums">{fmtEur(p?.price)}</td>
                      <td className="py-1.5 text-right tabular-nums text-text-muted">{formatDateEL(e.end_date)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Stuck Alerts ── */}
      {myStuckAlerts.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-brand-red mb-2">
            Stuck Alerts ({myStuckAlerts.length})
          </h3>
          <div className="space-y-1.5">
            {myStuckAlerts.slice(0, 5).map(alert => (
              <div key={alert.property_id} className="flex items-center gap-2 text-xs bg-red-50 rounded-lg px-3 py-2 border border-red-100">
                <PropertyLink propertyId={alert.property_id} code={alert.property_code || alert.property_id} className="text-xs font-medium" />
                <span className="text-text-muted">{alert.current_stage}</span>
                <span className="ml-auto font-semibold text-brand-red">{alert.days_since_activity}d</span>
                <span className="text-text-muted">(avg: {alert.office_avg_days}d)</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Showings & Withdrawals summary ── */}
      <div className="grid grid-cols-2 gap-3">
        <div className="flex items-center gap-2 text-sm text-text-secondary bg-surface rounded-lg p-3 border border-border-subtle">
          <span className="text-text-muted text-xs">Showings (Υποδ.):</span>
          <span className="font-bold text-brand-purple">{fmt(totalShowings)}</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-text-secondary bg-surface rounded-lg p-3 border border-border-subtle">
          <span className="text-text-muted text-xs">Withdrawals (Αποσ.):</span>
          <span className="font-bold text-brand-red">{fmt(totalWithdrawals)}</span>
        </div>
      </div>

      {/* ── Withdrawal reasons ── */}
      {allWithdrawalReasons.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-text-primary mb-2">Withdrawal Reasons (Λόγοι Απόσυρσης)</h3>
          <div className="space-y-1">
            {allWithdrawalReasons.map(([reason, cnt]) => (
              <div key={reason} className="flex items-center gap-2 text-xs">
                <span className="text-text-secondary flex-1 truncate">{reason}</span>
                <span className="font-semibold tabular-nums">{cnt}</span>
                <div className="w-20 h-1.5 bg-border-subtle rounded-full overflow-hidden">
                  <div className="h-full rounded-full bg-brand-red/60" style={{ width: `${Math.min((cnt / totalWithdrawals) * 100, 100)}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function TargetBar({ label, actual, target, color, formatter }: {
  label: string; actual: number; target: number; color: string; formatter: (n: number) => string;
}) {
  const pct = target > 0 ? Math.min((actual / target) * 100, 100) : 0;
  const overTarget = target > 0 && actual >= target;
  return (
    <div className="bg-surface rounded-lg p-3 border border-border-subtle">
      <div className="flex items-baseline justify-between mb-1">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-text-muted">{label}</span>
        <span className="text-[10px] text-text-muted">{pct.toFixed(0)}%</span>
      </div>
      <div className="flex items-baseline gap-1.5 mb-2">
        <span className="text-sm font-bold" style={{ color }}>{formatter(actual)}</span>
        <span className="text-[10px] text-text-muted">/ {formatter(target)}</span>
        {overTarget && <span className="text-brand-green text-[9px] font-semibold">Done</span>}
      </div>
      <div className="w-full h-2 bg-border-subtle rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: overTarget ? '#1D7A4E' : color }} />
      </div>
    </div>
  );
}
