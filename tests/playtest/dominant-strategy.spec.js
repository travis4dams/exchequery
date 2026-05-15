// 100-game playtest of the known dominant strategy.
//
// On today's `main`, the dominant strategy survives essentially every game,
// confirming the exploit. The fix is being developed on another branch; when
// it lands, flip SURVIVAL_THRESHOLD and the comparison operator to assert the
// new (lower) win rate. See the comment block above SURVIVAL_THRESHOLD.

import { describe, it, expect } from 'vitest';
import { runGame, aggregate } from './runGame.js';
import { dominantCheese, doNothing, randomReforms } from './strategies.js';

const TRIALS = Number(process.env.PLAYTEST_SEEDS) || 100;
const MAX_TERMS = 4;
const BASE_SEED = 1000;

// === Bug-state threshold ====================================================
// TODAY: the cheese strategy wins ~100% of games. This assertion passes on
// the current `main` and demonstrates the exploit exists.
//
// AFTER THE FIX LANDS: flip this single comment-marked line to something like
//     const SURVIVAL_THRESHOLD = 0.30;
// and change `toBeGreaterThan` → `toBeLessThan` in the spec below. CI will
// then assert that the exploit no longer dominates.
const SURVIVAL_THRESHOLD = 0.90;
// ===========================================================================

function runBatch(strategy) {
  const results = [];
  for (let i = 0; i < TRIALS; i++) {
    results.push(runGame({ strategy, seed: BASE_SEED + i, maxTerms: MAX_TERMS }));
  }
  return results;
}

describe(`dominant-strategy playtest (${TRIALS} games)`, () => {
  it('cheese strategy currently wins ≥90% of games', () => {
    const results = runBatch(dominantCheese);
    const stats = aggregate(results);
    // Emit a single JSON line so CI logs are greppable.
    console.log('CHEESE_AGGREGATE ' + JSON.stringify(stats));
    expect(stats.survivalRate).toBeGreaterThan(SURVIVAL_THRESHOLD);
  });

  it('baseline: do-nothing strategy stats', () => {
    const results = runBatch(doNothing);
    const stats = aggregate(results);
    console.log('DO_NOTHING_AGGREGATE ' + JSON.stringify(stats));
    // No hard assertion — this is a contrast baseline. We just check the
    // harness didn't crash and produced results for every trial.
    expect(results.length).toBe(TRIALS);
  });

  it('baseline: random-reforms strategy stats', () => {
    const results = runBatch(randomReforms);
    const stats = aggregate(results);
    console.log('RANDOM_AGGREGATE ' + JSON.stringify(stats));
    expect(results.length).toBe(TRIALS);
  });
});
