// Education-index dynamics — spend drift, mean reversion to 60, reform bumps.

import { describe, it, expect } from 'vitest';
import {
  INITIAL_BLOC_SUPPORT,
  INITIAL_BLOC_WEIGHTS,
  PARAMS,
  REFORMS,
  makeInitialState,
  updateEducationIndex,
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

describe('education index baseline', () => {
  it('seeds at PARAMS.education.initial (62)', () => {
    const s = freshState();
    expect(s.educationIndex).toBe(v(PARAMS.education.initial));
  });

  it('one tick at baseline spend stays near 62 and is pulled toward 60', () => {
    const s = freshState();
    const next = updateEducationIndex(s);
    // Persistence is high (0.90), so the move is small but biased toward 60.
    expect(next).toBeLessThan(s.educationIndex);
    expect(next).toBeGreaterThan(60);
  });
});

describe('education index sign checks', () => {
  it('higher schools spend raises the index', () => {
    const base = freshState();
    const lifted = { ...base, spendEdu: v(PARAMS.initial.spendEdu) + 20 };
    expect(updateEducationIndex(lifted)).toBeGreaterThan(updateEducationIndex(base));
  });

  it('underfunded schools depress the index', () => {
    const base = freshState();
    const cut = { ...base, spendEdu: v(PARAMS.initial.spendEdu) - 20 };
    expect(updateEducationIndex(cut)).toBeLessThan(updateEducationIndex(base));
  });

  it('skillsBudget completion bumps educationIndex via onComplete walker', () => {
    let s = freshState();
    const before = s.educationIndex;
    s.reforms = {
      skillsBudget: {
        status: 'inProgress',
        startedQ: 1,
        completesQ: s.globalQuarter + 1,
        reformDef: REFORMS.skillsBudget,
      },
    };
    s = withSeededRandom(11, () => stepQuarter(s));
    // Bump is sampled with a band; just confirm it lifted off the
    // organic-update trajectory by at least half the cited bump.
    const bumpMin = v(PARAMS.education.skillsBumpOnComplete) * 0.5;
    expect(s.educationIndex).toBeGreaterThan(before + bumpMin);
  });
});

describe('mean reversion', () => {
  it('pulls toward 60 over many quarters with baseline spend', () => {
    // Force a high starting value and watch it decay toward 60.
    let s = freshState();
    s.educationIndex = 80;
    for (let q = 0; q < 40; q += 1) {
      s = withSeededRandom(q + 100, () => stepQuarter(s));
      s.pendingEvent = null;
      s.pendingEvents = [];
      s.pendingSummary = null;
    }
    // After ten years it should drift well below 80, toward 60.
    expect(s.educationIndex).toBeLessThan(75);
  });
});
