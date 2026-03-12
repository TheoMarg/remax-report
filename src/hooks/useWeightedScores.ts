import { useMemo } from 'react';
import type { CombinedMetric, KpiWeight } from '../lib/types';

export interface WpsResult {
  agent_id: number;
  canonical_name: string | null;
  office: string | null;
  wps: number;
  breakdown: Record<string, number>;  // metric_key → weighted contribution
  is_rookie: boolean;
  rookie_multiplier: number;
}

const METRIC_MAP: Record<string, keyof CombinedMetric> = {
  registrations: 'crm_registrations',
  exclusives: 'crm_exclusives',
  showings: 'crm_showings',
  offers: 'crm_offers',
  closings: 'crm_closings',
};

function isRookie(startDate: string | null): boolean {
  if (!startDate) return false;
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
  return new Date(startDate) > sixMonthsAgo;
}

export function useWeightedScores(
  metrics: CombinedMetric[],
  weights: KpiWeight[],
  agentStartDates?: Record<number, string | null>,
): WpsResult[] {
  return useMemo(() => {
    const weightMap: Record<string, number> = {};
    for (const w of weights) {
      weightMap[w.metric_key] = w.weight;
    }

    // Aggregate metrics per agent (sum across months in period)
    const agentTotals: Record<number, {
      canonical_name: string | null;
      office: string | null;
      sums: Record<string, number>;
    }> = {};

    for (const m of metrics) {
      if (m.is_team) continue; // Skip team virtual accounts

      if (!agentTotals[m.agent_id]) {
        agentTotals[m.agent_id] = {
          canonical_name: m.canonical_name,
          office: m.office,
          sums: {},
        };
      }

      for (const [key, field] of Object.entries(METRIC_MAP)) {
        const val = (m[field] as number) || 0;
        agentTotals[m.agent_id].sums[key] = (agentTotals[m.agent_id].sums[key] || 0) + val;
      }
    }

    const results: WpsResult[] = [];

    for (const [agentIdStr, agent] of Object.entries(agentTotals)) {
      const agentId = Number(agentIdStr);
      const startDate = agentStartDates?.[agentId] ?? null;
      const rookie = isRookie(startDate);
      const rookieMultiplier = rookie ? 2.0 : 1.0;

      const breakdown: Record<string, number> = {};
      let wps = 0;

      for (const [key, sum] of Object.entries(agent.sums)) {
        const w = weightMap[key] ?? 1.0;
        const contribution = sum * w;
        breakdown[key] = contribution;
        wps += contribution;
      }

      wps *= rookieMultiplier;

      results.push({
        agent_id: agentId,
        canonical_name: agent.canonical_name,
        office: agent.office,
        wps: Math.round(wps * 10) / 10,
        breakdown,
        is_rookie: rookie,
        rookie_multiplier: rookieMultiplier,
      });
    }

    return results.sort((a, b) => b.wps - a.wps);
  }, [metrics, weights, agentStartDates]);
}
