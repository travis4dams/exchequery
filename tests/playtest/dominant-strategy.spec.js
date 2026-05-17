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
import { dominantCheese, doNothing, randomReforms, supplySideBuilder, cheesePlusFlex, dominantCheeseUltra } from './strategies.js';

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
  let cheeseStats, doNothingStats, randomStats, supplyStats, flexStats, ultraStats;

  // Six batches of TRIALS games each — bump the default 10s hook timeout.
  beforeAll(() => {
    cheeseStats = aggregate(runBatch(dominantCheese));
    doNothingStats = aggregate(runBatch(doNothing));
    randomStats = aggregate(runBatch(randomReforms));
    supplyStats = aggregate(runBatch(supplySideBuilder));
    flexStats = aggregate(runBatch(cheesePlusFlex));
    ultraStats = aggregate(runBatch(dominantCheeseUltra));
    // Single greppable JSON line per strategy.
    console.log('CHEESE_AGGREGATE ' + JSON.stringify(cheeseStats));
    console.log('DO_NOTHING_AGGREGATE ' + JSON.stringify(doNothingStats));
    console.log('RANDOM_AGGREGATE ' + JSON.stringify(randomStats));
    console.log('SUPPLY_AGGREGATE ' + JSON.stringify(supplyStats));
    console.log('FLEX_AGGREGATE ' + JSON.stringify(flexStats));
    console.log('ULTRA_AGGREGATE ' + JSON.stringify(ultraStats));
  }, 600_000);

  it('cheese is defeated — either collapses faster than do-nothing or ends with lower cohesion', () => {
    // Anti-exploit signal. Pre-audit: cheese drifted to lower cohesion over the
    // full 20-quarter term (survived ~100%) — the cohesion comparison worked.
    // Post-audit (May 2026): the deficit-yield kicker doubled (Fed IFDP 1011),
    // so cheese's huge structural deficits now blow bond yields past the 8%
    // markets-revolt ceiling within ~Q17, well before cohesion has time to
    // drift. Both failure modes count as "exploit defeated"; assert either.
    const survivedLess = cheeseStats.survivalRate < doNothingStats.survivalRate;
    const cohesionLower = cheeseStats.meanFinalCohesion < doNothingStats.meanFinalCohesion;
    expect(survivedLess || cohesionLower).toBe(true);
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

  it('cheesePlusFlex still defeated — flex does not rescue cheese (same dual signal)', () => {
    // Same anti-exploit framing as the cheese assertion above. Post-audit,
    // adding labourFlexibility to cheese does NOT save it from bond-market
    // collapse — yields still blow through 8% before cohesion has time to drift.
    const survivedLess = flexStats.survivalRate < doNothingStats.survivalRate;
    const cohesionLower = flexStats.meanFinalCohesion < doNothingStats.meanFinalCohesion;
    expect(survivedLess || cohesionLower).toBe(true);
  });

  it('cheesePlusFlex carries a higher risk premium than the do-nothing baseline', () => {
    // flex paths churn the coalition and trigger bond-market stress before
    // collapsing — the risk premium should reflect that volatility relative
    // to the calmest baseline (do-nothing). Note: the post-audit (May 2026)
    // playtest moved the comparator from supplySideBuilder to doNothing —
    // supply now runs the full 20 years and accumulates more volatility-
    // weighted risk premium than the early-collapsing flex paths, so the
    // old flex > supply ordering breaks for measurement-window reasons.
    // doNothing is the genuine stable comparator.
    expect(flexStats.meanFinalRiskPremium)
      .toBeGreaterThan(doNothingStats.meanFinalRiskPremium + 0.03);
  });

  it('cheese sees real recession risk — growth dips negative on at least one seed', () => {
    // The original complaint that motivated the growth-realism work: cheese
    // could ride a permanently-upward GDP curve. Mean reversion + Gaussian
    // noise + Laffer drag should mean growth visibly turns negative in at
    // least some cheese runs.
    expect(cheeseStats.minGrowthEver).toBeLessThan(0);
  });

  it('recession event fires under at least one strategy', () => {
    // Overheating-driven recession risk should produce visible event fires.
    // Random and supply paths run hot most reliably; cheese fires less often
    // because the VAT cut pushes inflation down rather than up.
    const anyRecession =
      cheeseStats.recessionFireRate
      + doNothingStats.recessionFireRate
      + randomStats.recessionFireRate
      + supplyStats.recessionFireRate;
    expect(anyRecession).toBeGreaterThan(0.10);
  });
});
