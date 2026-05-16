import React from 'react';
import { RotateCcw } from 'lucide-react';
import { PARAMS } from '../../model/index.js';
import { Modal } from '../primitives/Modal.jsx';

const unwrap = (leaf) => (leaf && typeof leaf === 'object' && 'value' in leaf) ? leaf.value : leaf;
const fmtSigned = (n) => (n >= 0 ? '+' : '−') + (Math.abs(n) >= 1000 ? `£${(Math.abs(n)/1000).toFixed(1)}tn` : `£${Math.abs(n).toFixed(0)}bn`);

export function FinalModal({ game, balance, coalitionCohesion, onReset }) {
  const reelectThreshold = unwrap(PARAMS.reelectionCoalitionThreshold);
  const termLength = unwrap(PARAMS.termLength);
  const title =
    game.status === 'lost-election' ? 'Defeated at the Ballot.' :
    game.status === 'collapsed' ? 'Coalition Collapsed.' :
    game.status === 'lost-markets' ? 'Markets Revolted.' : 'A Difficult End.';
  return (
    <Modal tone="bad" dismissOnBackdrop={false}>
      <Modal.Eyebrow tone="bad">Out of Office</Modal.Eyebrow>
      <Modal.Title tone="bad">{title}</Modal.Title>
      <p className="text-stone-300 text-[13px] leading-relaxed mb-4">
        {game.status === 'lost-election' && `Election night. Your coalition fragmented (${coalitionCohesion.toFixed(0)}%, needed ${reelectThreshold}%).`}
        {game.status === 'collapsed' && 'Your coalition has lost confidence.'}
        {game.status === 'lost-markets' && 'Bond yields surged past 8%.'}
      </p>
      <div className="bg-treasury-900 rounded-md p-3 mb-4 space-y-1 text-[12px] font-mono">
        <div className="flex justify-between"><span className="text-stone-500">Terms served</span><span className="tabular-nums">{game.termsWon}</span></div>
        <div className="flex justify-between"><span className="text-stone-500">Quarters in office</span><span className="tabular-nums">{game.termsWon * termLength + game.quarter - 1}</span></div>
        <div className="flex justify-between"><span className="text-stone-500">Final balance</span><span className="tabular-nums">{fmtSigned(balance)}</span></div>
        <div className="flex justify-between"><span className="text-stone-500">Reforms delivered</span><span className="tabular-nums">{Object.values(game.reforms).filter(r => r.status === 'complete').length}</span></div>
      </div>
      <button onClick={onReset}
              className="w-full bg-accent-600 hover:bg-accent-500 active:bg-accent-700 text-treasury-950 font-semibold py-3 rounded-md flex items-center justify-center gap-2 transition-colors">
        <RotateCcw size={16} /> Begin Again
      </button>
    </Modal>
  );
}
