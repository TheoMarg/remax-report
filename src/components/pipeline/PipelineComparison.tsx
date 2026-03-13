import { useState, useMemo } from 'react';
import type { PropertyJourney } from '../../lib/types';
import type { StageName } from '../../hooks/useStageFlow';
import { EntitySelector, type EntityView } from '../shared/EntitySelector';
import { ComparisonTable } from '../shared/ComparisonTable';

const STAGE_FLAG: Record<StageName, keyof PropertyJourney> = {
  registration: 'has_registration',
  exclusive: 'has_exclusive',
  published: 'has_published',
  showing: 'has_showing',
  offer: 'has_offer',
  closing: 'has_closing',
};

const NEXT_STAGE: Partial<Record<StageName, StageName>> = {
  registration: 'exclusive',
  exclusive: 'showing',
  showing: 'offer',
  offer: 'closing',
};

interface StageMetrics {
  count: number;
  nextCount: number;
  convPct: number | null;
  avgPrice: number | null;
  avgDays: number | null;
  gci: number | null;
}

function computeMetrics(journeys: PropertyJourney[], stage: StageName): StageMetrics {
  const flag = STAGE_FLAG[stage];
  const nextStage = NEXT_STAGE[stage];
  const nextFlag = nextStage ? STAGE_FLAG[nextStage] : null;
  const isClosing = stage === 'closing';

  const atStage = journeys.filter(j => j[flag]);
  const count = atStage.length;
  const nextCount = nextFlag ? atStage.filter(j => j[nextFlag]).length : 0;
  const convPct = count > 0 && nextFlag ? Math.round((nextCount / count) * 100) : null;

  const prices = atStage.map(j => j.listing_price).filter((p): p is number => p != null);
  const avgPrice = prices.length > 0 ? Math.round(prices.reduce((a, b) => a + b, 0) / prices.length) : null;

  let avgDays: number | null = null;
  if (isClosing) {
    const days = atStage.map(j => j.days_total_journey).filter((d): d is number => d != null);
    avgDays = days.length > 0 ? Math.round(days.reduce((a, b) => a + b, 0) / days.length) : null;
  } else if (stage === 'exclusive') {
    const days = atStage.map(j => j.days_reg_to_excl).filter((d): d is number => d != null);
    avgDays = days.length > 0 ? Math.round(days.reduce((a, b) => a + b, 0) / days.length) : null;
  }

  const gci = isClosing ? atStage.reduce((s, j) => s + (j.gci || 0), 0) : null;

  return { count, nextCount, convPct, avgPrice, avgDays, gci };
}

function fmtEur(n: number | null): string {
  if (n == null) return '—';
  return `€${n.toLocaleString('el-GR', { maximumFractionDigits: 0 })}`;
}

interface Props {
  journeys: PropertyJourney[];
  stage: StageName;
  agents: { agent_id: number; canonical_name: string; office: string | null; is_team: boolean }[];
  teamMembers: { team_id: number; agent_id: number }[];
}

export function PipelineComparison({ journeys, stage, agents, teamMembers }: Props) {
  const [entityView, setEntityView] = useState<EntityView>('agent');
  const [selectedId, setSelectedId] = useState<number | string>('');

  // Build entity options based on entityView
  const options = useMemo(() => {
    if (entityView === 'agent') {
      const agentIds = new Set(journeys.map(j => j.agent_id));
      return agents
        .filter(a => agentIds.has(a.agent_id) && !a.is_team)
        .map(a => ({ id: a.agent_id, label: a.canonical_name }))
        .sort((a, b) => a.label.localeCompare(b.label, 'el'));
    }
    if (entityView === 'office') {
      return [
        { id: 'larissa', label: 'Λάρισα' },
        { id: 'katerini', label: 'Κατερίνη' },
      ];
    }
    // team — derive unique teams from teamMembers
    const teamIds = new Set(teamMembers.map(tm => tm.team_id));
    return Array.from(teamIds).map(tid => {
      const teamAgent = agents.find(a => a.agent_id === tid);
      return { id: tid, label: teamAgent?.canonical_name || `Team #${tid}` };
    });
  }, [entityView, journeys, agents, teamMembers]);

  // Reset selection when view changes
  const effectiveId = options.find(o => o.id === selectedId) ? selectedId : (options[0]?.id ?? '');

  // Compute comparison rows
  const comparisonRows = useMemo(() => {
    if (!effectiveId || options.length === 0) return [];

    // Filter entity journeys
    let entityJourneys: PropertyJourney[];
    let entityOffice: string | null = null;
    let entityTeamAgents: number[] = [];

    if (entityView === 'agent') {
      entityJourneys = journeys.filter(j => j.agent_id === effectiveId);
      entityOffice = agents.find(a => a.agent_id === effectiveId)?.office || null;
      // Find team for this agent
      const tm = teamMembers.find(t => t.agent_id === (effectiveId as number));
      if (tm) {
        entityTeamAgents = teamMembers.filter(t => t.team_id === tm.team_id).map(t => t.agent_id);
      }
    } else if (entityView === 'office') {
      entityJourneys = journeys.filter(j => j.office === effectiveId);
      entityOffice = effectiveId as string;
    } else {
      // team
      const memberIds = teamMembers.filter(t => t.team_id === (effectiveId as number)).map(t => t.agent_id);
      entityJourneys = journeys.filter(j => memberIds.includes(j.agent_id));
      entityTeamAgents = memberIds;
    }

    const entity = computeMetrics(entityJourneys, stage);

    // Team avg (only for agent view)
    let team: StageMetrics | null = null;
    if (entityView === 'agent' && entityTeamAgents.length > 0) {
      const teamJ = journeys.filter(j => entityTeamAgents.includes(j.agent_id));
      team = computeMetrics(teamJ, stage);
    }

    // Office avg
    const officeJ = entityOffice ? journeys.filter(j => j.office === entityOffice) : journeys;
    const office = computeMetrics(officeJ, stage);

    // Company avg
    const company = computeMetrics(journeys, stage);

    const isClosing = stage === 'closing';
    const hasNext = !!NEXT_STAGE[stage];

    const rows = [
      {
        label: 'Count (Αριθμός)',
        entity: entity.count,
        team: team?.count ?? null,
        office: office.count,
        company: company.count,
      },
    ];

    if (hasNext) {
      rows.push({
        label: 'Conv% (Μετατροπή)',
        entity: entity.convPct,
        team: team?.convPct ?? null,
        office: office.convPct,
        company: company.convPct,
      });
    }

    rows.push({
      label: 'Avg Price (Μ.Ο. Τιμής)',
      entity: entity.avgPrice,
      team: team?.avgPrice ?? null,
      office: office.avgPrice,
      company: company.avgPrice,
    });

    if (entity.avgDays != null || company.avgDays != null) {
      rows.push({
        label: 'Avg Days (Μ.Ο. Ημέρες)',
        entity: entity.avgDays,
        team: team?.avgDays ?? null,
        office: office.avgDays,
        company: company.avgDays,
      });
    }

    if (isClosing) {
      rows.push({
        label: 'GCI',
        entity: entity.gci,
        team: team?.gci ?? null,
        office: office.gci,
        company: company.gci,
      });
    }

    return rows;
  }, [effectiveId, entityView, journeys, stage, agents, teamMembers, options]);

  const entityLabel = entityView === 'agent' ? 'Agent' : entityView === 'team' ? 'Team' : 'Office';

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <EntitySelector value={entityView} onChange={v => { setEntityView(v); setSelectedId(''); }} />
        {options.length > 0 && (
          <select
            value={effectiveId}
            onChange={e => setSelectedId(entityView === 'office' ? e.target.value : Number(e.target.value))}
            className="text-xs border border-border-default rounded-lg px-3 py-2 bg-surface-card text-text-primary"
          >
            {options.map(o => (
              <option key={o.id} value={o.id}>{o.label}</option>
            ))}
          </select>
        )}
      </div>

      {comparisonRows.length > 0 && (
        <ComparisonTable
          title={`${entityLabel} Comparison (Σύγκριση) — ${stage}`}
          rows={comparisonRows}
          entityLabel={entityLabel}
          showTeam={entityView === 'agent'}
          formatValue={(val) => {
            if (val === null || val === undefined) return '—';
            if (typeof val === 'number') {
              if (Math.abs(val) >= 1000) return fmtEur(val);
              return val.toLocaleString('el-GR');
            }
            return String(val);
          }}
        />
      )}
    </div>
  );
}
