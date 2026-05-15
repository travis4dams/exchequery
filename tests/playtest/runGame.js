// Headless game driver — drives the SAME model functions the UI uses.
// No duplication of orchestration. Each step here calls into src/model/gameStep.js.

import {
  INITIAL_BLOC_SUPPORT,
  INITIAL_BLOC_WEIGHTS,
  makeInitialState,
  calcCoalitionCohesion,
  stepQuarter,
  resolveEvent,
  dismissSummary,
  commitSurplusAllocation,
  continueAfterElection,
} from '../../src/model/index.js';
import { withSeededRandom } from './rng.js';

// Hard safety cap to prevent any test bug from spinning forever.
const HARD_QUARTER_CAP = 200;

function snapshot(g) {
  return {
    globalQuarter: g.globalQuarter,
    quarter: g.quarter,
    term: g.term,
    termsWon: g.termsWon,
    status: g.status,
    cohesion: calcCoalitionCohesion(g.blocSupport, g.blocWeights),
    bondYield: g.bondYield,
    debt: g.debt,
    debtToGDP: g.debt / g.gdp * 100,
    completedReforms: Object.values(g.reforms).filter(r => r.status === 'complete').length,
    inflation: g.inflation,
    unemployment: g.unemployment,
    bankRate: g.bankRate,
  };
}

export function runGame({ strategy, seed, maxTerms = 4 }) {
  return withSeededRandom(seed, () => {
    let g = makeInitialState({
      initialBlocSupport: { ...INITIAL_BLOC_SUPPORT },
      initialBlocWeights: { ...INITIAL_BLOC_WEIGHTS },
    });

    // 1. Apply initial budget once.
    const initial = strategy.initialBudget(g);
    if (initial) g = { ...g, ...initial };

    const history = [];
    let triggeredEventCount = 0;
    let safety = 0;

    while (safety++ < HARD_QUARTER_CAP) {
      // a. Queue proposed reforms for the quarter.
      const cohesion = calcCoalitionCohesion(g.blocSupport, g.blocWeights);
      const proposals = strategy.proposeReforms(g, cohesion);
      g = { ...g, proposedReforms: proposals };

      // b. Mid-term budget tweak (optional).
      const patch = strategy.adjustBudget(g);
      if (patch) g = { ...g, ...patch };

      // c. The same step the UI runs.
      g = stepQuarter(g);

      // d. Resolve a pending event if one fired.
      if (g.pendingEvent) {
        triggeredEventCount += 1;
        const event = g.pendingEvent;
        const idx = strategy.resolveEvent(g, event);
        const choice = event.choices[Math.max(0, Math.min(event.choices.length - 1, idx))];
        g = resolveEvent(g, choice);
      }

      // e. Dismiss summary + maybe allocate surplus.
      if (g.pendingSummary) {
        const { state, needsSurplusAllocation } = dismissSummary(g);
        g = state;
        if (needsSurplusAllocation) {
          const surplus = g.pendingSurplus;
          const alloc = strategy.allocateSurplus(g, surplus);
          g = commitSurplusAllocation(g, alloc);
        }
      }

      history.push(snapshot(g));

      // f. Terminal-state branching.
      if (g.status === 'election') {
        if (g.termsWon + 1 >= maxTerms) {
          // Won enough terms — treat as a successful endgame.
          break;
        }
        g = continueAfterElection(g);
        continue;
      }
      if (g.status !== 'playing') break;
    }

    return {
      status: g.status,
      termsWon: g.termsWon,
      term: g.term,
      finalQuarter: g.quarter,
      totalQuarters: g.globalQuarter,
      finalCohesion: calcCoalitionCohesion(g.blocSupport, g.blocWeights),
      finalDebt: g.debt,
      finalDebtToGDP: g.debt / g.gdp * 100,
      finalBondYield: g.bondYield,
      finalGini: g.gini,
      finalHealth: g.healthIndex,
      finalInflation: g.inflation,
      finalUnemployment: g.unemployment,
      finalBankRate: g.bankRate,
      completedReforms: Object.values(g.reforms).filter(r => r.status === 'complete').length,
      triggeredEventCount,
      history,
    };
  });
}

// Aggregate stats helper for spec output.
export function aggregate(results) {
  const n = results.length;
  if (n === 0) return { n: 0 };
  const mean = (sel) => results.reduce((s, r) => s + sel(r), 0) / n;
  const statusCounts = {};
  for (const r of results) statusCounts[r.status] = (statusCounts[r.status] || 0) + 1;

  return {
    n,
    survivalRate: results.filter(r => r.termsWon >= 1).length / n,
    statusMix: statusCounts,
    meanTermsWon: mean(r => r.termsWon),
    meanTotalQuarters: mean(r => r.totalQuarters),
    meanFinalCohesion: mean(r => r.finalCohesion),
    meanFinalDebtToGDP: mean(r => r.finalDebtToGDP),
    meanFinalBondYield: mean(r => r.finalBondYield),
    meanFinalInflation: mean(r => r.finalInflation),
    meanFinalUnemployment: mean(r => r.finalUnemployment),
    meanFinalBankRate: mean(r => r.finalBankRate),
    meanCompletedReforms: mean(r => r.completedReforms),
    meanEventsTriggered: mean(r => r.triggeredEventCount),
  };
}
