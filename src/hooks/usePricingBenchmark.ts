import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type { PricingBenchmark } from '../lib/types';

export function usePricingBenchmark() {
  return useQuery({
    queryKey: ['pricing-benchmark'],
    queryFn: async (): Promise<PricingBenchmark[]> => {
      const { data, error } = await supabase
        .from('v_pricing_benchmark')
        .select('*');

      if (error) throw error;
      return data ?? [];
    },
    staleTime: 1000 * 60 * 60,
  });
}
