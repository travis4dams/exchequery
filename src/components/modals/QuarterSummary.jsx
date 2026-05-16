import React from 'react';
import { Calendar, CheckCircle2, ArrowRight, AlertTriangle, ChevronRight } from 'lucide-react';
import { BLOCS } from '../../model/index.js';
import { Modal } from '../primitives/Modal.jsx';

// Small inline row primitive — caller computes the tone and the display string,
// this just lays out label-left, value-right with tabular nums. Used ~15 times
// in the Economy block alone.
function DeltaRow({ label, value, tone = 'neutral' }) {
  const cls = tone === 'good' ? 'text-signal-good'
    : tone === 'bad' ? 'text-signal-bad'
    : 'text-stone-300';
  return (
    <div className="flex justify-between">
      <span className="text-stone-400">{label}</span>
      <span className={`tabular-nums ${cls}`}>{value}</span>
    </div>
  );
}

const signed = (n, decimals = 2) => `${n > 0 ? '+' : ''}${n.toFixed(decimals)}`;

export function QuarterSummary({ summary, growth, population, onContinue }) {
  if (!summary) return null;
  return (
    <Modal tone="warn" dismissOnBackdrop={false} z={40}>
      <div className="flex items-center gap-2 mb-2">
        <Calendar size={14} className="text-accent-500" />
        <div className="text-[10px] uppercase tracking-[0.2em] text-accent-500">Quarter {summary.quarter} · Closing Report</div>
      </div>
      <h2 className="font-display text-2xl font-medium leading-tight mb-4 text-stone-100"><span className="italic">A quarter, in review.</span></h2>

      <div className="space-y-2 mb-4">
        <div className="text-[10px] uppercase tracking-wider text-stone-500 mb-1">Economy</div>
        <div className="bg-treasury-900/40 rounded p-3 space-y-2 text-[12px] font-mono">
          <DeltaRow label="Real GDP change"
                    value={`${summary.realGDPChange > 0 ? '+' : ''}£${summary.realGDPChange.toFixed(0)}bn`}
                    tone={summary.realGDPChange > 0 ? 'good' : 'bad'} />
          <DeltaRow label="Real growth"
                    value={`${growth.toFixed(2)}% pa`}
                    tone={growth > 1.5 ? 'good' : growth > 0 ? 'neutral' : 'bad'} />
          <DeltaRow label="Population"
                    value={`${population.toFixed(1)}m (${summary.populationChange > 0 ? '+' : ''}${(summary.populationChange * 1000).toFixed(0)}k)`} />
          <DeltaRow label="Deficit / GDP"
                    value={`${summary.deficitGDP.toFixed(1)}%`}
                    tone={summary.deficitGDP > 2 ? 'bad' : 'good'} />
          <DeltaRow label="Balance change"
                    value={`${summary.balanceChange > 0 ? '+' : ''}${summary.balanceChange.toFixed(0)}bn`}
                    tone={summary.balanceChange > 0 ? 'good' : 'bad'} />
          <DeltaRow label="Coalition cohesion"
                    value={`${signed(summary.cohesionChange, 1)}pp`}
                    tone={summary.cohesionChange > 0 ? 'good' : 'bad'} />
          {summary.pcChange !== undefined && Math.abs(summary.pcChange) >= 0.5 && (
            <DeltaRow label="Political capital"
                      value={signed(summary.pcChange, 1)}
                      tone={summary.pcChange > 0 ? 'good' : 'bad'} />
          )}
          {summary.pmRelationshipChange !== undefined && Math.abs(summary.pmRelationshipChange) >= 0.5 && (
            <DeltaRow label="PM relationship"
                      value={signed(summary.pmRelationshipChange, 1)}
                      tone={summary.pmRelationshipChange > 0 ? 'good' : 'bad'} />
          )}
          {summary.parliamentMoodChange !== undefined && Math.abs(summary.parliamentMoodChange) >= 0.5 && (
            <DeltaRow label="Parliament mood"
                      value={`${signed(summary.parliamentMoodChange, 1)}pp`}
                      tone={summary.parliamentMoodChange > 0 ? 'good' : 'bad'} />
          )}
          <div className="flex justify-between">
            <span className="text-stone-400">Health / Gini</span>
            <span className="text-stone-300">
              <span className={`tabular-nums ${summary.healthChange > 0 ? 'text-signal-good' : summary.healthChange < 0 ? 'text-signal-bad' : ''}`}>{signed(summary.healthChange, 1)}</span>
              {' / '}
              <span className={`tabular-nums ${summary.giniChange < 0 ? 'text-signal-good' : summary.giniChange > 0 ? 'text-signal-bad' : ''}`}>{signed(summary.giniChange, 2)}</span>
            </span>
          </div>
          {summary.inflationChange !== undefined && (
            <DeltaRow label="Inflation Δ"
                      value={`${signed(summary.inflationChange, 2)}pp`}
                      tone={Math.abs(summary.inflationChange) < 0.05 ? 'neutral' : summary.inflationChange < 0 ? 'good' : 'bad'} />
          )}
          {summary.unemploymentChange !== undefined && (
            <DeltaRow label="Unemployment Δ"
                      value={`${signed(summary.unemploymentChange, 2)}pp`}
                      tone={Math.abs(summary.unemploymentChange) < 0.05 ? 'neutral' : summary.unemploymentChange < 0 ? 'good' : 'bad'} />
          )}
          {summary.bankRateChange !== undefined && Math.abs(summary.bankRateChange) >= 0.02 && (
            <DeltaRow label="Bank Rate Δ"
                      value={`${signed(summary.bankRateChange, 2)}pp`}
                      tone={summary.bankRateChange > 0 ? 'bad' : 'good'} />
          )}
        </div>
      </div>

      {summary.blocChanges.length > 0 && (
        <div className="mb-4">
          <div className="text-[10px] uppercase tracking-wider text-stone-500 mb-2">Biggest Bloc Support Movements</div>
          <div className="space-y-1.5">
            {summary.blocChanges.map(([id, change]) => (
              <div key={id} className="flex items-center justify-between bg-treasury-900/40 rounded px-2 py-1.5">
                <span className="text-[11px] text-stone-300">{BLOCS[id].name}</span>
                <span className={`text-[11px] font-mono tabular-nums ${change > 0 ? 'text-signal-good' : 'text-signal-bad'}`}>
                  {signed(change, 1)}pp
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {summary.weightChanges.length > 0 && (
        <div className="mb-4">
          <div className="text-[10px] uppercase tracking-wider text-stone-500 mb-2">Demographic Shifts</div>
          <div className="space-y-1.5">
            {summary.weightChanges.map(([id, change]) => (
              <div key={id} className="flex items-center justify-between bg-treasury-900/40 rounded px-2 py-1.5">
                <span className="text-[11px] text-stone-300">{BLOCS[id].name}</span>
                <span className={`text-[11px] font-mono tabular-nums ${change > 0 ? 'text-signal-good' : 'text-signal-bad'}`}>
                  {`${change > 0 ? '+' : ''}${(change*100).toFixed(2)}% share`}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {(summary.startedReforms.length > 0 || summary.completedReforms.length > 0) && (
        <div className="mb-4">
          <div className="text-[10px] uppercase tracking-wider text-stone-500 mb-2">Reform Programme</div>
          <div className="space-y-1">
            {summary.completedReforms.map(name => (
              <div key={name} className="flex items-center gap-1.5 text-[11px] text-signal-good">
                <CheckCircle2 size={10} /> Delivered: {name}
              </div>
            ))}
            {summary.startedReforms.map(name => (
              <div key={name} className="flex items-center gap-1.5 text-[11px] text-signal-info">
                <ArrowRight size={10} /> Started: {name}
              </div>
            ))}
            {(summary.deferredForPC || []).map(name => (
              <div key={`pc-${name}`} className="flex items-center gap-1.5 text-[11px] text-accent-300">
                <AlertTriangle size={10} /> Deferred (insufficient PC): {name}
              </div>
            ))}
          </div>
        </div>
      )}

      {summary.eventPending && (
        <div className="bg-rose-950/30 border border-rose-900/40 rounded p-2 mb-4">
          <div className="text-[11px] text-signal-bad flex items-center gap-1.5">
            <AlertTriangle size={11} /> A situation requires your attention.
          </div>
        </div>
      )}

      <button onClick={onContinue}
              className="w-full bg-accent-600 hover:bg-accent-500 active:bg-accent-700 text-treasury-950 font-semibold py-2.5 rounded-md flex items-center justify-center gap-2 text-sm transition-colors">
        Continue <ChevronRight size={14} />
      </button>
    </Modal>
  );
}
