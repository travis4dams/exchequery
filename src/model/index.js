// Convenience re-exports for the model layer.
export { CITATIONS, CONFIDENCE, getCitation, confidenceSummary } from './citations.js';
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
  computeRiskMods,
  projectReformOutcome,
  sampleReformOutcome,
  rollEvents,
  makeCommittedSnapshot,
  makeInitialState,
  reformCapacityLoad,
  calcReformCapacity,
  calcReformLoadInFlight,
} from './engine.js';
export {
  stepQuarter,
  resolveEvent,
  dismissSummary,
  commitSurplusAllocation,
  continueAfterElection,
  cancelReform,
} from './gameStep.js';
