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
            className={`px-4 py-1.5 rounded-xl text-sm font-medium transition-all ${
              isActive
                ? 'text-white shadow-md'
                : 'bg-surface-card text-text-primary border border-border-default hover:border-text-muted hover:shadow-sm'
            }`}
            style={isActive ? { backgroundColor: kpi.color } : undefined}
          >
            {kpi.label}
          </button>
        );
      })}
    </div>
  );
}
