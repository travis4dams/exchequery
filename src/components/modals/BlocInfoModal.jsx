import React from 'react';
import { X } from 'lucide-react';
import { BLOCS, COALITION } from '../../model/index.js';

export function BlocInfoModal({ blocId, onClose }) {
  const bloc = BLOCS[blocId];
  if (!bloc) return null;
  const inCoalition = COALITION.includes(blocId);
  return (
    <div className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-3"
         onClick={onClose}>
      <div className="bg-stone-950 border-2 border-stone-700 rounded-t-2xl sm:rounded-2xl max-w-md w-full p-5"
           onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-2">
            {inCoalition && <div className="w-2 h-2 rounded-full bg-amber-500 flex-shrink-0" />}
            <h3 className="display-font text-lg font-medium leading-tight">{bloc.name}</h3>
          </div>
          <button onClick={onClose} className="text-stone-500"><X size={16} /></button>
        </div>
        <div className="grid grid-cols-3 gap-2 mb-3 text-center">
          <div className="bg-stone-900/60 rounded p-2">
            <div className="text-[9px] uppercase tracking-wider text-stone-500">Pop. share</div>
            <div className="text-[13px] text-stone-200" style={{fontFamily: 'IBM Plex Mono'}}>
              {(bloc.weight * 100).toFixed(0)}%
            </div>
          </div>
          <div className="bg-stone-900/60 rounded p-2">
            <div className="text-[9px] uppercase tracking-wider text-stone-500">Base support</div>
            <div className="text-[13px] text-stone-200" style={{fontFamily: 'IBM Plex Mono'}}>
              {bloc.base}%
            </div>
          </div>
          <div className="bg-stone-900/60 rounded p-2">
            <div className="text-[9px] uppercase tracking-wider text-stone-500">Pop. growth</div>
            <div className="text-[13px] text-stone-200" style={{fontFamily: 'IBM Plex Mono'}}>
              {bloc.popGrowth >= 0 ? '+' : ''}{bloc.popGrowth.toFixed(1)}%/yr
            </div>
          </div>
        </div>
        <div className="text-[12px] text-stone-300 leading-relaxed">{bloc.note}</div>
        {inCoalition && (
          <div className="mt-3 text-[11px] text-amber-400 uppercase tracking-wider">
            Coalition member
          </div>
        )}
      </div>
    </div>
  );
}
