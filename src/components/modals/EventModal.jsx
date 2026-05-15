import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { BLOCS } from '../../model/index.js';
import { CitationLink } from '../primitives/CitationLink.jsx';

const v = (leaf) => (leaf && typeof leaf === 'object' && 'value' in leaf) ? leaf.value : leaf;
const cid = (leaf) => (leaf && typeof leaf === 'object' && 'citationId' in leaf) ? leaf.citationId : null;

const EFFECT_AXES = [
  { key: 'debt',        label: 'Debt',       fmt: n => `${n > 0 ? '+' : ''}£${n}bn`, goodWhenPositive: false },
  { key: 'growth',      label: 'Growth',     fmt: n => `${n > 0 ? '+' : ''}${n}pp`,  goodWhenPositive: true  },
  { key: 'inflation',   label: 'Inflation',  fmt: n => `${n > 0 ? '+' : ''}${n}pp`,  goodWhenPositive: false },
  { key: 'healthIndex', label: 'Health',     fmt: n => `${n > 0 ? '+' : ''}${n}`,    goodWhenPositive: true  },
  { key: 'bondYield',   label: 'Bond Yield', fmt: n => `${n > 0 ? '+' : ''}${n}pp`,  goodWhenPositive: false },
];

function summarizeEffect(effect) {
  const rows = [];
  for (const { key, label, fmt, goodWhenPositive } of EFFECT_AXES) {
    const leaf = effect[key];
    if (leaf == null) continue;
    const n = v(leaf);
    rows.push({ label, value: fmt(n), good: goodWhenPositive ? n > 0 : n < 0, citationId: cid(leaf) });
  }
  if (effect.blocs) {
    const entries = Object.entries(effect.blocs).map(([bloc, leaf]) => [bloc, v(leaf), cid(leaf)]);
    entries.sort((a, b) => b[1] - a[1]);
    for (const [bloc, delta, citationId] of entries) {
      rows.push({
        label: BLOCS[bloc]?.name ?? bloc,
        value: `${delta > 0 ? '+' : ''}${delta}`,
        good: delta > 0,
        citationId,
      });
    }
  }
  return rows;
}

export function EventModal({ event, onChoice, briefIndex = 1, briefTotal = 1 }) {
  const [expandedIdx, setExpandedIdx] = useState(null);
  if (!event) return null;
  const tone = event.tone;
  const showRedBox = briefTotal > 1;
  return (
    <div className="fixed inset-0 z-40 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-3">
      <div className="bg-stone-950 border-2 rounded-t-2xl sm:rounded-2xl max-w-md w-full p-5"
           style={{borderColor: tone === 'good' ? '#15803d' : tone === 'bad' ? '#9f1239' : '#78350f'}}>
        {showRedBox && (
          <div className="flex items-center gap-2 mb-2 pb-2 border-b border-stone-800">
            <div className="text-[10px] uppercase tracking-[0.2em] text-rose-400">
              Chancellor's Red Box
            </div>
            <div className="ml-auto text-[10px] uppercase tracking-[0.2em] text-stone-400" style={{fontFamily: 'IBM Plex Mono'}}>
              Brief {briefIndex} of {briefTotal}
            </div>
          </div>
        )}
        <div className="flex items-center gap-2 mb-3">
          <div className={`w-2 h-2 rounded-full animate-pulse ${
            tone === 'good' ? 'bg-emerald-500' : tone === 'bad' ? 'bg-rose-500' : 'bg-amber-500'
          }`} />
          <div className="text-[10px] uppercase tracking-[0.2em]" style={{
            color: tone === 'good' ? '#34d399' : tone === 'bad' ? '#fb7185' : '#fbbf24'
          }}>
            {tone === 'good' ? 'Opportunity' : tone === 'bad' ? 'Crisis' : 'Dispatch'}
          </div>
          {event.citationId && (
            <div className="ml-auto" onClick={(e) => e.stopPropagation()}>
              <CitationLink id={event.citationId} />
            </div>
          )}
        </div>
        <h2 className="display-font text-2xl font-medium leading-tight mb-3">{event.title}</h2>
        <p className="text-stone-300 text-[13px] leading-relaxed mb-5">{event.body}</p>
        <div className="space-y-2">
          {event.choices.map((c, i) => {
            const isOpen = expandedIdx === i;
            const rows = summarizeEffect(c.effect);
            return (
              <button key={i} onClick={() => onChoice(c)}
                      className="w-full text-left bg-stone-900 hover:bg-stone-800 border border-stone-700 hover:border-amber-700 transition-all p-3 rounded-md">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-[13px] font-medium text-stone-100">{c.label}</div>
                  {rows.length > 0 && (
                    <div
                      onClick={(e) => { e.stopPropagation(); setExpandedIdx(isOpen ? null : i); }}
                      className="flex items-center gap-0.5 text-stone-500 hover:text-stone-300 transition-colors shrink-0 cursor-pointer"
                    >
                      <span className="text-[10px]">{isOpen ? 'Hide' : 'Details'}</span>
                      {isOpen ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                    </div>
                  )}
                </div>
                {isOpen && (
                  <div
                    className="mt-2 pt-2 border-t border-stone-700 space-y-1"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {rows.map((r, j) => (
                      <div key={j} className="flex justify-between items-center text-[11px]" style={{fontFamily: 'IBM Plex Mono'}}>
                        <span className="text-stone-400">{r.label}</span>
                        <span className="flex items-center gap-1.5">
                          <span className={r.good ? 'text-emerald-400' : 'text-rose-400'}>{r.value}</span>
                          {r.citationId && <CitationLink id={r.citationId} />}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
