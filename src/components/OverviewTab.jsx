import React from 'react';
import { BLOCS, COALITION } from '../model/index.js';
import { BlocBar } from './primitives/BlocBar.jsx';

export function OverviewTab({ game, projectedDeltas }) {
  return (
    <div>
      <div className="mb-5">
        <h2 className="display-font text-xl font-medium italic text-stone-100 mb-1">Voter Blocs</h2>
        <p className="text-[11px] text-stone-500">Population share (small grey) shifts each quarter. Arrows show projected support drift.</p>
      </div>
      <div className="space-y-1.5 mb-5">
        {Object.keys(BLOCS).map(id => (
          <BlocBar key={id} blocId={id} support={game.blocSupport[id]}
                   weight={game.blocWeights[id]}
                   isCoalition={COALITION.includes(id)}
                   projectedDelta={projectedDeltas[id]} />
        ))}
      </div>

      <div className="mb-5 p-3 bg-stone-900/40 border border-stone-800 rounded-lg">
        <div className="text-[10px] uppercase tracking-wider text-stone-500 mb-2">Bloc Notes</div>
        <div className="space-y-2">
          {Object.entries(BLOCS).map(([id, b]) => (
            <div key={id} className="text-[11px]">
              <span className="text-stone-300 font-medium">{b.name}:</span>
              <span className="text-stone-500 ml-1">{b.note}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="p-4 bg-stone-900/40 border border-stone-800 rounded-lg">
        <div className="text-[10px] uppercase tracking-wider text-stone-500 mb-2">Recent Events</div>
        {game.log.length === 0 ? (
          <div className="text-[11px] text-stone-500 italic">No events yet — the country watches.</div>
        ) : (
          <div className="space-y-1.5">
            {game.log.slice(-8).reverse().map((l, i) => (
              <div key={i} className="text-[11px] text-stone-400 leading-snug">
                <span className="text-amber-500 mr-2" style={{fontFamily: 'IBM Plex Mono'}}>Q{l.q}</span>{l.text}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
