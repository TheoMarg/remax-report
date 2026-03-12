interface Props {
  label: string;
  value: string | number;
  subtitle?: string;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
}

export function MiniKpiCard({ label, value, subtitle, trend, trendValue }: Props) {
  const trendColor = trend === 'up' ? 'text-green-600' : trend === 'down' ? 'text-red-600' : 'text-text-muted';
  const trendIcon = trend === 'up' ? '\u2191' : trend === 'down' ? '\u2193' : '';

  return (
    <div className="card-premium p-4">
      <div className="text-xs font-medium text-text-muted mb-1">{label}</div>
      <div className="stat-number text-2xl font-bold text-text-primary">{value}</div>
      {subtitle && <div className="text-xs text-text-muted mt-0.5">{subtitle}</div>}
      {trendValue && (
        <div className={`text-xs font-medium mt-1 ${trendColor}`}>
          {trendIcon} {trendValue}
        </div>
      )}
    </div>
  );
}
