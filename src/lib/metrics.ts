import type { CombinedMetric } from './types';

// ── Types ──

export interface KpiSummary {
  key: string;
  label: string;
  crm: number;
  acc: number;
  delta: number;       // crm - acc
  color: string;
  byOffice: { office: string; crm: number }[];
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

const KPI_DEFS = [
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
function sumField(rows: CombinedMetric[], field: keyof CombinedMetric): number {
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

export function computeTopAgent(metrics: CombinedMetric[]): TopPerformer | null {
  const individuals = individualsOnly(metrics);
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
