// Workforce / employment identities — pop × workingAgeShare × participation,
// then × (1 − unemployment/100).

import { describe, it, expect } from 'vitest';
import {
  INITIAL_BLOC_SUPPORT,
  INITIAL_BLOC_WEIGHTS,
  PARAMS,
  makeInitialState,
  computeWorkforce,
  computeEmployment,
} from '../../src/model/index.js';

const v = (leaf) => (leaf && typeof leaf === 'object' && 'value' in leaf) ? leaf.value : leaf;

function freshState() {
  return makeInitialState({
    initialBlocSupport: { ...INITIAL_BLOC_SUPPORT },
    initialBlocWeights: { ...INITIAL_BLOC_WEIGHTS },
  });
}

describe('labour-supply identity', () => {
  it('workforce = pop × workingAgeShare × participationRate', () => {
    const s = freshState();
    const expected = s.population
      * v(PARAMS.population.workingAgeShare)
      * s.participationRate;
    expect(computeWorkforce(s)).toBeCloseTo(expected, 6);
  });

  it('employment = workforce × (1 − unemployment/100)', () => {
    const s = freshState();
    const wf = computeWorkforce(s);
    const expected = wf * (1 - s.unemployment / 100);
    expect(computeEmployment(s)).toBeCloseTo(expected, 6);
  });

  it('higher unemployment lowers employment', () => {
    const base = freshState();
    const slack = { ...base, unemployment: base.unemployment + 1 };
    expect(computeEmployment(slack)).toBeLessThan(computeEmployment(base));
  });

  it('population growth raises both workforce and employment', () => {
    const base = freshState();
    const bigger = { ...base, population: base.population * 1.05 };
    expect(computeWorkforce(bigger)).toBeGreaterThan(computeWorkforce(base));
    expect(computeEmployment(bigger)).toBeGreaterThan(computeEmployment(base));
  });
});
