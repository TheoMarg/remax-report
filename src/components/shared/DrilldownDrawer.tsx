import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import type { Period } from '../../lib/types';
import { EntityLink } from './EntityLink';

export type DrilldownMetric = 'registrations' | 'exclusives' | 'showings' | 'offers' | 'closings' | 'billing';

interface DrilldownRow {
  id: string | number;
  property_id?: string;
  property_code?: string | null;
  agent_name?: string;
  agent_id?: number;
  date?: string;
  type?: string;
  price?: number | null;
}

interface Props {
  metric: DrilldownMetric;
  period: Period;
  agentId?: number;
  title: string;
  count: number;
  onClose: () => void;
}

const METRIC_CONFIG: Record<DrilldownMetric, {
  table: string;
  dateField: string;
  select: string;
}> = {
  registrations: {
    table: 'properties',
    dateField: 'registration_date',
    select: 'property_id, property_code, agent_id, registration_date, category, price',
  },
  exclusives: {
    table: 'exclusives',
    dateField: 'sign_date',
    select: 'id, property_id, agent_id, sign_date, owner_name',
  },
  showings: {
    table: 'ypodikseis',
    dateField: 'showing_date',
    select: 'id, property_id, agent_id, showing_date, client_name',
  },
  offers: {
    table: 'offers',
    dateField: 'offer_date',
    select: 'id, property_id, agent_id, offer_date, price',
  },
  closings: {
    table: 'v_valid_closings',
    dateField: 'closing_date',
    select: 'id, property_id, property_code, agent_id, closing_date, closing_type, price, gci',
  },
  billing: {
    table: 'billing_transactions',
    dateField: 'billing_month',
    select: 'id, agent_id, billing_month, amount, description',
  },
};

function fmtEur(n: number | null | undefined): string {
  if (n == null) return '—';
  return `€${n.toLocaleString('el-GR', { maximumFractionDigits: 0 })}`;
}

export function DrilldownDrawer({ metric, period, agentId, title, count, onClose }: Props) {
  const config = METRIC_CONFIG[metric];

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ['drilldown', metric, period.start, period.end, agentId],
    queryFn: async () => {
      let query = supabase
        .from(config.table)
        .select(config.select)
        .gte(config.dateField, period.start)
        .lt(config.dateField, period.end)
        .order(config.dateField, { ascending: false })
        .limit(100);

      if (agentId) {
        query = query.eq('agent_id', agentId);
      }

      const { data, error } = await query;
      if (error) throw error;

      return (data || []).map((row: Record<string, unknown>) => ({
        id: row.id || row.property_id || Math.random(),
        property_id: row.property_id as string | undefined,
        property_code: row.property_code as string | null | undefined,
        agent_id: row.agent_id as number | undefined,
        date: (row[config.dateField] || row.billing_month) as string | undefined,
        type: (row.category || row.closing_type || row.description) as string | undefined,
        price: (row.price || row.gci || row.amount) as number | null | undefined,
      })) as DrilldownRow[];
    },
    staleTime: 1000 * 60 * 5,
  });

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/20 z-40"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed top-0 right-0 bottom-0 w-full max-w-lg bg-surface-card shadow-2xl z-40 flex flex-col animate-slide-in-right">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border-default">
          <div>
            <h3 className="text-sm font-semibold text-text-primary">{title}</h3>
            <p className="text-xs text-text-muted mt-0.5">
              {count} records — {period.label}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-surface-light text-text-muted transition-colors"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-6 h-6 border-2 border-brand-blue border-t-transparent rounded-full animate-spin" />
            </div>
          ) : rows.length === 0 ? (
            <p className="text-sm text-text-muted text-center py-8">No records found.</p>
          ) : (
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-text-muted border-b border-border-default">
                  <th className="pb-2 pr-2 font-medium">Property</th>
                  <th className="pb-2 pr-2 font-medium">Date</th>
                  <th className="pb-2 pr-2 font-medium">Type</th>
                  <th className="pb-2 font-medium text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={String(row.id)} className="border-b border-border-subtle hover:bg-surface-light">
                    <td className="py-2 pr-2">
                      {row.property_id ? (
                        <EntityLink
                          type="property"
                          id={row.property_id}
                          label={row.property_code || row.property_id.slice(0, 8)}
                          className="text-xs font-mono"
                        />
                      ) : '—'}
                    </td>
                    <td className="py-2 pr-2 tabular-nums text-text-secondary">
                      {row.date || '—'}
                    </td>
                    <td className="py-2 pr-2 text-text-secondary truncate max-w-[120px]">
                      {row.type || '—'}
                    </td>
                    <td className="py-2 text-right tabular-nums font-medium">
                      {fmtEur(row.price)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </>
  );
}
