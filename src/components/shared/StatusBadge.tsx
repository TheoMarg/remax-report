type Status = 'active' | 'slow' | 'cold' | 'exclusive' | 'closed' | 'rookie';

interface Props {
  status: Status;
  className?: string;
}

const CONFIG: Record<Status, { bg: string; text: string; label: string; dot: string }> = {
  active:    { bg: 'bg-green-50',  text: 'text-green-700',  label: 'Active',    dot: 'bg-green-500' },
  slow:      { bg: 'bg-yellow-50', text: 'text-yellow-700', label: 'Slow',      dot: 'bg-yellow-500' },
  cold:      { bg: 'bg-red-50',    text: 'text-red-700',    label: 'Cold',      dot: 'bg-red-500' },
  exclusive: { bg: 'bg-blue-50',   text: 'text-blue-700',   label: 'Exclusive', dot: 'bg-blue-500' },
  closed:    { bg: 'bg-gray-50',   text: 'text-gray-600',   label: 'Closed',    dot: 'bg-gray-400' },
  rookie:    { bg: 'bg-purple-50', text: 'text-purple-700', label: 'Rookie',    dot: 'bg-purple-500' },
};

export function StatusBadge({ status, className = '' }: Props) {
  const c = CONFIG[status];
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${c.bg} ${c.text} ${className}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
      {c.label}
    </span>
  );
}
