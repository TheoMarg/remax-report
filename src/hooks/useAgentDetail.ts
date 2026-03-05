import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type { Agent, CombinedMetric, PropertyDetail } from '../lib/types';

export function useAgentDetail(agentId: number | null) {
  const enabled = agentId !== null;

  const profile = useQuery({
    queryKey: ['agent360-profile', agentId],
    enabled,
    staleTime: 1000 * 60 * 60,
    queryFn: async (): Promise<Agent | null> => {
      const { data, error } = await supabase
        .from('agents')
        .select('agent_id, canonical_name, first_name, last_name, office, is_active, is_team, phone, email, start_date')
        .eq('agent_id', agentId!)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const metrics = useQuery({
    queryKey: ['agent360-metrics', agentId],
    enabled,
    staleTime: 1000 * 60 * 30,
    queryFn: async (): Promise<CombinedMetric[]> => {
      const { data, error } = await supabase
        .from('v_combined_metrics')
        .select('*')
        .eq('agent_id', agentId!);
      if (error) throw error;
      return data ?? [];
    },
  });

  const closings = useQuery({
    queryKey: ['agent360-closings', agentId],
    enabled,
    staleTime: 1000 * 60 * 30,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('v_valid_closings')
        .select('id, agent_id, property_id, property_code, closing_date, closing_type, price, gci, source, properties(property_id, address, area, transaction_type, price)')
        .eq('agent_id', agentId!)
        .order('closing_date', { ascending: false })
        .limit(5);
      if (error) throw error;
      // Supabase returns FK join as array; extract first element
      return (data ?? []).map((row: Record<string, unknown>) => ({
        ...row,
        properties: Array.isArray(row.properties) ? row.properties[0] ?? null : row.properties ?? null,
      })) as {
        id: number;
        agent_id: number | null;
        property_id: string | null;
        property_code: string | null;
        closing_date: string | null;
        closing_type: string | null;
        price: number | null;
        gci: number | null;
        source: string;
        properties: { property_id: string; address: string | null; area: string | null; transaction_type: string | null; price: number | null } | null;
      }[];
    },
  });

  const portfolio = useQuery({
    queryKey: ['agent360-portfolio', agentId],
    enabled,
    staleTime: 1000 * 60 * 30,
    queryFn: async () => {
      // Resolve agent_ids: for teams, aggregate all member exclusives
      let targetIds = [agentId!];

      const { data: agentRow } = await supabase
        .from('agents')
        .select('canonical_name, is_team')
        .eq('agent_id', agentId!)
        .single();

      if (agentRow?.is_team) {
        const { data: team } = await supabase
          .from('teams')
          .select('team_id')
          .eq('crm_team_name', agentRow.canonical_name)
          .single();

        if (team) {
          const { data: members } = await supabase
            .from('team_members')
            .select('agent_id')
            .eq('team_id', team.team_id);

          if (members && members.length > 0) {
            targetIds = members.map(m => m.agent_id);
          }
        }
      }

      const { data, error } = await supabase
        .from('exclusives')
        .select('id, agent_id, property_id, property_code, sign_date, end_date, properties(property_id, property_code, address, area, subcategory, category, price, transaction_type, days_on_market), agents(canonical_name)')
        .in('agent_id', targetIds)
        .eq('status', 'active')
        .order('end_date', { ascending: true });
      if (error) throw error;
      return (data ?? []).map((row: Record<string, unknown>) => ({
        ...row,
        properties: Array.isArray(row.properties) ? row.properties[0] ?? null : row.properties ?? null,
        agents: Array.isArray(row.agents) ? row.agents[0] ?? null : row.agents ?? null,
      })) as {
        id: number;
        agent_id: number | null;
        property_id: string | null;
        property_code: string | null;
        sign_date: string | null;
        end_date: string | null;
        properties: { property_id: string; property_code: string | null; address: string | null; area: string | null; subcategory: string | null; category: string | null; price: number | null; transaction_type: string | null; days_on_market: number | null } | null;
        agents: { canonical_name: string } | null;
      }[];
    },
  });

  const showingsCount = useQuery({
    queryKey: ['agent360-showings', agentId],
    enabled,
    staleTime: 1000 * 60 * 30,
    queryFn: async (): Promise<number> => {
      const { count, error } = await supabase
        .from('ypodikseis')
        .select('id', { count: 'exact', head: true })
        .eq('agent_id', agentId!);
      if (error) throw error;
      return count ?? 0;
    },
  });

  const currentYear = new Date().getFullYear();

  const targets = useQuery({
    queryKey: ['agent360-targets', agentId, currentYear],
    enabled,
    staleTime: 1000 * 60 * 60,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('targets_annual')
        .select('gci_target, gci_realistic, exclusives_target')
        .eq('agent_id', agentId!)
        .eq('year', currentYear)
        .maybeSingle();
      if (error) throw error;
      return data as { gci_target: number | null; gci_realistic: number | null; exclusives_target: number | null } | null;
    },
  });

  const withdrawals = useQuery({
    queryKey: ['agent360-withdrawals', agentId, currentYear],
    enabled,
    staleTime: 1000 * 60 * 30,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('v_withdrawal_reasons')
        .select('reason, cnt')
        .eq('agent_id', agentId!)
        .gte('period_start', `${currentYear}-01-01`)
        .lte('period_start', `${currentYear}-12-31`);
      if (error) throw error;
      // Aggregate same reason across months
      const map = new Map<string, number>();
      for (const row of data ?? []) {
        map.set(row.reason, (map.get(row.reason) || 0) + row.cnt);
      }
      return Object.fromEntries(map) as Record<string, number>;
    },
  });

  return {
    profile,
    metrics,
    closings,
    portfolio,
    showingsCount,
    targets,
    withdrawals,
    isLoading: profile.isLoading || metrics.isLoading || closings.isLoading || portfolio.isLoading || showingsCount.isLoading,
  };
}
