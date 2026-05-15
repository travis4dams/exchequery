// =============================================================================
// Engine — pure calculation functions.
//
// No React, no UI imports. Every numeric constant is read from PARAMS;
// reform/bloc/event definitions are read from their respective data modules.
//
// All functions are state-in/state-out. The React layer wires inputs and
// renders outputs; this file is the model of computation.
// =============================================================================

import { PARAMS } from './params.js';
import { BLOCS, COALITION } from './blocs.js';
import { REFORMS, REFORM_BRANCHES } from './reforms.js';
import { EVENT_DEFINITIONS, REFORM_RISK_MODS } from './events.js';
import {
  makeInitialParliament,
  updateSeatMoods,
  aggregateParliamentMood,
  reformPmAlignment,
} from './parliament.js';

// Convenience: unwrap a { value, citationId } leaf to its scalar.
const v = (leaf) => (leaf && typeof leaf === 'object' && 'value' in leaf) ? leaf.value : leaf;

// =============================================================================
// Reform capacity
// =============================================================================

export function reformCapacityLoad(reform) {
  return reform?.capacityLoad ?? 1;
}

export function calcReformCapacity(s) {
  const C = PARAMS.reformCapacity;
  const totalDept = s.spendNHS + s.spendEdu + s.spendWelfare + s.spendDefence + s.spendInfra + s.spendLocal;
  let cap = Math.max(1, Math.round((totalDept - v(C.deptBudgetAnchor)) / v(C.deptBudgetPerSlot)));
  if (s.reforms.civilService?.status === 'complete') cap += v(C.civilServiceBonus);
  return cap;
}

export function calcReformLoadInFlight(s) {
  let load = 0;
  for (const r of Object.values(s.reforms)) {
    if (r.status === 'inProgress') load += reformCapacityLoad(r.reformDef);
  }
  for (const id of s.proposedReforms) {
    if (REFORMS[id]) load += reformCapacityLoad(REFORMS[id]);
  }
  return load;
}

// =============================================================================
// Approval & cohesion
// =============================================================================

export function calcCoalitionCohesion(blocSupport, blocWeights) {
  let total = 0, weightSum = 0;
  for (const id of COALITION) {
    total += blocSupport[id] * blocWeights[id];
    weightSum += blocWeights[id];
  }
  return total / weightSum;
}

export function calcOverallApproval(blocSupport, blocWeights) {
  let total = 0, weightSum = 0;
  for (const [id, s] of Object.entries(blocSupport)) {
    total += s * blocWeights[id];
    weightSum += blocWeights[id];
  }
  return total / weightSum;
}

// =============================================================================
// Revenue / spending / balance
// =============================================================================

export function calcRevenue(s) {
  const R = PARAMS.revenue;
  const gdpScale = s.gdp / v(R.gdpScaleAnchor);

  const incomeBase = v(R.incomeTax.base);
  const addAnchor = v(PARAMS.initial.taxIncomeAdd);
  const highAnchor = v(PARAMS.initial.taxIncomeHigh);
  const basicAnchor = v(PARAMS.initial.taxIncomeBasic);

  let incomeTax = (
    incomeBase
    + (s.taxIncomeAdd - addAnchor) * v(R.incomeTax.additionalRatePerPP)
    + (s.taxIncomeHigh - highAnchor) * v(R.incomeTax.higherRatePerPP)
    + (s.taxIncomeBasic - basicAnchor) * v(R.incomeTax.basicRatePerPP)
  ) * gdpScale;

  const corpAnchor = v(PARAMS.initial.taxCorp);
  const corpCurveThreshold = v(R.corpTax.curvatureThreshold);
  let corpTax = (
    v(R.corpTax.base)
    + (s.taxCorp - corpAnchor) * v(R.corpTax.perPP)
    - Math.max(0, s.taxCorp - corpCurveThreshold) * (s.taxCorp - corpCurveThreshold) * v(R.corpTax.curvatureAbove30)
  ) * gdpScale;

  const vatAnchor = v(PARAMS.initial.taxVAT);
  let vat = (v(R.vat.base) + (s.taxVAT - vatAnchor) * v(R.vat.perPP)) * gdpScale;

  let ni = v(R.ni) * gdpScale;
  let other = v(R.other) * gdpScale;
  const reformBonus = s.revBonusFromReforms + s.ongoingRevFromReforms;

  return {
    incomeTax, corpTax, vat, ni, other, reformBonus,
    total: incomeTax + corpTax + vat + ni + other + reformBonus,
  };
}

export function calcSpending(s) {
  const debtInterest = s.debt * (s.effectiveServicingRate / 100);
  const departmental = s.spendNHS + s.spendEdu + s.spendWelfare + s.spendDefence + s.spendInfra + s.spendLocal;

  const popScale = s.population / v(PARAMS.spending.populationScaleAnchor);
  const F = PARAMS.spending.fixedCosts;
  const fixed = (v(F.pensions) + v(F.justice) + v(F.otherDept)) * popScale;

  return {
    debtInterest, departmental, fixed,
    reformOngoing: s.ongoingCostFromReforms,
    total: debtInterest + departmental + fixed + s.ongoingCostFromReforms,
  };
}

export function calcBalance(s) {
  return calcRevenue(s).total - calcSpending(s).total;
}

export function deficitPctGDP(s) {
  return -calcBalance(s) / s.gdp * 100;
}

// =============================================================================
// Quarterly bloc support deltas — function of current policy stance
// =============================================================================

export function quarterlyBlocDelta(s) {
  const d = Object.fromEntries(Object.keys(BLOCS).map(k => [k, 0]));
  const B = PARAMS.blocResponses;
  const T = PARAMS.thresholds;
  const addAnchor = v(PARAMS.initial.taxIncomeAdd);
  const highAnchor = v(PARAMS.initial.taxIncomeHigh);
  const basicAnchor = v(PARAMS.initial.taxIncomeBasic);
  const vatAnchor = v(PARAMS.initial.taxVAT);
  const nhsAnchor = v(PARAMS.initial.spendNHS);
  const welfareAnchor = v(PARAMS.initial.spendWelfare);
  const eduAnchor = v(PARAMS.initial.spendEdu);
  const localAnchor = v(PARAMS.initial.spendLocal);
  const corpHigh = v(T.corpHighRate);
  const corpLow = v(T.corpLowRate);
  const nhsBoostFloor = v(T.nhsBoostFloor);
  const welfareCutFloor = v(T.welfareCutFloor);
  const eduCutFloor = v(T.eduCutFloor);
  const infraBoostFloor = v(T.infraBoostFloor);

  // Additional rate above anchor
  if (s.taxIncomeAdd > addAnchor) {
    const delta = s.taxIncomeAdd - addAnchor;
    d.workingClass += delta * v(B.additionalRateAbove45.workingClass);
    d.northern    += delta * v(B.additionalRateAbove45.northern);
    d.business    += delta * v(B.additionalRateAbove45.business);
    d.professional+= delta * v(B.additionalRateAbove45.professional);
  }

  // Higher rate above anchor
  if (s.taxIncomeHigh > highAnchor) {
    const delta = s.taxIncomeHigh - highAnchor;
    d.middleClass  += delta * v(B.higherRateAbove40.middleClass);
    d.professional += delta * v(B.higherRateAbove40.professional);
    d.publicSector += delta * v(B.higherRateAbove40.publicSector);
  }

  // Basic rate cut (below anchor)
  if (s.taxIncomeBasic < basicAnchor) {
    const delta = basicAnchor - s.taxIncomeBasic;
    d.workingClass  += delta * v(B.basicRateBelow20.workingClass);
    d.youth         += delta * v(B.basicRateBelow20.youth);
    d.pensioners    += delta * v(B.basicRateBelow20.pensioners);
    d.middleClass   += delta * v(B.basicRateBelow20.middleClass);
    d.northern      += delta * v(B.basicRateBelow20.northern);
    d.ethnicMinority+= delta * v(B.basicRateBelow20.ethnicMinority);
  } else if (s.taxIncomeBasic > basicAnchor) {
    const delta = s.taxIncomeBasic - basicAnchor;
    d.workingClass  -= delta * v(B.basicRateAbove20.workingClass);
    d.middleClass   -= delta * v(B.basicRateAbove20.middleClass);
    d.pensioners    -= delta * v(B.basicRateAbove20.pensioners);
    d.northern      -= delta * v(B.basicRateAbove20.northern);
    d.ethnicMinority-= delta * v(B.basicRateAbove20.ethnicMinority);
  }

  // VAT rises/cuts
  if (s.taxVAT > vatAnchor) {
    const delta = s.taxVAT - vatAnchor;
    d.workingClass  -= delta * v(B.vatAbove20.workingClass);
    d.pensioners    -= delta * v(B.vatAbove20.pensioners);
    d.northern      -= delta * v(B.vatAbove20.northern);
    d.ethnicMinority-= delta * v(B.vatAbove20.ethnicMinority);
    d.middleClass   -= delta * v(B.vatAbove20.middleClass);
  } else if (s.taxVAT < vatAnchor) {
    const delta = vatAnchor - s.taxVAT;
    d.workingClass  += delta * v(B.vatBelow20.workingClass);
    d.pensioners    += delta * v(B.vatBelow20.pensioners);
    d.northern      += delta * v(B.vatBelow20.northern);
    d.middleClass   += delta * v(B.vatBelow20.middleClass);
  }

  // Corp tax thresholds
  if (s.taxCorp > corpHigh) {
    const delta = s.taxCorp - corpHigh;
    d.business     += delta * v(B.corpAbove28.business);
    d.professional += delta * v(B.corpAbove28.professional);
  } else if (s.taxCorp < corpLow) {
    const delta = corpLow - s.taxCorp;
    d.workingClass  += delta * v(B.corpBelow22.workingClass);
    d.publicSector  += delta * v(B.corpBelow22.publicSector);
  }

  // NHS spend
  const nhsCut = Math.max(0, nhsAnchor - s.spendNHS);
  if (nhsCut > 0) {
    d.pensioners    -= nhsCut * v(B.nhsCutBelow200.pensioners);
    d.publicSector  -= nhsCut * v(B.nhsCutBelow200.publicSector);
    d.workingClass  -= nhsCut * v(B.nhsCutBelow200.workingClass);
    d.northern      -= nhsCut * v(B.nhsCutBelow200.northern);
  }
  const nhsBoost = Math.max(0, s.spendNHS - nhsBoostFloor);
  if (nhsBoost > 0) {
    d.publicSector += nhsBoost * v(B.nhsBoostAbove210.publicSector);
    d.pensioners   += nhsBoost * v(B.nhsBoostAbove210.pensioners);
    d.middleClass  += nhsBoost * v(B.nhsBoostAbove210.middleClass);
  }

  // Welfare cut
  const welfareCut = Math.max(0, welfareCutFloor - s.spendWelfare);
  if (welfareCut > 0) {
    d.workingClass   -= welfareCut * v(B.welfareCutBelow290.workingClass);
    d.northern       -= welfareCut * v(B.welfareCutBelow290.northern);
    d.ethnicMinority -= welfareCut * v(B.welfareCutBelow290.ethnicMinority);
    d.youth          -= welfareCut * v(B.welfareCutBelow290.youth);
  }

  // Education cut
  const eduCut = Math.max(0, eduCutFloor - s.spendEdu);
  if (eduCut > 0) {
    d.youth        -= eduCut * v(B.eduCutBelow85.youth);
    d.publicSector -= eduCut * v(B.eduCutBelow85.publicSector);
    d.workingClass -= eduCut * v(B.eduCutBelow85.workingClass);
  }

  // Local-gov cut
  const localCut = Math.max(0, localAnchor - s.spendLocal);
  if (localCut > 0) {
    d.publicSector -= localCut * v(B.localCutBelow60.publicSector);
    d.middleClass  -= localCut * v(B.localCutBelow60.middleClass);
    d.workingClass -= localCut * v(B.localCutBelow60.workingClass);
  }

  // Infra boost
  if (s.spendInfra > infraBoostFloor) {
    const delta = s.spendInfra - infraBoostFloor;
    d.business += delta * v(B.infraAbove40.business);
    d.northern += delta * v(B.infraAbove40.northern);
  }

  // Cost-of-living: inflation above target hurts real-income-sensitive blocs.
  const inflationGap = Math.max(0, (s.inflation ?? 0) - (s.inflationTarget ?? 0));
  if (inflationGap > 0 && B.inflationAboveTarget) {
    for (const [bloc, leaf] of Object.entries(B.inflationAboveTarget)) {
      d[bloc] -= inflationGap * v(leaf);
    }
  }

  // Jobs damage: unemployment above NAIRU hurts jobs-sensitive blocs.
  const unempGap = Math.max(0, (s.unemployment ?? 0) - (s.naturalUnemployment ?? 0));
  if (unempGap > 0 && B.unemploymentAboveNAIRU) {
    for (const [bloc, leaf] of Object.entries(B.unemploymentAboveNAIRU)) {
      d[bloc] -= unempGap * v(leaf);
    }
  }

  // Mean-reverting drift back to baseline, then per-quarter normalisation.
  const drift = v(PARAMS.blocDriftToBaseline);
  for (const k of Object.keys(d)) {
    const diff = s.blocSupport[k] - BLOCS[k].base;
    d[k] -= diff * drift;
    d[k] /= 4;
  }
  return d;
}

// =============================================================================
// Population dynamics — per-bloc demographic drift
// =============================================================================

export function applyPopulationDynamics(weights, reforms) {
  const newW = { ...weights };
  for (const [id, bloc] of Object.entries(BLOCS)) {
    let qGrowth = bloc.popGrowth / 4;
    for (const r of Object.values(reforms)) {
      if (r.status === 'complete' && r.reformDef?.onComplete?.populationEffects?.[id]) {
        const leaf = r.reformDef.onComplete.populationEffects[id];
        qGrowth += v(leaf) / 4;
      }
    }
    newW[id] = newW[id] * (1 + qGrowth / 100);
  }
  return newW;
}

// Overall UK population growth per quarter (%), depending on policy state.
// Each constant is treated as an annual-equivalent input divided by 4 to
// match the original monolith's quarterly conversion.
export function quarterlyPopulationGrowth(reforms) {
  let q = v(PARAMS.population.quarterlyBaseline) / 4;
  if (reforms.immigrationCap?.status === 'complete') q += v(PARAMS.population.immigrationCapDelta) / 4;
  if (reforms.freeChildcare?.status === 'complete') q += v(PARAMS.population.childcareDelta) / 4;
  return q;
}

// =============================================================================
// Bank of England — Phillips, Okun, Taylor rule
//
// All four updaters are state-in/scalar-out so callers in stepQuarter can
// compose them in a deterministic order. None mutate `s`. The intentional
// order in stepQuarter is: GDP grows → unemployment (uses fresh growth) →
// inflation (uses fresh unemployment) → Bank Rate (uses fresh inflation +
// unemployment) → bond yield (uses fresh Bank Rate). Math.random is not
// consumed here — the existing event-roll randomness remains the only RNG
// in the per-quarter loop.
// =============================================================================

export function updateInflation(s) {
  const target = s.inflationTarget;
  const persistence = v(PARAMS.phillips.persistence);
  const slope = v(PARAMS.phillips.slope);
  const vatImpulseCoef = v(PARAMS.phillips.vatImpulseCoef);
  const basicImpulseCoef = v(PARAMS.phillips.basicImpulseCoef);
  const growthDriftCoef = v(PARAMS.phillips.growthDriftCoef);
  const trendGrowth = v(PARAMS.okun.trendGrowth);
  const vatAnchor = v(PARAMS.initial.taxVAT);
  const basicAnchor = v(PARAMS.initial.taxIncomeBasic);

  const phillipsTerm = slope * (s.naturalUnemployment - s.unemployment);
  const demandImpulse = vatImpulseCoef * (s.taxVAT - vatAnchor)
                      + basicImpulseCoef * (s.taxIncomeBasic - basicAnchor);
  const growthDrift = growthDriftCoef * (s.growth - trendGrowth);
  const forcing = target + phillipsTerm + demandImpulse + growthDrift;

  return Math.max(0, persistence * s.inflation + (1 - persistence) * forcing);
}

export function updateUnemployment(s) {
  const trend = v(PARAMS.okun.trendGrowth);
  const neutralReal = v(PARAMS.okun.neutralRealRate);
  const okunCoef = v(PARAMS.okun.coefficient);
  const rateChannel = v(PARAMS.okun.rateChannel);
  const realRateGap = s.bankRate - s.inflation - neutralReal;
  // Annual deltas / 4 to convert to per-quarter step.
  const delta = (-okunCoef * (s.growth - trend) + rateChannel * realRateGap) / 4;
  return Math.max(0, Math.min(20, s.unemployment + delta));
}

export function taylorRule(s) {
  const neutral = v(PARAMS.monetary.neutralRate);
  const inflCoef = v(PARAMS.monetary.taylorInflationCoef);
  const unempCoef = s.boeMandate === 'dual' ? v(PARAMS.monetary.taylorUnempCoefDual) : 0;
  const rStar = neutral
    + inflCoef * (s.inflation - s.inflationTarget)
    + unempCoef * (s.naturalUnemployment - s.unemployment);
  const lo = v(PARAMS.monetary.bankRateClampLow);
  const hi = v(PARAMS.monetary.bankRateClampHigh);
  return Math.max(lo, Math.min(hi, rStar));
}

export function updateBankRate(s) {
  const inertia = v(PARAMS.monetary.bankRateInertia);
  const target = taylorRule(s);
  return inertia * s.bankRate + (1 - inertia) * target;
}

export function bondYieldFromBankRate(s) {
  const termPremium = v(PARAMS.monetary.termPremium);
  const deficitCoef = v(PARAMS.monetary.deficitYieldCoef);
  const yieldSmooth = v(PARAMS.monetary.yieldSmooth);
  const balYr = calcBalance(s);
  const deficitAdj = Math.max(0, -balYr) * deficitCoef;
  const target = s.bankRate + termPremium + deficitAdj;
  const lo = v(PARAMS.bondYield.floor);
  const hi = v(PARAMS.bondYield.ceiling);
  return Math.max(lo, Math.min(hi, yieldSmooth * s.bondYield + (1 - yieldSmooth) * target));
}

// =============================================================================
// Risk modifiers — applied to event base probabilities
// =============================================================================

export function computeRiskMods(s) {
  const R = PARAMS.risks;
  const T = PARAMS.thresholds;
  const nhsAnchor = v(PARAMS.initial.spendNHS);
  const welfareAnchor = v(PARAMS.initial.spendWelfare);
  const localAnchor = v(PARAMS.initial.spendLocal);
  const basicStrikeFloor = v(T.basicRateGeneralStrikeFloor);
  const vatStrikeFloor = v(T.vatGeneralStrikeFloor);
  const infraSurgeFloor = v(T.infraInvestmentSurgeFloor);

  // Rolling 4Q rise in Bank Rate, for rateHikeShock.
  const path = s.bankRatePath || [];
  const rateRiseRecent = path.length >= 4
    ? Math.max(0, path[path.length - 1] - path[path.length - 4])
    : 0;
  const hotLabour = Math.max(0, s.naturalUnemployment - s.unemployment);
  const inflGap = Math.max(0, s.inflation - s.inflationTarget);
  const taylorDivergence = Math.abs(s.bankRate - taylorRule(s));

  const m = {
    nhsStrike: v(R.nhsStrike.base),
    energyShock: v(R.energyShock.base),
    fuelPoverty: v(R.fuelPoverty.base),
    housingCrisis: v(R.housingCrisis.base),
    councilBankruptcy: v(R.councilBankruptcy.base),
    financialCrisis: v(R.financialCrisis.base),
    generalStrike: v(R.generalStrike.base),
    careCrisis: v(R.careCrisis.base),
    flood: v(R.flood.base),
    heatwave: v(R.heatwave.base),
    tradeDeal: v(R.tradeDeal.base),
    allyCrisis: v(R.allyCrisis.base),
    investmentSurge: v(R.investmentSurge.base),
    exportBoom: v(R.exportBoom.base),
    productivityJump: v(R.productivityJump.base),
    taxBeats: v(R.taxBeats.base),
    demographicDividend: v(R.demographicDividend.base),
    labourShortage: v(R.labourShortage.base),
    rateHikeShock: v(R.rateHikeShock.base) + rateRiseRecent * v(R.rateHikeShock.perRateRise),
    wagePriceSpiral: v(R.wagePriceSpiral.base) + hotLabour * inflGap * v(R.wagePriceSpiral.perGapProduct),
    monetaryPolicyError: v(R.monetaryPolicyError.base) + Math.max(0, taylorDivergence - 1) * v(R.monetaryPolicyError.perDivergencePP),
  };

  // Spending-based modifiers
  if (s.spendNHS < nhsAnchor) m.nhsStrike += (nhsAnchor - s.spendNHS) * v(R.nhsStrike.perBnUnderfunded);
  if (s.spendWelfare < welfareAnchor) m.fuelPoverty += (welfareAnchor - s.spendWelfare) * v(R.fuelPoverty.perBnWelfareUnderfunded);
  if (s.spendLocal < localAnchor) {
    m.councilBankruptcy += (localAnchor - s.spendLocal) * v(R.councilBankruptcy.perBnLocalUnderfunded);
    m.careCrisis += v(R.careCrisis.localUnderfundedKick);
  }
  if (s.taxIncomeBasic > basicStrikeFloor) m.generalStrike += v(R.generalStrike.basicRateRiseKick);
  if (s.taxVAT > vatStrikeFloor) m.generalStrike += v(R.generalStrike.vatRiseKick);
  if (s.spendInfra > infraSurgeFloor) m.investmentSurge += (s.spendInfra - infraSurgeFloor) * v(R.investmentSurge.perBnInfraOverbaseline);

  // Reform-declared risk mods
  for (const r of Object.values(s.reforms)) {
    if (r.status === 'complete' && r.reformDef?.riskMods) {
      for (const [k, leaf] of Object.entries(r.reformDef.riskMods)) {
        m[k] = (m[k] || 0) + v(leaf);
      }
    }
  }

  // Reform-driven cross-event modifiers (non-declarative wirings live in events.js)
  for (const [reformId, mods] of Object.entries(REFORM_RISK_MODS)) {
    if (s.reforms[reformId]?.status === 'complete') {
      for (const [eventId, leaf] of Object.entries(mods)) {
        m[eventId] = (m[eventId] || 0) + v(leaf);
      }
    }
  }

  const minP = v(R.clampMin);
  const maxP = v(R.clampMax);
  for (const k of Object.keys(m)) m[k] = Math.max(minP, Math.min(maxP, m[k]));
  return m;
}

// =============================================================================
// Reform projection & sampling — pass forecastNoise band on each numeric leaf
// =============================================================================

// Extracts only the numeric on-complete effects with their values, ignoring
// per-bloc populationEffects (which are reported separately in the UI).
function numericOnCompleteEntries(reformDef) {
  const out = [];
  const oc = reformDef.onComplete || {};
  for (const [k, leaf] of Object.entries(oc)) {
    if (k === 'log' || k === 'populationEffects') continue;
    if (leaf && typeof leaf === 'object' && 'value' in leaf) out.push([k, leaf.value]);
  }
  return out;
}

export function projectReformOutcome(reformDef, forecastNoise) {
  const out = {};
  if (!reformDef.onComplete) return out;
  for (const [k, value] of numericOnCompleteEntries(reformDef)) {
    out[k] = {
      mid: value,
      low: value * (1 - forecastNoise),
      high: value * (1 + forecastNoise),
    };
  }
  return out;
}

export function sampleReformOutcome(reformDef, forecastNoise) {
  const out = { log: reformDef.onComplete?.log };
  for (const [k, value] of numericOnCompleteEntries(reformDef)) {
    const noise = (Math.random() * 2 - 1) * forecastNoise;
    out[k] = value * (1 + noise);
  }
  return out;
}

// =============================================================================
// Snapshot for "previous quarter" diffs in the UI
// =============================================================================

export function makeCommittedSnapshot(s) {
  return {
    taxIncomeAdd: s.taxIncomeAdd, taxIncomeHigh: s.taxIncomeHigh, taxIncomeBasic: s.taxIncomeBasic,
    taxCorp: s.taxCorp, taxVAT: s.taxVAT,
    spendNHS: s.spendNHS, spendEdu: s.spendEdu, spendWelfare: s.spendWelfare,
    spendDefence: s.spendDefence, spendInfra: s.spendInfra, spendLocal: s.spendLocal,
    revenue: calcRevenue(s), spending: calcSpending(s), balance: calcBalance(s),
    blocSupport: { ...s.blocSupport }, blocWeights: { ...s.blocWeights },
    coalitionCohesion: calcCoalitionCohesion(s.blocSupport, s.blocWeights),
    overallApproval: calcOverallApproval(s.blocSupport, s.blocWeights),
    growth: s.growth, gini: s.gini, healthIndex: s.healthIndex,
    bondYield: s.bondYield, effectiveServicingRate: s.effectiveServicingRate,
    debt: s.debt, gdp: s.gdp, realGDP: s.realGDP, population: s.population,
    inflation: s.inflation, unemployment: s.unemployment,
    bankRate: s.bankRate, inflationTarget: s.inflationTarget,
  };
}

// =============================================================================
// Event roll — quarterly random draws against risk modifiers
// =============================================================================

export function rollEvents(s, mods) {
  const triggered = [];
  for (const [eventId, mod] of Object.entries(mods)) {
    if (!EVENT_DEFINITIONS[eventId]) continue;
    const qProb = mod / 4 / 100;
    if (Math.random() < qProb) triggered.push(eventId);
  }
  return triggered;
}

// =============================================================================
// Initial state factory — uses PARAMS for all values
// =============================================================================

export function makeInitialState({ initialBlocSupport, initialBlocWeights }) {
  const I = PARAMS.initial;
  const parliament = makeInitialParliament({ blocSupport: initialBlocSupport });
  const { governingPartyMood, chamberMood } = aggregateParliamentMood(parliament.seatMoodById, parliament);
  return {
    quarter: 1, term: 1, globalQuarter: 1,
    gdp: v(I.gdp), realGDP: v(I.realGDP),
    population: v(I.population),
    debt: v(I.debt), growth: v(I.growth), inflation: v(I.inflation),
    unemployment: v(I.unemployment),
    bondYield: v(I.bondYield), effectiveServicingRate: v(I.effectiveServicingRate),
    taxIncomeAdd: v(I.taxIncomeAdd), taxIncomeHigh: v(I.taxIncomeHigh),
    taxIncomeBasic: v(I.taxIncomeBasic), taxCorp: v(I.taxCorp), taxVAT: v(I.taxVAT),
    spendNHS: v(I.spendNHS), spendEdu: v(I.spendEdu), spendWelfare: v(I.spendWelfare),
    spendDefence: v(I.spendDefence), spendInfra: v(I.spendInfra), spendLocal: v(I.spendLocal),
    blocSupport: initialBlocSupport,
    blocWeights: initialBlocWeights,
    reforms: {}, proposedReforms: [],
    revBonusFromReforms: 0, ongoingCostFromReforms: 0, ongoingRevFromReforms: 0,
    healthIndex: v(I.healthIndex), gini: v(I.gini),
    bankRate: v(I.bankRate),
    inflationTarget: v(I.inflationTarget),
    naturalUnemployment: v(I.naturalUnemployment),
    boeMandate: 'inflation_only',
    bankRatePath: [],
    log: [], pendingEvent: null, pendingSummary: null,
    pendingSurplus: 0,
    status: 'playing', committed: null, termsWon: 0,
    forecastNoise: v(PARAMS.forecastNoise.base),
    politicalCapital: v(I.politicalCapitalStart),
    pmRelationship: v(I.pmRelationshipStart),
    parliament,
    parliamentMood: governingPartyMood,
    chamberMood,
    pcLog: [],
    yieldBreachedLastQuarter: false,
  };
}

// =============================================================================
// Political-capital and PM-relationship dynamics
// =============================================================================

// One-quarter PC regeneration. Returns { delta, breakdown } so the engine can
// log it and the UI can show the tooltip.
export function computePcRegen(state) {
  const PC = PARAMS.politicalCapital;
  const base = v(PC.baseRegen);
  const alpha = v(PC.parliamentAlpha);
  const beta = v(PC.pmBeta);
  const softCap = v(PC.softCap);
  const decay = v(PC.softCapDecay);

  const parlContribution = alpha * (state.parliamentMood - 50) / 50;
  const pmContribution   = beta  * (state.pmRelationship - 50) / 50;
  const overCap = Math.max(0, state.politicalCapital - softCap);
  const decayAmount = decay * overCap;

  const delta = base + parlContribution + pmContribution - decayAmount;
  return {
    delta,
    breakdown: {
      base,
      parliament: parlContribution,
      pm: pmContribution,
      decay: -decayAmount,
    },
  };
}

// PM-relationship adjustments for one quarter. Returns { delta, reasons[] }.
// Called after reform completions + bond-yield update in stepQuarter.
export function computePmRelationshipDelta(state, { completedReforms = [], yieldBreached = false, surplusPaidDown = 0, cohesion = null } = {}) {
  const PMR = PARAMS.pmRelationship;
  let delta = 0;
  const reasons = [];

  for (const r of completedReforms) {
    const align = reformPmAlignment(r, state.parliament.pmIdeology);
    if (Math.abs(align) > 0.01) {
      const d = align * v(PMR.deltaAlignedScale);
      delta += d;
      reasons.push({ d, reason: align > 0 ? `aligned reform: ${r.name}` : `opposed reform: ${r.name}` });
    }
  }
  if (cohesion !== null && cohesion < v(PMR.cohesionLowThreshold)) {
    delta += v(PMR.deltaCohesionLow);
    reasons.push({ d: v(PMR.deltaCohesionLow), reason: 'coalition cohesion low' });
  }
  if (yieldBreached) {
    delta += v(PMR.deltaYieldBreach);
    reasons.push({ d: v(PMR.deltaYieldBreach), reason: 'bond yield breached threshold' });
  }
  if (surplusPaidDown >= v(PMR.surplusPayDownThreshold)) {
    delta += v(PMR.deltaSurplusPayDown);
    reasons.push({ d: v(PMR.deltaSurplusPayDown), reason: 'surplus to debt paydown' });
  }
  if (state.parliamentMood >= v(PMR.highParlMoodThreshold)) {
    delta += v(PMR.deltaHighParlMood);
    reasons.push({ d: v(PMR.deltaHighParlMood), reason: 'parliament mood high' });
  }
  // Mean reversion toward target.
  const target = v(PMR.meanReversionTarget);
  const rate = v(PMR.meanReversionRate);
  delta += rate * (target - state.pmRelationship);

  return { delta, reasons };
}

export function clampPc(pc) {
  return Math.max(0, Math.min(v(PARAMS.politicalCapital.max), pc));
}

export function clampPmRelationship(pmr) {
  return Math.max(0, Math.min(v(PARAMS.pmRelationship.max), pmr));
}

// Re-export ancillary references the UI needs to render reforms/events.
export { REFORMS, REFORM_BRANCHES, BLOCS, COALITION, EVENT_DEFINITIONS };
