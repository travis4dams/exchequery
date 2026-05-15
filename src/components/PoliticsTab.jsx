import React, { useMemo, useState } from 'react';
import { Search, ChevronDown } from 'lucide-react';
import {
  BLOCS,
  COALITION,
  CONSTITUENCIES,
  WINNER_BY_IDX,
  PARTY_COLORS,
  SEAT_COUNT,
  topSeatsByMood,
  partySeatCounts,
} from '../model/index.js';
import { BlocBar } from './primitives/BlocBar.jsx';
import { CitationLink } from './primitives/CitationLink.jsx';
import { BlocInfoModal } from './modals/BlocInfoModal.jsx';

// Palette for the bloc pie charts. Coalition blocs get warm hues; others
// get cooler/neutral tones so the visual split lines up with the rest of
// the UI's amber-for-allies convention.
const BLOC_COLORS = {
  pensioners:      '#d97706',
  workingClass:    '#dc2626',
  middleClass:     '#a16207',
  professional:    '#2563eb',
  business:        '#7c3aed',
  publicSector:    '#059669',
  youth:           '#0891b2',
  northern:        '#b45309',
  ethnicMinority:  '#be185d',
};

// =============================================================================
// Hemicycle layout — 632 seats arranged in concentric arcs.
// =============================================================================
const HEMICYCLE_GEOMETRY = (() => {
  const ROWS = 12;
  const seats = [];
  const seatsPerRow = [];
  let remaining = SEAT_COUNT;
  for (let i = 0; i < ROWS; i++) {
    const target = Math.round((SEAT_COUNT * (i + 1)) / (ROWS * (ROWS + 1) / 2 * 2 / ROWS));
    const n = Math.min(remaining, target);
    seatsPerRow.push(n);
    remaining -= n;
  }
  if (remaining > 0) seatsPerRow[ROWS - 1] += remaining;

  const minR = 30, maxR = 110;
  for (let row = 0; row < ROWS; row++) {
    const r = minR + ((maxR - minR) * row) / (ROWS - 1);
    const n = seatsPerRow[row];
    for (let k = 0; k < n; k++) {
      const t = (k + 0.5) / n;
      const theta = Math.PI - t * Math.PI;
      seats.push({ x: 120 + r * Math.cos(theta), y: 130 - r * Math.sin(theta) });
    }
  }
  if (seats.length > SEAT_COUNT) seats.length = SEAT_COUNT;
  while (seats.length < SEAT_COUNT) seats.push({ x: 120, y: 130 });
  return seats;
})();

function Hemicycle({ seatMoodById }) {
  return (
    <svg viewBox="0 0 240 140" className="w-full" preserveAspectRatio="xMidYMid meet">
      {HEMICYCLE_GEOMETRY.map((p, i) => {
        const mood = seatMoodById[i];
        const color = PARTY_COLORS[WINNER_BY_IDX[i]] ?? PARTY_COLORS.Other;
        const intensity = Math.abs(mood - 50) / 50;
        const opacity = 0.35 + 0.65 * intensity;
        return <circle key={i} cx={p.x} cy={p.y} r={1.2} fill={color} opacity={opacity} />;
      })}
    </svg>
  );
}

function PartyLegend({ counts, governingParty }) {
  const order = ['Lab', 'Con', 'LD', 'SNP', 'RUK', 'Green', 'PC', 'Ind', 'Spk'];
  return (
    <div className="flex flex-wrap gap-x-2 gap-y-1 text-[10px] text-stone-400 mt-2">
      {order.filter((p) => counts[p]).map((p) => (
        <div key={p} className="flex items-center gap-1">
          <span className="inline-block w-2 h-2 rounded-full" style={{ background: PARTY_COLORS[p] }} />
          <span className={p === governingParty ? 'text-stone-100 font-semibold' : ''}>{p} {counts[p]}</span>
        </div>
      ))}
    </div>
  );
}

function MoodBar({ value, ok = 60, warn = 45 }) {
  const color = value >= ok ? 'bg-emerald-500' : value >= warn ? 'bg-amber-500' : 'bg-rose-500';
  return (
    <div className="h-1.5 bg-stone-800 rounded-full overflow-hidden">
      <div className={`h-full ${color} transition-all`} style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
    </div>
  );
}

function PoliticsCapitalCard({ pc, parliamentMood, pmRelationship, pcLog }) {
  return (
    <div className="p-4 bg-stone-900/60 border border-stone-800 rounded-lg space-y-3">
      <div className="flex items-baseline justify-between">
        <div>
          <div className="text-[10px] uppercase tracking-wider text-stone-500 flex items-center gap-1">
            Political Capital <CitationLink id="pc_regen_methodology" />
          </div>
          <div className="display-font text-3xl font-medium tabular-nums leading-none text-amber-400">
            {pc.toFixed(0)}
            <span className="text-base text-stone-500"> / 100</span>
          </div>
        </div>
        <div className="text-right">
          <div className="text-[10px] uppercase tracking-wider text-stone-500">Last quarter</div>
          <div className="text-[11px] text-stone-300" style={{ fontFamily: 'IBM Plex Mono' }}>
            {pcLog && pcLog[0] ? `${pcLog[0].delta >= 0 ? '+' : ''}${pcLog[0].delta.toFixed(1)}` : '—'}
          </div>
        </div>
      </div>
      <div>
        <div className="text-[10px] uppercase tracking-wider text-stone-500 mb-1 flex items-center justify-between">
          <span>Governing-Party Mood</span>
          <span className="text-stone-300" style={{ fontFamily: 'IBM Plex Mono' }}>{parliamentMood.toFixed(0)}</span>
        </div>
        <MoodBar value={parliamentMood} />
      </div>
      <div>
        <div className="text-[10px] uppercase tracking-wider text-stone-500 mb-1 flex items-center justify-between">
          <span className="flex items-center gap-1">
            PM Relationship <CitationLink id="pm_relationship_methodology" />
          </span>
          <span className="text-stone-300" style={{ fontFamily: 'IBM Plex Mono' }}>{pmRelationship.toFixed(0)}</span>
        </div>
        <MoodBar value={pmRelationship} />
      </div>
    </div>
  );
}

// SVG pie chart. `slices` is [{ id, value, color }]. Values get normalised.
function BlocPie({ slices, label }) {
  const total = slices.reduce((s, x) => s + x.value, 0) || 1;
  const R = 40, CX = 50, CY = 50;
  let acc = 0;
  return (
    <div className="flex-1">
      <div className="text-[10px] uppercase tracking-wider text-stone-500 mb-1 text-center">{label}</div>
      <svg viewBox="0 0 100 100" className="w-full" preserveAspectRatio="xMidYMid meet">
        {slices.map((s) => {
          if (s.value <= 0) return null;
          const start = (acc / total) * Math.PI * 2;
          acc += s.value;
          const end = (acc / total) * Math.PI * 2;
          const large = end - start > Math.PI ? 1 : 0;
          const x1 = CX + R * Math.sin(start);
          const y1 = CY - R * Math.cos(start);
          const x2 = CX + R * Math.sin(end);
          const y2 = CY - R * Math.cos(end);
          // Handle a 100% single-slice case (avoid degenerate arc).
          if (s.value >= total) {
            return <circle key={s.id} cx={CX} cy={CY} r={R} fill={s.color} />;
          }
          const d = `M ${CX} ${CY} L ${x1} ${y1} A ${R} ${R} 0 ${large} 1 ${x2} ${y2} Z`;
          return <path key={s.id} d={d} fill={s.color} />;
        })}
      </svg>
    </div>
  );
}

function TopSeats({ seats, label, color }) {
  if (seats.length === 0) return null;
  return (
    <div>
      <div className={`text-[10px] uppercase tracking-wider mb-1.5 ${color}`}>{label}</div>
      <div className="space-y-1">
        {seats.map(({ idx, seat, mood }) => (
          <div key={idx} className="flex items-center gap-2 text-[11px]">
            <span
              className="inline-block w-1.5 h-1.5 rounded-full flex-shrink-0"
              style={{ background: PARTY_COLORS[WINNER_BY_IDX[idx]] }}
            />
            <span className="text-stone-300 flex-1 truncate">{seat.name}</span>
            <span className="text-stone-500 text-[10px]">{seat.region.slice(0, 4)}</span>
            <span className="text-stone-200 tabular-nums" style={{ fontFamily: 'IBM Plex Mono' }}>
              {mood.toFixed(0)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function PcLog({ entries }) {
  if (!entries || entries.length === 0) return null;
  return (
    <details className="p-3 bg-stone-900/40 border border-stone-800 rounded-lg group">
      <summary className="text-[10px] uppercase tracking-wider text-stone-500 cursor-pointer flex items-center gap-1 list-none">
        <ChevronDown size={11} className="transition-transform group-open:rotate-0 -rotate-90" />
        PC Log
      </summary>
      <div className="space-y-1 mt-2">
        {entries.slice(0, 8).map((e, i) => (
          <div key={i} className="text-[11px] flex items-center gap-2">
            <span className="text-amber-500 text-[9px]" style={{ fontFamily: 'IBM Plex Mono' }}>Q{e.q}</span>
            <span className="text-stone-400 flex-1 truncate">{e.reason}</span>
            <span
              className={`tabular-nums ${e.delta >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}
              style={{ fontFamily: 'IBM Plex Mono' }}
            >
              {e.delta >= 0 ? '+' : ''}{e.delta.toFixed(1)}
            </span>
          </div>
        ))}
      </div>
    </details>
  );
}

function SeatList({ seatMoodById }) {
  const [filter, setFilter] = useState('');
  const [page, setPage] = useState(0);
  const PAGE = 30;
  const filtered = useMemo(() => {
    if (!filter) return CONSTITUENCIES;
    const q = filter.toLowerCase();
    return CONSTITUENCIES.filter(
      (c) => c.name.toLowerCase().includes(q) || c.region.toLowerCase().includes(q) || WINNER_BY_IDX[CONSTITUENCIES.indexOf(c)]?.toLowerCase().includes(q)
    );
  }, [filter]);
  const start = page * PAGE;
  const slice = filtered.slice(start, start + PAGE);
  return (
    <details className="p-3 bg-stone-900/40 border border-stone-800 rounded-lg group">
      <summary className="text-[10px] uppercase tracking-wider text-stone-500 cursor-pointer flex items-center gap-1 list-none">
        <ChevronDown size={11} className="transition-transform group-open:rotate-0 -rotate-90" />
        All Constituencies ({CONSTITUENCIES.length})
      </summary>
      <div className="mt-2">
        <div className="flex items-center gap-2 mb-2">
          <Search size={11} className="text-stone-500" />
          <input
            type="text"
            placeholder="Filter by name, region, or party..."
            value={filter}
            onChange={(e) => { setFilter(e.target.value); setPage(0); }}
            className="bg-stone-950 border border-stone-800 rounded px-2 py-1 text-[11px] flex-1 text-stone-300 outline-none focus:border-amber-600"
          />
          <span className="text-[10px] text-stone-500 tabular-nums" style={{ fontFamily: 'IBM Plex Mono' }}>{filtered.length}</span>
        </div>
        <div className="space-y-0.5">
          {slice.map((c) => {
            const i = CONSTITUENCIES.indexOf(c);
            const mood = seatMoodById[i];
            const winner = WINNER_BY_IDX[i];
            const moodColor = mood >= 60 ? 'text-emerald-400' : mood >= 40 ? 'text-stone-300' : 'text-rose-400';
            return (
              <div key={c.id} className="flex items-center gap-2 text-[11px] py-0.5">
                <span
                  className="inline-block w-1.5 h-1.5 rounded-full flex-shrink-0"
                  style={{ background: PARTY_COLORS[winner] }}
                  title={winner}
                />
                <span className="text-stone-300 flex-1 truncate">{c.name}</span>
                <span className="text-stone-500 text-[10px] w-12 text-right truncate">{c.region.slice(0, 6)}</span>
                <span className={`tabular-nums w-8 text-right ${moodColor}`} style={{ fontFamily: 'IBM Plex Mono' }}>
                  {mood.toFixed(0)}
                </span>
              </div>
            );
          })}
        </div>
        {filtered.length > PAGE && (
          <div className="flex justify-between mt-2 text-[10px] text-stone-400">
            <button
              disabled={page === 0}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              className="disabled:text-stone-700 hover:text-stone-100"
            >
              ‹ Prev
            </button>
            <span className="text-stone-500">{start + 1}–{Math.min(start + PAGE, filtered.length)} of {filtered.length}</span>
            <button
              disabled={start + PAGE >= filtered.length}
              onClick={() => setPage((p) => p + 1)}
              className="disabled:text-stone-700 hover:text-stone-100"
            >
              Next ›
            </button>
          </div>
        )}
      </div>
    </details>
  );
}

export function PoliticsTab({ game, projectedDeltas }) {
  const [openBlocId, setOpenBlocId] = useState(null);
  const counts = useMemo(() => partySeatCounts(), []);
  const happiest = useMemo(
    () => topSeatsByMood(game.parliament.seatMoodById, game.parliament, 4, true),
    [game.parliament.seatMoodById, game.parliament]
  );
  const unhappiest = useMemo(
    () => topSeatsByMood(game.parliament.seatMoodById, game.parliament, 4, false),
    [game.parliament.seatMoodById, game.parliament]
  );

  // Population pie — just normalises blocWeights.
  const populationSlices = useMemo(
    () => Object.keys(BLOCS).map((id) => ({
      id, value: game.blocWeights[id] ?? 0, color: BLOC_COLORS[id] ?? '#888',
    })),
    [game.blocWeights]
  );

  // Governing-party seat composition pie — for each governing-party seat,
  // take its dominant bloc and tally. Static per governing party.
  const seatBlocSlices = useMemo(() => {
    const counts = Object.fromEntries(Object.keys(BLOCS).map((id) => [id, 0]));
    const govParty = game.parliament.governingParty;
    for (let i = 0; i < CONSTITUENCIES.length; i++) {
      if (WINNER_BY_IDX[i] !== govParty) continue;
      const seat = CONSTITUENCIES[i];
      let bestBloc = null, bestWeight = -1;
      for (const id of Object.keys(BLOCS)) {
        const w = seat.blocShare?.[id] ?? 0;
        if (w > bestWeight) { bestWeight = w; bestBloc = id; }
      }
      if (bestBloc) counts[bestBloc] += 1;
    }
    return Object.keys(BLOCS).map((id) => ({
      id, value: counts[id], color: BLOC_COLORS[id] ?? '#888',
    }));
  }, [game.parliament.governingParty]);

  return (
    <div className="space-y-4">
      <PoliticsCapitalCard
        pc={game.politicalCapital}
        parliamentMood={game.parliamentMood}
        pmRelationship={game.pmRelationship}
        pcLog={game.pcLog}
      />

      <div className="p-3 bg-stone-900/40 border border-stone-800 rounded-lg">
        <div className="flex items-center justify-between mb-2">
          <div className="text-[10px] uppercase tracking-wider text-stone-500 flex items-center gap-1">
            House of Commons <CitationLink id="ralphascott_constituency_bundle" />
          </div>
          <div className="text-[10px] text-stone-500">{game.parliament.pmName}, PM</div>
        </div>
        <Hemicycle seatMoodById={game.parliament.seatMoodById} />
        <PartyLegend counts={counts} governingParty={game.parliament.governingParty} />
        <div className="text-[10px] text-stone-500 mt-2 leading-relaxed">
          Dot saturation reflects MP mood vs neutral 50.
          GB only (632 seats); NI's 18 omitted per source data.
        </div>
      </div>

      <div className="p-3 bg-stone-900/40 border border-stone-800 rounded-lg">
        <div className="text-[10px] uppercase tracking-wider text-stone-500 mb-2">Bloc Composition</div>
        <div className="flex gap-3">
          <BlocPie slices={populationSlices} label="Population" />
          <BlocPie slices={seatBlocSlices} label={`${game.parliament.governingParty} seats`} />
        </div>
        <div className="flex flex-wrap gap-x-2 gap-y-1 mt-3 justify-center">
          {Object.keys(BLOCS).map((id) => (
            <div key={id} className="flex items-center gap-1 text-[9px] text-stone-400">
              <span className="inline-block w-2 h-2 rounded-sm" style={{ background: BLOC_COLORS[id] }} />
              <span>{BLOCS[id].name}</span>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h2 className="display-font text-xl font-medium italic text-stone-100 mb-1">Voter Blocs</h2>
        <p className="text-[11px] text-stone-500 mb-2">Population share (small grey) shifts each quarter. Arrows show projected support drift. Tap a bloc name for details.</p>
        <div className="space-y-1.5">
          {Object.keys(BLOCS).map((id) => (
            <BlocBar key={id} blocId={id} support={game.blocSupport[id]}
                     weight={game.blocWeights[id]}
                     isCoalition={COALITION.includes(id)}
                     projectedDelta={projectedDeltas?.[id]}
                     onInfo={() => setOpenBlocId(id)} />
          ))}
        </div>
      </div>

      <div className="p-3 bg-stone-900/40 border border-stone-800 rounded-lg space-y-3">
        <TopSeats seats={happiest} label="Happiest Government MPs" color="text-emerald-500" />
        <TopSeats seats={unhappiest} label="Unhappiest Government MPs" color="text-rose-500" />
      </div>

      <PcLog entries={game.pcLog} />

      <SeatList seatMoodById={game.parliament.seatMoodById} />

      {openBlocId && <BlocInfoModal blocId={openBlocId} onClose={() => setOpenBlocId(null)} />}
    </div>
  );
}
