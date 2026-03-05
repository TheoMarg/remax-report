import type {
  Agent,
  ClosingWithProperty,
  PropertyEvent,
  Showing,
  StageDuration,
  StageSummaryRow,
  PropertyCardData,
} from './types';

// ── Event Type Config ──

export const EVENT_TYPE_CONFIG: Record<string, { label: string; color: string }> = {
  activation:  { label: 'Ενεργοποίηση',  color: '#1B5299' },
  exclusive:   { label: 'Αποκλειστική',   color: '#168F80' },
  published:   { label: 'Δημοσίευση',     color: '#1D7A4E' },
  showing:     { label: 'Υπόδειξη',       color: '#6B5CA5' },
  offer:       { label: 'Προσφορά',        color: '#C9961A' },
  deposit:     { label: 'Προκαταβολή',     color: '#D4722A' },
  closing:     { label: 'Κλείσιμο',        color: '#0C1E3C' },
  withdrawal:  { label: 'Απόσυρση',        color: '#DC3545' },
  price_change:{ label: 'Αλλαγή τιμής',   color: '#8A94A0' },
  registration:{ label: 'Καταγραφή',       color: '#3A4550' },
};

// ── Canonical Stage Pairs ──

export const STAGE_PAIRS: { from: string; to: string; label: string }[] = [
  { from: 'activation',  to: 'exclusive',  label: 'Ενεργ. → Αποκλ.' },
  { from: 'activation',  to: 'published',  label: 'Ενεργ. → Δημοσ.' },
  { from: 'published',   to: 'showing',    label: 'Δημοσ. → Υπόδ.' },
  { from: 'showing',     to: 'deposit',    label: 'Υπόδ. → Προκατ.' },
  { from: 'deposit',     to: 'closing',    label: 'Προκατ. → Κλείσ.' },
  { from: 'activation',  to: 'closing',    label: 'Ενεργ. → Κλείσ.' },
];

// ── Helpers ──

/** Add 1 month to a YYYY-MM-DD date string (for period filtering) */
export function computeEndExclusive(endDate: string): string {
  const d = new Date(endDate + 'T00:00:00');
  d.setMonth(d.getMonth() + 1);
  return d.toISOString().slice(0, 10);
}

/** Days between two ISO date strings */
export function daysBetween(a: string, b: string): number {
  const msPerDay = 86_400_000;
  const da = new Date(a + 'T00:00:00').getTime();
  const db = new Date(b + 'T00:00:00').getTime();
  return Math.round(Math.abs(db - da) / msPerDay);
}

/** Group array by key function */
export function groupBy<T>(arr: T[], keyFn: (item: T) => string): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const item of arr) {
    const key = keyFn(item);
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(item);
  }
  return map;
}

/** Format ISO date → DD/MM/YYYY */
export function formatDateEL(iso: string | null): string {
  if (!iso) return '—';
  const parts = iso.slice(0, 10).split('-');
  if (parts.length !== 3) return iso;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

// ── Stage Duration Computation ──

/** Compute stage durations for a single property's event list */
export function computeStageDurations(events: PropertyEvent[]): StageDuration[] {
  // Build map: event_type → earliest date
  const typeDate = new Map<string, string>();
  const sorted = [...events].sort((a, b) => a.event_date.localeCompare(b.event_date));
  for (const ev of sorted) {
    if (!typeDate.has(ev.event_type)) {
      typeDate.set(ev.event_type, ev.event_date);
    }
  }

  const stages: StageDuration[] = [];
  for (const pair of STAGE_PAIRS) {
    const fromDate = typeDate.get(pair.from);
    const toDate = typeDate.get(pair.to);
    if (fromDate && toDate && toDate >= fromDate) {
      const fromCfg = EVENT_TYPE_CONFIG[pair.from];
      const toCfg = EVENT_TYPE_CONFIG[pair.to];
      stages.push({
        from: pair.from,
        to: pair.to,
        fromLabel: fromCfg?.label ?? pair.from,
        toLabel: toCfg?.label ?? pair.to,
        days: daysBetween(fromDate, toDate),
        fromDate,
        toDate,
      });
    }
  }
  return stages;
}

// ── Assembly ──

/** Build PropertyCardData[] from raw query results */
export function assemblePropertyCards(
  closings: ClosingWithProperty[],
  events: PropertyEvent[],
  showings: Showing[],
  agents: Agent[],
): PropertyCardData[] {
  const agentMap = new Map(agents.map(a => [a.agent_id, a.canonical_name || `Agent #${a.agent_id}`]));
  const eventsByProp = groupBy(events, e => e.property_id);
  const showingsByProp = groupBy(showings, s => s.property_id ?? '');

  return closings.map(closing => {
    const propId = closing.property_id ?? '';
    const propEvents = eventsByProp.get(propId) ?? [];
    const propShowings = showingsByProp.get(propId) ?? [];
    const stages = computeStageDurations(propEvents);

    // Total days: activation → closing
    const activationToClose = stages.find(s => s.from === 'activation' && s.to === 'closing');
    const totalDaysToClose = activationToClose?.days ?? null;

    // List-to-close ratio: closing price / listing price
    const listPrice = closing.properties?.price;
    const closePrice = closing.price;
    const listToCloseRatio =
      listPrice && closePrice && listPrice > 0
        ? Math.round((closePrice / listPrice) * 1000) / 10
        : null;

    return {
      closing,
      agentName: closing.agent_id ? (agentMap.get(closing.agent_id) ?? `Agent #${closing.agent_id}`) : '—',
      events: propEvents.sort((a, b) => a.event_date.localeCompare(b.event_date)),
      showings: propShowings,
      stages,
      totalDaysToClose,
      listToCloseRatio,
    };
  });
}

// ── Summary Aggregation ──

/** Compute stage averages/min/max across all property cards */
export function computeStageSummary(cards: PropertyCardData[]): StageSummaryRow[] {
  const stageMap = new Map<string, number[]>();

  for (const card of cards) {
    for (const stage of card.stages) {
      const key = `${stage.from}→${stage.to}`;
      if (!stageMap.has(key)) stageMap.set(key, []);
      stageMap.get(key)!.push(stage.days);
    }
  }

  return STAGE_PAIRS
    .map(pair => {
      const key = `${pair.from}→${pair.to}`;
      const values = stageMap.get(key);
      if (!values || values.length === 0) return null;
      return {
        from: pair.from,
        to: pair.to,
        label: pair.label,
        avgDays: Math.round(values.reduce((s, v) => s + v, 0) / values.length),
        minDays: Math.min(...values),
        maxDays: Math.max(...values),
        count: values.length,
      };
    })
    .filter((row): row is StageSummaryRow => row !== null);
}
