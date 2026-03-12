export type EntityView = 'agent' | 'team' | 'office';

interface Props {
  value: EntityView;
  onChange: (view: EntityView) => void;
}

const OPTIONS: { key: EntityView; label: string }[] = [
  { key: 'agent', label: 'Agent' },
  { key: 'team', label: 'Team' },
  { key: 'office', label: 'Office' },
];

export function EntitySelector({ value, onChange }: Props) {
  return (
    <div className="flex gap-1 bg-surface-light rounded-lg p-1">
      {OPTIONS.map(opt => (
        <button
          key={opt.key}
          onClick={() => onChange(opt.key)}
          className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${
            value === opt.key
              ? 'bg-surface-card text-brand-blue shadow-sm'
              : 'text-text-muted hover:text-text-primary'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
