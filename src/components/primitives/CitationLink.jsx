import React, { useState } from 'react';
import { Info, X, ExternalLink } from 'lucide-react';
import { CITATIONS } from '../../model/index.js';

export const CONFIDENCE_STYLES = {
  sourced:      { label: 'sourced',      bg: 'bg-emerald-950/40', border: 'border-emerald-800/60', text: 'text-emerald-300' },
  extrapolated: { label: 'extrapolated', bg: 'bg-amber-950/40',   border: 'border-amber-800/60',   text: 'text-amber-300' },
  judgement:    { label: 'judgement',    bg: 'bg-stone-800/60',   border: 'border-stone-700',      text: 'text-stone-300' },
};

export function ConfidenceBadge({ confidence }) {
  const s = CONFIDENCE_STYLES[confidence] || CONFIDENCE_STYLES.judgement;
  return (
    <span className={`inline-block px-1.5 py-0.5 rounded text-[9px] font-semibold uppercase tracking-wider ${s.bg} ${s.text} border ${s.border}`}>
      {s.label}
    </span>
  );
}

export function CitationLink({ id, label, className }) {
  const [open, setOpen] = useState(false);
  const c = CITATIONS[id];
  if (!c) return null;
  return (
    <>
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); setOpen(true); }}
        className={`inline-flex items-center text-stone-500 hover:text-amber-400 transition-colors ${className || ''}`}
        title={`Show citation: ${c.title}`}
      >
        {label ? <span className="text-[10px] underline-offset-2 hover:underline">{label}</span> : <Info size={11} />}
      </button>
      {open && (
        <div className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-3"
             onClick={() => setOpen(false)}>
          <div className="bg-stone-950 border-2 border-stone-700 rounded-t-2xl sm:rounded-2xl max-w-md w-full p-5 max-h-[90vh] overflow-y-auto"
               onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between mb-3 gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <ConfidenceBadge confidence={c.confidence} />
                  {c.year && <span className="text-[10px] text-stone-500" style={{fontFamily: 'IBM Plex Mono'}}>{c.year}</span>}
                </div>
                <h3 className="display-font text-lg font-medium leading-tight">{c.title}</h3>
                {c.publisher && <div className="text-[11px] text-stone-400 italic mt-0.5">{c.publisher}</div>}
                {c.authors && <div className="text-[10px] text-stone-500 mt-0.5">{c.authors.join(', ')}</div>}
              </div>
              <button onClick={() => setOpen(false)} className="text-stone-500"><X size={16} /></button>
            </div>
            {c.parameter && (
              <div className="bg-stone-900/60 rounded p-2 mb-3">
                <div className="text-[9px] uppercase tracking-wider text-stone-500 mb-1">Parameter</div>
                <div className="text-[11px] text-stone-200" style={{fontFamily: 'IBM Plex Mono'}}>{c.parameter}</div>
                {c.value !== undefined && (
                  <div className="text-[11px] text-amber-300 mt-1" style={{fontFamily: 'IBM Plex Mono'}}>
                    {c.value}{c.unit ? ` ${c.unit}` : ''}
                  </div>
                )}
              </div>
            )}
            {c.quote && (
              <div className="bg-amber-950/15 border-l-2 border-amber-700/50 rounded-r p-2 mb-3">
                <div className="text-[9px] uppercase tracking-wider text-amber-500 mb-1">Quote</div>
                <div className="text-[11px] text-stone-300 italic leading-relaxed">{c.quote}</div>
              </div>
            )}
            {c.note && (
              <div className="mb-3">
                <div className="text-[9px] uppercase tracking-wider text-stone-500 mb-1">Note</div>
                <div className="text-[11px] text-stone-300 leading-relaxed">{c.note}</div>
              </div>
            )}
            {c.url && (
              <a href={c.url} target="_blank" rel="noopener noreferrer"
                 className="inline-flex items-center gap-1.5 text-[11px] text-amber-400 hover:underline">
                Open source <ExternalLink size={10} />
              </a>
            )}
          </div>
        </div>
      )}
    </>
  );
}
