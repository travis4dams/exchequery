// =============================================================================
// projectNextQuarter — single-step preview of the next quarter.
//
// Drives stepQuarter on a cloned state with Math.random pinned high so the
// rollEvents (engine.js) probability checks all fail — no event triggers in
// the projection. Equity sentiment noise and reform-outcome noise terms get
// pinned to +1 of their range; close enough to zero variance for a UI preview.
// Pure: does not mutate the input.
// =============================================================================

import { stepQuarter } from './gameStep.js';

export function projectNextQuarter(game) {
  const clone = structuredClone(game);
  const origRandom = Math.random;
  Math.random = () => 1;
  try {
    return stepQuarter(clone);
  } finally {
    Math.random = origRandom;
  }
}
