import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type { FunnelRow, Period } from '../lib/types';

export function useFunnel(period: Period) {
  return useQuery({
    queryKey: ['funnel', period.start, period.end],
    queryFn: async (): Promise<FunnelRow[]> => {
      const { data, error } = await supabase
        .from('v_funnel_by_type')
        .select('*')
        .gte('period_start', period.start)
        .lte('period_start', period.end);

      if (error) throw error;
      return data ?? [];
    },
    staleTime: 1000 * 60 * 60,
  });
}
