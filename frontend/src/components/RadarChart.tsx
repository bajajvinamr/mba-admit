"use client";

type RadarDataPoint = { label: string; value: number; max: number };
type RadarSeries = { name: string; data: RadarDataPoint[]; color: string };

export function RadarChart({
  series,
  size = 300,
}: {
  series: RadarSeries[];
  size?: number;
}) {
  const cx = size / 2;
  const cy = size / 2;
  const r = size * 0.38;
  const levels = 4;

  if (!series.length || !series[0].data.length) return null;
  const labels = series[0].data.map((d) => d.label);
  const n = labels.length;
  const angleSlice = (2 * Math.PI) / n;

  const getPoint = (index: number, value: number, max: number) => {
    const angle = angleSlice * index - Math.PI / 2;
    const radius = (value / max) * r;
    return { x: cx + radius * Math.cos(angle), y: cy + radius * Math.sin(angle) };
  };

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="mx-auto">
      {/* Grid circles */}
      {Array.from({ length: levels }, (_, i) => {
        const levelR = (r * (i + 1)) / levels;
        const points = Array.from({ length: n }, (_, j) => {
          const angle = angleSlice * j - Math.PI / 2;
          return `${cx + levelR * Math.cos(angle)},${cy + levelR * Math.sin(angle)}`;
        }).join(" ");
        return (
          <polygon key={i} points={points} fill="none" stroke="currentColor"
            strokeOpacity={0.08} strokeWidth={1} />
        );
      })}

      {/* Axis lines */}
      {labels.map((_, i) => {
        const angle = angleSlice * i - Math.PI / 2;
        return (
          <line key={i} x1={cx} y1={cy}
            x2={cx + r * Math.cos(angle)} y2={cy + r * Math.sin(angle)}
            stroke="currentColor" strokeOpacity={0.08} strokeWidth={1} />
        );
      })}

      {/* Data polygons */}
      {series.map((s, si) => {
        const points = s.data
          .map((d, i) => {
            const p = getPoint(i, d.value, d.max);
            return `${p.x},${p.y}`;
          })
          .join(" ");
        return (
          <g key={si}>
            <polygon points={points} fill={s.color} fillOpacity={0.15}
              stroke={s.color} strokeWidth={2} strokeOpacity={0.8} />
            {s.data.map((d, i) => {
              const p = getPoint(i, d.value, d.max);
              return <circle key={i} cx={p.x} cy={p.y} r={3} fill={s.color} />;
            })}
          </g>
        );
      })}

      {/* Labels */}
      {labels.map((label, i) => {
        const angle = angleSlice * i - Math.PI / 2;
        const labelR = r + 24;
        const x = cx + labelR * Math.cos(angle);
        const y = cy + labelR * Math.sin(angle);
        return (
          <text key={i} x={x} y={y} textAnchor="middle" dominantBaseline="middle"
            className="text-[10px] fill-jet/50 font-medium">
            {label}
          </text>
        );
      })}
    </svg>
  );
}
