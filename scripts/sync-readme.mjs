#!/usr/bin/env node
// Regenerate the README's PARAMS-derived block from live values.
//
// Usage:
//   node scripts/sync-readme.mjs          rewrite README in place
//   node scripts/sync-readme.mjs --check  fail (exit 1) if README is out of date
//
// The block is delimited by the markers below. Any content between the markers
// is replaced. Anything outside the markers is left alone.

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { PARAMS, confidenceSummary } from '../src/model/index.js';

const v = (leaf) => (leaf && typeof leaf === 'object' && 'value' in leaf) ? leaf.value : leaf;

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const README_PATH = join(REPO_ROOT, 'README.md');

const HOW_TO_PLAY_START = '<!-- params:how-to-play:start -->';
const HOW_TO_PLAY_END = '<!-- params:how-to-play:end -->';
const ARCH_START = '<!-- params:architecture:start -->';
const ARCH_END = '<!-- params:architecture:end -->';

const deficit = v(PARAMS.initial.deficit);
const debt = v(PARAMS.initial.debt);
const gdp = v(PARAMS.initial.gdp);
const deficitPct = (deficit / gdp * 100).toFixed(1);
const debtPct = Math.round(debt / gdp * 100);
const termQuarters = v(PARAMS.termLength);
const termYears = termQuarters / 4;
const coalitionFloor = v(PARAMS.coalitionFloor);
const bondCeiling = v(PARAMS.bondYieldCeiling);
const forecastNoise = Math.round(v(PARAMS.forecastNoise.bandFallback) * 100);
const obrMultiplier = v(PARAMS.forecastNoise.obrMultiplier);
const obrShrinkPct = Math.round((1 - obrMultiplier) * 100);

const summary = confidenceSummary();
const totalEntries = summary.total;
const sourcedPct = Math.round(summary.pct.sourced * 100);
const extrapolatedPct = Math.round(summary.pct.extrapolated * 100);
const judgementPct = Math.round(summary.pct.judgement * 100);

const howToPlayBlock = [
  HOW_TO_PLAY_START,
  '',
  `You inherit the UK in Q1 2026 with a deficit of roughly £${deficit}bn (${deficitPct}% of GDP) and debt at ${debtPct}% of GDP. Each quarter:`,
  '',
  '1. **Adjust budget levers** — income tax bands, corporation tax, VAT, and departmental spending.',
  `2. **Propose reforms** — multi-quarter projects with upfront costs, prerequisites, and per-field forecast bands (cited; ±${forecastNoise}% fallback where not yet authored). Pass OBR Independence to narrow every band by ${obrShrinkPct}%.`,
  '3. **Watch the risk register** — events roll quarterly with probabilities modified by your policy choices.',
  '4. **Advance the quarter** — see what changed, allocate any surplus, handle whatever the country throws at you.',
  '',
  `Three ways to win, three ways to lose. Coalition cohesion below ${coalitionFloor}% — government falls. Bond yields above ${bondCeiling}% — markets revolt. Lose the election at Q${termQuarters} — opposition takes power.`,
  '',
  HOW_TO_PLAY_END,
].join('\n');

const archBlock = [
  ARCH_START,
  '',
  `The About tab's *Confidence summary* shows the live percentage breakdown`,
  `across all parameter-level citations (currently ${totalEntries} entries: ~${sourcedPct}% sourced,`,
  `~${extrapolatedPct}% extrapolated, ~${judgementPct}% judgement). Borderline classification decisions and`,
  `their reasoning are recorded in \`CLASSIFICATION_LOG.md\` at repo root.`,
  '',
  ARCH_END,
].join('\n');

const methodologyBlock = [
  `Reform and event effects carry per-field forecast bands declared on each cited() call (triangular distribution, mode at the central value, asymmetric bands allowed). Passing "Strengthen OBR Independence" scales every band's width by ${obrMultiplier}. Until every leaf is authored, a symmetric ±${forecastNoise}% fallback applies.`,
];

function replaceBlock(text, startMarker, endMarker, replacement) {
  const startIdx = text.indexOf(startMarker);
  const endIdx = text.indexOf(endMarker);
  if (startIdx === -1 || endIdx === -1) {
    throw new Error(`Missing markers ${startMarker} / ${endMarker} in README`);
  }
  const before = text.slice(0, startIdx);
  const after = text.slice(endIdx + endMarker.length);
  return before + replacement + after;
}

const original = readFileSync(README_PATH, 'utf8');
let updated = replaceBlock(original, HOW_TO_PLAY_START, HOW_TO_PLAY_END, howToPlayBlock);
updated = replaceBlock(updated, ARCH_START, ARCH_END, archBlock);

const isCheck = process.argv.includes('--check');
if (updated === original) {
  if (isCheck) process.stdout.write('README is up to date\n');
  process.exit(0);
}

if (isCheck) {
  process.stderr.write('README is out of date — run `npm run sync-docs` and commit.\n');
  process.exit(1);
}

writeFileSync(README_PATH, updated);
process.stdout.write(`Updated ${README_PATH}\n`);
