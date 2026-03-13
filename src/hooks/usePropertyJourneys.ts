import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type { PropertyJourney, Period } from '../lib/types';
import { computeEndExclusive } from '../lib/propertyMetrics';

export function usePropertyJourneys(period: Period, filters?: { agentId?: number; office?: string }) {
  const endExcl = computeEndExclusive(period.end);

  return useQuery({
    queryKey: ['property-journeys', period.start, endExcl, filters],
    queryFn: async (): Promise<PropertyJourney[]> => {
      let query = supabase
        .from('v_property_journey')
        .select('*')
        .gte('dt_registration', period.start)
        .lt('dt_registration', endExcl);

      if (filters?.agentId) query = query.eq('agent_id', filters.agentId);
      if (filters?.office) query = query.eq('office', filters.office);

      const { data, error } = await query;
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 1000 * 60 * 60,
  });
}
