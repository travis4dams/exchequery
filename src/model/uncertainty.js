// =============================================================================
// uncertainty.js — sampling primitive for cited bands.
//
// A band declared at a `cited()` call site is `{ low, high, dist? }` where
// `low <= 0 <= high` are relative multipliers on the central value and
// `dist` defaults to 'triangular' with mode at the central value.
//
// Asymmetric bands are supported and used for things like HMRC-published
// avoidance-yield ranges, where the downside is much fatter than the upside.
// The mode stays at the cited central value — only the spread is asymmetric.
//
// Pure module: no dependencies on params/citations to keep it safe to import
// from anywhere in src/model.
// =============================================================================

// Normalise a band declaration. Returns { low, high, dist } where
// low <= 0 <= high are relative multipliers on the central value, or null if
// the band is missing.
//   normalizeBand({ low: -0.1, high: 0.1 }) -> { low: -0.1, high: 0.1, dist: 'triangular' }
//   normalizeBand({ width: 0.25 }) -> { low: -0.25, high: 0.25, ... }
//   normalizeBand(undefined) -> null
export function normalizeBand(band) {
  if (!band) return null;
  if (typeof band.width === 'number') {
    return { low: -Math.abs(band.width), high: Math.abs(band.width), dist: band.dist || 'triangular' };
  }
  const low = typeof band.low === 'number' ? band.low : -Math.abs(band.high ?? 0);
  const high = typeof band.high === 'number' ? band.high : Math.abs(band.low ?? 0);
  return { low, high, dist: band.dist || 'triangular' };
}

// Scale a band's width by a multiplier (used by OBR Independence).
export function scaleBand(band, multiplier = 1) {
  if (!band) return null;
  return { low: band.low * multiplier, high: band.high * multiplier, dist: band.dist };
}

// Inverse CDF for a triangular distribution on [a, b] with mode c.
// Standard formula: split at F(c) = (c-a)/(b-a).
export function triangularInverseCDF(u, a, c, b) {
  if (a === b) return a;
  const fc = (c - a) / (b - a);
  if (u < fc) {
    return a + Math.sqrt(u * (b - a) * (c - a));
  }
  return b - Math.sqrt((1 - u) * (b - a) * (b - c));
}

// Sample a realised value given a central `value` and a relative `band`.
// Returns `value` unchanged if the band is null or degenerate.
export function sampleWithBand(value, band, rng = Math.random) {
  const b = normalizeBand(band);
  if (!b || (b.low === 0 && b.high === 0)) return value;
  const a = value * (1 + b.low);
  const hi = value * (1 + b.high);
  // Mode stays at value regardless of asymmetric bounds.
  return triangularInverseCDF(rng(), a, value, hi);
}

// Forecast projection — absolute low / value / high for UI display.
export function projectBand(value, band) {
  const b = normalizeBand(band);
  if (!b) return { value, low: value, high: value };
  return {
    value,
    low: value * (1 + b.low),
    high: value * (1 + b.high),
  };
}
