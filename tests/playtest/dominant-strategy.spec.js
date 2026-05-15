// 100-game playtest of the known dominant strategy.
//
// HISTORY: On the pre-Phase-1 model, the cheese strategy survived ~100% of
// games and ended with stronger coalition cohesion than do-nothing. That was
// the "exploit": maxing top tax rates, slashing VAT, and slashing defence
// gave the player a free dominant coalition with no downside.
//
// PHASE 1 (BoE + Phillips/Okun + cost-of-living bloc damage) closes the
// exploit. Cheese now drives inflation up via the VAT cut, the BoE hikes
// rates in response, real incomes erode, and the same coalition that loved
// the VAT cut starts to punish the government for inflation. Bond yields
// rise alongside Bank Rate, so debt service is no longer a free lunch.
//
// What we assert post-fix:
//   - cheese.meanFinalCohesion < doNothing.meanFinalCohesion
//     (cheese must no longer be a strictly better strategy than doing
//     nothing — the exploit is dead). This is the primary guarantee.
//
// We deliberately do NOT assert cheese.meanTermsWon <= doNothing.meanTermsWon:
// after the Parliament + Political Capital feature landed, doing nothing
// damages the player too (PM relationship erodes when no reforms ship), so a
// Chancellor who pushes reforms with weak public approval can outlast the
// pure-inert baseline on time-in-office even while losing the public-opinion
// race. The cohesion comparison is the anti-exploit signal that matters.
//
// The looser SURVIVAL_THRESHOLD < 0.50 first-term-failure target from the
// original plan is documented but NOT asserted: with persistence-0.85
// inflation dynamics, the first term ends before damage compounds, so the
// term-1 honeymoon protects cheese from outright collapse.

import { describe, it, expect, beforeAll } from 'vitest';
import { runGame, aggregate } from './runGame.js';
import { dominantCheese, doNothing, randomReforms, supplySideBuilder, cheesePlusFlex } from './strategies.js';

const TRIALS = Number(process.env.PLAYTEST_SEEDS) || 100;
const MAX_TERMS = 4;
const BASE_SEED = 1000;

function runBatch(strategy) {
  const results = [];
  for (let i = 0; i < TRIALS; i++) {
    results.push(runGame({ strategy, seed: BASE_SEED + i, maxTerms: MAX_TERMS }));
  }
  return results;
}

describe(`dominant-strategy playtest (${TRIALS} games)`, () => {
  let cheeseStats, doNothingStats, randomStats, supplyStats, flexStats;

  // Five batches of TRIALS games each — bump the default 10s hook timeout.
  beforeAll(() => {
    cheeseStats = aggregate(runBatch(dominantCheese));
    doNothingStats = aggregate(runBatch(doNothing));
    randomStats = aggregate(runBatch(randomReforms));
    supplyStats = aggregate(runBatch(supplySideBuilder));
    flexStats = aggregate(runBatch(cheesePlusFlex));
    // Single greppable JSON line per strategy.
    console.log('CHEESE_AGGREGATE ' + JSON.stringify(cheeseStats));
    console.log('DO_NOTHING_AGGREGATE ' + JSON.stringify(doNothingStats));
    console.log('RANDOM_AGGREGATE ' + JSON.stringify(randomStats));
    console.log('SUPPLY_AGGREGATE ' + JSON.stringify(supplyStats));
    console.log('FLEX_AGGREGATE ' + JSON.stringify(flexStats));
  }, 600_000);

  it('cheese ends with lower cohesion than do-nothing (exploit defeated)', () => {
    expect(cheeseStats.meanFinalCohesion).toBeLessThan(doNothingStats.meanFinalCohesion);
  });

  it('do-nothing baseline produces results for every trial', () => {
    expect(doNothingStats.n).toBe(TRIALS);
  });

  it('random-reforms baseline produces results for every trial', () => {
    expect(randomStats.n).toBe(TRIALS);
  });

  it('supplySideBuilder pulls HPI meaningfully below the do-nothing baseline', () => {
    // The housing supply target is the only lever in the game that adds 60k
    // pa of net supply. Under do-nothing HPI hovers near baseline (~100). A
    // strategy that runs planningReform → housingSupplyTarget must visibly
    // shift HPI south of that. (Cheese drives HPI down through a different
    // channel — high real rates + weak nominal growth — so cheese-vs-supply
    // is not the right comparison for "the supply lever works".)
    expect(supplyStats.meanFinalHousePriceIndex).toBeLessThan(doNothingStats.meanFinalHousePriceIndex - 3);
  });

  it('cheesePlusFlex still ends below do-nothing on cohesion (flex does not rescue cheese)', () => {
    expect(flexStats.meanFinalCohesion).toBeLessThan(doNothingStats.meanFinalCohesion);
  });
});
