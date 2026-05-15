import React, { useMemo } from 'react';
import { X, AlertCircle } from 'lucide-react';
import { BLOCS, CITATIONS, REFORM_BRANCHES, projectReformOutcome } from '../../model/index.js';
import { CitationLink, ConfidenceBadge } from '../primitives/CitationLink.jsx';

const unwrap = (leaf) => (leaf && typeof leaf === 'object' && 'value' in leaf) ? leaf.value : leaf;

export function InspectReform({ reform, forecastNoise, onClose }) {
  if (!reform) return null;

  const projection = useMemo(() => projectReformOutcome(reform, forecastNoise), [reform, forecastNoise]);

  const allCitations = useMemo(() => {
    const ids = new Set();
    if (reform.citationId) ids.add(reform.citationId);
    const walk = (node) => {
      if (!node || typeof node !== 'object') return;
      if ('citationId' in node) ids.add(node.citationId);
      if (Array.isArray(node)) { for (const x of node) walk(x); return; }
      for (const x of Object.values(node)) walk(x);
    };
    walk(reform.cost);
    walk(reform.passReq);
    walk(reform.onComplete);
    walk(reform.blocEffects);
    walk(reform.riskMods);
    return Array.from(ids);
  }, [reform]);

  return (
    <div className="fixed inset-0 z-40 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-3"
         onClick={onClose}>
      <div className="bg-stone-950 border-2 border-stone-700 rounded-t-2xl sm:rounded-2xl max-w-md w-full p-5 max-h-[90vh] overflow-y-auto"
           onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between mb-3">
          <div>
            <div className="text-[10px] uppercase tracking-[0.2em] text-amber-500 mb-1">{REFORM_BRANCHES[reform.branch]}</div>
            <div className="flex items-center gap-1.5">
              <h2 className="display-font text-xl font-medium leading-tight">{reform.name}</h2>
              {reform.controversial && <AlertCircle size={14} className="text-amber-500" />}
            </div>
          </div>
          <button onClick={onClose} className="text-stone-500"><X size={16} /></button>
        </div>
        <p className="text-stone-300 text-[12px] leading-relaxed mb-3">{reform.blurb}</p>

        {reform.citationId && CITATIONS[reform.citationId] && (
          <div className="bg-stone-900/60 rounded p-2 mb-3">
            <div className="text-[9px] uppercase tracking-wider text-stone-500 mb-1 flex items-center justify-between">
              <span>Evidence Base</span>
              <ConfidenceBadge confidence={CITATIONS[reform.citationId].confidence} />
            </div>
            <div className="text-[11px] text-stone-300 italic leading-snug">{CITATIONS[reform.citationId].note || CITATIONS[reform.citationId].title}</div>
            <div className="mt-1.5"><CitationLink id={reform.citationId} label="Full citation →" /></div>
          </div>
        )}

        <div className="grid grid-cols-3 gap-2 mb-3">
          <div className="bg-stone-900/40 rounded p-2">
            <div className="text-[9px] uppercase tracking-wider text-stone-500">Upfront</div>
            <div className="text-sm font-semibold text-stone-200 flex items-center gap-1" style={{fontFamily: 'IBM Plex Mono'}}>
              £{unwrap(reform.cost)}bn
              {reform.cost?.citationId && <CitationLink id={reform.cost.citationId} />}
            </div>
          </div>
          <div className="bg-stone-900/40 rounded p-2">
            <div className="text-[9px] uppercase tracking-wider text-stone-500">Duration</div>
            <div className="text-sm font-semibold text-stone-200" style={{fontFamily: 'IBM Plex Mono'}}>{reform.quarters}Q</div>
          </div>
          <div className="bg-stone-900/40 rounded p-2">
            <div className="text-[9px] uppercase tracking-wider text-stone-500">Capacity</div>
            <div className="text-sm font-semibold text-stone-200 flex items-center gap-1" style={{fontFamily: 'IBM Plex Mono'}}>
              Load {reform.capacityLoad ?? 1}
              <CitationLink id="reform_capacity_judgement" />
            </div>
          </div>
        </div>

        {projection && Object.keys(projection).length > 0 && (
          <div className="mb-3">
            <div className="text-[9px] uppercase tracking-wider text-stone-500 mb-1.5">Projected Outcome <span className="text-stone-600 normal-case">(±{(forecastNoise*100).toFixed(0)}% uncertainty)</span></div>
            <div className="space-y-1 text-[11px]" style={{fontFamily: 'IBM Plex Mono'}}>
              {projection.revBonus && <div><span className="text-stone-400">Revenue:</span> <span className="text-emerald-400">+£{projection.revBonus.low.toFixed(1)} to +£{projection.revBonus.high.toFixed(1)}bn pa</span> {reform.onComplete?.revBonus?.citationId && <CitationLink id={reform.onComplete.revBonus.citationId} className="ml-1" />}</div>}
              {projection.ongoingRev && <div><span className="text-stone-400">Ongoing revenue:</span> <span className={projection.ongoingRev.mid > 0 ? 'text-emerald-400' : 'text-rose-400'}>{projection.ongoingRev.low.toFixed(1)} to {projection.ongoingRev.high.toFixed(1)}bn pa</span> {reform.onComplete?.ongoingRev?.citationId && <CitationLink id={reform.onComplete.ongoingRev.citationId} className="ml-1" />}</div>}
              {projection.ongoingCost && <div><span className="text-stone-400">Ongoing cost:</span> <span className="text-rose-400">£{projection.ongoingCost.low.toFixed(1)} to £{projection.ongoingCost.high.toFixed(1)}bn pa</span> {reform.onComplete?.ongoingCost?.citationId && <CitationLink id={reform.onComplete.ongoingCost.citationId} className="ml-1" />}</div>}
              {projection.growthBonus && <div><span className="text-stone-400">Growth:</span> <span className={projection.growthBonus.mid > 0 ? 'text-emerald-400' : 'text-rose-400'}>{projection.growthBonus.low.toFixed(2)} to {projection.growthBonus.high.toFixed(2)}pp</span> {reform.onComplete?.growthBonus?.citationId && <CitationLink id={reform.onComplete.growthBonus.citationId} className="ml-1" />}</div>}
              {projection.gini && <div><span className="text-stone-400">Gini:</span> <span className={projection.gini.mid < 0 ? 'text-emerald-400' : 'text-rose-400'}>{projection.gini.low.toFixed(2)} to {projection.gini.high.toFixed(2)}</span> {reform.onComplete?.gini?.citationId && <CitationLink id={reform.onComplete.gini.citationId} className="ml-1" />}</div>}
              {projection.healthBoost && <div><span className="text-stone-400">Health Index:</span> <span className={projection.healthBoost.mid > 0 ? 'text-emerald-400' : 'text-rose-400'}>{projection.healthBoost.low.toFixed(1)} to {projection.healthBoost.high.toFixed(1)}</span> {reform.onComplete?.healthBoost?.citationId && <CitationLink id={reform.onComplete.healthBoost.citationId} className="ml-1" />}</div>}
            </div>
          </div>
        )}

        {reform.onComplete?.populationEffects && (
          <div className="mb-3">
            <div className="text-[9px] uppercase tracking-wider text-stone-500 mb-1.5">Demographic Effects</div>
            <div className="space-y-1">
              {Object.entries(reform.onComplete.populationEffects).map(([bloc, leaf]) => {
                const rate = unwrap(leaf);
                return (
                  <div key={bloc} className="flex justify-between text-[11px]" style={{fontFamily: 'IBM Plex Mono'}}>
                    <span className="text-stone-400">{BLOCS[bloc].name}</span>
                    <span className={rate > 0 ? 'text-emerald-400' : 'text-rose-400'}>{rate > 0 ? '+' : ''}{rate}% / quarter</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {reform.blocEffects && (
          <div>
            <div className="text-[9px] uppercase tracking-wider text-stone-500 mb-1.5">Immediate Bloc Reactions</div>
            <div className="space-y-1">
              {Object.entries(reform.blocEffects)
                .map(([bloc, leaf]) => [bloc, unwrap(leaf)])
                .sort((a,b) => b[1] - a[1])
                .map(([bloc, delta]) => (
                  <div key={bloc} className="flex justify-between text-[11px]" style={{fontFamily: 'IBM Plex Mono'}}>
                    <span className="text-stone-400">{BLOCS[bloc].name}</span>
                    <span className={delta > 0 ? 'text-emerald-400' : 'text-rose-400'}>{delta > 0 ? '+' : ''}{delta}</span>
                  </div>
                ))}
            </div>
          </div>
        )}

        {allCitations.length > 1 && (
          <div className="mt-3 pt-3 border-t border-stone-800">
            <div className="text-[9px] uppercase tracking-wider text-stone-500 mb-1.5">All citations for this reform</div>
            <div className="flex flex-wrap gap-1.5">
              {allCitations.map(id => (
                <CitationLink key={id} id={id} label={CITATIONS[id]?.title || id} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
