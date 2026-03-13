import { useAgentDetail } from '../../hooks/useAgentDetail';
import { usePropertyJourneys } from '../../hooks/usePropertyJourneys';
import { usePortfolioQuality } from '../../hooks/usePortfolioQuality';
import { useKpiWeights } from '../../hooks/useKpiWeights';
import { usePqsWeights } from '../../hooks/usePqsWeights';
import { useMetrics } from '../../hooks/useMetrics';
import { useStuckAlerts } from '../../hooks/useStuckAlerts';
import { usePeriod } from '../../hooks/usePeriod';
import { useConversionRates } from '../../hooks/useConversionRates';
import { useQualityMetrics } from '../../hooks/useQualityMetrics';
import { useWeightedScores } from '../../hooks/useWeightedScores';
import { usePortfolioScores } from '../../hooks/usePortfolioScores';
import { PropertyLink } from '../ui/PropertyLink';
import { EntityLink } from '../shared/EntityLink';
import { StatusBadge } from '../shared/StatusBadge';
import { TrendSparkline } from '../shared/TrendSparkline';
import { formatDateEL } from '../../lib/propertyMetrics';

const OFFICE_LABEL: Record<string, string> = {
  larissa: 'Λάρισα',
  katerini: 'Κατερίνη',
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
  const { period } = usePeriod();

  // v2 data
  const { data: allMetrics = [] } = useMetrics(period);
  const { data: journeys = [] } = usePropertyJourneys(period);
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
                    <span className="w-16 text-text-muted truncate capitalize">{key}</span>
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
              </div>
              <div className="mt-2 space-y-1">
                {Object.entries(myPqs.dimensions).map(([key, val]) => (
                  <div key={key} className="flex items-center gap-2 text-[10px]">
                    <span className="w-16 text-text-muted truncate capitalize">{key.replace('_', ' ')}</span>
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

      {/* ── YTD KPI summary ── */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: 'GCI (Τζίρος)', value: fmtEur(ytdGci), color: '#C9961A' },
          { label: 'Closings (Κλεισ.)', value: fmt(ytdClosings), color: '#D4722A' },
          { label: 'Registrations (Καταγρ.)', value: fmt(ytdRegistrations), color: '#1B5299' },
          { label: 'Exclusives (Αποκλ.)', value: fmt(ytdExclusives), color: '#168F80' },
          { label: 'Showings (Υποδ.)', value: fmt(ytdShowings), color: '#6B5CA5' },
          { label: 'Offers (Προσφ.)', value: fmt(ytdOffers), color: '#C9961A' },
        ].map(kpi => (
          <div key={kpi.label} className="bg-surface rounded-lg p-2.5 text-center border border-border-subtle">
            <div className="text-[9px] font-semibold uppercase tracking-wider text-text-muted">{kpi.label}</div>
            <div className="text-base font-bold mt-0.5" style={{ color: kpi.color }}>{kpi.value}</div>
          </div>
        ))}
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
          <h3 className="text-sm font-semibold text-text-primary mb-2">Conversion Rates (Ποσοστά Μετατροπής) — {period.label}</h3>
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
                  <th className="text-right pb-1.5 pl-2 font-medium text-text-secondary">Company</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { label: 'Avg Reg → Excl', a: agentQuality.avg_days_reg_to_excl, c: companyQuality.avg_days_reg_to_excl, suffix: 'd' },
                  { label: 'Avg Excl → Offer', a: agentQuality.avg_days_excl_to_offer, c: companyQuality.avg_days_excl_to_offer, suffix: 'd' },
                  { label: 'Avg Offer → Close', a: agentQuality.avg_days_offer_to_closing, c: companyQuality.avg_days_offer_to_closing, suffix: 'd' },
                  { label: 'Avg Total Journey', a: agentQuality.avg_days_total_journey, c: companyQuality.avg_days_total_journey, suffix: 'd' },
                  { label: 'Price Delta %', a: agentQuality.avg_price_delta_pct, c: companyQuality.avg_price_delta_pct, suffix: '%' },
                ].map(row => (
                  <tr key={row.label} className="border-b border-border-subtle">
                    <td className="py-1.5 pr-2 text-text-primary font-medium">{row.label}</td>
                    <td className="py-1.5 px-2 text-right font-semibold tabular-nums">
                      {row.a != null ? `${row.a}${row.suffix}` : '—'}
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
