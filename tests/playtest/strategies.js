// Pluggable player strategies for the headless playtest.
//
// Strategy contract:
//   initialBudget(state)               → patch  (applied once at quarter 1)
//   adjustBudget(state)                → patch | null  (called every quarter)
//   proposeReforms(state, cohesion)    → string[]  (reform ids; replaces proposedReforms)
//   resolveEvent(state, event)         → number  (choice index)
//   allocateSurplus(state, surplus)    → { debt, services, taxCut }

import { REFORMS, COALITION, effectivePcCost, getExclusionBlocker } from '../../src/model/index.js';

const v = (leaf) => (leaf && typeof leaf === 'object' && 'value' in leaf) ? leaf.value : leaf;

// Which non-controversial reforms can the player propose right now?
// Mirrors the gate in ReformCard.jsx: prereqs complete, coalition >= passReq
// (soft — could pay PC surcharge, but for safety strategies we keep the
// original gate), AND effective PC cost <= available PC.
function availableNonControversialReforms(state, cohesion) {
  const out = [];
  for (const [id, r] of Object.entries(REFORMS)) {
    if (r.controversial) continue;
    if (state.reforms[id]) continue;                  // already started or done
    if (state.proposedReforms.includes(id)) continue; // already queued
    const prereqsOk = r.prereq.every(p => state.reforms[p]?.status === 'complete');
    if (!prereqsOk) continue;
    if (getExclusionBlocker(r, state)) continue;      // mutually-exclusive track
    const passReq = v(r.passReq?.coalition) ?? 0;
    if (cohesion < passReq) continue;
    const pcCost = effectivePcCost(r, { ...state, coalitionCohesion: cohesion });
    if (pcCost > (state.politicalCapital ?? 100)) continue;
    out.push(id);
  }
  return out;
}

// Bang-per-buck score for ordering proposals: coalition-support gain per
// unit of capacity load. Higher = more attractive. Reforms with no positive
// coalition signal score zero/negative and sort to the back, but stay in
// the queue so the engine picks them up once the high-value ones complete.
function bangPerBuck(reform) {
  let coalitionImpact = 0;
  if (reform.blocEffects) {
    for (const id of COALITION) {
      const leaf = reform.blocEffects[id];
      if (leaf) coalitionImpact += v(leaf);
    }
  }
  const load = reform.capacityLoad || 1;
  return coalitionImpact / load;
}

// Sort an id list by bang-per-buck desc. Tie-breakers: smaller capacityLoad
// (frees the slot sooner), then smaller upfront cost.
function rankByBangPerBuck(ids) {
  return [...ids].sort((a, b) => {
    const ra = REFORMS[a], rb = REFORMS[b];
    const diff = bangPerBuck(rb) - bangPerBuck(ra);
    if (diff !== 0) return diff;
    const ld = (ra.capacityLoad || 1) - (rb.capacityLoad || 1);
    if (ld !== 0) return ld;
    return v(ra.cost) - v(rb.cost);
  });
}

// Score an event choice by the change in (weighted) coalition support it
// produces. Higher = better for the player. Ties broken by lower debt cost.
function scoreEventChoice(state, choice) {
  const eff = choice.effect || {};
  let coalitionDelta = 0;
  if (eff.blocs) {
    for (const id of COALITION) {
      if (eff.blocs[id]) coalitionDelta += v(eff.blocs[id]);
    }
  }
  return { coalition: coalitionDelta, debt: v(eff.debt) || 0 };
}

function bestEventChoice(state, event) {
  let bestIdx = 0;
  let bestScore = scoreEventChoice(state, event.choices[0]);
  for (let i = 1; i < event.choices.length; i++) {
    const s = scoreEventChoice(state, event.choices[i]);
    if (s.coalition > bestScore.coalition ||
        (s.coalition === bestScore.coalition && s.debt < bestScore.debt)) {
      bestIdx = i;
      bestScore = s;
    }
  }
  return bestIdx;
}

// =============================================================================
// dominantCheese — the strategy the user wants to see fail post-fix.
//
// - Tax bands: maxed on higher rate, additional rate, and corp tax.
// - VAT: minimised.
// - Defence: minimised.
// - Other spending: left at baseline (UI slider neutral).
// - Reforms: propose every non-controversial reform as soon as available,
//   ordered by bang-per-buck (coalition support gained per unit of
//   capacityLoad) so the engine's capacity gate fills with the
//   highest-impact-per-load reforms first.
// - Events: pick the choice that maximises coalition-bloc support.
// - Surplus: 100% to debt paydown.
// =============================================================================
export const dominantCheese = {
  name: 'dominantCheese',
  initialBudget(_state) {
    return {
      taxIncomeHigh: 50,   // max in BudgetTab slider
      taxIncomeAdd: 60,    // max
      taxCorp: 35,         // max
      taxVAT: 15,          // min
      spendDefence: 35,    // min
    };
  },
  adjustBudget(_state) { return null; },
  proposeReforms(state, cohesion) {
    return rankByBangPerBuck(availableNonControversialReforms(state, cohesion));
  },
  resolveEvent(state, event) {
    return bestEventChoice(state, event);
  },
  allocateSurplus(_state, surplus) {
    return { debt: surplus, services: 0, taxCut: 0 };
  },
};

// =============================================================================
// doNothing — baseline. No budget changes, no reforms, first event choice,
// surplus folded into debt (the model does this automatically when under the
// threshold; for symmetry, route any large surplus there too).
// =============================================================================
export const doNothing = {
  name: 'doNothing',
  initialBudget(_state) { return null; },
  adjustBudget(_state) { return null; },
  proposeReforms(_state, _cohesion) { return []; },
  resolveEvent(_state, _event) { return 0; },
  allocateSurplus(_state, surplus) {
    return { debt: surplus, services: 0, taxCut: 0 };
  },
};

// =============================================================================
// hawkishCheese — cheese, but also queues amendBoeMandate and
// inflationTargetReview as soon as cohesion clears their passReq. Probes
// that the BoE-mandate reform path is reachable from a cheese baseline and
// that it doesn't accidentally rescue the exploit.
// =============================================================================
export const hawkishCheese = {
  name: 'hawkishCheese',
  initialBudget(_state) {
    return {
      taxIncomeHigh: 50, taxIncomeAdd: 60, taxCorp: 35, taxVAT: 15, spendDefence: 35,
    };
  },
  adjustBudget(_state) { return null; },
  proposeReforms(state, cohesion) {
    const proposals = rankByBangPerBuck(availableNonControversialReforms(state, cohesion));
    // Front-load the mandate / target reforms when reachable. They're
    // controversial and 'not in the available list' filter, so check directly.
    for (const id of ['amendBoeMandate', 'inflationTargetReview']) {
      const r = REFORMS[id];
      if (!r) continue;
      if (state.reforms[id]) continue;
      if (state.proposedReforms.includes(id)) continue;
      const passReq = v(r.passReq?.coalition) ?? 0;
      if (cohesion < passReq) continue;
      proposals.unshift(id);
    }
    return proposals;
  },
  resolveEvent(state, event) { return bestEventChoice(state, event); },
  allocateSurplus(_state, surplus) { return { debt: surplus, services: 0, taxCut: 0 }; },
};

// =============================================================================
// inflationDove — mostly does nothing but explicitly proposes
// inflationTargetReview to verify that raising the target shifts the
// long-run BoE rate path without catastrophic side-effects.
// =============================================================================
export const inflationDove = {
  name: 'inflationDove',
  initialBudget(_state) { return null; },
  adjustBudget(_state) { return null; },
  proposeReforms(state, cohesion) {
    const id = 'inflationTargetReview';
    const r = REFORMS[id];
    if (!r) return [];
    if (state.reforms[id]) return [];
    if (state.proposedReforms.includes(id)) return [];
    const passReq = v(r.passReq?.coalition) ?? 0;
    if (cohesion < passReq) return [];
    return [id];
  },
  resolveEvent(_state, _event) { return 0; },
  allocateSurplus(_state, surplus) { return { debt: surplus, services: 0, taxCut: 0 }; },
};

// =============================================================================
// supplySideBuilder — proactively builds the housing + energy supply chain.
//
// Sequences planningReform → housingSupplyTarget → energyMixReform (after
// greenInvest as prereq) and otherwise fills capacity with bang-per-buck
// reforms. Cheese doesn't touch these reforms, so this strategy ends with
// HPI capped and a damped energy market.
// =============================================================================
const SUPPLY_SIDE_PRIORITY = ['planningReform', 'greenInvest', 'housingSupplyTarget', 'energyMixReform'];

export const supplySideBuilder = {
  name: 'supplySideBuilder',
  initialBudget(_state) { return null; },
  adjustBudget(_state) { return null; },
  proposeReforms(state, cohesion) {
    const proposals = [];
    for (const id of SUPPLY_SIDE_PRIORITY) {
      const r = REFORMS[id];
      if (!r) continue;
      if (state.reforms[id]) continue;
      if (state.proposedReforms.includes(id)) continue;
      const prereqsOk = r.prereq.every(p => state.reforms[p]?.status === 'complete');
      if (!prereqsOk) continue;
      const passReq = v(r.passReq?.coalition) ?? 0;
      if (cohesion < passReq) continue;
      const pcCost = effectivePcCost(r, { ...state, coalitionCohesion: cohesion });
      if (pcCost > (state.politicalCapital ?? 100)) continue;
      proposals.push(id);
    }
    // Fill remaining capacity with bang-per-buck reforms.
    for (const id of rankByBangPerBuck(availableNonControversialReforms(state, cohesion))) {
      if (proposals.includes(id)) continue;
      proposals.push(id);
    }
    return proposals;
  },
  resolveEvent(state, event) { return bestEventChoice(state, event); },
  allocateSurplus(_state, surplus) { return { debt: surplus, services: 0, taxCut: 0 }; },
};

// =============================================================================
// cheesePlusFlex — dominantCheese plus labourFlexibility queued the moment
// it's reachable. Guards against the new reform rescuing the exploit by
// flattening the Phillips slope.
// =============================================================================
export const cheesePlusFlex = {
  name: 'cheesePlusFlex',
  initialBudget(_state) {
    return {
      taxIncomeHigh: 50, taxIncomeAdd: 60, taxCorp: 35, taxVAT: 15, spendDefence: 35,
    };
  },
  adjustBudget(_state) { return null; },
  proposeReforms(state, cohesion) {
    const proposals = rankByBangPerBuck(availableNonControversialReforms(state, cohesion));
    const id = 'labourFlexibility';
    const r = REFORMS[id];
    if (r && !state.reforms[id] && !state.proposedReforms.includes(id)) {
      const passReq = v(r.passReq?.coalition) ?? 0;
      if (cohesion >= passReq) proposals.unshift(id);
    }
    return proposals;
  },
  resolveEvent(state, event) { return bestEventChoice(state, event); },
  allocateSurplus(_state, surplus) { return { debt: surplus, services: 0, taxCut: 0 }; },
};

// =============================================================================
// dominantCheeseUltra — cheese variant that refuses every Phase 2/3 reform.
// Used to show that the supply-side + risk-premium pressure now bites cheese
// strategies even harder than baseline.
// =============================================================================
const PHASE_2_3_REFORMS = new Set([
  'housingSupplyTarget', 'energyMixReform', 'labourFlexibility',
  'pensionConsolidation', 'cityRegulation',
]);

export const dominantCheeseUltra = {
  name: 'dominantCheeseUltra',
  initialBudget(_state) {
    return {
      taxIncomeHigh: 50, taxIncomeAdd: 60, taxCorp: 35, taxVAT: 15, spendDefence: 35,
    };
  },
  adjustBudget(_state) { return null; },
  proposeReforms(state, cohesion) {
    return rankByBangPerBuck(availableNonControversialReforms(state, cohesion))
      .filter(id => !PHASE_2_3_REFORMS.has(id));
  },
  resolveEvent(state, event) { return bestEventChoice(state, event); },
  allocateSurplus(_state, surplus) { return { debt: surplus, services: 0, taxCut: 0 }; },
};

// =============================================================================
// OBR / HMRC scenario-benchmark strategies.
//
// These mirror the policy paths that real-world UK fiscal authorities have
// plotted in their published forecasts. Each strategy is paired with target
// outcomes in src/model/benchmarks.js; the obr-hmrc-scenarios spec asserts
// the mean across seeds lands within ±25% of the published figures. They
// give judgement-tier params (inflation persistence, forecast-noise bands,
// recession probabilities) a real-world calibration signal.
// =============================================================================

// Reforms that fall outside an OBR central "stated policy" projection — the
// chancellor doesn't enact them, so the strategy refuses to queue them.
const SUPPLY_SIDE_REFORMS = new Set([
  'planningReform', 'housingSupplyTarget', 'energyMixReform',
  'labourFlexibility', 'greenInvest', 'insulationScheme',
  'rail', 'digitalInfra', 'socialHousing', 'skillsBudget',
  'freeChildcare', 'uniReform',
]);

const HEALTH_WELFARE_REFORMS = new Set([
  'nhsPay', 'dilnotCap', 'socialCareSystemic', 'preventativeHealth',
  'mentalHealth', 'realLivingWage',
]);

// Pick the choice that *worsens* the coalition the most — used by the
// downside-supply-shock strategy to push the engine toward OBR's adverse
// fan, since we can't change macro assumptions directly under the
// strategy-only surface.
function worstEventChoice(state, event) {
  let worstIdx = 0;
  let worstScore = scoreEventChoice(state, event.choices[0]);
  for (let i = 1; i < event.choices.length; i++) {
    const s = scoreEventChoice(state, event.choices[i]);
    if (s.coalition < worstScore.coalition ||
        (s.coalition === worstScore.coalition && s.debt > worstScore.debt)) {
      worstIdx = i;
      worstScore = s;
    }
  }
  return worstIdx;
}

// =============================================================================
// obrCentralPath — replicates OBR Nov-2025 EFO "stated policy" projection.
// No tax changes, no spending shifts, no controversial reforms. Allows the
// non-controversial admin reforms (obrIndependence, hmrcCapacity) that the
// OBR baseline implicitly assumes, since these are stable institutional
// improvements rather than fiscal stance changes.
// =============================================================================
const OBR_CENTRAL_ALLOWED = new Set(['obrIndependence', 'hmrcCapacity']);

export const obrCentralPath = {
  name: 'obrCentralPath',
  initialBudget(_state) { return null; },
  adjustBudget(_state) { return null; },
  proposeReforms(state, cohesion) {
    return availableNonControversialReforms(state, cohesion)
      .filter(id => OBR_CENTRAL_ALLOWED.has(id));
  },
  resolveEvent(state, event) { return bestEventChoice(state, event); },
  allocateSurplus(_state, surplus) { return { debt: surplus, services: 0, taxCut: 0 }; },
};

// =============================================================================
// obrDownsideSupplyShock — replicates OBR Nov-2025 EFO downside scenario.
// Strategy declines every supply-side reform (no planning, housing, energy,
// labour, infra) and resolves events with the choice that most damages the
// coalition / aggravates fiscal stance. Drives the engine toward the OBR
// downside fan by producing a policy mix consistent with weak productivity.
// =============================================================================
export const obrDownsideSupplyShock = {
  name: 'obrDownsideSupplyShock',
  initialBudget(_state) { return null; },
  adjustBudget(_state) { return null; },
  proposeReforms(state, cohesion) {
    return availableNonControversialReforms(state, cohesion)
      .filter(id => !SUPPLY_SIDE_REFORMS.has(id));
  },
  resolveEvent(state, event) { return worstEventChoice(state, event); },
  allocateSurplus(_state, surplus) { return { debt: surplus, services: 0, taxCut: 0 }; },
};

// =============================================================================
// obrFrsLongRun — replicates OBR Fiscal Risks & Sustainability Report 2024
// adverse demographic scenario. Strategy declines all NHS / welfare /
// pension reform so demographic pressure compounds across the full 4-term
// horizon (20 years). Distinguishes itself from the central path by routing
// any fiscal surplus to services rather than debt paydown — the FRS
// scenario assumes governments respond to demographic pressure by topping
// up departmental spending, not by retiring debt.
// =============================================================================
const OBR_FRS_BLOCKED = new Set([
  ...HEALTH_WELFARE_REFORMS,
  'pensionConsolidation',
  ...SUPPLY_SIDE_REFORMS,
]);

export const obrFrsLongRun = {
  name: 'obrFrsLongRun',
  initialBudget(_state) { return null; },
  adjustBudget(_state) { return null; },
  proposeReforms(state, cohesion) {
    return availableNonControversialReforms(state, cohesion)
      .filter(id => !OBR_FRS_BLOCKED.has(id))
      .filter(id => OBR_CENTRAL_ALLOWED.has(id));
  },
  resolveEvent(state, event) { return bestEventChoice(state, event); },
  allocateSurplus(_state, surplus) { return { debt: 0, services: surplus, taxCut: 0 }; },
};

// =============================================================================
// hmrcFrozenThresholds — replicates HMRC's published fiscal-drag receipts
// path. Strategy holds every income-tax rate flat for the whole run and
// makes no spending changes, mirroring a chancellor who relies on inflation
// to lift effective tax burden via threshold drift. No supply-side reforms
// are enacted (those are separate fiscal events the path doesn't assume).
//
// In the current engine this strategy is observationally equivalent to
// obrCentralPath because the model has no separate threshold mechanic —
// rates are the only fiscal handle. The strategy is kept distinct so that
// when threshold mechanics are added later, only this strategy needs to
// pick them up. The shared output is documented behaviour, not a bug.
// =============================================================================
export const hmrcFrozenThresholds = {
  name: 'hmrcFrozenThresholds',
  initialBudget(_state) { return null; },
  adjustBudget(_state) { return null; },
  proposeReforms(state, cohesion) {
    return availableNonControversialReforms(state, cohesion)
      .filter(id => OBR_CENTRAL_ALLOWED.has(id));
  },
  resolveEvent(state, event) { return bestEventChoice(state, event); },
  allocateSurplus(_state, surplus) { return { debt: surplus, services: 0, taxCut: 0 }; },
};

// =============================================================================
// randomReforms — picks a random available non-controversial reform per
// quarter, random event choice. Uses Math.random which the harness seeds, so
// per-seed reproducible.
// =============================================================================
export const randomReforms = {
  name: 'randomReforms',
  initialBudget(_state) { return null; },
  adjustBudget(_state) { return null; },
  proposeReforms(state, cohesion) {
    const available = availableNonControversialReforms(state, cohesion);
    if (available.length === 0) return [];
    return [available[Math.floor(Math.random() * available.length)]];
  },
  resolveEvent(_state, event) {
    return Math.floor(Math.random() * event.choices.length);
  },
  allocateSurplus(_state, surplus) {
    return { debt: surplus, services: 0, taxCut: 0 };
  },
};
