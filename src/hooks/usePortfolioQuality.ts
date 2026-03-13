import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type { PortfolioQuality } from '../lib/types';

export function usePortfolioQuality() {
  return useQuery({
    queryKey: ['portfolio-quality'],
    queryFn: async (): Promise<PortfolioQuality[]> => {
      const { data, error } = await supabase
        .from('v_portfolio_quality')
        .select('*');

      if (error) {
        console.error('[usePortfolioQuality] error:', error);
        throw error;
      }
      console.log('[usePortfolioQuality] loaded', data?.length, 'agents');
      return data ?? [];
    },
    staleTime: 1000 * 60 * 60,
  });
}
