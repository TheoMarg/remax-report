import { useMemo } from 'react';
import { usePricingData } from './usePricingData';
import { useSubcategoryWeights } from './useSubcategoryWeights';
import { usePortfolioScores } from './usePortfolioScores';
import { usePortfolioQuality } from './usePortfolioQuality';
import { usePqsWeights } from './usePqsWeights';
import {
  computeMarketBenchmarks,
  computeMarketAdjustedPQS,
  computeOfficeDirectedPQS,
  type MarketBenchmark,
  type MarketPqsResult,
} from '../lib/marketability';
import type { PropertyPricing, ClosingPricing } from '../lib/types';

export function useMarketability() {
  const { data: activeRaw = [] } = usePricingData('active');
  const { data: closedRaw = [] } = usePricingData('closed');
  const { data: subcatWeights = [] } = useSubcategoryWeights();
  const { data: qualityData = [] } = usePortfolioQuality();
  const { data: pqsWeights = [] } = usePqsWeights();

  const basePqs = usePortfolioScores(qualityData, pqsWeights);

  const activeData = activeRaw as PropertyPricing[];
  const closedData = closedRaw as ClosingPricing[];

  const benchmarks = useMemo(() => {
    if (activeData.length === 0 && closedData.length === 0) return {} as Record<string, MarketBenchmark>;
    return computeMarketBenchmarks(activeData, closedData);
  }, [activeData, closedData]);

  const marketAdjusted = useMemo(() => {
    if (activeData.length === 0) return [] as MarketPqsResult[];
    return computeMarketAdjustedPQS(activeData, benchmarks);
  }, [activeData, benchmarks]);

  const officeDirected = useMemo(() => {
    if (activeData.length === 0 || subcatWeights.length === 0) return [] as MarketPqsResult[];
    const basePqsMap = new Map(basePqs.map(p => [p.agent_id, p.pqs]));
    return computeOfficeDirectedPQS(activeData, subcatWeights, basePqsMap);
  }, [activeData, subcatWeights, basePqs]);

  return {
    marketAdjusted,
    officeDirected,
    benchmarks,
    subcatWeights,
    isReady: activeData.length > 0,
  };
}
