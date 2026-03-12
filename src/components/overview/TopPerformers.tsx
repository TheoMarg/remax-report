import type { TopPerformer } from '../../lib/metrics';
import { AgentLink } from '../ui/AgentLink';

interface Props {
  topAgentLarissa: TopPerformer | null;
  topAgentKaterini: TopPerformer | null;
  topTeam: TopPerformer | null;
}

function formatGci(value: number): string {
  return `€${value.toLocaleString('el-GR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function PerformerCard({
  title,
  icon,
  performer,
  accent,
  accentBg,
}: {
  title: string;
  icon: string;
  performer: TopPerformer | null;
  accent: string;
  accentBg: string;
}) {
  return (
    <div className="card-premium p-5 flex-1 min-w-[220px] relative overflow-hidden group">
      {/* Top accent bar */}
      <div className="absolute top-0 left-0 right-0 h-1 rounded-t-xl" style={{ background: `linear-gradient(90deg, ${accent}, ${accent}88)` }} />

      <div className="flex items-center gap-2.5 mb-4">
        <div
          className="w-9 h-9 rounded-lg flex items-center justify-center text-base"
          style={{ backgroundColor: accentBg }}
        >
          {icon}
        </div>
        <span className="text-[11px] font-semibold uppercase tracking-wider text-text-muted">
          {title}
        </span>
      </div>
      {performer ? (
        <div>
          <AgentLink agentId={performer.agent_id} name={performer.name} className="text-lg font-bold text-text-primary" />
          <div className="mt-2 text-2xl font-extrabold stat-number" style={{ color: accent }}>
            {formatGci(performer.value)}
          </div>
          <div className="text-[11px] text-text-muted mt-0.5">Τζίρος περιόδου</div>
        </div>
      ) : (
        <div className="text-sm text-text-muted py-4">Δεν υπάρχουν δεδομένα</div>
      )}
    </div>
  );
}

export function TopPerformers({ topAgentLarissa, topAgentKaterini, topTeam }: Props) {
  return (
    <div className="flex gap-4 flex-wrap">
      <PerformerCard
        title="Κορυφαίος — Λάρισα"
        icon="🏆"
        performer={topAgentLarissa}
        accent="#C9961A"
        accentBg="#C9961A15"
      />
      <PerformerCard
        title="Κορυφαίος — Κατερίνη"
        icon="🏆"
        performer={topAgentKaterini}
        accent="#C9961A"
        accentBg="#C9961A15"
      />
      <PerformerCard
        title="Κορυφαία Ομάδα"
        icon="👥"
        performer={topTeam}
        accent="#168F80"
        accentBg="#168F8015"
      />
    </div>
  );
}
