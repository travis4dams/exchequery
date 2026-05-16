// Convenience re-exports for the model layer.
export { CITATIONS, CONFIDENCE, getCitation, confidenceSummary } from './citations.js';
export { BENCHMARKS, BENCHMARK_TOLERANCE, unwrapTargets } from './benchmarks.js';
export { PARAMS, walkParams } from './params.js';
export { BLOCS, COALITION, INITIAL_BLOC_SUPPORT, INITIAL_BLOC_WEIGHTS } from './blocs.js';
export { REFORMS, REFORM_BRANCHES } from './reforms.js';
export { EVENT_DEFINITIONS, REFORM_RISK_MODS } from './events.js';
export { SOURCES } from './sources.js';
export {
  calcCoalitionCohesion,
  calcOverallApproval,
  calcRevenue,
  calcSpending,
  calcBalance,
  deficitPctGDP,
  quarterlyBlocDelta,
  applyPopulationDynamics,
  quarterlyPopulationGrowth,
  computeBirths,
  computeDeaths,
  computeNetMigration,
  computeRiskMods,
  projectReformOutcome,
  sampleReformOutcome,
  rollEvents,
  makeCommittedSnapshot,
  makeInitialState,
  reformCapacityLoad,
  calcReformCapacity,
  calcReformLoadInFlight,
  updateInflation,
  updateUnemployment,
  taylorRule,
  updateBankRate,
  bondYieldFromBankRate,
  updateMortgageRate,
  updateHousePriceIndex,
  updateEnergyPriceIndex,
  housingInflationContribution,
  energyInflationContribution,
  updateEquityIndex,
  updateRiskPremium,
  wealthEffectOnGrowth,
  deptSliderHooks,
  applyFiscalMultipliers,
  computePcRegen,
  computePmRelationshipDelta,
  clampPc,
  clampPmRelationship,
} from './engine.js';
export {
  CONSTITUENCIES,
  ELECTION_2024,
  PARTY_ANCHORS,
  PARTY_COLORS,
  SEAT_COUNT,
  SEAT_INDEX_BY_ID,
  WINNER_BY_IDX,
  updateSeatMoods,
  aggregateParliamentMood,
  seatOpposition,
  opposedMpCount,
  effectivePcCost,
  pcCostBreakdown,
  reformPmAlignment,
  topSeatsByMood,
  partySeatCounts,
} from './parliament.js';
export {
  stepQuarter,
  resolveEvent,
  dismissSummary,
  commitSurplusAllocation,
  continueAfterElection,
  cancelReform,
} from './gameStep.js';
export { projectNextQuarter } from './projection.js';
