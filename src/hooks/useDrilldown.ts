import { useState, useCallback } from 'react';
import type { Period } from '../lib/types';
import type { DrilldownMetric } from '../components/shared/DrilldownDrawer';

export interface DrilldownState {
  isOpen: boolean;
  metric: DrilldownMetric;
  period: Period;
  agentId?: number;
  title: string;
  count: number;
}

export function useDrilldown() {
  const [state, setState] = useState<DrilldownState | null>(null);

  const openDrilldown = useCallback((params: {
    metric: DrilldownMetric;
    period: Period;
    agentId?: number;
    title: string;
    count: number;
  }) => {
    setState({ isOpen: true, ...params });
  }, []);

  const closeDrilldown = useCallback(() => {
    setState(null);
  }, []);

  return { drilldown: state, openDrilldown, closeDrilldown };
}
