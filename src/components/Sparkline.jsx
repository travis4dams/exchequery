import React from 'react';

// Inline SVG sparkline. Renders the path of `points` (numbers) within the
// box, with the latest point as a filled dot.
export function Sparkline({ points, width = 120, height = 28, color = '#fbbf24' }) {
  if (!points || points.length < 2) {
    return <svg width={width} height={height} />;
  }
  const lo = Math.min(...points);
  const hi = Math.max(...points);
  const range = hi - lo || 1;
  const xs = points.map((_, i) => (i / (points.length - 1)) * width);
  const ys = points.map(p => height - ((p - lo) / range) * (height - 4) - 2);
  const d = points.map((_, i) => `${i === 0 ? 'M' : 'L'} ${xs[i].toFixed(1)} ${ys[i].toFixed(1)}`).join(' ');
  return (
    <svg width={width} height={height} className="flex-shrink-0">
      <path d={d} fill="none" stroke={color} strokeWidth="1.5" />
      <circle cx={xs[xs.length - 1]} cy={ys[ys.length - 1]} r="2.5" fill={color} />
    </svg>
  );
}
