import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type { Period } from '../lib/types';
import { ALLOWED_AGENT_IDS } from '../lib/constants';

export interface FourClubDetailRow {
  period_start: string;
  agent_id: number;
  subcategory: string;
  cnt: number;
}

export function useFourClubDetail(period: Period) {
  return useQuery({
    queryKey: ['four-club-detail', period.start, period.end],
    queryFn: async (): Promise<FourClubDetailRow[]> => {
      const { data, error } = await supabase
        .from('v_exclusives_residential_detail')
        .select('*')
        .gte('period_start', period.start)
        .lte('period_start', period.end)
        .in('agent_id', ALLOWED_AGENT_IDS);

      if (error) throw error;
      return data ?? [];
    },
    staleTime: 1000 * 60 * 60,
  });
}
