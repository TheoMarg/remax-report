import type { CombinedMetric, Team, TeamMember, WithdrawalReason, FunnelRow } from './types';
import { TEAM_VIRTUAL_AGENTS } from './constants';

// ── Types ──

export interface KpiDef {
  key: string;
  label: string;
  crmField: string;
  accField: string | null;
  color: string;
}

export interface KpiSummary {
  key: string;
  label: string;
  crm: number;
  acc: number;
  delta: number;       // crm - acc
  color: string;
  byOffice: { office: string; crm: number; sale?: number; rent?: number }[];
  sale?: number;       // Πώληση count (for exclusives)
  rent?: number;       // Ενοικίαση count (for exclusives)
}

export interface AgentKpiRow {
  agent_id: number;
  name: string;
  office: string | null;
  crm: number;
  acc: number;
  delta: number;
  sale?: number;       // Πώληση (for exclusives)
  rent?: number;       // Ενοικίαση (for exclusives)
}

export interface TeamKpiBreakdown {
  team_id: number | null;
  team_name: string;
  crm: number;
  acc: number;
  pctOfCompany: number;
  members: AgentKpiRow[];
}

export interface OfficeKpiComparison {
  office: string;
  agents: number;
  crm: number;
  acc: number;
  moPerAgent: number;
}

export interface FourClubAgent {
  agent_id: number;
  name: string;
  office: string | null;
  count: number;
}

export interface TopPerformer {
  agent_id: number;
  name: string;
  value: number;
  office?: string | null;
}

export interface OfficeSummary {
  office: string;
  agents: number;
  registrations: number;
  exclusives: number;
  published: number;
  showings: number;
  closings: number;
  billing: number;
  gci: number;
}

export interface FunnelStep {
  label: string;
  value: number;
  rate: number | null;   // conversion from previous step, null for first
  color: string;
}

export interface MonthTrend {
  month: string;         // 'Ιαν', 'Φεβ', etc.
  period_start: string;
  registrations: number;
  exclusives: number;
  closings: number;
  billing: number;
  gci: number;
}

// ── Constants ──

export const KPI_DEFS: readonly KpiDef[] = [
  { key: 'registrations',  label: 'Καταγραφές',        crmField: 'crm_registrations',  accField: 'acc_registrations',  color: '#1B5299' },
  { key: 'exclusives',     label: 'Νέες Αποκλειστικές', crmField: 'crm_exclusives',     accField: 'acc_exclusives',     color: '#168F80' },
  { key: 'published',      label: 'Νέα Δημοσιευμένα',  crmField: 'crm_published',      accField: null,                 color: '#1D7A4E' },
  { key: 'showings',       label: 'Υποδείξεις',        crmField: 'crm_showings',       accField: 'acc_showings',       color: '#6B5CA5' },
  { key: 'offers',         label: 'Προσφορές',         crmField: 'crm_offers',         accField: 'acc_offers',         color: '#C9961A' },
  { key: 'closings',       label: 'Κλεισίματα',        crmField: 'crm_closings',       accField: 'acc_closings',       color: '#D4722A' },
  { key: 'billing',        label: 'Συμβολαιοποιήσεις', crmField: 'crm_billing',        accField: 'acc_billing',        color: '#0C1E3C' },
] as const;

const MONTH_SHORT_EL = ['Ιαν','Φεβ','Μαρ','Απρ','Μάι','Ιούν','Ιούλ','Αύγ','Σεπ','Οκτ','Νοέ','Δεκ'];

// ── Helpers ──

/** Filter to individual agents only (exclude team CRM accounts) */
export function individualsOnly(metrics: CombinedMetric[]): CombinedMetric[] {
  return metrics.filter(m => !m.is_team);
}

/** Sum a numeric field across metrics rows */
export function sumField(rows: CombinedMetric[], field: keyof CombinedMetric): number {
  return rows.reduce((sum, r) => sum + (Number(r[field]) || 0), 0);
}

// ── KPI Summary (7 cards) ──

export function computeKpis(metrics: CombinedMetric[]): KpiSummary[] {
  const individuals = individualsOnly(metrics);

  // CRM totals use ALL agents (individuals + team accounts)
  // because team members' CRM data lives under team virtual agents (33, 34, 35, 103)
  // ACC totals use individuals only (team accounts have 0 acc per rules)

  // Group individuals by office for per-office breakdown
  const officeMap = new Map<string, CombinedMetric[]>();
  for (const m of individuals) {
    const office = m.office || 'Αγνωστο';
    if (!officeMap.has(office)) officeMap.set(office, []);
    officeMap.get(office)!.push(m);
  }
  const officeNames = Array.from(officeMap.keys()).sort((a, b) => {
    if (a === 'larissa') return -1;
    if (b === 'larissa') return 1;
    return a.localeCompare(b);
  });

  // Sale/Rent field mapping
  const saleRentFields: Record<string, { sale: string; rent: string }> = {
    registrations: { sale: 'crm_registrations_sale', rent: 'crm_registrations_rent' },
    exclusives:    { sale: 'crm_exclusives_sale',    rent: 'crm_exclusives_rent' },
    published:     { sale: 'crm_published_sale',     rent: 'crm_published_rent' },
    showings:      { sale: 'crm_showings_sale',      rent: 'crm_showings_rent' },
    offers:        { sale: 'crm_offers_sale',        rent: 'crm_offers_rent' },
    closings:      { sale: 'crm_closings_sale',      rent: 'crm_closings_rent' },
    billing:       { sale: 'crm_billing_sale',       rent: 'crm_billing_rent' },
  };

  // Team metrics (is_team rows)
  const teamMetrics = metrics.filter(m => m.is_team);

  return KPI_DEFS.map(def => {
    const crmKey = def.crmField as keyof CombinedMetric;
    const crm = sumField(metrics, crmKey);  // ALL agents for company total
    const acc = def.accField ? sumField(individuals, def.accField as keyof CombinedMetric) : 0;
    const sr = saleRentFields[def.key];

    const byOffice: KpiSummary['byOffice'] = officeNames.map(office => {
      const officeRows = officeMap.get(office)!;
      const entry: KpiSummary['byOffice'][0] = {
        office,
        crm: sumField(officeRows, crmKey),
      };
      if (sr) {
        entry.sale = sumField(officeRows, sr.sale as keyof CombinedMetric);
        entry.rent = sumField(officeRows, sr.rent as keyof CombinedMetric);
      }
      return entry;
    });

    // Add a "teams" aggregation row
    if (teamMetrics.length > 0) {
      const teamEntry: KpiSummary['byOffice'][0] = {
        office: 'teams',
        crm: sumField(teamMetrics, crmKey),
      };
      if (sr) {
        teamEntry.sale = sumField(teamMetrics, sr.sale as keyof CombinedMetric);
        teamEntry.rent = sumField(teamMetrics, sr.rent as keyof CombinedMetric);
      }
      if (teamEntry.crm > 0) byOffice.push(teamEntry);
    }

    const result: KpiSummary = {
      key: def.key,
      label: def.label,
      crm,
      acc,
      delta: crm - acc,
      color: def.color,
      byOffice,
    };
    // Add global Πώληση/Ενοικίαση breakdown
    if (sr) {
      result.sale = sumField(metrics, sr.sale as keyof CombinedMetric);
      result.rent = sumField(metrics, sr.rent as keyof CombinedMetric);
    }
    return result;
  });
}

// ── Top Agent & Top Team ──

export function computeTopAgent(metrics: CombinedMetric[], office?: string): TopPerformer | null {
  let individuals = individualsOnly(metrics);
  if (office) individuals = individuals.filter(m => m.office === office);
  if (individuals.length === 0) return null;
  const sorted = [...individuals].sort((a, b) => (b.gci || 0) - (a.gci || 0));
  const top = sorted[0];
  return {
    agent_id: top.agent_id,
    name: top.canonical_name || `Agent #${top.agent_id}`,
    value: top.gci || 0,
    office: top.office,
  };
}

export function computeTopTeam(metrics: CombinedMetric[]): TopPerformer | null {
  // Team CRM accounts carry the billing directly (is_team = true)
  const teams = metrics.filter(m => m.is_team && (m.gci || 0) > 0);
  if (teams.length === 0) return null;
  const top = teams.reduce((a, b) => ((b.gci || 0) > (a.gci || 0) ? b : a));
  return {
    agent_id: top.agent_id,
    name: top.canonical_name || `Team #${top.agent_id}`,
    value: top.gci || 0,
  };
}

// ── Office Head-to-Head ──

export function computeOfficeComparison(metrics: CombinedMetric[]): OfficeSummary[] {
  const individuals = individualsOnly(metrics);
  const officeMap = new Map<string, { rows: CombinedMetric[]; agents: Set<number> }>();

  for (const m of individuals) {
    const office = m.office || 'Αγνωστο';
    if (!officeMap.has(office)) {
      officeMap.set(office, { rows: [], agents: new Set() });
    }
    const entry = officeMap.get(office)!;
    entry.rows.push(m);
    entry.agents.add(m.agent_id);
  }

  return Array.from(officeMap.entries()).map(([office, { rows, agents }]) => ({
    office,
    agents: agents.size,
    registrations: sumField(rows, 'crm_registrations'),
    exclusives: sumField(rows, 'crm_exclusives'),
    published: sumField(rows, 'crm_published'),
    showings: sumField(rows, 'crm_showings'),
    closings: sumField(rows, 'crm_closings'),
    billing: sumField(rows, 'crm_billing'),
    gci: sumField(rows, 'gci'),
  }));
}

// ── Sales Funnel ──

const FUNNEL_COLORS = ['#1B5299', '#168F80', '#1D7A4E', '#6B5CA5', '#C9961A', '#D4722A', '#0C1E3C'];

export function computeFunnel(metrics: CombinedMetric[]): FunnelStep[] {
  // Use ALL agents (individuals + teams) for company-level funnel
  const steps = [
    { label: 'Καταγραφές',        value: sumField(metrics, 'crm_registrations') },
    { label: 'Νέες Αποκλειστικές', value: sumField(metrics, 'crm_exclusives') },
    { label: 'Νέα Δημοσιευμένα',  value: sumField(metrics, 'crm_published') },
    { label: 'Υποδείξεις',        value: sumField(metrics, 'crm_showings') },
    { label: 'Προσφορές',         value: sumField(metrics, 'crm_offers') },
    { label: 'Κλεισίματα',        value: sumField(metrics, 'crm_closings') },
    { label: 'Συμβολαιοποιήσεις', value: sumField(metrics, 'crm_billing') },
  ];

  return steps.map((s, i) => ({
    ...s,
    rate: i === 0 ? null : steps[i - 1].value > 0 ? Math.round((s.value / steps[i - 1].value) * 100) : null,
    color: FUNNEL_COLORS[i],
  }));
}

// ── Trend Aggregation (from multi-month data) ──

export function aggregateByMonth(metrics: CombinedMetric[]): MonthTrend[] {
  const individuals = individualsOnly(metrics);
  // GCI/Τζίρος includes both individual and team accounts
  const allByMonth = new Map<string, CombinedMetric[]>();
  for (const m of metrics) {
    const ps = m.period_start;
    if (!allByMonth.has(ps)) allByMonth.set(ps, []);
    allByMonth.get(ps)!.push(m);
  }

  const monthMap = new Map<string, CombinedMetric[]>();
  for (const m of individuals) {
    const ps = m.period_start;
    if (!monthMap.has(ps)) monthMap.set(ps, []);
    monthMap.get(ps)!.push(m);
  }

  const result: MonthTrend[] = [];
  for (const [ps, rows] of monthMap) {
    const monthIdx = parseInt(ps.substring(5, 7), 10) - 1;
    result.push({
      month: MONTH_SHORT_EL[monthIdx] || ps.substring(5, 7),
      period_start: ps,
      registrations: sumField(rows, 'crm_registrations'),
      exclusives: sumField(rows, 'crm_exclusives'),
      closings: sumField(rows, 'crm_closings'),
      billing: sumField(rows, 'crm_billing'),
      gci: sumField(allByMonth.get(ps) || [], 'gci'),
    });
  }

  return result.sort((a, b) => a.period_start.localeCompare(b.period_start));
}

// ── KPI Detail functions ──

/** Aggregate per-agent across multi-month and rank by CRM value */
export function rankAgentsByKpi(
  metrics: CombinedMetric[],
  crmField: string,
  accField: string | null,
  office?: string,
): AgentKpiRow[] {
  let individuals = individualsOnly(metrics);
  if (office) individuals = individuals.filter(m => m.office === office);

  const crmKey = crmField as keyof CombinedMetric;
  const accKey = accField as keyof CombinedMetric | null;

  const saleRentMap: Record<string, { sale: string; rent: string }> = {
    crm_registrations: { sale: 'crm_registrations_sale', rent: 'crm_registrations_rent' },
    crm_exclusives:    { sale: 'crm_exclusives_sale',    rent: 'crm_exclusives_rent' },
    crm_published:     { sale: 'crm_published_sale',     rent: 'crm_published_rent' },
    crm_showings:      { sale: 'crm_showings_sale',      rent: 'crm_showings_rent' },
    crm_offers:        { sale: 'crm_offers_sale',        rent: 'crm_offers_rent' },
    crm_closings:      { sale: 'crm_closings_sale',      rent: 'crm_closings_rent' },
    crm_billing:       { sale: 'crm_billing_sale',       rent: 'crm_billing_rent' },
  };
  const sr = saleRentMap[crmField];
  const hasSaleRent = !!sr;
  const saleField = sr?.sale ?? null;
  const rentField = sr?.rent ?? null;

  // Aggregate per agent_id (multi-month)
  const agentMap = new Map<number, { name: string; office: string | null; crm: number; acc: number; sale: number; rent: number }>();
  for (const m of individuals) {
    const existing = agentMap.get(m.agent_id);
    const crmVal = Number(m[crmKey]) || 0;
    const accVal = accKey ? (Number(m[accKey]) || 0) : 0;
    const saleVal = saleField ? (Number(m[saleField as keyof CombinedMetric]) || 0) : 0;
    const rentVal = rentField ? (Number(m[rentField as keyof CombinedMetric]) || 0) : 0;
    if (existing) {
      existing.crm += crmVal;
      existing.acc += accVal;
      existing.sale += saleVal;
      existing.rent += rentVal;
    } else {
      agentMap.set(m.agent_id, {
        name: m.canonical_name || `Agent #${m.agent_id}`,
        office: m.office,
        crm: crmVal,
        acc: accVal,
        sale: saleVal,
        rent: rentVal,
      });
    }
  }

  return Array.from(agentMap.entries())
    .map(([agent_id, v]) => {
      const row: AgentKpiRow = {
        agent_id,
        name: v.name,
        office: v.office,
        crm: v.crm,
        acc: v.acc,
        delta: v.crm - v.acc,
      };
      if (hasSaleRent) {
        row.sale = v.sale;
        row.rent = v.rent;
      }
      return row;
    })
    .sort((a, b) => b.crm - a.crm);
}

/** Team breakdown: totals per team + member lists.
 *  CRM totals come from team virtual CRM accounts (is_team=true),
 *  ACC totals = sum of TL + members (virtual agents have 0 acc).
 *  Per BROKER_REPORT_RULES: "Στο CRM, τα listings των team members
 *  εμφανίζονται κάτω από τον team agent_id (33, 34, 35, 103)"
 */
export function computeTeamBreakdown(
  metrics: CombinedMetric[],
  teams: Team[],
  teamMembers: TeamMember[],
  crmField: string,
  accField: string | null,
): TeamKpiBreakdown[] {
  const agentRows = rankAgentsByKpi(metrics, crmField, accField);
  const agentMap = new Map(agentRows.map(a => [a.agent_id, a]));
  const totalCrm = agentRows.reduce((s, a) => s + a.crm, 0);

  // Build team CRM totals from virtual agent accounts (is_team=true)
  const crmKey = crmField as keyof CombinedMetric;
  const teamAccountCrm = new Map<number, number>(); // agent_id → CRM sum
  for (const m of metrics) {
    if (m.is_team) {
      const val = Number(m[crmKey]) || 0;
      teamAccountCrm.set(m.agent_id, (teamAccountCrm.get(m.agent_id) || 0) + val);
    }
  }

  // Build team_id → agent_ids
  const teamAgentIds = new Map<number, number[]>();
  for (const tm of teamMembers) {
    if (!teamAgentIds.has(tm.team_id)) teamAgentIds.set(tm.team_id, []);
    teamAgentIds.get(tm.team_id)!.push(tm.agent_id);
  }

  const assignedAgents = new Set(teamMembers.map(tm => tm.agent_id));

  const result: TeamKpiBreakdown[] = teams.map(t => {
    const memberIds = teamAgentIds.get(t.team_id) || [];
    const members = memberIds.map(id => agentMap.get(id)).filter(Boolean) as AgentKpiRow[];

    // CRM: prefer team virtual agent accounts; fallback to sum of members
    const virtualIds = TEAM_VIRTUAL_AGENTS[t.team_id] || [];
    const crmFromVirtual = virtualIds.reduce((s, id) => s + (teamAccountCrm.get(id) || 0), 0);
    const crmFromMembers = members.reduce((s, m) => s + m.crm, 0);
    const crm = crmFromVirtual > 0 ? crmFromVirtual : crmFromMembers;

    // ACC: sum of members
    const acc = members.reduce((s, m) => s + m.acc, 0);

    return {
      team_id: t.team_id,
      team_name: t.team_name,
      crm,
      acc,
      pctOfCompany: totalCrm > 0 ? Math.round((crm / totalCrm) * 100) : 0,
      members: members.sort((a, b) => b.crm - a.crm),
    };
  });

  // "Χωρίς Team" bucket — individual agents not in any team
  const unassigned = agentRows.filter(a => !assignedAgents.has(a.agent_id));
  if (unassigned.length > 0) {
    const crm = unassigned.reduce((s, m) => s + m.crm, 0);
    const acc = unassigned.reduce((s, m) => s + m.acc, 0);
    result.push({
      team_id: null,
      team_name: 'Ανεξάρτητοι Συνεργάτες',
      crm,
      acc,
      pctOfCompany: totalCrm > 0 ? Math.round((crm / totalCrm) * 100) : 0,
      members: unassigned.sort((a, b) => b.crm - a.crm),
    });
  }

  return result.sort((a, b) => b.crm - a.crm);
}

/** Per-office KPI comparison with M.O. per agent */
export function computeOfficeKpiComparison(
  metrics: CombinedMetric[],
  crmField: string,
  accField: string | null,
): OfficeKpiComparison[] {
  const individuals = individualsOnly(metrics);
  const crmKey = crmField as keyof CombinedMetric;
  const accKey = accField as keyof CombinedMetric | null;

  const officeMap = new Map<string, { agents: Set<number>; crm: number; acc: number }>();
  for (const m of individuals) {
    const office = m.office || 'Αγνωστο';
    if (!officeMap.has(office)) officeMap.set(office, { agents: new Set(), crm: 0, acc: 0 });
    const entry = officeMap.get(office)!;
    entry.agents.add(m.agent_id);
    entry.crm += Number(m[crmKey]) || 0;
    entry.acc += accKey ? (Number(m[accKey]) || 0) : 0;
  }

  return Array.from(officeMap.entries())
    .map(([office, v]) => ({
      office,
      agents: v.agents.size,
      crm: v.crm,
      acc: v.acc,
      moPerAgent: v.agents.size > 0 ? Math.round((v.crm / v.agents.size) * 10) / 10 : 0,
    }))
    .sort((a, b) => {
      if (a.office === 'larissa') return -1;
      if (b.office === 'larissa') return 1;
      return a.office.localeCompare(b.office);
    });
}

/** Company average CRM per agent */
export function computeCompanyAvg(metrics: CombinedMetric[], crmField: string): number {
  const individuals = individualsOnly(metrics);
  const crmKey = crmField as keyof CombinedMetric;

  // Aggregate per agent first (multi-month)
  const agentTotals = new Map<number, number>();
  for (const m of individuals) {
    agentTotals.set(m.agent_id, (agentTotals.get(m.agent_id) || 0) + (Number(m[crmKey]) || 0));
  }

  const agentCount = agentTotals.size;
  if (agentCount === 0) return 0;
  const total = Array.from(agentTotals.values()).reduce((s, v) => s + v, 0);
  return Math.round((total / agentCount) * 10) / 10;
}

/** 4 Club: agents sorted by crm_exclusives_residential */
export function computeFourClub(metrics: CombinedMetric[]): FourClubAgent[] {
  const individuals = individualsOnly(metrics);

  const agentMap = new Map<number, { name: string; office: string | null; count: number }>();
  for (const m of individuals) {
    const existing = agentMap.get(m.agent_id);
    const val = Number(m.crm_exclusives_residential) || 0;
    if (existing) {
      existing.count += val;
    } else {
      agentMap.set(m.agent_id, {
        name: m.canonical_name || `Agent #${m.agent_id}`,
        office: m.office,
        count: val,
      });
    }
  }

  return Array.from(agentMap.entries())
    .map(([agent_id, v]) => ({ agent_id, name: v.name, office: v.office, count: v.count }))
    .sort((a, b) => b.count - a.count);
}

// ══════════════════════════════════════════════════════════
// ── Withdrawal Reasons (Cycle 3)
// ══════════════════════════════════════════════════════════

export interface WithdrawalCategorySummary {
  key: string;
  label: string;
  color: string;
  reasons: { reason: string; cnt: number }[];
  total: number;
}

export interface WithdrawalTeamRow {
  team_id: number | null;
  team_name: string;
  passive: number;
  active: number;
  closings: number;
  total: number;
}

export interface FunnelByTypeRow {
  subcategory: string;
  registrations: number;
  exclusives: number;
  published: number;
  showings: number;
  closings: number;
  convPct: number | null;
}

export const WITHDRAWAL_CATEGORIES: {
  key: string;
  label: string;
  color: string;
  reasons: string[];
}[] = [
  {
    key: 'passive',
    label: 'Παθητικές',
    color: '#8A94A0',
    reasons: ['Ανενεργό', 'Σε εκκρεμότητα', 'Προς έλεγχο - Χαρτιά'],
  },
  {
    key: 'active',
    label: 'Ενεργές',
    color: '#DC3545',
    reasons: [
      'Άρση εντολής',
      'Προβληματικός πωλητής',
      'Μεγάλη τιμή',
      'Πρόβλημα αρτιότητας',
      'Έκλεισε από άλλο μεσίτη',
      'Έκλεισε από τον πελάτη',
    ],
  },
  {
    key: 'closings',
    label: 'Κλεισίματα',
    color: '#1D7A4E',
    reasons: ['Έκλεισε από εμάς', 'Συμβόλαιο σε εξέλιξη'],
  },
];

export const ALL_WITHDRAWAL_REASONS: string[] = WITHDRAWAL_CATEGORIES.flatMap(c => c.reasons);

/** Aggregate withdrawal reasons into 3 category summaries */
export function computeWithdrawalSummary(
  rows: WithdrawalReason[],
): WithdrawalCategorySummary[] {
  // Sum by reason across all rows
  const reasonTotals = new Map<string, number>();
  for (const r of rows) {
    reasonTotals.set(r.reason, (reasonTotals.get(r.reason) || 0) + r.cnt);
  }

  return WITHDRAWAL_CATEGORIES.map(cat => {
    const reasons = cat.reasons
      .map(reason => ({ reason, cnt: reasonTotals.get(reason) || 0 }))
      .sort((a, b) => b.cnt - a.cnt);
    return {
      key: cat.key,
      label: cat.label,
      color: cat.color,
      reasons,
      total: reasons.reduce((s, r) => s + r.cnt, 0),
    };
  });
}

/** Aggregate withdrawals by team, split into passive/active/closings */
export function computeWithdrawalsByTeam(
  rows: WithdrawalReason[],
  teams: Team[],
  teamMembers: TeamMember[],
): WithdrawalTeamRow[] {
  // Build reason → category lookup
  const reasonCat = new Map<string, string>();
  for (const cat of WITHDRAWAL_CATEGORIES) {
    for (const r of cat.reasons) reasonCat.set(r, cat.key);
  }

  // Build agent_id → team_id lookup
  const agentTeam = new Map<number, number>();
  for (const tm of teamMembers) {
    agentTeam.set(tm.agent_id, tm.team_id);
  }

  // Aggregate per team (null = unassigned)
  const teamMap = new Map<number | null, { passive: number; active: number; closings: number }>();
  for (const r of rows) {
    const tid = agentTeam.get(r.agent_id) ?? null;
    if (!teamMap.has(tid)) teamMap.set(tid, { passive: 0, active: 0, closings: 0 });
    const entry = teamMap.get(tid)!;
    const cat = reasonCat.get(r.reason);
    if (cat === 'passive') entry.passive += r.cnt;
    else if (cat === 'active') entry.active += r.cnt;
    else if (cat === 'closings') entry.closings += r.cnt;
  }

  // Build team_id → name lookup
  const teamName = new Map<number, string>(teams.map(t => [t.team_id, t.team_name]));

  return Array.from(teamMap.entries())
    .map(([tid, v]) => ({
      team_id: tid,
      team_name: tid !== null ? (teamName.get(tid) || `Team #${tid}`) : 'Ανεξάρτητοι',
      passive: v.passive,
      active: v.active,
      closings: v.closings,
      total: v.passive + v.active + v.closings,
    }))
    .sort((a, b) => b.total - a.total);
}

// ══════════════════════════════════════════════════════════
// ── Funnel by Type (Cycle 3)
// ══════════════════════════════════════════════════════════

/** Aggregate FunnelRow[] into per-subcategory summaries with conv% */
// ══════════════════════════════════════════════════════════
// ── CRM vs Accountability (Cycle 5)
// ══════════════════════════════════════════════════════════

export interface CrmVsAccRow {
  key: string;
  label: string;
  crm: number;
  acc: number;
  delta: number;
  pctDiff: number;
}

export interface GciRanking {
  agent_id: number;
  name: string;
  office: string | null;
  gci: number;
  rank: number;
}

/** Company-level CRM vs ACC comparison for KPIs that have an ACC counterpart */
export function computeCrmVsAccSummary(metrics: CombinedMetric[]): CrmVsAccRow[] {
  const individuals = individualsOnly(metrics);

  return KPI_DEFS
    .filter(def => def.accField !== null)
    .map(def => {
      const crmKey = def.crmField as keyof CombinedMetric;
      const accKey = def.accField as keyof CombinedMetric;
      const crm = sumField(metrics, crmKey);
      const acc = sumField(individuals, accKey);
      const delta = crm - acc;
      const pctDiff = acc > 0
        ? Math.round(((crm - acc) / acc) * 1000) / 10
        : crm > 0 ? 100 : 0;
      return { key: def.key, label: def.label, crm, acc, delta, pctDiff };
    });
}

/** Find the agent with the largest |CRM - ACC| deviation across all KPIs */
export function computeAgentMaxDeviation(
  metrics: CombinedMetric[],
): { agent: string; kpi: string; delta: number } | null {
  const individuals = individualsOnly(metrics);
  const defsWithAcc = KPI_DEFS.filter(d => d.accField !== null);

  const agentMap = new Map<number, { name: string; fields: Record<string, { crm: number; acc: number }> }>();

  for (const m of individuals) {
    if (!agentMap.has(m.agent_id)) {
      agentMap.set(m.agent_id, {
        name: m.canonical_name || `Agent #${m.agent_id}`,
        fields: {},
      });
    }
    const entry = agentMap.get(m.agent_id)!;
    for (const def of defsWithAcc) {
      const crmKey = def.crmField as keyof CombinedMetric;
      const accKey = def.accField as keyof CombinedMetric;
      if (!entry.fields[def.key]) entry.fields[def.key] = { crm: 0, acc: 0 };
      entry.fields[def.key].crm += Number(m[crmKey]) || 0;
      entry.fields[def.key].acc += Number(m[accKey]) || 0;
    }
  }

  let maxDelta = 0;
  let result: { agent: string; kpi: string; delta: number } | null = null;

  for (const [, agent] of agentMap) {
    for (const [kpiKey, vals] of Object.entries(agent.fields)) {
      const absDelta = Math.abs(vals.crm - vals.acc);
      if (absDelta > maxDelta) {
        maxDelta = absDelta;
        const def = defsWithAcc.find(d => d.key === kpiKey)!;
        result = { agent: agent.name, kpi: def.label, delta: vals.crm - vals.acc };
      }
    }
  }

  return result;
}

/** Agents sorted by GCI descending with rank numbers */
export function computeGciRankings(metrics: CombinedMetric[]): GciRanking[] {
  const individuals = individualsOnly(metrics);

  const agentMap = new Map<number, { name: string; office: string | null; gci: number }>();
  for (const m of individuals) {
    const existing = agentMap.get(m.agent_id);
    const gci = Number(m.gci) || 0;
    if (existing) {
      existing.gci += gci;
    } else {
      agentMap.set(m.agent_id, {
        name: m.canonical_name || `Agent #${m.agent_id}`,
        office: m.office,
        gci,
      });
    }
  }

  return Array.from(agentMap.entries())
    .map(([agent_id, v]) => ({ agent_id, ...v }))
    .sort((a, b) => b.gci - a.gci)
    .map((a, i) => ({ ...a, rank: i + 1 }));
}

// ══════════════════════════════════════════════════════════
// ── Funnel by Type (Cycle 3)
// ══════════════════════════════════════════════════════════

/** Aggregate FunnelRow[] into per-subcategory summaries with conv% */
export function computeFunnelByType(rows: FunnelRow[]): FunnelByTypeRow[] {
  const subMap = new Map<string, Omit<FunnelByTypeRow, 'convPct'>>();

  for (const r of rows) {
    const existing = subMap.get(r.subcategory);
    if (existing) {
      existing.registrations += r.registrations;
      existing.exclusives += r.exclusives;
      existing.published += r.published;
      existing.showings += r.showings;
      existing.closings += r.closings;
    } else {
      subMap.set(r.subcategory, {
        subcategory: r.subcategory,
        registrations: r.registrations,
        exclusives: r.exclusives,
        published: r.published,
        showings: r.showings,
        closings: r.closings,
      });
    }
  }

  return Array.from(subMap.values())
    .map(r => ({
      ...r,
      convPct: r.registrations > 0
        ? Math.round((r.closings / r.registrations) * 1000) / 10
        : null,
    }))
    .sort((a, b) => b.registrations - a.registrations);
}
