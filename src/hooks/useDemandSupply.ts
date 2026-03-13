import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

interface DemandRequest {
  id: number;
  category: string | null;
  request_type: string | null;
  sq_min: number | null;
  sq_max: number | null;
  price_min: number | null;
  price_max: number | null;
  agent_id: number | null;
}

interface SupplyProperty {
  property_id: string;
  subcategory: string | null;
  category: string | null;
  price: number | null;
  size_sqm: number | null;
  agent_id: number | null;
}

export interface DemandSupplyRow {
  category: string;
  requestType: string | null;
  requestCount: number;
  matchingSupply: number;
  gap: number;
  status: 'green' | 'yellow' | 'red';
}

function matchesRequest(prop: SupplyProperty, req: DemandRequest): boolean {
  if (prop.subcategory !== req.category) return false;
  if (req.price_min != null && prop.price != null && prop.price < req.price_min) return false;
  if (req.price_max != null && prop.price != null && prop.price > req.price_max) return false;
  if (req.sq_min != null && prop.size_sqm != null && prop.size_sqm < req.sq_min) return false;
  if (req.sq_max != null && prop.size_sqm != null && prop.size_sqm > req.sq_max) return false;
  return true;
}

export function useDemandSupply() {
  return useQuery({
    queryKey: ['demand-supply'],
    queryFn: async (): Promise<DemandSupplyRow[]> => {
      // Fetch requests and active properties in parallel
      const [reqResult, propResult] = await Promise.all([
        supabase
          .from('requests')
          .select('id, category, request_type, sq_min, sq_max, price_min, price_max, agent_id'),
        supabase
          .from('properties')
          .select('property_id, subcategory, category, price, size_sqm, agent_id')
          .eq('is_retired', false)
          .gt('price', 0),
      ]);

      if (reqResult.error) throw reqResult.error;
      if (propResult.error) throw propResult.error;

      const requests = (reqResult.data ?? []) as DemandRequest[];
      const properties = (propResult.data ?? []) as SupplyProperty[];

      if (requests.length === 0) return [];

      // Group requests by category
      const categoryMap = new Map<string, DemandRequest[]>();
      for (const req of requests) {
        if (!req.category) continue;
        if (!categoryMap.has(req.category)) categoryMap.set(req.category, []);
        categoryMap.get(req.category)!.push(req);
      }

      // For each category, count matching supply
      const rows: DemandSupplyRow[] = [];
      for (const [category, categoryRequests] of categoryMap) {
        const matchingPropertyIds = new Set<string>();
        for (const req of categoryRequests) {
          for (const prop of properties) {
            if (matchesRequest(prop, req)) {
              matchingPropertyIds.add(prop.property_id);
            }
          }
        }

        const requestCount = categoryRequests.length;
        const matchingSupply = matchingPropertyIds.size;
        const gap = requestCount - matchingSupply;

        let status: 'green' | 'yellow' | 'red';
        if (matchingSupply >= requestCount * 0.8) status = 'green';
        else if (matchingSupply >= requestCount * 0.5) status = 'yellow';
        else status = 'red';

        rows.push({
          category,
          requestType: categoryRequests[0]?.request_type ?? null,
          requestCount,
          matchingSupply,
          gap,
          status,
        });
      }

      return rows.sort((a, b) => b.gap - a.gap);
    },
    staleTime: 1000 * 60 * 60,
  });
}
