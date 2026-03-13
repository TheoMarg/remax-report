import { useState, useMemo, useEffect, lazy, Suspense } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ScatterChart, Scatter, ZAxis,
} from 'recharts';
import type { Period } from '../lib/types';
import { usePricingData } from '../hooks/usePricingData';
import { usePricingEngine, type PricingFilters, type BreakdownRow } from '../hooks/usePricingEngine';
import type { PropertyPricing, ClosingPricing } from '../lib/types';
import { usePropertyJourneys } from '../hooks/usePropertyJourneys';
import { PriceElasticity } from '../components/pricing/PriceElasticity';
import { PropertyLink } from '../components/ui/PropertyLink';

const PropertyMap = lazy(() => import('../components/pricing/PropertyMap').then(m => ({ default: m.PropertyMap })));

type PricingRow = PropertyPricing | ClosingPricing;

type PricingMode = 'active' | 'closed';

function fmtEur(n: number | null | undefined): string {
  if (n == null) return '—';
  return `€${n.toLocaleString('el-GR', { maximumFractionDigits: 0 })}`;
}

function fmt(n: number | null | undefined): string {
  if (n == null) return '—';
  return n.toLocaleString('el-GR');
}

const OFFICE_LABELS: Record<string, string> = { larissa: 'Λάρισα', katerini: 'Κατερίνη' };
const PAGE_SIZE = 50;

interface Props {
  period: Period;
}

export function PricingIntelligence({ period }: Props) {
  const { data: journeys = [] } = usePropertyJourneys(period);
  const [mode, setMode] = useState<PricingMode>('active');
  const { data: rawData = [], isLoading } = usePricingData(mode, mode === 'closed' ? period : undefined);
  const { filters, toggleFilter, clearFilters, filtered, kpis, breakdowns } = usePricingEngine(rawData as PricingRow[]);

  const [page, setPage] = useState(0);
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(null);

  // Reset page when filters change
  const filterKey = JSON.stringify(filters);
  useEffect(() => setPage(0), [filterKey]);

  // Active filter chips
  const activeFilters = Object.entries(filters).filter(([, v]) => v != null) as [keyof PricingFilters, string | number][];

  // Agent ID → name lookup for breakdown card labels
  const agentNameMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const r of rawData as PricingRow[]) {
      const name = 'canonical_name' in r ? r.canonical_name : null;
      if (name) map.set(String(r.agent_id), name);
    }
    return map;
  }, [rawData]);

  // Scatter data: price vs size
  const scatterData = filtered
    .filter(r => {
      const p = 'closing_price' in r ? (r as ClosingPricing).closing_price : (r as PropertyPricing).price;
      return (p ?? 0) > 0 && (r.size_sqm ?? 0) > 0;
    })
    .slice(0, 200)
    .map(r => ({
      size: r.size_sqm,
      price: 'closing_price' in r ? (r as ClosingPricing).closing_price : (r as PropertyPricing).price,
      name: ('property_code' in r ? r.property_code : (r as ClosingPricing).property_id?.slice(0, 8)) || '—',
    }));

  // Map data: only properties with coordinates
  const mapProperties = useMemo(() =>
    filtered
      .filter(r => 'lat' in r && (r as PropertyPricing).lat && (r as PropertyPricing).lng)
      .map(r => {
        const pp = r as PropertyPricing;
        return {
          property_id: pp.property_id,
          property_code: pp.property_code,
          lat: pp.lat!,
          lng: pp.lng!,
          price: pp.price,
          size_sqm: pp.size_sqm,
          area: pp.area,
          subcategory: pp.subcategory,
        };
      }),
    [filtered]
  );

  // Paginated table rows
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages - 1);
  const tableRows = filtered.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE);

  // All property IDs for sibling navigation
  const allPropertyIds = useMemo(() => filtered.map(r => r.property_id), [filtered]);

  return (
    <div className="max-w-[1600px] mx-auto px-6 py-6 space-y-5">
      {/* Header + Mode Toggle */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-text-primary">
          Pricing Intelligence (Τιμολόγηση)
          <span className="text-sm font-normal text-text-muted ml-3">{period.label}</span>
        </h2>
        <div className="flex gap-1 bg-surface-light rounded-lg p-0.5">
          {([['active', 'Ενεργή Αγορά'], ['closed', 'Κλεισμένα']] as [PricingMode, string][]).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setMode(key)}
              className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${
                mode === key ? 'bg-surface-card text-brand-blue shadow-sm' : 'text-text-muted hover:text-text-primary'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => <div key={i} className="h-20 bg-surface-light rounded-lg animate-pulse" />)}
        </div>
      ) : (
        <>
          {/* Filter chips */}
          {activeFilters.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              {activeFilters.map(([key, val]) => (
                <button
                  key={key}
                  onClick={() => toggleFilter(key, val)}
                  className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium bg-brand-blue/10 text-brand-blue rounded-full hover:bg-brand-blue/20 transition-colors"
                >
                  {key}: {String(val)}
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M9 3L3 9M3 3l6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
                </button>
              ))}
              <button onClick={clearFilters} className="text-xs text-text-muted hover:text-brand-red transition-colors">
                Clear All
              </button>
            </div>
          )}

          {/* KPI Cards */}
          <div className="grid grid-cols-7 gap-2">
            {[
              { label: 'Ακίνητα', value: fmt(kpis.total_count), color: '#1B5299' },
              { label: 'Συν. Αξία', value: fmtEur(kpis.total_value), color: '#C9961A' },
              { label: 'Μ.Ο. Τιμή', value: fmtEur(kpis.avg_price), color: '#D4722A' },
              { label: '€/m² Πώλ.', value: fmtEur(kpis.avg_eur_per_sqm_sale), color: '#168F80' },
              { label: '€/m² Ενοικ.', value: fmtEur(kpis.avg_eur_per_sqm_rent), color: '#6B5CA5' },
              { label: 'Μ.Ο. m²', value: kpis.avg_size != null ? `${kpis.avg_size} τ.μ.` : '—', color: '#1B5299' },
              { label: 'Μ.Ο. Ημέρες', value: kpis.avg_days != null ? `${kpis.avg_days}d` : '—', color: '#D4722A' },
            ].map(kpi => (
              <div key={kpi.label} className="bg-surface rounded-lg p-2.5 text-center border border-border-subtle">
                <div className="text-[8px] font-semibold uppercase tracking-wider text-text-muted">{kpi.label}</div>
                <div className="text-base font-bold mt-0.5" style={{ color: kpi.color }}>{kpi.value}</div>
              </div>
            ))}
          </div>

          {/* Breakdown Grid */}
          <div className="grid grid-cols-4 gap-3">
            <BreakdownCard title="Κατηγορία" rows={breakdowns.byCategory} filterKey="subcategory" onToggle={toggleFilter} activeFilter={filters.subcategory} />
            <BreakdownCard title="Περιοχή" rows={breakdowns.byArea} filterKey="area" onToggle={toggleFilter} activeFilter={filters.area} />
            <BreakdownCard title="Κατάσταση" rows={breakdowns.byCondition} filterKey="condition" onToggle={toggleFilter} activeFilter={filters.condition} />
            <BreakdownCard title="Γραφείο" rows={breakdowns.byOffice} filterKey="office" onToggle={toggleFilter} activeFilter={filters.office} labelFn={(k) => OFFICE_LABELS[k] || k} />
            <BreakdownCard title="Έτος Κατασκ." rows={breakdowns.byYearBand} filterKey="year_band" onToggle={toggleFilter} activeFilter={filters.year_band} />
            <BreakdownCard title="Εμβαδό" rows={breakdowns.bySqmBand} filterKey="sqm_band" onToggle={toggleFilter} activeFilter={filters.sqm_band} />
            <BreakdownCard title="Όροφος" rows={breakdowns.byFloor} filterKey="floor" onToggle={toggleFilter} activeFilter={filters.floor} />
            <BreakdownCard title="Σύμβουλος" rows={breakdowns.byAgent} filterKey="agent_id" onToggle={(k, v) => toggleFilter(k, Number(v))} activeFilter={filters.agent_id != null ? String(filters.agent_id) : undefined} labelFn={k => agentNameMap.get(k) || k} />
            <BreakdownCard title="Συναλλαγή" rows={breakdowns.byTransactionType} filterKey="transaction_type" onToggle={toggleFilter} activeFilter={filters.transaction_type} />
            <BreakdownCard title="Ενέργεια" rows={breakdowns.byEnergyClass} filterKey="energy_class" onToggle={toggleFilter} activeFilter={filters.energy_class} />
            <BreakdownCard title="Υπνοδωμάτια" rows={breakdowns.byBedrooms} filterKey="bedrooms" onToggle={(k, v) => toggleFilter(k, Number(v))} activeFilter={filters.bedrooms != null ? String(filters.bedrooms) : undefined} />
          </div>

          {/* Charts */}
          <div className="grid grid-cols-2 gap-4">
            {/* €/m² by Area bar chart */}
            {breakdowns.byArea.length > 0 && (
              <div className="bg-surface-card rounded-xl border border-border-default p-4">
                <h4 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">€/m² ανά Περιοχή</h4>
                <ResponsiveContainer width="100%" height={Math.max(breakdowns.byArea.slice(0, 12).length * 24 + 20, 120)}>
                  <BarChart data={breakdowns.byArea.filter(r => r.avg_eur_per_sqm != null).slice(0, 12)} layout="vertical" margin={{ left: 0, right: 16, top: 4, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--color-border-subtle)" />
                    <XAxis type="number" tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }} />
                    <YAxis type="category" dataKey="key" width={100} tick={{ fontSize: 9, fill: 'var(--color-text-secondary)' }} />
                    <Tooltip contentStyle={{ background: 'var(--color-surface-card)', border: '1px solid var(--color-border-default)', borderRadius: '8px', fontSize: '12px' }} />
                    <Bar dataKey="avg_eur_per_sqm" fill="#168F80" radius={[0, 4, 4, 0]} name="€/m²" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Price vs Size scatter */}
            {scatterData.length > 2 && (
              <div className="bg-surface-card rounded-xl border border-border-default p-4">
                <h4 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">Τιμή vs Εμβαδό</h4>
                <ResponsiveContainer width="100%" height={280}>
                  <ScatterChart margin={{ top: 10, right: 20, bottom: 20, left: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-subtle)" />
                    <XAxis type="number" dataKey="size" name="m²" tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }} label={{ value: 'm²', position: 'bottom', fontSize: 11, fill: 'var(--color-text-muted)' }} />
                    <YAxis type="number" dataKey="price" name="€" tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }} />
                    <ZAxis range={[20, 20]} />
                    <Tooltip
                      contentStyle={{ background: 'var(--color-surface-card)', border: '1px solid var(--color-border-default)', borderRadius: '8px', fontSize: '12px' }}
                      labelFormatter={(_, payload) => payload?.[0]?.payload?.name ?? ''}
                    />
                    <Scatter data={scatterData} fill="#1B5299" fillOpacity={0.6} />
                  </ScatterChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Results count */}
          <div className="text-xs text-text-muted text-right">
            {filtered.length} ακίνητα {mode === 'active' ? 'στην αγορά' : 'κλεισμένα'}
            {activeFilters.length > 0 && ` (${activeFilters.length} φίλτρα ενεργά)`}
          </div>

          {/* Property Table + Map */}
          <div className="grid grid-cols-[1fr_400px] gap-4">
            {/* Property Table */}
            <div className="bg-surface-card rounded-xl border border-border-default overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-[11px]">
                  <thead>
                    <tr className="bg-surface-light border-b border-border-default">
                      <th className="text-left px-2 py-2 font-semibold text-text-muted uppercase tracking-wider">Κωδικός</th>
                      <th className="text-left px-2 py-2 font-semibold text-text-muted uppercase tracking-wider">Τύπος</th>
                      <th className="text-left px-2 py-2 font-semibold text-text-muted uppercase tracking-wider">Περιοχή</th>
                      <th className="text-right px-2 py-2 font-semibold text-text-muted uppercase tracking-wider">Τιμή</th>
                      <th className="text-right px-2 py-2 font-semibold text-text-muted uppercase tracking-wider">€/m²</th>
                      <th className="text-right px-2 py-2 font-semibold text-text-muted uppercase tracking-wider">m²</th>
                      <th className="text-center px-2 py-2 font-semibold text-text-muted uppercase tracking-wider">Υπν.</th>
                      <th className="text-left px-2 py-2 font-semibold text-text-muted uppercase tracking-wider">Όροφος</th>
                      <th className="text-center px-2 py-2 font-semibold text-text-muted uppercase tracking-wider">Έτος</th>
                      <th className="text-right px-2 py-2 font-semibold text-text-muted uppercase tracking-wider">Ημέρες</th>
                      <th className="text-left px-2 py-2 font-semibold text-text-muted uppercase tracking-wider">
                        {mode === 'active' ? 'Δημοσ.' : 'Κλείσιμο'}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {tableRows.map(row => {
                      const isActive = 'price' in row && !('closing_price' in row);
                      const pp = row as PropertyPricing;
                      const cp = row as ClosingPricing;
                      const price = isActive ? pp.price : cp.closing_price;
                      const code = row.property_code || row.property_id.slice(0, 8);
                      const isSelected = row.property_id === selectedPropertyId;

                      return (
                        <tr
                          key={row.property_id + (isActive ? '' : `-${cp.closing_id}`)}
                          onClick={() => setSelectedPropertyId(row.property_id === selectedPropertyId ? null : row.property_id)}
                          className={`border-b border-border-subtle cursor-pointer transition-colors ${
                            isSelected ? 'bg-brand-blue/5' : 'hover:bg-surface-light'
                          }`}
                        >
                          <td className="px-2 py-1.5 font-medium">
                            <PropertyLink
                              propertyId={row.property_id}
                              code={code}
                              className="text-brand-blue text-[11px]"
                              siblingIds={allPropertyIds}
                            />
                          </td>
                          <td className="px-2 py-1.5 text-text-secondary truncate max-w-[100px]">{row.subcategory || '—'}</td>
                          <td className="px-2 py-1.5 text-text-secondary truncate max-w-[100px]">{row.area || '—'}</td>
                          <td className="px-2 py-1.5 text-right tabular-nums font-medium text-text-primary">{fmtEur(price)}</td>
                          <td className="px-2 py-1.5 text-right tabular-nums text-text-muted">{fmtEur(row.eur_per_sqm)}</td>
                          <td className="px-2 py-1.5 text-right tabular-nums text-text-secondary">{row.size_sqm ?? '—'}</td>
                          <td className="px-2 py-1.5 text-center tabular-nums text-text-secondary">{'bedrooms' in row ? (row.bedrooms ?? '—') : '—'}</td>
                          <td className="px-2 py-1.5 text-text-secondary">{row.floor || '—'}</td>
                          <td className="px-2 py-1.5 text-center tabular-nums text-text-secondary">{row.year_built || '—'}</td>
                          <td className="px-2 py-1.5 text-right tabular-nums text-text-muted">{row.days_on_market ?? '—'}</td>
                          <td className="px-2 py-1.5 text-text-muted">
                            {isActive
                              ? pp.first_pub_date?.slice(0, 10) || '—'
                              : cp.closing_date?.slice(0, 10) || '—'}
                          </td>
                        </tr>
                      );
                    })}
                    {tableRows.length === 0 && (
                      <tr><td colSpan={11} className="text-center py-8 text-text-muted italic">Δεν βρέθηκαν ακίνητα</td></tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-3 py-2 border-t border-border-subtle bg-surface-light">
                  <span className="text-[10px] text-text-muted">
                    {safePage * PAGE_SIZE + 1}–{Math.min((safePage + 1) * PAGE_SIZE, filtered.length)} από {filtered.length}
                  </span>
                  <div className="flex gap-1">
                    <button
                      onClick={() => setPage(p => Math.max(0, p - 1))}
                      disabled={safePage === 0}
                      className="px-2 py-0.5 text-[10px] rounded border border-border-subtle bg-surface-card text-text-secondary hover:bg-surface-light disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      ← Προηγ.
                    </button>
                    <button
                      onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                      disabled={safePage >= totalPages - 1}
                      className="px-2 py-0.5 text-[10px] rounded border border-border-subtle bg-surface-card text-text-secondary hover:bg-surface-light disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      Επόμ. →
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Map */}
            <div className="bg-surface-card rounded-xl border border-border-default overflow-hidden" style={{ minHeight: 500 }}>
              {mapProperties.length > 0 ? (
                <Suspense fallback={<div className="h-full flex items-center justify-center text-text-muted text-xs">Φόρτωση χάρτη...</div>}>
                  <PropertyMap
                    properties={mapProperties}
                    selectedId={selectedPropertyId}
                    onSelect={setSelectedPropertyId}
                  />
                </Suspense>
              ) : (
                <div className="h-full flex items-center justify-center text-text-muted text-xs italic p-4 text-center">
                  {mode === 'closed'
                    ? 'Ο χάρτης είναι διαθέσιμος μόνο για ενεργά ακίνητα'
                    : 'Δεν υπάρχουν συντεταγμένες για τα επιλεγμένα ακίνητα'}
                </div>
              )}
            </div>
          </div>

          {/* Price Elasticity */}
          {journeys.length > 0 && <PriceElasticity journeys={journeys} />}
        </>
      )}
    </div>
  );
}

function BreakdownCard({ title, rows, filterKey, onToggle, activeFilter, labelFn }: {
  title: string;
  rows: BreakdownRow[];
  filterKey: string;
  onToggle: (key: keyof PricingFilters, value: string | number) => void;
  activeFilter?: string | number;
  labelFn?: (key: string) => string;
}) {
  const topRows = rows.slice(0, 6);
  return (
    <div className="bg-surface-card rounded-xl border border-border-default p-3">
      <h4 className="text-[10px] font-semibold text-text-muted uppercase tracking-wider mb-2">{title}</h4>
      {topRows.length === 0 ? (
        <p className="text-xs text-text-muted italic">—</p>
      ) : (
        <div className="space-y-1">
          {topRows.map(row => {
            const isActive = activeFilter === row.key;
            const label = labelFn ? labelFn(row.key) : row.key;
            return (
              <button
                key={row.key}
                onClick={() => onToggle(filterKey as keyof PricingFilters, row.key)}
                className={`w-full flex items-center gap-2 text-[11px] py-1 px-1.5 rounded transition-colors text-left ${
                  isActive ? 'bg-brand-blue/10 text-brand-blue' : 'hover:bg-surface-light text-text-secondary'
                }`}
              >
                <span className="flex-1 truncate">{label}</span>
                <span className="tabular-nums font-medium text-text-primary shrink-0">{row.count}</span>
                <span className="tabular-nums text-text-muted shrink-0">{fmtEur(row.avg_eur_per_sqm)}/m²</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
