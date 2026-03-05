import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type { Agent, PropertyDetail, PropertyEvent, Showing, PriceChange, ExclusiveDetail, Closing } from '../lib/types';

export function usePropertyDetail(propertyId: string | null) {
  const enabled = propertyId !== null;

  const property = useQuery({
    queryKey: ['prop360-detail', propertyId],
    enabled,
    staleTime: 1000 * 60 * 60,
    queryFn: async (): Promise<PropertyDetail | null> => {
      const { data, error } = await supabase
        .from('properties')
        .select('property_id, property_code, address, area, category, subcategory, price, size_sqm, bedrooms, floor, year_built, energy_class, is_exclusive, is_retired, retirement_reason, first_pub_date, registration_date, agent_id, transaction_type, days_on_market')
        .eq('property_id', propertyId!)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const agent = useQuery({
    queryKey: ['prop360-agent', propertyId, property.data?.agent_id],
    enabled: enabled && property.data?.agent_id != null,
    staleTime: 1000 * 60 * 60,
    queryFn: async (): Promise<Agent | null> => {
      const { data, error } = await supabase
        .from('agents')
        .select('agent_id, canonical_name, first_name, last_name, office, is_active, is_team, phone, email, start_date')
        .eq('agent_id', property.data!.agent_id!)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const events = useQuery({
    queryKey: ['prop360-events', propertyId],
    enabled,
    staleTime: 1000 * 60 * 30,
    queryFn: async (): Promise<PropertyEvent[]> => {
      const { data, error } = await supabase
        .from('v_property_events_timeline')
        .select('property_id, event_date, event_type, detail, amount')
        .eq('property_id', propertyId!)
        .order('event_date', { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

  const showings = useQuery({
    queryKey: ['prop360-showings', propertyId],
    enabled,
    staleTime: 1000 * 60 * 30,
    queryFn: async (): Promise<Showing[]> => {
      const { data, error } = await supabase
        .from('ypodikseis')
        .select('id, agent_id, property_id, showing_date, client_name, manager_name')
        .eq('property_id', propertyId!)
        .order('showing_date', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const priceChanges = useQuery({
    queryKey: ['prop360-prices', propertyId, property.data?.transaction_type, property.data?.price],
    enabled: enabled && property.data != null,
    staleTime: 1000 * 60 * 30,
    queryFn: async (): Promise<PriceChange[]> => {
      const prop = property.data!;
      const { data, error } = await supabase
        .from('price_changes')
        .select('id, property_id, change_date, old_price, new_price, change_eur, change_pct')
        .eq('property_id', propertyId!)
        .gt('old_price', 0)
        .order('change_date', { ascending: true });
      if (error) throw error;

      const raw = data ?? [];
      const listingPrice = prop.price ?? 0;
      if (listingPrice === 0 || raw.length === 0) return [];

      const isRental = prop.transaction_type === 'Ενοικίαση';

      if (isRental) {
        // Rentals: old_price and new_price are actual EUR (monthly rent)
        return raw.filter(r => {
          const ratio = (r.old_price ?? 0) / listingPrice;
          return ratio >= 0.3 && ratio <= 3.0
            && (r.new_price ?? 0) > 0
            && r.old_price !== r.new_price;
        });
      }

      // Sales: auto-detect whether prices are in actual EUR or thousands.
      // Count how many entries match at each scale.
      const matchesActual = raw.filter(r => {
        const ratio = (r.old_price ?? 0) / listingPrice;
        return ratio >= 0.3 && ratio <= 3.0;
      }).length;
      const matchesThousands = raw.filter(r => {
        const ratio = ((r.old_price ?? 0) * 1000) / listingPrice;
        return ratio >= 0.3 && ratio <= 3.0;
      }).length;

      const multiplier = matchesActual >= matchesThousands ? 1 : 1000;

      const valid = raw.filter(r => {
        const price = (r.old_price ?? 0) * multiplier;
        const ratio = price / listingPrice;
        return ratio >= 0.3 && ratio <= 3.0;
      });

      // Deduplicate consecutive identical old_price values
      const deduped = valid.filter((r, i) => i === 0 || r.old_price !== valid[i - 1].old_price);

      // Reconstruct price transitions from sequential old_price values
      const result: PriceChange[] = [];
      for (let i = 0; i < deduped.length; i++) {
        const oldP = (deduped[i].old_price ?? 0) * multiplier;
        const newP = i + 1 < deduped.length
          ? (deduped[i + 1].old_price ?? 0) * multiplier
          : listingPrice;
        if (oldP === newP) continue;
        const changeEur = newP - oldP;
        const changePct = oldP > 0 ? (changeEur / oldP) * 100 : null;
        result.push({
          id: deduped[i].id,
          property_id: deduped[i].property_id,
          change_date: deduped[i].change_date,
          old_price: oldP,
          new_price: newP,
          change_eur: changeEur,
          change_pct: changePct != null ? Math.round(changePct * 10) / 10 : null,
        });
      }
      return result;
    },
  });

  const exclusive = useQuery({
    queryKey: ['prop360-exclusive', propertyId],
    enabled,
    staleTime: 1000 * 60 * 60,
    queryFn: async (): Promise<ExclusiveDetail | null> => {
      const { data, error } = await supabase
        .from('exclusives')
        .select('id, property_id, owner_name, sign_date, end_date')
        .eq('property_id', propertyId!)
        .order('sign_date', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const closing = useQuery({
    queryKey: ['prop360-closing', propertyId],
    enabled,
    staleTime: 1000 * 60 * 60,
    queryFn: async (): Promise<Closing | null> => {
      const { data, error } = await supabase
        .from('v_valid_closings')
        .select('id, agent_id, property_id, property_code, closing_date, closing_type, price, gci, source')
        .eq('property_id', propertyId!)
        .order('closing_date', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  return {
    property,
    agent,
    events,
    showings,
    priceChanges,
    exclusive,
    closing,
    isLoading: property.isLoading || events.isLoading || showings.isLoading || priceChanges.isLoading || exclusive.isLoading || closing.isLoading,
  };
}
