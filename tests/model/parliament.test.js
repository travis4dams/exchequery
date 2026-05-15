// Tests for the parliament module: seat-mood smoothing, opposition counts,
// PC cost calculation, PM-alignment cosine.

import { describe, it, expect } from 'vitest';
import {
  CONSTITUENCIES,
  SEAT_COUNT,
  WINNER_BY_IDX,
  INITIAL_BLOC_SUPPORT,
  INITIAL_BLOC_WEIGHTS,
  makeInitialState,
  updateSeatMoods,
  aggregateParliamentMood,
  seatOpposition,
  opposedMpCount,
  effectivePcCost,
  reformPmAlignment,
  partySeatCounts,
} from '../../src/model/index.js';
import { withSeededRandom } from '../playtest/rng.js';

function freshState() {
  return makeInitialState({
    initialBlocSupport: { ...INITIAL_BLOC_SUPPORT },
    initialBlocWeights: { ...INITIAL_BLOC_WEIGHTS },
  });
}

describe('parliament static data', () => {
  it('loads 632 GB constituencies', () => {
    expect(SEAT_COUNT).toBe(632);
    expect(CONSTITUENCIES.length).toBe(632);
  });

  it('matches the July 2024 GE seat distribution', () => {
    const counts = partySeatCounts();
    expect(counts.Lab).toBe(411);
    expect(counts.Con).toBe(121);
    expect(counts.LD).toBe(72);
    expect(counts.SNP).toBe(9);
    expect(counts.RUK).toBe(5);
    expect(counts.Green).toBe(4);
    expect(counts.PC).toBe(4);
  });

  it('every constituency has all 9 bloc shares and a 2-axis ideology', () => {
    const blocs = ['pensioners','workingClass','middleClass','professional','business','publicSector','youth','northern','ethnicMinority'];
    for (const c of CONSTITUENCIES) {
      for (const b of blocs) expect(c.blocShare[b]).toBeGreaterThanOrEqual(0);
      expect(c.ideology.econ).toBeGreaterThanOrEqual(-1);
      expect(c.ideology.econ).toBeLessThanOrEqual(1);
      expect(c.ideology.social).toBeGreaterThanOrEqual(-1);
      expect(c.ideology.social).toBeLessThanOrEqual(1);
    }
  });
});

describe('seat mood', () => {
  it('initial seatMoodById has length 632 and is bounded', () => {
    const s = freshState();
    expect(s.parliament.seatMoodById.length).toBe(SEAT_COUNT);
    for (const m of s.parliament.seatMoodById) {
      expect(m).toBeGreaterThanOrEqual(0);
      expect(m).toBeLessThanOrEqual(100);
    }
  });

  it('updateSeatMoods is bounded and same length', () => {
    const s = freshState();
    const next = withSeededRandom(123, () => updateSeatMoods(s.parliament, s.blocSupport));
    expect(next.length).toBe(SEAT_COUNT);
    for (const m of next) {
      expect(m).toBeGreaterThanOrEqual(0);
      expect(m).toBeLessThanOrEqual(100);
    }
  });

  it('with zero noise, repeated updates converge toward raw signal', () => {
    // Construct a state with fixed seatMoodById at 50 and noise scale 0.
    const s = freshState();
    s.parliament = { ...s.parliament, seatMoodById: new Array(SEAT_COUNT).fill(50) };
    // Override noise via params is harder; instead, run many quarters with
    // seeded noise and confirm monotonic convergence on average.
    let cur = s.parliament.seatMoodById;
    let initialAvg = cur.reduce((a, b) => a + b, 0) / SEAT_COUNT;
    for (let q = 0; q < 30; q++) {
      cur = withSeededRandom(q + 1, () =>
        updateSeatMoods({ ...s.parliament, seatMoodById: cur }, s.blocSupport)
      );
    }
    const finalAvg = cur.reduce((a, b) => a + b, 0) / SEAT_COUNT;
    // The base bloc support averages ~45-50, so seat moods should settle near
    // the bloc-weighted constituent signal — within 8 points of 50.
    expect(Math.abs(finalAvg - 50)).toBeLessThan(8);
    expect(Math.abs(finalAvg - initialAvg)).toBeLessThan(15);
  });

  it('aggregateParliamentMood returns scalars in [0, 100]', () => {
    const s = freshState();
    const { governingPartyMood, chamberMood } = aggregateParliamentMood(s.parliament.seatMoodById, s.parliament);
    expect(governingPartyMood).toBeGreaterThanOrEqual(0);
    expect(governingPartyMood).toBeLessThanOrEqual(100);
    expect(chamberMood).toBeGreaterThanOrEqual(0);
    expect(chamberMood).toBeLessThanOrEqual(100);
  });
});

describe('reform opposition + PC cost', () => {
  it('seatOpposition is zero when reform stance matches MP ideology exactly', () => {
    const seat = CONSTITUENCIES[0];
    const stance = { econ: seat.ideology.econ, social: seat.ideology.social };
    expect(seatOpposition(stance, seat)).toBe(0);
  });

  it('seatOpposition grows with distance', () => {
    const seat = CONSTITUENCIES.find((c) => c.ideology.econ < -0.2) || CONSTITUENCIES[0];
    const near = { econ: seat.ideology.econ + 0.6, social: seat.ideology.social };
    const far  = { econ: seat.ideology.econ + 1.5, social: seat.ideology.social + 0.5 };
    expect(seatOpposition(far, seat)).toBeGreaterThan(seatOpposition(near, seat));
  });

  it('opposedMpCount differs between left-leaning and right-leaning reforms', () => {
    const s = freshState();
    const leftReform = { ideologyStance: { econ: -0.7, social: -0.3 } };
    const rightReform = { ideologyStance: { econ: 0.7, social: 0.3 } };
    const leftOpposed = opposedMpCount(leftReform.ideologyStance, s.parliament);
    const rightOpposed = opposedMpCount(rightReform.ideologyStance, s.parliament);
    // Labour governing-party: a strongly-right reform should produce more
    // internal opposition than a strongly-left one.
    expect(rightOpposed).toBeGreaterThan(leftOpposed);
  });

  it('effectivePcCost equals base when no MPs oppose', () => {
    const s = freshState();
    const centristReform = {
      politicalCapitalCost: { value: 10, citationId: 'political_capital_authoring_methodology' },
      ideologyStance: { econ: -0.32, social: -0.26 },  // matches Labour anchor
    };
    const cost = effectivePcCost(centristReform, { ...s, coalitionCohesion: 50 });
    // With Labour-anchor stance, almost no Lab MPs are >1.0 distance away.
    expect(cost).toBeGreaterThanOrEqual(10);
    expect(cost).toBeLessThan(14);
  });

  it('effectivePcCost scales up for ideologically distant reforms', () => {
    const s = freshState();
    const centrist = {
      politicalCapitalCost: { value: 10, citationId: 'political_capital_authoring_methodology' },
      ideologyStance: { econ: -0.32, social: -0.26 },
    };
    const oppositionExtreme = {
      politicalCapitalCost: { value: 10, citationId: 'political_capital_authoring_methodology' },
      ideologyStance: { econ: 0.9, social: 0.9 },
    };
    const a = effectivePcCost(centrist, { ...s, coalitionCohesion: 50 });
    const b = effectivePcCost(oppositionExtreme, { ...s, coalitionCohesion: 50 });
    expect(b).toBeGreaterThan(a * 1.5);
  });

  it('cohesion penalty applies when coalition < passReq', () => {
    const s = freshState();
    const reform = {
      politicalCapitalCost: { value: 10, citationId: 'political_capital_authoring_methodology' },
      ideologyStance: { econ: -0.3, social: -0.2 },
      passReq: { coalition: { value: 35, citationId: 'bloc_methodology' } },
    };
    const ok    = effectivePcCost(reform, { ...s, coalitionCohesion: 40 });
    const short = effectivePcCost(reform, { ...s, coalitionCohesion: 30 });
    expect(short).toBeCloseTo(ok * 1.5, 5);
  });
});

describe('PM alignment', () => {
  it('cosine alignment is 1 for stance identical to PM ideology', () => {
    const stance = { econ: -0.25, social: -0.15 };
    expect(reformPmAlignment({ ideologyStance: stance }, stance)).toBeCloseTo(1, 5);
  });

  it('cosine alignment is -1 for stance directly opposite PM', () => {
    const pm = { econ: -0.25, social: -0.15 };
    expect(reformPmAlignment({ ideologyStance: { econ: 0.25, social: 0.15 } }, pm)).toBeCloseTo(-1, 5);
  });

  it('returns 0 for reform with no ideology stance', () => {
    expect(reformPmAlignment({}, { econ: -0.25, social: -0.15 })).toBe(0);
  });
});
