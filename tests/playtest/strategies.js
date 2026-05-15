// Pluggable player strategies for the headless playtest.
//
// Strategy contract:
//   initialBudget(state)               → patch  (applied once at quarter 1)
//   adjustBudget(state)                → patch | null  (called every quarter)
//   proposeReforms(state, cohesion)    → string[]  (reform ids; replaces proposedReforms)
//   resolveEvent(state, event)         → number  (choice index)
//   allocateSurplus(state, surplus)    → { debt, services, taxCut }

import { REFORMS, COALITION } from '../../src/model/index.js';

const v = (leaf) => (leaf && typeof leaf === 'object' && 'value' in leaf) ? leaf.value : leaf;

// Which non-controversial reforms can the player propose right now?
// Mirrors the gate in ReformCard.jsx: prereqs complete AND coalition >= passReq.
function availableNonControversialReforms(state, cohesion) {
  const out = [];
  for (const [id, r] of Object.entries(REFORMS)) {
    if (r.controversial) continue;
    if (state.reforms[id]) continue;                  // already started or done
    if (state.proposedReforms.includes(id)) continue; // already queued
    const prereqsOk = r.prereq.every(p => state.reforms[p]?.status === 'complete');
    if (!prereqsOk) continue;
    const passReq = v(r.passReq?.coalition) ?? 0;
    if (cohesion < passReq) continue;
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
      if (eff.blocs[id]) coalitionDelta += eff.blocs[id];
    }
  }
  return { coalition: coalitionDelta, debt: eff.debt || 0 };
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
