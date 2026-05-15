import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { BLOCS } from '../../model/index.js';

const EFFECT_AXES = [
  { key: 'debt',        label: 'Debt',       fmt: v => `${v > 0 ? '+' : ''}£${v}bn`, goodWhenPositive: false },
  { key: 'growth',      label: 'Growth',     fmt: v => `${v > 0 ? '+' : ''}${v}pp`,  goodWhenPositive: true  },
  { key: 'inflation',   label: 'Inflation',  fmt: v => `${v > 0 ? '+' : ''}${v}pp`,  goodWhenPositive: false },
  { key: 'healthIndex', label: 'Health',     fmt: v => `${v > 0 ? '+' : ''}${v}`,    goodWhenPositive: true  },
  { key: 'bondYield',   label: 'Bond Yield', fmt: v => `${v > 0 ? '+' : ''}${v}pp`,  goodWhenPositive: false },
];

function summarizeEffect(effect) {
  const rows = [];
  for (const { key, label, fmt, goodWhenPositive } of EFFECT_AXES) {
    if (effect[key] == null) continue;
    const v = effect[key];
    rows.push({ label, value: fmt(v), good: goodWhenPositive ? v > 0 : v < 0 });
  }
  if (effect.blocs) {
    const sorted = Object.entries(effect.blocs).sort((a, b) => b[1] - a[1]);
    for (const [bloc, delta] of sorted) {
      rows.push({
        label: BLOCS[bloc]?.name ?? bloc,
        value: `${delta > 0 ? '+' : ''}${delta}`,
        good: delta > 0,
      });
    }
  }
  return rows;
}

export function EventModal({ event, onChoice }) {
  const [expandedIdx, setExpandedIdx] = useState(null);
  if (!event) return null;
  const tone = event.tone;
  return (
    <div className="fixed inset-0 z-40 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-3">
      <div className="bg-stone-950 border-2 rounded-t-2xl sm:rounded-2xl max-w-md w-full p-5"
           style={{borderColor: tone === 'good' ? '#15803d' : tone === 'bad' ? '#9f1239' : '#78350f'}}>
        <div className="flex items-center gap-2 mb-3">
          <div className={`w-2 h-2 rounded-full animate-pulse ${
            tone === 'good' ? 'bg-emerald-500' : tone === 'bad' ? 'bg-rose-500' : 'bg-amber-500'
          }`} />
          <div className="text-[10px] uppercase tracking-[0.2em]" style={{
            color: tone === 'good' ? '#34d399' : tone === 'bad' ? '#fb7185' : '#fbbf24'
          }}>
            {tone === 'good' ? 'Opportunity' : tone === 'bad' ? 'Crisis' : 'Dispatch'}
          </div>
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
                      <div key={j} className="flex justify-between text-[11px]" style={{fontFamily: 'IBM Plex Mono'}}>
                        <span className="text-stone-400">{r.label}</span>
                        <span className={r.good ? 'text-emerald-400' : 'text-rose-400'}>{r.value}</span>
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
