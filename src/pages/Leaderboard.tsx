import { useState, useMemo } from 'react';
import {
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Legend,
  ScatterChart, Scatter, ZAxis,
} from 'recharts';
import type { Period } from '../lib/types';
import { useMetrics } from '../hooks/useMetrics';
import { useAgents } from '../hooks/useAgents';
import { usePortfolioQuality } from '../hooks/usePortfolioQuality';
import { useKpiWeights } from '../hooks/useKpiWeights';
import { usePqsWeights } from '../hooks/usePqsWeights';
import { useWeightedScores, type WpsResult } from '../hooks/useWeightedScores';
import { usePortfolioScores, type PqsResult } from '../hooks/usePortfolioScores';
import { EntityLink } from '../components/shared/EntityLink';
import { StatusBadge } from '../components/shared/StatusBadge';

type OfficeFilter = 'all' | 'larissa' | 'katerini';

interface Props {
  period: Period;
}

export function Leaderboard({ period }: Props) {
  const [officeFilter, setOfficeFilter] = useState<OfficeFilter>('all');
  const { data: allMetrics = [] } = useMetrics(period);
  const { data: agents = [] } = useAgents();
  const { data: qualityData = [] } = usePortfolioQuality();
  const { data: kpiWeights = [] } = useKpiWeights();
  const { data: pqsWeights = [] } = usePqsWeights();

  // Build start dates for rookie detection
  const startDates = useMemo(() => {
    const map: Record<number, string | null> = {};
    for (const a of agents) map[a.agent_id] = a.start_date;
    return map;
  }, [agents]);

  const allWps = useWeightedScores(allMetrics, kpiWeights, startDates);
  const allPqs = usePortfolioScores(qualityData, pqsWeights);

  // Apply office filter
  const wpsResults = officeFilter === 'all'
    ? allWps
    : allWps.filter(w => w.office === officeFilter);
  const pqsResults = officeFilter === 'all'
    ? allPqs
    : allPqs.filter(p => p.office === officeFilter);

  // Radar: top 5 WPS agents
  const top5Wps = wpsResults.slice(0, 5);
  const radarData = useMemo(() => {
    const metricKeys = ['registrations', 'exclusives', 'showings', 'offers', 'closings'];
    return metricKeys.map(key => {
      const point: Record<string, string | number> = { metric: key };
      for (const w of top5Wps) {
        const name = w.canonical_name?.split(' ')[0] || `#${w.agent_id}`;
        point[name] = w.breakdown[key] ?? 0;
      }
      return point;
    });
  }, [top5Wps]);

  // WPS vs PQS scatter
  const scatterData = useMemo(() => {
    const pqsMap = new Map(allPqs.map(p => [p.agent_id, p]));
    return allWps
      .filter(w => pqsMap.has(w.agent_id))
      .map(w => ({
        name: w.canonical_name || `Agent ${w.agent_id}`,
        wps: w.wps,
        pqs: pqsMap.get(w.agent_id)!.pqs,
        agent_id: w.agent_id,
      }));
  }, [allWps, allPqs]);

  // Office averages
  const officeAvgs = useMemo(() => {
    const offices = ['larissa', 'katerini'] as const;
    return offices.map(o => {
      const oWps = allWps.filter(w => w.office === o);
      const oPqs = allPqs.filter(p => p.office === o);
      return {
        office: o,
        label: o === 'larissa' ? 'Λάρισα' : 'Κατερίνη',
        avgWps: oWps.length > 0 ? Math.round(oWps.reduce((s, w) => s + w.wps, 0) / oWps.length * 10) / 10 : 0,
        avgPqs: oPqs.length > 0 ? Math.round(oPqs.reduce((s, p) => s + p.pqs, 0) / oPqs.length * 10) / 10 : 0,
        agents: oWps.length,
      };
    });
  }, [allWps, allPqs]);

  const RADAR_COLORS = ['#1B5299', '#168F80', '#6B5CA5', '#C9961A', '#D4722A'];

  return (
    <div className="max-w-[1600px] mx-auto px-6 py-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-text-primary">
          Leaderboard (Κατάταξη)
          <span className="text-sm font-normal text-text-muted ml-3">{period.label}</span>
        </h2>
        {/* Office filter */}
        <div className="flex gap-1 bg-surface-light rounded-lg p-0.5">
          {([['all', 'Όλα'], ['larissa', 'Λάρισα'], ['katerini', 'Κατερίνη']] as [OfficeFilter, string][]).map(([key, label]) => (
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

      {/* Office summary */}
      <div className="grid grid-cols-2 gap-4">
        {officeAvgs.map(o => (
          <div key={o.office} className="bg-surface-card rounded-xl border border-border-default p-4 flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold text-text-primary">{o.label}</div>
              <div className="text-xs text-text-muted">{o.agents} agents</div>
            </div>
            <div className="flex items-center gap-6">
              <div className="text-center">
                <div className="text-[9px] font-semibold uppercase tracking-wider text-text-muted">Avg WPS</div>
                <div className="text-lg font-bold text-brand-blue">{o.avgWps}</div>
              </div>
              <div className="text-center">
                <div className="text-[9px] font-semibold uppercase tracking-wider text-text-muted">Avg PQS</div>
                <div className="text-lg font-bold text-brand-teal">{o.avgPqs}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Section A: WPS Leaderboard */}
      <div className="bg-surface-card rounded-xl border border-border-default p-5">
        <h3 className="text-sm font-semibold text-text-primary mb-4">
          Performance Leaderboard (WPS)
        </h3>
        <WpsTable results={wpsResults} />
      </div>

      {/* Radar chart: top 5 */}
      {top5Wps.length >= 3 && (
        <div className="bg-surface-card rounded-xl border border-border-default p-5">
          <h3 className="text-sm font-semibold text-text-primary mb-3">Top 5 — Metric Profile</h3>
          <ResponsiveContainer width="100%" height={300}>
            <RadarChart data={radarData}>
              <PolarGrid stroke="var(--color-border-subtle)" />
              <PolarAngleAxis dataKey="metric" tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }} />
              <PolarRadiusAxis tick={{ fontSize: 9 }} />
              {top5Wps.map((w, i) => {
                const name = w.canonical_name?.split(' ')[0] || `#${w.agent_id}`;
                return (
                  <Radar
                    key={w.agent_id}
                    name={name}
                    dataKey={name}
                    stroke={RADAR_COLORS[i]}
                    fill={RADAR_COLORS[i]}
                    fillOpacity={0.1}
                  />
                );
              })}
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Tooltip contentStyle={{ background: 'var(--color-surface-card)', border: '1px solid var(--color-border-default)', borderRadius: '8px', fontSize: '12px' }} />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Section B: PQS Leaderboard */}
      <div className="bg-surface-card rounded-xl border border-border-default p-5">
        <h3 className="text-sm font-semibold text-text-primary mb-4">
          Portfolio Quality Leaderboard (PQS)
        </h3>
        <PqsTable results={pqsResults} />
      </div>

      {/* WPS vs PQS Scatter */}
      {scatterData.length >= 3 && (
        <div className="bg-surface-card rounded-xl border border-border-default p-5">
          <h3 className="text-sm font-semibold text-text-primary mb-3">WPS vs PQS</h3>
          <ResponsiveContainer width="100%" height={300}>
            <ScatterChart margin={{ top: 10, right: 20, bottom: 20, left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-subtle)" />
              <XAxis type="number" dataKey="wps" name="WPS" tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }} label={{ value: 'WPS', position: 'bottom', fontSize: 11, fill: 'var(--color-text-muted)' }} />
              <YAxis type="number" dataKey="pqs" name="PQS" tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }} label={{ value: 'PQS', angle: -90, position: 'insideLeft', fontSize: 11, fill: 'var(--color-text-muted)' }} />
              <ZAxis range={[40, 40]} />
              <Tooltip
                contentStyle={{ background: 'var(--color-surface-card)', border: '1px solid var(--color-border-default)', borderRadius: '8px', fontSize: '12px' }}
                formatter={(value, name) => [value != null ? Number(value).toFixed(1) : '—', String(name)]}
                labelFormatter={(_, payload) => {
                  const item = payload?.[0]?.payload;
                  return item?.name ?? '';
                }}
              />
              <Scatter data={scatterData} fill="#1B5299" />
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

function WpsTable({ results }: { results: WpsResult[] }) {
  if (results.length === 0) return <p className="text-xs text-text-muted italic">Δεν υπάρχουν δεδομένα</p>;
  const maxWps = results[0]?.wps || 1;

  return (
    <div className="space-y-1.5">
      {results.map((w, i) => (
        <div key={w.agent_id} className="flex items-center gap-3 py-1.5 group hover:bg-surface-light rounded-lg px-2 -mx-2 transition-colors">
          <span className="w-7 text-sm font-bold text-text-muted text-right">#{i + 1}</span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <EntityLink type="agent" id={w.agent_id} label={w.canonical_name || `Agent ${w.agent_id}`} className="text-sm font-medium" />
              {w.is_rookie && <StatusBadge status="rookie" />}
              {w.office && (
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-surface-light text-text-muted">{w.office === 'larissa' ? 'Λάρ' : 'Κατ'}</span>
              )}
            </div>
            {/* Stacked bar */}
            <div className="h-3 rounded-full overflow-hidden flex bg-surface-light">
              {Object.entries(w.breakdown).map(([key, val]) => {
                const pct = maxWps > 0 ? (val / maxWps) * 100 : 0;
                const colors: Record<string, string> = {
                  registrations: '#1B5299',
                  exclusives: '#168F80',
                  showings: '#6B5CA5',
                  offers: '#C9961A',
                  closings: '#D4722A',
                };
                return (
                  <div
                    key={key}
                    className="h-full transition-all duration-500"
                    style={{ width: `${pct}%`, backgroundColor: colors[key] || '#999' }}
                    title={`${key}: ${val.toFixed(1)}`}
                  />
                );
              })}
            </div>
          </div>
          <span className="text-lg font-bold text-brand-blue tabular-nums w-16 text-right">{w.wps.toFixed(1)}</span>
        </div>
      ))}
    </div>
  );
}

function PqsTable({ results }: { results: PqsResult[] }) {
  if (results.length === 0) return <p className="text-xs text-text-muted italic">Δεν υπάρχουν δεδομένα</p>;

  return (
    <div className="space-y-2">
      {results.map((p, i) => (
        <div key={p.agent_id} className="flex items-center gap-3 py-1.5 group hover:bg-surface-light rounded-lg px-2 -mx-2 transition-colors">
          <span className="w-7 text-sm font-bold text-text-muted text-right">#{i + 1}</span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <EntityLink type="agent" id={p.agent_id} label={p.canonical_name || `Agent ${p.agent_id}`} className="text-sm font-medium" />
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-surface-light text-text-muted">{p.office === 'larissa' ? 'Λάρ' : 'Κατ'}</span>
            </div>
            {/* PQS bar */}
            <div className="h-3 rounded-full overflow-hidden bg-surface-light">
              <div className="h-full rounded-full bg-brand-teal transition-all duration-500" style={{ width: `${Math.min(p.pqs, 100)}%` }} />
            </div>
            {/* Dimension mini tags */}
            <div className="flex gap-2 mt-1">
              {Object.entries(p.dimensions).map(([key, val]) => (
                <span key={key} className="text-[8px] text-text-muted">
                  {key.replace('_', ' ')}: <span className="font-semibold">{val.toFixed(0)}</span>
                </span>
              ))}
            </div>
          </div>
          <span className="text-lg font-bold text-brand-teal tabular-nums w-16 text-right">{p.pqs.toFixed(1)}</span>
        </div>
      ))}
    </div>
  );
}
