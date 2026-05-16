import React from 'react';

// MeterBar — recessed track + tone-coloured fill. Replaces the inline
// `h-1.5 bg-treasury-950 rounded-pill shadow-inset-well` pattern repeated
// across Overview, Politics, ReformCard, and ReformsTab.
//
// Use `tone` to pick a fill colour. Use `mood` (boolean) to colour
// automatically against `ok` / `warn` thresholds.

const TONE_FILL = {
  accent:  'bg-gradient-to-r from-accent-600 to-accent-400',
  good:    'bg-signal-good',
  warn:    'bg-accent-500',
  bad:     'bg-signal-bad',
  info:    'bg-signal-info',
  neutral: 'bg-stone-500',
};

const SIZE_CLS = {
  xs: 'h-1',
  sm: 'h-1.5',
  md: 'h-2',
};

export function MeterBar({
  value,
  max = 100,
  tone = 'accent',
  size = 'sm',
  mood = false,
  ok = 60,
  warn = 45,
  className = '',
}) {
  const pct = max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0;
  let fillCls;
  if (mood) {
    fillCls = value >= ok ? TONE_FILL.good : value >= warn ? TONE_FILL.warn : TONE_FILL.bad;
  } else {
    fillCls = TONE_FILL[tone] || TONE_FILL.accent;
  }
  const sizeCls = SIZE_CLS[size] || SIZE_CLS.sm;
  return (
    <div className={`${sizeCls} bg-treasury-950 rounded-pill overflow-hidden shadow-inset-well ${className}`.trim()}>
      <div className={`h-full transition-all duration-500 ${fillCls}`}
           style={{ width: `${pct}%` }} />
    </div>
  );
}
