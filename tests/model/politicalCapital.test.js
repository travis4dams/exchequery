// Tests for political-capital regeneration, the reform-commit PC gate
// (defer-not-discard), and the cancelReform PC penalty.

import { describe, it, expect } from 'vitest';
import {
  INITIAL_BLOC_SUPPORT,
  INITIAL_BLOC_WEIGHTS,
  PARAMS,
  REFORMS,
  makeInitialState,
  computePcRegen,
  clampPc,
  stepQuarter,
  cancelReform,
} from '../../src/model/index.js';
import { withSeededRandom } from '../playtest/rng.js';

const v = (leaf) => (leaf && typeof leaf === 'object' && 'value' in leaf) ? leaf.value : leaf;

function freshState() {
  return makeInitialState({
    initialBlocSupport: { ...INITIAL_BLOC_SUPPORT },
    initialBlocWeights: { ...INITIAL_BLOC_WEIGHTS },
  });
}

describe('PC regen formula', () => {
  it('at neutral mood + neutral PM + below softCap, regen = baseRegen', () => {
    const s = freshState();
    s.parliamentMood = 50;
    s.pmRelationship = 50;
    s.politicalCapital = 60;  // below softCap (80)
    const { delta } = computePcRegen(s);
    expect(delta).toBeCloseTo(v(PARAMS.politicalCapital.baseRegen), 5);
  });

  it('positive mood + positive PM increases regen', () => {
    const s = freshState();
    s.parliamentMood = 70;
    s.pmRelationship = 70;
    s.politicalCapital = 50;
    const { delta } = computePcRegen(s);
    expect(delta).toBeGreaterThan(v(PARAMS.politicalCapital.baseRegen));
  });

  it('negative mood + negative PM can produce negative regen', () => {
    const s = freshState();
    s.parliamentMood = 20;
    s.pmRelationship = 20;
    s.politicalCapital = 30;
    const { delta } = computePcRegen(s);
    // base 8 + (-3.6) + (-2.4) = 2.0; still positive but small.
    expect(delta).toBeLessThan(v(PARAMS.politicalCapital.baseRegen));
  });

  it('softCap decay applies above 80', () => {
    const s = freshState();
    s.parliamentMood = 50;
    s.pmRelationship = 50;
    s.politicalCapital = 100;
    const { delta, breakdown } = computePcRegen(s);
    expect(breakdown.decay).toBeLessThan(0);
    expect(delta).toBeLessThan(v(PARAMS.politicalCapital.baseRegen));
  });

  it('clampPc bounds output to [0, 100]', () => {
    expect(clampPc(-5)).toBe(0);
    expect(clampPc(150)).toBe(100);
    expect(clampPc(50)).toBe(50);
  });
});

describe('reform commit PC gate', () => {
  it('reform commits and PC log records the spend', () => {
    const s = freshState();
    s.proposedReforms = ['obrIndependence'];  // cheap (4 PC), centrist
    const next = withSeededRandom(1, () => stepQuarter(s));
    expect(next.reforms.obrIndependence?.status).toBe('inProgress');
    expect(next.politicalCapital).toBeGreaterThanOrEqual(0);
    expect(next.politicalCapital).toBeLessThanOrEqual(100);
    // The pc log should record both the spend on commit and the quarterly regen.
    const reasons = next.pcLog.map((e) => e.reason);
    expect(reasons.some((r) => r.includes('Proposed:'))).toBe(true);
    expect(reasons.some((r) => r.includes('regeneration'))).toBe(true);
  });

  it('reform is DEFERRED (retained in queue) when PC insufficient, NOT discarded', () => {
    const s = freshState();
    s.politicalCapital = 1;  // not enough for any reform
    s.proposedReforms = ['wealthTax'];  // 22 base PC + opposition multiplier → ~50+
    const next = withSeededRandom(1, () => stepQuarter(s));
    expect(next.proposedReforms).toContain('wealthTax');
    expect(next.reforms.wealthTax).toBeUndefined();
  });

  it('insufficient capacity DISCARDS the reform (does not roll over)', () => {
    const s = freshState();
    s.politicalCapital = 90;
    // Fill capacity with in-progress reforms.
    s.spendNHS = 100;  // wreck capacity
    s.proposedReforms = ['nhsPay'];
    const next = withSeededRandom(1, () => stepQuarter(s));
    expect(next.proposedReforms).not.toContain('nhsPay');
  });
});

describe('cancelReform PC penalty', () => {
  it('deducts cancelPenalty from PC and applies PM relationship hit', () => {
    let s = freshState();
    s.proposedReforms = ['obrIndependence'];
    s = withSeededRandom(1, () => stepQuarter(s));  // commit obrIndependence
    const prePc = s.politicalCapital;
    const prePm = s.pmRelationship;
    const cancelled = cancelReform(s, 'obrIndependence');
    expect(cancelled.politicalCapital).toBe(prePc - v(PARAMS.politicalCapital.cancelPenalty));
    expect(cancelled.pmRelationship).toBe(prePm + v(PARAMS.pmRelationship.deltaCancel));
    expect(cancelled.reforms.obrIndependence).toBeUndefined();
  });
});
