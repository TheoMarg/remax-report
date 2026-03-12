import { useState, useMemo } from 'react';
import type { PropertyJourney } from '../../lib/types';
import type { StageName } from '../../hooks/useStageFlow';
import { EntityLink } from '../shared/EntityLink';

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
  exclusive: 'published',
  published: 'showing',
  showing: 'offer',
  offer: 'closing',
};

function fmt(n: number): string {
  return n.toLocaleString('el-GR');
}

function fmtEur(n: number | null): string {
  if (n == null) return '—';
  return `€${n.toLocaleString('el-GR', { maximumFractionDigits: 0 })}`;
}

function safePct(num: number, den: number): string {
  if (den === 0) return '—';
  return `${Math.round((num / den) * 100)}%`;
}

function safeAvg(values: (number | null)[]): number | null {
  const valid = values.filter((v): v is number => v != null);
  return valid.length > 0 ? Math.round(valid.reduce((a, b) => a + b, 0) / valid.length) : null;
}

interface RowData {
  entityType: 'company' | 'office' | 'agent';
  entityId: string | number;
  label: string;
  count: number;
  nextCount: number;
  convPct: string;
  avgPrice: number | null;
  avgDays: number | null;
  gci: number | null;
  children?: RowData[];
}

function buildRows(
  journeys: PropertyJourney[],
  stage: StageName,
): RowData[] {
  const flag = STAGE_FLAG[stage];
  const nextStage = NEXT_STAGE[stage];
  const nextFlag = nextStage ? STAGE_FLAG[nextStage] : null;
  const isClosing = stage === 'closing';

  const stageJ = journeys.filter(j => j[flag]);

  // Helper to build a row
  const makeRow = (
    entityType: 'company' | 'office' | 'agent',
    entityId: string | number,
    label: string,
    subset: PropertyJourney[],
    children?: RowData[],
  ): RowData => {
    const count = subset.length;
    const nextCount = nextFlag ? subset.filter(j => j[nextFlag]).length : 0;
    const convPct = count > 0 && nextFlag ? safePct(nextCount, count) : '—';
    const avgPrice = safeAvg(subset.map(j => j.listing_price));
    const avgDays = isClosing
      ? safeAvg(subset.map(j => j.days_total_journey))
      : stage === 'exclusive'
        ? safeAvg(subset.map(j => j.days_reg_to_excl))
        : stage === 'showing'
          ? safeAvg(subset.map(j => j.days_excl_to_offer))
          : null;
    const gci = isClosing ? subset.reduce((s, j) => s + (j.gci || 0), 0) : null;

    return { entityType, entityId, label, count, nextCount, convPct, avgPrice, avgDays, gci, children };
  };

  // Group by office
  const officeGroups: Record<string, PropertyJourney[]> = {};
  for (const j of stageJ) {
    const office = j.office || 'unknown';
    if (!officeGroups[office]) officeGroups[office] = [];
    officeGroups[office].push(j);
  }

  const OFFICE_LABELS: Record<string, string> = { larissa: 'Λάρισα', katerini: 'Κατερίνη' };

  const officeRows = Object.entries(officeGroups)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([office, oj]) => {
      // Group by agent within office
      const agentGroups: Record<number, PropertyJourney[]> = {};
      for (const j of oj) {
        if (!agentGroups[j.agent_id]) agentGroups[j.agent_id] = [];
        agentGroups[j.agent_id].push(j);
      }

      const agentRows = Object.entries(agentGroups)
        .map(([aid, aj]) => makeRow('agent', Number(aid), aj[0].canonical_name || `Agent ${aid}`, aj))
        .sort((a, b) => b.count - a.count);

      return makeRow('office', office, OFFICE_LABELS[office] || office, oj, agentRows);
    });

  return officeRows;
}

interface Props {
  journeys: PropertyJourney[];
  stage: StageName;
}

export function PipelineBreakdownTable({ journeys, stage }: Props) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const rows = useMemo(() => buildRows(journeys, stage), [journeys, stage]);
  const isClosing = stage === 'closing';
  const nextStage = NEXT_STAGE[stage];

  const toggle = (key: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  // Company total row
  const flag = STAGE_FLAG[stage];
  const nextFlag = nextStage ? STAGE_FLAG[nextStage] : null;
  const allStage = journeys.filter(j => j[flag]);
  const allNext = nextFlag ? allStage.filter(j => j[nextFlag]).length : 0;
  const companyGci = isClosing ? allStage.reduce((s, j) => s + (j.gci || 0), 0) : null;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="text-left text-text-muted border-b border-border-default">
            <th className="pb-2 pr-3 font-medium">Entity</th>
            <th className="pb-2 pr-3 font-medium text-right">Count</th>
            {nextStage && <th className="pb-2 pr-3 font-medium text-right">→ Next</th>}
            {nextStage && <th className="pb-2 pr-3 font-medium text-right">Conv%</th>}
            <th className="pb-2 pr-3 font-medium text-right">Μ.Ο. Τιμή</th>
            <th className="pb-2 pr-3 font-medium text-right">Μ.Ο. Ημέρες</th>
            {isClosing && <th className="pb-2 font-medium text-right">GCI</th>}
          </tr>
        </thead>
        <tbody>
          {/* Company total */}
          <tr className="border-b-2 border-border-default bg-surface-light font-semibold">
            <td className="py-2 pr-3 text-text-primary">Εταιρεία</td>
            <td className="py-2 pr-3 text-right tabular-nums">{fmt(allStage.length)}</td>
            {nextStage && <td className="py-2 pr-3 text-right tabular-nums">{fmt(allNext)}</td>}
            {nextStage && <td className="py-2 pr-3 text-right tabular-nums">{safePct(allNext, allStage.length)}</td>}
            <td className="py-2 pr-3 text-right tabular-nums">{fmtEur(safeAvg(allStage.map(j => j.listing_price)))}</td>
            <td className="py-2 pr-3 text-right tabular-nums">
              {isClosing
                ? (safeAvg(allStage.map(j => j.days_total_journey)) ?? '—') + (safeAvg(allStage.map(j => j.days_total_journey)) != null ? 'd' : '')
                : '—'}
            </td>
            {isClosing && <td className="py-2 text-right tabular-nums font-bold text-brand-gold">{fmtEur(companyGci)}</td>}
          </tr>

          {/* Office rows */}
          {rows.map(office => {
            const isOpen = expanded.has(String(office.entityId));
            return (
              <OfficeRow
                key={String(office.entityId)}
                row={office}
                isOpen={isOpen}
                onToggle={() => toggle(String(office.entityId))}
                isClosing={isClosing}
                hasNext={!!nextStage}
              />
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function OfficeRow({ row, isOpen, onToggle, isClosing, hasNext }: {
  row: RowData; isOpen: boolean; onToggle: () => void; isClosing: boolean; hasNext: boolean;
}) {
  return (
    <>
      <tr className="border-b border-border-default cursor-pointer hover:bg-surface-light" onClick={onToggle}>
        <td className="py-2 pr-3 font-semibold text-text-primary">
          <span className="inline-flex items-center gap-1">
            <svg className={`w-3 h-3 transition-transform ${isOpen ? 'rotate-90' : ''}`} viewBox="0 0 12 12" fill="none">
              <path d="M4 2l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <EntityLink type="office" id={row.entityId} label={row.label} className="text-xs font-semibold" />
          </span>
        </td>
        <td className="py-2 pr-3 text-right tabular-nums font-semibold">{fmt(row.count)}</td>
        {hasNext && <td className="py-2 pr-3 text-right tabular-nums">{fmt(row.nextCount)}</td>}
        {hasNext && <td className="py-2 pr-3 text-right tabular-nums">{row.convPct}</td>}
        <td className="py-2 pr-3 text-right tabular-nums">{fmtEur(row.avgPrice)}</td>
        <td className="py-2 pr-3 text-right tabular-nums">{row.avgDays != null ? `${row.avgDays}d` : '—'}</td>
        {isClosing && <td className="py-2 text-right tabular-nums font-bold text-brand-gold">{fmtEur(row.gci)}</td>}
      </tr>
      {isOpen && row.children?.map(agent => (
        <tr key={agent.entityId} className="border-b border-border-subtle bg-surface/50 hover:bg-surface-light">
          <td className="py-1.5 pr-3 pl-7">
            <EntityLink type="agent" id={agent.entityId} label={agent.label} className="text-xs" />
          </td>
          <td className="py-1.5 pr-3 text-right tabular-nums">{fmt(agent.count)}</td>
          {hasNext && <td className="py-1.5 pr-3 text-right tabular-nums">{fmt(agent.nextCount)}</td>}
          {hasNext && <td className="py-1.5 pr-3 text-right tabular-nums">{agent.convPct}</td>}
          <td className="py-1.5 pr-3 text-right tabular-nums">{fmtEur(agent.avgPrice)}</td>
          <td className="py-1.5 pr-3 text-right tabular-nums">{agent.avgDays != null ? `${agent.avgDays}d` : '—'}</td>
          {isClosing && <td className="py-1.5 text-right tabular-nums text-brand-gold">{fmtEur(agent.gci)}</td>}
        </tr>
      ))}
    </>
  );
}
