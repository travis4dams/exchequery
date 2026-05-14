import React from 'react';
import { CheckCircle2, Clock, ArrowRight, Lock, AlertCircle, Eye, Undo2 } from 'lucide-react';

const unwrap = (leaf) => (leaf && typeof leaf === 'object' && 'value' in leaf) ? leaf.value : leaf;

export function ReformCard({ id, reform, status, isProposed, onPropose, onUnpropose, canStart, currentQ, coalitionCohesion, onInspect }) {
  const isInProgress = status?.status === 'inProgress';
  const isComplete = status?.status === 'complete';
  const progress = isInProgress ? ((currentQ - status.startedQ) / reform.quarters) : 0;
  const passReqCoal = unwrap(reform.passReq?.coalition) || 0;
  const meetsCoal = coalitionCohesion >= passReqCoal;
  const ctrl = reform.controversial;
  const cost = unwrap(reform.cost);

  return (
    <div className={`p-3 rounded-md border mb-2 transition-colors ${
      isComplete ? 'border-emerald-700/50 bg-emerald-950/15' :
      isInProgress ? 'border-amber-700/50 bg-amber-950/15' :
      isProposed ? 'border-sky-700/60 bg-sky-950/20' :
      canStart && meetsCoal ? 'border-stone-700 bg-stone-900/40' :
      'border-stone-800 bg-stone-950/40 opacity-60'
    }`}>
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5">
            {isComplete && <CheckCircle2 size={11} className="text-emerald-500 flex-shrink-0" />}
            {isInProgress && <Clock size={11} className="text-amber-500 flex-shrink-0" />}
            {isProposed && <ArrowRight size={11} className="text-sky-400 flex-shrink-0" />}
            {!isComplete && !isInProgress && !isProposed && !canStart && <Lock size={11} className="text-stone-600 flex-shrink-0" />}
            {ctrl && !isComplete && !isInProgress && !isProposed && <AlertCircle size={10} className="text-amber-500 flex-shrink-0" title="Contested policy" />}
            <span className={`text-[12px] font-semibold ${
              isComplete ? 'text-emerald-300' :
              isInProgress ? 'text-amber-300' :
              isProposed ? 'text-sky-300' : 'text-stone-200'
            }`}>{reform.name}</span>
          </div>
          <div className="text-[10px] text-stone-500 leading-snug">{reform.blurb}</div>
        </div>
      </div>
      {isInProgress && (
        <div className="mb-2">
          <div className="h-1 bg-stone-800 rounded-full overflow-hidden">
            <div className="h-full bg-amber-500" style={{width: `${progress * 100}%`}} />
          </div>
          <div className="text-[10px] text-stone-500 mt-1">
            {reform.quarters - (currentQ - status.startedQ)}Q remaining of {reform.quarters}Q
          </div>
        </div>
      )}
      {isProposed && (
        <div className="mb-2 flex items-center justify-between bg-sky-950/30 rounded px-2 py-1">
          <span className="text-[10px] text-sky-300">Queued — starts next quarter</span>
          <button onClick={onUnpropose} className="text-[10px] text-sky-300 hover:text-sky-200 flex items-center gap-1">
            <Undo2 size={9} /> Undo
          </button>
        </div>
      )}
      {!isComplete && !isInProgress && !isProposed && (
        <div className="flex items-center justify-between mt-2 pt-2 border-t border-stone-800">
          <div className="text-[10px] text-stone-500">
            £{cost}bn · {reform.quarters}Q
            {passReqCoal > 0 && (
              <span className={meetsCoal ? 'text-stone-500 ml-2' : 'text-rose-500 ml-2'}>
                · {passReqCoal}% coal.
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            <button onClick={onInspect} className="text-stone-500 hover:text-stone-300">
              <Eye size={12} />
            </button>
            <button onClick={onPropose} disabled={!canStart || !meetsCoal}
              className="text-[11px] font-semibold px-3 py-1 rounded bg-amber-600 hover:bg-amber-500 disabled:bg-stone-800 disabled:text-stone-600 text-stone-950">
              Propose
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
