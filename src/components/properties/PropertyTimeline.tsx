import type { PropertyEvent, StageDuration } from '../../lib/types';
import { EVENT_TYPE_CONFIG, daysBetween, formatDateEL } from '../../lib/propertyMetrics';

interface Props {
  events: PropertyEvent[];
  stages: StageDuration[];
}

export function PropertyTimeline({ events, stages }: Props) {
  if (events.length === 0) {
    return (
      <p className="text-xs text-[#8A94A0] italic py-2">
        Δεν υπάρχουν γεγονότα timeline
      </p>
    );
  }

  return (
    <div className="bg-[#F7F6F3] rounded-lg p-3 overflow-x-auto">
      {/* Event dots row */}
      <div className="flex items-center gap-1 min-w-max">
        {events.map((ev, i) => {
          const cfg = EVENT_TYPE_CONFIG[ev.event_type];
          const color = cfg?.color ?? '#8A94A0';
          const label = cfg?.label ?? ev.event_type;
          const gap = i > 0 ? daysBetween(events[i - 1].event_date, ev.event_date) : null;

          return (
            <div key={`${ev.property_id}-${ev.event_type}-${ev.event_date}-${i}`} className="flex items-center">
              {/* Day gap badge */}
              {gap !== null && gap > 0 && (
                <span className="text-[9px] text-[#8A94A0] bg-white rounded px-1 py-0.5 mx-1 tabular-nums whitespace-nowrap">
                  {gap} ημ.
                </span>
              )}
              {/* Event dot + label */}
              <div className="flex flex-col items-center gap-0.5" title={`${label}: ${formatDateEL(ev.event_date)}`}>
                <div
                  className="w-3 h-3 rounded-full shrink-0"
                  style={{ backgroundColor: color }}
                />
                <span className="text-[8px] text-[#3A4550] whitespace-nowrap">
                  {label}
                </span>
                <span className="text-[8px] text-[#8A94A0] tabular-nums whitespace-nowrap">
                  {formatDateEL(ev.event_date)}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Stage duration pills */}
      {stages.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-2 pt-2 border-t border-[#DDD8D0]">
          {stages.map(s => (
            <span
              key={`${s.from}-${s.to}`}
              className="text-[9px] bg-white border border-[#DDD8D0] rounded-full px-2 py-0.5 text-[#3A4550] whitespace-nowrap"
            >
              {s.fromLabel} → {s.toLabel}:{' '}
              <span className="font-semibold">{s.days} ημ.</span>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
