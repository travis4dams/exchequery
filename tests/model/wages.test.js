// Wage dynamics — asymmetric Phillips, productivity passthrough, education
// premium, mean reversion, and the wage-price spiral contribution.

import { describe, it, expect } from 'vitest';
import {
  INITIAL_BLOC_SUPPORT,
  INITIAL_BLOC_WEIGHTS,
  PARAMS,
  REFORMS,
  makeInitialState,
  updateWageIndex,
  wageSpiralContribution,
  stepQuarter,
} from '../../src/model/index.js';
import { withSeededRandom } from '../playtest/rng.js';

const v = (leaf) => (leaf && typeof leaf === 'object' && 'value' in leaf) ? leaf.value : leaf;

function freshState() {
  return makeInitialState({
    initialBlocSupport: { ...INITIAL_BLOC_SUPPORT },
    initialBlocWeights: { ...INITIAL_BLOC_WEIGHTS },
  });
}

describe('asymmetric Phillips — hot labour only', () => {
  it('tight labour market raises next-quarter wage index', () => {
    const s = freshState();
    s.unemployment = s.naturalUnemployment - 2;  // 2pp hot
    const next = updateWageIndex(s);
    expect(next).toBeGreaterThan(s.wageIndex);
  });

  it('slack labour market does NOT cool wages via the Phillips term', () => {
    // The Phillips term is zero when unemp > NAIRU; the AR(1) blend toward
    // nominal trend still applies, so the index drifts. Compare to a
    // counterfactual where unemp is exactly NAIRU.
    const sNeutral = freshState();
    sNeutral.unemployment = sNeutral.naturalUnemployment;
    const sSlack = freshState();
    sSlack.unemployment = sSlack.naturalUnemployment + 2;
    const wNeutral = updateWageIndex(sNeutral);
    const wSlack = updateWageIndex(sSlack);
    expect(wSlack).toBeCloseTo(wNeutral, 6);
  });
});

describe('education premium', () => {
  it('higher educationIndex raises wage growth', () => {
    const lo = freshState(); lo.educationIndex = 50;
    const hi = freshState(); hi.educationIndex = 80;
    expect(updateWageIndex(hi)).toBeGreaterThan(updateWageIndex(lo));
  });
});

describe('wage spiral contribution', () => {
  // spiralCoef is live (0.10) with a 4pp trigger gap — fires only at
  // sustained overheating (wage growth > ~6.6%/yr).
  it('returns 0 when wage growth is below trend', () => {
    const s = freshState();
    s.wageIndexPath = [100, 100.5];  // 2% ann growth — below 2.6 trend
    s.wageIndex = 100.5;
    expect(wageSpiralContribution(s)).toBe(0);
  });

  it('returns 0 when wage growth is above trend but inside the trigger gap', () => {
    const s = freshState();
    s.wageIndexPath = [100, 101.25];  // 5% ann growth — above 2.6 but inside +4pp gap
    s.wageIndex = 101.25;
    expect(wageSpiralContribution(s)).toBe(0);
  });

  it('fires positively when wage growth crosses the trigger gap', () => {
    const s = freshState();
    s.wageIndexPath = [100, 102];  // 8% ann growth — exceeds 2.6 + 4 = 6.6
    s.wageIndex = 102;
    expect(wageSpiralContribution(s)).toBeGreaterThan(0);
  });
});

describe('reform-completion wageIndexBump (onComplete walker)', () => {
  it('realLivingWage completion raises wageIndex by livingWageBump', () => {
    let s = freshState();
    // Force-complete realLivingWage: place it in reforms with completesQ
    // = globalQuarter so it completes this step.
    s.reforms = {
      realLivingWage: {
        status: 'inProgress',
        startedQ: 1,
        completesQ: s.globalQuarter + 1,
        reformDef: REFORMS.realLivingWage,
      },
    };
    const before = s.wageIndex;
    s = withSeededRandom(7, () => stepQuarter(s));
    // Bump applied AFTER updateWageIndex this step; the path entry pushed at
    // step 7b reflects the post-bump value, so the path's last entry is
    // (organicNext + bump). Compare to baseline without bump.
    // The bump is sampled with a band (±25% fallback), so allow a wide range.
    const bumpMin = v(PARAMS.wages.livingWageBump) * 0.5;
    const expectedNext = before + bumpMin;  // organic ~ no change at neutral
    expect(s.wageIndex).toBeGreaterThan(expectedNext);
  });
});

describe('stepQuarter writes wage state and paths', () => {
  it('seeds wageIndex, realWageIndex, employment, productivityIndex', () => {
    const s = freshState();
    expect(s.wageIndex).toBe(v(PARAMS.wages.initial));
    expect(s.realWageIndex).toBe(v(PARAMS.wages.initial));
    expect(s.productivityIndex).toBe(100);
    expect(s.employment).toBeGreaterThan(30);  // ~33m
  });

  it('appends paths after one tick', () => {
    let s = freshState();
    s = withSeededRandom(1, () => stepQuarter(s));
    expect(s.wageIndexPath.length).toBeGreaterThanOrEqual(2);
    expect(s.realWageIndexPath.length).toBeGreaterThanOrEqual(2);
    expect(s.employmentPath.length).toBeGreaterThanOrEqual(2);
    expect(s.productivityIndexPath.length).toBeGreaterThanOrEqual(2);
  });
});
