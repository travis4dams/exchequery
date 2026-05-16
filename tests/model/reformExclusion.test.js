// excludesComplete schema field — engine-side mutual-exclusion gate.

import { describe, it, expect } from 'vitest';
import {
  INITIAL_BLOC_SUPPORT,
  INITIAL_BLOC_WEIGHTS,
  REFORMS,
  PARAMS,
  makeInitialState,
  stepQuarter,
} from '../../src/model/index.js';
import { withSeededRandom } from '../playtest/rng.js';

function freshState() {
  return makeInitialState({
    initialBlocSupport: { ...INITIAL_BLOC_SUPPORT },
    initialBlocWeights: { ...INITIAL_BLOC_WEIGHTS },
  });
}

describe('excludesComplete schema field exists on the new mutually-exclusive reforms', () => {
  it('immigrationCap excludes the open-migration track', () => {
    expect(REFORMS.immigrationCap.excludesComplete).toContain('openMigration');
    expect(REFORMS.immigrationCap.excludesComplete).toContain('integrationReform');
  });

  it('openMigration excludes immigrationCap and refugeeRestrict', () => {
    expect(REFORMS.openMigration.excludesComplete).toContain('immigrationCap');
    expect(REFORMS.openMigration.excludesComplete).toContain('refugeeRestrict');
  });

  it('integrationReform excludes the restriction track', () => {
    expect(REFORMS.integrationReform.excludesComplete).toContain('immigrationCap');
    expect(REFORMS.integrationReform.excludesComplete).toContain('refugeeRestrict');
  });
});

describe('engine commit-loop gate', () => {
  it('discards a proposal whose excludesComplete list names a completed reform', () => {
    let s = freshState();
    // Force-complete immigrationCap, then propose openMigration.
    s.reforms = {
      immigrationCap: {
        status: 'complete',
        startedQ: 1,
        completesQ: 1,
        reformDef: REFORMS.immigrationCap,
      },
    };
    s.proposedReforms = ['openMigration'];
    s.politicalCapital = 80;  // plenty of PC to rule out the PC gate

    const before = s.reforms.openMigration;
    s = withSeededRandom(99, () => stepQuarter(s));

    // openMigration must NOT have started (no inProgress entry, no upfront
    // cost added) and the log records the exclusion.
    expect(s.reforms.openMigration?.status).toBeUndefined();
    expect(s.proposedReforms).not.toContain('openMigration');  // discarded, not deferred
    const lastLogs = s.log.slice(-3).map((entry) => entry.text);
    expect(lastLogs.some((t) => /Blocked.*Cap Net Migration/.test(t))).toBe(true);
  });

  it('lets a reform through when no excludesComplete entry is complete', () => {
    let s = freshState();
    s.proposedReforms = ['integrationReform'];
    s.politicalCapital = 80;
    s = withSeededRandom(11, () => stepQuarter(s));
    expect(s.reforms.integrationReform?.status).toBe('inProgress');
  });
});

describe('new reforms feed the population channels', () => {
  it('openMigration completion raises net migration', () => {
    let base = freshState();
    let withReform = freshState();
    withReform.reforms = {
      openMigration: {
        status: 'complete',
        startedQ: 1,
        completesQ: 1,
        reformDef: REFORMS.openMigration,
      },
    };
    base = withSeededRandom(1, () => stepQuarter(base));
    withReform = withSeededRandom(1, () => stepQuarter(withReform));
    expect(withReform.netMigration).toBeGreaterThan(base.netMigration + 50);
  });

  it('socialMediaBan completion raises births by the calibrated coef', () => {
    let base = freshState();
    let withReform = freshState();
    withReform.reforms = {
      socialMediaBan: {
        status: 'complete',
        startedQ: 1,
        completesQ: 1,
        reformDef: REFORMS.socialMediaBan,
      },
    };
    base = withSeededRandom(2, () => stepQuarter(base));
    withReform = withSeededRandom(2, () => stepQuarter(withReform));
    expect(withReform.births).toBeGreaterThan(base.births + 1);
  });
});
