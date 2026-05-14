import React, { useState, useEffect, useMemo } from 'react';
import { Crown, ChevronRight, RotateCcw, Info, AlertTriangle, CheckCircle2, Receipt, Banknote, Hammer, FileText, Users, Calendar, Lock, X, Clock, Undo2, ArrowRight, Eye, AlertCircle, TrendingUp, BookOpen, ExternalLink } from 'lucide-react';

// =============================================================================
// CHANCELLOR v5 — UK Fiscal Simulation
//
// HOW TO ADD A CUSTOM REFORM:
// Add an object to REFORMS below. Schema:
//   id: { 
//     name: string,                  // Display name
//     branch: string,                // One of: revenue, nhs, housing, green, education, labour, state
//     cost: number,                  // Upfront cost in £bn (paid on commit)
//     quarters: number,              // Time to complete
//     prereq: string[],              // Array of reform IDs that must be COMPLETE first
//     passReq: { coalition: number }, // Min coalition cohesion to propose
//     blurb: string,                 // Short description
//     source: string,                // Evidence citation (shown in inspect)
//     controversial?: boolean,       // Marks as contested policy (subtle ⚠ icon)
//     onComplete: {                  // Effects when delivered. All optional.
//       revBonus?: number,           //   One-time revenue jump (£bn pa added to base)
//       ongoingRev?: number,         //   Sustained revenue adjustment (can be negative)
//       ongoingCost?: number,        //   Sustained extra spending
//       growthBonus?: number,        //   Permanent growth rate adjustment (pp)
//       gini?: number,               //   Permanent Gini index change
//       healthBoost?: number,        //   Permanent Health Index change
//       populationEffects?: {        //   Per-quarter bloc population growth modifiers
//         [blocId]: number           //     % per quarter, e.g. 0.5 = +0.5%/Q
//       },
//       log: string,                 //   Log entry on completion
//     },
//     blocEffects?: { [blocId]: number }, // One-time bloc support deltas on completion
//     riskMods?: { [eventId]: number },   // Modify risk probabilities while complete
//   }
//
// Then it appears automatically in the Reforms tab under its branch.
// =============================================================================

const FONT_LINK = `@import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600;9..144,700&family=IBM+Plex+Sans:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600&display=swap');`;

const TERM_LENGTH = 20;

// Each bloc has weight (current voter share), base support, population growth rate,
// and notes. Population growth rates are quarterly drift toward equilibrium.
const BLOCS = {
  pensioners:      { name: 'Pensioners',         weight: 0.22, base: 50, popGrowth: 0.4,  note: 'Highest turnout. Care about NHS, pensions, fuel costs. Triple lock is sacred. Population growing rapidly with ageing demographics.' },
  workingClass:    { name: 'Working Class',      weight: 0.20, base: 42, popGrowth: -0.1, note: 'Hit hardest by VAT and basic rate. Benefit from welfare, wage floors, public services. Slowly shrinking absolute share.' },
  middleClass:     { name: 'Middle Class',       weight: 0.24, base: 48, popGrowth: 0.0,  note: 'Aspirational. Sensitive to higher-rate tax, housing costs, NHS quality. Stable population share.' },
  professional:    { name: 'Urban Professionals', weight: 0.14, base: 52, popGrowth: 0.2, note: 'High earners. Care about immigration, climate, urban services. Growing with knowledge economy.' },
  business:        { name: 'Business Owners',    weight: 0.08, base: 45, popGrowth: 0.0,  note: 'Small share but loud. Corporate tax, regulation, capital gains sensitive.' },
  publicSector:    { name: 'Public Sector',      weight: 0.12, base: 55, popGrowth: 0.0,  note: 'Teachers, nurses, civil servants. Reliable Labour bloc. Strike-prone when squeezed.' },
  youth:           { name: 'Youth (18-29)',      weight: 0.13, base: 40, popGrowth: -0.2, note: 'Lowest turnout but growing politically. Housing, education, climate, tuition. Cohort shrinking with low birthrates.' },
  northern:        { name: 'Northern / Midlands', weight: 0.28, base: 41, popGrowth: -0.05, note: 'Cross-cuts class. Levelling-up agenda. Skeptical of London, sensitive to immigration.' },
  ethnicMinority:  { name: 'Ethnic Minorities',  weight: 0.14, base: 48, popGrowth: 0.3,  note: 'Heterogeneous. Generally pro-Labour, hostile to anti-immigration measures. Growing share.' },
};

const INITIAL_BLOC_SUPPORT = Object.fromEntries(Object.entries(BLOCS).map(([k, v]) => [k, v.base]));
const INITIAL_BLOC_WEIGHTS = Object.fromEntries(Object.entries(BLOCS).map(([k, v]) => [k, v.weight]));
const COALITION = ['workingClass', 'publicSector', 'youth', 'northern', 'ethnicMinority'];

// =============================================================================
// REFORMS — restrictive (right-coded) reforms mixed in by category.
// Marked with controversial:true for subtle UI indication, not category separation.
// =============================================================================
const REFORMS = {
  // === REVENUE ===
  hmrcCapacity: { name: 'HMRC Modernisation', branch: 'revenue', cost: 2, quarters: 4, prereq: [], passReq: { coalition: 30 },
    blurb: 'Reverse digitisation cuts; recruit compliance staff.',
    source: 'HMRC tax gap est. £39.8bn (2022-23). Each £1 in compliance returns ~£18 (NAO).',
    onComplete: { revBonus: 4, log: 'HMRC modernised. Compliance up.' },
    blocEffects: { business: -1, professional: 1 } },
  obrIndependence: { name: 'Strengthen OBR Independence', branch: 'revenue', cost: 0.5, quarters: 3, prereq: [], passReq: { coalition: 30 },
    blurb: 'Statutory pre-publication review of Treasury costings. Reduces forecast uncertainty.',
    source: 'OBR has identified ~£20bn pa in optimistic departmental costings since 2010.',
    onComplete: { log: 'OBR powers strengthened. Forecast bands narrowed materially.' },
    blocEffects: { professional: 4, business: 3, middleClass: 2 },
    special: 'reduceForecastNoise' },
  cgtAlign: { name: 'Align CGT with Income Tax', branch: 'revenue', cost: 0.5, quarters: 2, prereq: ['hmrcCapacity'], passReq: { coalition: 32 },
    blurb: 'Close the entrepreneur loophole. Capital gains taxed as ordinary income.',
    source: 'IFS Adam-Advani-Miller-Summers (2024): ~£13bn pa after behavioural response.',
    onComplete: { revBonus: 13, gini: -0.3, log: "CGT aligned. The founders' loophole closed." },
    blocEffects: { business: -8, professional: -3, workingClass: 3, middleClass: 2 } },
  nondomEnd: { name: 'Abolish Non-Dom Regime', branch: 'revenue', cost: 0.3, quarters: 2, prereq: ['hmrcCapacity'], passReq: { coalition: 30 },
    blurb: 'Full abolition of remittance basis; replace with 4-year FIG regime.',
    source: 'Advani-Burgherr-Summers (CenTax, 2025): 2017 reform → 4.9% left, receipts +150%.',
    onComplete: { revBonus: 4, log: 'Non-dom regime abolished. Predicted exodus did not materialise.' },
    blocEffects: { business: -4, workingClass: 4, northern: 3 } },
  wealthTax: { name: 'Wealth Tax (2% above £10m)', branch: 'revenue', cost: 1, quarters: 4, prereq: ['hmrcCapacity', 'nondomEnd'], passReq: { coalition: 40 },
    blurb: 'Annual 2% on net wealth above £10m. ~22,000 households affected.',
    source: 'Wealth Tax Commission (2020); contested annual rate estimates.',
    onComplete: { revBonus: 24, gini: -0.6, log: 'Wealth tax implemented. Migration response <0.1.' },
    blocEffects: { business: -10, professional: -4, workingClass: 7, northern: 5, youth: 4 } },
  charityCredit: { name: 'Charitable Deduction → Credit', branch: 'revenue', cost: 0.2, quarters: 2, prereq: [], passReq: { coalition: 28 },
    blurb: 'Replace higher-rate relief with flat 25% credit.',
    source: 'HMRC charity tax relief: £6.7bn (2024-25); higher-rate Gift Aid £820m.',
    onComplete: { revBonus: 2, gini: -0.1, log: 'Charitable deduction converted to capped credit.' },
    blocEffects: { business: -2, professional: -2, workingClass: 1 } },
  windfallTax: { name: 'Permanent Excess Profits Levy', branch: 'revenue', cost: 0.1, quarters: 2, prereq: [], passReq: { coalition: 30 },
    blurb: 'Permanent windfall mechanism in energy, banking, supermarkets.',
    source: 'Current Energy Profits Levy ~£3bn pa; multi-sector extension scales up.',
    onComplete: { revBonus: 8, log: 'Permanent windfall mechanism in law.' },
    blocEffects: { business: -7, workingClass: 5, northern: 4 } },
  niEmployer: { name: 'Employer NI on Investment Income', branch: 'revenue', cost: 0.2, quarters: 2, prereq: ['hmrcCapacity'], passReq: { coalition: 33 },
    blurb: 'Extend Employer NI to dividends and rental income.',
    source: 'IFS: aligning treatment of employment/self-employment/dividends → ~£8bn pa.',
    onComplete: { revBonus: 7, gini: -0.2, log: 'Employer NI extended.' },
    blocEffects: { business: -6, professional: -3, workingClass: 3 } },
  benefitFreeze: { name: 'Multi-Year Benefit Freeze', branch: 'revenue', cost: 0, quarters: 1, prereq: [], passReq: { coalition: 27 },
    blurb: 'Freeze working-age benefits for 3 years. Real-terms cut.',
    source: 'IFS: 2016-2020 freeze saved £4bn/year; pushed 400k children into poverty.',
    controversial: true,
    onComplete: { revBonus: 6, gini: 0.4, healthBoost: -2, log: 'Benefit freeze in effect.' },
    blocEffects: { business: 4, middleClass: 2, workingClass: -8, ethnicMinority: -5, publicSector: -4 } },
  topRateCut: { name: 'Cut Additional Rate to 40%', branch: 'revenue', cost: 0, quarters: 1, prereq: [], passReq: { coalition: 25 },
    blurb: 'Abolish additional rate. Trickle-down theory in action.',
    source: 'Hope-Limberg (2022): 50y of OECD evidence — top-rate cuts produce NO growth effect.',
    controversial: true,
    onComplete: { ongoingRev: -5, gini: 0.4, log: 'Additional rate abolished. Markets rallied.' },
    blocEffects: { business: 8, professional: 4, workingClass: -6, publicSector: -8, youth: -5 } },

  // === NHS / CARE ===
  nhsPay: { name: 'NHS Pay Settlement', branch: 'nhs', cost: 4, quarters: 2, prereq: [], passReq: { coalition: 32 },
    blurb: 'Multi-year pay deal; ends rolling strikes; cuts agency spend.',
    source: 'NHS agency spend ~£3bn pa pre-deal; settlement saves ~£1bn pa net.',
    onComplete: { ongoingCost: 4, healthBoost: 2, log: 'NHS pay deal signed.' },
    blocEffects: { publicSector: 12, workingClass: 4, middleClass: 2 },
    riskMods: { nhsStrike: -50 } },
  socialCareReform: { name: 'Social Care Funding Settlement', branch: 'nhs', cost: 6, quarters: 4, prereq: ['nhsPay'], passReq: { coalition: 38 },
    blurb: 'Dilnot-style cap on personal contributions; NI surcharge funding.',
    source: 'Dilnot cap costed at £3.6bn pa (2021); ~£5-6bn now.',
    onComplete: { ongoingCost: 5, healthBoost: 3, log: 'Social care settled.' },
    blocEffects: { pensioners: 8, middleClass: 5, publicSector: 4 } },
  preventativeHealth: { name: 'Preventative Health Programme', branch: 'nhs', cost: 3, quarters: 6, prereq: ['nhsPay'], passReq: { coalition: 35 },
    blurb: 'Marmot-style upstream investment. Long-run mortality + productivity.',
    source: 'Marmot (2024): austerity → ~148,000 excess deaths.',
    onComplete: { ongoingCost: 2, healthBoost: 4, growthBonus: 0.2, log: 'Preventative health programme bedded in.' },
    blocEffects: { workingClass: 5, northern: 4, publicSector: 3 } },
  mentalHealth: { name: 'Mental Health Parity', branch: 'nhs', cost: 2, quarters: 4, prereq: [], passReq: { coalition: 33 },
    blurb: 'Statutory parity between MH and physical health services.',
    source: 'NHS MH funding ~£17bn of £200bn; parity raises to ~£24bn.',
    onComplete: { ongoingCost: 3, healthBoost: 2, log: 'Mental health funding at parity.' },
    blocEffects: { youth: 8, professional: 5, publicSector: 4, workingClass: 3 } },
  privatiseNHS: { name: 'Expand NHS Private Provision', branch: 'nhs', cost: 0.5, quarters: 3, prereq: [], passReq: { coalition: 25 },
    blurb: 'Outsource elective procedures. Cuts waiting lists short-term.',
    source: 'BMJ studies: privatised provision raises per-procedure costs ~10-25% over time.',
    controversial: true,
    onComplete: { ongoingCost: 2, healthBoost: 1, log: 'Private provision expanded.' },
    blocEffects: { business: 8, middleClass: 3, publicSector: -10, workingClass: -5 } },

  // === HOUSING ===
  socialHousing: { name: 'Council House Building', branch: 'housing', cost: 8, quarters: 8, prereq: [], passReq: { coalition: 33 },
    blurb: '300,000 council homes over 8Q. Lowers Housing Benefit long-term.',
    source: 'Shelter (2024): £10bn/year for 90k social homes/year.',
    onComplete: { growthBonus: 0.3, gini: -0.4, populationEffects: { youth: 0.1, workingClass: 0.05 }, log: 'Council building delivered first homes.' },
    blocEffects: { workingClass: 10, youth: 8, northern: 6, ethnicMinority: 5, business: -3 } },
  planningReform: { name: 'Planning System Overhaul', branch: 'housing', cost: 1, quarters: 3, prereq: [], passReq: { coalition: 30 },
    blurb: 'Presumption in favour of development; restrict NIMBY blocks.',
    source: 'CMA/CPS: planning friction reduces housing supply by ~30%.',
    onComplete: { growthBonus: 0.2, log: 'Planning reform unblocking 80k homes/year.' },
    blocEffects: { youth: 6, professional: 4, business: 5, middleClass: -3, pensioners: -4 } },
  rentControls: { name: 'Rent Caps (High-Pressure Zones)', branch: 'housing', cost: 0.2, quarters: 2, prereq: [], passReq: { coalition: 32 },
    blurb: 'Annual rent rises capped at CPI.',
    source: 'Diamond-McQuade-Qian (2019): controls help incumbents but reduce supply long-term.',
    controversial: true,
    onComplete: { gini: -0.2, growthBonus: -0.05, log: 'Rent controls in force.' },
    blocEffects: { youth: 9, workingClass: 5, ethnicMinority: 4, business: -6, middleClass: -2 } },
  rightToBuyEnd: { name: 'End Right-to-Buy', branch: 'housing', cost: 0.1, quarters: 1, prereq: [], passReq: { coalition: 34 },
    blurb: 'Stop council stock erosion.',
    source: '~2m homes sold since 1980; loss rate ~10k/year.',
    onComplete: { gini: -0.1, log: 'Right-to-Buy ended in England.' },
    blocEffects: { workingClass: 6, youth: 4, pensioners: -3, business: -2 } },

  // === GREEN / INFRASTRUCTURE ===
  greenInvest: { name: 'GB Energy + Grid Investment', branch: 'green', cost: 10, quarters: 6, prereq: [], passReq: { coalition: 32 },
    blurb: 'Public energy company + grid upgrade. Lower bills mid-term.',
    source: 'Labour manifesto: £8.3bn over 5y; grid needs ~£40bn through 2030.',
    onComplete: { growthBonus: 0.3, ongoingRev: 2, log: 'GB Energy delivering. Bills down 8%.' },
    blocEffects: { youth: 7, workingClass: 4, northern: 5, business: 2 } },
  insulationScheme: { name: 'Mass Home Insulation', branch: 'green', cost: 4, quarters: 4, prereq: [], passReq: { coalition: 30 },
    blurb: 'Retrofit 5m homes. Cuts bills + emissions; trade jobs.',
    source: 'CCC: £15bn over 5y. Saves ~£300/year per household.',
    onComplete: { healthBoost: 1, gini: -0.2, log: 'Insulation programme cutting energy poverty.' },
    blocEffects: { workingClass: 7, pensioners: 6, northern: 5 } },
  rail: { name: 'Northern Rail Investment', branch: 'green', cost: 12, quarters: 12, prereq: ['planningReform'], passReq: { coalition: 36 },
    blurb: 'Connecting Northern cities. Long lead time.',
    source: 'NPR full scheme ~£70bn over 10y; partial £12bn = first phase.',
    onComplete: { growthBonus: 0.5, populationEffects: { northern: 0.05 }, log: 'Northern rail upgrades commissioned.' },
    blocEffects: { northern: 12, workingClass: 4, business: 5 } },
  digitalInfra: { name: 'Full-Fibre Rollout', branch: 'green', cost: 5, quarters: 6, prereq: [], passReq: { coalition: 31 },
    blurb: 'Universal full-fibre by 2030.',
    source: 'CEBR (2022): full-fibre could add £59bn to GDP by 2025.',
    onComplete: { growthBonus: 0.2, log: 'Full-fibre near-universal.' },
    blocEffects: { professional: 5, business: 6, northern: 4, youth: 3 } },
  deregulate: { name: 'Deregulatory Bonfire', branch: 'green', cost: 0.3, quarters: 2, prereq: [], passReq: { coalition: 28 },
    blurb: 'Strip back environmental, planning, employment regulations.',
    source: 'OECD evidence on light-touch reg: mixed; depends on which regs.',
    controversial: true,
    onComplete: { growthBonus: 0.15, log: 'Deregulation underway. Markets cheered.' },
    blocEffects: { business: 12, professional: -3, publicSector: -5, youth: -6, workingClass: -4 },
    riskMods: { financialCrisis: 5, flood: 3 } },

  // === EDUCATION / SKILLS ===
  freeChildcare: { name: 'Universal Free Childcare', branch: 'education', cost: 5, quarters: 4, prereq: [], passReq: { coalition: 34 },
    blurb: 'Removes work disincentive. Labour supply boost.',
    source: 'Resolution Foundation: ~£8bn pa costs return ~£12bn via labour supply.',
    onComplete: { ongoingCost: 6, growthBonus: 0.4, populationEffects: { youth: 0.05, workingClass: 0.05 }, log: 'Universal childcare live.' },
    blocEffects: { youth: 6, workingClass: 5, professional: 7, middleClass: 4 } },
  skillsBudget: { name: 'Skills & FE Funding', branch: 'education', cost: 3, quarters: 3, prereq: [], passReq: { coalition: 30 },
    blurb: 'Restore Further Education funding to 2010 real terms.',
    source: 'IFS: FE funding cut 14% real terms 2010-2020. Restoration ~£3bn pa.',
    onComplete: { growthBonus: 0.15, log: 'FE colleges rebuilt.' },
    blocEffects: { workingClass: 5, northern: 4, youth: 3, business: 3 } },
  uniReform: { name: 'University Fees Reform', branch: 'education', cost: 4, quarters: 4, prereq: [], passReq: { coalition: 35 },
    blurb: 'Replace tuition-fee debt with progressive graduate contribution.',
    source: 'OBR: current loan RAB charge ~44%. Reform could cost £3bn pa.',
    onComplete: { ongoingCost: 3, log: 'Tuition fee debt replaced with graduate tax.' },
    blocEffects: { youth: 10, professional: 4, middleClass: 3, pensioners: -2 } },

  // === LABOUR / WORK ===
  realLivingWage: { name: 'Statutory Real Living Wage', branch: 'labour', cost: 0.3, quarters: 2, prereq: [], passReq: { coalition: 33 },
    blurb: 'Raise minimum to Living Wage Foundation rate (~£12.60/hr).',
    source: 'LPC: 5%+ above NLW. ~2.4m workers. ONS finds limited employment effects.',
    onComplete: { gini: -0.3, log: 'Real Living Wage on statute.' },
    blocEffects: { workingClass: 8, youth: 4, ethnicMinority: 5, business: -7 } },
  unionRights: { name: 'Restore Union Rights', branch: 'labour', cost: 0.1, quarters: 2, prereq: [], passReq: { coalition: 36 },
    blurb: 'Repeal Trade Union Act 2016; sectoral bargaining frameworks.',
    source: 'OECD: countries with sectoral bargaining have lower wage inequality.',
    onComplete: { gini: -0.2, log: 'Trade union law reformed.' },
    blocEffects: { workingClass: 6, publicSector: 8, business: -5 },
    riskMods: { generalStrike: -10 } },
  workersBoardSeats: { name: 'Workers on Boards', branch: 'labour', cost: 0.2, quarters: 3, prereq: ['unionRights'], passReq: { coalition: 38 },
    blurb: 'German-style co-determination for firms >250 employees.',
    source: 'Jäger-Schoefer-Heining (2021): codetermination raises productivity 1%.',
    onComplete: { growthBonus: 0.1, gini: -0.2, log: 'Worker board representation in law.' },
    blocEffects: { workingClass: 6, publicSector: 4, business: -8 } },
  antiStrike: { name: 'Minimum Service Levels Act', branch: 'labour', cost: 0.1, quarters: 2, prereq: [], passReq: { coalition: 27 },
    blurb: 'Mandate minimum service during strikes; sackings for non-compliance.',
    source: 'ILO has criticised similar laws as breaching international labour standards.',
    controversial: true,
    onComplete: { log: 'Anti-strike law in force.' },
    blocEffects: { business: 6, middleClass: 3, publicSector: -14, workingClass: -8 },
    riskMods: { generalStrike: 12, nhsStrike: 8 } },

  // === STATE CAPACITY ===
  civilService: { name: 'Rebuild Civil Service', branch: 'state', cost: 2, quarters: 3, prereq: [], passReq: { coalition: 30 },
    blurb: 'Reverse decade of headcount cuts. Less consultant reliance.',
    source: 'Civil service consultancy spend hit £2.8bn in 2022-23.',
    onComplete: { ongoingCost: 1, revBonus: 2, log: 'Civil service rebuilt.' },
    blocEffects: { publicSector: 8, professional: 3 } },
  localGov: { name: 'Local Government Settlement', branch: 'state', cost: 5, quarters: 3, prereq: [], passReq: { coalition: 33 },
    blurb: 'Multi-year council funding. Saves SEND, social care, libraries.',
    source: 'IFS: real terms council funding fell 25% 2010-2020.',
    onComplete: { ongoingCost: 5, healthBoost: 1, log: 'Local government on stable footing.' },
    blocEffects: { workingClass: 4, northern: 5, publicSector: 5, middleClass: 3 },
    riskMods: { councilBankruptcy: -20 } },
  banking: { name: 'Banking Regulation', branch: 'state', cost: 0.5, quarters: 3, prereq: [], passReq: { coalition: 32 },
    blurb: 'Higher capital requirements; ring-fence enforcement.',
    source: 'BCBS: 1pp higher capital reduces crisis probability by ~0.5pp.',
    onComplete: { log: 'Banking sector better capitalised.' },
    blocEffects: { workingClass: 3, business: -8, professional: -3 },
    riskMods: { financialCrisis: -4 } },
  immigrationCap: { name: 'Cap Net Migration at 100k', branch: 'state', cost: 0.5, quarters: 3, prereq: [], passReq: { coalition: 28 },
    blurb: 'Hard cap on visa routes. Reduces growth and population in working-age blocs.',
    source: 'OBR (Nov 2023): each 100k net migration adds ~0.5% GDP over 5y.',
    controversial: true,
    onComplete: { growthBonus: -0.4, ongoingRev: -3, populationEffects: { professional: -0.3, ethnicMinority: -0.5, youth: -0.15 }, log: 'Net migration capped. Labour shortages biting.' },
    blocEffects: { workingClass: 5, northern: 8, pensioners: 4, ethnicMinority: -10, professional: -8, business: -10 },
    riskMods: { labourShortage: 25 } },
  refugeeRestrict: { name: 'Offshore Asylum Processing', branch: 'state', cost: 2, quarters: 4, prereq: [], passReq: { coalition: 26 },
    blurb: 'Offshoring scheme. Symbolic; legally fraught.',
    source: 'PAC: Rwanda scheme cost £700m+ for zero removals.',
    controversial: true,
    onComplete: { log: 'Offshoring scheme operational. Legal challenges ongoing.' },
    blocEffects: { northern: 6, workingClass: 3, ethnicMinority: -12, professional: -10, youth: -8 } },
  triple_lock_plus: { name: 'Triple Lock+ Enhancement', branch: 'state', cost: 0, quarters: 1, prereq: [], passReq: { coalition: 28 },
    blurb: 'Raise pension by max of CPI+1, earnings+1, or 3.5%.',
    source: 'OBR: extending the lock costs ~£8bn cumulative by 2030.',
    controversial: true,
    onComplete: { ongoingCost: 8, log: 'Pensioner generosity entrenched.' },
    blocEffects: { pensioners: 14, youth: -8, workingClass: -2, professional: -3 } },
};

const REFORM_BRANCHES = {
  revenue: 'Revenue', nhs: 'Health & Care', housing: 'Housing', green: 'Green & Infrastructure',
  education: 'Education & Skills', labour: 'Labour & Work', state: 'State Capacity',
};

// =============================================================================
// SOURCES — bibliography rendered in the About tab. Edit freely.
// =============================================================================
const SOURCES = [
  {
    section: 'Public finances — overall',
    items: [
      { title: 'HMRC Ready Reckoner', sub: 'Direct effects of illustrative tax changes', note: 'Per-percentage-point revenue estimates for income tax, NI, CGT, etc.', url: 'https://www.gov.uk/government/statistics/direct-effects-of-illustrative-tax-changes' },
      { title: 'OBR Economic & Fiscal Outlook', sub: 'Office for Budget Responsibility', note: 'Twice-yearly forecasts; basis for debt-sustainability framing.', url: 'https://obr.uk/efo/economic-and-fiscal-outlook/' },
      { title: 'IFS Green Budget', sub: 'Institute for Fiscal Studies (annual)', note: 'The most-cited UK fiscal policy analysis.', url: 'https://ifs.org.uk/green-budget' },
      { title: 'Public Spending Statistics', sub: 'HM Treasury', note: 'Departmental spending baselines.', url: 'https://www.gov.uk/government/collections/public-spending-statistics' },
    ]
  },
  {
    section: 'Taxation — specific reforms',
    items: [
      { title: 'Capital Gains Tax Reform', sub: 'Adam, Advani, Miller & Summers (IFS/CenTax, 2024)', note: '~£13bn pa from CGT-income alignment after behavioural response.', url: 'https://ifs.org.uk/publications/capital-gains-tax-reform' },
      { title: 'The UK Non-Dom Regime: Implications of Reform', sub: 'Advani, Burgherr & Summers (CenTax, 2025)', note: '2017 reform → 4.9% departures, receipts +150%.', url: 'https://centax.org.uk/research/' },
      { title: 'The Case for a Progressive Tax', sub: 'Diamond & Saez, JEP (2011)', note: 'Revenue-maximising top combined rate ≈ 73%.', url: 'https://www.aeaweb.org/articles?id=10.1257/jep.25.4.165' },
      { title: 'A Wealth Tax for the UK', sub: 'Wealth Tax Commission (2020)', note: 'One-off rates costed extensively; annual rate estimates contested.', url: 'https://www.wealthandpolicy.com/' },
      { title: 'Charity Tax Relief Statistics 2024–25', sub: 'HMRC', note: 'Total reliefs £6.7bn; higher-rate Gift Aid £820m.', url: 'https://www.gov.uk/government/statistics/cost-of-tax-relief' },
      { title: 'Economic Consequences of Major Tax Cuts for the Rich', sub: 'Hope & Limberg, Socio-Economic Review (2022)', note: '50 years OECD data — no significant growth effects.', url: 'https://academic.oup.com/ser/article/20/2/539/6500315' },
    ]
  },
  {
    section: 'Migration & tax flight',
    items: [
      { title: 'Millionaire Migration and Taxation of the Elite', sub: 'Young, Varner, Lurie & Prisinzano, ASR (2016)', note: '45m IRS records — semi-elasticities <0.1.', url: 'https://journals.sagepub.com/doi/10.1177/0003122416639625' },
      { title: 'UK non-dom departure data', sub: 'HMRC / Tax Justice Network', note: 'Post-reform statistics consistently below forecast departures.', url: 'https://taxjustice.net/' },
      { title: 'OBR Migration Box (Nov 2023)', sub: 'Office for Budget Responsibility', note: '~100k net migration adds ~0.5% real GDP over 5 years.', url: 'https://obr.uk/efo/economic-and-fiscal-outlook-november-2023/' },
    ]
  },
  {
    section: 'Public services & austerity',
    items: [
      { title: 'Marmot Review at 10 / Marmot 2024', sub: 'Institute of Health Equity, UCL', note: '~148,000 excess deaths attributed to austerity 2010–2019.', url: 'https://www.instituteofhealthequity.org/' },
      { title: 'Walsh, McCartney et al. (2022)', sub: 'Excess mortality in England & Scotland 2012–2019', note: '', url: 'https://pubmed.ncbi.nlm.nih.gov/' },
      { title: 'Loopstra, Reeves et al. (2016)', sub: 'Journal of the Royal Society of Medicine', note: 'Each 1% Pension Credit cut → 0.68% rise in mortality (85+).', url: 'https://journals.sagepub.com/home/jrs' },
    ]
  },
  {
    section: 'Housing',
    items: [
      { title: 'Building the Homes We Need', sub: 'Shelter (2024)', note: '£10bn/year for 90k social homes/year.', url: 'https://england.shelter.org.uk/professional_resources/policy_and_research' },
      { title: 'Effects of Rent Control Expansion', sub: 'Diamond, McQuade & Qian, AER (2019)', note: 'Helps incumbents; reduces supply long-term.', url: 'https://www.aeaweb.org/articles?id=10.1257/aer.20181289' },
      { title: 'Housebuilding Market Study', sub: 'CMA (2024)', note: 'Planning friction reduces supply by ~30%.', url: 'https://www.gov.uk/cma-cases/housebuilding-market-study' },
    ]
  },
  {
    section: 'Labour & wages',
    items: [
      { title: 'Low Pay Commission Annual Report', sub: 'LPC', note: 'NLW / Living Wage employment effects evidence.', url: 'https://www.gov.uk/government/organisations/low-pay-commission' },
      { title: 'Labor in the Boardroom', sub: 'Jäger, Schoefer & Heining, QJE (2021)', note: 'Modest productivity effect from German codetermination.', url: 'https://academic.oup.com/qje/article/136/2/669/6041122' },
    ]
  },
  {
    section: 'Green & climate',
    items: [
      { title: 'CCC Net Zero / Carbon Budgets', sub: 'Climate Change Committee', note: 'Retrofit programme costs (~£15bn/5y).', url: 'https://www.theccc.org.uk/' },
      { title: 'Full Fibre: Economic Impact', sub: 'CEBR (2022)', note: 'Full-fibre could add £59bn to GDP by 2025.', url: 'https://cebr.com/' },
    ]
  },
  {
    section: 'Fiscal/political philosophy',
    items: [
      { title: 'Just Giving', sub: 'Rob Reich (Princeton, 2018)', note: 'Foundational case against charity-as-tax-substitute.', url: 'https://press.princeton.edu/books/hardcover/9780691183497/just-giving' },
      { title: 'Winner-Take-All Politics', sub: 'Hacker & Pierson (2010)', note: 'Political economy of persistent tax cuts.', url: 'https://us.macmillan.com/books/9781416588702/winnertakeallpolitics' },
    ]
  },
];


const INITIAL = {
  quarter: 1, term: 1, globalQuarter: 1, // globalQuarter never resets; quarter resets each term
  gdp: 2800, realGDP: 2800, // realGDP excludes inflation
  population: 67.5, // millions
  debt: 2800, growth: 1.2, inflation: 2.8, unemployment: 4.4, bondYield: 4.5,
  taxIncomeAdd: 45, taxIncomeHigh: 40, taxIncomeBasic: 20, taxCorp: 25, taxVAT: 20,
  spendNHS: 200, spendEdu: 90, spendWelfare: 300, spendDefence: 55, spendInfra: 35, spendLocal: 60,
  blocSupport: INITIAL_BLOC_SUPPORT,
  blocWeights: INITIAL_BLOC_WEIGHTS,
  reforms: {}, proposedReforms: [],
  revBonusFromReforms: 0, ongoingCostFromReforms: 0, ongoingRevFromReforms: 0,
  healthIndex: 68, gini: 35.2, log: [], pendingEvent: null, pendingSummary: null,
  pendingSurplus: 0,
  status: 'playing', committed: null, termsWon: 0,
  forecastNoise: 0.25, // ±25% uncertainty on reform projections
};

// =============================================================================
// CALCULATIONS
// =============================================================================

function calcCoalitionCohesion(blocSupport, blocWeights) {
  let total = 0, weightSum = 0;
  for (const id of COALITION) {
    total += blocSupport[id] * blocWeights[id];
    weightSum += blocWeights[id];
  }
  return total / weightSum;
}

function calcOverallApproval(blocSupport, blocWeights) {
  let total = 0, weightSum = 0;
  for (const [id, s] of Object.entries(blocSupport)) {
    total += s * blocWeights[id];
    weightSum += blocWeights[id];
  }
  return total / weightSum;
}

function calcRevenue(s) {
  // Revenues scale with nominal GDP since prices/wages rise — approximate via GDP/initial ratio
  const gdpScale = s.gdp / 2800;
  let incomeTax = (280 + (s.taxIncomeAdd-45)*0.9 + (s.taxIncomeHigh-40)*4.5 + (s.taxIncomeBasic-20)*7.2) * gdpScale;
  let corpTax = (100 + (s.taxCorp-25)*4 - Math.max(0,(s.taxCorp-30))*(s.taxCorp-30)*0.5) * gdpScale;
  let vat = (180 + (s.taxVAT-20)*8.5) * gdpScale;
  let ni = 170 * gdpScale;
  let other = 200 * gdpScale;
  const reformBonus = s.revBonusFromReforms + s.ongoingRevFromReforms;
  return { incomeTax, corpTax, vat, ni, other, reformBonus,
    total: incomeTax + corpTax + vat + ni + other + reformBonus };
}

function calcSpending(s) {
  const debtInterest = s.debt * (s.bondYield/100);
  // Departmental spending scales with inflation only (not real growth) by design — you're choosing nominal levels
  const departmental = s.spendNHS + s.spendEdu + s.spendWelfare + s.spendDefence + s.spendInfra + s.spendLocal;
  // Fixed costs scale with population (pensions especially)
  const popScale = s.population / 67.5;
  const fixed = (130 + 40 + 110) * popScale;
  return { debtInterest, departmental, fixed, reformOngoing: s.ongoingCostFromReforms,
    total: debtInterest + departmental + fixed + s.ongoingCostFromReforms };
}

function calcBalance(s) { return calcRevenue(s).total - calcSpending(s).total; }
function deficitPctGDP(s) { return -calcBalance(s) / s.gdp * 100; }

function quarterlyBlocDelta(s) {
  const d = Object.fromEntries(Object.keys(BLOCS).map(k => [k, 0]));
  if (s.taxIncomeAdd > 45) { d.workingClass += (s.taxIncomeAdd-45)*0.4; d.northern += (s.taxIncomeAdd-45)*0.3; d.business -= (s.taxIncomeAdd-45)*0.6; d.professional -= (s.taxIncomeAdd-45)*0.5; }
  if (s.taxIncomeHigh > 40) { d.middleClass -= (s.taxIncomeHigh-40)*1.5; d.professional -= (s.taxIncomeHigh-40)*1.2; d.publicSector -= (s.taxIncomeHigh-40)*0.5; }
  if (s.taxIncomeBasic < 20) { d.workingClass += (20-s.taxIncomeBasic)*1.8; d.youth += (20-s.taxIncomeBasic)*1.2; d.pensioners += (20-s.taxIncomeBasic)*0.6; d.middleClass += (20-s.taxIncomeBasic)*1.0; d.northern += (20-s.taxIncomeBasic)*1.5; d.ethnicMinority += (20-s.taxIncomeBasic)*1.3; }
  else if (s.taxIncomeBasic > 20) { d.workingClass -= (s.taxIncomeBasic-20)*2.5; d.middleClass -= (s.taxIncomeBasic-20)*1.8; d.pensioners -= (s.taxIncomeBasic-20)*1.0; d.northern -= (s.taxIncomeBasic-20)*2.0; d.ethnicMinority -= (s.taxIncomeBasic-20)*1.5; }
  if (s.taxVAT > 20) { d.workingClass -= (s.taxVAT-20)*2.2; d.pensioners -= (s.taxVAT-20)*1.5; d.northern -= (s.taxVAT-20)*1.8; d.ethnicMinority -= (s.taxVAT-20)*1.6; d.middleClass -= (s.taxVAT-20)*1.0; }
  else if (s.taxVAT < 20) { d.workingClass += (20-s.taxVAT)*2.5; d.pensioners += (20-s.taxVAT)*1.8; d.northern += (20-s.taxVAT)*2.0; d.middleClass += (20-s.taxVAT)*1.2; }
  if (s.taxCorp > 28) { d.business -= (s.taxCorp-28)*1.5; d.professional -= (s.taxCorp-28)*0.4; }
  else if (s.taxCorp < 22) { d.workingClass -= (22-s.taxCorp)*0.8; d.publicSector -= (22-s.taxCorp)*0.6; }
  const nhsCut = Math.max(0, 200-s.spendNHS);
  if (nhsCut > 0) { d.pensioners -= nhsCut*0.4; d.publicSector -= nhsCut*0.5; d.workingClass -= nhsCut*0.3; d.northern -= nhsCut*0.3; }
  const nhsBoost = Math.max(0, s.spendNHS-210);
  if (nhsBoost > 0) { d.publicSector += nhsBoost*0.3; d.pensioners += nhsBoost*0.25; d.middleClass += nhsBoost*0.15; }
  const welfareCut = Math.max(0, 290-s.spendWelfare);
  if (welfareCut > 0) { d.workingClass -= welfareCut*0.4; d.northern -= welfareCut*0.3; d.ethnicMinority -= welfareCut*0.3; d.youth -= welfareCut*0.2; }
  const eduCut = Math.max(0, 85-s.spendEdu);
  if (eduCut > 0) { d.youth -= eduCut*0.5; d.publicSector -= eduCut*0.4; d.workingClass -= eduCut*0.2; }
  const localCut = Math.max(0, 60-s.spendLocal);
  if (localCut > 0) { d.publicSector -= localCut*0.4; d.middleClass -= localCut*0.3; d.workingClass -= localCut*0.3; }
  if (s.spendInfra > 40) { d.business += (s.spendInfra-40)*0.2; d.northern += (s.spendInfra-40)*0.15; }
  for (const k of Object.keys(d)) {
    const diff = s.blocSupport[k] - BLOCS[k].base;
    d[k] -= diff * 0.05;
    d[k] /= 4;
  }
  return d;
}

// Population dynamics: each bloc grows by its base rate plus modifiers from completed reforms.
// Returns new weights (normalized to sum to ~1, since these are overlapping identities, but
// we use normalization for stability over many quarters).
function applyPopulationDynamics(weights, reforms) {
  const newW = { ...weights };
  for (const [id, bloc] of Object.entries(BLOCS)) {
    let qGrowth = bloc.popGrowth / 4; // base rate per quarter
    // Apply reform population effects
    for (const r of Object.values(reforms)) {
      if (r.status === 'complete' && r.reformDef?.onComplete?.populationEffects?.[id]) {
        qGrowth += r.reformDef.onComplete.populationEffects[id] / 4;
      }
    }
    newW[id] = newW[id] * (1 + qGrowth / 100);
  }
  return newW;
}

function computeRiskMods(s) {
  const m = {
    nhsStrike: 25, energyShock: 18, fuelPoverty: 15, housingCrisis: 22,
    councilBankruptcy: 12, financialCrisis: 6, generalStrike: 8, careCrisis: 14,
    flood: 10, heatwave: 8, tradeDeal: 5, allyCrisis: 7,
    investmentSurge: 8, exportBoom: 6, productivityJump: 5, taxBeats: 7, demographicDividend: 4,
    labourShortage: 0,
  };
  // Spending-based modifiers
  if (s.spendNHS < 200) m.nhsStrike += (200-s.spendNHS)*1.5;
  if (s.spendWelfare < 300) m.fuelPoverty += (300-s.spendWelfare)*0.3;
  if (s.spendLocal < 60) { m.councilBankruptcy += (60-s.spendLocal)*1.8; m.careCrisis += 5; }
  if (s.taxIncomeBasic > 22) m.generalStrike += 8;
  if (s.taxVAT > 22) m.generalStrike += 6;
  if (s.spendInfra > 45) m.investmentSurge += (s.spendInfra-45)*0.3;

  // Reform-based mods — declarative riskMods on each reform
  for (const r of Object.values(s.reforms)) {
    if (r.status === 'complete' && r.reformDef?.riskMods) {
      for (const [k, v] of Object.entries(r.reformDef.riskMods)) {
        m[k] = (m[k] || 0) + v;
      }
    }
  }
  // Skills budget specifically boosts investment
  if (s.reforms.skillsBudget?.status === 'complete') m.investmentSurge += 6;
  if (s.reforms.greenInvest?.status === 'complete') { m.exportBoom += 4; m.energyShock -= 10; }
  if (s.reforms.insulationScheme?.status === 'complete') { m.energyShock -= 6; m.fuelPoverty -= 10; }
  if (s.reforms.freeChildcare?.status === 'complete') { m.productivityJump += 4; m.demographicDividend += 3; }
  if (s.reforms.preventativeHealth?.status === 'complete') m.productivityJump += 4;
  if (s.reforms.hmrcCapacity?.status === 'complete') m.taxBeats += 6;
  if (s.reforms.socialHousing?.status === 'complete') m.housingCrisis -= 15;
  if (s.reforms.planningReform?.status === 'complete') m.housingCrisis -= 5;
  if (s.reforms.socialCareReform?.status === 'complete') m.careCrisis -= 12;

  for (const k of Object.keys(m)) m[k] = Math.max(1, Math.min(90, m[k]));
  return m;
}

// Forecast uncertainty — wraps reform projections in a ± band
function projectReformOutcome(reformDef, forecastNoise) {
  const out = {};
  if (!reformDef.onComplete) return out;
  for (const [k, v] of Object.entries(reformDef.onComplete)) {
    if (typeof v === 'number') {
      out[k] = { mid: v, low: v * (1 - forecastNoise), high: v * (1 + forecastNoise) };
    }
  }
  return out;
}

function sampleReformOutcome(reformDef, forecastNoise) {
  const out = { ...reformDef.onComplete };
  // Add noise to numeric fields
  for (const [k, v] of Object.entries(reformDef.onComplete || {})) {
    if (typeof v === 'number') {
      const noise = (Math.random() * 2 - 1) * forecastNoise;
      out[k] = v * (1 + noise);
    }
  }
  return out;
}

const EVENT_DEFINITIONS = {
  nhsStrike: { title: 'NHS Strike Action', body: 'RCN and BMA announce coordinated strike action.', tone: 'bad',
    choices: [
      { label: 'Emergency pay negotiations', effect: { debt: 3, blocs: { publicSector: 6, workingClass: 3 }, log: 'Emergency pay deal halted strikes.' } },
      { label: 'Anti-strike legislation', effect: { blocs: { publicSector: -12, workingClass: -8, business: 5 }, log: 'Anti-strike laws passed.' } },
      { label: 'Wait it out', effect: { healthIndex: -3, blocs: { pensioners: -5, publicSector: -4 }, log: 'Strikes dragged on.' } } ] },
  energyShock: { title: 'Global Energy Price Shock', body: 'Gas prices surged 60% on geopolitical instability.', tone: 'bad',
    choices: [
      { label: 'Energy Price Guarantee (£12bn)', effect: { debt: 12, blocs: { workingClass: 5, pensioners: 6, northern: 4 }, log: 'Bills capped through winter.' } },
      { label: 'Targeted support + windfall tax', effect: { debt: 3, blocs: { workingClass: 6, pensioners: 4, business: -5 }, log: 'Targeted help funded by windfall.' } },
      { label: 'Let the market clear', effect: { inflation: 1.5, healthIndex: -2, blocs: { workingClass: -10, pensioners: -8, northern: -6 }, log: 'Fuel poverty spiked.' } } ] },
  fuelPoverty: { title: 'Winter Fuel Poverty Crisis', body: 'Age UK reports record pensioners unable to heat homes.', tone: 'bad',
    choices: [
      { label: 'Emergency winter payments', effect: { debt: 4, blocs: { pensioners: 8, workingClass: 3 }, log: 'Winter payments delivered.' } },
      { label: 'Direct payments via councils', effect: { debt: 2, blocs: { pensioners: 4, publicSector: 2 }, log: 'Council-delivered support reached the most vulnerable.' } },
      { label: 'Refuse to act', effect: { healthIndex: -3, blocs: { pensioners: -12, workingClass: -5 }, log: 'Excess winter deaths spiked.' } } ] },
  housingCrisis: { title: 'Homelessness Surge', body: 'Rough sleeping up 35%. Shelter demands action.', tone: 'bad',
    choices: [
      { label: 'Emergency homelessness fund', effect: { debt: 2, blocs: { youth: 5, workingClass: 4, ethnicMinority: 4 }, log: 'Emergency hostels funded.' } },
      { label: 'Acquire empty properties', effect: { debt: 1, blocs: { youth: 4, workingClass: 5, business: -4 }, log: 'CPO programme on empty properties.' } },
      { label: 'Tough on rough sleeping', effect: { blocs: { youth: -8, workingClass: -6, ethnicMinority: -5, middleClass: 2 }, log: 'You criminalised it.' } } ] },
  councilBankruptcy: { title: 'Council Issues Section 114', body: 'A metropolitan council has declared bankruptcy.', tone: 'bad',
    choices: [
      { label: 'Direct bailout + funding review', effect: { debt: 3, blocs: { publicSector: 5, northern: 6, workingClass: 3 }, log: 'You bailed out the council.' } },
      { label: 'Government commissioners', effect: { debt: 1, blocs: { publicSector: -3, northern: -4 }, log: 'Local democracy suspended.' } } ] },
  financialCrisis: { title: 'Banking Sector Stress', body: 'A mid-size lender has failed.', tone: 'bad',
    choices: [
      { label: 'Coordinated rescue package', effect: { debt: 15, bondYield: -0.3, blocs: { business: 6, professional: 3, workingClass: -4 }, log: 'You stabilised the system.' } },
      { label: 'Bail-in instead of bailout', effect: { debt: 4, bondYield: 0.2, blocs: { workingClass: 5, business: -8 }, log: 'Senior creditors took the loss.' } } ] },
  generalStrike: { title: 'Cross-Sector Strike Wave', body: 'TUC coordinates general day of action.', tone: 'bad',
    choices: [
      { label: 'Sit down with the TUC', effect: { debt: 2, blocs: { workingClass: 8, publicSector: 6, business: -4 }, log: 'You negotiated.' } },
      { label: 'Refuse to negotiate under duress', effect: { growth: -0.3, blocs: { workingClass: -8, publicSector: -10, business: 4 }, log: 'Strikes continued.' } } ] },
  careCrisis: { title: 'Care Sector Collapse', body: 'Major care operator bust. 14,000 residents may lose homes.', tone: 'bad',
    choices: [
      { label: 'Take into public ownership', effect: { debt: 4, blocs: { pensioners: 8, publicSector: 5, business: -3 }, log: 'Care homes taken into public hands.' } },
      { label: 'Broker private rescue', effect: { debt: 1, blocs: { pensioners: 3, business: 2 }, log: 'Private rescue brokered.' } } ] },
  flood: { title: 'Severe Flooding', body: 'Storm flooding hit multiple regions.', tone: 'bad',
    choices: [
      { label: 'Reconstruction + flood defences', effect: { debt: 6, blocs: { northern: 5, workingClass: 3 }, log: 'New flood defences commissioned.' } },
      { label: 'Reconstruction only', effect: { debt: 3, blocs: { northern: 2 }, log: 'Patched up.' } } ] },
  heatwave: { title: 'Record Heatwave', body: 'Temperatures exceeded 40°C for three days.', tone: 'bad',
    choices: [
      { label: 'Climate adaptation package', effect: { debt: 3, blocs: { youth: 4, professional: 3, ethnicMinority: 3 }, log: 'Adaptation funding announced.' } },
      { label: 'Public information campaign', effect: { debt: 0.2, blocs: { youth: -2 }, log: 'Just an information campaign.' } } ] },
  allyCrisis: { title: 'International Crisis', body: 'NATO ally requesting military and financial support.', tone: 'neutral',
    choices: [
      { label: 'Full support package', effect: { debt: 4, blocs: { middleClass: 2, business: 2, youth: -3 }, log: 'Full support extended.' } },
      { label: 'Diplomatic support only', effect: { blocs: { professional: -2 }, log: 'Moral support only.' } } ] },
  labourShortage: { title: 'Severe Labour Shortages', body: 'Care, hospitality, agriculture and construction report critical vacancies.', tone: 'bad',
    choices: [
      { label: 'Temporary visa scheme', effect: { growth: 0.2, blocs: { business: 6, northern: -4 }, log: 'Targeted visas eased pressure.' } },
      { label: 'Hold the line on immigration', effect: { growth: -0.3, blocs: { workingClass: -3, business: -8 }, log: 'Shortages persisted.' } } ] },
  investmentSurge: { title: 'Foreign Investment Surge', body: 'EU pension funds commit £40bn to UK infrastructure.', tone: 'good',
    choices: [{ label: 'Direct to priority projects', effect: { growth: 0.3, blocs: { business: 6, professional: 4, northern: 4 }, log: 'Investment to rail, grid, housing.' } }] },
  exportBoom: { title: 'Export Surge', body: 'UK clean-tech exports hit a record.', tone: 'good',
    choices: [{ label: 'Capitalise on the moment', effect: { growth: 0.2, blocs: { business: 5, workingClass: 3, northern: 3 }, log: 'Trade boost feeding GDP.' } }] },
  productivityJump: { title: 'Productivity Surprise', body: 'ONS reports unexpected 1.2% productivity jump.', tone: 'good',
    choices: [{ label: 'Bank the windfall', effect: { growth: 0.4, blocs: { professional: 5, business: 4, middleClass: 3 }, log: 'Productivity gains feeding wages.' } }] },
  taxBeats: { title: 'Tax Receipts Beat Forecast', body: 'HMRC reports compliance improvement.', tone: 'good',
    choices: [
      { label: 'Apply to deficit reduction', effect: { debt: -4, blocs: { business: 2, professional: 2 }, log: 'Windfall to deficit.' } },
      { label: 'Apply to public services', effect: { healthIndex: 1, blocs: { workingClass: 4, publicSector: 4, ethnicMinority: 3 }, log: 'Windfall to services.' } } ] },
  demographicDividend: { title: 'Workforce Participation Up', body: 'Female labour participation at record high.', tone: 'good',
    choices: [{ label: 'Recognise and extend', effect: { growth: 0.2, blocs: { workingClass: 4, professional: 5, youth: 4 }, log: 'Childcare model extended.' } }] },
  tradeDeal: { title: 'Major Trade Agreement', body: 'A new trade agreement signed.', tone: 'good',
    choices: [{ label: 'Celebrate', effect: { growth: 0.2, blocs: { business: 6, professional: 4, middleClass: 3 }, log: 'Trade deal boosting confidence.' } }] },
};

function makeCommittedSnapshot(s) {
  return {
    taxIncomeAdd: s.taxIncomeAdd, taxIncomeHigh: s.taxIncomeHigh, taxIncomeBasic: s.taxIncomeBasic,
    taxCorp: s.taxCorp, taxVAT: s.taxVAT,
    spendNHS: s.spendNHS, spendEdu: s.spendEdu, spendWelfare: s.spendWelfare,
    spendDefence: s.spendDefence, spendInfra: s.spendInfra, spendLocal: s.spendLocal,
    revenue: calcRevenue(s), spending: calcSpending(s), balance: calcBalance(s),
    blocSupport: { ...s.blocSupport }, blocWeights: { ...s.blocWeights },
    coalitionCohesion: calcCoalitionCohesion(s.blocSupport, s.blocWeights),
    overallApproval: calcOverallApproval(s.blocSupport, s.blocWeights),
    growth: s.growth, gini: s.gini, healthIndex: s.healthIndex, bondYield: s.bondYield,
    debt: s.debt, gdp: s.gdp, realGDP: s.realGDP, population: s.population,
  };
}

// =============================================================================
// UI
// =============================================================================

function Slider({ label, value, min, max, step, onChange, format, tooltip, baseline, committed, unit }) {
  const isChanged = value !== baseline;
  const diff = committed !== undefined && value !== committed ? value - committed : null;
  return (
    <div className="mb-4">
      <div className="flex justify-between items-baseline mb-1.5">
        <label className="text-[13px] font-medium text-stone-200">{label}</label>
        <div className="flex items-baseline gap-2">
          <span className={`text-sm font-semibold tabular-nums ${isChanged ? 'text-amber-400' : 'text-stone-400'}`}
                style={{fontFamily: 'IBM Plex Mono'}}>
            {format ? format(value) : value}{unit}
          </span>
          {diff !== null && diff !== 0 && (
            <span className={`text-[10px] tabular-nums ${diff > 0 ? 'text-amber-400' : 'text-sky-400'}`}
                  style={{fontFamily: 'IBM Plex Mono'}}>
              ({diff > 0 ? '+' : ''}{diff})
            </span>
          )}
        </div>
      </div>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full h-1.5 bg-stone-700 rounded-full appearance-none cursor-pointer" />
      {tooltip && <div className="text-[11px] text-stone-500 mt-1 leading-snug">{tooltip}</div>}
    </div>
  );
}

function BlocBar({ blocId, support, isCoalition, weight, projectedDelta }) {
  const bloc = BLOCS[blocId];
  const color = support > 50 ? 'bg-emerald-500' : support > 35 ? 'bg-amber-500' : 'bg-rose-500';
  return (
    <div className={`p-2 rounded ${isCoalition ? 'bg-amber-950/20 border border-amber-900/30' : 'bg-stone-900/30'}`}>
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-1.5 min-w-0">
          {isCoalition && <div className="w-1.5 h-1.5 rounded-full bg-amber-500 flex-shrink-0" />}
          <span className="text-[11px] text-stone-300 truncate">{bloc.name}</span>
          <span className="text-[9px] text-stone-600" style={{fontFamily: 'IBM Plex Mono'}}>{(weight*100).toFixed(0)}%</span>
        </div>
        <div className="flex items-baseline gap-1.5 flex-shrink-0">
          <span className="text-[11px] text-stone-400" style={{fontFamily: 'IBM Plex Mono'}}>{Math.round(support)}%</span>
          {projectedDelta !== undefined && Math.abs(projectedDelta) >= 0.3 && (
            <span className={`text-[9px] ${projectedDelta > 0 ? 'text-emerald-400' : 'text-rose-400'}`} style={{fontFamily: 'IBM Plex Mono'}}>
              {projectedDelta > 0 ? '↗' : '↘'}{Math.abs(projectedDelta).toFixed(1)}
            </span>
          )}
        </div>
      </div>
      <div className="h-1 bg-stone-800 rounded-full overflow-hidden">
        <div className={`h-full ${color} transition-all`} style={{width: `${support}%`}} />
      </div>
    </div>
  );
}

function ReformCard({ id, reform, status, isProposed, onPropose, onUnpropose, canStart, currentQ, coalitionCohesion, onInspect }) {
  const isInProgress = status?.status === 'inProgress';
  const isComplete = status?.status === 'complete';
  const progress = isInProgress ? ((currentQ - status.startedQ) / reform.quarters) : 0;
  const meetsCoal = coalitionCohesion >= (reform.passReq?.coalition || 0);
  const ctrl = reform.controversial;

  return (
    <div className={`p-3 rounded-md border mb-2 transition-colors ${
      isComplete ? 'border-emerald-700/50 bg-emerald-950/15' :
      isInProgress ? 'border-amber-700/50 bg-amber-950/15' :
      isProposed ? 'border-sky-700/60 bg-sky-950/20' :
      canStart && meetsCoal ? 'border-stone-700 bg-stone-900/40' :
      'border-stone-800 bg-stone-950/40 opacity-60'
    }`}>
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5">
            {isComplete && <CheckCircle2 size={11} className="text-emerald-500 flex-shrink-0" />}
            {isInProgress && <Clock size={11} className="text-amber-500 flex-shrink-0" />}
            {isProposed && <ArrowRight size={11} className="text-sky-400 flex-shrink-0" />}
            {!isComplete && !isInProgress && !isProposed && !canStart && <Lock size={11} className="text-stone-600 flex-shrink-0" />}
            {ctrl && !isComplete && !isInProgress && !isProposed && <AlertCircle size={10} className="text-amber-500 flex-shrink-0" title="Contested policy" />}
            <span className={`text-[12px] font-semibold ${
              isComplete ? 'text-emerald-300' :
              isInProgress ? 'text-amber-300' :
              isProposed ? 'text-sky-300' : 'text-stone-200'
            }`}>{reform.name}</span>
          </div>
          <div className="text-[10px] text-stone-500 leading-snug">{reform.blurb}</div>
        </div>
      </div>
      {isInProgress && (
        <div className="mb-2">
          <div className="h-1 bg-stone-800 rounded-full overflow-hidden">
            <div className="h-full bg-amber-500" style={{width: `${progress * 100}%`}} />
          </div>
          <div className="text-[10px] text-stone-500 mt-1">
            {reform.quarters - (currentQ - status.startedQ)}Q remaining of {reform.quarters}Q
          </div>
        </div>
      )}
      {isProposed && (
        <div className="mb-2 flex items-center justify-between bg-sky-950/30 rounded px-2 py-1">
          <span className="text-[10px] text-sky-300">Queued — starts next quarter</span>
          <button onClick={onUnpropose} className="text-[10px] text-sky-300 hover:text-sky-200 flex items-center gap-1">
            <Undo2 size={9} /> Undo
          </button>
        </div>
      )}
      {!isComplete && !isInProgress && !isProposed && (
        <div className="flex items-center justify-between mt-2 pt-2 border-t border-stone-800">
          <div className="text-[10px] text-stone-500">
            £{reform.cost}bn · {reform.quarters}Q
            {reform.passReq?.coalition && (
              <span className={meetsCoal ? 'text-stone-500 ml-2' : 'text-rose-500 ml-2'}>
                · {reform.passReq.coalition}% coal.
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            <button onClick={onInspect} className="text-stone-500 hover:text-stone-300">
              <Eye size={12} />
            </button>
            <button onClick={onPropose} disabled={!canStart || !meetsCoal}
              className="text-[11px] font-semibold px-3 py-1 rounded bg-amber-600 hover:bg-amber-500 disabled:bg-stone-800 disabled:text-stone-600 text-stone-950">
              Propose
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// =============================================================================
// MAIN
// =============================================================================

export default function ChancellorSim() {
  const [game, setGame] = useState(INITIAL);
  const [tab, setTab] = useState('overview');
  const [showIntro, setShowIntro] = useState(true);
  const [showFinal, setShowFinal] = useState(false);
  const [showReelect, setShowReelect] = useState(false);
  const [inspectReform, setInspectReform] = useState(null);
  const [showSurplusAlloc, setShowSurplusAlloc] = useState(false);
  const [surplusAllocations, setSurplusAllocations] = useState({});

  useEffect(() => {
    try {
      const saved = localStorage.getItem('chancellor_v6_save');
      if (saved) {
        setGame(JSON.parse(saved));
        setShowIntro(false);
      }
    } catch (e) {}
  }, []);

  useEffect(() => {
    if (game.quarter > 1 || Object.keys(game.reforms).length > 0 || game.proposedReforms.length > 0) {
      try { localStorage.setItem('chancellor_v6_save', JSON.stringify(game)); } catch (e) {}
    }
  }, [game]);

  const overallApproval = useMemo(() => calcOverallApproval(game.blocSupport, game.blocWeights), [game.blocSupport, game.blocWeights]);
  const coalitionCohesion = useMemo(() => calcCoalitionCohesion(game.blocSupport, game.blocWeights), [game.blocSupport, game.blocWeights]);
  const balance = useMemo(() => calcBalance(game), [game]);
  const revenue = useMemo(() => calcRevenue(game), [game]);
  const spending = useMemo(() => calcSpending(game), [game]);
  const riskMods = useMemo(() => computeRiskMods(game), [game]);
  const projectedDeltas = useMemo(() => quarterlyBlocDelta(game), [game]);
  const deficit = -balance;
  const deficitGDP = deficit / game.gdp * 100;
  const debtRatio = (game.debt / game.gdp * 100).toFixed(0);
  const committed = game.committed;
  const yearQ = ((game.quarter - 1) % 4) + 1;
  const yearInTerm = Math.ceil(game.quarter / 4);

  function set(patch) { setGame(g => ({ ...g, ...patch })); }
  function proposeReform(id) { setGame(g => ({ ...g, proposedReforms: [...g.proposedReforms, id] })); }
  function unproposeReform(id) { setGame(g => ({ ...g, proposedReforms: g.proposedReforms.filter(rid => rid !== id) })); }

  function rollEvents(s, mods) {
    const triggered = [];
    for (const [eventId, mod] of Object.entries(mods)) {
      if (!EVENT_DEFINITIONS[eventId]) continue;
      const qProb = mod / 4 / 100;
      if (Math.random() < qProb) triggered.push(eventId);
    }
    return triggered;
  }

  function advanceQuarter() {
    if (game.pendingEvent || game.pendingSummary || showReelect || showSurplusAlloc) return;

    const preBlocs = { ...game.blocSupport };
    const preCohesion = calcCoalitionCohesion(game.blocSupport, game.blocWeights);
    const preDebt = game.debt, preGrowth = game.growth, preGini = game.gini, preHealth = game.healthIndex;
    const preBalance = calcBalance(game);
    const prePopulation = game.population;
    const preWeights = { ...game.blocWeights };

    setGame(g => {
      let n = { ...g };

      // 1. Commit proposed reforms
      const startedReforms = [];
      for (const id of n.proposedReforms) {
        const reform = REFORMS[id];
        if (!reform) continue;
        n.reforms = { ...n.reforms, [id]: { status: 'inProgress', startedQ: n.globalQuarter, completesQ: n.globalQuarter + reform.quarters, reformDef: reform } };
        n.debt = n.debt + reform.cost;
        startedReforms.push(reform.name);
        n.log = [...n.log, { q: n.quarter, text: `Started: ${reform.name} (£${reform.cost}bn, ${reform.quarters}Q)` }];
      }
      n.proposedReforms = [];

      // 2. Apply quarterly bloc support deltas (from current policy stance)
      const deltas = quarterlyBlocDelta(n);
      const newBlocSupport = {};
      for (const [id, s] of Object.entries(n.blocSupport)) {
        newBlocSupport[id] = Math.max(0, Math.min(100, s + deltas[id]));
      }
      n.blocSupport = newBlocSupport;

      // 3. Population dynamics — bloc weights shift
      n.blocWeights = applyPopulationDynamics(n.blocWeights, n.reforms);

      // 4. Population growth — depends on immigration policy and natural increase
      let popGrowthQ = 0.15 / 4; // ~0.6% per year baseline (UK ~0.5-1.0%)
      if (n.reforms.immigrationCap?.status === 'complete') popGrowthQ -= 0.4 / 4;
      if (n.reforms.freeChildcare?.status === 'complete') popGrowthQ += 0.05 / 4;
      n.population = n.population * (1 + popGrowthQ / 100);

      // 5. Fiscal flow — deficit hits debt; surplus goes to allocation
      const qBalance = calcBalance(n) / 4;
      if (qBalance >= 0) {
        // surplus: hold for player allocation
        n.pendingSurplus = (n.pendingSurplus || 0) + qBalance;
      } else {
        // deficit: straight to debt
        n.debt = n.debt - qBalance; // qBalance is negative, so debt increases
      }

      // 6. GDP grows — nominal includes inflation, real strips it out
      n.gdp = n.gdp * (1 + (n.growth + n.inflation) / 100 / 4);
      n.realGDP = n.realGDP * (1 + n.growth / 100 / 4);

      // 7. Reform completions
      const completedReforms = [];
      for (const [id, r] of Object.entries(n.reforms)) {
        if (r.status === 'inProgress' && r.completesQ <= n.globalQuarter + 1) {
          const reform = REFORMS[id];
          // Sample actual outcome with forecast noise
          const actual = sampleReformOutcome(reform, n.forecastNoise);
          n.reforms[id] = { ...r, status: 'complete', actualOutcome: actual };

          if (actual.revBonus) n.revBonusFromReforms = (n.revBonusFromReforms || 0) + actual.revBonus;
          if (actual.ongoingCost) n.ongoingCostFromReforms = (n.ongoingCostFromReforms || 0) + actual.ongoingCost;
          if (actual.ongoingRev) n.ongoingRevFromReforms = (n.ongoingRevFromReforms || 0) + actual.ongoingRev;
          if (actual.healthBoost) n.healthIndex = Math.max(0, Math.min(100, n.healthIndex + actual.healthBoost));
          if (actual.growthBonus) n.growth = n.growth + actual.growthBonus;
          if (actual.gini) n.gini = n.gini + actual.gini;

          if (reform.blocEffects) {
            for (const [bloc, delta] of Object.entries(reform.blocEffects)) {
              n.blocSupport[bloc] = Math.max(0, Math.min(100, n.blocSupport[bloc] + delta));
            }
          }
          if (reform.special === 'reduceForecastNoise') n.forecastNoise = 0.10;

          completedReforms.push(reform.name);
          n.log = [...n.log, { q: n.quarter + 1, text: `✓ ${actual.log}` }];
        }
      }

      // 8. Bond yield
      const balYr = calcBalance(n);
      if (balYr < -200) n.bondYield = Math.min(10, n.bondYield + 0.08);
      else if (balYr < -100) n.bondYield = Math.min(10, n.bondYield + 0.02);
      else if (balYr > 0) n.bondYield = Math.max(2, n.bondYield - 0.06);
      else if (balYr > -50) n.bondYield = Math.max(2, n.bondYield - 0.03);

      // 9. Events
      const newMods = computeRiskMods(n);
      const triggered = rollEvents(n, newMods);
      let eventToShow = null;
      if (triggered.length > 0) {
        const eventId = triggered[Math.floor(Math.random() * triggered.length)];
        eventToShow = { id: eventId, ...EVENT_DEFINITIONS[eventId] };
      }

      // 10. Summary
      const blocChanges = {};
      for (const id of Object.keys(BLOCS)) {
        const change = n.blocSupport[id] - preBlocs[id];
        if (Math.abs(change) >= 0.3) blocChanges[id] = change;
      }
      const blocChangeArray = Object.entries(blocChanges).sort((a,b) => Math.abs(b[1]) - Math.abs(a[1]));

      const popChange = n.population - prePopulation;
      const weightChanges = {};
      for (const id of Object.keys(BLOCS)) {
        const wc = n.blocWeights[id] - preWeights[id];
        if (Math.abs(wc) >= 0.001) weightChanges[id] = wc;
      }

      n.pendingSummary = {
        quarter: n.quarter,
        debtChange: n.debt - preDebt,
        growthChange: n.growth - preGrowth,
        giniChange: n.gini - preGini,
        healthChange: n.healthIndex - preHealth,
        cohesionChange: calcCoalitionCohesion(n.blocSupport, n.blocWeights) - preCohesion,
        balanceChange: calcBalance(n) - preBalance,
        deficitGDP: -calcBalance(n) / n.gdp * 100,
        gdpChange: n.gdp - g.gdp,
        realGDPChange: n.realGDP - g.realGDP,
        populationChange: popChange,
        blocChanges: blocChangeArray.slice(0, 4),
        weightChanges: Object.entries(weightChanges).sort((a,b) => Math.abs(b[1]) - Math.abs(a[1])).slice(0, 3),
        startedReforms,
        completedReforms,
        eventPending: !!eventToShow,
        pendingSurplus: n.pendingSurplus,
        qBalance,
      };
      n.pendingEvent = eventToShow;

      n.quarter = n.quarter + 1;
      n.globalQuarter = n.globalQuarter + 1;
      n.committed = makeCommittedSnapshot(n);

      const newCoal = calcCoalitionCohesion(n.blocSupport, n.blocWeights);
      if (newCoal < 22) n.status = 'collapsed';
      else if (n.bondYield > 8) n.status = 'lost-markets';
      else if (n.quarter > TERM_LENGTH) {
        n.status = newCoal >= 38 ? 'election' : 'lost-election';
      }

      return n;
    });
  }

  useEffect(() => {
    if (game.status === 'election' && !game.pendingSummary && !game.pendingEvent && !showReelect) setShowReelect(true);
    if (['collapsed', 'lost-markets', 'lost-election'].includes(game.status) && !game.pendingSummary && !game.pendingEvent && !showFinal) setShowFinal(true);
  }, [game.status, game.pendingSummary, game.pendingEvent, showFinal, showReelect]);

  function continueAfterElection() {
    setGame(g => {
      const newBlocSupport = { ...g.blocSupport };
      for (const k of Object.keys(BLOCS)) {
        newBlocSupport[k] = newBlocSupport[k] * 0.7 + BLOCS[k].base * 0.3;
      }
      return {
        ...g, status: 'playing', quarter: 1, term: g.term + 1, termsWon: g.termsWon + 1,
        blocSupport: newBlocSupport, bondYield: Math.max(3.5, g.bondYield - 0.5),
        log: [...g.log, { q: 1, text: `🗳️ Re-elected for Term ${g.term + 1}.` }], committed: null,
      };
    });
    setShowReelect(false);
  }

  function resolveEvent(choice) {
    setGame(g => {
      let n = { ...g, pendingEvent: null };
      const eff = choice.effect;
      if (eff.debt) n.debt = n.debt + eff.debt;
      if (eff.growth) n.growth = n.growth + eff.growth;
      if (eff.inflation) n.inflation = Math.max(0, n.inflation + eff.inflation);
      if (eff.healthIndex) n.healthIndex = Math.max(0, Math.min(100, n.healthIndex + eff.healthIndex));
      if (eff.bondYield) n.bondYield = Math.max(2, n.bondYield + eff.bondYield);
      if (eff.blocs) {
        for (const [bloc, delta] of Object.entries(eff.blocs)) {
          n.blocSupport[bloc] = Math.max(0, Math.min(100, n.blocSupport[bloc] + delta));
        }
      }
      n.log = [...n.log, { q: g.quarter, text: `[Event] ${eff.log}` }];
      n.committed = makeCommittedSnapshot(n);
      return n;
    });
  }

  function dismissSummary() {
    // If there's a meaningful surplus pending, prompt allocation
    if (game.pendingSurplus >= 10) {
      setSurplusAllocations({ debt: game.pendingSurplus, services: 0, taxCut: 0 });
      setGame(g => ({ ...g, pendingSummary: null }));
      setShowSurplusAlloc(true);
    } else {
      // small surplus: silently pay down debt
      setGame(g => ({ ...g, pendingSummary: null, debt: g.debt - (g.pendingSurplus || 0), pendingSurplus: 0 }));
    }
  }

  function commitSurplusAllocation() {
    setGame(g => {
      const alloc = surplusAllocations;
      let n = { ...g };
      // Debt portion pays down debt
      n.debt = n.debt - (alloc.debt || 0);
      // Services portion is one-off spending — we'll model it as a temporary boost to health/bloc effects + debt unchanged
      if (alloc.services > 0) {
        n.healthIndex = Math.min(100, n.healthIndex + alloc.services / 8);
        n.blocSupport.workingClass = Math.min(100, n.blocSupport.workingClass + alloc.services / 10);
        n.blocSupport.publicSector = Math.min(100, n.blocSupport.publicSector + alloc.services / 12);
        n.blocSupport.pensioners = Math.min(100, n.blocSupport.pensioners + alloc.services / 14);
        n.log = [...n.log, { q: g.quarter, text: `Allocated £${alloc.services.toFixed(0)}bn surplus to public services.` }];
      }
      // Tax cut portion — applied as a one-off ongoing revenue reduction (proportional to magnitude)
      if (alloc.taxCut > 0) {
        n.ongoingRevFromReforms = (n.ongoingRevFromReforms || 0) - alloc.taxCut;
        n.blocSupport.middleClass = Math.min(100, n.blocSupport.middleClass + alloc.taxCut / 8);
        n.blocSupport.business = Math.min(100, n.blocSupport.business + alloc.taxCut / 6);
        n.blocSupport.professional = Math.min(100, n.blocSupport.professional + alloc.taxCut / 10);
        n.log = [...n.log, { q: g.quarter, text: `Allocated £${alloc.taxCut.toFixed(0)}bn surplus to ongoing tax cuts.` }];
      }
      if (alloc.debt > 0) {
        n.log = [...n.log, { q: g.quarter, text: `Paid down £${alloc.debt.toFixed(0)}bn of national debt.` }];
      }
      n.pendingSurplus = 0;
      n.committed = makeCommittedSnapshot(n);
      return n;
    });
    setShowSurplusAlloc(false);
    setSurplusAllocations({});
  }

  function reset() {
    try { localStorage.removeItem('chancellor_v6_save'); } catch (e) {}
    setGame(INITIAL); setShowIntro(true); setShowFinal(false); setShowReelect(false); setTab('overview');
  }

  const fmtSigned = (n) => (n >= 0 ? '+' : '\u2212') + (Math.abs(n) >= 1000 ? `£${(Math.abs(n)/1000).toFixed(1)}tn` : `£${Math.abs(n).toFixed(0)}bn`);

  function canStartReform(id) {
    const reform = REFORMS[id];
    if (game.reforms[id]) return false;
    if (game.proposedReforms.includes(id)) return false;
    return reform.prereq.every(p => game.reforms[p]?.status === 'complete');
  }

  const balanceDiff = committed ? balance - committed.balance : null;
  const cohesionDiff = committed ? coalitionCohesion - committed.coalitionCohesion : null;

  // Projected outcome for the inspect panel (with uncertainty bands)
  const inspectProjection = inspectReform ? projectReformOutcome(inspectReform, game.forecastNoise) : null;

  return (
    <div className="min-h-screen text-stone-100" style={{
      background: 'radial-gradient(ellipse at top, #2a2418 0%, #14110c 60%, #0d0b08 100%)',
      fontFamily: 'IBM Plex Sans, sans-serif'
    }}>
      <style>{FONT_LINK}</style>
      <style>{`
        input[type=range]::-webkit-slider-thumb {
          appearance: none; width: 18px; height: 18px; border-radius: 50%;
          background: #d97706; cursor: pointer; border: 2px solid #1c1a14;
        }
        input[type=range]::-moz-range-thumb {
          width: 18px; height: 18px; border-radius: 50%;
          background: #d97706; cursor: pointer; border: 2px solid #1c1a14;
        }
        .display-font { font-family: 'Fraunces', Georgia, serif; }
      `}</style>

      {showIntro && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-end sm:items-center justify-center p-4">
          <div className="bg-stone-950 border border-amber-900/40 rounded-t-2xl sm:rounded-2xl max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center gap-2 mb-3">
              <Crown size={20} className="text-amber-500" />
              <div className="text-[10px] uppercase tracking-[0.2em] text-amber-500">HM Treasury · Q1 2026</div>
            </div>
            <h1 className="display-font text-3xl font-medium leading-tight mb-3">
              You are the<br/><span className="italic text-amber-400">Chancellor</span>.
            </h1>
            <p className="text-stone-300 text-[13px] leading-relaxed mb-3">
              Twenty quarters (5 years) to the next election. Win it and continue. Lose your coalition, and resign.
            </p>
            <div className="space-y-2 text-[12px] text-stone-400 mb-5">
              <div className="flex gap-2"><span className="text-amber-500">·</span> <strong>Three win paths:</strong> annual surplus, deficit below 2% of GDP, or hold the coalition through the election.</div>
              <div className="flex gap-2"><span className="text-amber-500">·</span> Reform projections come with <strong>±25% uncertainty</strong>. Pass OBR Independence early to narrow the bands.</div>
              <div className="flex gap-2"><span className="text-amber-500">·</span> Voter bloc populations <strong>shift over time</strong> based on demographics and immigration policy.</div>
              <div className="flex gap-2"><span className="text-amber-500">·</span> Watch for <AlertCircle size={11} className="inline text-amber-500" /> — contested policies with disputed evidence.</div>
            </div>
            <button onClick={() => setShowIntro(false)}
                    className="w-full bg-amber-600 hover:bg-amber-500 text-stone-950 font-semibold py-3 rounded-md flex items-center justify-center gap-2">
              Take Office <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}

      {inspectReform && (
        <div className="fixed inset-0 z-40 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-3"
             onClick={() => setInspectReform(null)}>
          <div className="bg-stone-950 border-2 border-stone-700 rounded-t-2xl sm:rounded-2xl max-w-md w-full p-5 max-h-[90vh] overflow-y-auto"
               onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between mb-3">
              <div>
                <div className="text-[10px] uppercase tracking-[0.2em] text-amber-500 mb-1">{REFORM_BRANCHES[inspectReform.branch]}</div>
                <div className="flex items-center gap-1.5">
                  <h2 className="display-font text-xl font-medium leading-tight">{inspectReform.name}</h2>
                  {inspectReform.controversial && <AlertCircle size={14} className="text-amber-500" />}
                </div>
              </div>
              <button onClick={() => setInspectReform(null)} className="text-stone-500"><X size={16} /></button>
            </div>
            <p className="text-stone-300 text-[12px] leading-relaxed mb-3">{inspectReform.blurb}</p>
            {inspectReform.source && (
              <div className="bg-stone-900/60 rounded p-2 mb-3">
                <div className="text-[9px] uppercase tracking-wider text-stone-500 mb-1">Evidence Base</div>
                <div className="text-[11px] text-stone-300 italic leading-snug">{inspectReform.source}</div>
              </div>
            )}
            <div className="grid grid-cols-2 gap-2 mb-3">
              <div className="bg-stone-900/40 rounded p-2">
                <div className="text-[9px] uppercase tracking-wider text-stone-500">Upfront</div>
                <div className="text-sm font-semibold text-stone-200" style={{fontFamily: 'IBM Plex Mono'}}>£{inspectReform.cost}bn</div>
              </div>
              <div className="bg-stone-900/40 rounded p-2">
                <div className="text-[9px] uppercase tracking-wider text-stone-500">Duration</div>
                <div className="text-sm font-semibold text-stone-200" style={{fontFamily: 'IBM Plex Mono'}}>{inspectReform.quarters}Q</div>
              </div>
            </div>
            {inspectProjection && Object.keys(inspectProjection).length > 0 && (
              <div className="mb-3">
                <div className="text-[9px] uppercase tracking-wider text-stone-500 mb-1.5">Projected Outcome <span className="text-stone-600 normal-case">(±{(game.forecastNoise*100).toFixed(0)}% uncertainty)</span></div>
                <div className="space-y-1 text-[11px]" style={{fontFamily: 'IBM Plex Mono'}}>
                  {inspectProjection.revBonus && <div><span className="text-stone-400">Revenue:</span> <span className="text-emerald-400">+£{inspectProjection.revBonus.low.toFixed(1)} to +£{inspectProjection.revBonus.high.toFixed(1)}bn pa</span></div>}
                  {inspectProjection.ongoingRev && <div><span className="text-stone-400">Ongoing revenue:</span> <span className={inspectProjection.ongoingRev.mid > 0 ? 'text-emerald-400' : 'text-rose-400'}>{inspectProjection.ongoingRev.low.toFixed(1)} to {inspectProjection.ongoingRev.high.toFixed(1)}bn pa</span></div>}
                  {inspectProjection.ongoingCost && <div><span className="text-stone-400">Ongoing cost:</span> <span className="text-rose-400">£{inspectProjection.ongoingCost.low.toFixed(1)} to £{inspectProjection.ongoingCost.high.toFixed(1)}bn pa</span></div>}
                  {inspectProjection.growthBonus && <div><span className="text-stone-400">Growth:</span> <span className={inspectProjection.growthBonus.mid > 0 ? 'text-emerald-400' : 'text-rose-400'}>{inspectProjection.growthBonus.low.toFixed(2)} to {inspectProjection.growthBonus.high.toFixed(2)}pp</span></div>}
                  {inspectProjection.gini && <div><span className="text-stone-400">Gini:</span> <span className={inspectProjection.gini.mid < 0 ? 'text-emerald-400' : 'text-rose-400'}>{inspectProjection.gini.low.toFixed(2)} to {inspectProjection.gini.high.toFixed(2)}</span></div>}
                  {inspectProjection.healthBoost && <div><span className="text-stone-400">Health Index:</span> <span className={inspectProjection.healthBoost.mid > 0 ? 'text-emerald-400' : 'text-rose-400'}>{inspectProjection.healthBoost.low.toFixed(1)} to {inspectProjection.healthBoost.high.toFixed(1)}</span></div>}
                </div>
              </div>
            )}
            {inspectReform.onComplete?.populationEffects && (
              <div className="mb-3">
                <div className="text-[9px] uppercase tracking-wider text-stone-500 mb-1.5">Demographic Effects</div>
                <div className="space-y-1">
                  {Object.entries(inspectReform.onComplete.populationEffects).map(([bloc, rate]) => (
                    <div key={bloc} className="flex justify-between text-[11px]" style={{fontFamily: 'IBM Plex Mono'}}>
                      <span className="text-stone-400">{BLOCS[bloc].name}</span>
                      <span className={rate > 0 ? 'text-emerald-400' : 'text-rose-400'}>{rate > 0 ? '+' : ''}{rate}% / quarter</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {inspectReform.blocEffects && (
              <div>
                <div className="text-[9px] uppercase tracking-wider text-stone-500 mb-1.5">Immediate Bloc Reactions</div>
                <div className="space-y-1">
                  {Object.entries(inspectReform.blocEffects).sort((a,b) => b[1] - a[1]).map(([bloc, delta]) => (
                    <div key={bloc} className="flex justify-between text-[11px]" style={{fontFamily: 'IBM Plex Mono'}}>
                      <span className="text-stone-400">{BLOCS[bloc].name}</span>
                      <span className={delta > 0 ? 'text-emerald-400' : 'text-rose-400'}>{delta > 0 ? '+' : ''}{delta}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {game.pendingSummary && !showIntro && (
        <div className="fixed inset-0 z-40 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-3">
          <div className="bg-stone-950 border-2 border-amber-900/60 rounded-t-2xl sm:rounded-2xl max-w-md w-full p-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center gap-2 mb-2">
              <Calendar size={14} className="text-amber-500" />
              <div className="text-[10px] uppercase tracking-[0.2em] text-amber-500">Quarter {game.pendingSummary.quarter} · Closing Report</div>
            </div>
            <h2 className="display-font text-2xl font-medium leading-tight mb-4"><span className="italic">A quarter, in review.</span></h2>

            <div className="space-y-2 mb-4">
              <div className="text-[10px] uppercase tracking-wider text-stone-500 mb-1">Economy</div>
              <div className="bg-stone-900/40 rounded p-3 space-y-2 text-[12px]" style={{fontFamily: 'IBM Plex Mono'}}>
                <div className="flex justify-between"><span className="text-stone-400">Real GDP change</span>
                  <span className={game.pendingSummary.realGDPChange > 0 ? 'text-emerald-400' : 'text-rose-400'}>
                    {game.pendingSummary.realGDPChange > 0 ? '+' : ''}£{game.pendingSummary.realGDPChange.toFixed(0)}bn
                  </span></div>
                <div className="flex justify-between"><span className="text-stone-400">Real growth</span>
                  <span className={game.growth > 1.5 ? 'text-emerald-400' : game.growth > 0 ? 'text-stone-300' : 'text-rose-400'}>
                    {game.growth.toFixed(2)}% pa
                  </span></div>
                <div className="flex justify-between"><span className="text-stone-400">Population</span>
                  <span className="text-stone-300">{game.population.toFixed(1)}m ({game.pendingSummary.populationChange > 0 ? '+' : ''}{(game.pendingSummary.populationChange * 1000).toFixed(0)}k)</span></div>
                <div className="flex justify-between"><span className="text-stone-400">Deficit / GDP</span>
                  <span className={game.pendingSummary.deficitGDP > 2 ? 'text-rose-400' : 'text-emerald-400'}>{game.pendingSummary.deficitGDP.toFixed(1)}%</span></div>
                <div className="flex justify-between"><span className="text-stone-400">Balance change</span>
                  <span className={game.pendingSummary.balanceChange > 0 ? 'text-emerald-400' : 'text-rose-400'}>
                    {game.pendingSummary.balanceChange > 0 ? '+' : ''}{game.pendingSummary.balanceChange.toFixed(0)}bn
                  </span></div>
                <div className="flex justify-between"><span className="text-stone-400">Coalition cohesion</span>
                  <span className={game.pendingSummary.cohesionChange > 0 ? 'text-emerald-400' : 'text-rose-400'}>
                    {game.pendingSummary.cohesionChange > 0 ? '+' : ''}{game.pendingSummary.cohesionChange.toFixed(1)}pp
                  </span></div>
                <div className="flex justify-between"><span className="text-stone-400">Health / Gini</span>
                  <span className="text-stone-300">
                    <span className={game.pendingSummary.healthChange > 0 ? 'text-emerald-400' : game.pendingSummary.healthChange < 0 ? 'text-rose-400' : ''}>{game.pendingSummary.healthChange > 0 ? '+' : ''}{game.pendingSummary.healthChange.toFixed(1)}</span>
                    {' / '}
                    <span className={game.pendingSummary.giniChange < 0 ? 'text-emerald-400' : game.pendingSummary.giniChange > 0 ? 'text-rose-400' : ''}>{game.pendingSummary.giniChange > 0 ? '+' : ''}{game.pendingSummary.giniChange.toFixed(2)}</span>
                  </span></div>
              </div>
            </div>

            {game.pendingSummary.blocChanges.length > 0 && (
              <div className="mb-4">
                <div className="text-[10px] uppercase tracking-wider text-stone-500 mb-2">Biggest Bloc Support Movements</div>
                <div className="space-y-1.5">
                  {game.pendingSummary.blocChanges.map(([id, change]) => (
                    <div key={id} className="flex items-center justify-between bg-stone-900/40 rounded px-2 py-1.5">
                      <span className="text-[11px] text-stone-300">{BLOCS[id].name}</span>
                      <span className={`text-[11px] font-mono ${change > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {change > 0 ? '+' : ''}{change.toFixed(1)}pp
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {game.pendingSummary.weightChanges.length > 0 && (
              <div className="mb-4">
                <div className="text-[10px] uppercase tracking-wider text-stone-500 mb-2">Demographic Shifts</div>
                <div className="space-y-1.5">
                  {game.pendingSummary.weightChanges.map(([id, change]) => (
                    <div key={id} className="flex items-center justify-between bg-stone-900/40 rounded px-2 py-1.5">
                      <span className="text-[11px] text-stone-300">{BLOCS[id].name}</span>
                      <span className={`text-[11px] font-mono ${change > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {change > 0 ? '+' : ''}{(change*100).toFixed(2)}% share
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {(game.pendingSummary.startedReforms.length > 0 || game.pendingSummary.completedReforms.length > 0) && (
              <div className="mb-4">
                <div className="text-[10px] uppercase tracking-wider text-stone-500 mb-2">Reform Programme</div>
                <div className="space-y-1">
                  {game.pendingSummary.completedReforms.map(name => (
                    <div key={name} className="flex items-center gap-1.5 text-[11px] text-emerald-300">
                      <CheckCircle2 size={10} /> Delivered: {name}
                    </div>
                  ))}
                  {game.pendingSummary.startedReforms.map(name => (
                    <div key={name} className="flex items-center gap-1.5 text-[11px] text-sky-300">
                      <ArrowRight size={10} /> Started: {name}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {game.pendingSummary.eventPending && (
              <div className="bg-rose-950/30 border border-rose-900/40 rounded p-2 mb-4">
                <div className="text-[11px] text-rose-300 flex items-center gap-1.5">
                  <AlertTriangle size={11} /> A situation requires your attention.
                </div>
              </div>
            )}

            <button onClick={dismissSummary}
                    className="w-full bg-amber-600 hover:bg-amber-500 text-stone-950 font-semibold py-2.5 rounded-md flex items-center justify-center gap-2 text-sm">
              Continue <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}

      {game.pendingEvent && !showIntro && !game.pendingSummary && !showSurplusAlloc && (
        <div className="fixed inset-0 z-40 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-3">
          <div className="bg-stone-950 border-2 rounded-t-2xl sm:rounded-2xl max-w-md w-full p-5"
               style={{borderColor: game.pendingEvent.tone === 'good' ? '#15803d' : game.pendingEvent.tone === 'bad' ? '#9f1239' : '#78350f'}}>
            <div className="flex items-center gap-2 mb-3">
              <div className={`w-2 h-2 rounded-full animate-pulse ${
                game.pendingEvent.tone === 'good' ? 'bg-emerald-500' : game.pendingEvent.tone === 'bad' ? 'bg-rose-500' : 'bg-amber-500'
              }`} />
              <div className="text-[10px] uppercase tracking-[0.2em]" style={{
                color: game.pendingEvent.tone === 'good' ? '#34d399' : game.pendingEvent.tone === 'bad' ? '#fb7185' : '#fbbf24'
              }}>
                {game.pendingEvent.tone === 'good' ? 'Opportunity' : game.pendingEvent.tone === 'bad' ? 'Crisis' : 'Dispatch'}
              </div>
            </div>
            <h2 className="display-font text-2xl font-medium leading-tight mb-3">{game.pendingEvent.title}</h2>
            <p className="text-stone-300 text-[13px] leading-relaxed mb-5">{game.pendingEvent.body}</p>
            <div className="space-y-2">
              {game.pendingEvent.choices.map((c, i) => (
                <button key={i} onClick={() => resolveEvent(c)}
                        className="w-full text-left bg-stone-900 hover:bg-stone-800 border border-stone-700 hover:border-amber-700 transition-all p-3 rounded-md">
                  <div className="text-[13px] font-medium text-stone-100">{c.label}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {showReelect && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-end sm:items-center justify-center p-4">
          <div className="bg-stone-950 border-2 border-amber-700 rounded-t-2xl sm:rounded-2xl max-w-md w-full p-6">
            <div className="text-[10px] uppercase tracking-[0.2em] text-amber-500 mb-2">Election Night</div>
            <h2 className="display-font text-3xl font-medium italic mb-3 text-amber-300">Returned with a mandate.</h2>
            <p className="text-stone-300 text-[13px] leading-relaxed mb-4">
              Your coalition held. Term {game.term + 1} begins. Markets ease on the honeymoon.
            </p>
            <div className="bg-stone-900 rounded-md p-3 mb-4 space-y-1 text-[12px]" style={{fontFamily: 'IBM Plex Mono'}}>
              <div className="flex justify-between"><span className="text-stone-500">Coalition</span><span>{coalitionCohesion.toFixed(0)}%</span></div>
              <div className="flex justify-between"><span className="text-stone-500">Annual balance</span><span>{fmtSigned(balance)}</span></div>
              <div className="flex justify-between"><span className="text-stone-500">Deficit / GDP</span><span>{deficitGDP.toFixed(1)}%</span></div>
              <div className="flex justify-between"><span className="text-stone-500">Reforms delivered</span><span>{Object.values(game.reforms).filter(r => r.status === 'complete').length}</span></div>
            </div>
            {deficitGDP < 2 && balance < 0 && (
              <div className="bg-emerald-950/30 border border-emerald-800 rounded p-2 mb-4">
                <div className="text-[11px] text-emerald-300">🏛️ Deficit below 2% of GDP — sustainable territory.</div>
              </div>
            )}
            {balance > 0 && (
              <div className="bg-emerald-950/30 border border-emerald-800 rounded p-2 mb-4">
                <div className="text-[11px] text-emerald-300">📈 Annual surplus. The books are in the black.</div>
              </div>
            )}
            <button onClick={continueAfterElection}
                    className="w-full bg-amber-600 hover:bg-amber-500 text-stone-950 font-semibold py-3 rounded-md flex items-center justify-center gap-2">
              Begin Term {game.term + 1} <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}

      {showSurplusAlloc && (
        <div className="fixed inset-0 z-45 bg-black/85 backdrop-blur-sm flex items-end sm:items-center justify-center p-4">
          <div className="bg-stone-950 border-2 border-emerald-800 rounded-t-2xl sm:rounded-2xl max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="text-[10px] uppercase tracking-[0.2em] text-emerald-400 mb-2">Treasury Allocation</div>
            <h2 className="display-font text-2xl font-medium italic mb-2 text-emerald-300">A surplus of £{game.pendingSurplus.toFixed(0)}bn.</h2>
            <p className="text-stone-300 text-[12px] leading-relaxed mb-4">
              You closed the quarter in surplus. How do you want to allocate it? Drag the sliders — total must equal £{game.pendingSurplus.toFixed(0)}bn.
            </p>

            <div className="space-y-4 mb-4">
              <div>
                <div className="flex justify-between mb-1">
                  <label className="text-[12px] text-stone-200">Pay down debt</label>
                  <span className="text-[12px] font-semibold text-emerald-400" style={{fontFamily: 'IBM Plex Mono'}}>£{(surplusAllocations.debt || 0).toFixed(0)}bn</span>
                </div>
                <input type="range" min={0} max={game.pendingSurplus} step={1}
                  value={surplusAllocations.debt || 0}
                  onChange={(e) => {
                    const newDebt = parseFloat(e.target.value);
                    const remaining = game.pendingSurplus - newDebt;
                    const cur = surplusAllocations;
                    // proportionally split remaining between services and tax cut, preserving ratio
                    const totalOther = (cur.services || 0) + (cur.taxCut || 0);
                    if (totalOther > 0.01) {
                      const r = (cur.services || 0) / totalOther;
                      setSurplusAllocations({ debt: newDebt, services: remaining * r, taxCut: remaining * (1 - r) });
                    } else {
                      setSurplusAllocations({ debt: newDebt, services: remaining, taxCut: 0 });
                    }
                  }}
                  className="w-full h-1.5 bg-stone-700 rounded-full appearance-none cursor-pointer" />
                <div className="text-[10px] text-stone-500 mt-1">Reduces debt 1:1. Lowers ongoing interest costs. Markets approve.</div>
              </div>

              <div>
                <div className="flex justify-between mb-1">
                  <label className="text-[12px] text-stone-200">Boost public services (one-off)</label>
                  <span className="text-[12px] font-semibold text-sky-400" style={{fontFamily: 'IBM Plex Mono'}}>£{(surplusAllocations.services || 0).toFixed(0)}bn</span>
                </div>
                <input type="range" min={0} max={game.pendingSurplus} step={1}
                  value={surplusAllocations.services || 0}
                  onChange={(e) => {
                    const newServ = parseFloat(e.target.value);
                    const remaining = game.pendingSurplus - newServ;
                    const cur = surplusAllocations;
                    const totalOther = (cur.debt || 0) + (cur.taxCut || 0);
                    if (totalOther > 0.01) {
                      const r = (cur.debt || 0) / totalOther;
                      setSurplusAllocations({ services: newServ, debt: remaining * r, taxCut: remaining * (1 - r) });
                    } else {
                      setSurplusAllocations({ services: newServ, debt: remaining, taxCut: 0 });
                    }
                  }}
                  className="w-full h-1.5 bg-stone-700 rounded-full appearance-none cursor-pointer" />
                <div className="text-[10px] text-stone-500 mt-1">One-time boost to health & service-using blocs. Doesn't reduce debt.</div>
              </div>

              <div>
                <div className="flex justify-between mb-1">
                  <label className="text-[12px] text-stone-200">Permanent tax cuts</label>
                  <span className="text-[12px] font-semibold text-amber-400" style={{fontFamily: 'IBM Plex Mono'}}>£{(surplusAllocations.taxCut || 0).toFixed(0)}bn</span>
                </div>
                <input type="range" min={0} max={game.pendingSurplus} step={1}
                  value={surplusAllocations.taxCut || 0}
                  onChange={(e) => {
                    const newCut = parseFloat(e.target.value);
                    const remaining = game.pendingSurplus - newCut;
                    const cur = surplusAllocations;
                    const totalOther = (cur.debt || 0) + (cur.services || 0);
                    if (totalOther > 0.01) {
                      const r = (cur.debt || 0) / totalOther;
                      setSurplusAllocations({ taxCut: newCut, debt: remaining * r, services: remaining * (1 - r) });
                    } else {
                      setSurplusAllocations({ taxCut: newCut, debt: remaining, services: 0 });
                    }
                  }}
                  className="w-full h-1.5 bg-stone-700 rounded-full appearance-none cursor-pointer" />
                <div className="text-[10px] text-stone-500 mt-1">⚠ Permanent revenue reduction — eats into future surpluses. Business & middle class approve.</div>
              </div>
            </div>

            <div className="bg-stone-900 rounded-md p-2 mb-3 text-[11px]" style={{fontFamily: 'IBM Plex Mono'}}>
              <div className="flex justify-between"><span className="text-stone-500">Total allocated</span><span>£{((surplusAllocations.debt||0)+(surplusAllocations.services||0)+(surplusAllocations.taxCut||0)).toFixed(1)}bn</span></div>
              <div className="flex justify-between"><span className="text-stone-500">Surplus available</span><span>£{game.pendingSurplus.toFixed(1)}bn</span></div>
            </div>

            <button onClick={commitSurplusAllocation}
                    className="w-full bg-amber-600 hover:bg-amber-500 text-stone-950 font-semibold py-3 rounded-md flex items-center justify-center gap-2">
              Commit Allocation <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}

      {showFinal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-end sm:items-center justify-center p-4">
          <div className="bg-stone-950 border-2 rounded-t-2xl sm:rounded-2xl max-w-md w-full p-6" style={{borderColor: '#9f1239'}}>
            <div className="text-[10px] uppercase tracking-[0.2em] mb-2 text-rose-400">Out of Office</div>
            <h2 className="display-font text-3xl font-medium italic mb-4 text-rose-300">
              {game.status === 'lost-election' ? 'Defeated at the Ballot.' :
               game.status === 'collapsed' ? 'Coalition Collapsed.' :
               game.status === 'lost-markets' ? 'Markets Revolted.' : 'A Difficult End.'}
            </h2>
            <p className="text-stone-300 text-[13px] leading-relaxed mb-4">
              {game.status === 'lost-election' && `Election night. Your coalition fragmented (${coalitionCohesion.toFixed(0)}%, needed 38%).`}
              {game.status === 'collapsed' && 'Your coalition has lost confidence.'}
              {game.status === 'lost-markets' && 'Bond yields surged past 8%.'}
            </p>
            <div className="bg-stone-900 rounded-md p-3 mb-4 space-y-1 text-[12px]" style={{fontFamily: 'IBM Plex Mono'}}>
              <div className="flex justify-between"><span className="text-stone-500">Terms served</span><span>{game.termsWon}</span></div>
              <div className="flex justify-between"><span className="text-stone-500">Quarters in office</span><span>{game.termsWon * 20 + game.quarter - 1}</span></div>
              <div className="flex justify-between"><span className="text-stone-500">Final balance</span><span>{fmtSigned(balance)}</span></div>
              <div className="flex justify-between"><span className="text-stone-500">Reforms delivered</span><span>{Object.values(game.reforms).filter(r => r.status === 'complete').length}</span></div>
            </div>
            <button onClick={reset}
                    className="w-full bg-amber-600 hover:bg-amber-500 text-stone-950 font-semibold py-3 rounded-md flex items-center justify-center gap-2">
              <RotateCcw size={16} /> Begin Again
            </button>
          </div>
        </div>
      )}

      <div className="sticky top-0 z-30 backdrop-blur-md border-b border-stone-800/60"
           style={{background: 'rgba(20, 17, 12, 0.92)'}}>
        <div className="max-w-md mx-auto px-4 pt-3 pb-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Crown size={14} className="text-amber-500" />
              <div className="text-[10px] uppercase tracking-[0.18em] text-stone-400">
                Term {game.term} · Y{yearInTerm} Q{yearQ} · {Math.max(0, TERM_LENGTH - game.quarter + 1)}Q to Election
              </div>
            </div>
            <button onClick={reset} className="text-stone-500 hover:text-stone-300"><RotateCcw size={13} /></button>
          </div>
          <div className="flex items-end justify-between mb-3">
            <div>
              <div className="text-[10px] uppercase tracking-wider text-stone-500 mb-0.5 flex items-center gap-2">
                Coalition Cohesion
                {cohesionDiff !== null && Math.abs(cohesionDiff) >= 0.1 && (
                  <span className={`text-[9px] ${cohesionDiff > 0 ? 'text-emerald-400' : 'text-rose-400'}`} style={{fontFamily: 'IBM Plex Mono'}}>
                    {cohesionDiff > 0 ? '+' : ''}{cohesionDiff.toFixed(1)}
                  </span>
                )}
              </div>
              <div className={`display-font text-3xl font-medium tabular-nums leading-none ${
                coalitionCohesion >= 38 ? 'text-emerald-400' : coalitionCohesion >= 28 ? 'text-amber-400' : 'text-rose-400'
              }`}>{coalitionCohesion.toFixed(0)}%</div>
              <div className="text-[10px] text-stone-500 mt-1">Overall {overallApproval.toFixed(0)}% · Floor 22%</div>
            </div>
            <div className="text-right">
              <div className="text-[10px] uppercase tracking-wider text-stone-500 mb-0.5 flex items-center justify-end gap-2">
                {balanceDiff !== null && Math.abs(balanceDiff) >= 0.5 && (
                  <span className={`text-[9px] ${balanceDiff > 0 ? 'text-emerald-400' : 'text-rose-400'}`} style={{fontFamily: 'IBM Plex Mono'}}>
                    {balanceDiff > 0 ? '+' : ''}{balanceDiff.toFixed(0)}
                  </span>
                )}
                Balance (annual)
              </div>
              <div className={`text-xl font-bold tabular-nums ${balance >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}
                   style={{fontFamily: 'IBM Plex Mono'}}>{fmtSigned(balance)}</div>
              <div className={`text-[10px] mt-0.5 ${deficitGDP < 2 ? 'text-emerald-400' : deficitGDP < 4 ? 'text-amber-400' : 'text-rose-400'}`}>
                {balance >= 0 ? 'Surplus' : `${deficitGDP.toFixed(1)}% deficit · Debt ${debtRatio}%`}
              </div>
            </div>
          </div>
          <div className="grid grid-cols-5 gap-1 text-center">
            <div>
              <div className="text-[9px] uppercase tracking-wider text-stone-500">GDP</div>
              <div className="text-[11px] font-semibold text-stone-200" style={{fontFamily: 'IBM Plex Mono'}}>£{(game.gdp/1000).toFixed(2)}tn</div>
            </div>
            <div>
              <div className="text-[9px] uppercase tracking-wider text-stone-500">Growth</div>
              <div className={`text-[11px] font-semibold ${game.growth > 1.5 ? 'text-emerald-400' : game.growth > 0 ? 'text-stone-200' : 'text-rose-400'}`}
                   style={{fontFamily: 'IBM Plex Mono'}}>{game.growth.toFixed(1)}%</div>
            </div>
            <div>
              <div className="text-[9px] uppercase tracking-wider text-stone-500">Pop</div>
              <div className="text-[11px] font-semibold text-stone-200" style={{fontFamily: 'IBM Plex Mono'}}>{game.population.toFixed(1)}m</div>
            </div>
            <div>
              <div className="text-[9px] uppercase tracking-wider text-stone-500">Gilts</div>
              <div className={`text-[11px] font-semibold ${game.bondYield < 4 ? 'text-emerald-400' : game.bondYield < 5.5 ? 'text-stone-200' : 'text-rose-400'}`}
                   style={{fontFamily: 'IBM Plex Mono'}}>{game.bondYield.toFixed(1)}%</div>
            </div>
            <div>
              <div className="text-[9px] uppercase tracking-wider text-stone-500">Gini</div>
              <div className={`text-[11px] font-semibold ${game.gini < 34 ? 'text-emerald-400' : game.gini < 36 ? 'text-stone-200' : 'text-rose-400'}`}
                   style={{fontFamily: 'IBM Plex Mono'}}>{game.gini.toFixed(1)}</div>
            </div>
          </div>
        </div>
        <div className="max-w-md mx-auto px-1 flex border-t border-stone-800/60 overflow-x-auto">
          {[
            {id: 'overview', label: 'Overview', icon: Users},
            {id: 'budget', label: 'Budget', icon: Receipt},
            {id: 'reforms', label: 'Reforms', icon: Hammer},
            {id: 'risks', label: 'Risks', icon: AlertTriangle},
            {id: 'ledger', label: 'Ledger', icon: FileText},
            {id: 'about', label: 'About', icon: BookOpen},
          ].map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
                    className={`flex-1 py-2.5 text-[11px] font-medium flex items-center justify-center gap-1 transition-colors border-b-2 ${
                      tab === t.id ? 'border-amber-500 text-amber-400' : 'border-transparent text-stone-500'
                    }`}>
              <t.icon size={11} /> {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 pt-5 pb-28">
        {tab === 'overview' && (
          <div>
            <div className="mb-5">
              <h2 className="display-font text-xl font-medium italic text-stone-100 mb-1">Voter Blocs</h2>
              <p className="text-[11px] text-stone-500">Population share (small grey) shifts each quarter. Arrows show projected support drift.</p>
            </div>
            <div className="space-y-1.5 mb-5">
              {Object.keys(BLOCS).map(id => (
                <BlocBar key={id} blocId={id} support={game.blocSupport[id]}
                         weight={game.blocWeights[id]}
                         isCoalition={COALITION.includes(id)}
                         projectedDelta={projectedDeltas[id]} />
              ))}
            </div>

            <div className="mb-5 p-3 bg-stone-900/40 border border-stone-800 rounded-lg">
              <div className="text-[10px] uppercase tracking-wider text-stone-500 mb-2">Bloc Notes</div>
              <div className="space-y-2">
                {Object.entries(BLOCS).map(([id, b]) => (
                  <div key={id} className="text-[11px]">
                    <span className="text-stone-300 font-medium">{b.name}:</span>
                    <span className="text-stone-500 ml-1">{b.note}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-4 bg-stone-900/40 border border-stone-800 rounded-lg">
              <div className="text-[10px] uppercase tracking-wider text-stone-500 mb-2">Recent Events</div>
              {game.log.length === 0 ? (
                <div className="text-[11px] text-stone-500 italic">No events yet — the country watches.</div>
              ) : (
                <div className="space-y-1.5">
                  {game.log.slice(-8).reverse().map((l, i) => (
                    <div key={i} className="text-[11px] text-stone-400 leading-snug">
                      <span className="text-amber-500 mr-2" style={{fontFamily: 'IBM Plex Mono'}}>Q{l.q}</span>{l.text}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {tab === 'budget' && (
          <div>
            <div className="mb-5">
              <h2 className="display-font text-xl font-medium italic text-stone-100 mb-1">Budget Levers</h2>
              <p className="text-[11px] text-stone-500">Revenue figures scale with GDP. Source IFS/HMRC ready-reckoner.</p>
            </div>
            <div className="bg-stone-900/40 rounded-lg border border-stone-800 p-4 mb-4">
              <div className="text-[10px] uppercase tracking-wider text-stone-500 mb-3">Income Tax</div>
              <Slider label="Basic rate" value={game.taxIncomeBasic} min={15} max={25} step={1}
                baseline={20} committed={committed?.taxIncomeBasic} onChange={(v) => set({taxIncomeBasic: v})} unit="%"
                tooltip="HMRC: 1pp ≈ £7.2bn. Hits ~30m taxpayers; major bloc impact." />
              <Slider label="Higher rate (£50,270+)" value={game.taxIncomeHigh} min={38} max={50} step={1}
                baseline={40} committed={committed?.taxIncomeHigh} onChange={(v) => set({taxIncomeHigh: v})} unit="%"
                tooltip="1pp ≈ £4.5bn. Middle class & professionals." />
              <Slider label="Additional rate (above £125,140)" value={game.taxIncomeAdd} min={40} max={60} step={1}
                baseline={45} committed={committed?.taxIncomeAdd} onChange={(v) => set({taxIncomeAdd: v})} unit="%"
                tooltip="1pp ≈ £0.9bn. Diamond-Saez revenue-max rate ≈ 73%." />
            </div>
            <div className="bg-stone-900/40 rounded-lg border border-stone-800 p-4 mb-4">
              <div className="text-[10px] uppercase tracking-wider text-stone-500 mb-3">Corporation Tax & VAT</div>
              <Slider label="Corporation Tax" value={game.taxCorp} min={19} max={35} step={1}
                baseline={25} committed={committed?.taxCorp} onChange={(v) => set({taxCorp: v})} unit="%"
                tooltip="1pp ≈ £4bn. Hope-Limberg (2022): cuts produce no growth over 50y." />
              <Slider label="VAT" value={game.taxVAT} min={15} max={25} step={1}
                baseline={20} committed={committed?.taxVAT} onChange={(v) => set({taxVAT: v})} unit="%"
                tooltip="1pp ≈ £8.5bn. Highly regressive." />
            </div>
            <div className="bg-stone-900/40 rounded-lg border border-stone-800 p-4">
              <div className="text-[10px] uppercase tracking-wider text-stone-500 mb-3">Departmental Spending</div>
              <Slider label="NHS & Health" value={game.spendNHS} min={170} max={240} step={5}
                baseline={200} committed={committed?.spendNHS} onChange={(v) => set({spendNHS: v})} unit="bn" format={(v)=>`£${v}`}
                tooltip="Below £200bn: strike risk + Marmot mortality effects." />
              <Slider label="Welfare" value={game.spendWelfare} min={260} max={330} step={5}
                baseline={300} committed={committed?.spendWelfare} onChange={(v) => set({spendWelfare: v})} unit="bn" format={(v)=>`£${v}`}
                tooltip="DWP ~£300bn (pensions + benefits)." />
              <Slider label="Education" value={game.spendEdu} min={75} max={110} step={5}
                baseline={90} committed={committed?.spendEdu} onChange={(v) => set({spendEdu: v})} unit="bn" format={(v)=>`£${v}`} />
              <Slider label="Local Gov" value={game.spendLocal} min={45} max={75} step={5}
                baseline={60} committed={committed?.spendLocal} onChange={(v) => set({spendLocal: v})} unit="bn" format={(v)=>`£${v}`}
                tooltip="Below £60bn: Section 114 risk." />
              <Slider label="Defence" value={game.spendDefence} min={45} max={80} step={5}
                baseline={55} committed={committed?.spendDefence} onChange={(v) => set({spendDefence: v})} unit="bn" format={(v)=>`£${v}`} />
              <Slider label="Infrastructure" value={game.spendInfra} min={20} max={70} step={5}
                baseline={35} committed={committed?.spendInfra} onChange={(v) => set({spendInfra: v})} unit="bn" format={(v)=>`£${v}`}
                tooltip="High multiplier (~1.4 per OBR)." />
            </div>
          </div>
        )}

        {tab === 'reforms' && (
          <div>
            <div className="mb-5">
              <h2 className="display-font text-xl font-medium italic text-stone-100 mb-1">Reform Programme</h2>
              <p className="text-[11px] text-stone-500">Tap eye icon for full details + uncertainty bands. <AlertCircle size={10} className="inline text-amber-500" /> marks contested evidence.</p>
            </div>
            {game.forecastNoise > 0.15 && (
              <div className="mb-4 p-2 bg-amber-950/20 border border-amber-900/30 rounded text-[11px] text-amber-300">
                Forecast uncertainty: ±{(game.forecastNoise*100).toFixed(0)}%. Pass <strong>OBR Independence</strong> to narrow this.
              </div>
            )}
            {game.proposedReforms.length > 0 && (
              <div className="mb-4 p-3 bg-sky-950/30 border border-sky-900/50 rounded-md">
                <div className="text-[10px] uppercase tracking-wider text-sky-400 mb-2">Queued for Next Quarter</div>
                <div className="text-[11px] text-sky-200">
                  Cost on commit: £{game.proposedReforms.reduce((sum, id) => sum + REFORMS[id].cost, 0).toFixed(1)}bn
                </div>
              </div>
            )}
            {Object.keys(REFORM_BRANCHES).map(branch => {
              const branchReforms = Object.entries(REFORMS).filter(([_, r]) => r.branch === branch);
              return (
                <div key={branch} className="mb-5">
                  <div className="text-[10px] uppercase tracking-wider text-amber-500 mb-2 font-semibold">{REFORM_BRANCHES[branch]}</div>
                  {branchReforms.map(([id, r]) => (
                    <ReformCard key={id} id={id} reform={r}
                                status={game.reforms[id]}
                                isProposed={game.proposedReforms.includes(id)}
                                onPropose={() => proposeReform(id)}
                                onUnpropose={() => unproposeReform(id)}
                                canStart={canStartReform(id)}
                                currentQ={game.globalQuarter}
                                coalitionCohesion={coalitionCohesion}
                                onInspect={() => setInspectReform(r)} />
                  ))}
                </div>
              );
            })}
          </div>
        )}

        {tab === 'risks' && (
          <div>
            <div className="mb-5">
              <h2 className="display-font text-xl font-medium italic text-stone-100 mb-1">Risk & Opportunity Register</h2>
              <p className="text-[11px] text-stone-500">Annual probabilities. Reforms and spending move these.</p>
            </div>
            <div className="mb-4">
              <div className="text-[10px] uppercase tracking-wider text-rose-400 mb-2">Crisis Risks</div>
              <div className="space-y-1.5">
                {['nhsStrike', 'energyShock', 'fuelPoverty', 'housingCrisis', 'councilBankruptcy', 'financialCrisis', 'generalStrike', 'careCrisis', 'flood', 'heatwave', 'allyCrisis', 'labourShortage']
                  .filter(k => riskMods[k] > 1).sort((a, b) => riskMods[b] - riskMods[a]).map(k => (
                  <div key={k} className="flex items-center justify-between bg-stone-900/40 rounded p-2">
                    <span className="text-[12px] text-stone-300">{EVENT_DEFINITIONS[k]?.title || k}</span>
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-1 bg-stone-800 rounded-full overflow-hidden">
                        <div className={`h-full ${riskMods[k] > 30 ? 'bg-rose-500' : riskMods[k] > 15 ? 'bg-amber-500' : 'bg-stone-600'}`}
                             style={{width: `${Math.min(100, riskMods[k] * 1.5)}%`}} />
                      </div>
                      <span className="text-[11px] font-mono text-stone-400 w-8 text-right">{Math.round(riskMods[k])}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wider text-emerald-400 mb-2">Opportunity Probabilities</div>
              <div className="space-y-1.5">
                {['investmentSurge', 'exportBoom', 'productivityJump', 'taxBeats', 'demographicDividend', 'tradeDeal']
                  .filter(k => riskMods[k] > 1).map(k => (
                  <div key={k} className="flex items-center justify-between bg-stone-900/40 rounded p-2">
                    <span className="text-[12px] text-stone-300">{EVENT_DEFINITIONS[k]?.title || k}</span>
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-1 bg-stone-800 rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-500" style={{width: `${Math.min(100, riskMods[k] * 1.5)}%`}} />
                      </div>
                      <span className="text-[11px] font-mono text-stone-400 w-8 text-right">{Math.round(riskMods[k])}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {tab === 'ledger' && (
          <div>
            <div className="mb-5">
              <h2 className="display-font text-xl font-medium italic text-stone-100 mb-1">Fiscal Position</h2>
              <p className="text-[11px] text-stone-500">Annualised. Revenue scales with nominal GDP.</p>
            </div>
            <div className="bg-stone-900/40 border border-stone-800 rounded-lg p-4 mb-4">
              <div className="text-[10px] uppercase tracking-wider text-stone-500 mb-3 flex justify-between">
                <span>Revenue (£bn pa)</span>
                {committed && <span className="text-stone-600">Last Q → Now</span>}
              </div>
              <div className="space-y-1.5 text-[12px]" style={{fontFamily: 'IBM Plex Mono'}}>
                {[
                  ['Income tax', revenue.incomeTax, committed?.revenue.incomeTax],
                  ['National Insurance', revenue.ni, committed?.revenue.ni],
                  ['Corporation tax', revenue.corpTax, committed?.revenue.corpTax],
                  ['VAT', revenue.vat, committed?.revenue.vat],
                  ['Other', revenue.other, committed?.revenue.other],
                  ['Reform receipts', revenue.reformBonus, committed?.revenue.reformBonus],
                ].filter(([_, v]) => v > 0).map(([label, cur, prev]) => (
                  <div key={label} className="flex justify-between">
                    <span className="text-stone-400">{label}</span>
                    <div className="flex items-baseline gap-2">
                      {prev !== undefined && Math.abs(cur - prev) >= 0.5 && (
                        <span className="text-stone-600 text-[10px]">{prev.toFixed(0)} →</span>
                      )}
                      <span className={cur !== prev && prev !== undefined ? (cur > prev ? 'text-emerald-400' : 'text-rose-400') : ''}>
                        {cur.toFixed(0)}
                      </span>
                    </div>
                  </div>
                ))}
                <div className="flex justify-between border-t border-stone-700 pt-1.5 mt-1.5 font-semibold">
                  <span>Total</span>
                  <div className="flex items-baseline gap-2">
                    {committed && Math.abs(revenue.total - committed.revenue.total) >= 0.5 && (
                      <span className="text-stone-600 text-[10px]">{committed.revenue.total.toFixed(0)} →</span>
                    )}
                    <span className="text-emerald-400">{revenue.total.toFixed(0)}</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="bg-stone-900/40 border border-stone-800 rounded-lg p-4 mb-4">
              <div className="text-[10px] uppercase tracking-wider text-stone-500 mb-3 flex justify-between">
                <span>Spending (£bn pa)</span>
                {committed && <span className="text-stone-600">Last Q → Now</span>}
              </div>
              <div className="space-y-1.5 text-[12px]" style={{fontFamily: 'IBM Plex Mono'}}>
                {[
                  ['Departmental', spending.departmental, committed?.spending.departmental],
                  ['Pensions + locked', spending.fixed, committed?.spending.fixed],
                  ['Reform ongoing', spending.reformOngoing, committed?.spending.reformOngoing],
                  ['Debt interest', spending.debtInterest, committed?.spending.debtInterest],
                ].filter(([_, v]) => v > 0).map(([label, cur, prev]) => (
                  <div key={label} className="flex justify-between">
                    <span className={label === 'Debt interest' ? 'text-rose-400' : 'text-stone-400'}>{label}</span>
                    <div className="flex items-baseline gap-2">
                      {prev !== undefined && Math.abs(cur - prev) >= 0.5 && (
                        <span className="text-stone-600 text-[10px]">{prev.toFixed(0)} →</span>
                      )}
                      <span className={cur !== prev && prev !== undefined ? (cur > prev ? 'text-rose-400' : 'text-emerald-400') : ''}>
                        {cur.toFixed(0)}
                      </span>
                    </div>
                  </div>
                ))}
                <div className="flex justify-between border-t border-stone-700 pt-1.5 mt-1.5 font-semibold">
                  <span>Total</span>
                  <div className="flex items-baseline gap-2">
                    {committed && Math.abs(spending.total - committed.spending.total) >= 0.5 && (
                      <span className="text-stone-600 text-[10px]">{committed.spending.total.toFixed(0)} →</span>
                    )}
                    <span className="text-rose-400">{spending.total.toFixed(0)}</span>
                  </div>
                </div>
              </div>
            </div>
            <div className={`border-2 rounded-lg p-4 ${balance >= 0 ? 'border-emerald-700 bg-emerald-950/20' : deficitGDP < 2 ? 'border-amber-700 bg-amber-950/20' : 'border-rose-900 bg-rose-950/20'}`}>
              <div className="text-[10px] uppercase tracking-wider mb-1 flex justify-between" style={{color: balance >= 0 ? '#34d399' : deficitGDP < 2 ? '#fbbf24' : '#fb7185'}}>
                <span>{balance >= 0 ? 'Surplus' : deficitGDP < 2 ? 'Sustainable Deficit' : 'Deficit'}</span>
                {balanceDiff !== null && Math.abs(balanceDiff) >= 0.5 && (
                  <span style={{color: balanceDiff > 0 ? '#34d399' : '#fb7185', fontFamily: 'IBM Plex Mono'}}>
                    {balanceDiff > 0 ? '+' : ''}{balanceDiff.toFixed(0)} vs Q{game.quarter - 1}
                  </span>
                )}
              </div>
              <div className={`display-font text-2xl font-medium ${balance >= 0 ? 'text-emerald-300' : deficitGDP < 2 ? 'text-amber-300' : 'text-rose-300'}`}>
                {fmtSigned(balance)}
              </div>
              <div className="text-[10px] text-stone-500 mt-1">
                {deficitGDP.toFixed(1)}% of GDP · GDP £{(game.gdp/1000).toFixed(2)}tn
                {deficitGDP < 2 && balance < 0 && ' · OBR-sustainable'}
              </div>
            </div>

            <div className="mt-4 bg-stone-900/40 border border-stone-800 rounded-lg p-4">
              <div className="text-[10px] uppercase tracking-wider text-stone-500 mb-3">National Debt</div>
              <div className="space-y-1.5 text-[12px]" style={{fontFamily: 'IBM Plex Mono'}}>
                <div className="flex justify-between"><span className="text-stone-400">Outstanding debt</span><span className="text-stone-200">£{(game.debt/1000).toFixed(2)}tn ({debtRatio}% GDP)</span></div>
                <div className="flex justify-between"><span className="text-stone-400">Gilt yield</span><span className="text-stone-200">{game.bondYield.toFixed(2)}%</span></div>
                <div className="flex justify-between"><span className="text-stone-400">Annual interest cost</span><span className="text-rose-400">£{spending.debtInterest.toFixed(0)}bn</span></div>
                {game.pendingSurplus > 0 && (
                  <div className="flex justify-between border-t border-stone-700 pt-1.5 mt-1.5"><span className="text-emerald-400">Pending surplus (unallocated)</span><span className="text-emerald-400">£{game.pendingSurplus.toFixed(0)}bn</span></div>
                )}
              </div>
              <div className="text-[10px] text-stone-500 mt-2 leading-snug">
                Every £1bn of debt at {game.bondYield.toFixed(1)}% gilt yield costs £{(game.bondYield*10).toFixed(0)}m in annual interest. Paying down debt reduces this drag on future budgets.
              </div>
            </div>
          </div>
        )}

        {tab === 'about' && (
          <div>
            <div className="mb-5">
              <h2 className="display-font text-xl font-medium italic text-stone-100 mb-1">About this simulation</h2>
              <p className="text-[11px] text-stone-500">A serious game about UK public finance. Numbers grounded where possible; designer judgement where not.</p>
            </div>

            <div className="bg-stone-900/40 border border-stone-800 rounded-lg p-4 mb-4">
              <div className="text-[10px] uppercase tracking-wider text-amber-500 mb-2">The premise</div>
              <p className="text-[12px] text-stone-300 leading-relaxed mb-2">
                You inherit the UK with a £140bn annual deficit and debt at 100% of GDP. Twenty quarters (five years) to the next election. Coalition cohesion is your binding constraint — fall below 22% and the government collapses. Bond yields above 8% and the markets take the keys.
              </p>
              <p className="text-[12px] text-stone-300 leading-relaxed">
                Three win conditions: an annual surplus, a deficit below 2% of GDP, or simply hold the coalition through the election. Re-elected Chancellors continue into a new term.
              </p>
            </div>

            <div className="bg-stone-900/40 border border-stone-800 rounded-lg p-4 mb-4">
              <div className="text-[10px] uppercase tracking-wider text-amber-500 mb-2">Methodological note</div>
              <p className="text-[12px] text-stone-300 leading-relaxed mb-2">
                Reform revenue and cost estimates carry ±25% noise (reduced to ±10% after passing OBR Independence) to reflect genuine forecasting uncertainty. Bloc reactions and event probabilities are designer judgements calibrated to feel right, not estimated from data.
              </p>
              <p className="text-[12px] text-stone-300 leading-relaxed">
                Where the literature is contested — rent controls, top-rate effects, immigration — the simulation reflects the contestation rather than picking a side.
              </p>
            </div>

            <div className="mb-3">
              <h3 className="display-font text-lg font-medium italic text-stone-100">Bibliography</h3>
            </div>

            {SOURCES.map(group => (
              <div key={group.section} className="mb-5">
                <div className="text-[10px] uppercase tracking-wider text-amber-500 mb-2 font-semibold">{group.section}</div>
                <div className="space-y-2">
                  {group.items.map((s, i) => (
                    <a key={i} href={s.url} target="_blank" rel="noopener noreferrer"
                       className="block bg-stone-900/40 hover:bg-stone-900/70 border border-stone-800 hover:border-amber-900/40 rounded-md p-3 transition-colors">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="text-[12px] font-medium text-stone-200 leading-snug">{s.title}</div>
                          <div className="text-[10px] text-stone-500 italic mt-0.5">{s.sub}</div>
                          {s.note && <div className="text-[11px] text-stone-400 mt-1.5 leading-snug">{s.note}</div>}
                        </div>
                        <ExternalLink size={11} className="text-stone-500 flex-shrink-0 mt-1" />
                      </div>
                    </a>
                  ))}
                </div>
              </div>
            ))}

            <div className="mt-6 p-3 bg-stone-900/40 border border-stone-800 rounded text-[11px] text-stone-500 leading-relaxed">
              This is a game that tries to be informative, not a forecasting tool. If you want forecasts, the <a href="https://obr.uk/" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:underline">OBR</a> is real and free.
            </div>
          </div>
        )}
      </div>

      {!showIntro && !showFinal && !showReelect && !showSurplusAlloc && !game.pendingEvent && !game.pendingSummary && (
        <div className="fixed bottom-0 left-0 right-0 z-20 backdrop-blur-md border-t border-stone-800/80 p-3"
             style={{background: 'rgba(20, 17, 12, 0.92)'}}>
          <div className="max-w-md mx-auto flex items-center gap-3">
            <div className="flex-1">
              <div className="text-[9px] uppercase tracking-wider text-stone-500">Quarter Status</div>
              <div className="text-[11px] text-stone-300">
                {game.proposedReforms.length > 0 && <span className="text-sky-400">{game.proposedReforms.length} queued · </span>}
                {Object.values(game.reforms).filter(r => r.status === 'inProgress').length} in flight ·
                {' '}{Object.values(game.reforms).filter(r => r.status === 'complete').length} delivered
              </div>
            </div>
            <button onClick={advanceQuarter}
                    className="bg-amber-600 hover:bg-amber-500 active:bg-amber-700 text-stone-950 font-semibold px-4 py-2.5 rounded-md flex items-center gap-1.5 text-sm">
              Next Quarter <ChevronRight size={15} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
