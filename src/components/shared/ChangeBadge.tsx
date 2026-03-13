import type { ChangeBadge as ChangeBadgeData } from '../../lib/comparison';

interface Props {
  badge: ChangeBadgeData;
  size?: 'sm' | 'md';
}

export function ChangeBadge({ badge, size = 'sm' }: Props) {
  const { changePct, direction } = badge;

  const colorClass =
    direction === 'up'
      ? 'text-green-600 bg-green-50'
      : direction === 'down'
        ? 'text-red-600 bg-red-50'
        : 'text-gray-500 bg-gray-50';

  const arrow =
    direction === 'up' ? '▲' : direction === 'down' ? '▼' : '—';

  const sizeClass = size === 'sm' ? 'text-[10px] px-1.5 py-0.5' : 'text-xs px-2 py-1';

  return (
    <span className={`inline-flex items-center gap-0.5 font-semibold rounded-md ${colorClass} ${sizeClass}`}>
      {arrow}{direction !== 'flat' && `${Math.abs(changePct)}%`}
    </span>
  );
}
