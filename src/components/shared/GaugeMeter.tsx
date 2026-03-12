interface Props {
  value: number;
  target: number;
  label: string;
  size?: number;
}

export function GaugeMeter({ value, target, label, size = 120 }: Props) {
  const pct = target > 0 ? Math.min(value / target, 1.5) : 0;
  const angle = pct * 180;
  const radius = size / 2 - 10;
  const cx = size / 2;
  const cy = size / 2;

  // Arc path
  const startAngle = Math.PI;
  const endAngle = Math.PI + (angle * Math.PI) / 180;
  const x1 = cx + radius * Math.cos(startAngle);
  const y1 = cy + radius * Math.sin(startAngle);
  const x2 = cx + radius * Math.cos(endAngle);
  const y2 = cy + radius * Math.sin(endAngle);
  const largeArc = angle > 180 ? 1 : 0;

  const color = pct >= 1 ? '#1D7A4E' : pct >= 0.7 ? '#C9961A' : '#DC3545';
  const displayPct = Math.round(pct * 100);

  return (
    <div className="flex flex-col items-center">
      <svg width={size} height={size / 2 + 15} viewBox={`0 0 ${size} ${size / 2 + 15}`}>
        {/* Background arc */}
        <path
          d={`M ${cx - radius} ${cy} A ${radius} ${radius} 0 0 1 ${cx + radius} ${cy}`}
          fill="none"
          stroke="#EFECEA"
          strokeWidth="8"
          strokeLinecap="round"
        />
        {/* Value arc */}
        {angle > 0 && (
          <path
            d={`M ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2}`}
            fill="none"
            stroke={color}
            strokeWidth="8"
            strokeLinecap="round"
          />
        )}
        {/* Value text */}
        <text x={cx} y={cy - 5} textAnchor="middle" className="text-lg font-bold" fill={color}>
          {displayPct}%
        </text>
        {/* Actual / target */}
        <text x={cx} y={cy + 12} textAnchor="middle" className="text-[10px]" fill="#8A94A0">
          {value} / {target}
        </text>
      </svg>
      <span className="text-xs text-text-muted mt-1">{label}</span>
    </div>
  );
}
