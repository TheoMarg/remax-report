export function computePercentiles(
  values: number[],
  percentiles: number[] = [25, 50, 75, 90],
): Record<number, number> {
  const sorted = [...values].filter(v => v > 0).sort((a, b) => a - b);
  if (sorted.length === 0) return {};
  const result: Record<number, number> = {};
  for (const p of percentiles) {
    const idx = (p / 100) * (sorted.length - 1);
    const lower = Math.floor(idx);
    const upper = Math.ceil(idx);
    result[p] = lower === upper
      ? sorted[lower]
      : sorted[lower] + (sorted[upper] - sorted[lower]) * (idx - lower);
  }
  return result;
}

export function formatPercentileSummary(
  values: number[],
  formatter: (n: number) => string = (n) => n.toLocaleString('el-GR'),
): string {
  const pcts = computePercentiles(values, [25, 50, 75]);
  if (Object.keys(pcts).length === 0) return '';
  const avg = values.filter(v => v > 0);
  const mean = avg.length > 0 ? avg.reduce((a, b) => a + b, 0) / avg.length : 0;
  return `Avg: ${formatter(Math.round(mean))} | Median: ${formatter(Math.round(pcts[50]))} | P75: ${formatter(Math.round(pcts[75]))}`;
}
