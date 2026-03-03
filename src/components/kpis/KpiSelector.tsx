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
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              isActive
                ? 'text-white shadow-sm'
                : 'bg-white text-[#0C1E3C] border border-[#DDD8D0] hover:border-[#8A94A0]'
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
