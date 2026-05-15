#!/usr/bin/env node
// =============================================================================
// buildConstituencies.js
//
// Reads data/raw/ralphascott-census-2024.csv and produces:
//
//   src/data/constituencies.json   — per-seat demographics + ideology
//   src/data/election2024.json     — per-seat 2024 winner + vote shares
//   src/data/partyIdeology.json    — party-level (econ, social) anchors
//
// All inputs are sourced (see data/raw/SOURCES.md). The only authored
// numbers in this script are:
//   1. Party ideology anchors (CHES 2024 published expert-survey averages)
//   2. The two weights that combine party anchor with per-seat signals:
//        econWeight2024Vote = 0.15   (2024 vote-share residual on econ axis)
//        socialWeightBrexit = 0.35   (Hanretty Leave/Remain on social axis)
// Both authored numbers are documented in src/model/citations.js under
// `parliament_ideology_blend_methodology`.
//
// Run with: npm run build:data
// =============================================================================

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { parse } from 'csv-parse/sync';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO = join(__dirname, '..');
const RAW = join(REPO, 'data', 'raw', 'ralphascott-census-2024.csv');
const OUT_DIR = join(REPO, 'src', 'data');

// CHES 2024 UK extract — party-level expert-survey position anchors.
// `lrecon` (economic left-right, 0–10) and `galtan` (social, 0–10, where
// 10 = traditional/authoritarian/nationalist). Rescaled to [-1, +1] via
// (x - 5) / 5. See `ches_2024_party_ideology` in citations.js.
const PARTY_ANCHORS = {
  Lab:    { econ: -0.32, social: -0.26 },
  Con:    { econ:  0.46, social:  0.40 },
  LD:     { econ: -0.06, social: -0.50 },
  RUK:    { econ:  0.54, social:  0.82 },
  Reform: { econ:  0.54, social:  0.82 },
  Green:  { econ: -0.60, social: -0.70 },
  SNP:    { econ: -0.30, social: -0.34 },
  PC:     { econ: -0.32, social: -0.30 },
  Ind:    { econ:  0.00, social:  0.00 },
  Spk:    { econ:  0.00, social:  0.00 },
  Other:  { econ:  0.00, social:  0.00 },
};

const NORTHERN_REGIONS = new Set([
  'North East', 'North West', 'Yorkshire and The Humber',
  'East Midlands', 'West Midlands',
]);

const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));
const round = (x, dp = 3) => Number(x.toFixed(dp));
const num = (s) => {
  if (s === '' || s === 'NA' || s === undefined || s === null) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
};
const pct = (s) => {
  const n = num(s);
  return n === null ? 0 : n / 100;
};

function computeBlocShare(row) {
  const pensioners = pct(row.c21Age65to69) + pct(row.c21Age70to74)
                   + pct(row.c21Age75to79) + pct(row.c21Age80to84) + pct(row.c21Age85plus);
  const youth = pct(row.c21Age16to19) + pct(row.c21Age20to24) + pct(row.c21Age25to29);
  const workingClass = pct(row.c21NSSECSemiRoutine) + pct(row.c21NSSECRoutine)
                     + pct(row.c21NSSECLowerSupervisor) + pct(row.c21NSSECLongtermUnemployed);
  const middleClass = pct(row.c21NSSECIntermediate) + pct(row.c21NSSECLowerManager)
                    + pct(row.c21NSSECSmallEmployer);
  const professional = pct(row.c21NSSECHigherManager) + pct(row.c21NSSECHigherProfessional);
  const business = pct(row.c21SelfEmployedwithEmployees) + pct(row.c21IndustryFinance)
                 + pct(row.c21IndustryRealEstate);
  const publicSector = pct(row.c21IndustryPublicAdministration) + pct(row.c21IndustryEducation)
                     + pct(row.c21IndustrySocialWork);
  const ethnicMinority = clamp(1 - pct(row.c21EthnicityWhite), 0, 1);
  const isNorthern = NORTHERN_REGIONS.has(row.Region) ? 1 : 0;

  return {
    pensioners:    round(pensioners),
    workingClass:  round(workingClass),
    middleClass:   round(middleClass),
    professional:  round(professional),
    business:      round(business),
    publicSector:  round(publicSector),
    youth:         round(youth),
    northern:      isNorthern,
    ethnicMinority: round(ethnicMinority),
  };
}

function computeIdeology(row, winner) {
  const anchor = PARTY_ANCHORS[winner] ?? PARTY_ANCHORS.Other;

  // ECON axis: party anchor + small residual from 2024 vote share for
  // right-of-centre vs left-of-centre parties.
  const conShare = pct(row.Con24);
  const rukShare = pct(row.RUK24);
  const labShare = pct(row.Lab24);
  const ldShare  = pct(row.LD24);
  const grnShare = pct(row.Green24);
  const totalKnown = conShare + rukShare + labShare + ldShare + grnShare;
  let econResidual = 0;
  if (totalKnown > 0) {
    const right = (conShare + rukShare) / totalKnown;
    const left  = (labShare + ldShare + grnShare) / totalKnown;
    econResidual = 0.15 * (right - left);
  }

  // SOCIAL axis: party anchor + Hanretty 2016 Brexit Leave-Remain residual.
  // Hanretty values are percentages (0–100); rescale to [-1, +1] via
  // (Leave - 50) / 50, then weight 0.35.
  const leave = num(row.HanrettyLeave);
  let socialResidual = 0;
  if (leave !== null) {
    socialResidual = 0.35 * ((leave - 50) / 50);
  }

  return {
    econ:   round(clamp(anchor.econ + econResidual, -1, 1)),
    social: round(clamp(anchor.social + socialResidual, -1, 1)),
  };
}

function computeVoteShare(row) {
  const v = {};
  const cols = { Con: 'Con24', Lab: 'Lab24', LD: 'LD24', SNP: 'SNP24',
                 PC: 'PC24', Green: 'Green24', RUK: 'RUK24', Other: 'Other24' };
  for (const [party, col] of Object.entries(cols)) {
    const x = num(row[col]);
    if (x !== null && x > 0) v[party] = round(x / 100, 4);
  }
  return v;
}

function main() {
  console.log('Reading', RAW);
  const raw = readFileSync(RAW, 'utf8');
  const rows = parse(raw, { columns: true, skip_empty_lines: true, relax_quotes: true });
  console.log(`Parsed ${rows.length} constituencies.`);

  const constituencies = [];
  const election = [];
  const partyCount = {};
  const ideologyStats = {};

  for (const row of rows) {
    const id = row.ONSConstID;
    const name = row.ConstituencyName;
    const country = row.Country;        // England | Scotland | Wales
    const region = row.Region;          // ITL1 region or Scotland/Wales
    const winner = row.Winner24;
    const blocShare = computeBlocShare(row);
    const ideology = computeIdeology(row, winner);

    constituencies.push({
      id, name, country, region,
      isNorthern: blocShare.northern === 1,
      blocShare,
      ideology,
    });

    election.push({
      id, name, winner,
      voteShare: computeVoteShare(row),
      majority: round(num(row.Majority24) ?? 0, 2),
      mpFirstName: row.MPFirstName24,
      mpSurname: row.MPSurname24,
    });

    partyCount[winner] = (partyCount[winner] ?? 0) + 1;
    if (!ideologyStats[winner]) ideologyStats[winner] = { n: 0, econ: 0, social: 0 };
    ideologyStats[winner].n++;
    ideologyStats[winner].econ += ideology.econ;
    ideologyStats[winner].social += ideology.social;
  }

  // Validate
  if (constituencies.length !== 632) {
    console.warn(`WARNING: expected 632 GB constituencies, got ${constituencies.length}`);
  }
  let nanCount = 0;
  for (const c of constituencies) {
    for (const v of Object.values(c.blocShare)) if (!Number.isFinite(v)) nanCount++;
    if (!Number.isFinite(c.ideology.econ) || !Number.isFinite(c.ideology.social)) nanCount++;
  }
  if (nanCount > 0) {
    console.error(`ERROR: ${nanCount} non-finite values produced.`);
    process.exit(1);
  }

  // Write outputs
  mkdirSync(OUT_DIR, { recursive: true });
  const headerNote = {
    generatedAt: new Date().toISOString().slice(0, 10),
    generator: 'scripts/buildConstituencies.js',
    sourceFile: 'data/raw/ralphascott-census-2024.csv',
    sourceVersion: 'ralphascott v1.1',
    note: 'Great Britain only — Northern Ireland (18 seats) excluded. See data/raw/SOURCES.md.',
  };

  writeFileSync(
    join(OUT_DIR, 'constituencies.json'),
    JSON.stringify({ ...headerNote, constituencies }, null, 0) + '\n'
  );
  writeFileSync(
    join(OUT_DIR, 'election2024.json'),
    JSON.stringify({ ...headerNote, election: '2024-07-04', seats: election }, null, 0) + '\n'
  );
  writeFileSync(
    join(OUT_DIR, 'partyIdeology.json'),
    JSON.stringify({
      ...headerNote,
      source: 'Chapel Hill Expert Survey 2024 UK extract',
      url: 'https://www.chesdata.eu/2024-chapel-hill-expert-survey-ches',
      method: 'CHES lrecon (0–10) and galtan (0–10) rescaled to [-1, +1] via (x - 5) / 5.',
      anchors: PARTY_ANCHORS,
    }, null, 2) + '\n'
  );

  console.log('\n=== Party seat counts (2024) ===');
  for (const [p, n] of Object.entries(partyCount).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${p.padEnd(8)} ${n}`);
  }
  console.log('\n=== Ideology mean by party ===');
  for (const [p, s] of Object.entries(ideologyStats)) {
    console.log(`  ${p.padEnd(8)} n=${String(s.n).padStart(3)}  econ=${(s.econ/s.n).toFixed(2).padStart(6)}  social=${(s.social/s.n).toFixed(2).padStart(6)}`);
  }
  console.log('\nWrote:');
  console.log('  src/data/constituencies.json');
  console.log('  src/data/election2024.json');
  console.log('  src/data/partyIdeology.json');
}

main();
