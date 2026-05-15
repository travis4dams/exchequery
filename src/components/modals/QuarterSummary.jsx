import React from 'react';
import { Calendar, CheckCircle2, ArrowRight, AlertTriangle, ChevronRight } from 'lucide-react';
import { BLOCS } from '../../model/index.js';

export function QuarterSummary({ summary, growth, population, onContinue }) {
  if (!summary) return null;
  return (
    <div className="fixed inset-0 z-40 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-3">
      <div className="bg-stone-950 border-2 border-amber-900/60 rounded-t-2xl sm:rounded-2xl max-w-md w-full p-5 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center gap-2 mb-2">
          <Calendar size={14} className="text-amber-500" />
          <div className="text-[10px] uppercase tracking-[0.2em] text-amber-500">Quarter {summary.quarter} · Closing Report</div>
        </div>
        <h2 className="display-font text-2xl font-medium leading-tight mb-4"><span className="italic">A quarter, in review.</span></h2>

        <div className="space-y-2 mb-4">
          <div className="text-[10px] uppercase tracking-wider text-stone-500 mb-1">Economy</div>
          <div className="bg-stone-900/40 rounded p-3 space-y-2 text-[12px]" style={{fontFamily: 'IBM Plex Mono'}}>
            <div className="flex justify-between"><span className="text-stone-400">Real GDP change</span>
              <span className={summary.realGDPChange > 0 ? 'text-emerald-400' : 'text-rose-400'}>
                {summary.realGDPChange > 0 ? '+' : ''}£{summary.realGDPChange.toFixed(0)}bn
              </span></div>
            <div className="flex justify-between"><span className="text-stone-400">Real growth</span>
              <span className={growth > 1.5 ? 'text-emerald-400' : growth > 0 ? 'text-stone-300' : 'text-rose-400'}>
                {growth.toFixed(2)}% pa
              </span></div>
            <div className="flex justify-between"><span className="text-stone-400">Population</span>
              <span className="text-stone-300">{population.toFixed(1)}m ({summary.populationChange > 0 ? '+' : ''}{(summary.populationChange * 1000).toFixed(0)}k)</span></div>
            <div className="flex justify-between"><span className="text-stone-400">Deficit / GDP</span>
              <span className={summary.deficitGDP > 2 ? 'text-rose-400' : 'text-emerald-400'}>{summary.deficitGDP.toFixed(1)}%</span></div>
            <div className="flex justify-between"><span className="text-stone-400">Balance change</span>
              <span className={summary.balanceChange > 0 ? 'text-emerald-400' : 'text-rose-400'}>
                {summary.balanceChange > 0 ? '+' : ''}{summary.balanceChange.toFixed(0)}bn
              </span></div>
            <div className="flex justify-between"><span className="text-stone-400">Coalition cohesion</span>
              <span className={summary.cohesionChange > 0 ? 'text-emerald-400' : 'text-rose-400'}>
                {summary.cohesionChange > 0 ? '+' : ''}{summary.cohesionChange.toFixed(1)}pp
              </span></div>
            {summary.pcChange !== undefined && Math.abs(summary.pcChange) >= 0.5 && (
              <div className="flex justify-between"><span className="text-stone-400">Political capital</span>
                <span className={summary.pcChange > 0 ? 'text-emerald-400' : 'text-rose-400'}>
                  {summary.pcChange > 0 ? '+' : ''}{summary.pcChange.toFixed(1)}
                </span></div>
            )}
            {summary.pmRelationshipChange !== undefined && Math.abs(summary.pmRelationshipChange) >= 0.5 && (
              <div className="flex justify-between"><span className="text-stone-400">PM relationship</span>
                <span className={summary.pmRelationshipChange > 0 ? 'text-emerald-400' : 'text-rose-400'}>
                  {summary.pmRelationshipChange > 0 ? '+' : ''}{summary.pmRelationshipChange.toFixed(1)}
                </span></div>
            )}
            {summary.parliamentMoodChange !== undefined && Math.abs(summary.parliamentMoodChange) >= 0.5 && (
              <div className="flex justify-between"><span className="text-stone-400">Parliament mood</span>
                <span className={summary.parliamentMoodChange > 0 ? 'text-emerald-400' : 'text-rose-400'}>
                  {summary.parliamentMoodChange > 0 ? '+' : ''}{summary.parliamentMoodChange.toFixed(1)}pp
                </span></div>
            )}
            <div className="flex justify-between"><span className="text-stone-400">Health / Gini</span>
              <span className="text-stone-300">
                <span className={summary.healthChange > 0 ? 'text-emerald-400' : summary.healthChange < 0 ? 'text-rose-400' : ''}>{summary.healthChange > 0 ? '+' : ''}{summary.healthChange.toFixed(1)}</span>
                {' / '}
                <span className={summary.giniChange < 0 ? 'text-emerald-400' : summary.giniChange > 0 ? 'text-rose-400' : ''}>{summary.giniChange > 0 ? '+' : ''}{summary.giniChange.toFixed(2)}</span>
              </span></div>
          </div>
        </div>

        {summary.blocChanges.length > 0 && (
          <div className="mb-4">
            <div className="text-[10px] uppercase tracking-wider text-stone-500 mb-2">Biggest Bloc Support Movements</div>
            <div className="space-y-1.5">
              {summary.blocChanges.map(([id, change]) => (
                <div key={id} className="flex items-center justify-between bg-stone-900/40 rounded px-2 py-1.5">
                  <span className="text-[11px] text-stone-300">{BLOCS[id].name}</span>
                  <span className={`text-[11px] font-mono ${change > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {change > 0 ? '+' : ''}{change.toFixed(1)}pp
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
                <div key={id} className="flex items-center justify-between bg-stone-900/40 rounded px-2 py-1.5">
                  <span className="text-[11px] text-stone-300">{BLOCS[id].name}</span>
                  <span className={`text-[11px] font-mono ${change > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {change > 0 ? '+' : ''}{(change*100).toFixed(2)}% share
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
                <div key={name} className="flex items-center gap-1.5 text-[11px] text-emerald-300">
                  <CheckCircle2 size={10} /> Delivered: {name}
                </div>
              ))}
              {summary.startedReforms.map(name => (
                <div key={name} className="flex items-center gap-1.5 text-[11px] text-sky-300">
                  <ArrowRight size={10} /> Started: {name}
                </div>
              ))}
              {(summary.deferredForPC || []).map(name => (
                <div key={`pc-${name}`} className="flex items-center gap-1.5 text-[11px] text-amber-300">
                  <AlertTriangle size={10} /> Deferred (insufficient PC): {name}
                </div>
              ))}
            </div>
          </div>
        )}

        {summary.eventPending && (
          <div className="bg-rose-950/30 border border-rose-900/40 rounded p-2 mb-4">
            <div className="text-[11px] text-rose-300 flex items-center gap-1.5">
              <AlertTriangle size={11} /> A situation requires your attention.
            </div>
          </div>
        )}

        <button onClick={onContinue}
                className="w-full bg-amber-600 hover:bg-amber-500 text-stone-950 font-semibold py-2.5 rounded-md flex items-center justify-center gap-2 text-sm">
          Continue <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );
}
