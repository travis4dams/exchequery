import React from 'react';
import { ChevronRight } from 'lucide-react';
import { Modal } from '../primitives/Modal.jsx';

const fmtSigned = (n) => (n >= 0 ? '+' : '−') + (Math.abs(n) >= 1000 ? `£${(Math.abs(n)/1000).toFixed(1)}tn` : `£${Math.abs(n).toFixed(0)}bn`);

export function Reelect({ term, coalitionCohesion, balance, deficitGDP, reformsDelivered, onContinue }) {
  return (
    <Modal tone="accent" dismissOnBackdrop={false}>
      <Modal.Eyebrow tone="accent">Election Night</Modal.Eyebrow>
      <Modal.Title tone="accent">Returned with a mandate.</Modal.Title>
      <p className="text-stone-300 text-[13px] leading-relaxed mb-4">
        Your coalition held. Term {term + 1} begins. Markets ease on the honeymoon.
      </p>
      <div className="bg-treasury-900 rounded-md p-3 mb-4 space-y-1 text-[12px] font-mono">
        <div className="flex justify-between"><span className="text-stone-500">Coalition</span><span className="tabular-nums">{coalitionCohesion.toFixed(0)}%</span></div>
        <div className="flex justify-between"><span className="text-stone-500">Annual balance</span><span className="tabular-nums">{fmtSigned(balance)}</span></div>
        <div className="flex justify-between"><span className="text-stone-500">Deficit / GDP</span><span className="tabular-nums">{deficitGDP.toFixed(1)}%</span></div>
        <div className="flex justify-between"><span className="text-stone-500">Reforms delivered</span><span className="tabular-nums">{reformsDelivered}</span></div>
      </div>
      {deficitGDP < 2 && balance < 0 && (
        <div className="bg-emerald-950/30 border border-emerald-800 rounded p-2 mb-4">
          <div className="text-[11px] text-signal-good">🏛️ Deficit below 2% of GDP — sustainable territory.</div>
        </div>
      )}
      {balance > 0 && (
        <div className="bg-emerald-950/30 border border-emerald-800 rounded p-2 mb-4">
          <div className="text-[11px] text-signal-good">📈 Annual surplus. The books are in the black.</div>
        </div>
      )}
      <button onClick={onContinue}
              className="w-full bg-accent-600 hover:bg-accent-500 active:bg-accent-700 text-treasury-950 font-semibold py-3 rounded-md flex items-center justify-center gap-2 transition-colors shadow-glow-amber">
        Begin Term {term + 1} <ChevronRight size={16} />
      </button>
    </Modal>
  );
}
