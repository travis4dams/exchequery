import React, { useState, useRef, useEffect } from 'react';
import { CheckCircle2, Clock, ArrowRight, Lock, AlertCircle, Eye, Undo2, XCircle } from 'lucide-react';
import { Card } from './Card.jsx';
import { MeterBar } from './MeterBar.jsx';

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

// State → Card tone mapping. Mirrors the bordered/tinted treatment the
// old hardcoded class branches gave each lifecycle state.
function pickTone({ isComplete, isInProgress, isProposed, capacityBlocked, canStart, meetsCoal }) {
  if (isComplete)        return { tone: 'good', titleColor: 'text-signal-good' };
  if (isInProgress)      return { tone: 'warn', titleColor: 'text-accent-300' };
  if (isProposed)        return { tone: 'info', titleColor: 'text-signal-info' };
  if (capacityBlocked)   return { tone: 'neutral', titleColor: 'text-stone-300', dim: true };
  if (canStart && meetsCoal) return { tone: 'neutral', titleColor: 'text-stone-200' };
  return { tone: 'neutral', titleColor: 'text-stone-400', dim: true };
}

export function ReformCard({
  id, reform, status, isProposed, onPropose, onUnpropose, onCancel,
  canStart, prereqMet = true, fitsCapacity = true, load = 1,
  currentQ, coalitionCohesion, onInspect,
  pcBreakdown, canAffordPc = true, availablePc = 100,
}) {
  const isInProgress = status?.status === 'inProgress';
  const isComplete = status?.status === 'complete';
  const progress = isInProgress ? ((currentQ - status.startedQ) / reform.quarters) * 100 : 0;
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

  const { tone, titleColor, dim } = pickTone({
    isComplete, isInProgress, isProposed, capacityBlocked, canStart, meetsCoal,
  });

  const capColor = capacityBlocked ? 'text-signal-bad' : 'text-stone-200';
  const pcColor = !pcBreakdown ? 'text-stone-200'
    : !canAffordPc ? 'text-signal-bad'
    : 'text-accent-400';
  const pcTitle = pcBreakdown
    ? `Base ${pcBreakdown.base} × ${pcBreakdown.rebellionFactor.toFixed(2)} rebellion${pcBreakdown.cohesionTriggered ? ` × ${pcBreakdown.cohesionFactor.toFixed(2)} cohesion` : ''} (${pcBreakdown.opposed}/${pcBreakdown.govTotal} MPs opposed)`
    : undefined;

  return (
    <Card variant="signal" tone={tone} padding="md"
          className={`mb-2 ${dim ? 'opacity-70' : ''}`}>
      <div className="flex items-start justify-between gap-3 mb-1.5">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5">
            {isComplete    && <CheckCircle2 size={11} className="text-signal-good flex-shrink-0" />}
            {isInProgress  && <Clock size={11} className="text-accent-400 flex-shrink-0" />}
            {isProposed    && <ArrowRight size={11} className="text-signal-info flex-shrink-0" />}
            {!isComplete && !isInProgress && !isProposed && !canStart && (
              <Lock size={11} className="text-stone-600 flex-shrink-0" />
            )}
            {ctrl && !isComplete && !isInProgress && !isProposed && (
              <AlertCircle size={10} className="text-accent-500 flex-shrink-0" title="Contested policy" />
            )}
            <span className={`text-[12px] md:text-[13px] font-semibold ${titleColor}`}>{reform.name}</span>
          </div>
          <div className="text-[10px] md:text-[11px] text-stone-500 leading-snug">{reform.blurb}</div>
        </div>
        {/* Cap + PC cluster — always in the top-right of unfinished cards so
            costs are scannable down the list. */}
        {!isComplete && (
          <div className="flex items-stretch gap-2 flex-shrink-0">
            <div className="text-center min-w-[28px]" title="Reform capacity load">
              <div className="text-[9px] uppercase tracking-wider text-stone-500 leading-tight">Cap</div>
              <div className={`text-[15px] font-mono font-semibold tabular-nums leading-tight ${capColor}`}>{load}</div>
            </div>
            <div className="w-px bg-treasury-800 self-stretch" aria-hidden />
            <div className="text-center min-w-[32px]" title={pcTitle}>
              <div className="text-[9px] uppercase tracking-wider text-stone-500 leading-tight">PC</div>
              <div className={`text-[15px] font-mono font-semibold tabular-nums leading-tight ${pcColor}`}>
                {pcBreakdown ? pcBreakdown.total.toFixed(0) : '—'}
              </div>
            </div>
          </div>
        )}
      </div>

      {isInProgress && (
        <div className="mb-2">
          <MeterBar value={progress} tone="warn" />
          <div className="flex items-center justify-between mt-1.5">
            <div className="text-[10px] text-stone-500 font-mono tabular-nums">
              {reform.quarters - (currentQ - status.startedQ)}Q remaining of {reform.quarters}Q
            </div>
            <div className="flex items-center gap-2">
              {onInspect && (
                <button onClick={onInspect}
                        className="text-stone-500 hover:text-stone-200 transition-colors"
                        title="Inspect reform">
                  <Eye size={12} />
                </button>
              )}
              {onCancel && (
                <button onClick={handleCancel}
                  className={`text-[10px] flex items-center gap-1 transition-colors ${confirmCancel ? 'text-signal-bad' : 'text-stone-500 hover:text-signal-bad'}`}>
                  <XCircle size={9} /> {confirmCancel ? 'Tap to confirm' : 'Cancel'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {isProposed && (
        <div className="mb-2 flex items-center justify-between bg-sky-950/30 rounded-md px-2 py-1">
          <span className="text-[10px] text-signal-info">Queued · starts next quarter</span>
          <button onClick={onUnpropose} className="text-[10px] text-signal-info hover:text-sky-200 flex items-center gap-1 transition-colors">
            <Undo2 size={9} /> Undo
          </button>
        </div>
      )}

      {!isComplete && !isInProgress && !isProposed && (
        <div className="mt-2 pt-2 border-t border-treasury-800/70">
          <div className="flex items-center justify-between gap-2">
            <div className="text-[10px] text-stone-500 font-mono">
              £{cost}bn · {reform.quarters}Q
              {passReqCoal > 0 && (
                <span className={meetsCoal ? 'text-stone-500 ml-2' : 'text-accent-500 ml-2'}>
                  · {passReqCoal}% coal.{!meetsCoal ? ' (×1.5)' : ''}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <button onClick={onInspect}
                      className="text-stone-500 hover:text-stone-200 transition-colors">
                <Eye size={12} />
              </button>
              <button onClick={onPropose} disabled={!canStart || !meetsCoal || !canAffordPc}
                className="text-[11px] font-semibold px-3 py-1 rounded bg-accent-600 hover:bg-accent-500 active:bg-accent-700 disabled:bg-treasury-800 disabled:text-stone-600 text-treasury-950 transition-colors">
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
        <div className="text-[10px] text-accent-400/80 mt-1.5">No capacity — too many reforms in flight.</div>
      )}
      {!canAffordPc && !isComplete && !isInProgress && !isProposed && (
        <div className="text-[10px] text-signal-bad mt-1.5">
          Insufficient political capital — need {pcBreakdown?.total.toFixed(0)}, have {availablePc.toFixed(0)}.
        </div>
      )}
    </Card>
  );
}
