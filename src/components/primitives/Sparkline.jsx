import React from 'react';

// Inline SVG sparkline. `points` is an array of numbers; the latest point
// renders as a filled dot. Pass `responsive` to fill the parent width while
// preserving the configured aspect ratio (used by OverviewTab's GdpChart).
// color accepts any CSS color, including var(--accent-500) for theming.
//
// Pass `zeroAxis` to anchor the y-domain at 0 (symmetric around the
// midline) and render a faint horizontal rule at y=0. Used for the
// balance-ratio chart where the line tracking toward zero communicates
// "the books are closing."
export function Sparkline({
  points,
  width = 120,
  height = 28,
  color = 'var(--accent-400, #fbbf24)',
  responsive = false,
  strokeWidth = 1.5,
  dotRadius = 2.5,
  zeroAxis = false,
  zeroAxisFloor = 0.5,
  zeroAxisColor = 'rgba(255,255,255,0.15)',
  className = '',
}) {
  if (!points || points.length < 2) {
    if (responsive) {
      return <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" width="100%" height={height} className={className} />;
    }
    return <svg width={width} height={height} className={`flex-shrink-0 ${className}`.trim()} />;
  }

  let lo, hi;
  if (zeroAxis) {
    const M = Math.max(Math.abs(Math.min(...points)), Math.abs(Math.max(...points)), zeroAxisFloor);
    lo = -M;
    hi = M;
  } else {
    lo = Math.min(...points);
    hi = Math.max(...points);
  }
  const range = hi - lo || 1;
  const xs = points.map((_, i) => (i / (points.length - 1)) * width);
  const ys = points.map(p => height - ((p - lo) / range) * (height - 4) - 2);
  const d = points.map((_, i) => `${i === 0 ? 'M' : 'L'} ${xs[i].toFixed(1)} ${ys[i].toFixed(1)}`).join(' ');
  const zeroY = zeroAxis ? height - ((0 - lo) / range) * (height - 4) - 2 : null;

  const inner = (
    <>
      {zeroAxis && (
        <line x1="0" x2={width} y1={zeroY} y2={zeroY}
              stroke={zeroAxisColor} strokeWidth="0.75" strokeDasharray="2 2" />
      )}
      <path d={d} fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={xs[xs.length - 1]} cy={ys[ys.length - 1]} r={dotRadius} fill={color} />
    </>
  );
  if (responsive) {
    return (
      <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" width="100%" height={height} className={className}>
        {inner}
      </svg>
    );
  }
  return (
    <svg width={width} height={height} className={`flex-shrink-0 ${className}`.trim()}>
      {inner}
    </svg>
  );
}
