import { useMemo } from 'react';
import { useAgents, useTeams, useTeamMembers } from '../../hooks/useAgents';
import { useMetrics } from '../../hooks/useMetrics';
import { usePropertyJourneys } from '../../hooks/usePropertyJourneys';
import { useStuckAlerts } from '../../hooks/useStuckAlerts';
import type { Period } from '../../lib/types';
import { useConversionRates } from '../../hooks/useConversionRates';
import { useQualityMetrics } from '../../hooks/useQualityMetrics';
import { EntityLink } from '../shared/EntityLink';
import { useAgentTargets } from '../../hooks/useAgentTargets';
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
  const { data: allTargets } = useAgentTargets(Number(currentYearStr));

  // Loading state: wait for core data before rendering
  const coreLoading = agents.length === 0 || teams.length === 0;

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
      registrations: mMetrics.reduce((s, m) => s + (m.acc_registrations || 0), 0),
      exclusives: mMetrics.reduce((s, m) => s + (m.acc_exclusives || 0), 0),
      showings: mMetrics.reduce((s, m) => s + (m.acc_showings || 0), 0),
      offers: mMetrics.reduce((s, m) => s + (m.acc_offers || 0), 0),
      closings: mMetrics.reduce((s, m) => s + (m.acc_closings || 0), 0),
      billing: mMetrics.reduce((s, m) => s + (m.acc_billing || 0), 0),
    };
  }).sort((a, b) => b.closings - a.closings || b.registrations - a.registrations);

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

  // Per-member target achievement
  const memberTargetMap = useMemo(() => {
    if (!allTargets) return new Map<number, { target: number; pct: number }>();
    const map = new Map<number, { target: number; pct: number }>();
    for (const t of allTargets) {
      if (memberAgentIds.has(t.agent_id) && t.gci_target && t.gci_target > 0) {
        const ms = memberStats.find(m => m.agent_id === t.agent_id);
        if (ms) map.set(t.agent_id, { target: t.gci_target, pct: Math.round((ms.gci / t.gci_target) * 100) });
      }
    }
    return map;
  }, [allTargets, memberAgentIds, memberStats]);

  // Sales vs Rentals split
  const salesRentals = useMemo(() => {
    const sales = teamJourneys.filter(j => j.category === 'sale' || j.category === 'Πώληση');
    const rentals = teamJourneys.filter(j => j.category !== 'sale' && j.category !== 'Πώληση');
    const salesClosed = sales.filter(j => j.has_closing && j.days_excl_to_closing != null);
    const rentalsClosed = rentals.filter(j => j.has_closing && j.days_excl_to_closing != null);
    return {
      salesCount: sales.length,
      rentalsCount: rentals.length,
      avgSalesDays: salesClosed.length > 0
        ? Math.round(salesClosed.reduce((s, j) => s + j.days_excl_to_closing!, 0) / salesClosed.length)
        : null,
      avgRentalsDays: rentalsClosed.length > 0
        ? Math.round(rentalsClosed.reduce((s, j) => s + j.days_excl_to_closing!, 0) / rentalsClosed.length)
        : null,
    };
  }, [teamJourneys]);

  // Team target achievement (sum of member targets)
  const targetAchievementPct = useMemo(() => {
    if (!allTargets || allTargets.length === 0) return null;
    const memberTargetsList = allTargets.filter(t => memberAgentIds.has(t.agent_id));
    const totalGciTarget = memberTargetsList.reduce((s, t) => s + (t.gci_target || 0), 0);
    if (totalGciTarget <= 0) return null;
    return Math.round((ytdGci / totalGciTarget) * 100);
  }, [allTargets, memberAgentIds, ytdGci]);

  if (coreLoading) {
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
        <h2 className="text-lg font-bold text-text-primary">{team?.team_name || teamLabel}</h2>
        <div className="text-sm text-text-muted">
          {memberAgents.length} μέλη
        </div>
      </div>

      {/* ── Summary: Target + Sales/Rentals ── */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-surface rounded-lg p-3 border-2 border-[#168F80] text-center">
          <div className="text-[10px] font-semibold text-text-muted">Επίτευξη Στόχου</div>
          <div className="text-2xl font-bold mt-1" style={{ color: targetAchievementPct != null ? (targetAchievementPct >= 100 ? '#1D7A4E' : targetAchievementPct >= 50 ? '#C9961A' : '#C9372C') : undefined }}>
            {targetAchievementPct != null ? `${targetAchievementPct}%` : '—'}
          </div>
        </div>
        <div className="bg-surface rounded-lg p-3 border-2 border-[#168F80] text-center">
          <div className="text-2xl font-bold text-text-primary">{salesRentals.salesCount}</div>
          <div className="text-[10px] font-semibold text-text-muted">Πωλήσεις (YTD)</div>
          <div className="text-[10px] text-text-muted mt-1">
            <span className="font-bold text-text-primary">{salesRentals.avgSalesDays != null ? `${salesRentals.avgSalesDays} ημ` : '—'}</span> Ανάθεση → Κλείσιμο
          </div>
        </div>
        <div className="bg-surface rounded-lg p-3 border-2 border-[#168F80] text-center">
          <div className="text-2xl font-bold text-text-primary">{salesRentals.rentalsCount}</div>
          <div className="text-[10px] font-semibold text-text-muted">Ενοικιάσεις (YTD)</div>
          <div className="text-[10px] text-text-muted mt-1">
            <span className="font-bold text-text-primary">{salesRentals.avgRentalsDays != null ? `${salesRentals.avgRentalsDays} ημ` : '—'}</span> Ανάθεση → Κλείσιμο
          </div>
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
              <div className="text-[9px] font-semibold tracking-wider text-text-muted">{kpi.label}</div>
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

      {/* ── Leaderboard Μελών ── */}
      <div>
        <h3 className="text-sm font-semibold text-text-primary mb-2">
          Leaderboard Μελών ({memberStats.length})
        </h3>
        {memberStats.length === 0 ? (
          <p className="text-xs text-text-muted italic">Δεν βρέθηκαν μέλη</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[11px]">
              <thead>
                <tr className="text-text-muted border-b border-border-default">
                  <th className="text-left pb-1.5 pr-1 font-medium">Μέλος</th>
                  <th className="text-right pb-1.5 px-1 font-medium" title="Καταγραφές">Καταγρ.</th>
                  <th className="text-right pb-1.5 px-1 font-medium" title="Αποκλειστικές">Αποκλ.</th>
                  <th className="text-right pb-1.5 px-1 font-medium" title="Υποδείξεις">Υποδ.</th>
                  <th className="text-right pb-1.5 px-1 font-medium" title="Προσφορές">Προσφ.</th>
                  <th className="text-right pb-1.5 px-1 font-medium" title="Κλεισίματα">Κλεισ.</th>
                  <th className="text-right pb-1.5 pl-1 font-medium" title="Συμβολαιοποιήσεις">Συμβ.</th>
                </tr>
              </thead>
              <tbody>
                {memberStats.map(m => (
                  <tr key={m.agent_id} className="border-b border-border-subtle">
                    <td className="py-1.5 pr-1">
                      <EntityLink type="agent" id={m.agent_id} label={m.name || `#${m.agent_id}`} className="text-[11px] font-medium truncate block max-w-[110px]" />
                    </td>
                    <td className="py-1.5 px-1 text-right tabular-nums">{fmt(m.registrations)}</td>
                    <td className="py-1.5 px-1 text-right tabular-nums">{fmt(m.exclusives)}</td>
                    <td className="py-1.5 px-1 text-right tabular-nums">{fmt(m.showings)}</td>
                    <td className="py-1.5 px-1 text-right tabular-nums">{fmt(m.offers)}</td>
                    <td className="py-1.5 px-1 text-right tabular-nums">{fmt(m.closings)}</td>
                    <td className="py-1.5 pl-1 text-right tabular-nums">{fmt(m.billing)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="text-[9px] text-text-muted mt-1 italic">Πηγή: Accountability Reports</div>
          </div>
        )}
      </div>

      {/* ── Conversion Rates ── */}
      {teamJourneys.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-text-primary mb-2">Ποσοστά Μετατροπής — {ytdPeriod.label}</h3>
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
                  { label: 'Καταγραφή → Ανάθεση', t: teamConv.reg_to_excl, o: officeConv.reg_to_excl, c: companyConv.reg_to_excl },
                  { label: 'Ανάθεση → Κλείσιμο', t: teamConv.excl_to_closing, o: officeConv.excl_to_closing, c: companyConv.excl_to_closing },
                  { label: 'Υπόδειξη → Προσφορά', t: teamConv.showing_to_offer, o: officeConv.showing_to_offer, c: companyConv.showing_to_offer },
                  { label: 'Προσφορά → Κλείσιμο', t: teamConv.offer_to_closing, o: officeConv.offer_to_closing, c: companyConv.offer_to_closing },
                ].map(row => (
                  <tr key={row.label} className="border-b border-border-subtle">
                    <td className="py-1.5 pr-2 text-text-primary font-medium">{row.label}</td>
                    <td className={`py-1.5 px-2 text-right font-semibold tabular-nums ${
                      row.t != null && row.c != null && row.t < row.c ? 'text-green-600' : row.t != null && row.c != null && row.t > row.c ? 'text-red-600' : ''
                    }`}>
                      {row.t != null ? `${row.t.toLocaleString('el-GR', { minimumFractionDigits: 1, maximumFractionDigits: 2 })}:1` : '—'}
                    </td>
                    <td className="py-1.5 px-2 text-right tabular-nums text-text-muted">{row.o != null ? `${row.o.toLocaleString('el-GR', { minimumFractionDigits: 1, maximumFractionDigits: 2 })}:1` : '—'}</td>
                    <td className="py-1.5 pl-2 text-right tabular-nums text-text-secondary">{row.c != null ? `${row.c.toLocaleString('el-GR', { minimumFractionDigits: 1, maximumFractionDigits: 2 })}:1` : '—'}</td>
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
          <h3 className="text-sm font-semibold text-text-primary mb-2">Δείκτες Ποιότητας</h3>
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
                  { label: 'Μ.Ο. Καταγραφή → Ανάθεση', t: teamQuality.avg_days_reg_to_excl, o: officeQuality.avg_days_reg_to_excl, c: companyQuality.avg_days_reg_to_excl, suffix: 'd' },
                  { label: 'Μ.Ο. Ανάθεση → Προσφορά', t: teamQuality.avg_days_excl_to_offer, o: officeQuality.avg_days_excl_to_offer, c: companyQuality.avg_days_excl_to_offer, suffix: 'd' },
                  { label: 'Μ.Ο. Συνολική Διαδρομή', t: teamQuality.avg_days_total_journey, o: officeQuality.avg_days_total_journey, c: companyQuality.avg_days_total_journey, suffix: 'd' },
                  { label: 'Διαφορά Τιμής %', t: teamQuality.avg_price_delta_pct, o: officeQuality.avg_price_delta_pct, c: companyQuality.avg_price_delta_pct, suffix: '%' },
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
