import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

export interface SubcategoryWeight {
  id: number;
  subcategory: string;
  transaction_type: string | null;
  weight: number;
  notes: string | null;
  updated_by: string | null;
  updated_at: string;
}

export function useSubcategoryWeights() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['subcategory-weights'],
    queryFn: async (): Promise<SubcategoryWeight[]> => {
      const { data, error } = await supabase
        .from('subcategory_weights')
        .select('*')
        .order('subcategory');

      if (error) {
        // Table may not exist yet — return empty
        console.warn('subcategory_weights not available:', error.message);
        return [];
      }
      return data ?? [];
    },
    staleTime: 1000 * 60 * 60,
  });

  const mutation = useMutation({
    mutationFn: async (updates: { subcategory: string; transaction_type: string | null; weight: number; notes: string | null }[]) => {
      const { error } = await supabase
        .from('subcategory_weights')
        .upsert(
          updates.map(u => ({
            subcategory: u.subcategory,
            transaction_type: u.transaction_type,
            weight: u.weight,
            notes: u.notes,
            updated_at: new Date().toISOString(),
          })),
          { onConflict: 'subcategory,transaction_type' },
        );
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subcategory-weights'] });
    },
  });

  return {
    data: query.data ?? [],
    isLoading: query.isLoading,
    updateWeights: mutation.mutateAsync,
    isUpdating: mutation.isPending,
  };
}
