import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type { PropertyJourney, Period } from '../lib/types';

export function usePropertyJourneys(period: Period, filters?: { agentId?: number; office?: string }) {
  return useQuery({
    queryKey: ['property-journeys', period.start, period.end, filters],
    queryFn: async (): Promise<PropertyJourney[]> => {
      let query = supabase
        .from('v_property_journey')
        .select('*')
        .gte('dt_registration', period.start)
        .lte('dt_registration', period.end);

      if (filters?.agentId) query = query.eq('agent_id', filters.agentId);
      if (filters?.office) query = query.eq('office', filters.office);

      const { data, error } = await query;
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 1000 * 60 * 60,
  });
}
