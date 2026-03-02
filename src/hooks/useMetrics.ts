import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type { CombinedMetric, Period } from '../lib/types';

export function useMetrics(period: Period) {
  return useQuery({
    queryKey: ['metrics', period.start, period.end],
    queryFn: async (): Promise<CombinedMetric[]> => {
      const { data, error } = await supabase
        .from('v_combined_metrics')
        .select('*')
        .gte('period_start', period.start)
        .lte('period_start', period.end);

      if (error) throw error;
      return data ?? [];
    },
    staleTime: 1000 * 60 * 60,  // 1 hour — data updates weekly
  });
}
