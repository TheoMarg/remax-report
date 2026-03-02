import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type { CombinedMetric, Period } from '../lib/types';

/**
 * Fetches v_combined_metrics for the 6 months ending at the selected period.
 * Used by the trend chart on the Overview page.
 */
export function useTrend(period: Period) {
  // Calculate 6 months back from period.start
  const endDate = period.start;  // e.g. '2026-02-01'
  const [y, m] = endDate.split('-').map(Number);
  let startMonth = m - 5;
  let startYear = y;
  while (startMonth < 1) {
    startMonth += 12;
    startYear -= 1;
  }
  const startDate = `${startYear}-${String(startMonth).padStart(2, '0')}-01`;

  return useQuery({
    queryKey: ['trend', startDate, endDate],
    queryFn: async (): Promise<CombinedMetric[]> => {
      const { data, error } = await supabase
        .from('v_combined_metrics')
        .select('*')
        .gte('period_start', startDate)
        .lte('period_start', endDate);

      if (error) throw error;
      return data ?? [];
    },
    staleTime: 1000 * 60 * 60,
  });
}
