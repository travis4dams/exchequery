// Tests for the PM-relationship dynamics.

import { describe, it, expect } from 'vitest';
import {
  INITIAL_BLOC_SUPPORT,
  INITIAL_BLOC_WEIGHTS,
  PARAMS,
  REFORMS,
  makeInitialState,
  computePmRelationshipDelta,
  clampPmRelationship,
} from '../../src/model/index.js';

const v = (leaf) => (leaf && typeof leaf === 'object' && 'value' in leaf) ? leaf.value : leaf;

function freshState() {
  return makeInitialState({
    initialBlocSupport: { ...INITIAL_BLOC_SUPPORT },
    initialBlocWeights: { ...INITIAL_BLOC_WEIGHTS },
  });
}

describe('PM relationship dynamics', () => {
  it('aligned reform completion produces positive delta', () => {
    const s = freshState();
    s.pmRelationship = 50;  // at target → no mean reversion
    const labReform = {
      name: 'aligned',
      ideologyStance: { econ: -0.30, social: -0.15 },  // close to Lab anchor / PM
    };
    const { delta } = computePmRelationshipDelta(s, { completedReforms: [labReform], cohesion: 50 });
    expect(delta).toBeGreaterThan(0);
  });

  it('opposed reform completion produces negative delta', () => {
    const s = freshState();
    s.pmRelationship = 50;
    const tory = {
      name: 'opposed',
      ideologyStance: { econ: 0.7, social: 0.5 },
    };
    const { delta } = computePmRelationshipDelta(s, { completedReforms: [tory], cohesion: 50 });
    expect(delta).toBeLessThan(0);
  });

  it('cohesion below threshold triggers penalty', () => {
    const s = freshState();
    s.pmRelationship = 50;
    const { reasons } = computePmRelationshipDelta(s, { cohesion: 20 });
    expect(reasons.some((r) => r.reason === 'coalition cohesion low')).toBe(true);
  });

  it('bond yield breach triggers one-shot penalty', () => {
    const s = freshState();
    s.pmRelationship = 50;
    const { reasons } = computePmRelationshipDelta(s, { yieldBreached: true, cohesion: 50 });
    expect(reasons.some((r) => r.reason === 'bond yield breached threshold')).toBe(true);
  });

  it('surplus to debt paydown above threshold rewards PM relationship', () => {
    const s = freshState();
    s.pmRelationship = 50;
    const { reasons } = computePmRelationshipDelta(s, { surplusPaidDown: 25, cohesion: 50 });
    expect(reasons.some((r) => r.reason === 'surplus to debt paydown')).toBe(true);
  });

  it('mean reverts to target over time when no other signals', () => {
    let s = freshState();
    s.pmRelationship = 80;  // above target
    for (let i = 0; i < 60; i++) {
      const { delta } = computePmRelationshipDelta(s, { cohesion: 50 });
      s.pmRelationship = clampPmRelationship(s.pmRelationship + delta);
    }
    // After 60 quarters of pure mean reversion, should be very close to target.
    expect(Math.abs(s.pmRelationship - v(PARAMS.pmRelationship.meanReversionTarget))).toBeLessThan(2);
  });

  it('clamps to [0, 100]', () => {
    expect(clampPmRelationship(-10)).toBe(0);
    expect(clampPmRelationship(150)).toBe(100);
    expect(clampPmRelationship(60)).toBe(60);
  });
});
