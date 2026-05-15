// Unit tests for the model layer. Small smoke tests that ensure the engine
// primitives behave as the playtest harness expects.

import { describe, it, expect } from 'vitest';
import {
  INITIAL_BLOC_SUPPORT,
  INITIAL_BLOC_WEIGHTS,
  REFORMS,
  PARAMS,
  makeInitialState,
  calcRevenue,
  calcSpending,
  calcBalance,
  quarterlyBlocDelta,
  sampleReformOutcome,
  rollEvents,
  stepQuarter,
  taylorRule,
  updateInflation,
  updateUnemployment,
  updateBankRate,
  bondYieldFromBankRate,
  updateHousePriceIndex,
  updateEnergyPriceIndex,
  housingInflationContribution,
  energyInflationContribution,
  updateEquityIndex,
  updateRiskPremium,
  wealthEffectOnGrowth,
} from '../../src/model/index.js';
import { withSeededRandom } from '../playtest/rng.js';

const v = (leaf) => (leaf && typeof leaf === 'object' && 'value' in leaf) ? leaf.value : leaf;

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
  it('quarterlyBlocDelta returns zero magnitude when policy + macro are all at anchor', () => {
    // Initial state has inflation 2.8 vs target 2.0 (a real CoL gap), so we
    // explicitly zero the inflation/unemployment gaps for this anchor test.
    const s = { ...freshState(), inflation: 2.0, unemployment: 4.0 };
    const d = quarterlyBlocDelta(s);
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

  it('pushes Bank Rate onto bankRatePath each quarter (max 20)', () => {
    let s = freshState();
    for (let i = 0; i < 25; i++) {
      s = withSeededRandom(i + 1, () => stepQuarter(s));
    }
    expect(s.bankRatePath.length).toBe(20);
    expect(s.bankRatePath[s.bankRatePath.length - 1]).toBe(s.bankRate);
  });

  it('records overview history paths each quarter (max 20)', () => {
    let s = freshState();
    for (let i = 0; i < 25; i++) {
      s = withSeededRandom(i + 1, () => stepQuarter(s));
    }
    expect(s.gdpPath.length).toBe(20);
    expect(s.gdpPath[s.gdpPath.length - 1]).toBe(s.gdp);
    expect(s.unemploymentPath[s.unemploymentPath.length - 1]).toBe(s.unemployment);
    expect(s.healthIndexPath[s.healthIndexPath.length - 1]).toBe(s.healthIndex);
    expect(s.populationPath[s.populationPath.length - 1]).toBe(s.population);
    expect(s.debtRatioPath.length).toBe(20);
    expect(s.deficitRatioPath.length).toBe(20);
  });
});

describe('Bank of England — Taylor rule', () => {
  it('returns the neutral rate when inflation is at target and unemployment at NAIRU', () => {
    const s = { ...freshState(), inflation: 2.0, unemployment: 4.0 };
    expect(taylorRule(s)).toBeCloseTo(v(PARAMS.monetary.neutralRate), 6);
  });

  it('hikes 1.5pp per pp of inflation overshoot under inflation-only mandate', () => {
    const s = { ...freshState(), inflation: 4.0, unemployment: 4.0, boeMandate: 'inflation_only' };
    const expected = v(PARAMS.monetary.neutralRate) + 1.5 * 2.0;
    expect(taylorRule(s)).toBeCloseTo(expected, 6);
  });

  it('responds to unemployment gap only under dual mandate', () => {
    const base = { ...freshState(), inflation: 2.0, unemployment: 5.0 };
    const inflOnly = { ...base, boeMandate: 'inflation_only' };
    const dual = { ...base, boeMandate: 'dual' };
    expect(taylorRule(inflOnly)).toBeCloseTo(v(PARAMS.monetary.neutralRate), 6);
    // Dual: r* = neutral + 0.5 × (NAIRU − u) = neutral + 0.5 × (-1) = neutral − 0.5.
    expect(taylorRule(dual)).toBeCloseTo(v(PARAMS.monetary.neutralRate) - 0.5, 6);
  });

  it('clamps to the policy-rate floor and ceiling', () => {
    const lo = { ...freshState(), inflation: -10, unemployment: 4.0 };
    const hi = { ...freshState(), inflation: 20, unemployment: 4.0 };
    expect(taylorRule(lo)).toBe(v(PARAMS.monetary.bankRateClampLow));
    expect(taylorRule(hi)).toBe(v(PARAMS.monetary.bankRateClampHigh));
  });
});

describe('Bank of England — inflation, unemployment, smoothing', () => {
  it('updateInflation moves toward target when at anchor', () => {
    const s = { ...freshState(), inflation: 5.0, unemployment: 4.0, growth: 1.5, taxVAT: 20, taxIncomeBasic: 20 };
    // forcing = target + 0 (unemp at NAIRU) + 0 (VAT/basic at anchor) + 0 (growth at trend) = 2.0
    // new = 0.85 × 5.0 + 0.15 × 2.0 = 4.55
    expect(updateInflation(s)).toBeCloseTo(0.85 * 5.0 + 0.15 * 2.0, 6);
  });

  it('updateInflation responds to a VAT cut as a positive forcing impulse', () => {
    const baseline = { ...freshState(), inflation: 2.0, unemployment: 4.0, growth: 1.5, taxVAT: 20 };
    const vatCut = { ...baseline, taxVAT: 15 };  // 5pp cut
    expect(updateInflation(vatCut)).toBeGreaterThan(updateInflation(baseline));
  });

  it('updateUnemployment falls when growth exceeds trend', () => {
    const fast = { ...freshState(), growth: 3.0, unemployment: 4.0, bankRate: 4.5, inflation: 2.0 };
    const slow = { ...freshState(), growth: 0.5, unemployment: 4.0, bankRate: 4.5, inflation: 2.0 };
    expect(updateUnemployment(fast)).toBeLessThan(4.0);
    expect(updateUnemployment(slow)).toBeGreaterThan(4.0);
  });

  it('updateBankRate smooths halfway toward Taylor target', () => {
    const s = { ...freshState(), bankRate: 4.5, inflation: 4.0, unemployment: 4.0 };
    // taylor = 3.5 + 1.5 × 2 = 6.5; inertia 0.5 ⇒ new = 0.5 × 4.5 + 0.5 × 6.5 = 5.5
    expect(updateBankRate(s)).toBeCloseTo(5.5, 6);
  });

  it('bondYieldFromBankRate matches bankRate + termPremium + deficitKick, smoothed 50/50', () => {
    const s = { ...freshState(), bankRate: 4.5, bondYield: 5.0 };
    const balance = calcBalance(s);
    const deficitAdj = Math.max(0, -balance) * v(PARAMS.monetary.deficitYieldCoef);
    const target = s.bankRate + v(PARAMS.monetary.termPremium) + deficitAdj;
    const expected = 0.5 * s.bondYield + 0.5 * target;
    expect(bondYieldFromBankRate(s)).toBeCloseTo(expected, 6);
  });

  it('bondYieldFromBankRate rises when bankRate rises (other things equal)', () => {
    const lo = { ...freshState(), bankRate: 3.0, bondYield: 5.0 };
    const hi = { ...freshState(), bankRate: 6.0, bondYield: 5.0 };
    expect(bondYieldFromBankRate(hi)).toBeGreaterThan(bondYieldFromBankRate(lo));
  });
});

describe('Housing & energy markets', () => {
  it('updateHousePriceIndex barely moves when all drivers are at anchor', () => {
    // Nominal wage signal 0 (growth==trend, inflation==target), realRateGap 0, supply at base.
    const s = { ...freshState(), growth: 1.5, inflationTarget: 2.0, inflation: 2.0, bankRate: v(PARAMS.okun.neutralRealRate) + 2.0, housingSupply: v(PARAMS.housing.baseSupplyKpa), housePriceIndex: 100 };
    expect(updateHousePriceIndex(s)).toBeCloseTo(100, 6);
  });

  it('updateHousePriceIndex falls under high real rates', () => {
    const hot = { ...freshState(), growth: 1.5, bankRate: 8.0, inflation: 2.0, housingSupply: 220, housePriceIndex: 100 };
    expect(updateHousePriceIndex(hot)).toBeLessThan(100);
  });

  it('updateHousePriceIndex falls when supply rises above baseline', () => {
    const baseSupply = { ...freshState(), growth: 1.5, bankRate: 3.5, inflation: 2.0, housingSupply: 220, housePriceIndex: 100 };
    const extraSupply = { ...baseSupply, housingSupply: 280 };
    expect(updateHousePriceIndex(extraSupply)).toBeLessThan(updateHousePriceIndex(baseSupply));
  });

  it('updateEnergyPriceIndex decays a shock toward baseline', () => {
    const shocked = { ...freshState(), energyPriceIndex: 150 };
    const next = updateEnergyPriceIndex(shocked);
    expect(next).toBeLessThan(150);
    expect(next).toBeGreaterThan(100);
  });

  it('updateEnergyPriceIndex drifts up at baseline (with no reforms)', () => {
    const s = { ...freshState(), energyPriceIndex: 100, reforms: {} };
    expect(updateEnergyPriceIndex(s)).toBeCloseTo(100.5, 6);
  });

  it('housingInflationContribution scales with HPI gap', () => {
    expect(housingInflationContribution({ housePriceIndex: 100 })).toBeCloseTo(0, 6);
    const hot = housingInflationContribution({ housePriceIndex: 130 });
    expect(hot).toBeCloseTo(0.16 * 0.3 * 10, 6);
  });

  it('energyInflationContribution scales with energy index gap', () => {
    expect(energyInflationContribution({ energyPriceIndex: 100 })).toBeCloseTo(0, 6);
    const hot = energyInflationContribution({ energyPriceIndex: 150 });
    expect(hot).toBeCloseTo(0.04 * 0.5 * 10, 6);
  });
});

describe('Equity market + risk premium', () => {
  it('updateEquityIndex is deterministic under a fixed seed', () => {
    const s = freshState();
    const a = withSeededRandom(7, () => updateEquityIndex(s));
    const b = withSeededRandom(7, () => updateEquityIndex(s));
    expect(a).toBeCloseTo(b, 12);
  });

  it('updateEquityIndex rises when corp tax falls (other things equal)', () => {
    const base = { ...freshState(), taxCorp: 25 };
    const cut  = { ...freshState(), taxCorp: 18 };
    const baseIdx = withSeededRandom(1, () => updateEquityIndex(base));
    const cutIdx  = withSeededRandom(1, () => updateEquityIndex(cut));
    expect(cutIdx).toBeGreaterThan(baseIdx);
  });

  it('updateEquityIndex falls when real rates rise', () => {
    const lo = { ...freshState(), bankRate: 3.0, inflation: 2.0 };
    const hi = { ...freshState(), bankRate: 7.0, inflation: 2.0 };
    const loIdx = withSeededRandom(1, () => updateEquityIndex(lo));
    const hiIdx = withSeededRandom(1, () => updateEquityIndex(hi));
    expect(hiIdx).toBeLessThan(loIdx);
  });

  it('updateRiskPremium returns 0 when debt is well below threshold and cohesion stable', () => {
    const s = { ...freshState(), debt: 1000, gdp: 3100, cohesionHistory: [40, 40, 40, 40] };
    expect(updateRiskPremium(s)).toBeCloseTo(0, 6);
  });

  it('updateRiskPremium handles cohesionHistory.length < 2 as zero volatility', () => {
    const s = { ...freshState(), debt: 1000, gdp: 3100, cohesionHistory: [40] };
    expect(updateRiskPremium(s)).toBeCloseTo(0, 6);
    const empty = { ...freshState(), debt: 1000, gdp: 3100, cohesionHistory: [] };
    expect(updateRiskPremium(empty)).toBeCloseTo(0, 6);
  });

  it('updateRiskPremium widens with debt above threshold', () => {
    const lo = { ...freshState(), debt: 2900, gdp: 3100, cohesionHistory: [40, 40, 40, 40] };
    const hi = { ...freshState(), debt: 3600, gdp: 3100, cohesionHistory: [40, 40, 40, 40] };
    expect(updateRiskPremium(hi)).toBeGreaterThan(updateRiskPremium(lo));
  });

  it('updateRiskPremium widens with cohesion volatility', () => {
    const calm = { ...freshState(), debt: 1000, gdp: 3100, cohesionHistory: [40, 40, 40, 40] };
    const volatile = { ...freshState(), debt: 1000, gdp: 3100, cohesionHistory: [30, 50, 30, 50] };
    expect(updateRiskPremium(volatile)).toBeGreaterThan(updateRiskPremium(calm));
  });

  it('wealthEffectOnGrowth is zero at index 100 and capped at ±0.1pp', () => {
    expect(wealthEffectOnGrowth({ equityIndex: 100 })).toBeCloseTo(0, 6);
    expect(wealthEffectOnGrowth({ equityIndex: 120 })).toBeCloseTo(0.05 * 0.2, 6);
    expect(wealthEffectOnGrowth({ equityIndex: 1000 })).toBeCloseTo(0.1, 6);
    expect(wealthEffectOnGrowth({ equityIndex: 0 })).toBeCloseTo(-0.05, 6);
    expect(wealthEffectOnGrowth({ equityIndex: -1000 })).toBeCloseTo(-0.1, 6);
  });
});
