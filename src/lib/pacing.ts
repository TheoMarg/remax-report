export interface PacingResult {
  agent_id: number;
  metric: string;
  target: number;
  actual: number;
  ideal: number;           // target × (day_of_year / 365)
  pct_of_pace: number;     // actual / ideal × 100
  status: 'ahead' | 'on_track' | 'behind' | 'critical';
  required_weekly: number; // remaining / remaining_weeks
}

export function computePacing(
  agent_id: number,
  metric: string,
  target: number,
  actual: number,
  today: Date = new Date(),
): PacingResult {
  const startOfYear = new Date(today.getFullYear(), 0, 1);
  const dayOfYear = Math.ceil((today.getTime() - startOfYear.getTime()) / (1000 * 60 * 60 * 24));
  const daysInYear = 365;
  const ideal = target * (dayOfYear / daysInYear);
  const pct_of_pace = ideal > 0 ? Math.round((actual / ideal) * 1000) / 10 : 0;

  let status: PacingResult['status'];
  if (pct_of_pace >= 110) status = 'ahead';
  else if (pct_of_pace >= 90) status = 'on_track';
  else if (pct_of_pace >= 70) status = 'behind';
  else status = 'critical';

  const remaining = Math.max(target - actual, 0);
  const remainingWeeks = Math.max((daysInYear - dayOfYear) / 7, 1);
  const required_weekly = Math.round((remaining / remainingWeeks) * 10) / 10;

  return {
    agent_id,
    metric,
    target,
    actual,
    ideal: Math.round(ideal * 10) / 10,
    pct_of_pace,
    status,
    required_weekly,
  };
}

export const PACING_COLORS: Record<PacingResult['status'], string> = {
  ahead: '#1D7A4E',
  on_track: '#168F80',
  behind: '#C9961A',
  critical: '#DC3545',
};

export const PACING_LABELS: Record<PacingResult['status'], string> = {
  ahead: 'Ahead',
  on_track: 'On Track',
  behind: 'Behind',
  critical: 'Critical',
};
