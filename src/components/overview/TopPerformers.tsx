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
}: {
  title: string;
  icon: string;
  performer: TopPerformer | null;
  accent: string;
}) {
  return (
    <div className="card-premium p-5 flex-1 min-w-[220px]">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-lg">{icon}</span>
        <span className="text-xs font-semibold uppercase tracking-wider text-text-muted">
          {title}
        </span>
      </div>
      {performer ? (
        <div>
          <AgentLink agentId={performer.agent_id} name={performer.name} className="text-lg font-bold text-text-primary" />
          <div className="mt-2 text-2xl font-bold" style={{ color: accent }}>
            {formatGci(performer.value)}
          </div>
          <div className="text-xs text-text-muted">Τζίρος περιόδου</div>
        </div>
      ) : (
        <div className="text-sm text-text-muted">Δεν υπάρχουν δεδομένα</div>
      )}
    </div>
  );
}

export function TopPerformers({ topAgentLarissa, topAgentKaterini, topTeam }: Props) {
  return (
    <div className="flex gap-4 flex-wrap">
      <PerformerCard title="Κορυφαίος — Λάρισα" icon="🏆" performer={topAgentLarissa} accent="#C9961A" />
      <PerformerCard title="Κορυφαίος — Κατερίνη" icon="🏆" performer={topAgentKaterini} accent="#C9961A" />
      <PerformerCard title="Κορυφαία Ομάδα" icon="👥" performer={topTeam} accent="#168F80" />
    </div>
  );
}
