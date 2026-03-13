import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { ALLOWED_AGENT_IDS } from '../lib/constants';
import { buildForecast, type ForecastResult } from '../lib/forecasting';

// Team virtual CRM accounts — exclude from revenue forecast (is_team = true)
const TEAM_AGENT_IDS = new Set([33, 34, 35, 103]);
const INDIVIDUAL_AGENT_IDS = ALLOWED_AGENT_IDS.filter(id => !TEAM_AGENT_IDS.has(id));

interface MonthlyGci {
  month: string;
  gci: number;
}

/**
 * Fetches all monthly GCI data and computes a 6-month forecast.
 * Uses v_combined_metrics aggregated by month.
 * Filters to individual agents only (is_team = false).
 */
export function useForecast(office?: string) {
  return useQuery({
    queryKey: ['forecast', office ?? 'all'],
    queryFn: async (): Promise<ForecastResult[]> => {
      let query = supabase
        .from('v_combined_metrics')
        .select('period_start, gci, office')
        .in('agent_id', INDIVIDUAL_AGENT_IDS);

      if (office && office !== 'all') {
        query = query.eq('office', office);
      }

      const { data, error } = await query;
      if (error) throw error;
      if (!data || data.length === 0) return [];

      // Aggregate GCI by month
      const monthMap = new Map<string, number>();
      for (const row of data) {
        const month = row.period_start?.slice(0, 7); // 'YYYY-MM'
        if (!month) continue;
        monthMap.set(month, (monthMap.get(month) ?? 0) + (row.gci ?? 0));
      }

      const monthlyGci: MonthlyGci[] = Array.from(monthMap.entries())
        .map(([month, gci]) => ({ month, gci }))
        .sort((a, b) => a.month.localeCompare(b.month));

      return buildForecast(monthlyGci, 6);
    },
    staleTime: 1000 * 60 * 60,
  });
}
