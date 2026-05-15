// Unit tests for the model layer. Small smoke tests that ensure the engine
// primitives behave as the playtest harness expects.

import { describe, it, expect } from 'vitest';
import {
  INITIAL_BLOC_SUPPORT,
  INITIAL_BLOC_WEIGHTS,
  REFORMS,
  makeInitialState,
  calcRevenue,
  calcSpending,
  calcBalance,
  quarterlyBlocDelta,
  sampleReformOutcome,
  rollEvents,
  stepQuarter,
} from '../../src/model/index.js';
import { withSeededRandom } from '../playtest/rng.js';

function freshState() {
  return makeInitialState({
    initialBlocSupport: { ...INITIAL_BLOC_SUPPORT },
    initialBlocWeights: { ...INITIAL_BLOC_WEIGHTS },
  });
}

describe('revenue/spending primitives', () => {
  it('calcRevenue returns positive totals on initial state', () => {
    const s = freshState();
    const r = calcRevenue(s);
    expect(r.total).toBeGreaterThan(0);
    expect(r.incomeTax).toBeGreaterThan(0);
    expect(r.corpTax).toBeGreaterThan(0);
    expect(r.vat).toBeGreaterThan(0);
  });

  it('calcSpending returns positive totals on initial state', () => {
    const s = freshState();
    const sp = calcSpending(s);
    expect(sp.total).toBeGreaterThan(0);
    expect(sp.debtInterest).toBeGreaterThan(0);
    expect(sp.departmental).toBeGreaterThan(0);
  });

  it('calcBalance = revenue.total - spending.total', () => {
    const s = freshState();
    const expected = calcRevenue(s).total - calcSpending(s).total;
    expect(calcBalance(s)).toBeCloseTo(expected, 6);
  });
});

describe('bloc dynamics', () => {
  it('quarterlyBlocDelta returns zero magnitude when all levers at anchor (modulo drift)', () => {
    const s = freshState();
    const d = quarterlyBlocDelta(s);
    // All bloc supports start at BLOCS.base, so the drift-toward-baseline is
    // zero, and no policy lever is off anchor. Every bloc delta should be ~0.
    for (const [id, delta] of Object.entries(d)) {
      expect(Math.abs(delta)).toBeLessThan(0.01);
    }
  });
});

describe('reform sampling', () => {
  it('sampleReformOutcome is deterministic under a fixed seed', () => {
    const reform = REFORMS.hmrcCapacity;
    const a = withSeededRandom(42, () => sampleReformOutcome(reform, 0.25));
    const b = withSeededRandom(42, () => sampleReformOutcome(reform, 0.25));
    expect(a.revBonus).toBeCloseTo(b.revBonus, 12);
  });

  it('sampleReformOutcome stays within forecastNoise band', () => {
    const reform = REFORMS.hmrcCapacity;
    const noise = 0.25;
    const baseline = 4;  // hmrcCapacity onComplete.revBonus
    for (let seed = 1; seed < 50; seed++) {
      const out = withSeededRandom(seed, () => sampleReformOutcome(reform, noise));
      expect(out.revBonus).toBeGreaterThan(baseline * (1 - noise) - 1e-9);
      expect(out.revBonus).toBeLessThan(baseline * (1 + noise) + 1e-9);
    }
  });
});

describe('event rolling', () => {
  it('rollEvents returns [] when all mods are zero', () => {
    const s = freshState();
    const triggered = withSeededRandom(1, () => rollEvents(s, {}));
    expect(triggered).toEqual([]);
  });
});

describe('stepQuarter', () => {
  it('increments quarter by 1 per call', () => {
    let s = freshState();
    s = withSeededRandom(1, () => stepQuarter(s));
    expect(s.quarter).toBe(2);
    expect(s.globalQuarter).toBe(2);
  });

  it('attaches pendingSummary every step', () => {
    let s = freshState();
    s = withSeededRandom(1, () => stepQuarter(s));
    expect(s.pendingSummary).toBeTruthy();
    expect(s.pendingSummary.quarter).toBe(1); // summary describes the quarter just finished
  });

  it('commits proposed reforms to inProgress, debiting cost', () => {
    let s = freshState();
    const debtBefore = s.debt;
    s = { ...s, proposedReforms: ['hmrcCapacity'] };
    s = withSeededRandom(1, () => stepQuarter(s));
    expect(s.reforms.hmrcCapacity.status).toBe('inProgress');
    expect(s.debt).toBeGreaterThan(debtBefore);  // cost was added
    expect(s.proposedReforms).toEqual([]);
  });
});
