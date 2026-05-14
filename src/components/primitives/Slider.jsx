import React from 'react';
import { CitationLink } from './CitationLink.jsx';

export function Slider({ label, value, min, max, step, onChange, format, tooltip, baseline, committed, unit, citationId }) {
  const isChanged = value !== baseline;
  const diff = committed !== undefined && value !== committed ? value - committed : null;
  return (
    <div className="mb-4">
      <div className="flex justify-between items-baseline mb-1.5">
        <label className="text-[13px] font-medium text-stone-200 flex items-center gap-1">
          {label}
          {citationId && <CitationLink id={citationId} />}
        </label>
        <div className="flex items-baseline gap-2">
          <span className={`text-sm font-semibold tabular-nums ${isChanged ? 'text-amber-400' : 'text-stone-400'}`}
                style={{fontFamily: 'IBM Plex Mono'}}>
            {format ? format(value) : value}{unit}
          </span>
          {diff !== null && diff !== 0 && (
            <span className={`text-[10px] tabular-nums ${diff > 0 ? 'text-amber-400' : 'text-sky-400'}`}
                  style={{fontFamily: 'IBM Plex Mono'}}>
              ({diff > 0 ? '+' : ''}{diff})
            </span>
          )}
        </div>
      </div>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full h-1.5 bg-stone-700 rounded-full appearance-none cursor-pointer" />
      {tooltip && <div className="text-[11px] text-stone-500 mt-1 leading-snug">{tooltip}</div>}
    </div>
  );
}
