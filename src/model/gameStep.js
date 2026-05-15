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
  updateHousePriceIndex,
  updateEnergyPriceIndex,
  updateEquityIndex,
  updateRiskPremium,
  wealthEffectOnGrowth,
  computePcRegen,
  computePmRelationshipDelta,
  clampPc,
  clampPmRelationship,
} from './engine.js';
import {
  updateSeatMoods,
  aggregateParliamentMood,
  effectivePcCost,
} from './parliament.js';

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
  const preBondYield = game.bondYield;

  let n = { ...game };
  const prePoliticalCapital = n.politicalCapital;
  const prePmRelationship = n.pmRelationship;
  const preParliamentMood = n.parliamentMood;

  // 1. Commit proposed reforms.
  //    Two gates: capacity (skipped → discarded) and political capital
  //    (skipped → DEFERRED, retained in proposedReforms for next quarter).
  const startedReforms = [];
  const skippedReforms = [];
  const deferredForPC = [];
  const capacity = calcReformCapacity(n);
  let inFlightLoad = 0;
  for (const r of Object.values(n.reforms)) {
    if (r.status === 'inProgress') inFlightLoad += reformCapacityLoad(r.reformDef);
  }
  // Precompute cohesion once for the cost calculation.
  const cohesionAtCommit = calcCoalitionCohesion(n.blocSupport, n.blocWeights);
  for (const id of n.proposedReforms) {
    const reform = REFORMS[id];
    if (!reform) continue;
    const load = reformCapacityLoad(reform);
    if (inFlightLoad + load > capacity) {
      skippedReforms.push(reform.name);
      n.log = [...n.log, { q: n.quarter, text: `Deferred (no capacity): ${reform.name}` }];
      continue;
    }
    const pcCost = effectivePcCost(reform, { ...n, coalitionCohesion: cohesionAtCommit });
    if (pcCost > n.politicalCapital) {
      deferredForPC.push(id);
      n.log = [...n.log, { q: n.quarter, text: `Deferred (need ${pcCost.toFixed(0)} PC, have ${n.politicalCapital.toFixed(0)}): ${reform.name}` }];
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
    n.politicalCapital = clampPc(n.politicalCapital - pcCost);
    n.pcLog = [
      { q: n.quarter, delta: -pcCost, reason: `Proposed: ${reform.name}` },
      ...(n.pcLog || []),
    ].slice(0, 32);
    startedReforms.push(reform.name);
    n.log = [...n.log, { q: n.quarter, text: `Started: ${reform.name} (£${cost}bn, ${reform.quarters}Q, ${pcCost.toFixed(0)} PC)` }];
  }
  // Capacity-skipped items are discarded; PC-deferred items roll over.
  n.proposedReforms = deferredForPC;

  // 2. Apply quarterly bloc support deltas
  const deltas = quarterlyBlocDelta(n);
  const newBlocSupport = {};
  for (const [id, s] of Object.entries(n.blocSupport)) {
    newBlocSupport[id] = Math.max(0, Math.min(100, s + deltas[id]));
  }
  n.blocSupport = newBlocSupport;

  // 2b. Update per-seat parliament moods from the new bloc support.
  const newSeatMoods = updateSeatMoods(n.parliament, n.blocSupport);
  n.parliament = { ...n.parliament, seatMoodById: newSeatMoods };
  const moods = aggregateParliamentMood(newSeatMoods, n.parliament);
  n.parliamentMood = moods.governingPartyMood;
  n.chamberMood = moods.chamberMood;

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

  // 6. GDP grows; then real-rate drag, Laffer drag, equity-wealth, mean reversion.
  n.gdp = n.gdp * (1 + (n.growth + n.inflation) / 100 / 4);
  n.realGDP = n.realGDP * (1 + n.growth / 100 / 4);

  const realRateGap = n.bankRate - n.inflation - v(PARAMS.okun.neutralRealRate);
  n.growth = n.growth - v(PARAMS.growthDrag.realRateCoef) * realRateGap;

  // Laffer drag — top income tax above 50% and corp tax above 28% slow growth.
  const topGap  = Math.max(0, n.taxIncomeHigh - v(PARAMS.thresholds.topIncomeLafferRate));
  const corpGap = Math.max(0, n.taxCorp       - v(PARAMS.thresholds.corpHighRate));
  n.growth -= v(PARAMS.growthDrag.topIncomeLafferCoef) * topGap;
  n.growth -= v(PARAMS.growthDrag.corpLafferCoef)      * corpGap;

  n.growth = n.growth + wealthEffectOnGrowth(n);

  // Mean reversion toward potential + accumulated permanent shifts from
  // supply-side reforms. Transient reform bonuses (and event shocks) fade
  // back to anchor over ~4 quarters at rate 0.15.
  const reversionAnchor = v(PARAMS.potentialGrowth) + (n.permanentGrowthShift || 0);
  n.growth = n.growth + v(PARAMS.growthReversion.rate) * (reversionAnchor - n.growth);

  // 6a. Housing & energy markets — update before inflation so contributions
  //     flow into the Phillips-curve forcing term in updateInflation.
  n.housePriceIndex = updateHousePriceIndex(n);
  n.housePricePath = [...((n.housePricePath || []).slice(-7)), n.housePriceIndex];
  n.energyPriceIndex = updateEnergyPriceIndex(n);
  n.energyPricePath = [...((n.energyPricePath || []).slice(-7)), n.energyPriceIndex];

  // 6b. Equity index — consumes Math.random() once. MUST run before the
  //     event roll in step 9 so the existing playtest seed library stays
  //     stable.
  n.equityIndex = updateEquityIndex(n);
  n.equityPath = [...((n.equityPath || []).slice(-7)), n.equityIndex];

  // 6c. Risk premium — reads debt-to-GDP inline and stdev of cohesionHistory.
  //     Computed BEFORE bondYieldFromBankRate so the yield picks it up.
  n.riskPremium = updateRiskPremium(n);

  // 6d. Monetary block — strict order: unemployment, inflation, Bank Rate, yield.
  n.unemployment = updateUnemployment(n);
  n.inflation = updateInflation(n);
  n.bankRate = updateBankRate(n);
  n.bankRatePath = [...((n.bankRatePath || []).slice(-7)), n.bankRate];
  n.bondYield = bondYieldFromBankRate(n);

  // 7. Reform completions — note the +1 (globalQuarter hasn't been bumped yet)
  const completedReforms = [];
  const completedReformDefs = [];
  for (const [id, r] of Object.entries(n.reforms)) {
    if (r.status === 'inProgress' && r.completesQ <= n.globalQuarter + 1) {
      const reform = REFORMS[id];
      const actual = sampleReformOutcome(reform, n.forecastNoise);
      n.reforms = { ...n.reforms, [id]: { ...r, status: 'complete', actualOutcome: actual } };

      if (actual.revBonus) n.revBonusFromReforms = (n.revBonusFromReforms || 0) + actual.revBonus;
      if (actual.ongoingCost) n.ongoingCostFromReforms = (n.ongoingCostFromReforms || 0) + actual.ongoingCost;
      if (actual.ongoingRev) n.ongoingRevFromReforms = (n.ongoingRevFromReforms || 0) + actual.ongoingRev;
      if (actual.healthBoost) n.healthIndex = Math.max(0, Math.min(100, n.healthIndex + actual.healthBoost));
      if (actual.growthBonus) {
        n.growth = n.growth + actual.growthBonus;
        if (reform.growthBonusPermanent) {
          n.permanentGrowthShift = (n.permanentGrowthShift || 0) + actual.growthBonus;
        }
      }
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
      if (reform.special === 'boostHousingSupply') {
        n.housingSupply = (n.housingSupply ?? v(PARAMS.initial.housingSupply))
          + v(PARAMS.housing.supplyReformBoostKpa);
      }
      if (reform.special === 'reduceEnergyShockMagnitude') {
        n.energyShockDamper = v(PARAMS.energy.shockReformDamper);
      }
      if (reform.special === 'flattenPhillipsSlope') {
        n.phillipsSlopeMultiplier = (n.phillipsSlopeMultiplier ?? 1) * 0.6;
      }
      if (reform.special === 'enablePensionDamper') {
        n.equityShockDamper = v(PARAMS.equity.pensionDamper);
      }
      if (reform.special === 'enablePandemicDamperPreventative') {
        n.pandemicDamper = (n.pandemicDamper ?? 1) * v(PARAMS.health.pandemicDamperPreventative);
      }
      if (reform.special === 'enablePandemicDamperSocialCare') {
        n.pandemicDamper = (n.pandemicDamper ?? 1) * v(PARAMS.health.pandemicDamperSocialCare);
      }

      completedReforms.push(reform.name);
      completedReformDefs.push(reform);
      n.log = [...n.log, { q: n.quarter + 1, text: `✓ ${actual.log}` }];
    }
  }

  // 8. Effective rate drifts toward market (models refinancing).
  //    Bond yield itself was already set in step 6b by bondYieldFromBankRate,
  //    so there is no deficit-band update here any more. The
  //    inflationTargetReview reform special above can still shock the yield.
  const drift = v(PARAMS.spending.effectiveRateDriftPerQuarter);
  n.effectiveServicingRate = n.effectiveServicingRate + drift * (n.bondYield - n.effectiveServicingRate);
  const yieldBreachThreshold = v(PARAMS.pmRelationship.yieldBreachThreshold);
  const yieldBreachedNow = preBondYield <= yieldBreachThreshold && n.bondYield > yieldBreachThreshold;

  // 8b. PM relationship dynamics (uses completed reforms + bond breach).
  const cohesionForPm = calcCoalitionCohesion(n.blocSupport, n.blocWeights);
  const pmDyn = computePmRelationshipDelta(n, {
    completedReforms: completedReformDefs,
    yieldBreached: yieldBreachedNow,
    surplusPaidDown: 0,  // surplus-paydown signal comes from commitSurplusAllocation
    cohesion: cohesionForPm,
  });
  n.pmRelationship = clampPmRelationship(n.pmRelationship + pmDyn.delta);

  // 8c. Political capital regeneration.
  const pcRegen = computePcRegen(n);
  n.politicalCapital = clampPc(n.politicalCapital + pcRegen.delta);
  if (Math.abs(pcRegen.delta) >= 0.1) {
    n.pcLog = [
      { q: n.quarter, delta: pcRegen.delta, reason: 'Quarterly regeneration' },
      ...(n.pcLog || []),
    ].slice(0, 32);
  }

  // 9. Risk mods + event roll. rollEvents iterates Object.entries(mods),
  // which preserves insertion order (i.e. the order keys were added to `m`
  // in computeRiskMods). The Red Box queue is built by Fisher–Yates
  // shuffling the triggered ids and taking up to 3 — each draw consumes a
  // Math.random(). Subsequent RNG consumers (the Box-Muller block below)
  // therefore see a shifted seed stream.
  const newMods = computeRiskMods(n);
  const triggered = rollEvents(n, newMods);
  const queued = triggered.slice();
  // Fisher–Yates shuffle
  for (let i = queued.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [queued[i], queued[j]] = [queued[j], queued[i]];
  }
  const RED_BOX_CAP = 3;
  const pendingEvents = queued.slice(0, RED_BOX_CAP);
  // Legacy field — keep populated with the head so any caller still reading
  // pendingEvent in the same render tick sees the same event.
  const eventToShow = pendingEvents.length > 0
    ? { id: pendingEvents[0], ...EVENT_DEFINITIONS[pendingEvents[0]] }
    : null;

  // 9b. Gaussian growth noise — Box-Muller. Placed AFTER the event roll so
  //     the existing playtest seed library (equity sentiment + risk draws +
  //     event-pick) stays stable. Any future Math.random consumer MUST be
  //     inserted before this block to preserve seeds.
  const u1 = Math.max(1e-12, Math.random());
  const u2 = Math.random();
  const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  n.growth = n.growth + v(PARAMS.growthNoise.sigma) * z;

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

  // Cohesion history for the next quarter's risk-premium volatility term.
  const cohesionNow = calcCoalitionCohesion(n.blocSupport, n.blocWeights);
  n.cohesionHistory = [...((n.cohesionHistory || []).slice(-3)), cohesionNow];

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
    deferredForPC: deferredForPC.map((id) => REFORMS[id]?.name).filter(Boolean),
    completedReforms,
    eventPending: !!eventToShow,
    eventQueueLength: pendingEvents.length,
    pendingSurplus: n.pendingSurplus,
    qBalance,
    pcChange: n.politicalCapital - prePoliticalCapital,
    pmRelationshipChange: n.pmRelationship - prePmRelationship,
    parliamentMoodChange: n.parliamentMood - preParliamentMood,
  };
  n.pendingEvent = eventToShow;
  n.pendingEvents = pendingEvents;

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
// resolveEvent — apply an event choice's effect deltas, pop the head of the
// pendingEvents queue. The legacy pendingEvent field is also cleared so old
// localStorage saves load cleanly during the transition.
//
// If the event def is flagged pandemicEffect, negative health/growth/positive
// debt+inflation+unemployment deltas are scaled by n.pandemicDamper (mirrors
// the existing energyShockDamper / equityShockDamper pattern).
// =============================================================================
export function resolveEvent(game, choice, { eventDef } = {}) {
  let n = {
    ...game,
    pendingEvent: null,
    pendingEvents: (game.pendingEvents || []).slice(1),
  };
  const eff = choice.effect;
  const damper = (eventDef && eventDef.pandemicEffect)
    ? (n.pandemicDamper ?? 1) : 1;
  const scale = (x) => x ? x * damper : x;
  const debt = scale(v(eff.debt));
  const growth = scale(v(eff.growth));
  const inflation = scale(v(eff.inflation));
  const healthIndex = scale(v(eff.healthIndex));
  const bondYield = v(eff.bondYield);
  const bankRate = v(eff.bankRate);
  const unemployment = scale(v(eff.unemployment));
  if (debt) n.debt = n.debt + debt;
  if (growth) n.growth = n.growth + growth;
  if (inflation) n.inflation = Math.max(0, n.inflation + inflation);
  if (healthIndex) n.healthIndex = Math.max(0, Math.min(100, n.healthIndex + healthIndex));
  if (bondYield) n.bondYield = Math.max(2, n.bondYield + bondYield);
  if (bankRate) n.bankRate = Math.max(
    v(PARAMS.monetary.bankRateClampLow),
    Math.min(v(PARAMS.monetary.bankRateClampHigh), n.bankRate + bankRate)
  );
  if (unemployment) n.unemployment = Math.max(0, Math.min(20, n.unemployment + unemployment));
  const hpi = v(eff.housePriceIndex);
  if (hpi) n.housePriceIndex = Math.max(40, Math.min(250, (n.housePriceIndex ?? 100) + hpi));
  let energyDelta = v(eff.energyPriceIndex);
  if (energyDelta) {
    // energyMixReform halves positive (shock) injections; reductions pass through unchanged.
    if (energyDelta > 0 && n.energyShockDamper) energyDelta *= n.energyShockDamper;
    n.energyPriceIndex = Math.max(50, Math.min(400, (n.energyPriceIndex ?? 100) + energyDelta));
  }
  let equityDelta = v(eff.equityIndex);
  if (equityDelta) {
    // pensionConsolidation damps negative (shock) injections; positive moves pass through.
    if (equityDelta < 0 && n.equityShockDamper) equityDelta *= n.equityShockDamper;
    n.equityIndex = Math.max(30, Math.min(300, (n.equityIndex ?? 100) + equityDelta));
  }
  const riskPremium = v(eff.riskPremium);
  if (riskPremium) {
    n.riskPremium = Math.max(v(PARAMS.riskPremium.floor),
      Math.min(v(PARAMS.riskPremium.ceiling), (n.riskPremium ?? 0) + riskPremium));
  }
  if (eff.blocs) {
    n.blocSupport = { ...n.blocSupport };
    for (const [bloc, leaf] of Object.entries(eff.blocs)) {
      n.blocSupport[bloc] = Math.max(0, Math.min(100, n.blocSupport[bloc] + v(leaf)));
    }
  }
  if (eff.politicalCapital) {
    n.politicalCapital = clampPc(n.politicalCapital + eff.politicalCapital);
    n.pcLog = [
      { q: game.quarter, delta: eff.politicalCapital, reason: `Event: ${eff.log}` },
      ...(n.pcLog || []),
    ].slice(0, 32);
  }
  if (eff.pmRelationship) {
    n.pmRelationship = clampPmRelationship(n.pmRelationship + eff.pmRelationship);
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
    if (allocation.debt >= v(PARAMS.pmRelationship.surplusPayDownThreshold)) {
      n.pmRelationship = clampPmRelationship(n.pmRelationship + v(PARAMS.pmRelationship.deltaSurplusPayDown));
    }
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
  // Re-seed seat moods from the post-honeymoon bloc support so the new term
  // starts from a fresh constituent-mood signal rather than carrying decades
  // of accumulated noise.
  const refreshedMoods = updateSeatMoods(
    { ...game.parliament, seatMoodById: game.parliament.seatMoodById.map(() => 50) },
    newBlocSupport,
  );
  const moods = aggregateParliamentMood(refreshedMoods, game.parliament);
  return {
    ...game,
    status: 'playing',
    quarter: 1,
    term: game.term + 1,
    termsWon: game.termsWon + 1,
    blocSupport: newBlocSupport,
    bondYield: Math.max(3.5, game.bondYield - 0.5),
    politicalCapital: v(PARAMS.initial.politicalCapitalReelectReset),
    pmRelationship: v(PARAMS.initial.pmRelationshipReelectReset),
    parliament: { ...game.parliament, seatMoodById: refreshedMoods },
    parliamentMood: moods.governingPartyMood,
    chamberMood: moods.chamberMood,
    pcLog: [],
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
  const pcCancel = v(PARAMS.politicalCapital.cancelPenalty);
  const pmCancel = v(PARAMS.pmRelationship.deltaCancel);
  const n = {
    ...game,
    reforms: newReforms,
    blocSupport: newBlocSupport,
    politicalCapital: clampPc(game.politicalCapital - pcCancel),
    pmRelationship: clampPmRelationship(game.pmRelationship + pmCancel),
    pcLog: [
      { q: game.quarter, delta: -pcCancel, reason: `Cancelled: ${reform?.name || id}` },
      ...(game.pcLog || []),
    ].slice(0, 32),
    log: [...game.log, { q: game.quarter, text: `Cancelled: ${reform?.name || id} (-${pcCancel} PC)` }],
  };
  n.committed = makeCommittedSnapshot(n);
  return n;
}
