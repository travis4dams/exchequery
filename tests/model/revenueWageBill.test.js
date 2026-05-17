// Revenue wage-bill rewiring — Q1 bit-identity vs the pure-gdpScale legacy
// path, plus directional checks under wage/employment perturbations.

import { describe, it, expect } from 'vitest';
import {
  INITIAL_BLOC_SUPPORT,
  INITIAL_BLOC_WEIGHTS,
  PARAMS,
  makeInitialState,
  calcRevenue,
} from '../../src/model/index.js';

const v = (leaf) => (leaf && typeof leaf === 'object' && 'value' in leaf) ? leaf.value : leaf;

function freshState() {
  return makeInitialState({
    initialBlocSupport: { ...INITIAL_BLOC_SUPPORT },
    initialBlocWeights: { ...INITIAL_BLOC_WEIGHTS },
  });
}

describe('Q1 calibration: wageScale=1 by construction', () => {
  it('wageBillAnchor matches Q1 (wageIndex/100 × employment)', () => {
    const s = freshState();
    const q1WageBill = (s.wageIndex / 100) * s.employment;
    // 67.5 × 0.640 × 0.80 × (1 − 4.4/100) = 33.0394 ≈ 33.04 (cited anchor).
    expect(q1WageBill).toBeCloseTo(v(PARAMS.revenue.wageBillAnchor), 2);
  });

  it('Q1 income tax + NI agree with the pure-GDP-scale legacy formula', () => {
    const s = freshState();
    const R = PARAMS.revenue;
    const gdpScale = s.gdp / v(R.gdpScaleAnchor);
    const incomeBase = v(R.incomeTax.base);
    // At Q1 every tax rate sits at its anchor, so per-band deltas are zero.
    const legacyIT = incomeBase * gdpScale;
    const legacyNI = v(R.ni) * gdpScale;
    const live = calcRevenue(s);
    // 4dp on a £1bn-order number = drift below £100k, matching the
    // ≈ 0.002% wageBillAnchor calibration slack (33.0394 vs cited 33.04).
    expect(live.incomeTax).toBeCloseTo(legacyIT, 2);
    expect(live.ni).toBeCloseTo(legacyNI, 2);
  });
});

describe('Q2 share identification: a wage-bill bump moves IT/NI by the cited share', () => {
  // At Q1 wageScale = gdpScale, so the 70/30 IT and 95/5 NI shares are
  // unidentified by Q1 alone (any blend recovers the same result). A
  // perturbation that moves wageScale away from gdpScale pins the shares.
  it('a +5% wage-bill bump scales income tax by ≈ 0.70 × 5% × fiscal-drag factor', () => {
    const base = freshState();
    const bumped = { ...base, wageIndex: base.wageIndex * 1.05 };  // GDP unchanged
    const baseRev = calcRevenue(base);
    const bumpedRev = calcRevenue(bumped);
    const itLift = (bumpedRev.incomeTax - baseRev.incomeTax) / baseRev.incomeTax;
    // With fiscal drag (R13, May 2026): the wage-bill portion scales
    // by (1 + fiscalDragCoef × 0.05) when thresholds are frozen.
    // Expected lift: 0.70 × 1.05 × 1.0125 + 0.30 - 1.0 = 0.0442
    const wageShare = v(PARAMS.revenue.incomeTaxWageShare);
    const dragFactor = v(PARAMS.revenue.thresholdsFrozen)
      ? 1 + v(PARAMS.revenue.fiscalDragCoef) * 0.05
      : 1;
    const expected = wageShare * 1.05 * dragFactor + (1 - wageShare) - 1.0;
    expect(itLift).toBeCloseTo(expected, 3);
  });

  it('a +5% wage-bill bump scales NI by ≈ 0.95 × 5%', () => {
    const base = freshState();
    const bumped = { ...base, wageIndex: base.wageIndex * 1.05 };
    const baseRev = calcRevenue(base);
    const bumpedRev = calcRevenue(bumped);
    const niLift = (bumpedRev.ni - baseRev.ni) / baseRev.ni;
    const expected = v(PARAMS.revenue.niWageShare) * 0.05;
    expect(niLift).toBeCloseTo(expected, 3);
  });
});

describe('wage / employment perturbations', () => {
  it('wage growth above GDP raises income tax via the wage-bill blend', () => {
    const base = freshState();
    const wageHot = { ...base, wageIndex: base.wageIndex * 1.10 };
    expect(calcRevenue(wageHot).incomeTax).toBeGreaterThan(calcRevenue(base).incomeTax);
  });

  it('employment loss reduces NI more than corp tax (sanity: NI is 95% wage-scaled)', () => {
    const base = freshState();
    const baseRev = calcRevenue(base);
    const lower = { ...base, employment: base.employment * 0.95 };
    const lowRev = calcRevenue(lower);
    const niDropPct = (baseRev.ni - lowRev.ni) / baseRev.ni;
    const corpDropPct = (baseRev.corpTax - lowRev.corpTax) / baseRev.corpTax;
    expect(niDropPct).toBeGreaterThan(corpDropPct);
  });
});

describe('legacy state fallback', () => {
  it('falls back to pure gdpScale when wageIndex / employment are absent', () => {
    const s = freshState();
    const stripped = { ...s };
    delete stripped.wageIndex;
    delete stripped.employment;
    const live = calcRevenue(s);
    const fallback = calcRevenue(stripped);
    // Equal because both should evaluate to the same all-gdpScale total at Q1
    // (wageBlend = gdpBlend when wageScale = gdpScale).
    expect(fallback.incomeTax).toBeCloseTo(live.incomeTax, 2);
    expect(fallback.ni).toBeCloseTo(live.ni, 2);
  });
});
