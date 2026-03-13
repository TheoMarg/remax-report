import { useState, useMemo } from 'react';
import {
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Legend,
  ResponsiveContainer, Tooltip, ScatterChart, Scatter, XAxis, YAxis,
  CartesianGrid, ZAxis,
} from 'recharts';
import type { Period } from '../lib/types';
import { useMetrics } from '../hooks/useMetrics';
import { useAgents } from '../hooks/useAgents';
import { usePortfolioQuality } from '../hooks/usePortfolioQuality';
import { useKpiWeights } from '../hooks/useKpiWeights';
import { usePqsWeights } from '../hooks/usePqsWeights';
import { useWeightedScores } from '../hooks/useWeightedScores';
import { usePortfolioScores, type PqsResult } from '../hooks/usePortfolioScores';
import { useMarketability } from '../hooks/useMarketability';
import { EntityLink } from '../components/shared/EntityLink';
import type { MarketBenchmark, MarketPqsResult } from '../lib/marketability';

type OfficeFilter = 'all' | 'larissa' | 'katerini';

const DIMENSION_LABELS: Record<string, string> = {
  freshness: 'Freshness',
  exclusive_ratio: 'Exclusives',
  activity_level: 'Activity',
  pricing_accuracy: 'Pricing',
  pipeline_depth: 'Pipeline',
  demand_score: 'Demand',
};

const DIMENSION_KEYS = Object.keys(DIMENSION_LABELS);

const RADAR_COLORS = ['#1B5299', '#168F80', '#6B5CA5', '#C9961A', '#D4722A'];

interface Props {
  period: Period;
}

type PqsMode = 'standard' | 'market' | 'directed';

export function PortfolioQualityPage({ period }: Props) {
  const [officeFilter, setOfficeFilter] = useState<OfficeFilter>('all');
  const [pqsMode, setPqsMode] = useState<PqsMode>('standard');

  const { data: allMetrics = [] } = useMetrics(period);
  const { data: agents = [] } = useAgents();
  const { data: qualityData = [] } = usePortfolioQuality();
  const { data: kpiWeights = [] } = useKpiWeights();
  const { data: pqsWeights = [] } = usePqsWeights();
  const { marketAdjusted, officeDirected, benchmarks, isReady: marketReady } = useMarketability();

  // Build start dates for rookie detection
  const startDates = useMemo(() => {
    const map: Record<number, string | null> = {};
    for (const a of agents) map[a.agent_id] = a.start_date;
    return map;
  }, [agents]);

  const allWps = useWeightedScores(allMetrics, kpiWeights, startDates);
  const allPqs = usePortfolioScores(qualityData, pqsWeights);

  // Apply office filter
  const pqsResults = officeFilter === 'all'
    ? allPqs
    : allPqs.filter(p => p.office === officeFilter);

  // Radar: top 5 PQS agents
  const top5Pqs = pqsResults.slice(0, 5);
  const radarData = useMemo(() => {
    return DIMENSION_KEYS.map(key => {
      const point: Record<string, string | number> = { dimension: DIMENSION_LABELS[key] };
      for (const p of top5Pqs) {
        const name = p.canonical_name?.split(' ')[0] || `#${p.agent_id}`;
        point[name] = Math.round((p.dimensions[key] ?? 0) * 10) / 10;
      }
      return point;
    });
  }, [top5Pqs]);

  // PQS vs WPS scatter
  const scatterData = useMemo(() => {
    const wpsMap = new Map(allWps.map(w => [w.agent_id, w]));
    return allPqs
      .filter(p => wpsMap.has(p.agent_id))
      .map(p => ({
        name: p.canonical_name || `Agent ${p.agent_id}`,
        wps: wpsMap.get(p.agent_id)!.wps,
        pqs: p.pqs,
        agent_id: p.agent_id,
      }));
  }, [allWps, allPqs]);

  // Summary stats
  const avgPqs = pqsResults.length > 0
    ? Math.round(pqsResults.reduce((s, p) => s + p.pqs, 0) / pqsResults.length * 10) / 10
    : 0;
  const topPqs = pqsResults[0]?.pqs ?? 0;

  return (
    <div className="max-w-[1600px] mx-auto px-6 py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-semibold text-text-primary">
          Portfolio Quality — PQS (Δείκτης Ποιότητας)
          <span className="text-sm font-normal text-text-muted ml-3">{period.label}</span>
        </h2>
        <div className="flex items-center gap-3">
          {/* PQS Mode toggle */}
          {marketReady && (
            <div className="flex gap-0.5 bg-surface-light rounded-lg p-0.5">
              {([
                ['standard', 'Standard'],
                ['market', 'Market-Adj.'],
                ['directed', 'Office-Dir.'],
              ] as [PqsMode, string][]).map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => setPqsMode(key)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                    pqsMode === key
                      ? 'bg-surface-card text-brand-teal shadow-sm'
                      : 'text-text-muted hover:text-text-primary'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          )}
          {/* Office filter */}
          <div className="flex gap-1 bg-surface-light rounded-lg p-0.5">
            {([['all', 'All'], ['larissa', 'Larissa'], ['katerini', 'Katerini']] as [OfficeFilter, string][]).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setOfficeFilter(key)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                  officeFilter === key
                    ? 'bg-surface-card text-brand-blue shadow-sm'
                    : 'text-text-muted hover:text-text-primary'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-surface-card rounded-xl border border-border-default p-4">
          <div className="text-[9px] font-semibold uppercase tracking-wider text-text-muted">Agents Scored</div>
          <div className="text-2xl font-bold text-text-primary mt-1">{pqsResults.length}</div>
        </div>
        <div className="bg-surface-card rounded-xl border border-border-default p-4">
          <div className="text-[9px] font-semibold uppercase tracking-wider text-text-muted">Avg PQS</div>
          <div className="text-2xl font-bold text-brand-teal mt-1">{avgPqs.toFixed(1)}</div>
        </div>
        <div className="bg-surface-card rounded-xl border border-border-default p-4">
          <div className="text-[9px] font-semibold uppercase tracking-wider text-text-muted">Top PQS</div>
          <div className="text-2xl font-bold text-brand-green mt-1">{topPqs.toFixed(1)}</div>
        </div>
      </div>

      {/* Section 1: PQS Leaderboard */}
      <div className="bg-surface-card rounded-xl border border-border-default p-5">
        <h3 className="text-sm font-semibold text-text-primary mb-4">
          PQS Leaderboard
        </h3>
        <PqsLeaderboard results={pqsResults} />
      </div>

      {/* Section 2: Quality Radar Chart */}
      {top5Pqs.length >= 3 && (
        <div className="bg-surface-card rounded-xl border border-border-default p-5">
          <h3 className="text-sm font-semibold text-text-primary mb-3">
            Top 5 — Quality Radar
          </h3>
          <ResponsiveContainer width="100%" height={360}>
            <RadarChart data={radarData}>
              <PolarGrid stroke="var(--color-border-subtle)" />
              <PolarAngleAxis
                dataKey="dimension"
                tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }}
              />
              <PolarRadiusAxis
                tick={{ fontSize: 9 }}
                domain={[0, 100]}
                tickCount={5}
              />
              {top5Pqs.map((p, i) => {
                const name = p.canonical_name?.split(' ')[0] || `#${p.agent_id}`;
                return (
                  <Radar
                    key={p.agent_id}
                    name={name}
                    dataKey={name}
                    stroke={RADAR_COLORS[i]}
                    fill={RADAR_COLORS[i]}
                    fillOpacity={0.1}
                  />
                );
              })}
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Tooltip
                contentStyle={{
                  background: 'var(--color-surface-card)',
                  border: '1px solid var(--color-border-default)',
                  borderRadius: '8px',
                  fontSize: '12px',
                }}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Section 3: PQS vs WPS Scatter */}
      {scatterData.length >= 3 && (
        <div className="bg-surface-card rounded-xl border border-border-default p-5">
          <h3 className="text-sm font-semibold text-text-primary mb-3">
            PQS vs WPS
          </h3>
          <p className="text-xs text-text-muted mb-3">
            Each dot is an agent. Ideal position: top-right (high quality + high performance).
          </p>
          <ResponsiveContainer width="100%" height={320}>
            <ScatterChart margin={{ top: 10, right: 20, bottom: 20, left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-subtle)" />
              <XAxis
                type="number"
                dataKey="wps"
                name="WPS"
                tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }}
                label={{ value: 'WPS (Performance)', position: 'bottom', fontSize: 11, fill: 'var(--color-text-muted)' }}
              />
              <YAxis
                type="number"
                dataKey="pqs"
                name="PQS"
                tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }}
                label={{ value: 'PQS (Quality)', angle: -90, position: 'insideLeft', fontSize: 11, fill: 'var(--color-text-muted)' }}
              />
              <ZAxis range={[50, 50]} />
              <Tooltip
                contentStyle={{
                  background: 'var(--color-surface-card)',
                  border: '1px solid var(--color-border-default)',
                  borderRadius: '8px',
                  fontSize: '12px',
                }}
                formatter={(value) => [value != null ? Number(value).toFixed(1) : '—', '']}
                labelFormatter={(_, payload) => {
                  const item = payload?.[0]?.payload;
                  return item?.name ?? '';
                }}
              />
              <Scatter data={scatterData} fill="#168F80" />
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Section 4: Quality Heatmap */}
      <div className="bg-surface-card rounded-xl border border-border-default p-5">
        <h3 className="text-sm font-semibold text-text-primary mb-4">
          Quality Heatmap
        </h3>
        <QualityHeatmap results={pqsResults} />
      </div>

      {/* Section 5: Marketability Heatmap */}
      {marketReady && Object.keys(benchmarks).length > 0 && (
        <div className="bg-surface-card rounded-xl border border-border-default p-5">
          <h3 className="text-sm font-semibold text-text-primary mb-1">
            Marketability Heatmap (Εμπορευσιμότητα ανά Κατηγορία)
          </h3>
          <p className="text-xs text-text-muted mb-4">
            Market benchmarks per subcategory — DOM, Conversion %, Price Reductions, Sample Size
          </p>
          <MarketabilityHeatmap benchmarks={benchmarks} />
        </div>
      )}

      {/* Section 6: Market-Adjusted or Office-Directed Leaderboard */}
      {pqsMode !== 'standard' && (
        <div className="bg-surface-card rounded-xl border border-border-default p-5">
          <h3 className="text-sm font-semibold text-text-primary mb-4">
            {pqsMode === 'market'
              ? 'Market-Adjusted PQS (Αντικειμενικό)'
              : 'Office-Directed PQS (Στρατηγικό)'}
          </h3>
          <MarketPqsLeaderboard
            results={
              (pqsMode === 'market' ? marketAdjusted : officeDirected)
                .filter(r => officeFilter === 'all' || r.office === officeFilter)
            }
            mode={pqsMode}
          />
        </div>
      )}
    </div>
  );
}

/* ── PQS Leaderboard ── */

function PqsLeaderboard({ results }: { results: PqsResult[] }) {
  if (results.length === 0) {
    return <p className="text-xs text-text-muted italic">No data available</p>;
  }

  return (
    <div className="space-y-1.5">
      {results.map((p, i) => (
        <div
          key={p.agent_id}
          className="flex items-center gap-3 py-1.5 group hover:bg-surface-light rounded-lg px-2 -mx-2 transition-colors"
        >
          <span className="w-7 text-sm font-bold text-text-muted text-right">
            #{i + 1}
          </span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <EntityLink
                type="agent"
                id={p.agent_id}
                label={p.canonical_name || `Agent ${p.agent_id}`}
                className="text-sm font-medium"
              />
              {p.office && (
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-surface-light text-text-muted">
                  {p.office === 'larissa' ? 'LAR' : 'KAT'}
                </span>
              )}
            </div>
            {/* PQS bar */}
            <div className="h-3 rounded-full overflow-hidden bg-surface-light">
              <div
                className="h-full rounded-full bg-brand-teal transition-all duration-500"
                style={{ width: `${Math.min(p.pqs, 100)}%` }}
              />
            </div>
            {/* Dimension mini tags */}
            <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1">
              {DIMENSION_KEYS.map(key => {
                const val = p.dimensions[key] ?? 0;
                const color = val >= 80
                  ? 'text-brand-green'
                  : val >= 50
                    ? 'text-brand-teal'
                    : 'text-brand-red';
                return (
                  <span key={key} className="text-[8px] text-text-muted">
                    {DIMENSION_LABELS[key]}:{' '}
                    <span className={`font-semibold ${color}`}>{val.toFixed(0)}</span>
                  </span>
                );
              })}
            </div>
          </div>
          <span className="text-lg font-bold text-brand-teal tabular-nums w-16 text-right">
            {p.pqs.toFixed(1)}
          </span>
        </div>
      ))}
    </div>
  );
}

/* ── Quality Heatmap ── */

function heatColor(val: number): string {
  if (val >= 80) return 'bg-emerald-500/20 text-brand-green';
  if (val >= 50) return 'bg-yellow-500/20 text-yellow-600';
  return 'bg-red-500/20 text-brand-red';
}

function QualityHeatmap({ results }: { results: PqsResult[] }) {
  if (results.length === 0) {
    return <p className="text-xs text-text-muted italic">No data available</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-border-subtle">
            <th className="text-left py-2 px-2 text-text-muted font-medium">Agent</th>
            <th className="text-left py-2 px-2 text-text-muted font-medium">Office</th>
            {DIMENSION_KEYS.map(key => (
              <th
                key={key}
                className="text-center py-2 px-2 text-text-muted font-medium whitespace-nowrap"
              >
                {DIMENSION_LABELS[key]}
              </th>
            ))}
            <th className="text-center py-2 px-2 text-text-muted font-medium">PQS</th>
          </tr>
        </thead>
        <tbody>
          {results.map(p => (
            <tr
              key={p.agent_id}
              className="border-b border-border-subtle hover:bg-surface-light transition-colors"
            >
              <td className="py-2 px-2">
                <EntityLink
                  type="agent"
                  id={p.agent_id}
                  label={p.canonical_name || `Agent ${p.agent_id}`}
                  className="text-xs font-medium"
                />
              </td>
              <td className="py-2 px-2 text-text-muted">
                {p.office === 'larissa' ? 'LAR' : p.office === 'katerini' ? 'KAT' : p.office}
              </td>
              {DIMENSION_KEYS.map(key => {
                const val = p.dimensions[key] ?? 0;
                return (
                  <td key={key} className="py-2 px-2 text-center">
                    <span
                      className={`inline-block px-2 py-0.5 rounded font-semibold tabular-nums ${heatColor(val)}`}
                    >
                      {val.toFixed(0)}
                    </span>
                  </td>
                );
              })}
              <td className="py-2 px-2 text-center">
                <span className="font-bold text-brand-teal tabular-nums">
                  {p.pqs.toFixed(1)}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ── Marketability Heatmap ── */

function marketHeatColor(val: number, type: 'dom' | 'conv' | 'red'): string {
  if (type === 'dom') {
    if (val <= 30) return 'bg-emerald-500/20 text-brand-green';
    if (val <= 90) return 'bg-yellow-500/20 text-yellow-600';
    return 'bg-red-500/20 text-brand-red';
  }
  if (type === 'conv') {
    if (val >= 20) return 'bg-emerald-500/20 text-brand-green';
    if (val >= 10) return 'bg-yellow-500/20 text-yellow-600';
    return 'bg-red-500/20 text-brand-red';
  }
  // reductions: lower is better
  if (val <= 0.5) return 'bg-emerald-500/20 text-brand-green';
  if (val <= 1.5) return 'bg-yellow-500/20 text-yellow-600';
  return 'bg-red-500/20 text-brand-red';
}

function MarketabilityHeatmap({ benchmarks }: { benchmarks: Record<string, MarketBenchmark> }) {
  const sorted = Object.values(benchmarks).sort((a, b) => b.sample_count - a.sample_count);

  if (sorted.length === 0) {
    return <p className="text-xs text-text-muted italic">No benchmarks available</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-border-subtle">
            <th className="text-left py-2 px-2 text-text-muted font-medium">Subcategory</th>
            <th className="text-center py-2 px-2 text-text-muted font-medium">Avg DOM</th>
            <th className="text-center py-2 px-2 text-text-muted font-medium">Conv %</th>
            <th className="text-center py-2 px-2 text-text-muted font-medium">Avg Reductions</th>
            <th className="text-center py-2 px-2 text-text-muted font-medium">Sample</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map(b => (
            <tr key={b.subcategory} className="border-b border-border-subtle hover:bg-surface-light">
              <td className="py-2 px-2 font-medium text-text-primary">{b.subcategory}</td>
              <td className="py-2 px-2 text-center">
                <span className={`inline-block px-2 py-0.5 rounded font-semibold tabular-nums ${marketHeatColor(b.avg_dom, 'dom')}`}>
                  {b.avg_dom}d
                </span>
              </td>
              <td className="py-2 px-2 text-center">
                <span className={`inline-block px-2 py-0.5 rounded font-semibold tabular-nums ${marketHeatColor(b.conversion_rate, 'conv')}`}>
                  {b.conversion_rate}%
                </span>
              </td>
              <td className="py-2 px-2 text-center">
                <span className={`inline-block px-2 py-0.5 rounded font-semibold tabular-nums ${marketHeatColor(b.avg_price_reductions, 'red')}`}>
                  {b.avg_price_reductions}
                </span>
              </td>
              <td className="py-2 px-2 text-center tabular-nums text-text-muted">{b.sample_count}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ── Market PQS Leaderboard ── */

function MarketPqsLeaderboard({ results, mode }: { results: MarketPqsResult[]; mode: PqsMode }) {
  if (results.length === 0) {
    return <p className="text-xs text-text-muted italic">No data available — subcategory weights may not be configured</p>;
  }

  return (
    <div className="space-y-1.5">
      {results.map((r, i) => {
        const scoreColor = mode === 'market'
          ? (r.score >= 110 ? 'text-brand-green' : r.score >= 90 ? 'text-brand-teal' : 'text-brand-red')
          : 'text-brand-teal';

        return (
          <div
            key={r.agent_id}
            className="flex items-center gap-3 py-1.5 group hover:bg-surface-light rounded-lg px-2 -mx-2 transition-colors"
          >
            <span className="w-7 text-sm font-bold text-text-muted text-right">#{i + 1}</span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <EntityLink
                  type="agent"
                  id={r.agent_id}
                  label={r.canonical_name || `Agent ${r.agent_id}`}
                  className="text-sm font-medium"
                />
                {r.office && (
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-surface-light text-text-muted">
                    {r.office === 'larissa' ? 'LAR' : 'KAT'}
                  </span>
                )}
              </div>
              <div className="h-3 rounded-full overflow-hidden bg-surface-light">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${Math.min(mode === 'market' ? r.score / 2 : r.score, 100)}%`,
                    backgroundColor: mode === 'market'
                      ? (r.score >= 110 ? '#1D7A4E' : r.score >= 90 ? '#168F80' : '#DC3545')
                      : '#168F80',
                  }}
                />
              </div>
            </div>
            <span className={`text-lg font-bold tabular-nums w-16 text-right ${scoreColor}`}>
              {r.score.toFixed(1)}
            </span>
          </div>
        );
      })}
    </div>
  );
}
