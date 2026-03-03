import type { TopPerformer } from '../../lib/metrics';

interface Props {
  topAgent: TopPerformer | null;
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
    <div className="bg-white rounded-lg border border-[#DDD8D0] p-5 flex-1 min-w-[280px]">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-lg">{icon}</span>
        <span className="text-xs font-semibold uppercase tracking-wider text-[#8A94A0]">
          {title}
        </span>
      </div>
      {performer ? (
        <div>
          <div className="text-lg font-bold text-[#0C1E3C]">{performer.name}</div>
          {performer.office && (
            <div className="text-xs text-[#8A94A0] mt-0.5">{performer.office === 'larissa' ? 'Λάρισα' : performer.office === 'katerini' ? 'Κατερίνη' : performer.office}</div>
          )}
          <div className="mt-2 text-2xl font-bold" style={{ color: accent }}>
            {formatGci(performer.value)}
          </div>
          <div className="text-xs text-[#8A94A0]">Τζίρος περιόδου</div>
        </div>
      ) : (
        <div className="text-sm text-[#8A94A0]">Δεν υπάρχουν δεδομένα</div>
      )}
    </div>
  );
}

export function TopPerformers({ topAgent, topTeam }: Props) {
  return (
    <div className="flex gap-4 flex-wrap">
      <PerformerCard
        title="Κορυφαίος Συνεργάτης"
        icon="🏆"
        performer={topAgent}
        accent="#C9961A"
      />
      <PerformerCard
        title="Κορυφαία Ομάδα"
        icon="👥"
        performer={topTeam}
        accent="#168F80"
      />
    </div>
  );
}
