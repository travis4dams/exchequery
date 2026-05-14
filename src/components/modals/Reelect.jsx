import React from 'react';
import { ChevronRight } from 'lucide-react';

const fmtSigned = (n) => (n >= 0 ? '+' : '−') + (Math.abs(n) >= 1000 ? `£${(Math.abs(n)/1000).toFixed(1)}tn` : `£${Math.abs(n).toFixed(0)}bn`);

export function Reelect({ term, coalitionCohesion, balance, deficitGDP, reformsDelivered, onContinue }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-end sm:items-center justify-center p-4">
      <div className="bg-stone-950 border-2 border-amber-700 rounded-t-2xl sm:rounded-2xl max-w-md w-full p-6">
        <div className="text-[10px] uppercase tracking-[0.2em] text-amber-500 mb-2">Election Night</div>
        <h2 className="display-font text-3xl font-medium italic mb-3 text-amber-300">Returned with a mandate.</h2>
        <p className="text-stone-300 text-[13px] leading-relaxed mb-4">
          Your coalition held. Term {term + 1} begins. Markets ease on the honeymoon.
        </p>
        <div className="bg-stone-900 rounded-md p-3 mb-4 space-y-1 text-[12px]" style={{fontFamily: 'IBM Plex Mono'}}>
          <div className="flex justify-between"><span className="text-stone-500">Coalition</span><span>{coalitionCohesion.toFixed(0)}%</span></div>
          <div className="flex justify-between"><span className="text-stone-500">Annual balance</span><span>{fmtSigned(balance)}</span></div>
          <div className="flex justify-between"><span className="text-stone-500">Deficit / GDP</span><span>{deficitGDP.toFixed(1)}%</span></div>
          <div className="flex justify-between"><span className="text-stone-500">Reforms delivered</span><span>{reformsDelivered}</span></div>
        </div>
        {deficitGDP < 2 && balance < 0 && (
          <div className="bg-emerald-950/30 border border-emerald-800 rounded p-2 mb-4">
            <div className="text-[11px] text-emerald-300">🏛️ Deficit below 2% of GDP — sustainable territory.</div>
          </div>
        )}
        {balance > 0 && (
          <div className="bg-emerald-950/30 border border-emerald-800 rounded p-2 mb-4">
            <div className="text-[11px] text-emerald-300">📈 Annual surplus. The books are in the black.</div>
          </div>
        )}
        <button onClick={onContinue}
                className="w-full bg-amber-600 hover:bg-amber-500 text-stone-950 font-semibold py-3 rounded-md flex items-center justify-center gap-2">
          Begin Term {term + 1} <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}
