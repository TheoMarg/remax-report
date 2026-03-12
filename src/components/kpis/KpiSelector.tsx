import type { KpiDef } from '../../lib/metrics';

interface Props {
  kpis: readonly KpiDef[];
  activeKey: string;
  onChange: (key: string) => void;
}

export function KpiSelector({ kpis, activeKey, onChange }: Props) {
  return (
    <div className="flex flex-wrap gap-2">
      {kpis.map((kpi) => {
        const isActive = kpi.key === activeKey;
        return (
          <button
            key={kpi.key}
            onClick={() => onChange(kpi.key)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200 ${
              isActive
                ? 'text-white shadow-md scale-[1.02]'
                : 'bg-surface-card text-text-primary border border-border-default hover:border-text-muted hover:shadow-sm'
            }`}
            style={isActive ? { backgroundColor: kpi.color, boxShadow: `0 4px 14px ${kpi.color}40` } : undefined}
          >
            {kpi.label}
          </button>
        );
      })}
    </div>
  );
}
