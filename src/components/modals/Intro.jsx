import React, { useEffect } from 'react';
import { Crown, ChevronRight, AlertCircle } from 'lucide-react';

const BRIEF_ITEMS = [
  {
    body: (
      <>
        <strong className="text-stone-100">Two win paths:</strong> a deficit below 2% of GDP, or getting re-elected.
      </>
    ),
  },
  {
    body: (
      <>
        Voter bloc populations <strong className="text-stone-100">shift over time</strong> with demographics and immigration policy.
      </>
    ),
  },
  {
    body: (
      <>
        Watch for the <AlertCircle size={12} className="inline-block align-[-2px] text-accent-400" /> contested symbol — policies with disputed evidence.
      </>
    ),
  },
];

// Intro keeps bespoke HMT-briefing chrome (gradient bg, crown ornaments,
// double-rule dividers) rather than using the Modal primitive — its
// aesthetic is too specific to share a base.
export function Intro({ onDismiss }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onDismiss(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onDismiss]);

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-end sm:items-center justify-center p-4">
      <div className="bg-gradient-to-b from-treasury-950 to-treasury-900 border border-accent-700/50 rounded-t-2xl sm:rounded-card max-w-md w-full p-7 sm:p-8 max-h-[90vh] overflow-y-auto shadow-card-elevated"
           role="dialog" aria-modal="true">
        <div className="flex flex-col items-center text-center mb-6">
          <Crown size={28} className="text-accent-500 mb-2" />
          <div className="font-display text-[11px] uppercase tracking-[0.3em] text-accent-500">
            HM Treasury
          </div>
          <div className="flex items-center gap-3 w-3/5 mt-3">
            <div className="h-px flex-1 bg-accent-700/40" />
            <Crown size={10} className="text-accent-500/70" />
            <div className="h-px flex-1 bg-accent-700/40" />
          </div>
          <div className="text-[10px] uppercase tracking-[0.25em] text-stone-500 mt-3">
            Briefing · Q1 2026 · Incoming Chancellor
          </div>
        </div>

        <div className="text-center mb-6">
          <div className="font-display text-[15px] text-stone-300">You are the</div>
          <h1 className="font-display text-5xl font-medium italic text-accent-400 tracking-tight leading-none mt-1 mb-4">
            Chancellor.
          </h1>
          <p className="text-stone-300 text-[14px] leading-relaxed">
            Twenty quarters. One election. Win it and continue. Lose your coalition and resign.
          </p>
        </div>

        <div className="flex items-center gap-3 my-5">
          <div className="h-px flex-1 bg-accent-700/40" />
          <Crown size={10} className="text-accent-500/70" />
          <div className="h-px flex-1 bg-accent-700/40" />
        </div>

        <div className="text-[10px] uppercase tracking-[0.25em] text-stone-500 mb-3">The Brief</div>
        <div className="space-y-3 mb-6">
          {BRIEF_ITEMS.map((item, i) => (
            <div key={i} className="grid grid-cols-[auto_1fr] gap-3 items-start">
              <div className="flex-none w-5 h-5 rounded-full bg-accent-500/15 border border-accent-500/40 text-accent-400 text-[10px] font-mono font-semibold flex items-center justify-center mt-0.5 tabular-nums">
                {i + 1}
              </div>
              <div className="text-stone-300 text-[13px] leading-relaxed">{item.body}</div>
            </div>
          ))}
        </div>

        <div className="border-t border-accent-700/30 pt-5 mt-6">
          <button
            onClick={onDismiss}
            className="w-full bg-accent-600 hover:bg-accent-500 active:bg-accent-700 text-treasury-950 font-semibold py-3.5 rounded-md flex items-center justify-center gap-2 text-base tracking-wide transition-colors shadow-glow-amber"
          >
            Take Office <ChevronRight size={18} />
          </button>
          <div className="text-[10px] uppercase tracking-[0.25em] text-stone-500 mt-3 text-center">
            Press to begin the term
          </div>
        </div>
      </div>
    </div>
  );
}
