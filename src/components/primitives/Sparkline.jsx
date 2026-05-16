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
//
// Pass `overlay` (a second points array) to render a second series in the
// same viewport with its own independent (hidden) y-axis — useful for
// pairing a level series with a delta/balance series that needs a centered
// zero rule of its own. overlayZeroAxis defaults true (matches the canonical
// "balance overlaid on debt" use case).
function scaleFor(points, { zeroAxis, zeroAxisFloor, height }) {
  let lo, hi;
  if (zeroAxis) {
    const M = Math.max(Math.abs(Math.min(...points)), Math.abs(Math.max(...points)), zeroAxisFloor);
    lo = -M; hi = M;
  } else {
    lo = Math.min(...points);
    hi = Math.max(...points);
  }
  const range = hi - lo || 1;
  return { lo, hi, range, toY: (v) => height - ((v - lo) / range) * (height - 4) - 2 };
}

export function Sparkline({
  points,
  overlay = null,
  overlays = null,
  width = 120,
  height = 28,
  color = 'var(--accent-400, #fbbf24)',
  overlayColor = 'var(--signal-bad)',
  responsive = false,
  strokeWidth = 1.5,
  dotRadius = 2.5,
  zeroAxis = false,
  zeroAxisFloor = 0.5,
  overlayZeroAxis = true,
  overlayZeroAxisFloor = 0.5,
  zeroAxisColor = 'rgba(255,255,255,0.15)',
  className = '',
}) {
  if (!points || points.length < 2) {
    if (responsive) {
      return <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" width="100%" height={height} className={className} />;
    }
    return <svg width={width} height={height} className={`flex-shrink-0 ${className}`.trim()} />;
  }

  // Normalise overlay specs: `overlay` is the legacy single-series form;
  // `overlays` is an array of { points, color, zeroAxis?, zeroAxisFloor? }.
  const overlaySpecs = overlays
    ? overlays.filter(o => o && o.points && o.points.length >= 2)
    : overlay && overlay.length >= 2
      ? [{ points: overlay, color: overlayColor, zeroAxis: overlayZeroAxis, zeroAxisFloor: overlayZeroAxisFloor }]
      : [];

  const primary = scaleFor(points, { zeroAxis, zeroAxisFloor, height });
  const xs = points.map((_, i) => (i / (points.length - 1)) * width);
  const ys = points.map(p => primary.toY(p));
  const d = points.map((_, i) => `${i === 0 ? 'M' : 'L'} ${xs[i].toFixed(1)} ${ys[i].toFixed(1)}`).join(' ');

  const renderedOverlays = overlaySpecs.map(spec => {
    const sc = scaleFor(spec.points, {
      zeroAxis: spec.zeroAxis ?? false,
      zeroAxisFloor: spec.zeroAxisFloor ?? 0.5,
      height,
    });
    const xs2 = spec.points.map((_, i) => (i / (spec.points.length - 1)) * width);
    const ys2 = spec.points.map(p => sc.toY(p));
    const d2 = spec.points.map((_, i) => `${i === 0 ? 'M' : 'L'} ${xs2[i].toFixed(1)} ${ys2[i].toFixed(1)}`).join(' ');
    return { ...spec, scale: sc, xs: xs2, ys: ys2, d: d2 };
  });

  // The zero rule comes from whichever axis is zero-anchored. The first
  // zero-axis overlay wins (typically "balance" against a level series);
  // primary zero is used otherwise.
  let zeroY = null;
  const zeroOverlay = renderedOverlays.find(o => o.zeroAxis);
  if (zeroOverlay) zeroY = zeroOverlay.scale.toY(0);
  else if (zeroAxis) zeroY = primary.toY(0);

  const inner = (
    <>
      {zeroY !== null && (
        <line x1="0" x2={width} y1={zeroY} y2={zeroY}
              stroke={zeroAxisColor} strokeWidth="0.75" strokeDasharray="2 2" />
      )}
      <path d={d} fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={xs[xs.length - 1]} cy={ys[ys.length - 1]} r={dotRadius} fill={color} />
      {renderedOverlays.map((o, i) => (
        <React.Fragment key={i}>
          <path d={o.d} fill="none" stroke={o.color} strokeWidth={strokeWidth} strokeLinejoin="round" strokeLinecap="round" />
          <circle cx={o.xs[o.xs.length - 1]} cy={o.ys[o.ys.length - 1]} r={dotRadius} fill={o.color} />
        </React.Fragment>
      ))}
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
