import { useState, useMemo } from 'react';
import type { Period, PropertyJourney } from '../lib/types';
import type { StageName } from '../hooks/useStageFlow';
import { usePropertyJourneys } from '../hooks/usePropertyJourneys';
import { useAllStageFlows } from '../hooks/useStageFlow';
import { useStuckAlerts } from '../hooks/useStuckAlerts';
import { PipelineFlowHeader } from '../components/pipeline/PipelineFlowHeader';
import { PipelineStageKPIs } from '../components/pipeline/PipelineStageKPIs';
import { PipelineBreakdownTable } from '../components/pipeline/PipelineBreakdownTable';
import { PipelineCharts } from '../components/pipeline/PipelineCharts';
import { EntityLink } from '../components/shared/EntityLink';

const STAGE_FLAG: Record<StageName, keyof PropertyJourney> = {
  registration: 'has_registration',
  exclusive: 'has_exclusive',
  published: 'has_published',
  showing: 'has_showing',
  offer: 'has_offer',
  closing: 'has_closing',
};

const STAGE_STUCK_MAP: Record<StageName, string> = {
  registration: 'registration',
  exclusive: 'exclusive',
  published: 'published',
  showing: 'showing',
  offer: 'offer',
  closing: 'closing',
};

interface Props {
  period: Period;
}

export function Pipeline({ period }: Props) {
  const [activeStage, setActiveStage] = useState<StageName>('registration');
  const { data: journeys = [], isLoading } = usePropertyJourneys(period);
  const flows = useAllStageFlows(journeys);
  const { data: stuckAlerts = [] } = useStuckAlerts();

  const activeFlow = flows.find(f => f.stage === activeStage) ?? flows[0];

  // Properties at this stage
  const stageJourneys = useMemo(() => {
    const flag = STAGE_FLAG[activeStage];
    return journeys.filter(j => j[flag]);
  }, [journeys, activeStage]);

  // Stuck alerts for this stage
  const stageStuck = useMemo(() => {
    return stuckAlerts.filter(a => a.current_stage === STAGE_STUCK_MAP[activeStage]);
  }, [stuckAlerts, activeStage]);

  return (
    <div className="max-w-[1600px] mx-auto px-6 py-6 space-y-6">
      <h2 className="text-xl font-semibold text-text-primary">
        Pipeline (Ροή Ακινήτων)
        <span className="text-sm font-normal text-text-muted ml-3">{period.label}</span>
      </h2>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-20 bg-surface-light rounded-lg animate-pulse" />
          ))}
        </div>
      ) : (
        <>
          {/* Flow header — all stages overview */}
          <PipelineFlowHeader
            flows={flows}
            activeStage={activeStage}
            onStageClick={setActiveStage}
          />

          {/* Stage KPI cards */}
          {activeFlow && (
            <PipelineStageKPIs
              stage={activeStage}
              flow={activeFlow}
              journeys={journeys}
              stageJourneys={stageJourneys}
            />
          )}

          {/* Charts */}
          <PipelineCharts journeys={journeys} stage={activeStage} />

          {/* Breakdown table */}
          <div className="bg-surface-card rounded-xl border border-border-default p-4">
            <h3 className="text-sm font-semibold text-text-primary mb-3">
              Ανάλυση ανά Γραφείο / Σύμβουλο
            </h3>
            <PipelineBreakdownTable journeys={journeys} stage={activeStage} />
          </div>

          {/* Stuck alerts */}
          {stageStuck.length > 0 && (
            <div className="bg-surface-card rounded-xl border border-border-default p-4">
              <h3 className="text-sm font-semibold text-brand-red mb-3">
                Stuck Alerts — {activeStage} ({stageStuck.length})
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-left text-text-muted border-b border-border-default">
                      <th className="pb-1.5 pr-3 font-medium">Κωδικός</th>
                      <th className="pb-1.5 pr-3 font-medium">Σύμβουλος</th>
                      <th className="pb-1.5 pr-3 font-medium">Τύπος</th>
                      <th className="pb-1.5 pr-3 font-medium text-right">Ημέρες</th>
                      <th className="pb-1.5 pr-3 font-medium text-right">Μ.Ο. Office</th>
                      <th className="pb-1.5 font-medium text-right">Πάνω από Μ.Ο.</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stageStuck.slice(0, 10).map(alert => (
                      <tr key={alert.property_id} className="border-b border-border-subtle hover:bg-surface-light">
                        <td className="py-1.5 pr-3">
                          <EntityLink type="property" id={alert.property_id} label={alert.property_code || alert.property_id.slice(0, 8)} className="text-xs font-mono font-medium" />
                        </td>
                        <td className="py-1.5 pr-3">
                          <EntityLink type="agent" id={alert.agent_id} label={alert.canonical_name || ''} className="text-xs" />
                        </td>
                        <td className="py-1.5 pr-3 text-text-secondary">{alert.subcategory || alert.category || '—'}</td>
                        <td className="py-1.5 pr-3 text-right tabular-nums font-bold text-brand-red">{alert.days_since_activity}d</td>
                        <td className="py-1.5 pr-3 text-right tabular-nums text-text-muted">{Math.round(alert.office_avg_days)}d</td>
                        <td className="py-1.5 text-right tabular-nums font-semibold text-brand-red">+{Math.round(alert.days_over_avg)}d</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Empty state */}
          {journeys.length === 0 && (
            <div className="card-premium p-8 text-center">
              <p className="text-text-muted">Δεν υπάρχουν δεδομένα journey για αυτήν την περίοδο.</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
