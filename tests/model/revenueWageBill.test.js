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
    // Tolerance: anchor is rounded in citations to 33.28; actual Q1 is
    // 68 × 0.640 × 0.80 × 0.956 = 33.275 — agrees to 2 decimal places.
    expect(q1WageBill).toBeCloseTo(v(PARAMS.revenue.wageBillAnchor), 1);
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
    expect(live.incomeTax).toBeCloseTo(legacyIT, 1);
    expect(live.ni).toBeCloseTo(legacyNI, 1);
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
    expect(fallback.incomeTax).toBeCloseTo(live.incomeTax, 1);
    expect(fallback.ni).toBeCloseTo(live.ni, 1);
  });
});
