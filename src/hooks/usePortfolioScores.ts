import { useMemo } from 'react';
import type { PortfolioQuality, PqsWeight } from '../lib/types';

export interface PqsResult {
  agent_id: number;
  canonical_name: string;
  office: string;
  pqs: number;           // 0-100 normalized
  dimensions: Record<string, number>;  // dimension key → raw score (0-100)
  weighted_dimensions: Record<string, number>;
}

function computeDimensionScores(pq: PortfolioQuality): Record<string, number> {
  return {
    freshness: 100 - Math.min(pq.avg_days_on_market, 100),
    exclusive_ratio: pq.exclusive_ratio,
    activity_level: Math.min(pq.avg_showings_per_property * 20, 100),
    pricing_accuracy: Math.max(100 - pq.avg_price_reductions * 25, 0),
    pipeline_depth: pq.pct_with_showings,
    demand_score: pq.pct_with_offer,
  };
}

export function usePortfolioScores(
  quality: PortfolioQuality[],
  pqsWeights: PqsWeight[],
): PqsResult[] {
  return useMemo(() => {
    const weightMap: Record<string, number> = {};
    let totalWeight = 0;
    for (const w of pqsWeights) {
      weightMap[w.metric_key] = w.weight;
      totalWeight += w.weight;
    }

    if (totalWeight === 0) totalWeight = 1;

    return quality
      .map(pq => {
        const dimensions = computeDimensionScores(pq);
        const weighted_dimensions: Record<string, number> = {};
        let weightedSum = 0;

        for (const [key, score] of Object.entries(dimensions)) {
          const w = weightMap[key] ?? 1.0;
          const ws = score * w;
          weighted_dimensions[key] = Math.round(ws * 10) / 10;
          weightedSum += ws;
        }

        const pqs = Math.round((weightedSum / totalWeight) * 10) / 10;

        return {
          agent_id: pq.agent_id,
          canonical_name: pq.canonical_name,
          office: pq.office,
          pqs: Math.min(pqs, 100),
          dimensions,
          weighted_dimensions,
        };
      })
      .sort((a, b) => b.pqs - a.pqs);
  }, [quality, pqsWeights]);
}
