import React from 'react';

// Inline SVG sparkline. `points` is an array of numbers; the latest point
// renders as a filled dot. Pass `responsive` to fill the parent width while
// preserving the configured aspect ratio (used by OverviewTab's GdpChart).
// color accepts any CSS color, including var(--accent-500) for theming.
export function Sparkline({
  points,
  width = 120,
  height = 28,
  color = 'var(--accent-400, #fbbf24)',
  responsive = false,
  strokeWidth = 1.5,
  dotRadius = 2.5,
  className = '',
}) {
  if (!points || points.length < 2) {
    if (responsive) {
      return <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" width="100%" height={height} className={className} />;
    }
    return <svg width={width} height={height} className={`flex-shrink-0 ${className}`.trim()} />;
  }
  const lo = Math.min(...points);
  const hi = Math.max(...points);
  const range = hi - lo || 1;
  const xs = points.map((_, i) => (i / (points.length - 1)) * width);
  const ys = points.map(p => height - ((p - lo) / range) * (height - 4) - 2);
  const d = points.map((_, i) => `${i === 0 ? 'M' : 'L'} ${xs[i].toFixed(1)} ${ys[i].toFixed(1)}`).join(' ');
  const path = <path d={d} fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinejoin="round" strokeLinecap="round" />;
  const dot = <circle cx={xs[xs.length - 1]} cy={ys[ys.length - 1]} r={dotRadius} fill={color} />;
  if (responsive) {
    return (
      <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" width="100%" height={height} className={className}>
        {path}
        {dot}
      </svg>
    );
  }
  return (
    <svg width={width} height={height} className={`flex-shrink-0 ${className}`.trim()}>
      {path}
      {dot}
    </svg>
  );
}
