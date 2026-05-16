import React from 'react';
import { BLOCS, COALITION } from '../../model/index.js';
import { Modal } from '../primitives/Modal.jsx';

export function BlocInfoModal({ blocId, onClose }) {
  const bloc = BLOCS[blocId];
  if (!bloc) return null;
  const inCoalition = COALITION.includes(blocId);
  return (
    <Modal tone="neutral" z={60} onClose={onClose} showCloseButton className="relative">
      <div className="flex items-center gap-2 mb-3 pr-6">
        {inCoalition && <span className="w-2 h-2 rounded-full bg-accent-500 flex-shrink-0" aria-hidden />}
        <h3 className="font-display text-lg font-medium leading-tight text-stone-100">{bloc.name}</h3>
      </div>
      <div className="grid grid-cols-3 gap-2 mb-3 text-center">
        <div className="bg-treasury-900/60 rounded p-2">
          <div className="text-[9px] uppercase tracking-wider text-stone-500">Pop. share</div>
          <div className="text-[13px] text-stone-200 font-mono tabular-nums">
            {(bloc.weight * 100).toFixed(0)}%
          </div>
        </div>
        <div className="bg-treasury-900/60 rounded p-2">
          <div className="text-[9px] uppercase tracking-wider text-stone-500">Base support</div>
          <div className="text-[13px] text-stone-200 font-mono tabular-nums">
            {bloc.base}%
          </div>
        </div>
        <div className="bg-treasury-900/60 rounded p-2">
          <div className="text-[9px] uppercase tracking-wider text-stone-500">Pop. growth</div>
          <div className="text-[13px] text-stone-200 font-mono tabular-nums">
            {bloc.popGrowth >= 0 ? '+' : ''}{bloc.popGrowth.toFixed(1)}%/yr
          </div>
        </div>
      </div>
      <div className="text-[12px] text-stone-300 leading-relaxed">{bloc.note}</div>
      {inCoalition && (
        <div className="mt-3 text-[11px] text-accent-400 uppercase tracking-wider">
          Coalition member
        </div>
      )}
    </Modal>
  );
}
