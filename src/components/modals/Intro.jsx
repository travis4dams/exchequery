import React from 'react';
import { Crown, ChevronRight, AlertCircle } from 'lucide-react';

const BRIEF_ITEMS = [
  {
    body: (
      <>
        <strong className="text-stone-100">Three win paths:</strong> an annual surplus, a deficit below 2% of GDP, or holding the coalition through the election.
      </>
    ),
  },
  {
    body: (
      <>
        Reform projections carry <strong className="text-stone-100">±25% uncertainty</strong>. Pass OBR Independence early to narrow the bands.
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
        Watch for the{' '}
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/30 text-amber-400 text-[11px] align-middle">
          <AlertCircle size={11} /> contested
        </span>{' '}
        chip — policies with disputed evidence.
      </>
    ),
  },
];

export function Intro({ onDismiss }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-end sm:items-center justify-center p-4">
      <div className="bg-gradient-to-b from-stone-950 to-stone-900 border border-amber-700/50 rounded-t-2xl sm:rounded-2xl max-w-md w-full p-7 sm:p-8 max-h-[90vh] overflow-y-auto">
        <div className="flex flex-col items-center text-center mb-6">
          <Crown size={28} className="text-amber-500 mb-2" />
          <div className="display-font text-[11px] uppercase tracking-[0.3em] text-amber-500">
            HM Treasury
          </div>
          <div className="flex items-center gap-3 w-3/5 mt-3">
            <div className="h-px flex-1 bg-amber-900/40" />
            <Crown size={10} className="text-amber-500/70" />
            <div className="h-px flex-1 bg-amber-900/40" />
          </div>
          <div className="text-[10px] uppercase tracking-[0.25em] text-stone-500 mt-3">
            Briefing · Q1 2026 · Incoming Chancellor
          </div>
        </div>

        <div className="text-center mb-6">
          <div className="display-font text-[15px] text-stone-300">You are the</div>
          <h1 className="display-font text-5xl font-medium italic text-amber-400 tracking-tight leading-none mt-1 mb-4">
            Chancellor.
          </h1>
          <p className="text-stone-300 text-[14px] leading-relaxed">
            Twenty quarters. One election. Win it and continue. Lose your coalition and resign.
          </p>
        </div>

        <div className="flex items-center gap-3 my-5">
          <div className="h-px flex-1 bg-amber-900/40" />
          <Crown size={10} className="text-amber-500/70" />
          <div className="h-px flex-1 bg-amber-900/40" />
        </div>

        <div className="text-[10px] uppercase tracking-[0.25em] text-stone-500 mb-3">The Brief</div>
        <div className="space-y-3 mb-6">
          {BRIEF_ITEMS.map((item, i) => (
            <div key={i} className="grid grid-cols-[auto_1fr] gap-3 items-start">
              <div className="flex-none w-5 h-5 rounded-full bg-amber-500/15 border border-amber-500/40 text-amber-400 text-[10px] font-semibold flex items-center justify-center mt-0.5">
                {i + 1}
              </div>
              <div className="text-stone-300 text-[13px] leading-relaxed">{item.body}</div>
            </div>
          ))}
        </div>

        <div className="border-t border-amber-900/30 pt-5 mt-6">
          <button
            onClick={onDismiss}
            className="w-full bg-amber-600 hover:bg-amber-500 text-stone-950 font-semibold py-3.5 rounded-md flex items-center justify-center gap-2 text-base tracking-wide"
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
