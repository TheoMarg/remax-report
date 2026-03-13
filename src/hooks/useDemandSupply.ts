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

/** Try the v_demand_supply view first; fallback to client-side matching on error */
async function fetchFromView(): Promise<DemandSupplyRow[] | null> {
  const { data, error } = await supabase
    .from('v_demand_supply')
    .select('demand_category, request_type, request_count, matching_supply');

  if (error || !data) return null; // view missing or error → fallback

  return data.map(row => {
    const requestCount = row.request_count ?? 0;
    const matchingSupply = row.matching_supply ?? 0;
    const gap = requestCount - matchingSupply;

    let status: 'green' | 'yellow' | 'red';
    if (matchingSupply >= requestCount * 0.8) status = 'green';
    else if (matchingSupply >= requestCount * 0.5) status = 'yellow';
    else status = 'red';

    return {
      category: row.demand_category ?? '—',
      requestType: row.request_type ?? null,
      requestCount,
      matchingSupply,
      gap,
      status,
    };
  }).sort((a, b) => b.gap - a.gap);
}

async function fetchClientSide(): Promise<DemandSupplyRow[]> {
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

  const categoryMap = new Map<string, DemandRequest[]>();
  for (const req of requests) {
    if (!req.category) continue;
    if (!categoryMap.has(req.category)) categoryMap.set(req.category, []);
    categoryMap.get(req.category)!.push(req);
  }

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

    rows.push({ category, requestType: categoryRequests[0]?.request_type ?? null, requestCount, matchingSupply, gap, status });
  }

  return rows.sort((a, b) => b.gap - a.gap);
}

export function useDemandSupply() {
  return useQuery({
    queryKey: ['demand-supply'],
    queryFn: async (): Promise<DemandSupplyRow[]> => {
      // Try DB view first, fallback to client-side matching
      const viewResult = await fetchFromView();
      if (viewResult) return viewResult;
      return fetchClientSide();
    },
    staleTime: 1000 * 60 * 60,
  });
}
