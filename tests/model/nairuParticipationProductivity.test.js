// Direct unit coverage for the three state-variable updaters added in the
// May 2026 realism-audit follow-up: NAIRU hysteresis, participation drift,
// and the state-driven productivity-growth blend. These functions are
// otherwise only exercised indirectly via the Q20 population trajectory and
// the playtest harness; pinning their behaviour here catches sign/coefficient
// regressions before integration tests notice.

import { describe, it, expect } from 'vitest';
import {
  INITIAL_BLOC_SUPPORT,
  INITIAL_BLOC_WEIGHTS,
  PARAMS,
  makeInitialState,
  computeProductivityGrowthAnn,
  updateNAIRU,
  updateParticipation,
} from '../../src/model/index.js';

const v = (leaf) => (leaf && typeof leaf === 'object' && 'value' in leaf) ? leaf.value : leaf;

function freshState() {
  return makeInitialState({
    initialBlocSupport: { ...INITIAL_BLOC_SUPPORT },
    initialBlocWeights: { ...INITIAL_BLOC_WEIGHTS },
  });
}

describe('updateNAIRU — Phelps-Friedman hysteresis', () => {
  it('idempotent at equilibrium (gap = 0)', () => {
    const s = freshState();
    s.unemployment = s.naturalUnemployment;
    expect(updateNAIRU(s)).toBeCloseTo(s.naturalUnemployment, 9);
  });

  it('single-step delta equals hysteresisRate × gap', () => {
    const s = freshState();
    s.unemployment = s.naturalUnemployment + 2.0;  // 2pp gap
    const expected = s.naturalUnemployment + v(PARAMS.nairu.hysteresisRate) * 2.0;
    expect(updateNAIRU(s)).toBeCloseTo(expected, 9);
  });

  it('sustained-high unemployment drifts NAIRU up over time', () => {
    let s = freshState();
    s.unemployment = 7.0;
    const initial = s.naturalUnemployment;
    for (let i = 0; i < 20; i++) s.naturalUnemployment = updateNAIRU(s);
    expect(s.naturalUnemployment).toBeGreaterThan(initial);
    expect(s.naturalUnemployment).toBeLessThan(7.0);  // never overshoots target
  });

  it('sustained-tight market drifts NAIRU down over time', () => {
    let s = freshState();
    s.unemployment = 3.0;
    const initial = s.naturalUnemployment;
    for (let i = 0; i < 20; i++) s.naturalUnemployment = updateNAIRU(s);
    expect(s.naturalUnemployment).toBeLessThan(initial);
    expect(s.naturalUnemployment).toBeGreaterThan(3.0);
  });

  it('cap binds when unemployment is pinned far above NAIRU', () => {
    let s = freshState();
    s.unemployment = 15.0;
    s.naturalUnemployment = 6.4;
    for (let i = 0; i < 500; i++) s.naturalUnemployment = updateNAIRU(s);
    expect(s.naturalUnemployment).toBeCloseTo(v(PARAMS.nairu.cap), 6);
  });

  it('floor binds when unemployment is pinned far below NAIRU', () => {
    let s = freshState();
    s.unemployment = 0;
    s.naturalUnemployment = 3.6;
    for (let i = 0; i < 500; i++) s.naturalUnemployment = updateNAIRU(s);
    expect(s.naturalUnemployment).toBeCloseTo(v(PARAMS.nairu.floor), 6);
  });

  it('falls back to PARAMS.initial.naturalUnemployment when state field is undefined', () => {
    const partial = { unemployment: 4.7 };
    // No naturalUnemployment on state → fallback to initial 4.7; gap = 0 → same value.
    expect(updateNAIRU(partial)).toBeCloseTo(v(PARAMS.initial.naturalUnemployment), 6);
  });
});

describe('updateParticipation — health + reform drift around OECD anchor', () => {
  it('idempotent at equilibrium (anchor with neutral health, no reforms)', () => {
    const s = freshState();
    s.healthIndex = 50;  // healthCoef × 0 = 0
    s.participationRate = v(PARAMS.participation.meanReversionTo);
    // forcing = anchor + 0 + 0 = anchor; reverted = persistence × anchor + (1−p) × anchor = anchor;
    // next = anchor + meanReversionRate × 0 = anchor. Bit-identity.
    expect(updateParticipation(s)).toBeCloseTo(v(PARAMS.participation.meanReversionTo), 9);
  });

  it('higher health raises participation over time (LCWRA channel sign)', () => {
    const initialP = v(PARAMS.initial.participationRate);
    let healthy = freshState(); healthy.healthIndex = 80;
    let sickly  = freshState(); sickly.healthIndex  = 30;
    for (let i = 0; i < 10; i++) {
      healthy.participationRate = updateParticipation(healthy);
      sickly.participationRate  = updateParticipation(sickly);
    }
    expect(healthy.participationRate).toBeGreaterThan(initialP);
    expect(sickly.participationRate).toBeLessThan(initialP);
  });

  it('freeChildcare completion lifts participation', () => {
    const without = freshState();
    const withCC  = freshState();
    withCC.reforms = { freeChildcare: { status: 'complete' } };
    const a = updateParticipation(without);
    const b = updateParticipation(withCC);
    expect(b).toBeGreaterThan(a);
  });

  it('stays inside [0.5, 1.0] under extreme health', () => {
    let s = freshState();
    s.healthIndex = 100;
    for (let i = 0; i < 200; i++) s.participationRate = updateParticipation(s);
    expect(s.participationRate).toBeLessThanOrEqual(1.0);
    s.healthIndex = 0;
    for (let i = 0; i < 200; i++) s.participationRate = updateParticipation(s);
    expect(s.participationRate).toBeGreaterThanOrEqual(0.5);
  });

  it('falls back to initial.participationRate when state field is undefined', () => {
    const partial = { healthIndex: 50 };
    // forcing = anchor + 0 + 0 = anchor (no childcare); cur = initial = anchor; reverted = anchor;
    // result is the anchor (which equals the initial value).
    expect(updateParticipation(partial))
      .toBeCloseTo(v(PARAMS.initial.participationRate), 6);
  });
});

describe('computeProductivityGrowthAnn — AR(1) blend on lagged + drivers', () => {
  it('returns trend with no argument (no-state shortcut)', () => {
    expect(computeProductivityGrowthAnn())
      .toBeCloseTo(v(PARAMS.gdpDecomposition.productivityTrend), 9);
  });

  it('returns trend at fresh state with neutral drivers', () => {
    const s = freshState();
    s.educationIndex = 60;  // zero out the eduDev contribution (fresh = 62, anchor = 60)
    // lastProductivityGrowthAnn = trend; drivers all at baseline ⇒ result = trend.
    expect(computeProductivityGrowthAnn(s))
      .toBeCloseTo(v(PARAMS.gdpDecomposition.productivityTrend), 6);
  });

  it('R&D above baseline raises productivity growth (sign + magnitude)', () => {
    const s = freshState();
    s.educationIndex = 60;  // isolate the R&D channel
    const trend = v(PARAMS.gdpDecomposition.productivityTrend);
    const w = v(PARAMS.productivity.laggedWeight);
    const coef = v(PARAMS.productivity.rndCoefPerBn);
    s.lastProductivityGrowthAnn = trend;
    s.spendRnD = v(PARAMS.initial.spendRnD) + 10;  // +£10bn
    // Expected: w × trend + (1−w) × (trend + 10 × coef) = trend + (1−w) × 10 × coef
    const expected = trend + (1 - w) * 10 * coef;
    expect(computeProductivityGrowthAnn(s)).toBeCloseTo(expected, 6);
  });

  it('education and infrastructure above anchor raise productivity (independent channels)', () => {
    const s = freshState();
    const trend = v(PARAMS.gdpDecomposition.productivityTrend);
    s.lastProductivityGrowthAnn = trend;
    const baseline = computeProductivityGrowthAnn(s);
    s.educationIndex = 70;  // 10pp above 60 anchor
    expect(computeProductivityGrowthAnn(s)).toBeGreaterThan(baseline);
    const eduOnly = computeProductivityGrowthAnn(s);
    s.spendInfra = v(PARAMS.initial.spendInfra) + 20;  // additional infra
    expect(computeProductivityGrowthAnn(s)).toBeGreaterThan(eduOnly);
  });

  it('lagged AR(1) blends prior growth at the laggedWeight', () => {
    const s = freshState();
    s.educationIndex = 60;  // isolate the lag channel from the education driver
    const trend = v(PARAMS.gdpDecomposition.productivityTrend);
    const w = v(PARAMS.productivity.laggedWeight);
    s.lastProductivityGrowthAnn = 0;  // forced prior of zero
    // Neutral drivers ⇒ result = w × 0 + (1−w) × trend = (1−w) × trend
    expect(computeProductivityGrowthAnn(s)).toBeCloseTo((1 - w) * trend, 6);
  });
});
