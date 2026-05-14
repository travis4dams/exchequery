import React from 'react';
import { RotateCcw } from 'lucide-react';
import { PARAMS } from '../../model/index.js';

const unwrap = (leaf) => (leaf && typeof leaf === 'object' && 'value' in leaf) ? leaf.value : leaf;
const fmtSigned = (n) => (n >= 0 ? '+' : '−') + (Math.abs(n) >= 1000 ? `£${(Math.abs(n)/1000).toFixed(1)}tn` : `£${Math.abs(n).toFixed(0)}bn`);

export function FinalModal({ game, balance, coalitionCohesion, onReset }) {
  const reelectThreshold = unwrap(PARAMS.reelectionCoalitionThreshold);
  const termLength = unwrap(PARAMS.termLength);
  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-end sm:items-center justify-center p-4">
      <div className="bg-stone-950 border-2 rounded-t-2xl sm:rounded-2xl max-w-md w-full p-6" style={{borderColor: '#9f1239'}}>
        <div className="text-[10px] uppercase tracking-[0.2em] mb-2 text-rose-400">Out of Office</div>
        <h2 className="display-font text-3xl font-medium italic mb-4 text-rose-300">
          {game.status === 'lost-election' ? 'Defeated at the Ballot.' :
           game.status === 'collapsed' ? 'Coalition Collapsed.' :
           game.status === 'lost-markets' ? 'Markets Revolted.' : 'A Difficult End.'}
        </h2>
        <p className="text-stone-300 text-[13px] leading-relaxed mb-4">
          {game.status === 'lost-election' && `Election night. Your coalition fragmented (${coalitionCohesion.toFixed(0)}%, needed ${reelectThreshold}%).`}
          {game.status === 'collapsed' && 'Your coalition has lost confidence.'}
          {game.status === 'lost-markets' && 'Bond yields surged past 8%.'}
        </p>
        <div className="bg-stone-900 rounded-md p-3 mb-4 space-y-1 text-[12px]" style={{fontFamily: 'IBM Plex Mono'}}>
          <div className="flex justify-between"><span className="text-stone-500">Terms served</span><span>{game.termsWon}</span></div>
          <div className="flex justify-between"><span className="text-stone-500">Quarters in office</span><span>{game.termsWon * termLength + game.quarter - 1}</span></div>
          <div className="flex justify-between"><span className="text-stone-500">Final balance</span><span>{fmtSigned(balance)}</span></div>
          <div className="flex justify-between"><span className="text-stone-500">Reforms delivered</span><span>{Object.values(game.reforms).filter(r => r.status === 'complete').length}</span></div>
        </div>
        <button onClick={onReset}
                className="w-full bg-amber-600 hover:bg-amber-500 text-stone-950 font-semibold py-3 rounded-md flex items-center justify-center gap-2">
          <RotateCcw size={16} /> Begin Again
        </button>
      </div>
    </div>
  );
}
