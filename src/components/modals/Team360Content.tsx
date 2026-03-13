import { useMemo } from 'react';
import { useAgents, useTeams, useTeamMembers } from '../../hooks/useAgents';
import { useMetrics } from '../../hooks/useMetrics';
import { usePropertyJourneys } from '../../hooks/usePropertyJourneys';
import { useStuckAlerts } from '../../hooks/useStuckAlerts';
import type { Period } from '../../lib/types';
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
  // YTD period for journeys & comparisons (full current year)
  const currentYearStr = new Date().getFullYear().toString();
  const ytdPeriod = useMemo<Period>(() => ({
    type: 'year',
    start: `${currentYearStr}-01-01`,
    end: `${currentYearStr}-12-31`,
    label: `YTD ${currentYearStr}`,
  }), [currentYearStr]);

  const { data: agents = [] } = useAgents();
  const { data: teams = [] } = useTeams();
  const { data: teamMembers = [] } = useTeamMembers();
  const { data: allMetrics = [] } = useMetrics(ytdPeriod);
  const { data: journeys = [] } = usePropertyJourneys(ytdPeriod);
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
  const teamOffice = memberAgents[0]?.office ?? null;
  const officeJourneys = teamOffice ? journeys.filter(j => j.office === teamOffice) : [];
  const { total: teamConv } = useConversionRates(teamJourneys);
  const { total: officeConv } = useConversionRates(officeJourneys);
  const { total: companyConv } = useConversionRates(journeys);

  const { total: teamQuality } = useQualityMetrics(teamJourneys);
  const { total: officeQuality } = useQualityMetrics(officeJourneys);
  const { total: companyQuality } = useQualityMetrics(journeys);

  // KPI comparisons: office avg + company avg (excluding this team)
  const kpiComparisons = useMemo(() => {
    const teamRows = allMetrics.filter(m => m.is_team && m.period_start.startsWith(currentYear));
    const myIds = new Set([
      ...teamMembers.filter(tm => tm.team_id === teamId).map(m => m.agent_id),
      ...(TEAM_VIRTUAL_AGENTS[teamId] ?? []),
    ]);
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
      for (const m of teamRows) {
        if (myIds.has(m.agent_id)) continue;
        const val = Number(m[field as keyof typeof m]) || 0;
        companyMap.set(m.agent_id, (companyMap.get(m.agent_id) || 0) + val);
        if (teamOffice && m.office === teamOffice) {
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
  }, [allMetrics, teamMembers, teamId, teamOffice, currentYear]);

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
          <h3 className="text-sm font-semibold text-text-primary mb-2">Conversion Rates (Ποσοστά Μετατροπής) — {ytdPeriod.label}</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-text-muted border-b border-border-default">
                  <th className="text-left pb-1.5 pr-2 font-medium">Ratio</th>
                  <th className="text-right pb-1.5 px-2 font-medium text-brand-purple">Team</th>
                  <th className="text-right pb-1.5 px-2 font-medium text-brand-gold">Office</th>
                  <th className="text-right pb-1.5 pl-2 font-medium text-text-secondary">Company</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { label: 'Reg → Excl', t: teamConv.reg_to_excl_pct, o: officeConv.reg_to_excl_pct, c: companyConv.reg_to_excl_pct },
                  { label: 'Excl → Close', t: teamConv.excl_to_closing_pct, o: officeConv.excl_to_closing_pct, c: companyConv.excl_to_closing_pct },
                  { label: 'Show → Offer', t: teamConv.showing_to_offer_pct, o: officeConv.showing_to_offer_pct, c: companyConv.showing_to_offer_pct },
                  { label: 'Offer → Close', t: teamConv.offer_to_closing_pct, o: officeConv.offer_to_closing_pct, c: companyConv.offer_to_closing_pct },
                ].map(row => (
                  <tr key={row.label} className="border-b border-border-subtle">
                    <td className="py-1.5 pr-2 text-text-primary font-medium">{row.label}</td>
                    <td className={`py-1.5 px-2 text-right font-semibold tabular-nums ${
                      row.t != null && row.c != null && row.t > row.c ? 'text-green-600' : row.t != null && row.c != null && row.t < row.c ? 'text-red-600' : ''
                    }`}>
                      {row.t != null ? `${row.t}%` : '—'}
                    </td>
                    <td className="py-1.5 px-2 text-right tabular-nums text-text-muted">{row.o != null ? `${row.o}%` : '—'}</td>
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
                  <th className="text-right pb-1.5 px-2 font-medium text-brand-gold">Office</th>
                  <th className="text-right pb-1.5 pl-2 font-medium text-text-secondary">Company</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { label: 'Avg Reg → Excl', t: teamQuality.avg_days_reg_to_excl, o: officeQuality.avg_days_reg_to_excl, c: companyQuality.avg_days_reg_to_excl, suffix: 'd' },
                  { label: 'Avg Excl → Offer', t: teamQuality.avg_days_excl_to_offer, o: officeQuality.avg_days_excl_to_offer, c: companyQuality.avg_days_excl_to_offer, suffix: 'd' },
                  { label: 'Avg Total Journey', t: teamQuality.avg_days_total_journey, o: officeQuality.avg_days_total_journey, c: companyQuality.avg_days_total_journey, suffix: 'd' },
                  { label: 'Price Delta %', t: teamQuality.avg_price_delta_pct, o: officeQuality.avg_price_delta_pct, c: companyQuality.avg_price_delta_pct, suffix: '%' },
                ].map(row => (
                  <tr key={row.label} className="border-b border-border-subtle">
                    <td className="py-1.5 pr-2 text-text-primary font-medium">{row.label}</td>
                    <td className={`py-1.5 px-2 text-right font-semibold tabular-nums ${
                      row.suffix === 'd' && row.t != null && row.c != null
                        ? row.t < row.c ? 'text-green-600' : row.t > row.c ? 'text-red-600' : ''
                        : ''
                    }`}>
                      {row.t != null ? `${row.t}${row.suffix}` : '—'}
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
