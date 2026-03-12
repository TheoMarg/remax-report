import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type { PqsWeight } from '../lib/types';

export function usePqsWeights() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['pqs-weights'],
    queryFn: async (): Promise<PqsWeight[]> => {
      const { data, error } = await supabase
        .from('pqs_weights')
        .select('*')
        .order('metric_key');
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 1000 * 60 * 60,
  });

  const mutation = useMutation({
    mutationFn: async (updates: { metric_key: string; weight: number }[]) => {
      for (const u of updates) {
        const { error } = await supabase
          .from('pqs_weights')
          .update({ weight: u.weight, updated_at: new Date().toISOString() })
          .eq('metric_key', u.metric_key);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pqs-weights'] });
    },
  });

  return { ...query, updateWeights: mutation.mutateAsync, isUpdating: mutation.isPending };
}
