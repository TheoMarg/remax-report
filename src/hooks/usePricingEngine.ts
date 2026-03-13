import { useMemo, useState, useCallback } from 'react';
import type { PropertyPricing, ClosingPricing } from '../lib/types';

type PricingRow = PropertyPricing | ClosingPricing;

export interface PricingFilters {
  office?: string;
  category?: string;    // Πώληση / Ενοικίαση
  subcategory?: string;
  area?: string;
  condition?: string;   // New / Used
  year_band?: string;
  sqm_band?: string;
  agent_id?: number;
  transaction_type?: string;  // Πώληση / Ενοικίαση
  floor?: string;
  energy_class?: string;
  bedrooms?: number;
  price_min?: number;
  price_max?: number;
}

export interface PricingKpis {
  total_count: number;
  total_value: number;
  avg_price: number | null;
  avg_eur_per_sqm_sale: number | null;
  avg_eur_per_sqm_rent: number | null;
  avg_size: number | null;
  avg_days: number | null;
}

export interface BreakdownRow {
  key: string;
  count: number;
  avg_price: number | null;
  avg_eur_per_sqm: number | null;
  total_value: number;
}

function applyFilters<T extends PricingRow>(data: T[], filters: PricingFilters): T[] {
  return data.filter(row => {
    if (filters.office && row.office !== filters.office) return false;
    if (filters.category && row.category !== filters.category) return false;
    if (filters.subcategory && row.subcategory !== filters.subcategory) return false;
    if (filters.area && row.area !== filters.area) return false;
    if (filters.agent_id && row.agent_id !== filters.agent_id) return false;
    if (filters.condition && 'condition' in row && row.condition !== filters.condition) return false;
    if (filters.year_band && 'year_band' in row && row.year_band !== filters.year_band) return false;
    if (filters.sqm_band && 'sqm_band' in row && row.sqm_band !== filters.sqm_band) return false;
    if (filters.transaction_type && 'transaction_type' in row && row.transaction_type !== filters.transaction_type) return false;
    if (filters.floor && row.floor !== filters.floor) return false;
    if (filters.energy_class && 'energy_class' in row && row.energy_class !== filters.energy_class) return false;
    if (filters.bedrooms != null && ('bedrooms' in row ? row.bedrooms : null) !== filters.bedrooms) return false;
    const price = getPrice(row);
    if (filters.price_min != null && (price == null || price < filters.price_min)) return false;
    if (filters.price_max != null && (price == null || price > filters.price_max)) return false;
    return true;
  });
}

function safeAvg(values: (number | null | undefined)[]): number | null {
  const valid = values.filter((v): v is number => v != null && v > 0);
  if (valid.length === 0) return null;
  return Math.round(valid.reduce((a, b) => a + b, 0) / valid.length);
}

function getPrice(row: PricingRow): number | null {
  return 'closing_price' in row ? row.closing_price : row.price;
}

function getEurPerSqm(row: PricingRow): number | null {
  return row.eur_per_sqm ?? null;
}

function getDays(row: PricingRow): number | null {
  return row.days_on_market ?? ('days_published' in row ? row.days_published : null);
}

function getSqm(row: PricingRow): number | null {
  return row.size_sqm ?? null;
}

function computeKpis(rows: PricingRow[]): PricingKpis {
  const prices = rows.map(r => getPrice(r));
  const sales = rows.filter(r => r.category === 'Πώληση');
  const rents = rows.filter(r => r.category === 'Ενοικίαση');

  return {
    total_count: rows.length,
    total_value: prices.filter((p): p is number => p != null).reduce((a, b) => a + b, 0),
    avg_price: safeAvg(prices),
    avg_eur_per_sqm_sale: safeAvg(sales.map(r => getEurPerSqm(r))),
    avg_eur_per_sqm_rent: safeAvg(rents.map(r => getEurPerSqm(r))),
    avg_size: safeAvg(rows.map(r => getSqm(r))),
    avg_days: safeAvg(rows.map(r => getDays(r))),
  };
}

function computeBreakdown(rows: PricingRow[], groupFn: (r: PricingRow) => string): BreakdownRow[] {
  const groups: Record<string, PricingRow[]> = {};
  for (const row of rows) {
    const key = groupFn(row) || 'Unknown';
    if (!groups[key]) groups[key] = [];
    groups[key].push(row);
  }

  return Object.entries(groups)
    .map(([key, items]) => ({
      key,
      count: items.length,
      avg_price: safeAvg(items.map(r => getPrice(r))),
      avg_eur_per_sqm: safeAvg(items.map(r => getEurPerSqm(r))),
      total_value: items.map(r => getPrice(r)).filter((p): p is number => p != null).reduce((a, b) => a + b, 0),
    }))
    .sort((a, b) => b.count - a.count);
}

export function usePricingEngine<T extends PricingRow>(data: T[]) {
  const [filters, setFiltersState] = useState<PricingFilters>({});

  const toggleFilter = useCallback((key: keyof PricingFilters, value: string | number) => {
    setFiltersState(prev => {
      const current = prev[key];
      if (current === value) {
        const next = { ...prev };
        delete next[key];
        return next;
      }
      return { ...prev, [key]: value };
    });
  }, []);

  const setFilter = useCallback((key: keyof PricingFilters, value: string | number | undefined) => {
    setFiltersState(prev => {
      if (value == null) {
        const next = { ...prev };
        delete next[key];
        return next;
      }
      return { ...prev, [key]: value };
    });
  }, []);

  const clearFilters = useCallback(() => setFiltersState({}), []);

  const filtered = useMemo(() => applyFilters(data, filters), [data, filters]);
  const kpis = useMemo(() => computeKpis(filtered), [filtered]);

  const breakdowns = useMemo(() => ({
    byCategory: computeBreakdown(filtered, r => r.subcategory ?? 'Unknown'),
    byArea: computeBreakdown(filtered, r => r.area ?? 'Unknown'),
    byAgent: computeBreakdown(filtered, r => String(r.agent_id)),
    byCondition: computeBreakdown(filtered, r => ('condition' in r ? r.condition as string : 'Unknown')),
    byYearBand: computeBreakdown(filtered, r => ('year_band' in r ? r.year_band as string : 'Unknown')),
    bySqmBand: computeBreakdown(filtered, r => ('sqm_band' in r ? r.sqm_band as string : 'Unknown')),
    byFloor: computeBreakdown(filtered, r => r.floor ?? 'Unknown'),
    byOffice: computeBreakdown(filtered, r => r.office ?? 'Unknown'),
    byTransactionType: computeBreakdown(filtered, r => ('transaction_type' in r ? (r as any).transaction_type : null) ?? 'Unknown'),
    byEnergyClass: computeBreakdown(filtered, r => ('energy_class' in r ? (r as any).energy_class : null) ?? 'Unknown'),
    byBedrooms: computeBreakdown(filtered, r => {
      const b = 'bedrooms' in r ? r.bedrooms : null;
      return b != null ? String(b) : 'Unknown';
    }),
  }), [filtered]);

  return {
    filters,
    toggleFilter,
    setFilter,
    clearFilters,
    filtered,
    kpis,
    breakdowns,
  };
}
