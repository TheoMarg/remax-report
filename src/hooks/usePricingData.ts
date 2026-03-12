import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type { PropertyPricing, ClosingPricing, Period } from '../lib/types';

type PricingMode = 'active' | 'closed';

export function usePricingData(mode: PricingMode, period?: Period) {
  return useQuery({
    queryKey: ['pricing-data', mode, period?.start, period?.end],
    queryFn: async (): Promise<PropertyPricing[] | ClosingPricing[]> => {
      if (mode === 'active') {
        const { data, error } = await supabase
          .from('v_property_pricing')
          .select('*')
          .eq('is_retired', false);
        if (error) throw error;
        return (data ?? []) as PropertyPricing[];
      } else {
        let query = supabase.from('v_closing_pricing').select('*');
        if (period) {
          query = query
            .gte('closing_date', period.start)
            .lte('closing_date', period.end);
        }
        const { data, error } = await query;
        if (error) throw error;
        return (data ?? []) as ClosingPricing[];
      }
    },
    staleTime: 1000 * 60 * 60,
  });
}
