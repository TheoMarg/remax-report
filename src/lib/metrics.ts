import type { CombinedMetric, Team, TeamMember } from './types';

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
  byOffice: { office: string; crm: number }[];
}

export interface AgentKpiRow {
  agent_id: number;
  name: string;
  office: string | null;
  crm: number;
  acc: number;
  delta: number;
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

  // Group by office
  const officeMap = new Map<string, CombinedMetric[]>();
  for (const m of individuals) {
    const office = m.office || 'Άγνωστο';
    if (!officeMap.has(office)) officeMap.set(office, []);
    officeMap.get(office)!.push(m);
  }
  const officeNames = Array.from(officeMap.keys()).sort((a, b) => {
    if (a === 'larissa') return -1;
    if (b === 'larissa') return 1;
    return a.localeCompare(b);
  });

  return KPI_DEFS.map(def => {
    const crmKey = def.crmField as keyof CombinedMetric;
    const crm = sumField(individuals, crmKey);
    const acc = def.accField ? sumField(individuals, def.accField as keyof CombinedMetric) : 0;
    const byOffice = officeNames.map(office => ({
      office,
      crm: sumField(officeMap.get(office)!, crmKey),
    }));
    return {
      key: def.key,
      label: def.label,
      crm,
      acc,
      delta: crm - acc,
      color: def.color,
      byOffice,
    };
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
    name: top.canonical_name || `Team #${top.agent_id}`,
    value: top.gci || 0,
  };
}

// ── Office Head-to-Head ──

export function computeOfficeComparison(metrics: CombinedMetric[]): OfficeSummary[] {
  const individuals = individualsOnly(metrics);
  const officeMap = new Map<string, { rows: CombinedMetric[]; agents: Set<number> }>();

  for (const m of individuals) {
    const office = m.office || 'Άγνωστο';
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
  const individuals = individualsOnly(metrics);
  const steps = [
    { label: 'Καταγραφές',        value: sumField(individuals, 'crm_registrations') },
    { label: 'Νέες Αποκλειστικές', value: sumField(individuals, 'crm_exclusives') },
    { label: 'Νέα Δημοσιευμένα',  value: sumField(individuals, 'crm_published') },
    { label: 'Υποδείξεις',        value: sumField(individuals, 'crm_showings') },
    { label: 'Προσφορές',         value: sumField(individuals, 'crm_offers') },
    { label: 'Κλεισίματα',        value: sumField(individuals, 'crm_closings') },
    { label: 'Συμβολαιοποιήσεις', value: sumField(individuals, 'crm_billing') },
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

  // Aggregate per agent_id (multi-month)
  const agentMap = new Map<number, { name: string; office: string | null; crm: number; acc: number }>();
  for (const m of individuals) {
    const existing = agentMap.get(m.agent_id);
    const crmVal = Number(m[crmKey]) || 0;
    const accVal = accKey ? (Number(m[accKey]) || 0) : 0;
    if (existing) {
      existing.crm += crmVal;
      existing.acc += accVal;
    } else {
      agentMap.set(m.agent_id, {
        name: m.canonical_name || `Agent #${m.agent_id}`,
        office: m.office,
        crm: crmVal,
        acc: accVal,
      });
    }
  }

  return Array.from(agentMap.entries())
    .map(([agent_id, v]) => ({
      agent_id,
      name: v.name,
      office: v.office,
      crm: v.crm,
      acc: v.acc,
      delta: v.crm - v.acc,
    }))
    .sort((a, b) => b.crm - a.crm);
}

/** Team breakdown: totals per team + member lists */
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
    const crm = members.reduce((s, m) => s + m.crm, 0);
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

  // "Χωρίς Team" bucket
  const unassigned = agentRows.filter(a => !assignedAgents.has(a.agent_id));
  if (unassigned.length > 0) {
    const crm = unassigned.reduce((s, m) => s + m.crm, 0);
    const acc = unassigned.reduce((s, m) => s + m.acc, 0);
    result.push({
      team_id: null,
      team_name: 'Χωρίς Team',
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
    const office = m.office || 'Άγνωστο';
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
