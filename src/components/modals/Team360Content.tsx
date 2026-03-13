import { useAgents, useTeams, useTeamMembers } from '../../hooks/useAgents';
import { useMetrics } from '../../hooks/useMetrics';
import { usePropertyJourneys } from '../../hooks/usePropertyJourneys';
import { useStuckAlerts } from '../../hooks/useStuckAlerts';
import { usePeriod } from '../../hooks/usePeriod';
import { useConversionRates } from '../../hooks/useConversionRates';
import { useQualityMetrics } from '../../hooks/useQualityMetrics';
import { EntityLink } from '../shared/EntityLink';
import { TEAM_VIRTUAL_AGENTS } from '../../lib/constants';

function fmt(n: number | null | undefined): string {
  if (n == null) return '—';
  return n.toLocaleString('el-GR');
}

function fmtEur(n: number | null | undefined): string {
  if (n == null) return '—';
  return `€${n.toLocaleString('el-GR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

interface Props {
  teamId: number;
  teamLabel: string;
}

export function Team360Content({ teamId, teamLabel }: Props) {
  const { period } = usePeriod();
  const { data: agents = [] } = useAgents();
  const { data: teams = [] } = useTeams();
  const { data: teamMembers = [] } = useTeamMembers();
  const { data: allMetrics = [] } = useMetrics(period);
  const { data: journeys = [] } = usePropertyJourneys(period);
  const { data: stuckAlerts = [] } = useStuckAlerts();

  const team = teams.find(t => t.team_id === teamId);
  const members = teamMembers.filter(tm => tm.team_id === teamId);
  const memberAgentIds = new Set(members.map(m => m.agent_id));
  const memberAgents = agents.filter(a => memberAgentIds.has(a.agent_id));

  // Virtual CRM agent IDs for this team
  const virtualIds = TEAM_VIRTUAL_AGENTS[teamId] ?? [];

  // Team metrics: combine member metrics + virtual CRM account metrics
  const allTeamAgentIds = new Set([...memberAgentIds, ...virtualIds]);
  const currentYear = new Date().getFullYear().toString();
  const teamMetrics = allMetrics.filter(m => allTeamAgentIds.has(m.agent_id) && m.period_start.startsWith(currentYear));

  const ytdGci = teamMetrics.reduce((s, m) => s + (m.gci || 0), 0);
  const ytdClosings = teamMetrics.reduce((s, m) => s + (m.crm_closings || 0), 0);
  const ytdRegistrations = teamMetrics.reduce((s, m) => s + (m.crm_registrations || 0), 0);
  const ytdExclusives = teamMetrics.reduce((s, m) => s + (m.crm_exclusives || 0), 0);
  const ytdShowings = teamMetrics.reduce((s, m) => s + (m.crm_showings || 0), 0);
  const ytdOffers = teamMetrics.reduce((s, m) => s + (m.crm_offers || 0), 0);

  // Per-member YTD breakdown
  const memberStats = memberAgents.map(a => {
    const mMetrics = allMetrics.filter(m => m.agent_id === a.agent_id && m.period_start.startsWith(currentYear));
    return {
      agent_id: a.agent_id,
      name: a.canonical_name,
      role: members.find(m => m.agent_id === a.agent_id)?.role ?? null,
      gci: mMetrics.reduce((s, m) => s + (m.gci || 0), 0),
      closings: mMetrics.reduce((s, m) => s + (m.crm_closings || 0), 0),
      registrations: mMetrics.reduce((s, m) => s + (m.crm_registrations || 0), 0),
      exclusives: mMetrics.reduce((s, m) => s + (m.crm_exclusives || 0), 0),
      showings: mMetrics.reduce((s, m) => s + (m.crm_showings || 0), 0),
    };
  }).sort((a, b) => b.gci - a.gci);

  // Journeys for team members + virtual accounts
  const teamJourneys = journeys.filter(j => allTeamAgentIds.has(j.agent_id));
  const { total: teamConv } = useConversionRates(teamJourneys);
  const { total: companyConv } = useConversionRates(journeys);

  const { total: teamQuality } = useQualityMetrics(teamJourneys);
  const { total: companyQuality } = useQualityMetrics(journeys);

  // Stuck alerts
  const teamStuck = stuckAlerts.filter(a => allTeamAgentIds.has(a.agent_id));

  return (
    <div className="p-5 space-y-5">
      {/* ── Header ── */}
      <div>
        <h2 className="text-lg font-bold text-text-primary">{team?.team_name || teamLabel}</h2>
        <div className="text-sm text-text-muted">
          {memberAgents.length} μέλη
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

      {/* ── Members ── */}
      <div>
        <h3 className="text-sm font-semibold text-text-primary mb-2">Μέλη</h3>
        {memberStats.length === 0 ? (
          <p className="text-xs text-text-muted italic">Δεν βρέθηκαν μέλη</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-text-muted border-b border-border-default">
                  <th className="pb-1.5 pr-2 font-medium">Σύμβουλος</th>
                  <th className="pb-1.5 pr-2 font-medium text-right">GCI</th>
                  <th className="pb-1.5 pr-2 font-medium text-right">Close</th>
                  <th className="pb-1.5 pr-2 font-medium text-right">Reg</th>
                  <th className="pb-1.5 pr-2 font-medium text-right">Excl</th>
                  <th className="pb-1.5 font-medium text-right">Show</th>
                </tr>
              </thead>
              <tbody>
                {memberStats.map(m => (
                  <tr key={m.agent_id} className="border-b border-border-subtle">
                    <td className="py-1.5 pr-2">
                      <div className="flex items-center gap-1.5">
                        <EntityLink type="agent" id={m.agent_id} label={m.name} className="text-xs font-medium truncate" />
                        {m.role && (
                          <span className="text-[9px] text-brand-purple bg-brand-purple/10 px-1 py-0.5 rounded shrink-0">
                            {m.role}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-1.5 pr-2 text-right tabular-nums font-semibold text-brand-gold">{fmtEur(m.gci)}</td>
                    <td className="py-1.5 pr-2 text-right tabular-nums">{fmt(m.closings)}</td>
                    <td className="py-1.5 pr-2 text-right tabular-nums">{fmt(m.registrations)}</td>
                    <td className="py-1.5 pr-2 text-right tabular-nums">{fmt(m.exclusives)}</td>
                    <td className="py-1.5 text-right tabular-nums">{fmt(m.showings)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Conversion Rates ── */}
      {teamJourneys.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-text-primary mb-2">Conversion Rates (Ποσοστά Μετατροπής) — {period.label}</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-text-muted border-b border-border-default">
                  <th className="text-left pb-1.5 pr-2 font-medium">Ratio</th>
                  <th className="text-right pb-1.5 px-2 font-medium text-brand-purple">Team</th>
                  <th className="text-right pb-1.5 pl-2 font-medium text-text-secondary">Company</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { label: 'Reg → Excl', t: teamConv.reg_to_excl_pct, c: companyConv.reg_to_excl_pct },
                  { label: 'Excl → Close', t: teamConv.excl_to_closing_pct, c: companyConv.excl_to_closing_pct },
                  { label: 'Show → Offer', t: teamConv.showing_to_offer_pct, c: companyConv.showing_to_offer_pct },
                  { label: 'Offer → Close', t: teamConv.offer_to_closing_pct, c: companyConv.offer_to_closing_pct },
                ].map(row => (
                  <tr key={row.label} className="border-b border-border-subtle">
                    <td className="py-1.5 pr-2 text-text-primary font-medium">{row.label}</td>
                    <td className={`py-1.5 px-2 text-right font-semibold tabular-nums ${
                      row.t != null && row.c != null && row.t > row.c ? 'text-green-600' : row.t != null && row.c != null && row.t < row.c ? 'text-red-600' : ''
                    }`}>
                      {row.t != null ? `${row.t}%` : '—'}
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
      {teamJourneys.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-text-primary mb-2">Quality Metrics (Δείκτες Ποιότητας)</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-text-muted border-b border-border-default">
                  <th className="text-left pb-1.5 pr-2 font-medium">Metric</th>
                  <th className="text-right pb-1.5 px-2 font-medium text-brand-purple">Team</th>
                  <th className="text-right pb-1.5 pl-2 font-medium text-text-secondary">Company</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { label: 'Avg Reg → Excl', t: teamQuality.avg_days_reg_to_excl, c: companyQuality.avg_days_reg_to_excl, suffix: 'd' },
                  { label: 'Avg Excl → Offer', t: teamQuality.avg_days_excl_to_offer, c: companyQuality.avg_days_excl_to_offer, suffix: 'd' },
                  { label: 'Avg Total Journey', t: teamQuality.avg_days_total_journey, c: companyQuality.avg_days_total_journey, suffix: 'd' },
                  { label: 'Price Delta %', t: teamQuality.avg_price_delta_pct, c: companyQuality.avg_price_delta_pct, suffix: '%' },
                ].map(row => (
                  <tr key={row.label} className="border-b border-border-subtle">
                    <td className="py-1.5 pr-2 text-text-primary font-medium">{row.label}</td>
                    <td className="py-1.5 px-2 text-right font-semibold tabular-nums">
                      {row.t != null ? `${row.t}${row.suffix}` : '—'}
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

      {/* ── Stuck Alerts ── */}
      {teamStuck.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-brand-red mb-2">
            Stuck Alerts ({teamStuck.length})
          </h3>
          <div className="space-y-1.5">
            {teamStuck.slice(0, 5).map(alert => (
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
