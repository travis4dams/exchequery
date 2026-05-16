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
  updateMortgageRate,
  updateHousePriceIndex,
  updateEnergyPriceIndex,
  housingInflationContribution,
  energyInflationContribution,
  updateEquityIndex,
  updateRiskPremium,
  wealthEffectOnGrowth,
  applyFiscalMultipliers,
  computeRiskMods,
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
    // Anchor unemployment 1pp above the live NAIRU so the gap stays a clean -1.0
    // regardless of the live NAIRU value (which the May 2026 audit raised to 4.25
    // per Carney TSC 2017 + ResFound 2024).
    const nairu = v(PARAMS.initial.naturalUnemployment);
    const base = { ...freshState(), inflation: 2.0, unemployment: nairu + 1.0 };
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
    // Hold unemployment AT the live NAIRU so the asymmetric-Phillips gap is 0 and
    // both branches collapse to zero contribution. Inflation 5.0 > 4.0 threshold
    // would activate the trend-modifier, but since phillipsTerm × 1.5 = 0 × 1.5 = 0
    // there's no effect either way. forcing = target + 0 + 0 + 0 = 2.0.
    const nairu = v(PARAMS.initial.naturalUnemployment);
    const s = { ...freshState(), inflation: 5.0, unemployment: nairu, growth: 1.5, taxVAT: 20, taxIncomeBasic: 20 };
    expect(updateInflation(s)).toBeCloseTo(0.85 * 5.0 + 0.15 * 2.0, 6);
  });

  it('updateInflation hot labour market generates ~3x the slack contribution (Bunn 2025 asymmetry)', () => {
    // Bunn et al. (BoE WP 1107, 2025): hot-labour slope 0.19; slack slope 0.06; ratio ≈ 3.2×.
    const nairu = v(PARAMS.initial.naturalUnemployment);
    const hot = { ...freshState(), inflation: 2.0, unemployment: nairu - 1.0, growth: 1.5, taxVAT: 20, taxIncomeBasic: 20 };
    const slack = { ...freshState(), inflation: 2.0, unemployment: nairu + 1.0, growth: 1.5, taxVAT: 20, taxIncomeBasic: 20 };
    // |hot CPI deviation from anchor| / |slack CPI deviation from anchor| should be ≈ slopePositive / slopeNegative ≈ 3.16.
    const target = 2.0;
    const hotDelta = updateInflation(hot) - (0.85 * 2.0 + 0.15 * target);
    const slackDelta = (0.85 * 2.0 + 0.15 * target) - updateInflation(slack);
    expect(Math.abs(hotDelta) / Math.abs(slackDelta)).toBeCloseTo(0.19 / 0.06, 1);
  });

  it('updateInflation trend-inflation modifier activates above the 4% threshold (Bunn 2025)', () => {
    // When CPI > trendInflationThreshold, Phillips term ×= trendInflationModifier.
    const nairu = v(PARAMS.initial.naturalUnemployment);
    const belowThreshold = { ...freshState(), inflation: 3.0, unemployment: nairu - 1.0, growth: 1.5, taxVAT: 20, taxIncomeBasic: 20 };
    const aboveThreshold = { ...freshState(), inflation: 5.0, unemployment: nairu - 1.0, growth: 1.5, taxVAT: 20, taxIncomeBasic: 20 };
    // Forcing deltas vs. persistence-weighted prior: above-threshold case should have a
    // larger Phillips contribution by the modifier factor (1.5×).
    const aboveForcingFromPhillips = updateInflation(aboveThreshold) - 0.85 * 5.0;
    const belowForcingFromPhillips = updateInflation(belowThreshold) - 0.85 * 3.0;
    // Both forcings include constant terms (target, housing/energy contributions, etc.);
    // the differential is just the Phillips term × (1.5 − 1) at slope 0.19 × 1pp gap.
    expect(aboveForcingFromPhillips - belowForcingFromPhillips).toBeCloseTo(0.15 * (0.19 * 1.0) * 0.5, 4);
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

  it('updateBankRate smooths toward Taylor target at the empirical inertia rate', () => {
    // Coibion-Gorodnichenko (AEJ:Macro 2012) place quarterly inertia at 0.7–0.8;
    // sim now uses 0.75 (was 0.5 designer judgement).
    const s = { ...freshState(), bankRate: 4.5, inflation: 4.0, unemployment: 4.0 };
    const neutral = v(PARAMS.monetary.neutralRate);
    const inertia = v(PARAMS.monetary.bankRateInertia);
    // taylor = neutral + 1.5 × (inflation − target) = neutral + 1.5 × 2 = neutral + 3.0
    const taylor = neutral + 3.0;
    const expected = inertia * 4.5 + (1 - inertia) * taylor;
    expect(updateBankRate(s)).toBeCloseTo(expected, 6);
  });

  it('bondYieldFromBankRate matches bankRate + effective term premium + deficit kick, yield-smoothed', () => {
    // May 2026 audit: term premium now discounted by LDI passive-demand share
    // (Chicago Fed Letter 480, 2023). effectiveTermPremium = termPremium −
    // passiveDemandWeight × longGiltDemandShare. yieldSmooth still 0.5.
    const s = { ...freshState(), bankRate: 4.5, bondYield: 5.0 };
    const balance = calcBalance(s);
    const deficitAdj = Math.max(0, -balance) * v(PARAMS.monetary.deficitYieldCoef);
    const passiveDemand = v(PARAMS.monetary.passiveDemandWeight)
                        * v(PARAMS.equity.ldi.longGiltDemandShare);
    const effectiveTermPremium = Math.max(0, v(PARAMS.monetary.termPremium) - passiveDemand);
    const target = s.bankRate + effectiveTermPremium + deficitAdj;
    const yieldSmooth = v(PARAMS.monetary.yieldSmooth);
    const expected = yieldSmooth * s.bondYield + (1 - yieldSmooth) * target;
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
    // May 2026 audit: HPI now reads s.mortgageRate (not s.bankRate). For
    // realRateGap 0 with inflation 2 and neutralRealRate 2, mortgageRate must
    // equal 4.0. Override explicitly to bypass the initial-state default
    // (which carries the 30bp mortgage wedge over the initial Bank Rate).
    const nominalNeutral = v(PARAMS.okun.neutralRealRate) + 2.0;
    const s = { ...freshState(),
      growth: 1.5, inflationTarget: 2.0, inflation: 2.0,
      bankRate: nominalNeutral,
      mortgageRate: nominalNeutral,  // pin to bankRate to neutralise wedge
      housingSupply: v(PARAMS.housing.baseSupplyKpa),
      housePriceIndex: 100 };
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

describe('Fiscal multipliers — level-deviation (OBR + Auerbach-Gorodnichenko)', () => {
  it('applyFiscalMultipliers returns zero impulse when all levels match baseline', () => {
    const s = { ...freshState(), growth: v(PARAMS.potentialGrowth) };
    expect(applyFiscalMultipliers(s)).toBeCloseTo(0, 6);
  });

  it('applyFiscalMultipliers: +£10bn infra delivers CDEL × 10/gdp × 100 / taper per quarter', () => {
    // CDEL multiplier 1.0; baseline spendInfra £90bn; raising to £100bn is a £10bn deviation.
    // gdp = £3100bn at initial state; taper = 20 quarters.
    // Expected impulse: 1.0 × (10 / 3100) × 100 / 20 ≈ 0.01613 pp/quarter.
    const baseline = v(PARAMS.initial.spendInfra);
    const gdp = v(PARAMS.initial.gdp);
    const taper = v(PARAMS.fiscalMultipliers.taperHorizonQuarters);
    const s = { ...freshState(), spendInfra: baseline + 10, growth: v(PARAMS.potentialGrowth) };
    const expected = v(PARAMS.fiscalMultipliers.cdel) * (10 / gdp) * 100 / taper;
    expect(applyFiscalMultipliers(s)).toBeCloseTo(expected, 4);
  });

  it('applyFiscalMultipliers: recession amplification activates below -2pp output gap', () => {
    const baseline = v(PARAMS.initial.spendInfra);
    const expansion = { ...freshState(), spendInfra: baseline + 10, growth: v(PARAMS.potentialGrowth) };
    const recession = { ...freshState(), spendInfra: baseline + 10, growth: v(PARAMS.potentialGrowth) - 3.0 };
    const ratio = applyFiscalMultipliers(recession) / applyFiscalMultipliers(expansion);
    expect(ratio).toBeCloseTo(v(PARAMS.fiscalMultipliers.recessionModifier), 4);
  });

  it('applyFiscalMultipliers: VAT rise drags growth via negative impulse', () => {
    // Tax-rise direction: positive deviation × negative coefficient overall.
    const s = { ...freshState(), taxVAT: v(PARAMS.initial.taxVAT) + 5, growth: v(PARAMS.potentialGrowth) };
    expect(applyFiscalMultipliers(s)).toBeLessThan(0);
  });
});

describe('Mortgage pass-through (BoE MLAR 2022 + MPR Nov 2025)', () => {
  it('updateMortgageRate blends current + lagged Bank Rate + wedge (length-1-lag indexing)', () => {
    const wedge = v(PARAMS.monetary.mortgagePassthrough.wedgeBps) / 100;
    const fixedShare = v(PARAMS.monetary.mortgagePassthrough.fixedShare);
    const lag = v(PARAMS.monetary.mortgagePassthrough.lagQuarters);
    // Construct a varied path so the index off-by-one is detectable.
    // bankRatePath includes the current quarter at length-1 (gameStep pushes
    // before updateMortgageRate). At lag=8 with length=12, the "8 quarters
    // ago" entry is path[length-1-lag] = path[3]. Mark every position
    // distinctly: path[i] = i. Lagged read should be path[3] = 3.0.
    const path = Array.from({ length: 12 }, (_, i) => i);
    const s = { ...freshState(), bankRate: 11.0, bankRatePath: path };
    const expectedLagged = path[path.length - 1 - lag];
    expect(expectedLagged).toBe(3);  // sanity: path[12-1-8]=path[3]=3
    const expected = fixedShare * 11.0 + (1 - fixedShare) * expectedLagged + wedge;
    expect(updateMortgageRate(s)).toBeCloseTo(expected, 6);
  });

  it('updateMortgageRate falls back to Bank Rate when path is empty', () => {
    const wedge = v(PARAMS.monetary.mortgagePassthrough.wedgeBps) / 100;
    const s = { ...freshState(), bankRate: 4.5, bankRatePath: [] };
    expect(updateMortgageRate(s)).toBeCloseTo(4.5 + wedge, 6);
  });
});

describe('Energy cap pass-through (Ofgem default-tariff methodology)', () => {
  it('updateEnergyPriceIndex feeds 85% of a lagged shock into the index', () => {
    const passthrough = v(PARAMS.energy.cap.passthrough);
    const lag = v(PARAMS.energy.cap.lagQuarters);
    const drift = v(PARAMS.energy.baselineDrift);
    const decay = v(PARAMS.energy.shockDecay);
    // Buffer length 4, lag 2 → buffer[4-2]=buffer[2] is the consumed entry.
    // Set buffer[2] = 10 (a 10pp shock from 2 quarters ago).
    const buffer = [0, 0, 10, 0];
    const s = { ...freshState(), energyShockBuffer: buffer, energyPriceIndex: 100 };
    const expected = decay * (100 - 100) + 100 + drift + passthrough * buffer[buffer.length - lag];
    expect(updateEnergyPriceIndex(s)).toBeCloseTo(expected, 6);
  });

  it('updateEnergyPriceIndex contributes nothing when buffer is empty/zero', () => {
    const drift = v(PARAMS.energy.baselineDrift);
    const s = { ...freshState(), energyShockBuffer: [0, 0, 0, 0], energyPriceIndex: 100 };
    expect(updateEnergyPriceIndex(s)).toBeCloseTo(100 + drift, 6);
  });
});

describe('LDI doom-loop gate (BoE Staff WP 1019, 2023)', () => {
  it('computeRiskMods.ldiDoomLoop activates when yield rises sharply with high LDI share', () => {
    // Mock state: bondYield jumped from 4.0 to 6.0 (200bp delta), with default
    // LDI share 28%. Trigger thresholds: 150bp and 25%. Should activate.
    const s = { ...freshState(), bondYield: 6.0, bondYieldPath: [3.5, 3.8, 4.0] };
    const mods = computeRiskMods(s);
    expect(mods.ldiDoomLoop).toBe(v(PARAMS.risks.ldiDoomLoop.activeBase));
  });

  it('computeRiskMods.ldiDoomLoop stays at clampMin when delta is below threshold', () => {
    // Risk mods are floor-clamped at risks.clampMin (1pp/yr); zero-base gated
    // events surface there when their gates are off (same as giltStrike etc.).
    const s = { ...freshState(), bondYield: 4.2, bondYieldPath: [3.5, 3.8, 4.0] };
    const mods = computeRiskMods(s);
    expect(mods.ldiDoomLoop).toBe(v(PARAMS.risks.clampMin));
  });

  it('computeRiskMods.ldiDoomLoop stays at clampMin in early quarters (path too short)', () => {
    const s = { ...freshState(), bondYield: 6.0, bondYieldPath: [] };
    const mods = computeRiskMods(s);
    expect(mods.ldiDoomLoop).toBe(v(PARAMS.risks.clampMin));
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
