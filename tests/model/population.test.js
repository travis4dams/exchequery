// Population decomposition — births / deaths / net-migration channels.
// Sign checks, baseline magnitude, and reform-completion deltas.

import { describe, it, expect } from 'vitest';
import {
  INITIAL_BLOC_SUPPORT,
  INITIAL_BLOC_WEIGHTS,
  PARAMS,
  makeInitialState,
  computeBirths,
  computeDeaths,
  computeNetMigration,
  stepQuarter,
  REFORMS,
} from '../../src/model/index.js';
import { withSeededRandom } from '../playtest/rng.js';

const v = (leaf) => (leaf && typeof leaf === 'object' && 'value' in leaf) ? leaf.value : leaf;

function freshState() {
  return makeInitialState({
    initialBlocSupport: { ...INITIAL_BLOC_SUPPORT },
    initialBlocWeights: { ...INITIAL_BLOC_WEIGHTS },
  });
}

describe('population baselines reproduce legacy net growth', () => {
  it('sums to ~25k/q on Q1 neutral state', () => {
    // Health and NHS anchors equal initial state → those terms are 0 at Q1.
    // Migration responds to (unemployment − NAIRU); at Q1 unemp=4.4, NAIRU=4.25,
    // the small slack-side drag pulls net slightly under the strict 25k/q.
    const s = freshState();
    const net = computeBirths(s) - computeDeaths(s) + computeNetMigration(s);
    expect(net).toBeGreaterThan(20);
    expect(net).toBeLessThan(30);
  });

  it('makeInitialState seeds births/deaths/netMigration at baseline', () => {
    const s = freshState();
    expect(s.births).toBe(v(PARAMS.population.birthsBaselineQ));
    expect(s.deaths).toBe(v(PARAMS.population.deathsBaselineQ));
    expect(s.netMigration).toBe(v(PARAMS.population.netMigrationBaselineQ));
  });
});

describe('channel sign checks', () => {
  it('higher healthIndex raises births', () => {
    const lo = { ...freshState(), healthIndex: 40 };
    const hi = { ...freshState(), healthIndex: 70 };
    expect(computeBirths(hi)).toBeGreaterThan(computeBirths(lo));
  });

  it('higher healthIndex reduces deaths', () => {
    const lo = { ...freshState(), healthIndex: 40 };
    const hi = { ...freshState(), healthIndex: 70 };
    expect(computeDeaths(hi)).toBeLessThan(computeDeaths(lo));
  });

  it('NHS underfunding raises deaths', () => {
    const underfunded = { ...freshState(), spendNHS: v(PARAMS.initial.spendNHS) - 30 };
    expect(computeDeaths(underfunded)).toBeGreaterThan(computeDeaths(freshState()));
  });

  it('unemployment above NAIRU reduces net migration', () => {
    const base = freshState();
    const slack = { ...base, unemployment: base.naturalUnemployment + 2 };
    expect(computeNetMigration(slack)).toBeLessThan(computeNetMigration(base));
  });

  it('immigrationCap complete cuts net migration by the calibrated delta', () => {
    const base = freshState();
    const capped = {
      ...base,
      reforms: { immigrationCap: { status: 'complete', reformDef: REFORMS.immigrationCap } },
    };
    const delta = computeNetMigration(capped) - computeNetMigration(base);
    expect(delta).toBeCloseTo(v(PARAMS.population.immigrationCapMigrationDeltaQ), 1);
  });

  it('freeChildcare complete raises births by the calibrated delta', () => {
    const base = freshState();
    const childcare = {
      ...base,
      reforms: { freeChildcare: { status: 'complete', reformDef: REFORMS.freeChildcare } },
    };
    const delta = computeBirths(childcare) - computeBirths(base);
    expect(delta).toBeCloseTo(v(PARAMS.population.childcareBirthsBoostQ), 1);
  });
});

describe('stepQuarter integration', () => {
  it('writes births/deaths/netMigration and their paths', () => {
    const s0 = freshState();
    const s1 = withSeededRandom(42, () => stepQuarter(s0));
    expect(s1.births).toBeGreaterThan(0);
    expect(s1.deaths).toBeGreaterThan(0);
    expect(typeof s1.netMigration).toBe('number');
    expect(s1.birthsPath.length).toBeGreaterThanOrEqual(2);
    expect(s1.deathsPath.length).toBeGreaterThanOrEqual(2);
    expect(s1.netMigrationPath.length).toBeGreaterThanOrEqual(2);
  });

  it('Q1→Q20 doNothing population tracks legacy baseline (±2%)', () => {
    let s = freshState();
    for (let q = 0; q < 20; q += 1) {
      s = withSeededRandom(q + 1, () => stepQuarter(s));
      // No reforms, no events resolved — pure baseline tick.
      s.pendingEvent = null;
      s.pendingEvents = [];
      s.pendingSummary = null;
    }
    const expectedPopGrowth = 20 * 0.025;  // 20 quarters × ~25k/q = +0.5m
    const actualGrowth = s.population - v(PARAMS.initial.population);
    // Tolerance allows for health/NHS/unemployment drift and the small
    // slack-side migration drag (unemp slightly above NAIRU at Q1).
    expect(Math.abs(actualGrowth - expectedPopGrowth)).toBeLessThan(0.15);
  });
});
