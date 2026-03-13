import { useState, useMemo } from 'react';
import type { CombinedMetric, AgentActivity } from '../../lib/types';
import { individualsOnly, sumField } from '../../lib/metrics';
import { ComparisonTable } from '../shared/ComparisonTable';

type Tab = 'demand' | 'supply' | 'efficiency';

function safePct(num: number, den: number): number | null {
  if (den === 0) return null;
  return Math.round((num / den) * 100);
}

function safeRatio(num: number, den: number): number | null {
  if (den === 0) return null;
  return Math.round((num / den) * 10) / 10;
}

interface ConversionMetrics {
  // Demand
  leadsToReg: number | null;
  showingToOffer: number | null;
  // Supply
  regToExcl: number | null;
  exclToClosing: number | null;
  // Efficiency
  leadsPer100Calls: number | null;
  marketingScore: number | null;
  followUpIntensity: number | null;
}

function computeConversions(
  metrics: CombinedMetric[],
  activity?: Map<number, Record<string, number>>,
): ConversionMetrics {
  const individuals = individualsOnly(metrics);
  const reg = sumField(individuals, 'crm_registrations');
  const excl = sumField(individuals, 'crm_exclusives');
  const show = sumField(individuals, 'crm_showings');
  const offers = sumField(individuals, 'crm_offers');
  const closings = sumField(individuals, 'crm_closings');

  // Activity totals
  let totalCalls = 0;
  let totalLeads = 0;
  let totalMarketing = 0;
  let totalFollowUp = 0;
  if (activity) {
    for (const data of activity.values()) {
      totalCalls += data['outreach'] || 0;
      totalLeads += data['leads'] || 0;
      totalMarketing += data['marketing'] || 0;
      totalFollowUp += data['cultivation'] || 0;
    }
  }

  return {
    leadsToReg: safePct(reg, totalLeads > 0 ? totalLeads : reg), // fallback if no activity data
    showingToOffer: safePct(offers, show),
    regToExcl: safePct(excl, reg),
    exclToClosing: safePct(closings, excl),
    leadsPer100Calls: totalCalls > 0 ? safeRatio(totalLeads * 100, totalCalls) : null,
    marketingScore: totalMarketing,
    followUpIntensity: totalFollowUp,
  };
}

interface Props {
  metrics: CombinedMetric[];
  activity: AgentActivity[] | undefined;
  selectedAgent: number | 'all';
  agents: { agent_id: number; canonical_name: string; office: string | null; is_team: boolean }[];
}

export function ConversionTabs({ metrics, activity, selectedAgent, agents }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('demand');

  // Aggregate activity per agent
  const activityAgg = useMemo(() => {
    if (!activity) return new Map<number, Record<string, number>>();
    const map = new Map<number, Record<string, number>>();
    for (const a of activity) {
      const existing = map.get(a.agent_id) || {};
      existing['outreach'] = (existing['outreach'] || 0) + (a.total_cold_calls || 0) + (a.total_follow_ups || 0) + (a.total_digital_outreach || 0);
      existing['leads'] = (existing['leads'] || 0) + (a.total_leads || 0);
      existing['marketing'] = (existing['marketing'] || 0) + (a.total_marketing_actions || 0);
      existing['cultivation'] = (existing['cultivation'] || 0) + (a.total_cultivation || 0);
      existing['meetings'] = (existing['meetings'] || 0) + (a.total_meetings || 0);
      map.set(a.agent_id, existing);
    }
    return map;
  }, [activity]);

  // Filter metrics for selected agent
  const filteredMetrics = useMemo(() => {
    if (selectedAgent === 'all') return metrics;
    return metrics.filter(m => m.agent_id === selectedAgent);
  }, [metrics, selectedAgent]);

  // Find the agent's office
  const agentOffice = useMemo(() => {
    if (selectedAgent === 'all') return null;
    return agents.find(a => a.agent_id === selectedAgent)?.office || null;
  }, [selectedAgent, agents]);

  // Filter for office metrics
  const officeMetrics = useMemo(() => {
    if (!agentOffice) return metrics;
    const officeAgentIds = new Set(agents.filter(a => a.office === agentOffice && !a.is_team).map(a => a.agent_id));
    return metrics.filter(m => officeAgentIds.has(m.agent_id));
  }, [agentOffice, agents, metrics]);

  // Filter activity maps
  const entityActivity = useMemo(() => {
    if (selectedAgent === 'all') return activityAgg;
    const m = new Map<number, Record<string, number>>();
    const data = activityAgg.get(selectedAgent as number);
    if (data) m.set(selectedAgent as number, data);
    return m;
  }, [selectedAgent, activityAgg]);

  const officeActivity = useMemo(() => {
    if (!agentOffice) return activityAgg;
    const officeAgentIds = new Set(agents.filter(a => a.office === agentOffice && !a.is_team).map(a => a.agent_id));
    const m = new Map<number, Record<string, number>>();
    for (const [id, data] of activityAgg) {
      if (officeAgentIds.has(id)) m.set(id, data);
    }
    return m;
  }, [agentOffice, agents, activityAgg]);

  // Compute all levels
  const entity = computeConversions(filteredMetrics, entityActivity);
  const office = computeConversions(officeMetrics, officeActivity);
  const company = computeConversions(metrics, activityAgg);

  const TABS: { key: Tab; label: string }[] = [
    { key: 'demand', label: 'Demand (Ζήτηση)' },
    { key: 'supply', label: 'Supply (Ανάθεση)' },
    { key: 'efficiency', label: 'Efficiency (Αποδοτικότητα)' },
  ];

  const rows = useMemo(() => {
    if (activeTab === 'demand') {
      return [
        {
          label: 'Showing → Offer %',
          entity: entity.showingToOffer,
          office: office.showingToOffer,
          company: company.showingToOffer,
        },
      ];
    }
    if (activeTab === 'supply') {
      return [
        {
          label: 'Registration → Exclusive %',
          entity: entity.regToExcl,
          office: office.regToExcl,
          company: company.regToExcl,
        },
        {
          label: 'Exclusive → Closing %',
          entity: entity.exclToClosing,
          office: office.exclToClosing,
          company: company.exclToClosing,
        },
      ];
    }
    // efficiency
    return [
      {
        label: 'Leads per 100 Calls',
        entity: entity.leadsPer100Calls,
        office: office.leadsPer100Calls,
        company: company.leadsPer100Calls,
      },
      {
        label: 'Marketing Score (Actions)',
        entity: entity.marketingScore,
        office: office.marketingScore,
        company: company.marketingScore,
      },
      {
        label: 'Follow-up Intensity',
        entity: entity.followUpIntensity,
        office: office.followUpIntensity,
        company: company.followUpIntensity,
      },
    ];
  }, [activeTab, entity, office, company]);

  const entityLabel = selectedAgent === 'all' ? 'Company' : 'Agent';

  return (
    <div className="card-premium p-5">
      <h3 className="text-sm font-semibold text-text-primary mb-4">
        Conversion Rates (Ρυθμοί Μετατροπής)
      </h3>

      {/* Tabs */}
      <div className="flex gap-1 bg-surface-light rounded-lg p-1 mb-4">
        {TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
              activeTab === tab.key
                ? 'bg-surface-card text-brand-blue shadow-sm'
                : 'text-text-muted hover:text-text-primary'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <ComparisonTable
        rows={rows}
        entityLabel={entityLabel}
        showTeam={false}
        formatValue={(val) => {
          if (val === null || val === undefined) return '—';
          if (typeof val === 'number') return val.toLocaleString('el-GR');
          return String(val);
        }}
      />

      <div className="mt-3 text-[10px] text-text-muted">
        Source: Agent self-report (ACC) + CRM data. Πράσινο = πάνω από εταιρικό μέσο, Κόκκινο = κάτω.
      </div>
    </div>
  );
}
