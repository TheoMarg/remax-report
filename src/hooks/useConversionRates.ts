import { useMemo } from 'react';
import type { PropertyJourney } from '../lib/types';

export interface ConversionRates {
  reg_count: number;
  excl_count: number;
  published_count: number;
  showing_count: number;
  offer_count: number;
  closing_count: number;
  reg_to_excl: number | null;     // ratio X:1
  excl_to_closing: number | null;
  showing_to_offer: number | null;
  offer_to_closing: number | null;
  reg_to_excl_pct: number | null;
  excl_to_closing_pct: number | null;
  showing_to_offer_pct: number | null;
  offer_to_closing_pct: number | null;
}

function computeRates(journeys: PropertyJourney[]): ConversionRates {
  const reg = journeys.filter(j => j.has_registration);
  const excl = journeys.filter(j => j.has_exclusive);
  const pub = journeys.filter(j => j.has_published);
  const show = journeys.filter(j => j.has_showing);
  const offer = journeys.filter(j => j.has_offer);
  const close = journeys.filter(j => j.has_closing);

  const safeRatio = (total: number, passed: number) =>
    passed > 0 ? Math.round((total / passed) * 100) / 100 : null;

  const safePct = (passed: number, total: number) =>
    total > 0 ? Math.round((passed / total) * 1000) / 10 : null;

  return {
    reg_count: reg.length,
    excl_count: excl.length,
    published_count: pub.length,
    showing_count: show.length,
    offer_count: offer.length,
    closing_count: close.length,
    reg_to_excl: safeRatio(reg.length, excl.length),
    excl_to_closing: safeRatio(excl.length, close.length),
    showing_to_offer: safeRatio(show.length, offer.length),
    offer_to_closing: safeRatio(offer.length, close.length),
    reg_to_excl_pct: safePct(excl.length, reg.length),
    excl_to_closing_pct: safePct(close.length, excl.length),
    showing_to_offer_pct: safePct(offer.length, show.length),
    offer_to_closing_pct: safePct(close.length, offer.length),
  };
}

type SegmentKey = 'office' | 'category' | 'agent_id';

export function useConversionRates(
  journeys: PropertyJourney[],
  segmentKey?: SegmentKey,
) {
  return useMemo(() => {
    const total = computeRates(journeys);

    if (!segmentKey) return { total, segments: {} as Record<string, ConversionRates> };

    const groups: Record<string, PropertyJourney[]> = {};
    for (const j of journeys) {
      const key = String(j[segmentKey] ?? 'Unknown');
      if (!groups[key]) groups[key] = [];
      groups[key].push(j);
    }

    const segments: Record<string, ConversionRates> = {};
    for (const [k, v] of Object.entries(groups)) {
      segments[k] = computeRates(v);
    }

    return { total, segments };
  }, [journeys, segmentKey]);
}
