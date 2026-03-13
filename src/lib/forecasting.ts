export interface ForecastResult {
  month: string;          // 'YYYY-MM'
  actual: number | null;  // null for future months
  moving_avg: number;
  linear_trend: number;
  yoy_growth: number | null;
  seasonal: number | null;
  ensemble: number;
  confidence_low: number;
  confidence_high: number;
}

/** Moving Average: avg of last N values */
export function movingAverage(values: number[], n: number = 3): number {
  if (values.length === 0) return 0;
  const slice = values.slice(-n);
  return slice.reduce((s, v) => s + v, 0) / slice.length;
}

/** Linear Trend: least squares y = ax + b, project forward */
export function linearTrend(monthly: number[], projectMonths: number): number[] {
  const n = monthly.length;
  if (n === 0) return Array(projectMonths).fill(0);
  if (n === 1) return Array(projectMonths).fill(monthly[0]);

  // Least squares
  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
  for (let i = 0; i < n; i++) {
    sumX += i;
    sumY += monthly[i];
    sumXY += i * monthly[i];
    sumX2 += i * i;
  }
  const denom = n * sumX2 - sumX * sumX;
  const a = denom === 0 ? 0 : (n * sumXY - sumX * sumY) / denom;
  const b = (sumY - a * sumX) / n;

  const result: number[] = [];
  for (let i = 0; i < projectMonths; i++) {
    result.push(Math.max(0, a * (n + i) + b));
  }
  return result;
}

/** YoY Growth: same month last year × avg growth rate */
export function yoyGrowth(
  currentYear: { month: number; gci: number }[],
  previousYear: { month: number; gci: number }[],
): (number | null)[] {
  if (previousYear.length === 0) return Array(12).fill(null);

  const prevMap = new Map<number, number>();
  for (const p of previousYear) prevMap.set(p.month, p.gci);

  // Compute avg growth rate from months we have both years
  let growthSum = 0, growthCount = 0;
  for (const c of currentYear) {
    const prev = prevMap.get(c.month);
    if (prev && prev > 0) {
      growthSum += c.gci / prev;
      growthCount++;
    }
  }
  const avgGrowth = growthCount > 0 ? growthSum / growthCount : 1;

  const result: (number | null)[] = [];
  for (let m = 1; m <= 12; m++) {
    const prev = prevMap.get(m);
    if (prev != null) {
      result.push(Math.max(0, prev * avgGrowth));
    } else {
      result.push(null);
    }
  }
  return result;
}

/** Seasonal: average GCI per calendar month, scaled to current run rate */
export function seasonalForecast(
  allData: { month: number; gci: number }[],
  currentRunRate: number,
): (number | null)[] {
  if (allData.length === 0) return Array(12).fill(null);

  // Monthly averages
  const monthSums: number[] = Array(12).fill(0);
  const monthCounts: number[] = Array(12).fill(0);
  for (const d of allData) {
    monthSums[d.month - 1] += d.gci;
    monthCounts[d.month - 1]++;
  }

  const monthAvgs = monthSums.map((s, i) => monthCounts[i] > 0 ? s / monthCounts[i] : 0);
  const overallAvg = monthAvgs.reduce((s, v) => s + v, 0) / monthAvgs.filter(v => v > 0).length || 1;

  // Scale factors
  const result: (number | null)[] = [];
  for (let m = 0; m < 12; m++) {
    if (monthCounts[m] === 0) {
      result.push(null);
    } else {
      const factor = monthAvgs[m] / overallAvg;
      result.push(Math.max(0, currentRunRate * factor));
    }
  }
  return result;
}

/** Ensemble: weighted average of forecasts + confidence bands */
export function ensemble(
  forecasts: { method: string; values: number[] }[],
  weights?: number[],
): { mid: number[]; low: number[]; high: number[] } {
  if (forecasts.length === 0) return { mid: [], low: [], high: [] };

  const len = forecasts[0].values.length;
  const w = weights ?? forecasts.map(() => 1 / forecasts.length);

  const mid: number[] = [];
  const low: number[] = [];
  const high: number[] = [];

  for (let i = 0; i < len; i++) {
    let weighted = 0;
    let validWeight = 0;
    const vals: number[] = [];

    for (let f = 0; f < forecasts.length; f++) {
      const v = forecasts[f].values[i];
      if (v != null && !isNaN(v)) {
        weighted += v * w[f];
        validWeight += w[f];
        vals.push(v);
      }
    }

    const m = validWeight > 0 ? weighted / validWeight : 0;
    mid.push(m);

    // Confidence: std dev of forecasts for this month
    if (vals.length > 1) {
      const variance = vals.reduce((s, v) => s + (v - m) ** 2, 0) / vals.length;
      const std = Math.sqrt(variance);
      low.push(Math.max(0, m - 1.5 * std));
      high.push(m + 1.5 * std);
    } else {
      // Use ±20% as fallback
      low.push(Math.max(0, m * 0.8));
      high.push(m * 1.2);
    }
  }

  return { mid, low, high };
}

/** Build full forecast from monthly GCI data */
export function buildForecast(
  monthlyGci: { month: string; gci: number }[],
  forecastMonths: number = 6,
): ForecastResult[] {
  if (monthlyGci.length === 0) return [];

  // Sort chronologically
  const sorted = [...monthlyGci].sort((a, b) => a.month.localeCompare(b.month));
  const values = sorted.map(m => m.gci);

  // Current year / previous year for YoY
  const now = new Date();
  const currentYear = now.getFullYear();
  const curYearData = sorted
    .filter(m => m.month.startsWith(String(currentYear)))
    .map(m => ({ month: parseInt(m.month.split('-')[1]), gci: m.gci }));
  const prevYearData = sorted
    .filter(m => m.month.startsWith(String(currentYear - 1)))
    .map(m => ({ month: parseInt(m.month.split('-')[1]), gci: m.gci }));

  // All data for seasonal
  const allMonthData = sorted.map(m => ({
    month: parseInt(m.month.split('-')[1]),
    gci: m.gci,
  }));
  const currentRunRate = movingAverage(values, 3);

  // Compute forecasts for projected months
  const trend = linearTrend(values, forecastMonths);
  const yoy = yoyGrowth(curYearData, prevYearData);
  const seasonal = seasonalForecast(allMonthData, currentRunRate);

  // Generate future month labels
  const lastMonth = sorted[sorted.length - 1].month;
  const [ly, lm] = lastMonth.split('-').map(Number);
  const futureMonths: string[] = [];
  for (let i = 1; i <= forecastMonths; i++) {
    let nm = lm + i;
    let ny = ly;
    while (nm > 12) { nm -= 12; ny++; }
    futureMonths.push(`${ny}-${String(nm).padStart(2, '0')}`);
  }

  // Build forecast values for ensemble
  const maForecast: number[] = [];
  const extendedValues = [...values];
  for (let i = 0; i < forecastMonths; i++) {
    const ma = movingAverage(extendedValues, 3);
    maForecast.push(ma);
    extendedValues.push(ma);
  }

  const forecastInputs: { method: string; values: number[] }[] = [
    { method: 'moving_avg', values: maForecast },
    { method: 'linear_trend', values: trend },
  ];

  // Add YoY if available
  const yoyValues = futureMonths.map(m => {
    const mo = parseInt(m.split('-')[1]);
    return yoy[mo - 1];
  });
  if (yoyValues.some(v => v != null)) {
    forecastInputs.push({
      method: 'yoy_growth',
      values: yoyValues.map(v => v ?? currentRunRate),
    });
  }

  // Add seasonal if available
  const seasonalValues = futureMonths.map(m => {
    const mo = parseInt(m.split('-')[1]);
    return seasonal[mo - 1];
  });
  if (seasonalValues.some(v => v != null)) {
    forecastInputs.push({
      method: 'seasonal',
      values: seasonalValues.map(v => v ?? currentRunRate),
    });
  }

  // Explicit weights: MA 0.3, Linear 0.2, YoY 0.25, Seasonal 0.25
  const weightOrder = [0.3, 0.2, 0.25, 0.25];
  const ensWeights = forecastInputs.map((_, i) => weightOrder[i] ?? 0.25);
  const ens = ensemble(forecastInputs, ensWeights);

  // Build results: actuals + forecast
  const results: ForecastResult[] = [];

  // Actual months
  for (const m of sorted) {
    results.push({
      month: m.month,
      actual: m.gci,
      moving_avg: 0,
      linear_trend: 0,
      yoy_growth: null,
      seasonal: null,
      ensemble: m.gci,
      confidence_low: m.gci,
      confidence_high: m.gci,
    });
  }

  // Forecast months
  for (let i = 0; i < forecastMonths; i++) {
    const mo = parseInt(futureMonths[i].split('-')[1]);
    results.push({
      month: futureMonths[i],
      actual: null,
      moving_avg: Math.round(maForecast[i]),
      linear_trend: Math.round(trend[i]),
      yoy_growth: yoy[mo - 1] != null ? Math.round(yoy[mo - 1]!) : null,
      seasonal: seasonal[mo - 1] != null ? Math.round(seasonal[mo - 1]!) : null,
      ensemble: Math.round(ens.mid[i]),
      confidence_low: Math.round(ens.low[i]),
      confidence_high: Math.round(ens.high[i]),
    });
  }

  return results;
}
