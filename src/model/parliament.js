// =============================================================================
// Parliament — pure functions for seat-level political modelling.
//
// Each Westminster constituency is represented by a static demographic + ideology
// profile (loaded once from src/data/*.json). Per quarter, an MP's mood is
// computed from a weighted average of their constituents' bloc support, with
// inertia smoothing and a per-seat noise term. The governing-party-weighted
// aggregate of seat moods feeds the political-capital regeneration formula.
//
// Reforms carry an `ideologyStance` (econ, social). Each MP's distance from
// that stance, summed over governing-party seats above an opposition
// threshold, scales the political-capital cost the player pays to propose
// the reform.
//
// All state mutations live in gameStep.js; this module only exposes pure
// helpers.
// =============================================================================

import { PARAMS } from './params.js';
import constituenciesData from '../data/constituencies.json' with { type: 'json' };
import electionData from '../data/election2024.json' with { type: 'json' };
import partyIdeologyData from '../data/partyIdeology.json' with { type: 'json' };

const v = (leaf) => (leaf && typeof leaf === 'object' && 'value' in leaf) ? leaf.value : leaf;

// =============================================================================
// Static, frozen data
// =============================================================================

export const CONSTITUENCIES = Object.freeze(constituenciesData.constituencies);
export const ELECTION_2024 = Object.freeze(electionData.seats);
export const PARTY_ANCHORS = Object.freeze(partyIdeologyData.anchors);
export const SEAT_COUNT = CONSTITUENCIES.length;
export const SEAT_INDEX_BY_ID = new Map(
  CONSTITUENCIES.map((c, i) => [c.id, i])
);

export const BLOC_IDS_ARR = Object.freeze([
  'pensioners', 'workingClass', 'middleClass', 'professional',
  'business', 'publicSector', 'youth', 'northern', 'ethnicMinority',
]);

// Seats keyed by index, parallel to CONSTITUENCIES. Two static lookups:
// - winnerByIdx[i]: party-id string ('Lab', 'Con', ...) of the 2024 winner.
// - partyColorByIdx[i]: hex/CSS string for the hemicycle rendering.
export const WINNER_BY_IDX = Object.freeze(
  CONSTITUENCIES.map((c) => {
    const e = ELECTION_2024.find((x) => x.id === c.id);
    return e ? e.winner : 'Other';
  })
);

export const PARTY_COLORS = Object.freeze({
  Lab:    '#e4003b',
  Con:    '#0087dc',
  LD:     '#faa61a',
  SNP:    '#fff95d',
  PC:     '#005b54',
  Green:  '#6ab023',
  RUK:    '#12b6cf',
  Reform: '#12b6cf',
  Ind:    '#9ca3af',
  Spk:    '#9ca3af',
  Other:  '#9ca3af',
});

// =============================================================================
// Per-seat raw signal: weighted average of constituent bloc support,
// weighted by the seat's bloc shares. Same handling of overlapping bloc
// identities as engine.calcCoalitionCohesion.
// =============================================================================
function rawSignal(seat, blocSupport) {
  let num = 0, den = 0;
  for (const b of BLOC_IDS_ARR) {
    const w = seat.blocShare[b] ?? 0;
    if (w <= 0) continue;
    num += w * blocSupport[b];
    den += w;
  }
  return den > 0 ? num / den : 50;
}

// =============================================================================
// Initial parliament state. Called from makeInitialState.
//
// `governingParty` defaults to 'Lab' (the Labour July 2024 scenario). For
// future scenarios, swap election data + governingParty + pmIdeology.
// =============================================================================
export function makeInitialParliament({ blocSupport, governingParty = 'Lab' } = {}) {
  const seatMoodById = new Array(SEAT_COUNT);
  const governingPartySeatsIdx = new Array(SEAT_COUNT);
  const governingPartySeats = [];
  let governingPartySeatCount = 0;

  for (let i = 0; i < SEAT_COUNT; i++) {
    seatMoodById[i] = rawSignal(CONSTITUENCIES[i], blocSupport);
    const isGov = WINNER_BY_IDX[i] === governingParty ? 1 : 0;
    governingPartySeatsIdx[i] = isGov;
    if (isGov) {
      governingPartySeats.push(CONSTITUENCIES[i].id);
      governingPartySeatCount++;
    }
  }

  return {
    scenario: 'labour_july_2024',
    pmName: 'Keir Starmer',
    pmParty: 'Lab',
    pmIdeology: { econ: PARTY_ANCHORS.Lab.econ, social: PARTY_ANCHORS.Lab.social },
    governingParty,
    governingPartySeatCount,
    governingPartySeats,
    governingPartySeatsIdx,
    seatMoodById,
  };
}

// =============================================================================
// Per-quarter seat mood update.
//
// mood[i] = inertia * prev[i] + (1-inertia) * rawSignal[i] + noise
//
// Where noise is a per-seat uniform draw in [-seatMoodNoise, +seatMoodNoise].
// The independent per-seat noise models backbench whip-soundings + grumbling
// at a level finer than aggregate bloc opinion captures.
// =============================================================================
export function updateSeatMoods(parliament, blocSupport) {
  const inertia = v(PARAMS.parliament.inertia);
  const noiseScale = v(PARAMS.parliament.seatMoodNoise);
  const next = new Array(SEAT_COUNT);
  for (let i = 0; i < SEAT_COUNT; i++) {
    const raw = rawSignal(CONSTITUENCIES[i], blocSupport);
    const prev = parliament.seatMoodById[i];
    const noise = (Math.random() * 2 - 1) * noiseScale;
    let mood = inertia * prev + (1 - inertia) * raw + noise;
    if (mood < 0) mood = 0; else if (mood > 100) mood = 100;
    next[i] = mood;
  }
  return next;
}

// =============================================================================
// Aggregate scalars from per-seat moods.
//
// governingPartyMood — weighted only over the seats whose 2024 winner is the
// governing party. This is the political signal the player's PC depends on.
// chamberMood — flat average across all 632 seats. Displayed for context.
// =============================================================================
export function aggregateParliamentMood(seatMoodById, parliament) {
  let govSum = 0, govN = 0, allSum = 0;
  for (let i = 0; i < SEAT_COUNT; i++) {
    allSum += seatMoodById[i];
    if (parliament.governingPartySeatsIdx[i]) {
      govSum += seatMoodById[i];
      govN++;
    }
  }
  return {
    governingPartyMood: govN > 0 ? govSum / govN : 50,
    chamberMood: allSum / SEAT_COUNT,
  };
}

// =============================================================================
// Opposition: per-seat distance from a reform's ideology stance.
//
// Both (econ, social) live in [-1, +1]², so Euclidean distance is in
// [0, 2.83]. We treat distance below `oppositionThreshold` as supportive
// (residual 0); above it, the residual grows linearly. Used to count opposing
// MPs and to scale the PC cost.
// =============================================================================
export function seatOpposition(stance, seat) {
  if (!stance) return 0;
  const dx = stance.econ - seat.ideology.econ;
  const dy = stance.social - seat.ideology.social;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const threshold = v(PARAMS.parliament.oppositionThreshold);
  return dist > threshold ? dist - threshold : 0;
}

// Count of governing-party MPs whose opposition residual exceeds the
// strong-opposition cutoff. seatOpposition returns (dist - threshold), so a
// cutoff of 0.5 means absolute ideological distance > 1.0 — strongly opposed.
export function opposedMpCount(stance, parliament) {
  if (!stance) return 0;
  const cutoff = v(PARAMS.parliament.strongOppositionCutoff);
  let n = 0;
  for (let i = 0; i < SEAT_COUNT; i++) {
    if (!parliament.governingPartySeatsIdx[i]) continue;
    if (seatOpposition(stance, CONSTITUENCIES[i]) > cutoff) n++;
  }
  return n;
}

// =============================================================================
// Political-capital cost for proposing a reform.
//
// effectiveCost = baseCost * (1 + oppositionMult * rebellionFraction)
//                * (1 + softCohesionPenalty if passReq.coalition not met)
//
// The cohesion penalty is the soft layered gate: passReq.coalition is no
// longer a hard wall, but undershooting it makes the reform more expensive
// (arm-twisting the backbench).
// =============================================================================
export function effectivePcCost(reform, state) {
  const base = v(reform.politicalCapitalCost) ?? v(PARAMS.politicalCapital.defaultReformCost);
  const stance = reform.ideologyStance ?? { econ: 0, social: 0 };
  const opposed = opposedMpCount(stance, state.parliament);
  const govTotal = state.parliament.governingPartySeatCount;
  const rebellionFrac = govTotal > 0 ? opposed / govTotal : 0;
  const oppMult = v(PARAMS.parliament.oppositionMult);
  let cost = base * (1 + oppMult * rebellionFrac);

  if (reform.passReq?.coalition) {
    // Soft gate: if cohesion < passReq.coalition, apply backbench-rebellion surcharge.
    // The caller supplies state.coalitionCohesion; we recompute if needed.
    const passReq = v(reform.passReq.coalition);
    const cohesion = state.coalitionCohesion ?? null;
    if (cohesion !== null && cohesion < passReq) {
      cost *= v(PARAMS.parliament.cohesionPenaltyMult);
    }
  }
  return cost;
}

// Convenience for the UI: explain the cost breakdown for tooltips.
export function pcCostBreakdown(reform, state) {
  const base = v(reform.politicalCapitalCost) ?? v(PARAMS.politicalCapital.defaultReformCost);
  const stance = reform.ideologyStance ?? { econ: 0, social: 0 };
  const opposed = opposedMpCount(stance, state.parliament);
  const govTotal = state.parliament.governingPartySeatCount;
  const rebellionFrac = govTotal > 0 ? opposed / govTotal : 0;
  const oppMult = v(PARAMS.parliament.oppositionMult);
  const rebellionFactor = 1 + oppMult * rebellionFrac;
  const cohesion = state.coalitionCohesion ?? null;
  const passReq = reform.passReq?.coalition ? v(reform.passReq.coalition) : null;
  const cohesionTriggered = passReq !== null && cohesion !== null && cohesion < passReq;
  const cohesionFactor = cohesionTriggered ? v(PARAMS.parliament.cohesionPenaltyMult) : 1;
  return {
    base,
    opposed,
    govTotal,
    rebellionFrac,
    rebellionFactor,
    cohesionTriggered,
    cohesionFactor,
    total: base * rebellionFactor * cohesionFactor,
  };
}

// =============================================================================
// PM-relationship signed alignment for a completed reform.
//
// Cosine of (reform.ideologyStance, pmIdeology) ∈ [-1, +1]. Positive → reform
// aligns with PM; the engine awards a positive delta. Negative → reform
// opposes the PM; engine applies a penalty. Used in gameStep on reform
// completion.
// =============================================================================
export function reformPmAlignment(reform, pmIdeology) {
  const stance = reform.ideologyStance;
  if (!stance) return 0;
  const ax = stance.econ, ay = stance.social;
  const bx = pmIdeology.econ, by = pmIdeology.social;
  const magA = Math.sqrt(ax * ax + ay * ay);
  const magB = Math.sqrt(bx * bx + by * by);
  if (magA < 1e-6 || magB < 1e-6) return 0;
  return (ax * bx + ay * by) / (magA * magB);
}

// =============================================================================
// Top-N happiest / unhappiest governing-party MPs. UI helper.
// =============================================================================
export function topSeatsByMood(seatMoodById, parliament, n = 5, descending = true) {
  const indexed = [];
  for (let i = 0; i < SEAT_COUNT; i++) {
    if (!parliament.governingPartySeatsIdx[i]) continue;
    indexed.push([i, seatMoodById[i]]);
  }
  indexed.sort((a, b) => descending ? b[1] - a[1] : a[1] - b[1]);
  return indexed.slice(0, n).map(([i, mood]) => ({
    idx: i,
    seat: CONSTITUENCIES[i],
    mood,
  }));
}

// Party seat counts for the HUD / hemicycle aggregation.
export function partySeatCounts() {
  const counts = {};
  for (const w of WINNER_BY_IDX) counts[w] = (counts[w] ?? 0) + 1;
  return counts;
}
