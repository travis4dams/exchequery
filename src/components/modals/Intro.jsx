import React from 'react';
import { Crown, ChevronRight, AlertCircle } from 'lucide-react';

export function Intro({ onDismiss }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-end sm:items-center justify-center p-4">
      <div className="bg-stone-950 border border-amber-900/40 rounded-t-2xl sm:rounded-2xl max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center gap-2 mb-3">
          <Crown size={20} className="text-amber-500" />
          <div className="text-[10px] uppercase tracking-[0.2em] text-amber-500">HM Treasury · Q1 2026</div>
        </div>
        <h1 className="display-font text-3xl font-medium leading-tight mb-3">
          You are the<br/><span className="italic text-amber-400">Chancellor</span>.
        </h1>
        <p className="text-stone-300 text-[13px] leading-relaxed mb-3">
          Twenty quarters (5 years) to the next election. Win it and continue. Lose your coalition, and resign.
        </p>
        <div className="space-y-2 text-[12px] text-stone-400 mb-5">
          <div className="flex gap-2"><span className="text-amber-500">·</span> <strong>Three win paths:</strong> annual surplus, deficit below 2% of GDP, or hold the coalition through the election.</div>
          <div className="flex gap-2"><span className="text-amber-500">·</span> Reform projections come with <strong>±25% uncertainty</strong>. Pass OBR Independence early to narrow the bands.</div>
          <div className="flex gap-2"><span className="text-amber-500">·</span> Voter bloc populations <strong>shift over time</strong> based on demographics and immigration policy.</div>
          <div className="flex gap-2"><span className="text-amber-500">·</span> Watch for <AlertCircle size={11} className="inline text-amber-500" /> — contested policies with disputed evidence.</div>
        </div>
        <button onClick={onDismiss}
                className="w-full bg-amber-600 hover:bg-amber-500 text-stone-950 font-semibold py-3 rounded-md flex items-center justify-center gap-2">
          Take Office <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}
