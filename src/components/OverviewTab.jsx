import React from 'react';
import { BLOCS, COALITION } from '../model/index.js';
import { BlocBar } from './primitives/BlocBar.jsx';
import { CitationLink } from './primitives/CitationLink.jsx';

function statColor(value, ok, warn) {
  if (value >= ok) return 'text-emerald-400';
  if (value >= warn) return 'text-amber-400';
  return 'text-rose-400';
}

export function OverviewTab({ game, projectedDeltas }) {
  return (
    <div>
      <div className="mb-5 p-3 bg-stone-900/40 border border-stone-800 rounded-lg">
        <div className="text-[10px] uppercase tracking-wider text-stone-500 mb-2 flex items-center justify-between">
          <span className="flex items-center gap-1">
            Political Resources <CitationLink id="pc_regen_methodology" />
          </span>
          <span className="text-stone-600">→ Parl. tab</span>
        </div>
        <div className="grid grid-cols-3 gap-2 text-center">
          <div>
            <div className="text-[9px] uppercase tracking-wider text-stone-500">Capital</div>
            <div className={`text-base font-semibold tabular-nums ${statColor(game.politicalCapital, 50, 25)}`}
                 style={{fontFamily: 'IBM Plex Mono'}}>{game.politicalCapital.toFixed(0)}</div>
          </div>
          <div>
            <div className="text-[9px] uppercase tracking-wider text-stone-500">Parl. Mood</div>
            <div className={`text-base font-semibold tabular-nums ${statColor(game.parliamentMood, 55, 40)}`}
                 style={{fontFamily: 'IBM Plex Mono'}}>{game.parliamentMood.toFixed(0)}</div>
          </div>
          <div>
            <div className="text-[9px] uppercase tracking-wider text-stone-500">PM Rel.</div>
            <div className={`text-base font-semibold tabular-nums ${statColor(game.pmRelationship, 55, 35)}`}
                 style={{fontFamily: 'IBM Plex Mono'}}>{game.pmRelationship.toFixed(0)}</div>
          </div>
        </div>
      </div>

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
