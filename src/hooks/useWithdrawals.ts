import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type { WithdrawalReason, Period } from '../lib/types';
import { ALLOWED_AGENT_IDS } from '../lib/constants';

export function useWithdrawals(period: Period) {
  return useQuery({
    queryKey: ['withdrawals', period.start, period.end],
    queryFn: async (): Promise<WithdrawalReason[]> => {
      const { data, error } = await supabase
        .from('v_withdrawal_reasons')
        .select('*')
        .gte('period_start', period.start)
        .lte('period_start', period.end)
        .in('agent_id', ALLOWED_AGENT_IDS);

      if (error) throw error;
      return data ?? [];
    },
    staleTime: 1000 * 60 * 60,
  });
}
