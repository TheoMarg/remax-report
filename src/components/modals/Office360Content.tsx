import { useAgents } from '../../hooks/useAgents';
import { useMetrics } from '../../hooks/useMetrics';
import { usePropertyJourneys } from '../../hooks/usePropertyJourneys';
import { usePortfolioQuality } from '../../hooks/usePortfolioQuality';
import { usePipelineValue } from '../../hooks/usePipelineValue';
import { useStuckAlerts } from '../../hooks/useStuckAlerts';
import { useKpiWeights } from '../../hooks/useKpiWeights';
import { usePqsWeights } from '../../hooks/usePqsWeights';
import { usePeriod } from '../../hooks/usePeriod';
import { useConversionRates } from '../../hooks/useConversionRates';
import { useQualityMetrics } from '../../hooks/useQualityMetrics';
import { useWeightedScores } from '../../hooks/useWeightedScores';
import { usePortfolioScores } from '../../hooks/usePortfolioScores';
import { EntityLink } from '../shared/EntityLink';
import { ScoreBar } from '../shared/ScoreBar';

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
  office: string;
}

export function Office360Content({ office }: Props) {
  const { period } = usePeriod();
  const { data: agents = [] } = useAgents();
  const { data: allMetrics = [] } = useMetrics(period);
  const { data: journeys = [] } = usePropertyJourneys(period);
  const { data: qualityData = [] } = usePortfolioQuality();
  const { data: pipelineData = [] } = usePipelineValue();
  const { data: stuckAlerts = [] } = useStuckAlerts();
  const { data: kpiWeights = [] } = useKpiWeights();
  const { data: pqsWeights = [] } = usePqsWeights();

  const label = OFFICE_LABEL[office] || office;
  const officeAgents = agents.filter(a => a.office === office && !a.is_team && a.is_active);
  const officeAgentIds = new Set(officeAgents.map(a => a.agent_id));

  // Office metrics aggregation (YTD)
  const currentYear = new Date().getFullYear().toString();
  const officeMetrics = allMetrics.filter(m => m.office === office && m.period_start.startsWith(currentYear));
  const ytdGci = officeMetrics.reduce((s, m) => s + (m.gci || 0), 0);
  const ytdClosings = officeMetrics.reduce((s, m) => s + (m.crm_closings || 0), 0);
  const ytdRegistrations = officeMetrics.reduce((s, m) => s + (m.crm_registrations || 0), 0);
  const ytdExclusives = officeMetrics.reduce((s, m) => s + (m.crm_exclusives || 0), 0);
  const ytdShowings = officeMetrics.reduce((s, m) => s + (m.crm_showings || 0), 0);
  const ytdOffers = officeMetrics.reduce((s, m) => s + (m.crm_offers || 0), 0);

  // Pipeline
  const officePipeline = pipelineData.filter(p => p.office === office);
  const totalListingValue = officePipeline.reduce((s, p) => s + (p.total_listing_value || 0), 0);
  const totalActiveProps = officePipeline.reduce((s, p) => s + (p.active_properties || 0), 0);

  // Conversions
  const officeJourneys = journeys.filter(j => j.office === office);
  const { total: officeConv } = useConversionRates(officeJourneys);
  const { total: companyConv } = useConversionRates(journeys);

  // Quality
  const { total: officeQuality } = useQualityMetrics(officeJourneys);
  const { total: companyQuality } = useQualityMetrics(journeys);

  // Stuck alerts
  const officeStuck = stuckAlerts.filter(a => a.office === office);

  // WPS leaderboard for office
  const startDates: Record<number, string | null> = {};
  for (const a of officeAgents) startDates[a.agent_id] = a.start_date;
  const wpsResults = useWeightedScores(allMetrics, kpiWeights, startDates);
  const officeWps = wpsResults.filter(w => officeAgentIds.has(w.agent_id));

  // PQS leaderboard for office
  const officeQualityData = qualityData.filter(q => q.office === office);
  const pqsResults = usePortfolioScores(officeQualityData, pqsWeights);

  return (
    <div className="p-5 space-y-5">
      {/* ── Header ── */}
      <div>
        <h2 className="text-lg font-bold text-text-primary">{label}</h2>
        <div className="text-sm text-text-muted">
          {officeAgents.length} ενεργοί σύμβουλοι
        </div>
      </div>

      {/* ── YTD KPIs ── */}
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

      {/* ── Pipeline summary ── */}
      <div className="bg-surface rounded-lg p-3 border border-border-subtle">
        <h3 className="text-[10px] font-semibold uppercase tracking-wider text-text-muted mb-2">Pipeline</h3>
        <div className="flex items-center gap-6 text-sm">
          <div>
            <span className="text-text-muted text-xs">Ενεργά:</span>{' '}
            <span className="font-bold text-text-primary">{fmt(totalActiveProps)}</span>
          </div>
          <div>
            <span className="text-text-muted text-xs">Αξία:</span>{' '}
            <span className="font-bold text-brand-gold">{fmtEur(totalListingValue)}</span>
          </div>
        </div>
      </div>

      {/* ── Conversion Rates ── */}
      {officeJourneys.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-text-primary mb-2">Conversion Rates (Ποσοστά Μετατροπής) — {period.label}</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-text-muted border-b border-border-default">
                  <th className="text-left pb-1.5 pr-2 font-medium">Ratio</th>
                  <th className="text-right pb-1.5 px-2 font-medium text-brand-gold">Office</th>
                  <th className="text-right pb-1.5 pl-2 font-medium text-text-secondary">Company</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { label: 'Reg → Excl', o: officeConv.reg_to_excl_pct, c: companyConv.reg_to_excl_pct },
                  { label: 'Excl → Close', o: officeConv.excl_to_closing_pct, c: companyConv.excl_to_closing_pct },
                  { label: 'Show → Offer', o: officeConv.showing_to_offer_pct, c: companyConv.showing_to_offer_pct },
                  { label: 'Offer → Close', o: officeConv.offer_to_closing_pct, c: companyConv.offer_to_closing_pct },
                ].map(row => (
                  <tr key={row.label} className="border-b border-border-subtle">
                    <td className="py-1.5 pr-2 text-text-primary font-medium">{row.label}</td>
                    <td className={`py-1.5 px-2 text-right font-semibold tabular-nums ${
                      row.o != null && row.c != null && row.o > row.c ? 'text-green-600' : row.o != null && row.c != null && row.o < row.c ? 'text-red-600' : ''
                    }`}>
                      {row.o != null ? `${row.o}%` : '—'}
                    </td>
                    <td className="py-1.5 pl-2 text-right tabular-nums text-text-secondary">{row.c != null ? `${row.c}%` : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Quality Metrics ── */}
      {officeJourneys.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-text-primary mb-2">Quality Metrics (Δείκτες Ποιότητας)</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-text-muted border-b border-border-default">
                  <th className="text-left pb-1.5 pr-2 font-medium">Metric</th>
                  <th className="text-right pb-1.5 px-2 font-medium text-brand-gold">Office</th>
                  <th className="text-right pb-1.5 pl-2 font-medium text-text-secondary">Company</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { label: 'Avg Reg → Excl', o: officeQuality.avg_days_reg_to_excl, c: companyQuality.avg_days_reg_to_excl, suffix: 'd' },
                  { label: 'Avg Excl → Offer', o: officeQuality.avg_days_excl_to_offer, c: companyQuality.avg_days_excl_to_offer, suffix: 'd' },
                  { label: 'Avg Total Journey', o: officeQuality.avg_days_total_journey, c: companyQuality.avg_days_total_journey, suffix: 'd' },
                  { label: 'Price Delta %', o: officeQuality.avg_price_delta_pct, c: companyQuality.avg_price_delta_pct, suffix: '%' },
                ].map(row => (
                  <tr key={row.label} className="border-b border-border-subtle">
                    <td className="py-1.5 pr-2 text-text-primary font-medium">{row.label}</td>
                    <td className="py-1.5 px-2 text-right font-semibold tabular-nums">
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

      {/* ── WPS Leaderboard ── */}
      {officeWps.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-text-primary mb-2">WPS Leaderboard (Κατάταξη Απόδοσης)</h3>
          <div className="space-y-2">
            {officeWps.map((w, i) => (
              <ScoreBar key={w.agent_id} rank={i + 1} label={w.canonical_name || `Agent ${w.agent_id}`} score={w.wps} maxScore={officeWps[0]?.wps || 100} color="#1B5299" />
            ))}
          </div>
        </div>
      )}

      {/* ── PQS Leaderboard ── */}
      {pqsResults.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-text-primary mb-2">PQS Leaderboard (Κατάταξη Ποιότητας)</h3>
          <div className="space-y-2">
            {pqsResults.map((p, i) => (
              <ScoreBar key={p.agent_id} rank={i + 1} label={p.canonical_name || `Agent ${p.agent_id}`} score={p.pqs} maxScore={100} color="#168F80" />
            ))}
          </div>
        </div>
      )}

      {/* ── Agents list ── */}
      <div>
        <h3 className="text-sm font-semibold text-text-primary mb-2">Σύμβουλοι ({officeAgents.length})</h3>
        <div className="space-y-1">
          {officeAgents.map(a => (
            <EntityLink
              key={a.agent_id}
              type="agent"
              id={a.agent_id}
              label={a.canonical_name}
              className="block text-xs py-1.5 px-2 rounded-lg hover:bg-surface-light transition-colors"
            />
          ))}
        </div>
      </div>

      {/* ── Stuck Alerts ── */}
      {officeStuck.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-brand-red mb-2">
            Stuck Alerts ({officeStuck.length})
          </h3>
          <div className="space-y-1.5">
            {officeStuck.slice(0, 8).map(alert => (
              <div key={alert.property_id} className="flex items-center gap-2 text-xs bg-red-50 rounded-lg px-3 py-2 border border-red-100">
                <span className="font-mono font-medium text-text-primary">{alert.property_code || alert.property_id.slice(0, 8)}</span>
                <EntityLink type="agent" id={alert.agent_id} label={alert.canonical_name || ''} className="text-[11px] truncate" />
                <span className="text-text-muted">{alert.current_stage}</span>
                <span className="ml-auto font-semibold text-brand-red">{alert.days_since_activity}d</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
