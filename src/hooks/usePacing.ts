import { useMemo } from 'react';
import type { CombinedMetric, AgentTarget } from '../lib/types';
import { individualsOnly } from '../lib/metrics';
import { computePacing, type PacingResult } from '../lib/pacing';

interface AgentPacing {
  agent_id: number;
  name: string;
  office: string | null;
  metrics: PacingResult[];
}

const METRIC_MAP: { key: string; label: string; targetField: keyof AgentTarget; metricField: keyof CombinedMetric }[] = [
  { key: 'gci', label: 'GCI', targetField: 'gci_target', metricField: 'gci' },
  { key: 'registrations', label: 'Registrations', targetField: 'registrations_target', metricField: 'crm_registrations' },
  { key: 'exclusives', label: 'Exclusives', targetField: 'exclusives_target', metricField: 'crm_exclusives' },
  { key: 'closings', label: 'Closings', targetField: 'closings_target', metricField: 'crm_closings' },
];

export function usePacing(
  metrics: CombinedMetric[] | undefined,
  targets: AgentTarget[] | undefined,
): AgentPacing[] {
  return useMemo(() => {
    if (!metrics || !targets || targets.length === 0) return [];

    const individuals = individualsOnly(metrics);

    // Aggregate YTD actuals per agent
    const agentActuals = new Map<number, { name: string; office: string | null; actuals: Record<string, number> }>();
    for (const m of individuals) {
      const existing = agentActuals.get(m.agent_id);
      if (existing) {
        for (const def of METRIC_MAP) {
          existing.actuals[def.key] = (existing.actuals[def.key] || 0) + (Number(m[def.metricField]) || 0);
        }
      } else {
        const actuals: Record<string, number> = {};
        for (const def of METRIC_MAP) {
          actuals[def.key] = Number(m[def.metricField]) || 0;
        }
        agentActuals.set(m.agent_id, {
          name: m.canonical_name || `Agent #${m.agent_id}`,
          office: m.office,
          actuals,
        });
      }
    }

    // Match with targets
    const result: AgentPacing[] = [];
    for (const target of targets) {
      const agent = agentActuals.get(target.agent_id);
      if (!agent) continue;

      const pacingResults: PacingResult[] = [];
      for (const def of METRIC_MAP) {
        const targetVal = Number(target[def.targetField]) || 0;
        if (targetVal <= 0) continue;
        const actual = agent.actuals[def.key] || 0;
        pacingResults.push(computePacing(target.agent_id, def.label, targetVal, actual));
      }

      if (pacingResults.length > 0) {
        result.push({
          agent_id: target.agent_id,
          name: agent.name,
          office: agent.office,
          metrics: pacingResults,
        });
      }
    }

    return result;
  }, [metrics, targets]);
}
