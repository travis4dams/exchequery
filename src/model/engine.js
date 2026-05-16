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
import { sampleWithBand, projectBand } from './uncertainty.js';
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
  const departmental =
    s.spendNHS + s.spendEdu + s.spendWelfare + s.spendDefence + s.spendInfra + s.spendLocal
    + s.spendJustice + s.spendFCDO + s.spendDEFRA + s.spendRnD + s.spendDevolved;

  const popScale = s.population / v(PARAMS.spending.populationScaleAnchor);
  const F = PARAMS.spending.fixedCosts;
  const fixed = (v(F.pensions) + v(F.otherDept)) * popScale;

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

  // Justice & Home Affairs — cut below £50bn and boost above £65bn
  const justiceCut = Math.max(0, v(T.justiceCutFloor) - s.spendJustice);
  if (justiceCut > 0) {
    for (const [bloc, leaf] of Object.entries(B.justiceCutBelowFloor)) {
      d[bloc] -= justiceCut * v(leaf);
    }
  }
  const justiceBoost = Math.max(0, s.spendJustice - v(T.justiceBoostFloor));
  if (justiceBoost > 0) {
    for (const [bloc, leaf] of Object.entries(B.justiceBoostAboveFloor)) {
      d[bloc] -= justiceBoost * v(leaf);  // these blocs are upset by the heavy-handed boost
    }
  }

  // FCDO / Foreign Aid — symmetric cut/boost
  const fcdoCut = Math.max(0, v(T.fcdoCutFloor) - s.spendFCDO);
  if (fcdoCut > 0) {
    for (const [bloc, leaf] of Object.entries(B.fcdoCutBelowFloor)) {
      d[bloc] -= fcdoCut * v(leaf);
    }
  }
  const fcdoBoost = Math.max(0, s.spendFCDO - v(T.fcdoBoostFloor));
  if (fcdoBoost > 0) {
    for (const [bloc, leaf] of Object.entries(B.fcdoBoostAboveFloor)) {
      d[bloc] += fcdoBoost * v(leaf);
    }
  }

  // DEFRA — symmetric cut/boost
  const defraCut = Math.max(0, v(T.defraCutFloor) - s.spendDEFRA);
  if (defraCut > 0) {
    for (const [bloc, leaf] of Object.entries(B.defraCutBelowFloor)) {
      d[bloc] -= defraCut * v(leaf);
    }
  }
  const defraBoost = Math.max(0, s.spendDEFRA - v(T.defraBoostFloor));
  if (defraBoost > 0) {
    for (const [bloc, leaf] of Object.entries(B.defraBoostAboveFloor)) {
      d[bloc] += defraBoost * v(leaf);
    }
  }

  // R&D — symmetric cut/boost
  const rndCut = Math.max(0, v(T.rndCutFloor) - s.spendRnD);
  if (rndCut > 0) {
    for (const [bloc, leaf] of Object.entries(B.rndCutBelowFloor)) {
      d[bloc] -= rndCut * v(leaf);
    }
  }
  const rndBoost = Math.max(0, s.spendRnD - v(T.rndBoostFloor));
  if (rndBoost > 0) {
    for (const [bloc, leaf] of Object.entries(B.rndBoostAboveFloor)) {
      d[bloc] += rndBoost * v(leaf);
    }
  }

  // Devolved transfers — cut only
  const devolvedCut = Math.max(0, v(T.devolvedCutFloor) - s.spendDevolved);
  if (devolvedCut > 0) {
    for (const [bloc, leaf] of Object.entries(B.devolvedCutBelowFloor)) {
      d[bloc] -= devolvedCut * v(leaf);
    }
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
  // Asymmetric slope per Bunn et al. (BoE WP 1107, 2025): hot-labour-market
  // slope (gap > 0) is ~3× the slack-side slope. labourFlexibility reform
  // continues to scale BOTH branches via phillipsSlopeMultiplier.
  const gap = s.naturalUnemployment - s.unemployment;
  const baseSlope = gap > 0 ? v(PARAMS.phillips.slopePositive)
                            : v(PARAMS.phillips.slopeNegative);
  const slope = baseSlope * (s.phillipsSlopeMultiplier ?? 1);
  let phillipsTerm = slope * gap;
  // Trend-inflation amplification: when CPI exceeds threshold, menu-cost
  // mechanism pushes firms closer to price-increase thresholds (Bunn et al.).
  if (s.inflation > v(PARAMS.phillips.trendInflationThreshold)) {
    phillipsTerm *= v(PARAMS.phillips.trendInflationModifier);
  }

  const vatImpulseCoef = v(PARAMS.phillips.vatImpulseCoef);
  const basicImpulseCoef = v(PARAMS.phillips.basicImpulseCoef);
  const growthDriftCoef = v(PARAMS.phillips.growthDriftCoef);
  const trendGrowth = v(PARAMS.okun.trendGrowth);
  const vatAnchor = v(PARAMS.initial.taxVAT);
  const basicAnchor = v(PARAMS.initial.taxIncomeBasic);

  const demandImpulse = vatImpulseCoef * (s.taxVAT - vatAnchor)
                      + basicImpulseCoef * (s.taxIncomeBasic - basicAnchor);
  const growthDrift = growthDriftCoef * (s.growth - trendGrowth);
  const housingContribution = housingInflationContribution(s);
  const energyContribution = energyInflationContribution(s);
  const forcing = target + phillipsTerm + demandImpulse + growthDrift
                + housingContribution + energyContribution;

  return Math.max(0, persistence * s.inflation + (1 - persistence) * forcing);
}

// =============================================================================
// Housing & energy markets — index dynamics + CPI contributions
//
// HPI and the energy index evolve in their own functions and feed the CPI
// forcing term in updateInflation. Both are smoothed and bounded to stop
// pathological runaways. Math.random is NOT consumed here.
// =============================================================================

// Effective mortgage rate — UK 86% fixed-rate share (BoE MLAR Q3 2022) with
// 2-year dominant fix. Blend half of today's Bank Rate with the Bank Rate
// from `lagQuarters` ago, plus a 30bp wedge (BoE MPR Nov 2025). Reads from
// s.bankRatePath; tests passing only bankRate fall back gracefully.
export function updateMortgageRate(s) {
  const M = PARAMS.monetary.mortgagePassthrough;
  const lag = v(M.lagQuarters);
  const wedge = v(M.wedgeBps) / 100;
  const fixedShare = v(M.fixedShare);
  // bankRatePath includes the current quarter at index length-1 (gameStep
  // pushes before calling this function), so "lag quarters ago" lives at
  // path[length-1-lag]. With lag=8: path[length-9] = 8 quarters ago.
  const path = s.bankRatePath || [];
  const laggedRate = path[Math.max(0, path.length - 1 - lag)] ?? s.bankRate;
  return fixedShare * s.bankRate + (1 - fixedShare) * laggedRate + wedge;
}

export function updateHousePriceIndex(s) {
  const H = PARAMS.housing;
  const persistence = v(H.persistence);
  const wageElasticity = v(H.priceWageElasticity);
  const rateElasticity = v(H.priceRateElasticity);
  const supplyResp = v(H.supplyResponsePerKpa);
  const baseSupply = v(H.baseSupplyKpa);
  const neutralReal = v(PARAMS.okun.neutralRealRate);
  const trendGrowth = v(PARAMS.okun.trendGrowth);

  // Nominal income growth gap — housing tracks nominal incomes (it's a
  // nominal asset and an inflation hedge). Uses (growth + inflation) above
  // (trend + target) so high-inflation paths support HPI even when real
  // growth is weak.
  const wageSignal = (s.growth + s.inflation) - (trendGrowth + s.inflationTarget);
  // Real rate gap reads the effective mortgage rate (lagged blend) rather
  // than Bank Rate directly — captures the dominant-fix UK structure.
  // Falls back to bankRate when s.mortgageRate is absent (older test states).
  const mortgageRate = s.mortgageRate ?? s.bankRate;
  const realRateGap = mortgageRate - s.inflation - neutralReal;
  const supplyKick = supplyResp * (s.housingSupply - baseSupply);
  const forcing = 100 + wageElasticity * wageSignal + rateElasticity * realRateGap + supplyKick;

  const next = persistence * s.housePriceIndex + (1 - persistence) * forcing;
  return Math.max(40, Math.min(250, next));
}

export function updateEnergyPriceIndex(s) {
  const E = PARAMS.energy;
  const decay = v(E.shockDecay);
  const drift = v(E.baselineDrift);
  const dampener = v(E.greenInvestDampener);
  const passthrough = v(E.cap.passthrough);
  const lag = v(E.cap.lagQuarters);

  // Ofgem default-tariff cap reacts to wholesale prices ~lag quarters ago.
  // energyShockBuffer is a FIFO 4-quarter window of incoming shock magnitudes
  // (oldest at index 0, newest at length-1). Single-entry lookback:
  // buffer[length - lag] is the entry from `lag` quarters ago.
  const buffer = s.energyShockBuffer || [];
  const lookbackIdx = Math.max(0, buffer.length - lag);
  const capContribution = passthrough * (buffer[lookbackIdx] ?? 0);

  // Mean-revert toward 100 at decay rate; add baseline drift; add cap pass-through;
  // apply green-policy dampener.
  let next = decay * (s.energyPriceIndex - 100) + 100 + drift + capContribution;
  if (s.reforms?.greenInvest?.status === 'complete') next += dampener;
  if (s.reforms?.insulationScheme?.status === 'complete') next += dampener;
  return Math.max(50, Math.min(400, next));
}

export function housingInflationContribution(s) {
  const H = PARAMS.housing;
  return v(H.cpiWeight) * (s.housePriceIndex / 100 - 1) * v(H.cpiContributionScale);
}

export function energyInflationContribution(s) {
  const E = PARAMS.energy;
  return v(E.cpiWeight) * (s.energyPriceIndex / 100 - 1) * v(E.cpiContributionScale);
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
  // LDI / DB-pension structural demand for long-end gilts is a passive sink
  // (Chicago Fed Letter 480, 2023). Discount the term premium by
  // passiveDemandWeight × longGiltDemandShare. With weight 0.5 and share 0.28,
  // this deducts 14bp from the 30bp base, leaving 16bp effective premium.
  const passiveDemand = v(PARAMS.monetary.passiveDemandWeight)
                      * v(PARAMS.equity.ldi.longGiltDemandShare);
  const effectiveTermPremium = Math.max(0, termPremium - passiveDemand);

  const deficitCoef = v(PARAMS.monetary.deficitYieldCoef);
  const yieldSmooth = v(PARAMS.monetary.yieldSmooth);
  const balYr = calcBalance(s);
  const deficitAdj = Math.max(0, -balYr) * deficitCoef;
  const riskPremium = s.riskPremium ?? 0;
  const target = s.bankRate + effectiveTermPremium + deficitAdj + riskPremium;
  const lo = v(PARAMS.bondYield.floor);
  const hi = v(PARAMS.bondYield.ceiling);
  return Math.max(lo, Math.min(hi, yieldSmooth * s.bondYield + (1 - yieldSmooth) * target));
}

// =============================================================================
// Equity market + risk premium (Phase 3)
//
// updateEquityIndex consumes Math.random ONCE per call (sentiment noise). It
// must be called BEFORE rollEvents in stepQuarter to preserve seed stability
// for the existing event roll.
// updateRiskPremium reads s.cohesionHistory (stdev) and inline-computes
// debt-to-GDP rather than reading a stored field.
// =============================================================================

export function updateEquityIndex(s) {
  const E = PARAMS.equity;
  const persistence = v(E.persistence);
  const earningsCoef = v(E.earningsCoef);
  const taxCorpDrag = v(E.taxCorpDrag);
  const rateSensitivity = v(E.rateSensitivity);
  const businessSentimentScale = v(E.businessSentimentScale);
  const noiseScale = v(E.sentimentNoiseScale);
  const trendGrowth = v(PARAMS.okun.trendGrowth);
  const neutralReal = v(PARAMS.okun.neutralRealRate);
  const corpAnchor = v(PARAMS.initial.taxCorp);

  const growthGap = s.growth - trendGrowth;
  const realRateGap = s.bankRate - s.inflation - neutralReal;
  const businessLean = ((s.blocSupport?.business ?? 50) - 50) / 50;
  const noise = (Math.random() * 2 - 1) * noiseScale;

  const forcing = 100
    + earningsCoef * growthGap
    - taxCorpDrag * (s.taxCorp - corpAnchor)
    - rateSensitivity * realRateGap
    + businessSentimentScale * businessLean
    + noise;

  const next = persistence * (s.equityIndex ?? 100) + (1 - persistence) * forcing;
  return Math.max(30, Math.min(300, next));
}

function cohesionVolatility(history) {
  if (!history || history.length < 2) return 0;
  const mean = history.reduce((a, b) => a + b, 0) / history.length;
  const variance = history.reduce((a, x) => a + (x - mean) ** 2, 0) / history.length;
  return Math.sqrt(variance);
}

export function updateRiskPremium(s) {
  const R = PARAMS.riskPremium;
  const threshold = v(R.debtThreshold);
  const debtCoef = v(R.debtCoef);
  let volCoef = v(R.volatilityCoef);
  if (s.reforms?.cityRegulation?.status === 'complete') {
    volCoef *= v(PARAMS.equity.cityRegulationDamper);
  }
  const debtToGDP = s.debt / s.gdp * 100;
  const debtKick = debtCoef * Math.max(0, debtToGDP - threshold);
  const volKick = volCoef * cohesionVolatility(s.cohesionHistory);
  const lo = v(R.floor);
  const hi = v(R.ceiling);
  return Math.max(lo, Math.min(hi, debtKick + volKick));
}

export function wealthEffectOnGrowth(s) {
  const coef = v(PARAMS.equity.wealthEffectCoef);
  const cap = v(PARAMS.equity.wealthEffectCap);
  const raw = coef * ((s.equityIndex ?? 100) / 100 - 1);
  return Math.max(-cap, Math.min(cap, raw));
}

// Current-quarter growth/inflation contributions from the new departmental
// sliders. Returns deltas in pp; caller adds them before mean reversion.
export function deptSliderHooks(s) {
  const G = PARAMS.growthHooks;
  const T = PARAMS.thresholds;
  const I = PARAMS.initial;

  let growth = 0;
  let inflation = 0;

  const rndDelta = s.spendRnD - v(I.spendRnD);
  if (rndDelta >= 0) growth += rndDelta * v(G.rndPerBnAboveBaseline);
  else growth += rndDelta * v(G.rndPerBnBelowBaseline);  // rndDelta is negative

  const fcdoDelta = s.spendFCDO - v(I.spendFCDO);
  if (fcdoDelta >= 0) growth += fcdoDelta * v(G.fcdoPerBnAboveBaseline);
  else growth += fcdoDelta * v(G.fcdoPerBnBelowBaseline);

  const defraCut = Math.max(0, v(I.spendDEFRA) - s.spendDEFRA);
  inflation += defraCut * v(G.defraPerBnBelowBaseline);

  const justiceCutForGrowth = Math.max(0, v(T.justiceCutFloor) - s.spendJustice);
  growth -= justiceCutForGrowth * v(G.justicePerBnBelowCutFloor);

  const devolvedCutForGrowth = Math.max(0, v(I.spendDevolved) - s.spendDevolved);
  growth -= devolvedCutForGrowth * v(G.devolvedPerBnBelowBaseline);

  return { growth, inflation };
}

// =============================================================================
// State-dependent fiscal multipliers — level-deviation interpretation.
//
// Each quarter the growth impulse for spending category X is:
//   multiplier × (currentSpendLevel − baselineSpendLevel) / nominalGDP × 100
//                / taperHorizonQuarters
// Equivalent to spreading the cumulative multiplier effect uniformly across
// taperHorizonQuarters (5 years) while the deviation persists. Steady state
// matches the textbook multiplier interpretation: a sustained £10bn extra
// infra spend (0.32% of GDP) at multiplier 1.0 over 20 quarters cumulates to
// +0.32pp growth ≈ +£10bn GDP. Per OBR dynamic scoring (Nov 2023).
//
// Tax channels: deviation is in £bn of yield (rate-deviation × per-pp yield),
// flipped negative because tax rises drag growth. VAT and income tax bands
// each get their own yield-per-pp coefficient; income-tax bands are summed
// directly rather than averaged, since the bases differ by ~40×.
//
// Recession amplification: when output gap (growth − potentialGrowth) falls
// below recessionGapThreshold (−2pp), multiply the per-quarter impulse by
// recessionModifier (1.7×) per Auerbach-Gorodnichenko (AEJ:Pol 2012).
//
// Categories covered: NHS, Education, Welfare, Local, Infrastructure, Defence
// (CDEL/RDEL/AME assignment) plus VAT and income tax (basic/higher/additional).
// R&D, FCDO, DEFRA, Justice, Devolved are handled by deptSliderHooks — do NOT
// add them here without removing them there. The allowlist below enforces the
// partition: if a key escapes the set, the throw fires immediately rather
// than silently double-routing.
// =============================================================================
const FISCAL_MULTIPLIER_SPEND_ALLOWLIST = new Set([
  'spendNHS', 'spendEdu', 'spendWelfare', 'spendLocal', 'spendInfra', 'spendDefence',
]);

export function applyFiscalMultipliers(s) {
  const F = PARAMS.fiscalMultipliers;
  const I = PARAMS.initial;
  const taper = v(F.taperHorizonQuarters);
  const gdp = s.gdp;
  const outputGap = s.growth - v(PARAMS.potentialGrowth);
  const ampMod = outputGap < v(F.recessionGapThreshold) ? v(F.recessionModifier) : 1;

  let impulse = 0;

  // Spending channels — CDEL (capital), RDEL (resource current), AME (welfare).
  const spendCategories = [
    { key: 'spendNHS',     baseline: v(I.spendNHS),     multiplier: v(F.rdel) },
    { key: 'spendEdu',     baseline: v(I.spendEdu),     multiplier: v(F.rdel) },
    { key: 'spendWelfare', baseline: v(I.spendWelfare), multiplier: v(F.ame)  },
    { key: 'spendLocal',   baseline: v(I.spendLocal),   multiplier: v(F.rdel) },
    { key: 'spendInfra',   baseline: v(I.spendInfra),   multiplier: v(F.cdel) },
    { key: 'spendDefence', baseline: v(I.spendDefence), multiplier: v(F.cdel) },
  ];
  for (const { key, baseline, multiplier } of spendCategories) {
    if (!FISCAL_MULTIPLIER_SPEND_ALLOWLIST.has(key)) {
      throw new Error(`applyFiscalMultipliers: spend key '${key}' not in allowlist; check partition vs deptSliderHooks`);
    }
    const deviation = s[key] - baseline;
    impulse += multiplier * (deviation / gdp) * 100 / taper;
  }

  // Tax channels — sign convention: tax rises drag growth (negative impulse).
  // Sum £bn contributions directly across bands; do NOT average the per-pp
  // coefficients (basic-rate yield is ~40× additional-rate yield).
  const R = PARAMS.revenue;
  const vatDeviationBn = (s.taxVAT - v(I.taxVAT)) * v(R.vat.perPP);
  impulse -= v(F.vat) * (vatDeviationBn / gdp) * 100 / taper;

  const itDeviationBn =
      (s.taxIncomeBasic - v(I.taxIncomeBasic)) * v(R.incomeTax.basicRatePerPP)
    + (s.taxIncomeHigh  - v(I.taxIncomeHigh))  * v(R.incomeTax.higherRatePerPP)
    + (s.taxIncomeAdd   - v(I.taxIncomeAdd))   * v(R.incomeTax.additionalRatePerPP);
  impulse -= v(F.incomeTax) * (itDeviationBn / gdp) * 100 / taper;

  return impulse * ampMod;
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
  const eduAnchor = v(PARAMS.initial.spendEdu);
  const winterQ = ((s.quarter - 1) % 4) + 1;
  const marketStress = (s.bondYield ?? 0) + (s.riskPremium ?? 0);

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
    housePriceCorrection: v(R.housePriceCorrection.base)
      + Math.max(0, (s.housePriceIndex ?? 100) - 120) * v(R.housePriceCorrection.perHpiAboveThreshold),
    planningRevolt: s.reforms?.housingSupplyTarget?.status === 'complete'
      ? v(R.planningRevolt.postReformBase)
      : v(R.planningRevolt.base),
    equityCrash: v(R.equityCrash.base)
      + Math.max(0, (s.equityIndex ?? 100) - 130) * v(R.equityCrash.perEquityAboveThreshold),
    giltStrike: (s.riskPremium ?? 0) > v(R.giltStrike.whenPremiumAbove)
      ? v(R.giltStrike.activeBase)
      : v(R.giltStrike.base),
    sovereignRatingAction: ((s.debt / s.gdp * 100) > v(R.sovereignRatingAction.whenDebtAbove)
      && (s.riskPremium ?? 0) > v(R.sovereignRatingAction.whenPremiumAbove))
      ? v(R.sovereignRatingAction.activeBase)
      : v(R.sovereignRatingAction.base),
    recession: v(R.recession.base)
      + Math.max(0, s.growth - v(PARAMS.potentialGrowth))
      * Math.max(0, s.inflation - s.inflationTarget)
      * v(R.recession.overheatingCoef),
    civilUnrest: v(R.civilUnrest.base),
    diplomaticIsolation: v(R.diplomaticIsolation.base),
    independenceMovement: v(R.independenceMovement.base),

    // Red Box expansion events
    pandemic: v(R.pandemic.base),
    teacherStrike: v(R.teacherStrike.base),
    droughtStress: v(R.droughtStress.base) + (winterQ === 3 ? v(R.droughtStress.summerKick) : 0),
    supplyChainShock: v(R.supplyChainShock.base)
      + Math.max(0, s.riskPremium ?? 0) * v(R.supplyChainShock.perPpRiskPremium),
    cyberAttack: v(R.cyberAttack.base),
    coldSnap: v(R.coldSnap.base) + (winterQ === 1 || winterQ === 4 ? v(R.coldSnap.winterKick) : 0),
    aiDisplacement: v(R.aiDisplacement.base) + (s.globalQuarter ?? 1) * v(R.aiDisplacement.perGlobalQuarter),
    scientificBreakthrough: v(R.scientificBreakthrough.base),
    sterlingSlide: marketStress > v(R.sterlingSlide.whenStressAbove)
      ? v(R.sterlingSlide.activeBase) : v(R.sterlingSlide.base),
    commercialPropertyCrash: v(R.commercialPropertyCrash.base)
      + Math.max(0, (s.equityIndex ?? 100) - 130) * v(R.commercialPropertyCrash.perEquityAboveThreshold),
    pensionFundCrisis: v(R.pensionFundCrisis.base)
      + Math.max(0, 85 - (s.equityIndex ?? 100)) * v(R.pensionFundCrisis.perEquityBelowThreshold),
    fintechIpo: v(R.fintechIpo.base),
    inflationSurprise: v(R.inflationSurprise.base) + inflGap * v(R.inflationSurprise.perPpAboveTarget),
    cabinetScandal: v(R.cabinetScandal.base)
      + Math.max(0, -(s.parliamentMood ?? 0)) * v(R.cabinetScandal.perPpMoodDeficit),
    devolutionDispute: v(R.devolutionDispute.base),
    // LDI doom-loop gate (BoE Staff WP 1019, 2023). Reads s.bondYieldPath
    // (NOT bankRatePath); compares current bondYield to the value at
    // path[length-2] (previous quarter). At Q1 with empty path the delta
    // is 0 and the gate stays off.
    ldiDoomLoop: (() => {
      const path = s.bondYieldPath || [];
      const yieldDeltaBp = path.length >= 2
        ? (s.bondYield - path[path.length - 2]) * 100
        : 0;
      const ldiSharePct = v(PARAMS.equity.ldi.longGiltDemandShare) * 100;
      const triggered = yieldDeltaBp > v(R.ldiDoomLoop.yieldDeltaTrigger)
                     && ldiSharePct > v(R.ldiDoomLoop.ldiShareThreshold);
      return triggered ? v(R.ldiDoomLoop.activeBase) : v(R.ldiDoomLoop.base);
    })(),
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

  // New departmental risk-mod hooks.
  const justiceCutFloor = v(T.justiceCutFloor);
  if (s.spendJustice < justiceCutFloor) {
    m.civilUnrest += (justiceCutFloor - s.spendJustice) * v(R.civilUnrest.perBnJusticeUnderfunded);
  }
  const fcdoCutFloor = v(T.fcdoCutFloor);
  if (s.spendFCDO < fcdoCutFloor) {
    m.diplomaticIsolation += (fcdoCutFloor - s.spendFCDO) * v(R.diplomaticIsolation.perBnFcdoUnderfunded);
  }
  const devolvedCutFloor = v(T.devolvedCutFloor);
  if (s.spendDevolved < devolvedCutFloor) {
    m.independenceMovement += (devolvedCutFloor - s.spendDevolved) * v(R.independenceMovement.perBnDevolvedUnderfunded);
  }

  // Red Box expansion: spending-driven probability bumps
  if (s.spendNHS < nhsAnchor) m.pandemic += (nhsAnchor - s.spendNHS) * v(R.pandemic.perBnNhsUnderfunded);
  if (s.spendEdu < eduAnchor) m.teacherStrike += (eduAnchor - s.spendEdu) * v(R.teacherStrike.perBnEduUnderfunded);
  if (s.spendLocal < localAnchor) m.devolutionDispute += (localAnchor - s.spendLocal) * v(R.devolutionDispute.perBnLocalUnderfunded);

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
// Reform projection & sampling — each numeric onComplete leaf can declare its
// own forecast band via cited(value, citationId, { band }); the global
// `multiplier` (1.0 by default, 0.4 after OBR Independence) scales every band's
// width. Leaves without an authored band fall back to a symmetric `fallbackWidth`.
// =============================================================================

// Yield [key, leaf] for numeric on-complete effects, ignoring `log` and the
// per-bloc populationEffects map (which the UI reports separately).
function numericOnCompleteLeaves(reformDef) {
  const out = [];
  const oc = reformDef.onComplete || {};
  for (const [k, leaf] of Object.entries(oc)) {
    if (k === 'log' || k === 'populationEffects') continue;
    if (leaf && typeof leaf === 'object' && 'value' in leaf) out.push([k, leaf]);
  }
  return out;
}

// Resolve the effective band for a leaf: prefer the cited per-leaf band,
// otherwise fall back to a symmetric `fallbackWidth`. Returned width is
// scaled by `multiplier` (1.0 by default; 0.4 after OBR Independence).
function effectiveBand(leaf, fallbackWidth, multiplier) {
  if (leaf.band) {
    return { low: leaf.band.low * multiplier, high: leaf.band.high * multiplier, dist: leaf.band.dist };
  }
  if (!fallbackWidth) return null;
  const w = fallbackWidth * multiplier;
  return { low: -w, high: w, dist: 'triangular' };
}

export function projectReformOutcome(reformDef, multiplier = 1, fallbackWidth = v(PARAMS.forecastNoise.bandFallback)) {
  const out = {};
  if (!reformDef.onComplete) return out;
  for (const [k, leaf] of numericOnCompleteLeaves(reformDef)) {
    const band = effectiveBand(leaf, fallbackWidth, multiplier);
    out[k] = projectBand(leaf.value, band);
  }
  return out;
}

export function sampleReformOutcome(reformDef, multiplier = 1, fallbackWidth = v(PARAMS.forecastNoise.bandFallback)) {
  const out = { log: reformDef.onComplete?.log, forecast: {}, realised: {} };
  for (const [k, leaf] of numericOnCompleteLeaves(reformDef)) {
    const band = effectiveBand(leaf, fallbackWidth, multiplier);
    const realised = sampleWithBand(leaf.value, band);
    out[k] = realised;
    out.realised[k] = realised;
    out.forecast[k] = projectBand(leaf.value, band);
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
    housePriceIndex: s.housePriceIndex, energyPriceIndex: s.energyPriceIndex,
    housingSupply: s.housingSupply,
    equityIndex: s.equityIndex, riskPremium: s.riskPremium,
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
    spendJustice: v(I.spendJustice), spendFCDO: v(I.spendFCDO), spendDEFRA: v(I.spendDEFRA),
    spendRnD: v(I.spendRnD), spendDevolved: v(I.spendDevolved),
    blocSupport: initialBlocSupport,
    blocWeights: initialBlocWeights,
    reforms: {}, proposedReforms: [],
    revBonusFromReforms: 0, ongoingCostFromReforms: 0, ongoingRevFromReforms: 0,
    healthIndex: v(I.healthIndex), gini: v(I.gini),
    bankRate: v(I.bankRate),
    // Effective mortgage rate — updateMortgageRate blends current and lagged
    // Bank Rate plus a wedge. Initialised at Bank Rate + wedge (no history yet).
    mortgageRate: v(I.bankRate) + v(PARAMS.monetary.mortgagePassthrough.wedgeBps) / 100,
    inflationTarget: v(I.inflationTarget),
    naturalUnemployment: v(I.naturalUnemployment),
    boeMandate: 'inflation_only',
    bankRatePath: [],
    // Parallel to bankRatePath; used by LDI doom-loop gate and projection.js.
    // Empty initial array matches bankRatePath convention; LDI gate returns
    // yieldDelta = 0 while path.length < 2.
    bondYieldPath: [],
    // FIFO 4-quarter rolling window of incoming energy shock magnitudes.
    // Oldest at index 0, newest at length-1; consumed by updateEnergyPriceIndex
    // via buffer[length - lagQuarters] for the Ofgem cap pass-through channel.
    energyShockBuffer: [0, 0, 0, 0],
    housePriceIndex: v(I.housePriceIndex),
    energyPriceIndex: v(I.energyPriceIndex),
    housingSupply: v(I.housingSupply),
    housePricePath: [],
    energyPricePath: [],
    phillipsSlopeMultiplier: 1,
    equityIndex: v(I.equityIndex),
    equityPath: [],
    gdpPath: [],
    debtRatioPath: [],
    deficitRatioPath: [],
    unemploymentPath: [],
    healthIndexPath: [],
    populationPath: [],
    inflationPath: [],
    riskPremium: v(I.riskPremium),
    permanentGrowthShift: 0,
    cohesionHistory: [],
    log: [], pendingEvent: null, pendingEvents: [], pendingSummary: null,
    pandemicDamper: 1,
    pendingSurplus: 0,
    status: 'playing', committed: null, termsWon: 0,
    forecastNoiseMultiplier: 1,
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
