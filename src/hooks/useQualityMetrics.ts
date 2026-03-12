import { useMemo } from 'react';
import type { PropertyJourney } from '../lib/types';

export interface QualityMetrics {
  avg_days_reg_to_excl: number | null;
  avg_days_excl_to_offer: number | null;
  avg_days_offer_to_closing: number | null;
  avg_days_total_journey: number | null;
  avg_price_delta_pct: number | null;
  avg_showings_per_property: number | null;
  count: number;
}

function avg(values: (number | null)[]): number | null {
  const valid = values.filter((v): v is number => v !== null && v >= 0);
  if (valid.length === 0) return null;
  return Math.round((valid.reduce((a, b) => a + b, 0) / valid.length) * 10) / 10;
}

function computeQuality(journeys: PropertyJourney[]): QualityMetrics {
  return {
    avg_days_reg_to_excl: avg(journeys.map(j => j.days_reg_to_excl)),
    avg_days_excl_to_offer: avg(journeys.map(j => j.days_excl_to_offer)),
    avg_days_offer_to_closing: avg(journeys.map(j => j.days_offer_to_closing)),
    avg_days_total_journey: avg(journeys.map(j => j.days_total_journey)),
    avg_price_delta_pct: avg(journeys.filter(j => j.has_closing).map(j => j.price_delta_pct)),
    avg_showings_per_property: avg(journeys.map(j => j.total_showings)),
    count: journeys.length,
  };
}

type SegmentKey = 'office' | 'category' | 'agent_id';

export function useQualityMetrics(
  journeys: PropertyJourney[],
  segmentKey?: SegmentKey,
) {
  return useMemo(() => {
    const total = computeQuality(journeys);

    if (!segmentKey) return { total, segments: {} as Record<string, QualityMetrics> };

    const groups: Record<string, PropertyJourney[]> = {};
    for (const j of journeys) {
      const key = String(j[segmentKey] ?? 'Unknown');
      if (!groups[key]) groups[key] = [];
      groups[key].push(j);
    }

    const segments: Record<string, QualityMetrics> = {};
    for (const [k, v] of Object.entries(groups)) {
      segments[k] = computeQuality(v);
    }

    return { total, segments };
  }, [journeys, segmentKey]);
}
