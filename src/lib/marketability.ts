import type { PropertyPricing, ClosingPricing } from './types';
import type { SubcategoryWeight } from '../hooks/useSubcategoryWeights';

export interface MarketBenchmark {
  subcategory: string;
  avg_dom: number;
  conversion_rate: number;
  avg_price_reductions: number;
  sample_count: number;
}

export interface MarketPqsResult {
  agent_id: number;
  canonical_name: string | null;
  office: string | null;
  score: number;
  property_scores: { property_id: string; score: number; subcategory: string }[];
}

/**
 * Compute market benchmarks per subcategory.
 * avg_dom: average days on market for active properties
 * conversion_rate: closed / (active + closed) in subcategory
 * avg_price_reductions: average number of price reductions
 */
export function computeMarketBenchmarks(
  activePricing: PropertyPricing[],
  closingPricing: ClosingPricing[],
): Record<string, MarketBenchmark> {
  const subcatActive = new Map<string, PropertyPricing[]>();
  const subcatClosed = new Map<string, ClosingPricing[]>();

  for (const p of activePricing) {
    const sc = p.subcategory || 'Άλλο';
    if (!subcatActive.has(sc)) subcatActive.set(sc, []);
    subcatActive.get(sc)!.push(p);
  }

  for (const c of closingPricing) {
    const sc = c.subcategory || 'Άλλο';
    if (!subcatClosed.has(sc)) subcatClosed.set(sc, []);
    subcatClosed.get(sc)!.push(c);
  }

  const allSubcats = new Set([...subcatActive.keys(), ...subcatClosed.keys()]);
  const benchmarks: Record<string, MarketBenchmark> = {};

  for (const sc of allSubcats) {
    const active = subcatActive.get(sc) ?? [];
    const closed = subcatClosed.get(sc) ?? [];
    const totalCount = active.length + closed.length;

    // Average DOM from active properties
    const domValues = active.filter(p => p.days_on_market != null).map(p => p.days_on_market!);
    const avg_dom = domValues.length > 0
      ? domValues.reduce((s, v) => s + v, 0) / domValues.length
      : 0;

    // Conversion rate
    const conversion_rate = totalCount > 0 ? (closed.length / totalCount) * 100 : 0;

    // Average price reductions from active
    const avg_price_reductions = active.length > 0
      ? active.reduce((s, p) => s + p.price_reduction_count, 0) / active.length
      : 0;

    benchmarks[sc] = {
      subcategory: sc,
      avg_dom: Math.round(avg_dom),
      conversion_rate: Math.round(conversion_rate * 10) / 10,
      avg_price_reductions: Math.round(avg_price_reductions * 10) / 10,
      sample_count: totalCount,
    };
  }

  return benchmarks;
}

/**
 * Market-Adjusted PQS: compare each agent's properties against market benchmarks.
 * Score 100 = at the average, >100 = better, <100 = worse.
 */
export function computeMarketAdjustedPQS(
  agentProperties: PropertyPricing[],
  benchmarks: Record<string, MarketBenchmark>,
): MarketPqsResult[] {
  // Group by agent
  const agentMap = new Map<number, PropertyPricing[]>();
  for (const p of agentProperties) {
    if (!agentMap.has(p.agent_id)) agentMap.set(p.agent_id, []);
    agentMap.get(p.agent_id)!.push(p);
  }

  const results: MarketPqsResult[] = [];

  for (const [agentId, properties] of agentMap) {
    const propertyScores: { property_id: string; score: number; subcategory: string }[] = [];

    for (const prop of properties) {
      const sc = prop.subcategory || 'Άλλο';
      const bench = benchmarks[sc];
      if (!bench || bench.sample_count < 3) {
        // Not enough data for benchmark
        propertyScores.push({ property_id: prop.property_id, score: 100, subcategory: sc });
        continue;
      }

      let score = 100;

      // DOM comparison: lower is better
      if (prop.days_on_market != null && bench.avg_dom > 0) {
        const domRatio = prop.days_on_market / bench.avg_dom;
        // If property DOM is half the avg, score += 25; if double, score -= 25
        score += (1 - domRatio) * 25;
      }

      // Showings comparison: more is better
      if (bench.avg_dom > 0) {
        const showingRate = prop.showing_count / Math.max(1, prop.days_on_market ?? 30) * 30; // showings per 30 days
        score += Math.min(showingRate * 5, 15); // max +15 for high showing rate
      }

      // Price reductions: fewer is better
      if (bench.avg_price_reductions > 0) {
        const redRatio = prop.price_reduction_count / bench.avg_price_reductions;
        score += (1 - redRatio) * 10;
      }

      propertyScores.push({
        property_id: prop.property_id,
        score: Math.round(Math.max(0, Math.min(200, score))),
        subcategory: sc,
      });
    }

    const avgScore = propertyScores.length > 0
      ? propertyScores.reduce((s, p) => s + p.score, 0) / propertyScores.length
      : 100;

    const firstProp = properties[0];
    results.push({
      agent_id: agentId,
      canonical_name: firstProp?.canonical_name ?? null,
      office: firstProp?.office ?? null,
      score: Math.round(avgScore * 10) / 10,
      property_scores: propertyScores,
    });
  }

  return results.sort((a, b) => b.score - a.score);
}

/**
 * Office-Directed PQS: weight subcategories by office strategy.
 * Strategic alignment = sum(count * weight) / total_properties.
 * Final = basePqs * (0.5 + 0.5 * strategic_alignment_normalized).
 */
export function computeOfficeDirectedPQS(
  agentProperties: PropertyPricing[],
  weights: SubcategoryWeight[],
  basePqsMap: Map<number, number>,
): MarketPqsResult[] {
  // Build weight lookup
  const weightMap = new Map<string, number>();
  for (const w of weights) {
    weightMap.set(w.subcategory, w.weight);
  }
  const maxWeight = Math.max(...weights.map(w => w.weight), 1);

  // Group by agent
  const agentMap = new Map<number, PropertyPricing[]>();
  for (const p of agentProperties) {
    if (!agentMap.has(p.agent_id)) agentMap.set(p.agent_id, []);
    agentMap.get(p.agent_id)!.push(p);
  }

  const results: MarketPqsResult[] = [];

  for (const [agentId, properties] of agentMap) {
    // Count per subcategory
    const subcatCounts = new Map<string, number>();
    for (const p of properties) {
      const sc = p.subcategory || 'Άλλο';
      subcatCounts.set(sc, (subcatCounts.get(sc) ?? 0) + 1);
    }

    // Strategic alignment
    let weightedSum = 0;
    for (const [sc, count] of subcatCounts) {
      const w = weightMap.get(sc) ?? 1.0;
      weightedSum += count * w;
    }
    const totalProperties = properties.length || 1;
    const strategicAlignment = weightedSum / totalProperties / maxWeight; // 0 to 1

    const basePqs = basePqsMap.get(agentId) ?? 50;
    const finalScore = basePqs * (0.5 + 0.5 * strategicAlignment);

    const firstProp = properties[0];
    results.push({
      agent_id: agentId,
      canonical_name: firstProp?.canonical_name ?? null,
      office: firstProp?.office ?? null,
      score: Math.round(finalScore * 10) / 10,
      property_scores: Array.from(subcatCounts.entries()).map(([sc, count]) => ({
        property_id: `${sc}-group`,
        score: Math.round((weightMap.get(sc) ?? 1) * count),
        subcategory: sc,
      })),
    });
  }

  return results.sort((a, b) => b.score - a.score);
}
