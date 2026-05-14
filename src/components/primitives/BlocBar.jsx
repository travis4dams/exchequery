import React from 'react';
import { BLOCS } from '../../model/index.js';

export function BlocBar({ blocId, support, isCoalition, weight, projectedDelta }) {
  const bloc = BLOCS[blocId];
  const color = support > 50 ? 'bg-emerald-500' : support > 35 ? 'bg-amber-500' : 'bg-rose-500';
  return (
    <div className={`p-2 rounded ${isCoalition ? 'bg-amber-950/20 border border-amber-900/30' : 'bg-stone-900/30'}`}>
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-1.5 min-w-0">
          {isCoalition && <div className="w-1.5 h-1.5 rounded-full bg-amber-500 flex-shrink-0" />}
          <span className="text-[11px] text-stone-300 truncate">{bloc.name}</span>
          <span className="text-[9px] text-stone-600" style={{fontFamily: 'IBM Plex Mono'}}>{(weight*100).toFixed(0)}%</span>
        </div>
        <div className="flex items-baseline gap-1.5 flex-shrink-0">
          <span className="text-[11px] text-stone-400" style={{fontFamily: 'IBM Plex Mono'}}>{Math.round(support)}%</span>
          {projectedDelta !== undefined && Math.abs(projectedDelta) >= 0.3 && (
            <span className={`text-[9px] ${projectedDelta > 0 ? 'text-emerald-400' : 'text-rose-400'}`} style={{fontFamily: 'IBM Plex Mono'}}>
              {projectedDelta > 0 ? '↗' : '↘'}{Math.abs(projectedDelta).toFixed(1)}
            </span>
          )}
        </div>
      </div>
      <div className="h-1 bg-stone-800 rounded-full overflow-hidden">
        <div className={`h-full ${color} transition-all`} style={{width: `${support}%`}} />
      </div>
    </div>
  );
}
