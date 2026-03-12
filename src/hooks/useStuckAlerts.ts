import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type { StuckAlert } from '../lib/types';

export function useStuckAlerts() {
  return useQuery({
    queryKey: ['stuck-alerts'],
    queryFn: async (): Promise<StuckAlert[]> => {
      const { data, error } = await supabase
        .from('v_stuck_alerts')
        .select('*')
        .order('days_over_avg', { ascending: false });

      if (error) throw error;
      return data ?? [];
    },
    staleTime: 1000 * 60 * 60,
  });
}
