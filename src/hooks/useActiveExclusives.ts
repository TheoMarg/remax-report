import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type { ActiveExclusive } from '../lib/types';

export function useActiveExclusives(agentId?: number) {
  return useQuery({
    queryKey: ['active-exclusives', agentId],
    queryFn: async (): Promise<ActiveExclusive[]> => {
      let query = supabase.from('v_active_exclusives').select('*');
      if (agentId) query = query.eq('agent_id', agentId);

      const { data, error } = await query;
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 1000 * 60 * 60,
  });
}
