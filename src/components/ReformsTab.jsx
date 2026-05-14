import React from 'react';
import { AlertCircle } from 'lucide-react';
import { REFORMS, REFORM_BRANCHES } from '../model/index.js';
import { ReformCard } from './primitives/ReformCard.jsx';

const unwrap = (leaf) => (leaf && typeof leaf === 'object' && 'value' in leaf) ? leaf.value : leaf;

export function ReformsTab({ game, coalitionCohesion, canStartReform, proposeReform, unproposeReform, onInspect }) {
  return (
    <div>
      <div className="mb-5">
        <h2 className="display-font text-xl font-medium italic text-stone-100 mb-1">Reform Programme</h2>
        <p className="text-[11px] text-stone-500">Tap eye icon for full details + uncertainty bands. <AlertCircle size={10} className="inline text-amber-500" /> marks contested evidence.</p>
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
            {branchReforms.map(([id, r]) => (
              <ReformCard key={id} id={id} reform={r}
                          status={game.reforms[id]}
                          isProposed={game.proposedReforms.includes(id)}
                          onPropose={() => proposeReform(id)}
                          onUnpropose={() => unproposeReform(id)}
                          canStart={canStartReform(id)}
                          currentQ={game.globalQuarter}
                          coalitionCohesion={coalitionCohesion}
                          onInspect={() => onInspect(r)} />
            ))}
          </div>
        );
      })}
    </div>
  );
}
