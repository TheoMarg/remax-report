import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type { PipelineValue } from '../lib/types';

export function usePipelineValue() {
  return useQuery({
    queryKey: ['pipeline-value'],
    queryFn: async (): Promise<PipelineValue[]> => {
      const { data, error } = await supabase
        .from('v_pipeline_value')
        .select('*');

      if (error) throw error;
      return data ?? [];
    },
    staleTime: 1000 * 60 * 60,
  });
}
