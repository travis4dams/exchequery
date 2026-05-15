import React, { useState, useRef, useEffect } from 'react';
import { CheckCircle2, Clock, ArrowRight, Lock, AlertCircle, Eye, Undo2, XCircle } from 'lucide-react';

const unwrap = (leaf) => (leaf && typeof leaf === 'object' && 'value' in leaf) ? leaf.value : leaf;

function stanceTag(stance) {
  if (!stance) return null;
  const labels = [];
  if (stance.econ <= -0.4) labels.push('econ-left');
  else if (stance.econ >= 0.4) labels.push('econ-right');
  if (stance.social <= -0.4) labels.push('liberal');
  else if (stance.social >= 0.4) labels.push('conservative');
  if (labels.length === 0) return null;
  return labels.join(' · ');
}

export function ReformCard({
  id, reform, status, isProposed, onPropose, onUnpropose, onCancel,
  canStart, prereqMet = true, fitsCapacity = true, load = 1,
  currentQ, coalitionCohesion, onInspect,
  pcBreakdown, canAffordPc = true, availablePc = 100,
}) {
  const isInProgress = status?.status === 'inProgress';
  const isComplete = status?.status === 'complete';
  const progress = isInProgress ? ((currentQ - status.startedQ) / reform.quarters) : 0;
  const passReqCoal = unwrap(reform.passReq?.coalition) || 0;
  const meetsCoal = coalitionCohesion >= passReqCoal;
  const ctrl = reform.controversial;
  const cost = unwrap(reform.cost);
  const capacityBlocked = !isComplete && !isInProgress && !isProposed && prereqMet && meetsCoal && !fitsCapacity;

  const [confirmCancel, setConfirmCancel] = useState(false);
  const confirmTimer = useRef(null);
  useEffect(() => () => { if (confirmTimer.current) clearTimeout(confirmTimer.current); }, []);
  const handleCancel = () => {
    if (!confirmCancel) {
      setConfirmCancel(true);
      confirmTimer.current = setTimeout(() => setConfirmCancel(false), 3000);
      return;
    }
    clearTimeout(confirmTimer.current);
    setConfirmCancel(false);
    onCancel?.();
  };

  return (
    <div className={`p-3 rounded-md border mb-2 transition-colors ${
      isComplete ? 'border-emerald-700/50 bg-emerald-950/15' :
      isInProgress ? 'border-amber-700/50 bg-amber-950/15' :
      isProposed ? 'border-sky-700/60 bg-sky-950/20' :
      capacityBlocked ? 'border-stone-700/70 bg-stone-800/30 opacity-75' :
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
          <div className="flex items-center justify-between mt-1">
            <div className="text-[10px] text-stone-500">
              {reform.quarters - (currentQ - status.startedQ)}Q remaining of {reform.quarters}Q · Load {load}
            </div>
            <div className="flex items-center gap-2">
              {onInspect && (
                <button onClick={onInspect} className="text-stone-500 hover:text-stone-300" title="Inspect reform">
                  <Eye size={12} />
                </button>
              )}
              {onCancel && (
                <button onClick={handleCancel}
                  className={`text-[10px] flex items-center gap-1 ${confirmCancel ? 'text-rose-300' : 'text-stone-500 hover:text-rose-400'}`}>
                  <XCircle size={9} /> {confirmCancel ? 'Tap to confirm' : 'Cancel'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
      {isProposed && (
        <div className="mb-2 flex items-center justify-between bg-sky-950/30 rounded px-2 py-1">
          <span className="text-[10px] text-sky-300">Queued · Load {load} · starts next quarter</span>
          <button onClick={onUnpropose} className="text-[10px] text-sky-300 hover:text-sky-200 flex items-center gap-1">
            <Undo2 size={9} /> Undo
          </button>
        </div>
      )}
      {!isComplete && !isInProgress && !isProposed && (
        <div className="mt-2 pt-2 border-t border-stone-800">
          <div className="flex items-center justify-between">
            <div className="text-[10px] text-stone-500">
              £{cost}bn · {reform.quarters}Q
              {passReqCoal > 0 && (
                <span className={meetsCoal ? 'text-stone-500 ml-2' : 'text-amber-500 ml-2'}>
                  · {passReqCoal}% coal.{!meetsCoal ? ' (×1.5)' : ''}
                </span>
              )}
              <span className={capacityBlocked ? 'text-rose-400 ml-2' : 'text-stone-500 ml-2'}>· Load {load}</span>
              {pcBreakdown && (
                <span
                  className={`ml-2 ${canAffordPc ? 'text-amber-400' : 'text-rose-400'}`}
                  title={`Base ${pcBreakdown.base} × ${pcBreakdown.rebellionFactor.toFixed(2)} rebellion${pcBreakdown.cohesionTriggered ? ` × ${pcBreakdown.cohesionFactor.toFixed(2)} cohesion` : ''} (${pcBreakdown.opposed}/${pcBreakdown.govTotal} MPs opposed)`}
                >
                  · {pcBreakdown.total.toFixed(0)} PC
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5">
              <button onClick={onInspect} className="text-stone-500 hover:text-stone-300">
                <Eye size={12} />
              </button>
              <button onClick={onPropose} disabled={!canStart || !meetsCoal || !canAffordPc}
                className="text-[11px] font-semibold px-3 py-1 rounded bg-amber-600 hover:bg-amber-500 disabled:bg-stone-800 disabled:text-stone-600 text-stone-950">
                Propose
              </button>
            </div>
          </div>
          {reform.ideologyStance && stanceTag(reform.ideologyStance) && (
            <div className="text-[9px] text-stone-600 mt-1 uppercase tracking-wider">
              Stance: {stanceTag(reform.ideologyStance)}
            </div>
          )}
        </div>
      )}
      {capacityBlocked && (
        <div className="text-[10px] text-amber-400/80 mt-1.5">No capacity — too many reforms in flight.</div>
      )}
      {!canAffordPc && !isComplete && !isInProgress && !isProposed && (
        <div className="text-[10px] text-rose-400/80 mt-1.5">
          Insufficient political capital — need {pcBreakdown?.total.toFixed(0)}, have {availablePc.toFixed(0)}.
        </div>
      )}
    </div>
  );
}
