export interface ChangeBadge {
  current: number;
  previous: number;
  changePct: number;
  direction: 'up' | 'down' | 'flat';
}

export function computeChange(current: number, previous: number): ChangeBadge {
  if (previous === 0 && current === 0) {
    return { current, previous, changePct: 0, direction: 'flat' };
  }
  const changePct = previous === 0
    ? (current > 0 ? 100 : 0)
    : Math.round(((current - previous) / previous) * 1000) / 10;

  const direction: ChangeBadge['direction'] =
    Math.abs(changePct) < 1 ? 'flat' : changePct > 0 ? 'up' : 'down';

  return { current, previous, changePct, direction };
}
