import React from 'react';
import { AlertCircle, CheckCircle2, ChevronDown, Eye, Undo2 } from 'lucide-react';
import { REFORMS, REFORM_BRANCHES, reformCapacityLoad, pcCostBreakdown } from '../model/index.js';
import { ReformCard } from './primitives/ReformCard.jsx';
import { CitationLink } from './primitives/CitationLink.jsx';

const unwrap = (leaf) => (leaf && typeof leaf === 'object' && 'value' in leaf) ? leaf.value : leaf;

function QueuedSummary({ proposedReforms, game, coalitionCohesion, onUnpropose }) {
  if (proposedReforms.length === 0) return null;
  const rows = proposedReforms.map((id) => {
    const reform = REFORMS[id];
    const pc = pcCostBreakdown(reform, { ...game, coalitionCohesion }).total;
    return { id, name: reform.name, cost: unwrap(reform.cost), pc };
  });
  const totalCost = rows.reduce((s, r) => s + r.cost, 0);
  const totalPc = rows.reduce((s, r) => s + r.pc, 0);
  return (
    <div className="mb-4 p-3 bg-sky-950/30 border border-sky-900/50 rounded-md">
      <div className="text-[10px] uppercase tracking-wider text-sky-400 mb-2">
        Queued for Next Quarter · {proposedReforms.length} reform{proposedReforms.length === 1 ? '' : 's'}
      </div>
      <div className="space-y-1">
        {rows.map((r) => (
          <div key={r.id} className="flex items-center gap-2 text-[11px]">
            <span className="text-sky-200 flex-1 truncate">{r.name}</span>
            <span className="text-sky-300 tabular-nums w-12 text-right" style={{fontFamily: 'IBM Plex Mono'}}>£{r.cost}bn</span>
            <span className="text-amber-300 tabular-nums w-10 text-right" style={{fontFamily: 'IBM Plex Mono'}}>{r.pc.toFixed(0)} PC</span>
            <button onClick={() => onUnpropose(r.id)}
                    className="text-sky-300 hover:text-sky-100"
                    title="Remove from queue">
              <Undo2 size={11} />
            </button>
          </div>
        ))}
      </div>
      <div className="border-t border-sky-900/60 mt-2 pt-1.5 flex items-center gap-2 text-[11px]">
        <span className="text-sky-300 flex-1 uppercase tracking-wider text-[10px]">Total on commit</span>
        <span className="text-sky-200 tabular-nums w-12 text-right font-semibold" style={{fontFamily: 'IBM Plex Mono'}}>£{totalCost.toFixed(1)}bn</span>
        <span className="text-amber-300 tabular-nums w-10 text-right font-semibold" style={{fontFamily: 'IBM Plex Mono'}}>{totalPc.toFixed(0)} PC</span>
        <span className="w-[14px]" />
      </div>
    </div>
  );
}

function CompletedReformRow({ id, reform, status, onInspect }) {
  const startedQ = status?.startedQ;
  const completesQ = status?.completesQ;
  return (
    <div className="flex items-center gap-2 text-[11px] py-1 border-b border-stone-800/60 last:border-0">
      <CheckCircle2 size={11} className="text-emerald-500 flex-shrink-0" />
      <span className="text-stone-300 flex-1 truncate">{reform.name}</span>
      {startedQ != null && completesQ != null && (
        <span className="text-[10px] text-stone-500 tabular-nums" style={{fontFamily: 'IBM Plex Mono'}}>
          Q{startedQ}–Q{completesQ}
        </span>
      )}
      {reform.citationId && <CitationLink id={reform.citationId} />}
      {onInspect && (
        <button onClick={() => onInspect(reform)}
                className="text-stone-500 hover:text-stone-300"
                title="Inspect reform">
          <Eye size={11} />
        </button>
      )}
    </div>
  );
}

export function ReformsTab({
  game, coalitionCohesion, canStartReform, proposeReform, unproposeReform,
  cancelReform, reformCapacity, reformLoadInFlight, onInspect,
}) {
  const capacityPct = reformCapacity > 0 ? Math.min(100, (reformLoadInFlight / reformCapacity) * 100) : 0;
  const capacityFull = reformLoadInFlight >= reformCapacity;

  const completedEntries = Object.entries(game.reforms)
    .filter(([_, r]) => r.status === 'complete')
    .map(([id, r]) => ({ id, reform: REFORMS[id], status: r }))
    .filter((x) => x.reform);

  return (
    <div>
      <div className="mb-5">
        <h2 className="display-font text-xl font-medium italic text-stone-100 mb-1">Reform Programme</h2>
        <p className="text-[11px] text-stone-500">Tap eye icon for full details + uncertainty bands. <AlertCircle size={10} className="inline text-amber-500" /> marks contested evidence.</p>
      </div>

      <div className="mb-4 p-3 bg-stone-900/40 border border-stone-800 rounded-md">
        <div className="flex items-center justify-between mb-1.5">
          <div className="text-[10px] uppercase tracking-wider text-stone-400">Reform Capacity</div>
          <div className={`text-[11px] tabular-nums ${capacityFull ? 'text-amber-400' : 'text-stone-300'}`} style={{fontFamily: 'IBM Plex Mono'}}>
            {reformLoadInFlight} / {reformCapacity} used
          </div>
        </div>
        <div className="h-1.5 bg-stone-800 rounded-full overflow-hidden">
          <div className={`h-full ${capacityFull ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{width: `${capacityPct}%`}} />
        </div>
        <div className="text-[10px] text-stone-500 mt-1.5">Scales with departmental spending. Civil Service Rebuild adds +2.</div>
        {capacityFull && (
          <div className="mt-2 text-[11px] text-amber-300">Capacity full — cancel or complete a reform to start another.</div>
        )}
      </div>

      {(game.forecastNoiseMultiplier ?? 1) >= 1 && (
        <div className="mb-4 p-2 bg-amber-950/20 border border-amber-900/30 rounded text-[11px] text-amber-300">
          Each reform carries its own forecast band (see Inspect). Pass <strong>OBR Independence</strong> to narrow every band by 60%.
        </div>
      )}

      <QueuedSummary
        proposedReforms={game.proposedReforms}
        game={game}
        coalitionCohesion={coalitionCohesion}
        onUnpropose={unproposeReform}
      />

      {Object.keys(REFORM_BRANCHES).map(branch => {
        const branchReforms = Object.entries(REFORMS)
          .filter(([_, r]) => r.branch === branch)
          .filter(([id]) => game.reforms[id]?.status !== 'complete');
        if (branchReforms.length === 0) return null;
        return (
          <div key={branch} className="mb-5">
            <div className="text-[10px] uppercase tracking-wider text-amber-500 mb-2 font-semibold">{REFORM_BRANCHES[branch]}</div>
            {branchReforms.map(([id, r]) => {
              const prereqMet = r.prereq.every(p => game.reforms[p]?.status === 'complete');
              const fitsCapacity = reformLoadInFlight + reformCapacityLoad(r) <= reformCapacity;
              const pcBreakdown = pcCostBreakdown(r, { ...game, coalitionCohesion });
              const canAffordPc = pcBreakdown.total <= game.politicalCapital;
              return (
                <ReformCard key={id} id={id} reform={r}
                            status={game.reforms[id]}
                            isProposed={game.proposedReforms.includes(id)}
                            onPropose={() => proposeReform(id)}
                            onUnpropose={() => unproposeReform(id)}
                            onCancel={() => cancelReform(id)}
                            canStart={canStartReform(id)}
                            prereqMet={prereqMet}
                            fitsCapacity={fitsCapacity}
                            load={reformCapacityLoad(r)}
                            currentQ={game.globalQuarter}
                            coalitionCohesion={coalitionCohesion}
                            pcBreakdown={pcBreakdown}
                            canAffordPc={canAffordPc}
                            availablePc={game.politicalCapital}
                            onInspect={() => onInspect(r)} />
              );
            })}
          </div>
        );
      })}

      {completedEntries.length > 0 && (
        <details className="mt-6 p-3 bg-stone-900/40 border border-stone-800 rounded-md group">
          <summary className="text-[11px] uppercase tracking-wider text-emerald-500 cursor-pointer flex items-center gap-1.5 list-none font-semibold">
            <ChevronDown size={11} className="transition-transform group-open:rotate-0 -rotate-90" />
            Completed Reform Projects · {completedEntries.length} delivered
          </summary>
          <div className="mt-2">
            {completedEntries.map(({ id, reform, status }) => (
              <CompletedReformRow key={id} id={id} reform={reform} status={status}
                                  onInspect={onInspect} />
            ))}
          </div>
        </details>
      )}
    </div>
  );
}
