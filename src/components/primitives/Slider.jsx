import React from 'react';
import { CitationLink } from './CitationLink.jsx';

// Slider — labelled range input with optional baseline indicator, citation,
// and Q-on-Q diff badge. Track uses the inset-well shadow so the thumb
// reads as recessed; thumb itself is styled globally in index.css.
export function Slider({
  label, value, min, max, step, onChange,
  format, tooltip, baseline, committed, unit, citationId,
  disabled = false,
}) {
  const isChanged = baseline !== undefined && value !== baseline;
  const diff = committed !== undefined && value !== committed ? value - committed : null;
  const range = max - min;
  const baselinePct = baseline !== undefined && range > 0
    ? Math.max(0, Math.min(100, ((baseline - min) / range) * 100))
    : null;
  const valuePct = range > 0
    ? Math.max(0, Math.min(100, ((value - min) / range) * 100))
    : 0;
  return (
    <div className={`mb-4 ${disabled ? 'opacity-60 pointer-events-none' : ''}`}>
      <div className="flex justify-between items-baseline mb-1.5 gap-2">
        <label className="text-[13px] font-medium text-stone-200 flex items-center gap-1 min-w-0">
          <span className="truncate">{label}</span>
          {citationId && <CitationLink id={citationId} />}
        </label>
        <div className="flex items-baseline gap-2 flex-shrink-0">
          <span className={`text-sm font-semibold font-mono tabular-nums ${isChanged ? 'text-accent-400' : 'text-stone-400'}`}>
            {format ? format(value) : value}{unit}
          </span>
          {diff !== null && diff !== 0 && (
            <span className={`text-[10px] font-mono tabular-nums ${diff > 0 ? 'text-accent-400' : 'text-signal-info'}`}>
              ({diff > 0 ? '+' : ''}{diff})
            </span>
          )}
        </div>
      </div>
      <div className="relative">
        {/* Filled portion of the track — brass to current value. */}
        <div aria-hidden className="absolute inset-y-0 left-0 h-1.5 my-auto rounded-pill bg-gradient-to-r from-accent-700/60 to-accent-500/60 pointer-events-none"
             style={{width: `${valuePct}%`}} />
        {/* Baseline tick mark — thin brass line on top of the track. */}
        {baselinePct !== null && (
          <span aria-hidden
                className="absolute top-1/2 -translate-y-1/2 w-px h-3 bg-stone-300/50 pointer-events-none"
                style={{left: `calc(${baselinePct}% - 0.5px)`}} />
        )}
        <input type="range" min={min} max={max} step={step} value={value}
          disabled={disabled}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          className="relative w-full h-1.5 bg-treasury-950/80 rounded-pill appearance-none cursor-pointer shadow-inset-well" />
      </div>
      {tooltip && <div className="text-[11px] text-stone-500 mt-1.5 leading-snug">{tooltip}</div>}
    </div>
  );
}
