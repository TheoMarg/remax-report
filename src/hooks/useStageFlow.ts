import { useMemo } from 'react';
import type { PropertyJourney } from '../lib/types';

export type StageName = 'registration' | 'exclusive' | 'published' | 'showing' | 'offer' | 'closing';

export interface StageFlowResult {
  stage: StageName;
  inflow: number;         // entered this stage during period
  stock: number;          // currently at this stage
  outflow: number;        // passed to next stage
  dropout: number;        // lost (didn't pass)
  conversion_pct: number | null;
}

const STAGE_FLAG_MAP: Record<StageName, keyof PropertyJourney> = {
  registration: 'has_registration',
  exclusive: 'has_exclusive',
  published: 'has_published',
  showing: 'has_showing',
  offer: 'has_offer',
  closing: 'has_closing',
};

const STAGE_ORDER: StageName[] = ['registration', 'exclusive', 'showing', 'offer', 'closing'];

export function useStageFlow(
  journeys: PropertyJourney[],
  stage: StageName,
) {
  return useMemo((): StageFlowResult => {
    const currentFlag = STAGE_FLAG_MAP[stage];
    const nextStageIdx = STAGE_ORDER.indexOf(stage) + 1;
    const nextStage = nextStageIdx < STAGE_ORDER.length ? STAGE_ORDER[nextStageIdx] : null;
    const nextFlag = nextStage ? STAGE_FLAG_MAP[nextStage] : null;

    const atStage = journeys.filter(j => j[currentFlag]);
    const inflow = atStage.length;

    const passedNext = nextFlag ? atStage.filter(j => j[nextFlag]).length : 0;
    const stock = inflow - passedNext;
    const dropout = inflow - passedNext;
    const conversion_pct = inflow > 0 ? Math.round((passedNext / inflow) * 1000) / 10 : null;

    return {
      stage,
      inflow,
      stock,
      outflow: passedNext,
      dropout,
      conversion_pct,
    };
  }, [journeys, stage]);
}

export function useAllStageFlows(journeys: PropertyJourney[]) {
  return useMemo(() => {
    return STAGE_ORDER.map(stage => {
      const currentFlag = STAGE_FLAG_MAP[stage];
      const nextStageIdx = STAGE_ORDER.indexOf(stage) + 1;
      const nextStage = nextStageIdx < STAGE_ORDER.length ? STAGE_ORDER[nextStageIdx] : null;
      const nextFlag = nextStage ? STAGE_FLAG_MAP[nextStage] : null;

      const atStage = journeys.filter(j => j[currentFlag]);
      const inflow = atStage.length;
      const passedNext = nextFlag ? atStage.filter(j => j[nextFlag]).length : 0;

      return {
        stage,
        inflow,
        stock: inflow - passedNext,
        outflow: passedNext,
        dropout: inflow - passedNext,
        conversion_pct: inflow > 0 ? Math.round((passedNext / inflow) * 1000) / 10 : null,
      } satisfies StageFlowResult;
    });
  }, [journeys]);
}
