import { useState, useMemo } from 'react';
import type { Period, PropertyJourney } from '../lib/types';
import { usePropertyJourneys } from '../hooks/usePropertyJourneys';
import { useActiveExclusives } from '../hooks/useActiveExclusives';
import { EntityLink } from '../components/shared/EntityLink';
import { StatusBadge } from '../components/shared/StatusBadge';
import { formatDateEL } from '../lib/propertyMetrics';

interface Props {
  period: Period;
}

/* ── Helpers ── */

function fmtEur(n: number | null | undefined): string {
  if (n == null) return '—';
  return n.toLocaleString('el-GR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });
}

function fmt(n: number | null | undefined): string {
  if (n == null) return '—';
  return n.toLocaleString('el-GR');
}

function eurPerSqm(price: number | null | undefined, sqm: number | null | undefined): number | null {
  return price && sqm ? Math.round(price / sqm) : null;
}

type PubStatus = 'active' | 'slow' | 'cold';

function computePubStatus(j: PropertyJourney): PubStatus {
  const dom = j.days_on_market ?? 0;
  // Cold: published >90d, no showing in 60d — proxy: >90d and 0 showings
  if (dom > 90 && j.total_showings === 0) return 'cold';
  // Slow: published >30d, no showing in 30d — proxy: >30d and 0 showings
  if (dom > 30 && j.total_showings === 0) return 'slow';
  return 'active';
}

type SortKey =
  | 'property_code'
  | 'subcategory'
  | 'area'
  | 'listing_price'
  | 'size_sqm'
  | 'eur_sqm'
  | 'first_pub_date'
  | 'days_on_market'
  | 'total_showings'
  | 'exclusive'
  | 'canonical_name'
  | 'status';

/* ── Component ── */

export function PortfolioPublished({ period }: Props) {
  const { data: journeys = [], isLoading } = usePropertyJourneys(period);
  const { data: exclusives = [] } = useActiveExclusives();

  const [officeFilter, setOfficeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'slow' | 'cold'>('all');
  const [exclusiveOnly, setExclusiveOnly] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>('days_on_market');
  const [sortAsc, setSortAsc] = useState(false);

  // Set of property_ids with active exclusive
  const exclusiveSet = useMemo(
    () => new Set(exclusives.map(e => e.property_id)),
    [exclusives],
  );

  // Online properties: not retired and has been published
  const onlineProperties = useMemo(
    () => journeys.filter(j => !j.is_retired && j.has_published),
    [journeys],
  );

  // Unique offices
  const offices = useMemo(() => {
    const set = new Set(onlineProperties.map(j => j.office).filter(Boolean) as string[]);
    return [...set].sort();
  }, [onlineProperties]);

  // ── KPIs ──
  const kpis = useMemo(() => {
    const newListings = journeys.filter(
      j => j.first_pub_date && j.first_pub_date >= period.start && j.first_pub_date < period.end,
    ).length;

    const online = onlineProperties;
    const onlineCount = online.length;

    const daysOnline = online.filter(j => j.days_on_market != null);
    const avgDaysOnline =
      daysOnline.length > 0
        ? Math.round(daysOnline.reduce((s, j) => s + (j.days_on_market ?? 0), 0) / daysOnline.length)
        : null;

    // Avg time to first showing (for those with dt_first_showing, diff from first_pub_date)
    const withFirstShowing = online.filter(j => j.dt_first_showing && j.first_pub_date);
    let avgTimeToFirstShowing: number | null = null;
    if (withFirstShowing.length > 0) {
      const totalDays = withFirstShowing.reduce((s, j) => {
        const pub = new Date(j.first_pub_date! + 'T00:00:00').getTime();
        const fs = new Date(j.dt_first_showing! + 'T00:00:00').getTime();
        return s + Math.max(0, Math.round((fs - pub) / 86_400_000));
      }, 0);
      avgTimeToFirstShowing = Math.round(totalDays / withFirstShowing.length);
    }

    // Online >30d with 0 showings
    const staleNoShowings = online.filter(
      j => (j.days_on_market ?? 0) > 30 && j.total_showings === 0,
    ).length;

    // Exclusive ratio
    const onlineWithExclusive = online.filter(j => exclusiveSet.has(j.property_id)).length;
    const exclusiveRatio = onlineCount > 0 ? Math.round((onlineWithExclusive / onlineCount) * 100) : 0;

    // Avg listed price
    const withPrice = online.filter(j => j.listing_price != null && j.listing_price > 0);
    const avgPrice =
      withPrice.length > 0
        ? Math.round(withPrice.reduce((s, j) => s + j.listing_price!, 0) / withPrice.length)
        : null;

    // Avg EUR/m2
    const withPriceAndSqm = online.filter(
      j => j.listing_price != null && j.listing_price > 0 && j.size_sqm != null && j.size_sqm > 0,
    );
    const avgEurSqm =
      withPriceAndSqm.length > 0
        ? Math.round(
            withPriceAndSqm.reduce((s, j) => s + j.listing_price! / j.size_sqm!, 0) /
              withPriceAndSqm.length,
          )
        : null;

    return {
      newListings,
      onlineCount,
      avgDaysOnline,
      avgTimeToFirstShowing,
      staleNoShowings,
      exclusiveRatio,
      avgPrice,
      avgEurSqm,
    };
  }, [journeys, onlineProperties, exclusiveSet, period]);

  // ── Filtered & sorted table data ──
  const tableData = useMemo(() => {
    let list = onlineProperties.map(j => ({
      ...j,
      pubStatus: computePubStatus(j),
      hasExclusive: exclusiveSet.has(j.property_id),
      eurSqm: eurPerSqm(j.listing_price, j.size_sqm),
    }));

    // Office filter
    if (officeFilter !== 'all') list = list.filter(j => j.office === officeFilter);

    // Status filter
    if (statusFilter !== 'all') list = list.filter(j => j.pubStatus === statusFilter);

    // Exclusive only
    if (exclusiveOnly) list = list.filter(j => j.hasExclusive);

    // Sort
    list.sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case 'property_code':
          cmp = (a.property_code ?? '').localeCompare(b.property_code ?? '');
          break;
        case 'subcategory':
          cmp = (a.subcategory ?? '').localeCompare(b.subcategory ?? '');
          break;
        case 'area':
          cmp = (a.area ?? '').localeCompare(b.area ?? '');
          break;
        case 'listing_price':
          cmp = (a.listing_price ?? 0) - (b.listing_price ?? 0);
          break;
        case 'size_sqm':
          cmp = (a.size_sqm ?? 0) - (b.size_sqm ?? 0);
          break;
        case 'eur_sqm':
          cmp = (a.eurSqm ?? 0) - (b.eurSqm ?? 0);
          break;
        case 'first_pub_date':
          cmp = (a.first_pub_date ?? '').localeCompare(b.first_pub_date ?? '');
          break;
        case 'days_on_market':
          cmp = (a.days_on_market ?? 0) - (b.days_on_market ?? 0);
          break;
        case 'total_showings':
          cmp = a.total_showings - b.total_showings;
          break;
        case 'exclusive':
          cmp = Number(a.hasExclusive) - Number(b.hasExclusive);
          break;
        case 'canonical_name':
          cmp = (a.canonical_name ?? '').localeCompare(b.canonical_name ?? '');
          break;
        case 'status': {
          const order: Record<PubStatus, number> = { active: 0, slow: 1, cold: 2 };
          cmp = order[a.pubStatus] - order[b.pubStatus];
          break;
        }
      }
      return sortAsc ? cmp : -cmp;
    });

    return list;
  }, [onlineProperties, exclusiveSet, officeFilter, statusFilter, exclusiveOnly, sortKey, sortAsc]);

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortAsc(!sortAsc);
    } else {
      setSortKey(key);
      setSortAsc(false);
    }
  }

  function sortIcon(key: SortKey) {
    if (sortKey !== key) return '';
    return sortAsc ? ' \u25B2' : ' \u25BC';
  }

  // ── Render ──

  if (isLoading) {
    return (
      <div className="max-w-[1600px] mx-auto px-6 py-6 space-y-6">
        <h2 className="text-xl font-semibold text-text-primary">
          Δημοσιευμένα Ακίνητα
          <span className="text-sm font-normal text-text-muted ml-3">{period.label}</span>
        </h2>
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-20 bg-surface-light rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[1600px] mx-auto px-6 py-6 space-y-6">
      <h2 className="text-xl font-semibold text-text-primary">
        Δημοσιευμένα Ακίνητα
        <span className="text-sm font-normal text-text-muted ml-3">{period.label}</span>
      </h2>

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard label="Νέες Δημοσιεύσεις" value={fmt(kpis.newListings)} accent="text-brand-blue" />
        <KpiCard label="Online Τώρα" value={fmt(kpis.onlineCount)} accent="text-brand-green" />
        <KpiCard
          label="Μ.Ο. Ημέρες Online"
          value={kpis.avgDaysOnline != null ? `${kpis.avgDaysOnline}d` : '—'}
          accent="text-brand-orange"
        />
        <KpiCard
          label="Μ.Ο. Χρόνος 1ης Υπόδειξης"
          value={kpis.avgTimeToFirstShowing != null ? `${kpis.avgTimeToFirstShowing}d` : '—'}
          accent="text-brand-teal"
        />
        <KpiCard
          label="Online >30d Χωρίς Υποδ."
          value={fmt(kpis.staleNoShowings)}
          accent="text-brand-red"
        />
        <KpiCard
          label="Αποκλειστικότητα"
          value={`${kpis.exclusiveRatio}%`}
          accent="text-brand-purple"
        />
        <KpiCard
          label="Μ.Ο. Τιμή Καταχώρησης"
          value={fmtEur(kpis.avgPrice)}
          accent="text-brand-gold"
        />
        <KpiCard
          label="Μ.Ο. €/τ.μ."
          value={kpis.avgEurSqm != null ? `${fmt(kpis.avgEurSqm)} €` : '—'}
          accent="text-brand-gold"
        />
      </div>

      {/* ── Filters ── */}
      <div className="flex flex-wrap items-center gap-4 bg-surface-card rounded-xl border border-border-default p-3">
        {/* Office dropdown */}
        <div className="flex items-center gap-2">
          <label className="text-xs text-text-muted font-medium">Γραφείο:</label>
          <select
            value={officeFilter}
            onChange={e => setOfficeFilter(e.target.value)}
            className="text-xs bg-surface border border-border-default rounded-md px-2 py-1 text-text-primary"
          >
            <option value="all">Όλα</option>
            {offices.map(o => (
              <option key={o} value={o}>{o}</option>
            ))}
          </select>
        </div>

        {/* Status radio */}
        <div className="flex items-center gap-3">
          <span className="text-xs text-text-muted font-medium">Κατάσταση:</span>
          {(['all', 'active', 'slow', 'cold'] as const).map(s => (
            <label key={s} className="flex items-center gap-1 cursor-pointer">
              <input
                type="radio"
                name="statusFilter"
                checked={statusFilter === s}
                onChange={() => setStatusFilter(s)}
                className="accent-brand-blue w-3 h-3"
              />
              <span className="text-xs text-text-secondary">
                {s === 'all' ? 'Όλα' : s === 'active' ? 'Active' : s === 'slow' ? 'Slow' : 'Cold'}
              </span>
            </label>
          ))}
        </div>

        {/* Exclusive toggle */}
        <label className="flex items-center gap-2 cursor-pointer ml-auto">
          <span className="text-xs text-text-muted font-medium">Μόνο Αποκλειστικά</span>
          <button
            type="button"
            role="switch"
            aria-checked={exclusiveOnly}
            onClick={() => setExclusiveOnly(!exclusiveOnly)}
            className={`relative w-8 h-4 rounded-full transition-colors ${
              exclusiveOnly ? 'bg-brand-blue' : 'bg-gray-300'
            }`}
          >
            <span
              className={`absolute top-0.5 left-0.5 w-3 h-3 bg-white rounded-full shadow transition-transform ${
                exclusiveOnly ? 'translate-x-4' : 'translate-x-0'
              }`}
            />
          </button>
        </label>
      </div>

      {/* ── Table ── */}
      <div className="bg-surface-card rounded-xl border border-border-default p-4 overflow-x-auto">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-text-primary">
            Λίστα Ακινήτων ({fmt(tableData.length)})
          </h3>
        </div>

        {tableData.length === 0 ? (
          <p className="text-sm text-text-muted text-center py-8">
            Δεν βρέθηκαν ακίνητα με τα επιλεγμένα φίλτρα.
          </p>
        ) : (
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-text-muted border-b border-border-default">
                <Th label="Κωδικός" sortKey="property_code" current={sortKey} asc={sortAsc} onClick={handleSort} icon={sortIcon} />
                <Th label="Τύπος" sortKey="subcategory" current={sortKey} asc={sortAsc} onClick={handleSort} icon={sortIcon} />
                <Th label="Περιοχή" sortKey="area" current={sortKey} asc={sortAsc} onClick={handleSort} icon={sortIcon} />
                <Th label="Τιμή" sortKey="listing_price" current={sortKey} asc={sortAsc} onClick={handleSort} icon={sortIcon} align="right" />
                <Th label="τ.μ." sortKey="size_sqm" current={sortKey} asc={sortAsc} onClick={handleSort} icon={sortIcon} align="right" />
                <Th label="€/τ.μ." sortKey="eur_sqm" current={sortKey} asc={sortAsc} onClick={handleSort} icon={sortIcon} align="right" />
                <Th label="Δημοσίευση" sortKey="first_pub_date" current={sortKey} asc={sortAsc} onClick={handleSort} icon={sortIcon} />
                <Th label="Ημέρες" sortKey="days_on_market" current={sortKey} asc={sortAsc} onClick={handleSort} icon={sortIcon} align="right" />
                <Th label="Υποδ." sortKey="total_showings" current={sortKey} asc={sortAsc} onClick={handleSort} icon={sortIcon} align="right" />
                <Th label="Αποκλ." sortKey="exclusive" current={sortKey} asc={sortAsc} onClick={handleSort} icon={sortIcon} align="center" />
                <Th label="Σύμβουλος" sortKey="canonical_name" current={sortKey} asc={sortAsc} onClick={handleSort} icon={sortIcon} />
                <Th label="Status" sortKey="status" current={sortKey} asc={sortAsc} onClick={handleSort} icon={sortIcon} />
              </tr>
            </thead>
            <tbody>
              {tableData.map(j => (
                <tr
                  key={j.property_id}
                  className="border-b border-border-subtle hover:bg-surface-light"
                >
                  <td className="py-1.5 pr-3">
                    <EntityLink
                      type="property"
                      id={j.property_id}
                      label={j.property_code || j.property_id.slice(0, 8)}
                      className="text-xs font-mono font-medium"
                    />
                  </td>
                  <td className="py-1.5 pr-3 text-text-secondary">
                    {j.subcategory || j.category || '—'}
                  </td>
                  <td className="py-1.5 pr-3 text-text-secondary">{j.area || '—'}</td>
                  <td className="py-1.5 pr-3 text-right tabular-nums">{fmtEur(j.listing_price)}</td>
                  <td className="py-1.5 pr-3 text-right tabular-nums">{j.size_sqm ? fmt(j.size_sqm) : '—'}</td>
                  <td className="py-1.5 pr-3 text-right tabular-nums">{j.eurSqm != null ? fmt(j.eurSqm) : '—'}</td>
                  <td className="py-1.5 pr-3 text-text-secondary">{formatDateEL(j.first_pub_date)}</td>
                  <td className="py-1.5 pr-3 text-right tabular-nums font-medium">
                    <span
                      className={
                        (j.days_on_market ?? 0) > 90
                          ? 'text-brand-red'
                          : (j.days_on_market ?? 0) > 30
                            ? 'text-brand-orange'
                            : 'text-text-primary'
                      }
                    >
                      {j.days_on_market ?? '—'}
                    </span>
                  </td>
                  <td className="py-1.5 pr-3 text-right tabular-nums">
                    {j.total_showings > 0 ? (
                      <span className="text-brand-green font-medium">{j.total_showings}</span>
                    ) : (
                      <span className="text-text-muted">0</span>
                    )}
                  </td>
                  <td className="py-1.5 pr-3 text-center">
                    {j.hasExclusive ? (
                      <span className="inline-block w-2 h-2 rounded-full bg-brand-blue" title="Αποκλειστικό" />
                    ) : (
                      <span className="text-text-muted">—</span>
                    )}
                  </td>
                  <td className="py-1.5 pr-3">
                    <EntityLink
                      type="agent"
                      id={j.agent_id}
                      label={j.canonical_name || `#${j.agent_id}`}
                      className="text-xs"
                    />
                  </td>
                  <td className="py-1.5">
                    <StatusBadge status={j.pubStatus} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Empty state */}
      {journeys.length === 0 && (
        <div className="card-premium p-8 text-center">
          <p className="text-text-muted">Δεν υπάρχουν δεδομένα δημοσιεύσεων για αυτήν την περίοδο.</p>
        </div>
      )}
    </div>
  );
}

/* ── Sub-components ── */

function KpiCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent: string;
}) {
  return (
    <div className="bg-surface-card rounded-xl border border-border-default p-4">
      <p className="text-xs text-text-muted mb-1">{label}</p>
      <p className={`text-xl font-bold tabular-nums ${accent}`}>{value}</p>
    </div>
  );
}

function Th({
  label,
  sortKey: sk,
  current: _current,
  asc: _asc,
  onClick,
  icon,
  align = 'left',
}: {
  label: string;
  sortKey: SortKey;
  current: SortKey;
  asc: boolean;
  onClick: (k: SortKey) => void;
  icon: (k: SortKey) => string;
  align?: 'left' | 'right' | 'center';
}) {
  const alignCls = align === 'right' ? 'text-right' : align === 'center' ? 'text-center' : 'text-left';
  return (
    <th
      className={`pb-1.5 pr-3 font-medium cursor-pointer select-none hover:text-text-primary whitespace-nowrap ${alignCls}`}
      onClick={() => onClick(sk)}
    >
      {label}
      <span className="text-[10px] ml-0.5">{icon(sk)}</span>
    </th>
  );
}
