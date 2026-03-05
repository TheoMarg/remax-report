import type { PropertyEvent, StageDuration } from '../../lib/types';
import { EVENT_TYPE_CONFIG, daysBetween, formatDateEL } from '../../lib/propertyMetrics';

interface Props {
  events: PropertyEvent[];
  stages: StageDuration[];
}

// Milestone events get big dots; routine events get small dots
const MILESTONE_TYPES = new Set(['registration', 'activation', 'exclusive', 'exclusive_end', 'published', 'deposit', 'closing', 'notarization', 'withdrawal']);

interface GroupedEvent {
  type: string;
  label: string;
  color: string;
  count: number;
  firstDate: string;
  lastDate: string;
  detail: string | null;
  amount: number | null;
  isMilestone: boolean;
}

/** Collapse consecutive same-type events (e.g. 8 showings) into one row */
function groupEvents(events: PropertyEvent[]): GroupedEvent[] {
  const groups: GroupedEvent[] = [];

  for (const ev of events) {
    const cfg = EVENT_TYPE_CONFIG[ev.event_type];
    const prev = groups[groups.length - 1];

    if (prev && prev.type === ev.event_type) {
      prev.count++;
      prev.lastDate = ev.event_date;
    } else {
      groups.push({
        type: ev.event_type,
        label: cfg?.label ?? ev.event_type,
        color: cfg?.color ?? '#8A94A0',
        count: 1,
        firstDate: ev.event_date,
        lastDate: ev.event_date,
        detail: ev.detail,
        amount: ev.amount,
        isMilestone: MILESTONE_TYPES.has(ev.event_type),
      });
    }
  }
  return groups;
}

export function PropertyTimeline({ events, stages }: Props) {
  if (events.length === 0) {
    return (
      <p className="text-xs text-[#8A94A0] italic py-2">
        Δεν υπάρχουν γεγονότα timeline
      </p>
    );
  }

  const groups = groupEvents(events);

  // Find the longest stage for bar scaling (exclude registration→notarization total)
  const stageSteps = stages.filter(s => !(s.from === 'registration' && s.to === 'notarization'));
  const maxStageDays = Math.max(...stageSteps.map(s => s.days), 1);

  return (
    <div className="bg-[#F7F6F3] rounded-lg p-4 space-y-4">
      {/* ── Vertical Timeline ── */}
      <div className="relative pl-5">
        {/* Vertical connecting line */}
        <div className="absolute left-[7px] top-2 bottom-2 w-[2px] bg-[#DDD8D0]" />

        {groups.map((g, i) => {
          const prevGroup = groups[i - 1];
          const gap = prevGroup ? daysBetween(prevGroup.lastDate, g.firstDate) : 0;

          return (
            <div key={`${g.type}-${g.firstDate}-${i}`}>
              {/* Day gap indicator */}
              {gap > 0 && (
                <div className="relative flex items-center h-6">
                  <div className="absolute left-[3px] w-[10px] flex items-center justify-center">
                    <span className="text-[9px] text-[#8A94A0] tabular-nums bg-[#F7F6F3] px-0.5 relative z-10">
                      {gap}ημ
                    </span>
                  </div>
                </div>
              )}
              {gap === 0 && i > 0 && <div className="h-1" />}

              {/* Event row */}
              <div className="relative flex items-start gap-3 py-0.5">
                {/* Dot */}
                <div className="absolute flex items-center justify-center" style={{ left: g.isMilestone ? '-1px' : '1px', top: '2px' }}>
                  <div
                    className="rounded-full shrink-0 relative z-10"
                    style={{
                      backgroundColor: g.color,
                      width: g.isMilestone ? '18px' : '12px',
                      height: g.isMilestone ? '18px' : '12px',
                      border: g.isMilestone ? '2px solid white' : 'none',
                      boxShadow: g.isMilestone ? `0 0 0 1px ${g.color}40` : 'none',
                    }}
                  />
                </div>

                {/* Content */}
                <div className="ml-5 flex-1 min-w-0">
                  <div className="flex items-baseline gap-2 flex-wrap">
                    <span className={`font-semibold ${g.isMilestone ? 'text-xs text-[#0C1E3C]' : 'text-[11px] text-[#3A4550]'}`}>
                      {g.label}
                      {g.count > 1 && (
                        <span className="ml-1 text-[10px] font-bold rounded-full px-1.5 py-0.5"
                          style={{ backgroundColor: `${g.color}15`, color: g.color }}>
                          x{g.count}
                        </span>
                      )}
                    </span>
                    <span className="text-[10px] text-[#8A94A0] tabular-nums">
                      {formatDateEL(g.firstDate)}
                      {g.count > 1 && g.firstDate !== g.lastDate && (
                        <> — {formatDateEL(g.lastDate)}</>
                      )}
                    </span>
                  </div>

                  {/* Price change detail */}
                  {g.type === 'price_change' && g.detail && (
                    <div className="text-[10px] text-[#3A4550] mt-0.5">
                      {g.detail}
                      {g.amount != null && (
                        <span className={`ml-1 font-semibold ${g.amount < 0 ? 'text-[#DC3545]' : 'text-[#1D7A4E]'}`}>
                          ({g.amount > 0 ? '+' : ''}€{g.amount.toLocaleString('el-GR')})
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Stage Duration Bars ── */}
      {stageSteps.length > 0 && (
        <div className="border-t border-[#DDD8D0] pt-3 space-y-1.5">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-[#8A94A0] mb-2">
            Διάρκεια Σταδίων
          </div>
          {stageSteps.map(s => {
            const pct = Math.max((s.days / maxStageDays) * 100, 4);
            const fromCfg = EVENT_TYPE_CONFIG[s.from];
            const color = fromCfg?.color ?? '#8A94A0';
            return (
              <div key={`${s.from}-${s.to}`} className="flex items-center gap-2">
                <div className="w-[120px] shrink-0 text-right">
                  <span className="text-[10px] text-[#3A4550]">
                    {s.fromLabel} → {s.toLabel}
                  </span>
                </div>
                <div className="flex-1 h-4 bg-white rounded overflow-hidden border border-[#DDD8D0]">
                  <div
                    className="h-full rounded transition-all duration-500 flex items-center justify-end pr-1"
                    style={{ width: `${pct}%`, backgroundColor: `${color}30`, borderRight: `3px solid ${color}` }}
                  >
                    {pct > 20 && (
                      <span className="text-[9px] font-bold tabular-nums" style={{ color }}>
                        {s.days}
                      </span>
                    )}
                  </div>
                </div>
                {pct <= 20 && (
                  <span className="text-[10px] font-bold tabular-nums shrink-0" style={{ color }}>
                    {s.days} ημ.
                  </span>
                )}
                {pct > 20 && (
                  <span className="text-[10px] text-[#8A94A0] shrink-0">ημ.</span>
                )}
              </div>
            );
          })}

          {/* Total registration → notarization */}
          {stages.some(s => s.from === 'registration' && s.to === 'notarization') && (() => {
            const total = stages.find(s => s.from === 'registration' && s.to === 'notarization')!;
            return (
              <div className="flex items-center gap-2 pt-1.5 mt-1 border-t border-[#DDD8D0]">
                <div className="w-[120px] shrink-0 text-right">
                  <span className="text-[10px] font-bold text-[#0C1E3C]">
                    Σύνολο
                  </span>
                </div>
                <div className="flex-1 h-5 bg-[#0C1E3C]/10 rounded overflow-hidden border border-[#0C1E3C]/20">
                  <div className="h-full w-full rounded flex items-center justify-end pr-1.5"
                    style={{ backgroundColor: '#0C1E3C20', borderRight: '3px solid #0C1E3C' }}>
                    <span className="text-[10px] font-bold tabular-nums text-[#0C1E3C]">
                      {total.days}
                    </span>
                  </div>
                </div>
                <span className="text-[10px] text-[#0C1E3C] font-semibold shrink-0">ημέρες</span>
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
}
