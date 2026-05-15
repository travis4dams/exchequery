import React, { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import {
  CONSTITUENCIES,
  WINNER_BY_IDX,
  PARTY_COLORS,
  SEAT_COUNT,
  topSeatsByMood,
  partySeatCounts,
  PARAMS,
} from '../model/index.js';
import { CitationLink } from './primitives/CitationLink.jsx';

const v = (leaf) => (leaf && typeof leaf === 'object' && 'value' in leaf) ? leaf.value : leaf;

// =============================================================================
// Hemicycle layout — 632 seats arranged in concentric arcs.
// Precomputed once at module load.
// =============================================================================
const HEMICYCLE_GEOMETRY = (() => {
  const ROWS = 12;
  const seats = [];
  // Distribute seats across rows roughly proportional to arc length.
  // Total = 632; closer rows have fewer seats than outer rows.
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
      const theta = Math.PI - t * Math.PI;  // π (left) → 0 (right)
      seats.push({ x: 120 + r * Math.cos(theta), y: 130 - r * Math.sin(theta) });
    }
  }
  // We may have produced ≠ SEAT_COUNT due to rounding — truncate or pad.
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
        // Alpha: 0.35 at neutral (50), 1.0 at extreme (0 or 100).
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
    <div className="p-3 bg-stone-900/40 border border-stone-800 rounded-lg">
      <div className="text-[10px] uppercase tracking-wider text-stone-500 mb-2">PC Log</div>
      <div className="space-y-1">
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
    </div>
  );
}

function SeatList({ parliament, seatMoodById }) {
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
    <div className="p-3 bg-stone-900/40 border border-stone-800 rounded-lg">
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
  );
}

export function ParliamentTab({ game }) {
  const counts = useMemo(() => partySeatCounts(), []);
  const happiest = useMemo(
    () => topSeatsByMood(game.parliament.seatMoodById, game.parliament, 4, true),
    [game.parliament.seatMoodById, game.parliament]
  );
  const unhappiest = useMemo(
    () => topSeatsByMood(game.parliament.seatMoodById, game.parliament, 4, false),
    [game.parliament.seatMoodById, game.parliament]
  );

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
          Ideology vectors via CHES 2024 party anchors + per-seat Brexit residuals.
        </div>
      </div>

      <div className="p-3 bg-stone-900/40 border border-stone-800 rounded-lg space-y-3">
        <TopSeats seats={happiest} label="Happiest Government MPs" color="text-emerald-500" />
        <TopSeats seats={unhappiest} label="Unhappiest Government MPs" color="text-rose-500" />
      </div>

      <PcLog entries={game.pcLog} />

      <SeatList parliament={game.parliament} seatMoodById={game.parliament.seatMoodById} />
    </div>
  );
}
