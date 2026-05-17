// excludesComplete schema field — engine-side mutual-exclusion gate.

import { describe, it, expect } from 'vitest';
import {
  INITIAL_BLOC_SUPPORT,
  INITIAL_BLOC_WEIGHTS,
  REFORMS,
  PARAMS,
  makeInitialState,
  stepQuarter,
  getExclusionBlocker,
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

describe('getExclusionBlocker — single source of truth', () => {
  // The engine commit gate, the ReformsTab picker, and the playtest
  // strategies all route their excludesComplete check through this helper
  // so the three call sites cannot drift. Exercises the helper directly
  // so a refactor that changes its return shape breaks here, not in three
  // separate misbehaviours.
  it('returns null when no excludesComplete entry is complete', () => {
    const s = freshState();
    expect(getExclusionBlocker(REFORMS.openMigration, s)).toBeNull();
  });

  it('returns the blocker id when a listed reform is complete', () => {
    const s = freshState();
    s.reforms = {
      immigrationCap: {
        status: 'complete', startedQ: 1, completesQ: 1,
        reformDef: REFORMS.immigrationCap,
      },
    };
    expect(getExclusionBlocker(REFORMS.openMigration, s)).toBe('immigrationCap');
  });

  it('does not fire on in-progress reforms (only "complete" status blocks)', () => {
    const s = freshState();
    s.reforms = {
      immigrationCap: {
        status: 'inProgress', startedQ: 1, completesQ: 5,
        reformDef: REFORMS.immigrationCap,
      },
    };
    expect(getExclusionBlocker(REFORMS.openMigration, s)).toBeNull();
  });

  it('exclusion pairs are symmetric', () => {
    // For any reform A that excludes B on completion, B should exclude A.
    // Asymmetric pairs create order-dependent gates (whoever passes first
    // blocks the other, but not vice versa) — usually a config bug.
    const pairs = [];
    for (const [aid, a] of Object.entries(REFORMS)) {
      for (const bid of (a.excludesComplete || [])) {
        const b = REFORMS[bid];
        if (!b) continue;
        const reverse = (b.excludesComplete || []).includes(aid);
        if (!reverse) pairs.push(`${aid} excludes ${bid}, but ${bid} does not exclude ${aid}`);
      }
    }
    expect(pairs).toEqual([]);
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

  it('socialMediaBan completion does NOT affect births (channel retired May 2026)', () => {
    // The socialMediaBanBirthCoefQ births channel was retired per Finding 1
    // of the realism audit: Twenge/Haidt evidence supports a long-run cohort-
    // fertility hypothesis (10-15yr lag), not a current-quarter response.
    // The reform's other effects (healthBoost, bloc reactions) still fire;
    // only the births delta is gone.
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
    expect(withReform.births).toBeCloseTo(base.births, 6);
  });
});
