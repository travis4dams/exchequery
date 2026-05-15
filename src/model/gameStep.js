// =============================================================================
// Game-step orchestration — pure functions.
//
// Extracted from ChancellorSim.jsx so both the UI and the headless playtest
// harness drive the simulation through the same code path. No React, no
// localStorage; every function is state-in/state-out. Math.random() is still
// the only RNG; the playtest seeds it via monkey-patch.
//
// Function map (each takes a game state and returns a new one):
//   stepQuarter(game)               — runs the full quarter advance:
//                                     commit proposed reforms, bloc deltas,
//                                     population dynamics, fiscal flow, GDP,
//                                     reform completions, bond yield, events.
//                                     Returns state with pendingEvent,
//                                     pendingSummary, status updated.
//   resolveEvent(game, choice)      — applies an event choice's effect deltas
//                                     and clears pendingEvent.
//   dismissSummary(game)            — clears pendingSummary. If pendingSurplus
//                                     is below the prompt threshold, folds
//                                     it into debt and clears it. Returns
//                                     { state, needsSurplusAllocation }.
//   commitSurplusAllocation(game,a) — applies a surplus allocation.
//   continueAfterElection(game)     — honeymoon reset; bumps term, termsWon.
//   cancelReform(game, id)          — drops an in-flight reform; sunk-cost
//                                     on upfront £bn; bloc penalty to
//                                     publicSector & professional.
// =============================================================================

import { PARAMS } from './params.js';
import { BLOCS } from './blocs.js';
import { REFORMS } from './reforms.js';
import { EVENT_DEFINITIONS } from './events.js';
import {
  calcCoalitionCohesion,
  calcBalance,
  calcRevenue,
  calcSpending,
  quarterlyBlocDelta,
  applyPopulationDynamics,
  quarterlyPopulationGrowth,
  computeRiskMods,
  rollEvents,
  sampleReformOutcome,
  makeCommittedSnapshot,
  reformCapacityLoad,
  calcReformCapacity,
  updateInflation,
  updateUnemployment,
  updateBankRate,
  bondYieldFromBankRate,
} from './engine.js';

const v = (leaf) => (leaf && typeof leaf === 'object' && 'value' in leaf) ? leaf.value : leaf;

const TERM_LENGTH = v(PARAMS.termLength);
const COALITION_FLOOR = v(PARAMS.coalitionFloor);
const BOND_YIELD_CEILING = v(PARAMS.bondYieldCeiling);
const REELECT_THRESHOLD = v(PARAMS.reelectionCoalitionThreshold);

// =============================================================================
// stepQuarter — one full quarter advance.
//
// Ordering:
// 1. Commit proposed reforms (no passReq re-check — UI gates that).
//    Engine enforces capacity: skip any proposal whose capacityLoad would
//    push total in-flight load past calcReformCapacity. Skipped proposals
//    are logged and discarded (they don't auto-requeue).
// 2. Apply quarterly bloc deltas and clamp [0, 100].
// 3. Population dynamics (uses post-commit reforms; only `complete` ones
//    contribute populationEffects).
// 4. Overall population growth.
// 5. Fiscal flow on quarterly balance (surplus accrues to pendingSurplus,
//    deficit adds to debt).
// 6. GDP growth (nominal + real), then real-rate drag on growth.
// 6b. Monetary block (in this strict order):
//     unemployment (uses fresh growth) → inflation (uses fresh
//     unemployment) → Bank Rate (uses fresh inflation + unemployment) →
//     bond yield (uses fresh Bank Rate). Push Bank Rate onto bankRatePath
//     (max 8) for sparkline + rolling-4Q rate-rise risk mod.
// 7. Reform completions (mind the +1: completesQ <= globalQuarter+1).
//    Handles special flags reduceForecastNoise, setBoeMandateDual,
//    raiseInflationTarget.
// 8. Effective servicing rate drift toward bondYield.
// 9. Risk mods + event roll. Pick one event uniformly from triggered set.
// 10. Build summary; bump quarter + globalQuarter; snapshot.
// 11. Terminal state check on the bumped quarter.
// =============================================================================
export function stepQuarter(game) {
  const preBlocs = { ...game.blocSupport };
  const preCohesion = calcCoalitionCohesion(game.blocSupport, game.blocWeights);
  const preDebt = game.debt;
  const preGrowth = game.growth;
  const preGini = game.gini;
  const preHealth = game.healthIndex;
  const preBalance = calcBalance(game);
  const prePopulation = game.population;
  const preWeights = { ...game.blocWeights };
  const preGDP = game.gdp;
  const preRealGDP = game.realGDP;

  const preInflation = game.inflation;
  const preUnemployment = game.unemployment;
  const preBankRate = game.bankRate;

  let n = { ...game };

  // 1. Commit proposed reforms (engine-enforced capacity)
  const startedReforms = [];
  const skippedReforms = [];
  const capacity = calcReformCapacity(n);
  let inFlightLoad = 0;
  for (const r of Object.values(n.reforms)) {
    if (r.status === 'inProgress') inFlightLoad += reformCapacityLoad(r.reformDef);
  }
  for (const id of n.proposedReforms) {
    const reform = REFORMS[id];
    if (!reform) continue;
    const load = reformCapacityLoad(reform);
    if (inFlightLoad + load > capacity) {
      skippedReforms.push(reform.name);
      n.log = [...n.log, { q: n.quarter, text: `Deferred (no capacity): ${reform.name}` }];
      continue;
    }
    inFlightLoad += load;
    const cost = v(reform.cost);
    n.reforms = {
      ...n.reforms,
      [id]: {
        status: 'inProgress',
        startedQ: n.globalQuarter,
        completesQ: n.globalQuarter + reform.quarters,
        reformDef: reform,
      },
    };
    n.debt = n.debt + cost;
    startedReforms.push(reform.name);
    n.log = [...n.log, { q: n.quarter, text: `Started: ${reform.name} (£${cost}bn, ${reform.quarters}Q)` }];
  }
  n.proposedReforms = [];

  // 2. Apply quarterly bloc support deltas
  const deltas = quarterlyBlocDelta(n);
  const newBlocSupport = {};
  for (const [id, s] of Object.entries(n.blocSupport)) {
    newBlocSupport[id] = Math.max(0, Math.min(100, s + deltas[id]));
  }
  n.blocSupport = newBlocSupport;

  // 3. Population dynamics — bloc weights
  n.blocWeights = applyPopulationDynamics(n.blocWeights, n.reforms);

  // 4. Overall population growth
  const popGrowthQ = quarterlyPopulationGrowth(n.reforms);
  n.population = n.population * (1 + popGrowthQ / 100);

  // 5. Fiscal flow
  const qBalance = calcBalance(n) / 4;
  if (qBalance >= 0) {
    n.pendingSurplus = (n.pendingSurplus || 0) + qBalance;
  } else {
    n.debt = n.debt - qBalance;
  }

  // 6. GDP grows; then real-rate drag on growth state.
  n.gdp = n.gdp * (1 + (n.growth + n.inflation) / 100 / 4);
  n.realGDP = n.realGDP * (1 + n.growth / 100 / 4);
  const realRateGap = n.bankRate - n.inflation - v(PARAMS.okun.neutralRealRate);
  n.growth = n.growth - v(PARAMS.growthDrag.realRateCoef) * realRateGap;

  // 6b. Monetary block — strict order: unemployment, inflation, Bank Rate, yield.
  n.unemployment = updateUnemployment(n);
  n.inflation = updateInflation(n);
  n.bankRate = updateBankRate(n);
  n.bankRatePath = [...((n.bankRatePath || []).slice(-7)), n.bankRate];
  n.bondYield = bondYieldFromBankRate(n);

  // 7. Reform completions — note the +1 (globalQuarter hasn't been bumped yet)
  const completedReforms = [];
  for (const [id, r] of Object.entries(n.reforms)) {
    if (r.status === 'inProgress' && r.completesQ <= n.globalQuarter + 1) {
      const reform = REFORMS[id];
      const actual = sampleReformOutcome(reform, n.forecastNoise);
      n.reforms = { ...n.reforms, [id]: { ...r, status: 'complete', actualOutcome: actual } };

      if (actual.revBonus) n.revBonusFromReforms = (n.revBonusFromReforms || 0) + actual.revBonus;
      if (actual.ongoingCost) n.ongoingCostFromReforms = (n.ongoingCostFromReforms || 0) + actual.ongoingCost;
      if (actual.ongoingRev) n.ongoingRevFromReforms = (n.ongoingRevFromReforms || 0) + actual.ongoingRev;
      if (actual.healthBoost) n.healthIndex = Math.max(0, Math.min(100, n.healthIndex + actual.healthBoost));
      if (actual.growthBonus) n.growth = n.growth + actual.growthBonus;
      if (actual.gini) n.gini = n.gini + actual.gini;

      if (reform.blocEffects) {
        // Mutate the freshly-shallow-copied blocSupport.
        n.blocSupport = { ...n.blocSupport };
        for (const [bloc, leaf] of Object.entries(reform.blocEffects)) {
          n.blocSupport[bloc] = Math.max(0, Math.min(100, n.blocSupport[bloc] + v(leaf)));
        }
      }
      if (reform.special === 'reduceForecastNoise') n.forecastNoise = v(PARAMS.forecastNoise.afterObr);
      if (reform.special === 'setBoeMandateDual') n.boeMandate = 'dual';
      if (reform.special === 'raiseInflationTarget') {
        n.inflationTarget = v(PARAMS.monetary.raisedInflationTarget);
        n.bondYield = Math.min(v(PARAMS.bondYield.ceiling),
          n.bondYield + v(PARAMS.monetary.inflationTargetReviewYieldShock));
      }

      completedReforms.push(reform.name);
      n.log = [...n.log, { q: n.quarter + 1, text: `✓ ${actual.log}` }];
    }
  }

  // 8. Effective rate drifts toward market (models refinancing).
  const drift = v(PARAMS.spending.effectiveRateDriftPerQuarter);
  n.effectiveServicingRate = n.effectiveServicingRate + drift * (n.bondYield - n.effectiveServicingRate);

  // 9. Risk mods + event roll. rollEvents iterates Object.entries(mods),
  // which preserves insertion order (i.e. the order keys were added to `m`
  // in computeRiskMods). The event-pick draw below is the second Math.random()
  // consumed by this step.
  const newMods = computeRiskMods(n);
  const triggered = rollEvents(n, newMods);
  let eventToShow = null;
  if (triggered.length > 0) {
    const eventId = triggered[Math.floor(Math.random() * triggered.length)];
    eventToShow = { id: eventId, ...EVENT_DEFINITIONS[eventId] };
  }

  // 10. Build summary
  const blocChanges = {};
  for (const id of Object.keys(BLOCS)) {
    const change = n.blocSupport[id] - preBlocs[id];
    if (Math.abs(change) >= 0.3) blocChanges[id] = change;
  }
  const blocChangeArray = Object.entries(blocChanges).sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]));

  const popChange = n.population - prePopulation;
  const weightChanges = {};
  for (const id of Object.keys(BLOCS)) {
    const wc = n.blocWeights[id] - preWeights[id];
    if (Math.abs(wc) >= 0.001) weightChanges[id] = wc;
  }

  n.pendingSummary = {
    quarter: n.quarter,
    debtChange: n.debt - preDebt,
    growthChange: n.growth - preGrowth,
    giniChange: n.gini - preGini,
    healthChange: n.healthIndex - preHealth,
    cohesionChange: calcCoalitionCohesion(n.blocSupport, n.blocWeights) - preCohesion,
    balanceChange: calcBalance(n) - preBalance,
    deficitGDP: -calcBalance(n) / n.gdp * 100,
    gdpChange: n.gdp - preGDP,
    realGDPChange: n.realGDP - preRealGDP,
    populationChange: popChange,
    inflationChange: n.inflation - preInflation,
    unemploymentChange: n.unemployment - preUnemployment,
    bankRateChange: n.bankRate - preBankRate,
    blocChanges: blocChangeArray.slice(0, 4),
    weightChanges: Object.entries(weightChanges).sort((a, b) => Math.abs(b[1]) - Math.abs(a[1])).slice(0, 3),
    startedReforms,
    skippedReforms,
    completedReforms,
    eventPending: !!eventToShow,
    pendingSurplus: n.pendingSurplus,
    qBalance,
  };
  n.pendingEvent = eventToShow;

  n.quarter = n.quarter + 1;
  n.globalQuarter = n.globalQuarter + 1;
  n.committed = makeCommittedSnapshot(n);

  // 11. Terminal state (uses post-bump quarter)
  const newCoal = calcCoalitionCohesion(n.blocSupport, n.blocWeights);
  if (newCoal < COALITION_FLOOR) n.status = 'collapsed';
  else if (n.bondYield > BOND_YIELD_CEILING) n.status = 'lost-markets';
  else if (n.quarter > TERM_LENGTH) {
    n.status = newCoal >= REELECT_THRESHOLD ? 'election' : 'lost-election';
  }

  return n;
}

// =============================================================================
// resolveEvent — apply an event choice's effect deltas, clear pendingEvent.
// =============================================================================
export function resolveEvent(game, choice) {
  let n = { ...game, pendingEvent: null };
  const eff = choice.effect;
  if (eff.debt) n.debt = n.debt + eff.debt;
  if (eff.growth) n.growth = n.growth + eff.growth;
  if (eff.inflation) n.inflation = Math.max(0, n.inflation + eff.inflation);
  if (eff.healthIndex) n.healthIndex = Math.max(0, Math.min(100, n.healthIndex + eff.healthIndex));
  if (eff.bondYield) n.bondYield = Math.max(2, n.bondYield + eff.bondYield);
  if (eff.bankRate) n.bankRate = Math.max(
    v(PARAMS.monetary.bankRateClampLow),
    Math.min(v(PARAMS.monetary.bankRateClampHigh), n.bankRate + eff.bankRate)
  );
  if (eff.unemployment) n.unemployment = Math.max(0, Math.min(20, n.unemployment + eff.unemployment));
  if (eff.blocs) {
    n.blocSupport = { ...n.blocSupport };
    for (const [bloc, delta] of Object.entries(eff.blocs)) {
      n.blocSupport[bloc] = Math.max(0, Math.min(100, n.blocSupport[bloc] + delta));
    }
  }
  n.log = [...n.log, { q: game.quarter, text: `[Event] ${eff.log}` }];
  n.committed = makeCommittedSnapshot(n);
  return n;
}

// =============================================================================
// dismissSummary — clear pendingSummary. If pendingSurplus < threshold,
// fold it into debt and clear it. Otherwise the caller must invoke
// commitSurplusAllocation next.
// =============================================================================
export function dismissSummary(game) {
  const threshold = v(PARAMS.surplusAllocation.surplusAllocPromptThreshold);
  if ((game.pendingSurplus || 0) >= threshold) {
    return {
      state: { ...game, pendingSummary: null },
      needsSurplusAllocation: true,
    };
  }
  return {
    state: {
      ...game,
      pendingSummary: null,
      debt: game.debt - (game.pendingSurplus || 0),
      pendingSurplus: 0,
    },
    needsSurplusAllocation: false,
  };
}

// =============================================================================
// commitSurplusAllocation — split the pending surplus between debt paydown,
// services, and tax cuts. Applies the same divisors the UI uses.
// =============================================================================
export function commitSurplusAllocation(game, allocation) {
  const SA = PARAMS.surplusAllocation;
  let n = { ...game };
  n.debt = n.debt - (allocation.debt || 0);

  if (allocation.services > 0) {
    n.blocSupport = { ...n.blocSupport };
    n.healthIndex = Math.min(100, n.healthIndex + allocation.services / v(SA.servicesHealthDivisor));
    n.blocSupport.workingClass = Math.min(100, n.blocSupport.workingClass + allocation.services / v(SA.servicesWorkingClassDivisor));
    n.blocSupport.publicSector = Math.min(100, n.blocSupport.publicSector + allocation.services / v(SA.servicesPublicSectorDivisor));
    n.blocSupport.pensioners   = Math.min(100, n.blocSupport.pensioners   + allocation.services / v(SA.servicesPensionersDivisor));
    n.log = [...n.log, { q: game.quarter, text: `Allocated £${allocation.services.toFixed(0)}bn surplus to public services.` }];
  }
  if (allocation.taxCut > 0) {
    n.blocSupport = { ...n.blocSupport };
    n.ongoingRevFromReforms = (n.ongoingRevFromReforms || 0) - allocation.taxCut;
    n.blocSupport.middleClass = Math.min(100, n.blocSupport.middleClass + allocation.taxCut / v(SA.taxCutMiddleDivisor));
    n.blocSupport.business    = Math.min(100, n.blocSupport.business    + allocation.taxCut / v(SA.taxCutBusinessDivisor));
    n.blocSupport.professional= Math.min(100, n.blocSupport.professional+ allocation.taxCut / v(SA.taxCutProfessionalDivisor));
    n.log = [...n.log, { q: game.quarter, text: `Allocated £${allocation.taxCut.toFixed(0)}bn surplus to ongoing tax cuts.` }];
  }
  if (allocation.debt > 0) {
    n.log = [...n.log, { q: game.quarter, text: `Paid down £${allocation.debt.toFixed(0)}bn of national debt.` }];
  }
  n.pendingSurplus = 0;
  n.committed = makeCommittedSnapshot(n);
  return n;
}

// =============================================================================
// continueAfterElection — apply honeymoon reset, bump term, termsWon.
// =============================================================================
export function continueAfterElection(game) {
  const honeymoonW = v(PARAMS.honeymoonResetWeight);
  const newBlocSupport = { ...game.blocSupport };
  for (const k of Object.keys(BLOCS)) {
    newBlocSupport[k] = newBlocSupport[k] * honeymoonW + BLOCS[k].base * (1 - honeymoonW);
  }
  return {
    ...game,
    status: 'playing',
    quarter: 1,
    term: game.term + 1,
    termsWon: game.termsWon + 1,
    blocSupport: newBlocSupport,
    bondYield: Math.max(3.5, game.bondYield - 0.5),
    log: [...game.log, { q: 1, text: `🗳️ Re-elected for Term ${game.term + 1}.` }],
    committed: null,
  };
}

// =============================================================================
// cancelReform — drop an in-flight reform. Upfront cost stays on the books
// (sunk-cost); apply a bloc penalty to publicSector & professional.
// =============================================================================
export function cancelReform(game, id) {
  const r = game.reforms[id];
  if (!r || r.status !== 'inProgress') return game;
  const reform = REFORMS[id] || r.reformDef;
  const penalty = v(PARAMS.reformCapacity.cancelBlocPenalty);
  const newReforms = { ...game.reforms };
  delete newReforms[id];
  const newBlocSupport = { ...game.blocSupport };
  newBlocSupport.publicSector = Math.max(0, Math.min(100, newBlocSupport.publicSector + penalty));
  newBlocSupport.professional = Math.max(0, Math.min(100, newBlocSupport.professional + penalty));
  const n = {
    ...game,
    reforms: newReforms,
    blocSupport: newBlocSupport,
    log: [...game.log, { q: game.quarter, text: `Cancelled: ${reform?.name || id}` }],
  };
  n.committed = makeCommittedSnapshot(n);
  return n;
}
