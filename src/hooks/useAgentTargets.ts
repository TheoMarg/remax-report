import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type { AgentTarget } from '../lib/types';

export function useAgentTargets(year: number) {
  return useQuery({
    queryKey: ['agent-targets', year],
    queryFn: async (): Promise<AgentTarget[]> => {
      const { data, error } = await supabase
        .from('agent_targets')
        .select('*')
        .eq('year', year);
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 1000 * 60 * 60,
  });
}
