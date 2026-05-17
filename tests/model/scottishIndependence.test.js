// Scottish Independence reform — verifies that the new state-branch reform
// delivers its macro shocks on completion, lowers the devolved-transfer
// floor, and suppresses subsequent independenceMovement event firings.

import { describe, it, expect } from 'vitest';
import {
  CITATIONS,
  INITIAL_BLOC_SUPPORT,
  INITIAL_BLOC_WEIGHTS,
  PARAMS,
  REFORMS,
  computeRiskMods,
  makeInitialState,
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

function completed(reformId) {
  return {
    status: 'complete',
    startedQ: 1,
    completesQ: 1,
    reformDef: REFORMS[reformId],
    actualOutcome: {},
  };
}

describe('scottishIndependence — reform definition', () => {
  it('exists in REFORMS with the expected shape', () => {
    const r = REFORMS.scottishIndependence;
    expect(r).toBeDefined();
    expect(r.branch).toBe('state');
    expect(r.controversial).toBe(true);
    expect(r.growthBonusPermanent).toBe(true);
    expect(r.special).toBe('lowerDevolvedFloor');
  });

  it('per-leaf citations resolve in CITATIONS', () => {
    const r = REFORMS.scottishIndependence;
    expect(CITATIONS[r.citationId]).toBeDefined();
    expect(CITATIONS[r.cost.citationId]).toBeDefined();
    expect(CITATIONS[r.onComplete.growthBonus.citationId]).toBeDefined();
    expect(CITATIONS[r.onComplete.debt.citationId]).toBeDefined();
    expect(CITATIONS[r.onComplete.bondYield.citationId]).toBeDefined();
    expect(CITATIONS[r.riskMods.independenceMovement.citationId]).toBeDefined();
  });
});

describe('scottishIndependence — completion effects', () => {
  it('on completion, applies debt + bondYield shocks and permanent GDP shift', () => {
    let s = freshState();
    s.reforms = {
      scottishIndependence: {
        status: 'inProgress',
        startedQ: s.globalQuarter,
        completesQ: s.globalQuarter + 1,
        reformDef: REFORMS.scottishIndependence,
      },
    };

    const debtBefore = s.debt;
    const bondYieldBefore = s.bondYield;
    const permanentGrowthBefore = s.permanentGrowthShift ?? 0;
    const devolvedFloorBefore = s.devolvedCutFloor;

    s = withSeededRandom(7, () => stepQuarter(s));

    expect(s.reforms.scottishIndependence.status).toBe('complete');

    // Debt shock: +£25bn one-shot (±forecast band; just assert it moved up).
    expect(s.debt).toBeGreaterThan(debtBefore);

    // BondYield shock: +0.4pp one-shot (±forecast band; clamped by ceiling).
    expect(s.bondYield).toBeGreaterThan(bondYieldBefore);

    // Permanent GDP shift becomes more negative.
    expect((s.permanentGrowthShift ?? 0)).toBeLessThan(permanentGrowthBefore);

    // Devolved cut floor lowered by the special handler.
    expect(s.devolvedCutFloor).toBe(v(PARAMS.scottishIndependence.devolvedFloorAfter));
    expect(s.devolvedCutFloor).toBeLessThan(v(PARAMS.thresholds.devolvedCutFloor));
    expect(devolvedFloorBefore).toBeUndefined();
  });
});

describe('scottishIndependence — independenceMovement event suppression', () => {
  it('riskMods drives independenceMovement probability below clampMin with headroom', () => {
    // Squeeze devolved spending to maximise the spending-driven uplift, so
    // suppression has the most work to do. Floor is £65 pre-reform; setting
    // spendDevolved to £50 adds 15 × 1.2 = 18 pp to the base 3 pp = 21 pp pa.
    const baseline = freshState();
    baseline.spendDevolved = 50;
    const baseMods = computeRiskMods(baseline);

    const withReform = freshState();
    withReform.spendDevolved = 50;
    withReform.devolvedCutFloor = v(PARAMS.scottishIndependence.devolvedFloorAfter);
    withReform.reforms = { scottishIndependence: completed('scottishIndependence') };
    const reformMods = computeRiskMods(withReform);

    expect(reformMods.independenceMovement).toBeLessThan(baseMods.independenceMovement);
    expect(reformMods.independenceMovement).toBe(v(PARAMS.risks.clampMin));

    // Defence-in-depth: assert the *pre-clamp* value is well below the floor,
    // so a future tuning that weakens the riskMod toward −20 (currently −90)
    // would fail this test rather than silently relying on the clamp. A
    // re-tuning that takes us inside the headroom zone is the realistic
    // regression mode this assertion catches.
    const riskMod = v(REFORMS.scottishIndependence.riskMods.independenceMovement);
    const preClampWorstCase = v(PARAMS.risks.independenceMovement.base) + riskMod;
    expect(preClampWorstCase).toBeLessThan(v(PARAMS.risks.clampMin) - 30);
  });
});

describe('onComplete.debt / onComplete.bondYield — generic channel', () => {
  it('reform schema accepts and engine wires the new fields generically', () => {
    // The completion handler should read actual.debt and actual.bondYield
    // from the sampled outcome regardless of which reform declared them.
    // Verified via the scottishIndependence integration above; this case
    // documents the contract for future reforms that adopt the same channel.
    const r = REFORMS.scottishIndependence;
    expect(r.onComplete.debt).toHaveProperty('value');
    expect(r.onComplete.debt).toHaveProperty('citationId');
    expect(r.onComplete.bondYield).toHaveProperty('value');
    expect(r.onComplete.bondYield).toHaveProperty('citationId');
  });
});
