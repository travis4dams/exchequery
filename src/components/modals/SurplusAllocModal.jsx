import React from 'react';
import { ChevronRight } from 'lucide-react';
import { Modal } from '../primitives/Modal.jsx';

export function SurplusAllocModal({ pendingSurplus, allocations, setAllocations, onCommit }) {
  const total = (allocations.debt || 0) + (allocations.services || 0) + (allocations.taxCut || 0);
  return (
    <Modal tone="good" dismissOnBackdrop={false} z={45}>
      <Modal.Eyebrow tone="good">Treasury Allocation</Modal.Eyebrow>
      <Modal.Title tone="good">A surplus of £{pendingSurplus.toFixed(0)}bn.</Modal.Title>
      <p className="text-stone-300 text-[12px] leading-relaxed mb-4">
        You closed the quarter in surplus. How do you want to allocate it? Drag the sliders — total must equal £{pendingSurplus.toFixed(0)}bn.
      </p>

      <div className="space-y-4 mb-4">
        <div>
          <div className="flex justify-between mb-1">
            <label className="text-[12px] text-stone-200">Pay down debt</label>
            <span className="text-[12px] font-semibold text-signal-good font-mono tabular-nums">£{(allocations.debt || 0).toFixed(0)}bn</span>
          </div>
          <input type="range" min={0} max={pendingSurplus} step={1}
            value={allocations.debt || 0}
            onChange={(e) => {
              const newDebt = parseFloat(e.target.value);
              const remaining = pendingSurplus - newDebt;
              const cur = allocations;
              const totalOther = (cur.services || 0) + (cur.taxCut || 0);
              if (totalOther > 0.01) {
                const r = (cur.services || 0) / totalOther;
                setAllocations({ debt: newDebt, services: remaining * r, taxCut: remaining * (1 - r) });
              } else {
                setAllocations({ debt: newDebt, services: remaining, taxCut: 0 });
              }
            }}
            className="w-full h-1.5 bg-treasury-950 rounded-pill appearance-none cursor-pointer shadow-inset-well" />
          <div className="text-[10px] text-stone-500 mt-1">Reduces debt 1:1. Lowers ongoing interest costs. Markets approve.</div>
        </div>

        <div>
          <div className="flex justify-between mb-1">
            <label className="text-[12px] text-stone-200">Boost public services (one-off)</label>
            <span className="text-[12px] font-semibold text-signal-info font-mono tabular-nums">£{(allocations.services || 0).toFixed(0)}bn</span>
          </div>
          <input type="range" min={0} max={pendingSurplus} step={1}
            value={allocations.services || 0}
            onChange={(e) => {
              const newServ = parseFloat(e.target.value);
              const remaining = pendingSurplus - newServ;
              const cur = allocations;
              const totalOther = (cur.debt || 0) + (cur.taxCut || 0);
              if (totalOther > 0.01) {
                const r = (cur.debt || 0) / totalOther;
                setAllocations({ services: newServ, debt: remaining * r, taxCut: remaining * (1 - r) });
              } else {
                setAllocations({ services: newServ, debt: remaining, taxCut: 0 });
              }
            }}
            className="w-full h-1.5 bg-treasury-950 rounded-pill appearance-none cursor-pointer shadow-inset-well" />
          <div className="text-[10px] text-stone-500 mt-1">One-time boost to health & service-using blocs. Doesn't reduce debt.</div>
        </div>

        <div>
          <div className="flex justify-between mb-1">
            <label className="text-[12px] text-stone-200">Permanent tax cuts</label>
            <span className="text-[12px] font-semibold text-accent-400 font-mono tabular-nums">£{(allocations.taxCut || 0).toFixed(0)}bn</span>
          </div>
          <input type="range" min={0} max={pendingSurplus} step={1}
            value={allocations.taxCut || 0}
            onChange={(e) => {
              const newCut = parseFloat(e.target.value);
              const remaining = pendingSurplus - newCut;
              const cur = allocations;
              const totalOther = (cur.debt || 0) + (cur.services || 0);
              if (totalOther > 0.01) {
                const r = (cur.debt || 0) / totalOther;
                setAllocations({ taxCut: newCut, debt: remaining * r, services: remaining * (1 - r) });
              } else {
                setAllocations({ taxCut: newCut, debt: remaining, services: 0 });
              }
            }}
            className="w-full h-1.5 bg-treasury-950 rounded-pill appearance-none cursor-pointer shadow-inset-well" />
          <div className="text-[10px] text-stone-500 mt-1">⚠ Permanent revenue reduction — eats into future surpluses. Business & middle class approve.</div>
        </div>
      </div>

      <div className="bg-treasury-900 rounded-md p-2 mb-3 text-[11px] font-mono">
        <div className="flex justify-between"><span className="text-stone-500">Total allocated</span><span className="tabular-nums">£{total.toFixed(1)}bn</span></div>
        <div className="flex justify-between"><span className="text-stone-500">Surplus available</span><span className="tabular-nums">£{pendingSurplus.toFixed(1)}bn</span></div>
      </div>

      <button onClick={onCommit}
              className="w-full bg-accent-600 hover:bg-accent-500 active:bg-accent-700 text-treasury-950 font-semibold py-3 rounded-md flex items-center justify-center gap-2 transition-colors">
        Commit Allocation <ChevronRight size={16} />
      </button>
    </Modal>
  );
}
