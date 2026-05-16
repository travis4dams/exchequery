import React, { useMemo } from 'react';
import { AlertCircle } from 'lucide-react';
import { BLOCS, CITATIONS, REFORM_BRANCHES, projectReformOutcome } from '../../model/index.js';
import { CitationLink, ConfidenceBadge } from '../primitives/CitationLink.jsx';
import { Modal } from '../primitives/Modal.jsx';

const unwrap = (leaf) => (leaf && typeof leaf === 'object' && 'value' in leaf) ? leaf.value : leaf;

export function InspectReform({ reform, forecastMultiplier = 1, onClose }) {
  if (!reform) return null;

  const projection = useMemo(() => projectReformOutcome(reform, forecastMultiplier), [reform, forecastMultiplier]);

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
    <Modal tone="neutral" onClose={onClose} showCloseButton z={40} className="relative">
      <div className="mb-3 pr-6">
        <div className="text-[10px] uppercase tracking-[0.2em] text-accent-500 mb-1">{REFORM_BRANCHES[reform.branch]}</div>
        <div className="flex items-center gap-1.5">
          <h2 className="font-display text-xl font-medium leading-tight text-stone-100">{reform.name}</h2>
          {reform.controversial && <AlertCircle size={14} className="text-accent-500" />}
        </div>
      </div>
      <p className="text-stone-300 text-[12px] leading-relaxed mb-3">{reform.blurb}</p>

      {reform.citationId && CITATIONS[reform.citationId] && (
        <div className="bg-treasury-900/60 rounded p-2 mb-3">
          <div className="text-[9px] uppercase tracking-wider text-stone-500 mb-1 flex items-center justify-between">
            <span>Evidence Base</span>
            <ConfidenceBadge confidence={CITATIONS[reform.citationId].confidence} />
          </div>
          <div className="text-[11px] text-stone-300 italic leading-snug">{CITATIONS[reform.citationId].note || CITATIONS[reform.citationId].title}</div>
          <div className="mt-1.5"><CitationLink id={reform.citationId} label="Full citation →" /></div>
        </div>
      )}

      <div className="grid grid-cols-3 gap-2 mb-3">
        <div className="bg-treasury-900/40 rounded p-2">
          <div className="text-[9px] uppercase tracking-wider text-stone-500">Upfront</div>
          <div className="text-sm font-semibold text-stone-200 font-mono tabular-nums flex items-center gap-1">
            £{unwrap(reform.cost)}bn
            {reform.cost?.citationId && <CitationLink id={reform.cost.citationId} />}
          </div>
        </div>
        <div className="bg-treasury-900/40 rounded p-2">
          <div className="text-[9px] uppercase tracking-wider text-stone-500">Duration</div>
          <div className="text-sm font-semibold text-stone-200 font-mono tabular-nums">{reform.quarters}Q</div>
        </div>
        <div className="bg-treasury-900/40 rounded p-2">
          <div className="text-[9px] uppercase tracking-wider text-stone-500">Capacity</div>
          <div className="text-sm font-semibold text-stone-200 font-mono tabular-nums flex items-center gap-1">
            Load {reform.capacityLoad ?? 1}
            <CitationLink id="reform_capacity_judgement" />
          </div>
        </div>
      </div>

      {projection && Object.keys(projection).length > 0 && (
        <div className="mb-3">
          <div className="text-[9px] uppercase tracking-wider text-stone-500 mb-1.5">
            Projected Outcome
            <span className="text-stone-600 normal-case ml-1">
              (per-field forecast bands{forecastMultiplier < 1 ? ` × ${forecastMultiplier.toFixed(2)} OBR` : ''})
            </span>
          </div>
          <div className="space-y-1 text-[11px] font-mono">
            {projection.revBonus && <div><span className="text-stone-400">Revenue:</span> <span className="text-signal-good tabular-nums">+£{projection.revBonus.low.toFixed(1)} to +£{projection.revBonus.high.toFixed(1)}bn pa</span> {reform.onComplete?.revBonus?.citationId && <CitationLink id={reform.onComplete.revBonus.citationId} className="ml-1" />}</div>}
            {projection.ongoingRev && <div><span className="text-stone-400">Ongoing revenue:</span> <span className={`tabular-nums ${projection.ongoingRev.value > 0 ? 'text-signal-good' : 'text-signal-bad'}`}>{projection.ongoingRev.low.toFixed(1)} to {projection.ongoingRev.high.toFixed(1)}bn pa</span> {reform.onComplete?.ongoingRev?.citationId && <CitationLink id={reform.onComplete.ongoingRev.citationId} className="ml-1" />}</div>}
            {projection.ongoingCost && <div><span className="text-stone-400">Ongoing cost:</span> <span className="text-signal-bad tabular-nums">£{projection.ongoingCost.low.toFixed(1)} to £{projection.ongoingCost.high.toFixed(1)}bn pa</span> {reform.onComplete?.ongoingCost?.citationId && <CitationLink id={reform.onComplete.ongoingCost.citationId} className="ml-1" />}</div>}
            {projection.growthBonus && <div><span className="text-stone-400">Growth:</span> <span className={`tabular-nums ${projection.growthBonus.value > 0 ? 'text-signal-good' : 'text-signal-bad'}`}>{projection.growthBonus.low.toFixed(2)} to {projection.growthBonus.high.toFixed(2)}pp</span> {reform.onComplete?.growthBonus?.citationId && <CitationLink id={reform.onComplete.growthBonus.citationId} className="ml-1" />}</div>}
            {projection.gini && <div><span className="text-stone-400">Gini:</span> <span className={`tabular-nums ${projection.gini.value < 0 ? 'text-signal-good' : 'text-signal-bad'}`}>{projection.gini.low.toFixed(2)} to {projection.gini.high.toFixed(2)}</span> {reform.onComplete?.gini?.citationId && <CitationLink id={reform.onComplete.gini.citationId} className="ml-1" />}</div>}
            {projection.healthBoost && <div><span className="text-stone-400">Health Index:</span> <span className={`tabular-nums ${projection.healthBoost.value > 0 ? 'text-signal-good' : 'text-signal-bad'}`}>{projection.healthBoost.low.toFixed(1)} to {projection.healthBoost.high.toFixed(1)}</span> {reform.onComplete?.healthBoost?.citationId && <CitationLink id={reform.onComplete.healthBoost.citationId} className="ml-1" />}</div>}
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
                <div key={bloc} className="flex justify-between text-[11px] font-mono">
                  <span className="text-stone-400">{BLOCS[bloc].name}</span>
                  <span className={`tabular-nums ${rate > 0 ? 'text-signal-good' : 'text-signal-bad'}`}>{rate > 0 ? '+' : ''}{rate}% / quarter</span>
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
                <div key={bloc} className="flex justify-between text-[11px] font-mono">
                  <span className="text-stone-400">{BLOCS[bloc].name}</span>
                  <span className={`tabular-nums ${delta > 0 ? 'text-signal-good' : 'text-signal-bad'}`}>{delta > 0 ? '+' : ''}{delta}</span>
                </div>
              ))}
          </div>
        </div>
      )}

      {allCitations.length > 1 && (
        <div className="mt-3 pt-3 border-t border-treasury-800">
          <div className="text-[9px] uppercase tracking-wider text-stone-500 mb-1.5">All citations for this reform</div>
          <div className="flex flex-wrap gap-1.5">
            {allCitations.map(id => (
              <CitationLink key={id} id={id} label={CITATIONS[id]?.title || id} />
            ))}
          </div>
        </div>
      )}
    </Modal>
  );
}
