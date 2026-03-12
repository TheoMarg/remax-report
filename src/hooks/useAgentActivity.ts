import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type { AgentActivity, Period } from '../lib/types';

export function useAgentActivity(period: Period) {
  return useQuery({
    queryKey: ['agent-activity', period.start, period.end],
    queryFn: async (): Promise<AgentActivity[]> => {
      const { data, error } = await supabase
        .from('v_agent_activity')
        .select('*')
        .gte('period_start', period.start)
        .lte('period_start', period.end);

      if (error) throw error;
      return data ?? [];
    },
    staleTime: 1000 * 60 * 60,
  });
}
