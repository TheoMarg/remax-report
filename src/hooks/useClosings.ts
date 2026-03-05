import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type { ClosingWithProperty, PropertyEvent, Showing, Period } from '../lib/types';
import { ALLOWED_AGENT_IDS } from '../lib/constants';
import { computeEndExclusive } from '../lib/propertyMetrics';

interface ClosingsData {
  closings: ClosingWithProperty[];
  events: PropertyEvent[];
  showings: Showing[];
}

export function useClosings(period: Period) {
  return useQuery({
    queryKey: ['closings-cards', period.start, period.end],
    queryFn: async (): Promise<ClosingsData> => {
      const endExclusive = computeEndExclusive(period.end);

      // Query 1: Closings with joined property details
      const { data: closings, error: closingsErr } = await supabase
        .from('v_valid_closings')
        .select(`
          id, agent_id, property_id, property_code, closing_date,
          closing_type, price, gci, source,
          properties!inner(
            property_id, address, area, category, subcategory,
            price, size_sqm, bedrooms, is_exclusive,
            first_pub_date, registration_date
          )
        `)
        .gte('closing_date', period.start)
        .lt('closing_date', endExclusive)
        .in('agent_id', ALLOWED_AGENT_IDS)
        .order('closing_date', { ascending: false });

      if (closingsErr) throw closingsErr;
      if (!closings || closings.length === 0) {
        return { closings: [], events: [], showings: [] };
      }

      // Extract unique property IDs
      const propertyIds = [
        ...new Set(closings.map(c => c.property_id).filter(Boolean) as string[]),
      ];

      // Queries 2+3 in parallel: timeline events + showings
      const [eventsResult, showingsResult] = await Promise.all([
        supabase
          .from('v_property_events_timeline')
          .select('property_id, event_date, event_type, detail, amount')
          .in('property_id', propertyIds)
          .order('event_date', { ascending: true }),
        supabase
          .from('ypodikseis')
          .select('id, agent_id, property_id, showing_date, client_name, manager_name')
          .in('property_id', propertyIds)
          .order('showing_date', { ascending: false }),
      ]);

      if (eventsResult.error) throw eventsResult.error;
      if (showingsResult.error) throw showingsResult.error;

      return {
        closings: closings as unknown as ClosingWithProperty[],
        events: (eventsResult.data ?? []) as PropertyEvent[],
        showings: (showingsResult.data ?? []) as Showing[],
      };
    },
    staleTime: 1000 * 60 * 60,
  });
}
