// Drift detector. Catches prose in README/AboutTab that disagrees with live
// PARAMS values, and catches event-effect leaves that have been added back
// without citations.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { PARAMS, EVENT_DEFINITIONS, CITATIONS } from '../../src/model/index.js';

const v = (leaf) => (leaf && typeof leaf === 'object' && 'value' in leaf) ? leaf.value : leaf;
const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const README = readFileSync(join(REPO_ROOT, 'README.md'), 'utf8');

function extractBlock(text, startMarker, endMarker) {
  const i = text.indexOf(startMarker);
  const j = text.indexOf(endMarker);
  if (i === -1 || j === -1) throw new Error(`Missing markers ${startMarker}/${endMarker}`);
  return text.slice(i + startMarker.length, j);
}

describe('README PARAMS-bound blocks reflect live values', () => {
  const howToPlay = extractBlock(README, '<!-- params:how-to-play:start -->', '<!-- params:how-to-play:end -->');

  it('renders the live initial deficit', () => {
    const deficit = v(PARAMS.initial.deficit);
    expect(howToPlay).toContain(`£${deficit}bn`);
  });

  it('renders the live debt-to-GDP ratio', () => {
    const debtPct = Math.round(v(PARAMS.initial.debt) / v(PARAMS.initial.gdp) * 100);
    expect(howToPlay).toContain(`${debtPct}% of GDP`);
  });

  it('renders the live coalition floor', () => {
    expect(howToPlay).toContain(`below ${v(PARAMS.coalitionFloor)}%`);
  });

  it('renders the live bond-yield ceiling', () => {
    expect(howToPlay).toContain(`above ${v(PARAMS.bondYieldCeiling)}%`);
  });

  it('renders the live term length', () => {
    expect(howToPlay).toContain(`Q${v(PARAMS.termLength)}`);
  });

  it('renders the live forecast-noise band', () => {
    const pct = Math.round(v(PARAMS.forecastNoise.base) * 100);
    expect(howToPlay).toContain(`±${pct}%`);
  });
});

describe('event effects are fully cited', () => {
  const NUMERIC_EFFECT_KEYS = ['debt', 'growth', 'inflation', 'healthIndex', 'bondYield'];
  for (const [eventId, def] of Object.entries(EVENT_DEFINITIONS)) {
    it(`${eventId}: every choice effect leaf is { value, citationId }`, () => {
      expect(def.citationId, `${eventId} missing event-level citationId`).toBeTruthy();
      expect(CITATIONS[def.citationId], `${eventId}.citationId='${def.citationId}' missing`).toBeTruthy();
      for (const [i, choice] of def.choices.entries()) {
        const eff = choice.effect;
        for (const key of NUMERIC_EFFECT_KEYS) {
          const leaf = eff[key];
          if (leaf == null) continue;
          expect(leaf, `${eventId} choice ${i} ${key} must be cited()`).toMatchObject({
            value: expect.any(Number),
            citationId: expect.any(String),
          });
          expect(CITATIONS[leaf.citationId], `${eventId} choice ${i} ${key} citation '${leaf.citationId}' missing`).toBeTruthy();
        }
        if (eff.blocs) {
          for (const [bloc, leaf] of Object.entries(eff.blocs)) {
            expect(leaf, `${eventId} choice ${i} blocs.${bloc} must be cited()`).toMatchObject({
              value: expect.any(Number),
              citationId: expect.any(String),
            });
            expect(CITATIONS[leaf.citationId], `${eventId} choice ${i} blocs.${bloc} citation '${leaf.citationId}' missing`).toBeTruthy();
          }
        }
      }
    });
  }
});

describe('legacy citations are not reintroduced', () => {
  it('event_payouts_judgement is no longer referenced', () => {
    expect(CITATIONS.event_payouts_judgement, 'delete event_payouts_judgement once migration is complete').toBeUndefined();
    for (const [eventId, def] of Object.entries(EVENT_DEFINITIONS)) {
      expect(def.citationId).not.toBe('event_payouts_judgement');
      for (const choice of def.choices) {
        for (const leaf of Object.values(choice.effect)) {
          if (leaf && typeof leaf === 'object' && 'citationId' in leaf) {
            expect(leaf.citationId).not.toBe('event_payouts_judgement');
          }
        }
        if (choice.effect.blocs) {
          for (const leaf of Object.values(choice.effect.blocs)) {
            expect(leaf.citationId).not.toBe('event_payouts_judgement');
          }
        }
      }
    }
  });
});
