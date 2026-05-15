import React from 'react';
import { AlertCircle } from 'lucide-react';
import { REFORMS, REFORM_BRANCHES, reformCapacityLoad } from '../model/index.js';
import { ReformCard } from './primitives/ReformCard.jsx';

const unwrap = (leaf) => (leaf && typeof leaf === 'object' && 'value' in leaf) ? leaf.value : leaf;

export function ReformsTab({
  game, coalitionCohesion, canStartReform, proposeReform, unproposeReform,
  cancelReform, reformCapacity, reformLoadInFlight, onInspect,
}) {
  const capacityPct = reformCapacity > 0 ? Math.min(100, (reformLoadInFlight / reformCapacity) * 100) : 0;
  const capacityFull = reformLoadInFlight >= reformCapacity;

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

      {game.forecastNoise > 0.15 && (
        <div className="mb-4 p-2 bg-amber-950/20 border border-amber-900/30 rounded text-[11px] text-amber-300">
          Forecast uncertainty: ±{(game.forecastNoise*100).toFixed(0)}%. Pass <strong>OBR Independence</strong> to narrow this.
        </div>
      )}
      {game.proposedReforms.length > 0 && (
        <div className="mb-4 p-3 bg-sky-950/30 border border-sky-900/50 rounded-md">
          <div className="text-[10px] uppercase tracking-wider text-sky-400 mb-2">Queued for Next Quarter</div>
          <div className="text-[11px] text-sky-200">
            Cost on commit: £{game.proposedReforms.reduce((sum, id) => sum + unwrap(REFORMS[id].cost), 0).toFixed(1)}bn
          </div>
        </div>
      )}
      {Object.keys(REFORM_BRANCHES).map(branch => {
        const branchReforms = Object.entries(REFORMS).filter(([_, r]) => r.branch === branch);
        return (
          <div key={branch} className="mb-5">
            <div className="text-[10px] uppercase tracking-wider text-amber-500 mb-2 font-semibold">{REFORM_BRANCHES[branch]}</div>
            {branchReforms.map(([id, r]) => {
              const prereqMet = r.prereq.every(p => game.reforms[p]?.status === 'complete');
              const fitsCapacity = reformLoadInFlight + reformCapacityLoad(r) <= reformCapacity;
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
                            onInspect={() => onInspect(r)} />
              );
            })}
          </div>
        );
      })}
    </div>
  );
}
