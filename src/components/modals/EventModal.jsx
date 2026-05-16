import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { BLOCS } from '../../model/index.js';
import { CitationLink } from '../primitives/CitationLink.jsx';
import { Modal } from '../primitives/Modal.jsx';

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

// event.tone → Modal tone + secondary chrome colour for the dot + label.
const TONE_MAP = {
  good: { modal: 'good', label: 'Opportunity', dotCls: 'bg-signal-good', labelCls: 'text-signal-good' },
  bad:  { modal: 'bad',  label: 'Crisis',      dotCls: 'bg-signal-bad',  labelCls: 'text-signal-bad' },
};
const DEFAULT_TONE = { modal: 'warn', label: 'Dispatch', dotCls: 'bg-accent-500', labelCls: 'text-accent-400' };

export function EventModal({ event, onChoice, briefIndex = 1, briefTotal = 1 }) {
  const [expandedIdx, setExpandedIdx] = useState(null);
  if (!event) return null;
  const tone = TONE_MAP[event.tone] || DEFAULT_TONE;
  const showRedBox = briefTotal > 1;
  return (
    <Modal tone={tone.modal} dismissOnBackdrop={false} z={40}>
      {showRedBox && (
        <div className="flex items-center gap-2 mb-2 pb-2 border-b border-treasury-800">
          <div className="text-[10px] uppercase tracking-[0.2em] text-signal-bad">
            Chancellor's Red Box
          </div>
          <div className="ml-auto text-[10px] uppercase tracking-[0.2em] text-stone-400 font-mono tabular-nums">
            Brief {briefIndex} of {briefTotal}
          </div>
        </div>
      )}
      <div className="flex items-center gap-2 mb-3">
        <div className={`w-2 h-2 rounded-full animate-pulse-soft ${tone.dotCls}`} aria-hidden />
        <div className={`text-[10px] uppercase tracking-[0.2em] ${tone.labelCls}`}>
          {tone.label}
        </div>
        {event.citationId && (
          <div className="ml-auto" onClick={(e) => e.stopPropagation()}>
            <CitationLink id={event.citationId} />
          </div>
        )}
      </div>
      <h2 className="font-display text-2xl font-medium leading-tight mb-3 text-stone-100">{event.title}</h2>
      <p className="text-stone-300 text-[13px] leading-relaxed mb-5">{event.body}</p>
      <div className="space-y-2">
        {event.choices.map((c, i) => {
          const isOpen = expandedIdx === i;
          const rows = summarizeEffect(c.effect);
          return (
            <button key={i} onClick={() => onChoice(c)}
                    className="w-full text-left bg-treasury-900 hover:bg-treasury-800 border border-treasury-700 hover:border-accent-700 transition-all p-3 rounded-md">
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
                  className="mt-2 pt-2 border-t border-treasury-700 space-y-1"
                  onClick={(e) => e.stopPropagation()}
                >
                  {rows.map((r, j) => (
                    <div key={j} className="flex justify-between items-center text-[11px] font-mono">
                      <span className="text-stone-400">{r.label}</span>
                      <span className="flex items-center gap-1.5">
                        <span className={`tabular-nums ${r.good ? 'text-signal-good' : 'text-signal-bad'}`}>{r.value}</span>
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
    </Modal>
  );
}
