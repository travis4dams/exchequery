// =============================================================================
// REFORMS — every reform definition.
//
// Schema:
//   id: {
//     name: string,
//     branch: string,                // revenue | nhs | housing | green | education | labour | state
//     cost: { value, citationId },   // upfront £bn (paid on commit). Zero
//                                    // when a statutory/admin change is
//                                    // absorbed within existing departmental
//                                    // DEL — see statutory_no_upfront_judgement.
//                                    // Non-zero for capital programmes, new
//                                    // headcount, nationalisation buy-outs,
//                                    // pay settlements.
//     quarters: number,              // time to complete
//     prereq: string[],              // reform IDs that must be complete
//     excludesComplete?: string[],   // reform IDs whose completion PERMANENTLY
//                                    // blocks this one. Checked via
//                                    // getExclusionBlocker(); a blocked proposal
//                                    // is DISCARDED at the engine commit gate
//                                    // (not deferred onto next quarter).
//                                    // Symmetric by convention — if A excludes
//                                    // B then B should exclude A; covered by
//                                    // the symmetry test in reformExclusion.test.
//     passReq: { coalition: { value, citationId } },
//     capacityLoad: number,          // 1–8; how much reform-capacity this
//                                    // reform occupies while in flight or
//                                    // queued. Sum of loads must fit under
//                                    // calcReformCapacity(state).
//     blurb: string,                 // one-line description
//     citationId: string,            // primary citation for the reform's evidence base
//     controversial?: boolean,       // marks as contested
//     special?: string,              // e.g. 'reduceForecastNoise'
//     onComplete: {                  // effects when delivered
//       revBonus?: { value, citationId },
//       ongoingRev?: { value, citationId },
//       ongoingCost?: { value, citationId },
//       growthBonus?: { value, citationId },
//       gini?: { value, citationId },
//       healthBoost?: { value, citationId },
//       debt?: { value, citationId },        // one-shot £bn debt shock AT
//                                            // completion (distinct from
//                                            // upfront `cost`, paid at commit)
//       bondYield?: { value, citationId },   // one-shot pp bondYield bump AT
//                                            // completion; clamped by
//                                            // PARAMS.bondYield.ceiling
//       populationEffects?: { [blocId]: { value, citationId } },
//       log: string,
//     },
//     blocEffects?: { [blocId]: { value, citationId } },
//     riskMods?: { [eventId]: { value, citationId } },
//     growthBonusPermanent?: boolean, // see "Growth bonus semantics" below
//   }
//
// Growth bonus semantics:
//   onComplete.growthBonus is applied as a one-shot kick to state.growth on
//   completion. Mean reversion (gameStep.js step 6) pulls growth back toward
//   PARAMS.potentialGrowth + state.permanentGrowthShift each quarter, so
//   growthBonus is TRANSIENT by default and fades over ~4 quarters.
//
//   Set `growthBonusPermanent: true` for reforms that shift the production
//   frontier (supply-side, institutional). Their growthBonus is added to
//   state.permanentGrowthShift on completion, raising the long-run anchor
//   for mean reversion. Negative permanent values lower the anchor.
//
// FUTURE WORK (out of scope here): split reforms vs policies. Some passed
// reforms are really *policies* and should appear in a policy menu where
// they can be amended or repealed (e.g. wealth tax → tax-menu line item;
// rent controls → repealable policy). Others (e.g. setting the BoE
// inflation target) are once-a-generation and stay one-shot. Tax rates
// eventually become editable tables with custom bands. The
// growthBonusPermanent flag here is the seed of that distinction.
//
// To add a reform: append one entry here AND ensure citationId resolves in
// citations.js. No other code changes needed — the UI iterates this map.
// =============================================================================

import { CITATIONS } from './citations.js';

const cited = (value, citationId, opts) => {
  if (!CITATIONS[citationId]) {
    throw new Error(`reforms.js references missing citation: ${citationId}`);
  }
  const leaf = { value, citationId };
  if (opts && opts.band) {
    const b = opts.band;
    const low = typeof b.low === 'number' ? b.low : -(b.width ?? 0);
    const high = typeof b.high === 'number' ? b.high : (b.width ?? 0);
    if (!(low <= 0 && high >= 0)) {
      throw new Error(`reforms.js: band at ${citationId} must straddle zero (got low=${low}, high=${high})`);
    }
    leaf.band = { low, high, dist: b.dist || 'triangular' };
  }
  return leaf;
};

export const REFORMS = {
  // ===========================================================================
  // REVENUE branch
  // ===========================================================================
  hmrcCapacity: {
    name: 'HMRC Modernisation', branch: 'revenue',
    cost: cited(2, 'nao_hmrc_compliance'), quarters: 4, prereq: [], capacityLoad: 4,
    passReq: { coalition: cited(30, 'bloc_methodology') },
    politicalCapitalCost: cited(6, 'political_capital_authoring_methodology'),
    ideologyStance: { econ: -0.2, social: 0.0 },
    blurb: 'Reverse digitisation cuts; recruit compliance staff.',
    citationId: 'nao_hmrc_compliance',
    onComplete: {
      // NAO's historical compliance-yield estimates run tight: ±15% on the
      // headline (closer to a CT than an avoidance line).
      revBonus: cited(4, 'nao_hmrc_compliance', { band: { low: -0.15, high: 0.15 } }),
      log: 'HMRC modernised. Compliance up.',
    },
    blocEffects: {
      business: cited(-1, 'bloc_methodology'),
      professional: cited(1, 'bloc_methodology'),
    },
  },
  obrIndependence: {
    name: 'Strengthen OBR Independence', branch: 'revenue',
    cost: cited(0, 'statutory_no_upfront_judgement'), quarters: 3, prereq: [], capacityLoad: 3,
    passReq: { coalition: cited(30, 'bloc_methodology') },
    politicalCapitalCost: cited(4, 'political_capital_authoring_methodology'),
    ideologyStance: { econ: 0.0, social: 0.0 },
    blurb: 'Statutory pre-publication review of Treasury costings. Reduces forecast uncertainty.',
    citationId: 'obr_independence_judgement',
    onComplete: {
      log: 'OBR powers strengthened. Forecast bands narrowed materially.',
    },
    blocEffects: {
      professional: cited(4, 'bloc_methodology'),
      business: cited(3, 'bloc_methodology'),
      middleClass: cited(2, 'bloc_methodology'),
    },
    special: 'reduceForecastNoise',
  },
  cgtAlign: {
    name: 'Align CGT with Income Tax', branch: 'revenue',
    cost: cited(0, 'statutory_no_upfront_judgement'), quarters: 2, prereq: ['hmrcCapacity'], capacityLoad: 3,
    passReq: { coalition: cited(32, 'bloc_methodology') },
    politicalCapitalCost: cited(10, 'political_capital_authoring_methodology'),
    ideologyStance: { econ: -0.3, social: 0.0 },
    blurb: 'Close the entrepreneur loophole. Capital gains taxed as ordinary income.',
    citationId: 'ifs_cgt_alignment',
    onComplete: {
      // CGT-alignment yield is dominated by realisation elasticity, which IFS
      // and HMRC TIINs both flag as very uncertain on the downside (rich
      // taxpayers can defer disposals indefinitely) but only mildly so on the
      // upside. Asymmetric band reflects that.
      revBonus: cited(13, 'ifs_cgt_alignment', { band: { low: -0.4, high: 0.1 } }),
      gini: cited(-0.3, 'cgt_gini_judgement'),
      log: "CGT aligned. The founders' loophole closed.",
    },
    blocEffects: {
      business: cited(-8, 'bloc_methodology'),
      professional: cited(-3, 'bloc_methodology'),
      workingClass: cited(3, 'bloc_methodology'),
      middleClass: cited(2, 'bloc_methodology'),
    },
  },
  nondomEnd: {
    name: 'Abolish Non-Dom Regime', branch: 'revenue',
    cost: cited(0, 'statutory_no_upfront_judgement'), quarters: 2, prereq: ['hmrcCapacity'], capacityLoad: 3,
    passReq: { coalition: cited(30, 'bloc_methodology') },
    politicalCapitalCost: cited(8, 'political_capital_authoring_methodology'),
    ideologyStance: { econ: -0.3, social: -0.1 },
    blurb: 'Full abolition of remittance basis; replace with 4-year FIG regime.',
    citationId: 'centax_nondom',
    onComplete: {
      revBonus: cited(4, 'centax_nondom'),
      log: 'Non-dom regime abolished. Predicted exodus did not materialise.',
    },
    blocEffects: {
      business: cited(-4, 'bloc_methodology'),
      workingClass: cited(4, 'bloc_methodology'),
      northern: cited(3, 'bloc_methodology'),
    },
  },
  wealthTax: {
    name: 'Wealth Tax (2% above £10m)', branch: 'revenue',
    cost: cited(0.5, 'wealth_tax_commission'), quarters: 4, prereq: ['hmrcCapacity', 'nondomEnd'], capacityLoad: 5,
    passReq: { coalition: cited(42, 'bloc_methodology') },
    politicalCapitalCost: cited(22, 'political_capital_authoring_methodology'),
    ideologyStance: { econ: -0.6, social: -0.1 },
    blurb: 'Annual 2% on net wealth above £10m. ~22,000 households affected.',
    citationId: 'wealth_tax_commission',
    onComplete: {
      revBonus: cited(24, 'wealth_tax_commission'),
      gini: cited(-0.6, 'wealth_tax_commission'),
      log: 'Wealth tax implemented. Migration response <0.1.',
    },
    blocEffects: {
      business: cited(-10, 'bloc_methodology'),
      professional: cited(-4, 'bloc_methodology'),
      workingClass: cited(7, 'bloc_methodology'),
      northern: cited(5, 'bloc_methodology'),
      youth: cited(4, 'bloc_methodology'),
    },
  },
  charityCredit: {
    name: 'Charitable Deduction → Credit', branch: 'revenue',
    cost: cited(0, 'statutory_no_upfront_judgement'), quarters: 2, prereq: [], capacityLoad: 2,
    passReq: { coalition: cited(28, 'bloc_methodology') },
    politicalCapitalCost: cited(5, 'political_capital_authoring_methodology'),
    ideologyStance: { econ: -0.1, social: -0.1 },
    blurb: 'Replace higher-rate relief with flat 25% credit.',
    citationId: 'hmrc_charity_credit',
    onComplete: {
      revBonus: cited(2, 'hmrc_charity_credit'),
      gini: cited(-0.1, 'hmrc_charity_credit'),
      log: 'Charitable deduction converted to capped credit.',
    },
    blocEffects: {
      business: cited(-2, 'bloc_methodology'),
      professional: cited(-2, 'bloc_methodology'),
      workingClass: cited(1, 'bloc_methodology'),
    },
  },
  windfallTax: {
    name: 'Permanent Excess Profits Levy', branch: 'revenue',
    cost: cited(0, 'statutory_no_upfront_judgement'), quarters: 2, prereq: [], capacityLoad: 2,
    passReq: { coalition: cited(30, 'bloc_methodology') },
    politicalCapitalCost: cited(8, 'political_capital_authoring_methodology'),
    ideologyStance: { econ: -0.4, social: -0.1 },
    blurb: 'Permanent windfall mechanism in energy, banking, supermarkets.',
    citationId: 'windfall_levy',
    onComplete: {
      revBonus: cited(8, 'windfall_levy'),
      log: 'Permanent windfall mechanism in law.',
    },
    blocEffects: {
      business: cited(-7, 'bloc_methodology'),
      workingClass: cited(5, 'bloc_methodology'),
      northern: cited(4, 'bloc_methodology'),
    },
  },
  niEmployer: {
    name: 'Employer NI on Investment Income', branch: 'revenue',
    cost: cited(0, 'statutory_no_upfront_judgement'), quarters: 2, prereq: ['hmrcCapacity'], capacityLoad: 3,
    passReq: { coalition: cited(33, 'bloc_methodology') },
    politicalCapitalCost: cited(14, 'political_capital_authoring_methodology'),
    ideologyStance: { econ: -0.3, social: 0.0 },
    blurb: 'Extend Employer NI to dividends and rental income.',
    citationId: 'ifs_employer_ni',
    onComplete: {
      revBonus: cited(7, 'ifs_employer_ni'),
      gini: cited(-0.2, 'ifs_employer_ni'),
      log: 'Employer NI extended.',
    },
    blocEffects: {
      business: cited(-6, 'bloc_methodology'),
      professional: cited(-3, 'bloc_methodology'),
      workingClass: cited(3, 'bloc_methodology'),
    },
  },
  benefitFreeze: {
    name: 'Multi-Year Benefit Freeze', branch: 'revenue',
    cost: cited(0, 'ifs_benefit_freeze'), quarters: 1, prereq: [], capacityLoad: 1,
    passReq: { coalition: cited(27, 'bloc_methodology') },
    politicalCapitalCost: cited(18, 'political_capital_authoring_methodology'),
    ideologyStance: { econ: 0.4, social: 0.2 },
    blurb: 'Freeze working-age benefits for 3 years. Real-terms cut.',
    citationId: 'ifs_benefit_freeze',
    controversial: true,
    onComplete: {
      revBonus: cited(6, 'ifs_benefit_freeze'),
      gini: cited(0.4, 'benefit_freeze_health_judgement'),
      healthBoost: cited(-2, 'benefit_freeze_health_judgement'),
      log: 'Benefit freeze in effect.',
    },
    blocEffects: {
      business: cited(4, 'bloc_methodology'),
      middleClass: cited(2, 'bloc_methodology'),
      workingClass: cited(-8, 'bloc_methodology'),
      ethnicMinority: cited(-5, 'bloc_methodology'),
      publicSector: cited(-4, 'bloc_methodology'),
    },
  },
  topRateCut: {
    name: 'Cut Additional Rate to 40%', branch: 'revenue',
    cost: cited(0, 'hope_limberg_top_rate'), quarters: 1, prereq: [], capacityLoad: 1,
    passReq: { coalition: cited(25, 'bloc_methodology') },
    politicalCapitalCost: cited(16, 'political_capital_authoring_methodology'),
    ideologyStance: { econ: 0.6, social: 0.1 },
    blurb: 'Abolish additional rate. Trickle-down theory in action.',
    citationId: 'hope_limberg_top_rate',
    controversial: true,
    onComplete: {
      ongoingRev: cited(-5, 'hope_limberg_top_rate'),
      gini: cited(0.4, 'hope_limberg_top_rate'),
      log: 'Additional rate abolished. Markets rallied.',
    },
    blocEffects: {
      business: cited(8, 'bloc_methodology'),
      professional: cited(4, 'bloc_methodology'),
      workingClass: cited(-6, 'bloc_methodology'),
      publicSector: cited(-8, 'bloc_methodology'),
      youth: cited(-5, 'bloc_methodology'),
    },
  },
  taxCodeRewrite: {
    name: 'Tax Code Rewrite', branch: 'revenue',
    cost: cited(0, 'statutory_no_upfront_judgement'), quarters: 6, prereq: ['hmrcCapacity'], capacityLoad: 6,
    passReq: { coalition: cited(40, 'bloc_methodology') },
    politicalCapitalCost: cited(20, 'political_capital_authoring_methodology'),
    ideologyStance: { econ: 0.0, social: 0.0 },
    blurb: 'Wholesale rewrite of the tax code. Removes legacy guardrails on headline rate-setting — unlocks extreme tax-rate ranges.',
    citationId: 'slider_range_judgement',
    special: 'unlockExtremeTaxSliders',
    onComplete: {
      log: 'Tax code rewritten. The Chancellor can now set any rate from 0 to confiscatory.',
    },
    blocEffects: {
      professional: cited(-2, 'bloc_methodology'),
      business: cited(-3, 'bloc_methodology'),
      publicSector: cited(2, 'bloc_methodology'),
    },
  },

  // ===========================================================================
  // NHS & CARE branch
  // ===========================================================================
  nhsPay: {
    name: 'NHS Pay Settlement', branch: 'nhs',
    cost: cited(4, 'nhs_pay_settlement'), quarters: 2, prereq: [], capacityLoad: 3,
    passReq: { coalition: cited(34, 'bloc_methodology') },
    politicalCapitalCost: cited(10, 'political_capital_authoring_methodology'),
    ideologyStance: { econ: -0.3, social: -0.1 },
    blurb: 'Multi-year pay deal; ends rolling strikes; cuts agency spend.',
    citationId: 'nhs_pay_settlement',
    onComplete: {
      ongoingCost: cited(4, 'nhs_pay_settlement'),
      healthBoost: cited(2, 'nhs_pay_settlement'),
      log: 'NHS pay deal signed.',
    },
    blocEffects: {
      publicSector: cited(12, 'bloc_methodology'),
      workingClass: cited(4, 'bloc_methodology'),
      middleClass: cited(2, 'bloc_methodology'),
    },
    riskMods: {
      nhsStrike: cited(-50, 'nhs_strike_payDeal_effect'),
    },
  },
  dilnotCap: {
    name: 'Dilnot Cap on Personal Contributions', branch: 'nhs',
    cost: cited(6, 'dilnot_social_care'), quarters: 4, prereq: ['nhsPay'], capacityLoad: 5,
    passReq: { coalition: cited(38, 'bloc_methodology') },
    politicalCapitalCost: cited(8, 'political_capital_authoring_methodology'),
    ideologyStance: { econ: -0.2, social: 0.0 },
    blurb: '£86k lifetime cap on personal social-care contributions; NI surcharge funding.',
    citationId: 'dilnot_social_care',
    onComplete: {
      ongoingCost: cited(5, 'dilnot_social_care'),
      healthBoost: cited(3, 'dilnot_social_care'),
      log: 'Dilnot cap in force. Personal contributions capped at £86k.',
    },
    blocEffects: {
      pensioners: cited(8, 'bloc_methodology'),
      middleClass: cited(5, 'bloc_methodology'),
      publicSector: cited(4, 'bloc_methodology'),
    },
  },
  socialCareSystemic: {
    name: 'Social Care Systemic Reform', branch: 'nhs',
    cost: cited(10, 'social_care_systemic_extrapolated'), quarters: 6, prereq: ['dilnotCap'], capacityLoad: 7,
    passReq: { coalition: cited(42, 'bloc_methodology') },
    politicalCapitalCost: cited(15, 'political_capital_authoring_methodology'),
    ideologyStance: { econ: -0.4, social: -0.1 },
    blurb: 'Free personal care, workforce pay uplift, NHS/LA integration. Compounds pandemic-severity damper.',
    citationId: 'social_care_systemic_extrapolated',
    special: 'enablePandemicDamperSocialCare',
    onComplete: {
      ongoingCost: cited(12, 'social_care_systemic_extrapolated'),
      healthBoost: cited(5, 'social_care_systemic_extrapolated'),
      log: 'Systemic social care reform delivered. Free personal care live; workforce on NHS pay parity.',
    },
    blocEffects: {
      publicSector: cited(10, 'bloc_methodology'),
      professional: cited(5, 'bloc_methodology'),
      pensioners: cited(6, 'bloc_methodology'),
      middleClass: cited(3, 'bloc_methodology'),
    },
  },
  preventativeHealth: {
    name: 'Preventative Health Programme', branch: 'nhs',
    cost: cited(3, 'marmot_preventative'), quarters: 6, prereq: ['nhsPay'], capacityLoad: 5,
    passReq: { coalition: cited(35, 'bloc_methodology') },
    politicalCapitalCost: cited(6, 'political_capital_authoring_methodology'),
    ideologyStance: { econ: -0.2, social: -0.1 },
    blurb: 'Marmot-style upstream investment. Long-run mortality + productivity. Damps pandemic severity.',
    citationId: 'marmot_preventative',
    special: 'enablePandemicDamperPreventative',
    onComplete: {
      ongoingCost: cited(2, 'marmot_preventative'),
      healthBoost: cited(4, 'marmot_preventative'),
      growthBonus: cited(0.2, 'marmot_preventative'),
      log: 'Preventative health programme bedded in.',
    },
    blocEffects: {
      workingClass: cited(5, 'bloc_methodology'),
      northern: cited(4, 'bloc_methodology'),
      publicSector: cited(3, 'bloc_methodology'),
    },
  },
  mentalHealth: {
    name: 'Mental Health Parity', branch: 'nhs',
    cost: cited(2, 'nhs_mental_health_parity'), quarters: 4, prereq: [], capacityLoad: 4,
    passReq: { coalition: cited(33, 'bloc_methodology') },
    politicalCapitalCost: cited(6, 'political_capital_authoring_methodology'),
    ideologyStance: { econ: -0.2, social: -0.2 },
    blurb: 'Statutory parity between MH and physical health services.',
    citationId: 'nhs_mental_health_parity',
    onComplete: {
      ongoingCost: cited(3, 'nhs_mental_health_parity'),
      healthBoost: cited(2, 'nhs_mental_health_parity'),
      log: 'Mental health funding at parity.',
    },
    blocEffects: {
      youth: cited(8, 'bloc_methodology'),
      professional: cited(5, 'bloc_methodology'),
      publicSector: cited(4, 'bloc_methodology'),
      workingClass: cited(3, 'bloc_methodology'),
    },
  },
  privatiseNHS: {
    name: 'Expand NHS Private Provision', branch: 'nhs',
    cost: cited(0, 'statutory_no_upfront_judgement'), quarters: 3, prereq: [], capacityLoad: 4,
    passReq: { coalition: cited(25, 'bloc_methodology') },
    politicalCapitalCost: cited(25, 'political_capital_authoring_methodology'),
    ideologyStance: { econ: 0.7, social: 0.2 },
    blurb: 'Outsource elective procedures. Cuts waiting lists short-term.',
    citationId: 'bmj_nhs_private',
    controversial: true,
    onComplete: {
      ongoingCost: cited(2, 'bmj_nhs_private'),
      healthBoost: cited(1, 'bmj_nhs_private'),
      log: 'Private provision expanded.',
    },
    blocEffects: {
      business: cited(8, 'bloc_methodology'),
      middleClass: cited(3, 'bloc_methodology'),
      publicSector: cited(-10, 'bloc_methodology'),
      workingClass: cited(-5, 'bloc_methodology'),
    },
  },

  // ===========================================================================
  // HOUSING branch
  // ===========================================================================
  socialHousing: {
    name: 'Council House Building', branch: 'housing',
    cost: cited(8, 'shelter_social_housing'), quarters: 8, prereq: [], capacityLoad: 7,
    passReq: { coalition: cited(36, 'bloc_methodology') },
    politicalCapitalCost: cited(14, 'political_capital_authoring_methodology'),
    ideologyStance: { econ: -0.5, social: -0.1 },
    blurb: '300,000 council homes over 8Q. Lowers Housing Benefit long-term.',
    citationId: 'shelter_social_housing',
    growthBonusPermanent: true,
    onComplete: {
      growthBonus: cited(0.3, 'shelter_social_housing'),
      gini: cited(-0.4, 'shelter_social_housing'),
      populationEffects: {
        youth: cited(0.1, 'shelter_social_housing'),
        workingClass: cited(0.05, 'shelter_social_housing'),
      },
      log: 'Council building delivered first homes.',
    },
    blocEffects: {
      workingClass: cited(10, 'bloc_methodology'),
      youth: cited(8, 'bloc_methodology'),
      northern: cited(6, 'bloc_methodology'),
      ethnicMinority: cited(5, 'bloc_methodology'),
      business: cited(-3, 'bloc_methodology'),
    },
  },
  planningReform: {
    name: 'Planning System Overhaul', branch: 'housing',
    cost: cited(0, 'statutory_no_upfront_judgement'), quarters: 3, prereq: [], capacityLoad: 4,
    passReq: { coalition: cited(33, 'bloc_methodology') },
    politicalCapitalCost: cited(12, 'political_capital_authoring_methodology'),
    ideologyStance: { econ: 0.1, social: 0.0 },
    blurb: 'Presumption in favour of development; restrict NIMBY blocks.',
    citationId: 'planning_friction',
    growthBonusPermanent: true,
    onComplete: {
      growthBonus: cited(0.2, 'planning_friction'),
      log: 'Planning reform unblocking 80k homes/year.',
    },
    blocEffects: {
      youth: cited(6, 'bloc_methodology'),
      professional: cited(4, 'bloc_methodology'),
      business: cited(5, 'bloc_methodology'),
      middleClass: cited(-3, 'bloc_methodology'),
      pensioners: cited(-4, 'bloc_methodology'),
    },
  },
  rentControls: {
    name: 'Rent Caps (High-Pressure Zones)', branch: 'housing',
    cost: cited(0, 'statutory_no_upfront_judgement'), quarters: 2, prereq: [], capacityLoad: 2,
    passReq: { coalition: cited(32, 'bloc_methodology') },
    politicalCapitalCost: cited(16, 'political_capital_authoring_methodology'),
    ideologyStance: { econ: -0.6, social: -0.1 },
    blurb: 'Annual rent rises capped at CPI.',
    citationId: 'diamond_mcquade_qian_rent_control',
    controversial: true,
    growthBonusPermanent: true,
    onComplete: {
      gini: cited(-0.2, 'diamond_mcquade_qian_rent_control'),
      growthBonus: cited(-0.05, 'diamond_mcquade_qian_rent_control'),
      log: 'Rent controls in force.',
    },
    blocEffects: {
      youth: cited(9, 'bloc_methodology'),
      workingClass: cited(5, 'bloc_methodology'),
      ethnicMinority: cited(4, 'bloc_methodology'),
      business: cited(-6, 'bloc_methodology'),
      middleClass: cited(-2, 'bloc_methodology'),
    },
  },
  housingSupplyTarget: {
    name: 'Housing Supply Target (300k pa)', branch: 'housing',
    cost: cited(4, 'barker_review'), quarters: 6, prereq: ['planningReform'], capacityLoad: 4,
    passReq: { coalition: cited(32, 'bloc_methodology') },
    politicalCapitalCost: cited(12, 'political_capital_authoring_methodology'),
    ideologyStance: { econ: -0.1, social: -0.2 },
    blurb: 'Underwrite local authorities to deliver 300k homes annually. Stops HPI runaway.',
    citationId: 'barker_review',
    special: 'boostHousingSupply',
    growthBonusPermanent: true,
    onComplete: {
      growthBonus: cited(0.2, 'barker_review'),
      populationEffects: { youth: cited(0.05, 'barker_review') },
      log: '300k-home programme funded. Cranes are up.',
    },
    blocEffects: {
      youth: cited(6, 'bloc_methodology'),
      workingClass: cited(4, 'bloc_methodology'),
      northern: cited(-2, 'bloc_methodology'),
    },
    riskMods: {
      housingCrisis: cited(-10, 'barker_review'),
    },
  },
  energyMixReform: {
    name: 'Domestic Energy Mix Reform', branch: 'green',
    cost: cited(8, 'ccc_seventh_carbon_budget'), quarters: 8, prereq: ['greenInvest'], capacityLoad: 5,
    passReq: { coalition: cited(34, 'bloc_methodology') },
    politicalCapitalCost: cited(15, 'political_capital_authoring_methodology'),
    ideologyStance: { econ: -0.2, social: -0.3 },
    blurb: 'Reduce gas-import dependence; nuclear + offshore + storage scale.',
    citationId: 'ccc_seventh_carbon_budget',
    special: 'reduceEnergyShockMagnitude',
    onComplete: {
      growthBonus: cited(0.15, 'ccc_seventh_carbon_budget'),
      log: 'Energy mix shifted. Gas-import exposure halved.',
    },
    blocEffects: {
      professional: cited(4, 'bloc_methodology'),
      youth: cited(3, 'bloc_methodology'),
      business: cited(-3, 'bloc_methodology'),
    },
    riskMods: {
      energyShock: cited(-15, 'ccc_seventh_carbon_budget'),
      fuelPoverty: cited(-8, 'ccc_seventh_carbon_budget'),
    },
  },
  labourFlexibility: {
    name: 'Labour Market Flexibility Package', branch: 'labour',
    controversial: true,
    cost: cited(0, 'statutory_no_upfront_judgement'), quarters: 3, prereq: [], capacityLoad: 3,
    passReq: { coalition: cited(30, 'bloc_methodology') },
    politicalCapitalCost: cited(14, 'political_capital_authoring_methodology'),
    ideologyStance: { econ: 0.4, social: 0.1 },
    blurb: 'Lighter dismissal regime, weaker collective-bargaining floor. Flattens Phillips curve.',
    citationId: 'oecd_labour_flexibility',
    special: 'flattenPhillipsSlope',
    onComplete: {
      growthBonus: cited(0.1, 'oecd_labour_flexibility'),
      log: 'Labour market flexed. Phillips curve flattened.',
    },
    blocEffects: {
      business: cited(6, 'bloc_methodology'),
      workingClass: cited(-5, 'bloc_methodology'),
      publicSector: cited(-4, 'bloc_methodology'),
    },
  },
  rightToBuyEnd: {
    name: 'End Right-to-Buy', branch: 'housing',
    cost: cited(0, 'statutory_no_upfront_judgement'), quarters: 1, prereq: [], capacityLoad: 1,
    passReq: { coalition: cited(34, 'bloc_methodology') },
    politicalCapitalCost: cited(14, 'political_capital_authoring_methodology'),
    ideologyStance: { econ: -0.4, social: -0.1 },
    blurb: 'Stop council stock erosion.',
    citationId: 'right_to_buy_end_judgement',
    onComplete: {
      gini: cited(-0.1, 'right_to_buy_end_judgement'),
      log: 'Right-to-Buy ended in England.',
    },
    blocEffects: {
      workingClass: cited(6, 'bloc_methodology'),
      youth: cited(4, 'bloc_methodology'),
      pensioners: cited(-3, 'bloc_methodology'),
      business: cited(-2, 'bloc_methodology'),
    },
  },

  // ===========================================================================
  // GREEN / INFRASTRUCTURE branch
  // ===========================================================================
  greenInvest: {
    name: 'GB Energy + Grid Investment', branch: 'green',
    cost: cited(10, 'gb_energy_grid'), quarters: 6, prereq: [], capacityLoad: 6,
    passReq: { coalition: cited(36, 'bloc_methodology') },
    politicalCapitalCost: cited(12, 'political_capital_authoring_methodology'),
    ideologyStance: { econ: -0.3, social: -0.3 },
    blurb: 'Public energy company + grid upgrade. Lower bills mid-term.',
    citationId: 'gb_energy_grid',
    growthBonusPermanent: true,
    onComplete: {
      growthBonus: cited(0.3, 'gb_energy_grid'),
      ongoingRev: cited(2, 'gb_energy_grid'),
      log: 'GB Energy delivering. Bills down 8%.',
    },
    blocEffects: {
      youth: cited(7, 'bloc_methodology'),
      workingClass: cited(4, 'bloc_methodology'),
      northern: cited(5, 'bloc_methodology'),
      business: cited(2, 'bloc_methodology'),
    },
  },
  insulationScheme: {
    name: 'Mass Home Insulation', branch: 'green',
    cost: cited(4, 'ccc_insulation'), quarters: 4, prereq: [], capacityLoad: 4,
    passReq: { coalition: cited(30, 'bloc_methodology') },
    politicalCapitalCost: cited(6, 'political_capital_authoring_methodology'),
    ideologyStance: { econ: -0.2, social: -0.2 },
    blurb: 'Retrofit 5m homes. Cuts bills + emissions; trade jobs.',
    citationId: 'ccc_insulation',
    onComplete: {
      healthBoost: cited(1, 'ccc_insulation'),
      gini: cited(-0.2, 'ccc_insulation'),
      log: 'Insulation programme cutting energy poverty.',
    },
    blocEffects: {
      workingClass: cited(7, 'bloc_methodology'),
      pensioners: cited(6, 'bloc_methodology'),
      northern: cited(5, 'bloc_methodology'),
    },
  },
  rail: {
    name: 'Northern Rail Investment', branch: 'green',
    cost: cited(12, 'npr_rail'), quarters: 12, prereq: ['planningReform'], capacityLoad: 8,
    passReq: { coalition: cited(38, 'bloc_methodology') },
    politicalCapitalCost: cited(14, 'political_capital_authoring_methodology'),
    ideologyStance: { econ: -0.4, social: 0.0 },
    blurb: 'Connecting Northern cities. Long lead time.',
    citationId: 'npr_rail',
    growthBonusPermanent: true,
    onComplete: {
      growthBonus: cited(0.5, 'npr_rail'),
      populationEffects: {
        northern: cited(0.05, 'npr_rail'),
      },
      log: 'Northern rail upgrades commissioned.',
    },
    blocEffects: {
      northern: cited(12, 'bloc_methodology'),
      workingClass: cited(4, 'bloc_methodology'),
      business: cited(5, 'bloc_methodology'),
    },
  },
  digitalInfra: {
    name: 'Full-Fibre Rollout', branch: 'green',
    cost: cited(5, 'cebr_full_fibre'), quarters: 6, prereq: [], capacityLoad: 5,
    passReq: { coalition: cited(31, 'bloc_methodology') },
    politicalCapitalCost: cited(6, 'political_capital_authoring_methodology'),
    ideologyStance: { econ: 0.0, social: 0.0 },
    blurb: 'Universal full-fibre by 2030.',
    citationId: 'cebr_full_fibre',
    growthBonusPermanent: true,
    onComplete: {
      growthBonus: cited(0.2, 'cebr_full_fibre'),
      log: 'Full-fibre near-universal.',
    },
    blocEffects: {
      professional: cited(5, 'bloc_methodology'),
      business: cited(6, 'bloc_methodology'),
      northern: cited(4, 'bloc_methodology'),
      youth: cited(3, 'bloc_methodology'),
    },
  },
  deregulate: {
    name: 'Deregulatory Bonfire', branch: 'green',
    cost: cited(0, 'statutory_no_upfront_judgement'), quarters: 2, prereq: [], capacityLoad: 2,
    passReq: { coalition: cited(28, 'bloc_methodology') },
    politicalCapitalCost: cited(12, 'political_capital_authoring_methodology'),
    ideologyStance: { econ: 0.5, social: 0.1 },
    blurb: 'Strip back environmental, planning, employment regulations.',
    citationId: 'deregulation_judgement',
    controversial: true,
    onComplete: {
      growthBonus: cited(0.15, 'deregulation_judgement'),
      log: 'Deregulation underway. Markets cheered.',
    },
    blocEffects: {
      business: cited(12, 'bloc_methodology'),
      professional: cited(-3, 'bloc_methodology'),
      publicSector: cited(-5, 'bloc_methodology'),
      youth: cited(-6, 'bloc_methodology'),
      workingClass: cited(-4, 'bloc_methodology'),
    },
    riskMods: {
      financialCrisis: cited(5, 'deregulation_judgement'),
      flood: cited(3, 'deregulation_judgement'),
    },
  },

  // ===========================================================================
  // EDUCATION / SKILLS branch
  // ===========================================================================
  freeChildcare: {
    name: 'Universal Free Childcare', branch: 'education',
    cost: cited(5, 'resolution_childcare'), quarters: 4, prereq: [], capacityLoad: 5,
    passReq: { coalition: cited(36, 'bloc_methodology') },
    politicalCapitalCost: cited(10, 'political_capital_authoring_methodology'),
    ideologyStance: { econ: -0.3, social: -0.2 },
    blurb: 'Removes work disincentive. Labour supply boost.',
    citationId: 'resolution_childcare',
    onComplete: {
      ongoingCost: cited(6, 'resolution_childcare'),
      growthBonus: cited(0.4, 'resolution_childcare'),
      educationIndexBump: cited(1.0, 'education_index_methodology'),
      populationEffects: {
        youth: cited(0.05, 'resolution_childcare'),
        workingClass: cited(0.05, 'resolution_childcare'),
      },
      log: 'Universal childcare live.',
    },
    blocEffects: {
      youth: cited(6, 'bloc_methodology'),
      workingClass: cited(5, 'bloc_methodology'),
      professional: cited(7, 'bloc_methodology'),
      middleClass: cited(4, 'bloc_methodology'),
    },
  },
  skillsBudget: {
    name: 'Skills & FE Funding', branch: 'education',
    cost: cited(0, 'statutory_no_upfront_judgement'), quarters: 3, prereq: [], capacityLoad: 3,
    passReq: { coalition: cited(30, 'bloc_methodology') },
    politicalCapitalCost: cited(6, 'political_capital_authoring_methodology'),
    ideologyStance: { econ: -0.1, social: -0.1 },
    blurb: 'Restore Further Education funding to 2010 real terms.',
    citationId: 'ifs_fe_funding',
    onComplete: {
      growthBonus: cited(0.15, 'ifs_fe_funding'),
      educationIndexBump: cited(2.0, 'education_index_methodology'),
      log: 'FE colleges rebuilt.',
    },
    blocEffects: {
      workingClass: cited(5, 'bloc_methodology'),
      northern: cited(4, 'bloc_methodology'),
      youth: cited(3, 'bloc_methodology'),
      business: cited(3, 'bloc_methodology'),
    },
  },
  uniReform: {
    name: 'University Fees Reform', branch: 'education',
    cost: cited(4, 'obr_tuition_fees'), quarters: 4, prereq: [], capacityLoad: 4,
    passReq: { coalition: cited(35, 'bloc_methodology') },
    politicalCapitalCost: cited(12, 'political_capital_authoring_methodology'),
    ideologyStance: { econ: -0.2, social: -0.2 },
    blurb: 'Replace tuition-fee debt with progressive graduate contribution.',
    citationId: 'obr_tuition_fees',
    onComplete: {
      ongoingCost: cited(3, 'obr_tuition_fees'),
      educationIndexBump: cited(1.5, 'education_index_methodology'),
      log: 'Tuition fee debt replaced with graduate tax.',
    },
    blocEffects: {
      youth: cited(10, 'bloc_methodology'),
      professional: cited(4, 'bloc_methodology'),
      middleClass: cited(3, 'bloc_methodology'),
      pensioners: cited(-2, 'bloc_methodology'),
    },
  },

  // ===========================================================================
  // LABOUR / WORK branch
  // ===========================================================================
  realLivingWage: {
    name: 'Statutory Real Living Wage', branch: 'labour',
    cost: cited(0, 'statutory_no_upfront_judgement'), quarters: 2, prereq: [], capacityLoad: 2,
    passReq: { coalition: cited(33, 'bloc_methodology') },
    politicalCapitalCost: cited(14, 'political_capital_authoring_methodology'),
    ideologyStance: { econ: -0.5, social: -0.1 },
    blurb: 'Raise minimum to Living Wage Foundation rate (~£12.60/hr).',
    citationId: 'lpc_living_wage',
    onComplete: {
      gini: cited(-0.3, 'lpc_living_wage'),
      wageIndexBump: cited(1.5, 'lpc_living_wage_wageindex'),
      log: 'Real Living Wage on statute.',
    },
    blocEffects: {
      workingClass: cited(8, 'bloc_methodology'),
      youth: cited(4, 'bloc_methodology'),
      ethnicMinority: cited(5, 'bloc_methodology'),
      business: cited(-7, 'bloc_methodology'),
    },
  },
  unionRights: {
    name: 'Restore Union Rights', branch: 'labour',
    cost: cited(0, 'statutory_no_upfront_judgement'), quarters: 2, prereq: [], capacityLoad: 2,
    passReq: { coalition: cited(36, 'bloc_methodology') },
    politicalCapitalCost: cited(16, 'political_capital_authoring_methodology'),
    ideologyStance: { econ: -0.6, social: -0.2 },
    blurb: 'Repeal Trade Union Act 2016; sectoral bargaining frameworks.',
    citationId: 'oecd_sectoral_bargaining',
    onComplete: {
      gini: cited(-0.2, 'oecd_sectoral_bargaining'),
      wageIndexBump: cited(1.2, 'oecd_sectoral_bargaining_wageindex'),
      log: 'Trade union law reformed.',
    },
    blocEffects: {
      workingClass: cited(6, 'bloc_methodology'),
      publicSector: cited(8, 'bloc_methodology'),
      business: cited(-5, 'bloc_methodology'),
    },
    riskMods: {
      generalStrike: cited(-10, 'oecd_sectoral_bargaining'),
    },
  },
  workersBoardSeats: {
    name: 'Workers on Boards', branch: 'labour',
    cost: cited(0, 'statutory_no_upfront_judgement'), quarters: 3, prereq: ['unionRights'], capacityLoad: 3,
    passReq: { coalition: cited(38, 'bloc_methodology') },
    politicalCapitalCost: cited(18, 'political_capital_authoring_methodology'),
    ideologyStance: { econ: -0.7, social: -0.2 },
    blurb: 'German-style co-determination for firms >250 employees.',
    citationId: 'jager_codetermination',
    onComplete: {
      growthBonus: cited(0.1, 'jager_codetermination'),
      gini: cited(-0.2, 'jager_codetermination'),
      log: 'Worker board representation in law.',
    },
    blocEffects: {
      workingClass: cited(6, 'bloc_methodology'),
      publicSector: cited(4, 'bloc_methodology'),
      business: cited(-8, 'bloc_methodology'),
    },
  },
  antiStrike: {
    name: 'Minimum Service Levels Act', branch: 'labour',
    cost: cited(0, 'statutory_no_upfront_judgement'), quarters: 2, prereq: [], capacityLoad: 2,
    passReq: { coalition: cited(27, 'bloc_methodology') },
    politicalCapitalCost: cited(18, 'political_capital_authoring_methodology'),
    ideologyStance: { econ: 0.5, social: 0.4 },
    blurb: 'Mandate minimum service during strikes; sackings for non-compliance.',
    citationId: 'ilo_minimum_service',
    controversial: true,
    onComplete: {
      log: 'Anti-strike law in force.',
    },
    blocEffects: {
      business: cited(6, 'bloc_methodology'),
      middleClass: cited(3, 'bloc_methodology'),
      publicSector: cited(-14, 'bloc_methodology'),
      workingClass: cited(-8, 'bloc_methodology'),
    },
    riskMods: {
      generalStrike: cited(12, 'ilo_minimum_service'),
      nhsStrike: cited(8, 'ilo_minimum_service'),
    },
  },

  // ===========================================================================
  // STATE CAPACITY branch
  // ===========================================================================
  civilService: {
    name: 'Rebuild Civil Service', branch: 'state',
    cost: cited(2, 'nao_civil_service'), quarters: 3, prereq: [], capacityLoad: 4,
    passReq: { coalition: cited(32, 'bloc_methodology') },
    politicalCapitalCost: cited(8, 'political_capital_authoring_methodology'),
    ideologyStance: { econ: -0.1, social: -0.1 },
    blurb: 'Reverse decade of headcount cuts. Less consultant reliance.',
    citationId: 'nao_civil_service',
    onComplete: {
      ongoingCost: cited(1, 'nao_civil_service'),
      revBonus: cited(2, 'nao_civil_service'),
      log: 'Civil service rebuilt.',
    },
    blocEffects: {
      publicSector: cited(8, 'bloc_methodology'),
      professional: cited(3, 'bloc_methodology'),
    },
  },
  spendingReviewOverride: {
    name: 'Spending Review Override', branch: 'state',
    cost: cited(0, 'statutory_no_upfront_judgement'), quarters: 6, prereq: ['civilService'], capacityLoad: 6,
    passReq: { coalition: cited(40, 'bloc_methodology') },
    politicalCapitalCost: cited(20, 'political_capital_authoring_methodology'),
    ideologyStance: { econ: 0.0, social: 0.0 },
    blurb: 'Strip the multi-year settlement conventions. The Treasury can now reshape departmental budgets to extremes.',
    citationId: 'slider_range_judgement',
    special: 'unlockExtremeSpendingSliders',
    onComplete: {
      log: 'Spending review framework overridden. Departmental envelopes are now fully discretionary.',
    },
    blocEffects: {
      publicSector: cited(-4, 'bloc_methodology'),
      professional: cited(-2, 'bloc_methodology'),
      business: cited(1, 'bloc_methodology'),
    },
  },
  localGov: {
    name: 'Local Government Settlement', branch: 'state',
    cost: cited(5, 'ifs_local_gov'), quarters: 3, prereq: [], capacityLoad: 5,
    passReq: { coalition: cited(35, 'bloc_methodology') },
    politicalCapitalCost: cited(10, 'political_capital_authoring_methodology'),
    ideologyStance: { econ: -0.3, social: -0.1 },
    blurb: 'Multi-year council funding. Saves SEND, social care, libraries.',
    citationId: 'ifs_local_gov',
    onComplete: {
      ongoingCost: cited(5, 'ifs_local_gov'),
      healthBoost: cited(1, 'ifs_local_gov'),
      log: 'Local government on stable footing.',
    },
    blocEffects: {
      workingClass: cited(4, 'bloc_methodology'),
      northern: cited(5, 'bloc_methodology'),
      publicSector: cited(5, 'bloc_methodology'),
      middleClass: cited(3, 'bloc_methodology'),
    },
    riskMods: {
      councilBankruptcy: cited(-20, 'ifs_local_gov'),
    },
  },
  pensionConsolidation: {
    name: 'Pension Consolidation (Mansion House)', branch: 'state',
    cost: cited(0, 'statutory_no_upfront_judgement'), quarters: 5, prereq: [], capacityLoad: 4,
    passReq: { coalition: cited(32, 'bloc_methodology') },
    politicalCapitalCost: cited(10, 'political_capital_authoring_methodology'),
    ideologyStance: { econ: 0.2, social: 0.0 },
    blurb: 'Consolidate small DC pots; channel more capital into UK productive assets. Damps equity-shock blowback.',
    citationId: 'pensions_dashboards_methodology',
    special: 'enablePensionDamper',
    onComplete: {
      log: 'Pension consolidation in effect. Small pots merged; equity-shock blowback dampened.',
    },
    blocEffects: {
      business: cited(4, 'bloc_methodology'),
      professional: cited(3, 'bloc_methodology'),
    },
  },
  cityRegulation: {
    name: 'City Regulation Tightening', branch: 'state',
    cost: cited(0, 'statutory_no_upfront_judgement'), quarters: 4, prereq: [], capacityLoad: 3,
    passReq: { coalition: cited(33, 'bloc_methodology') },
    politicalCapitalCost: cited(14, 'political_capital_authoring_methodology'),
    ideologyStance: { econ: -0.3, social: 0.0 },
    controversial: true,
    blurb: 'Tighter macroprudential rules; reduces sovereign-spread volatility. Equity dampener.',
    citationId: 'bcbs_macroprudential_capital',
    onComplete: {
      log: 'Tighter macroprudential rules in force. Gilt-market volatility falls.',
    },
    blocEffects: {
      business: cited(-8, 'bloc_methodology'),
      workingClass: cited(3, 'bloc_methodology'),
      publicSector: cited(2, 'bloc_methodology'),
    },
  },
  banking: {
    name: 'Banking Regulation', branch: 'state',
    cost: cited(0, 'statutory_no_upfront_judgement'), quarters: 3, prereq: [], capacityLoad: 3,
    passReq: { coalition: cited(32, 'bloc_methodology') },
    politicalCapitalCost: cited(16, 'political_capital_authoring_methodology'),
    ideologyStance: { econ: 0.3, social: 0.0 },
    blurb: 'Higher capital requirements; ring-fence enforcement.',
    citationId: 'bcbs_capital_reqs',
    onComplete: {
      log: 'Banking sector better capitalised.',
    },
    blocEffects: {
      workingClass: cited(3, 'bloc_methodology'),
      business: cited(-8, 'bloc_methodology'),
      professional: cited(-3, 'bloc_methodology'),
    },
    riskMods: {
      financialCrisis: cited(-4, 'bcbs_capital_reqs'),
    },
  },
  immigrationCap: {
    name: 'Cap Net Migration at 100k', branch: 'state',
    cost: cited(0.2, 'obr_migration_cap'), quarters: 3, prereq: [], capacityLoad: 3,
    passReq: { coalition: cited(28, 'bloc_methodology') },
    politicalCapitalCost: cited(20, 'political_capital_authoring_methodology'),
    ideologyStance: { econ: 0.1, social: 0.7 },
    blurb: 'Hard cap on visa routes. Reduces growth and population in working-age blocs.',
    citationId: 'obr_migration_cap',
    controversial: true,
    growthBonusPermanent: true,
    excludesComplete: ['openMigration', 'integrationReform'],
    onComplete: {
      growthBonus: cited(-0.4, 'obr_migration_cap'),
      ongoingRev: cited(-3, 'obr_migration_cap'),
      populationEffects: {
        professional: cited(-0.3, 'obr_migration_cap'),
        ethnicMinority: cited(-0.5, 'obr_migration_cap'),
        youth: cited(-0.15, 'obr_migration_cap'),
      },
      log: 'Net migration capped. Labour shortages biting.',
    },
    blocEffects: {
      workingClass: cited(5, 'bloc_methodology'),
      northern: cited(8, 'bloc_methodology'),
      pensioners: cited(4, 'bloc_methodology'),
      ethnicMinority: cited(-10, 'bloc_methodology'),
      professional: cited(-8, 'bloc_methodology'),
      business: cited(-10, 'bloc_methodology'),
    },
    riskMods: {
      labourShortage: cited(25, 'obr_migration_cap'),
    },
  },
  refugeeRestrict: {
    name: 'Offshore Asylum Processing', branch: 'state',
    cost: cited(2, 'pac_rwanda'), quarters: 4, prereq: [], capacityLoad: 5,
    passReq: { coalition: cited(26, 'bloc_methodology') },
    politicalCapitalCost: cited(16, 'political_capital_authoring_methodology'),
    ideologyStance: { econ: 0.1, social: 0.6 },
    blurb: 'Offshoring scheme. Symbolic; legally fraught.',
    citationId: 'pac_rwanda',
    controversial: true,
    excludesComplete: ['openMigration', 'integrationReform'],
    onComplete: {
      log: 'Offshoring scheme operational. Legal challenges ongoing.',
    },
    blocEffects: {
      northern: cited(6, 'bloc_methodology'),
      workingClass: cited(3, 'bloc_methodology'),
      ethnicMinority: cited(-12, 'bloc_methodology'),
      professional: cited(-10, 'bloc_methodology'),
      youth: cited(-8, 'bloc_methodology'),
    },
  },
  openMigration: {
    name: 'Open Migration Compact', branch: 'state',
    cost: cited(0, 'statutory_no_upfront_judgement'), quarters: 4, prereq: [], capacityLoad: 4,
    passReq: { coalition: cited(34, 'bloc_methodology') },
    politicalCapitalCost: cited(22, 'political_capital_authoring_methodology'),
    ideologyStance: { econ: -0.5, social: -0.7 },
    blurb: 'Liberalise visa routes and dependent rules. Labour-supply boost; bitterly contested.',
    citationId: 'obr_open_migration',
    controversial: true,
    growthBonusPermanent: true,
    excludesComplete: ['immigrationCap', 'refugeeRestrict', 'integrationReform'],
    onComplete: {
      growthBonus: cited(0.35, 'obr_open_migration'),
      ongoingRev: cited(4, 'obr_open_migration'),
      populationEffects: {
        professional: cited(0.4, 'obr_open_migration'),
        ethnicMinority: cited(0.6, 'obr_open_migration'),
        youth: cited(0.2, 'obr_open_migration'),
      },
      log: 'Open migration compact in force.',
    },
    blocEffects: {
      ethnicMinority: cited(8, 'bloc_methodology'),
      professional: cited(8, 'bloc_methodology'),
      business: cited(8, 'bloc_methodology'),
      workingClass: cited(-7, 'bloc_methodology'),
      northern: cited(-9, 'bloc_methodology'),
      pensioners: cited(-6, 'bloc_methodology'),
    },
  },
  integrationReform: {
    name: 'Integration Package', branch: 'state',
    cost: cited(1, 'mac_integration_2024'), quarters: 5, prereq: [], capacityLoad: 3,
    passReq: { coalition: cited(32, 'bloc_methodology') },
    politicalCapitalCost: cited(16, 'political_capital_authoring_methodology'),
    ideologyStance: { econ: -0.2, social: -0.3 },
    blurb: 'Language tuition, qualifications recognition, employer fast-track. Migrant productivity up; integrationist.',
    citationId: 'mac_integration_2024',
    growthBonusPermanent: true,
    excludesComplete: ['immigrationCap', 'refugeeRestrict', 'openMigration'],
    onComplete: {
      growthBonus: cited(0.12, 'mac_integration_2024'),
      healthBoost: cited(2, 'mac_integration_2024'),
      populationEffects: {
        ethnicMinority: cited(0.15, 'mac_integration_2024'),
        professional: cited(0.1, 'mac_integration_2024'),
      },
      log: 'Integration package delivering.',
    },
    blocEffects: {
      ethnicMinority: cited(10, 'bloc_methodology'),
      publicSector: cited(4, 'bloc_methodology'),
      professional: cited(3, 'bloc_methodology'),
      northern: cited(-2, 'bloc_methodology'),
    },
  },
  socialMediaBan: {
    name: 'Social Media Ban (Under-16s)', branch: 'state',
    cost: cited(0, 'statutory_no_upfront_judgement'), quarters: 3, prereq: [], capacityLoad: 2,
    passReq: { coalition: cited(30, 'bloc_methodology') },
    politicalCapitalCost: cited(10, 'political_capital_authoring_methodology'),
    ideologyStance: { econ: 0, social: 0.3 },
    blurb: 'Australia-style statutory age gate. Lifts youth wellbeing; modest fertility recovery.',
    citationId: 'twenge_haidt_smartphone',
    onComplete: {
      healthBoost: cited(2, 'twenge_haidt_smartphone'),
      log: 'Social media age gate in force.',
    },
    blocEffects: {
      pensioners: cited(6, 'bloc_methodology'),
      middleClass: cited(4, 'bloc_methodology'),
      youth: cited(-5, 'bloc_methodology'),
    },
  },
  socialMediaAlgorithmBan: {
    name: 'Algorithmic Recommendation Ban', branch: 'state',
    cost: cited(0, 'statutory_no_upfront_judgement'), quarters: 5, prereq: ['socialMediaBan'], capacityLoad: 3,
    passReq: { coalition: cited(34, 'bloc_methodology') },
    politicalCapitalCost: cited(18, 'political_capital_authoring_methodology'),
    ideologyStance: { econ: -0.2, social: 0.3 },
    blurb: 'Ban personalised algorithmic feeds for minors and require opt-in for adults. Bigger demographic effect; harder on tech blocs.',
    citationId: 'haidt_anxious_generation',
    controversial: true,
    onComplete: {
      healthBoost: cited(3, 'haidt_anxious_generation'),
      ongoingRev: cited(-2, 'haidt_anxious_generation'),
      log: 'Algorithmic recommendation ban in force.',
    },
    blocEffects: {
      pensioners: cited(8, 'bloc_methodology'),
      middleClass: cited(5, 'bloc_methodology'),
      business: cited(-10, 'bloc_methodology'),
      youth: cited(-10, 'bloc_methodology'),
      professional: cited(-4, 'bloc_methodology'),
    },
    riskMods: {
      fintechIpo: cited(-3, 'haidt_anxious_generation'),
    },
  },
  triple_lock_plus: {
    name: 'Triple Lock+ Enhancement', branch: 'state',
    cost: cited(0, 'obr_triple_lock_plus'), quarters: 1, prereq: [], capacityLoad: 1,
    passReq: { coalition: cited(28, 'bloc_methodology') },
    blurb: 'Raise pension by max of CPI+1, earnings+1, or 3.5%.',
    citationId: 'obr_triple_lock_plus',
    controversial: true,
    onComplete: {
      ongoingCost: cited(8, 'obr_triple_lock_plus'),
      log: 'Pensioner generosity entrenched.',
    },
    blocEffects: {
      pensioners: cited(14, 'bloc_methodology'),
      youth: cited(-8, 'bloc_methodology'),
      workingClass: cited(-2, 'bloc_methodology'),
      professional: cited(-3, 'bloc_methodology'),
    },
  },
  amendBoeMandate: {
    name: 'Amend BoE to Dual Mandate', branch: 'state',
    cost: cited(0, 'statutory_no_upfront_judgement'), quarters: 4, prereq: [], capacityLoad: 3,
    passReq: { coalition: cited(38, 'bloc_methodology') },
    blurb: 'Statutory amendment: MPC weighs employment alongside inflation. Taylor rule shifts.',
    citationId: 'boe_dual_mandate_judgement',
    controversial: true,
    special: 'setBoeMandateDual',
    onComplete: {
      log: 'BoE remit amended. MPC now responds to unemployment as well as prices.',
    },
    blocEffects: {
      publicSector: cited(3, 'bloc_methodology'),
      workingClass: cited(2, 'bloc_methodology'),
      business: cited(-3, 'bloc_methodology'),
      professional: cited(-2, 'bloc_methodology'),
    },
  },
  scottishIndependence: {
    name: 'Scottish Independence Settlement', branch: 'state',
    cost: cited(3, 'scottish_independence_referendum_costs'),
    quarters: 6, prereq: [], capacityLoad: 6,
    passReq: { coalition: cited(65, 'bloc_methodology') },
    politicalCapitalCost: cited(50, 'political_capital_authoring_methodology'),
    ideologyStance: { econ: 0.0, social: 0.6 },
    blurb: 'Section 30 referendum and full independence transition. Permanent GDP loss on rUK base, debt-share settlement, sovereign yield jolt; the Barnett obligation shrinks to Wales + NI.',
    citationId: 'scottish_independence_reform',
    controversial: true,
    growthBonusPermanent: true,
    special: 'lowerDevolvedFloor',
    onComplete: {
      growthBonus: cited(-0.4, 'scottish_independence_gdp_shock'),
      debt: cited(25, 'scottish_independence_debt_shock'),
      bondYield: cited(0.4, 'scottish_independence_bond_yield'),
      log: 'Scotland is now an independent state. Westminster\'s devolved obligation now covers Wales + NI only.',
    },
    blocEffects: {
      northern: cited(-12, 'scottish_independence_bloc_effects'),
      business: cited(-8, 'scottish_independence_bloc_effects'),
      professional: cited(-6, 'scottish_independence_bloc_effects'),
      publicSector: cited(-5, 'scottish_independence_bloc_effects'),
      workingClass: cited(-3, 'scottish_independence_bloc_effects'),
      ethnicMinority: cited(2, 'scottish_independence_bloc_effects'),
    },
    riskMods: {
      independenceMovement: cited(-90, 'scottish_independence_risk_gate'),
    },
  },
  inflationTargetReview: {
    name: 'Raise Inflation Target to 3%', branch: 'state',
    cost: cited(0, 'statutory_no_upfront_judgement'), quarters: 3, prereq: [], capacityLoad: 3,
    passReq: { coalition: cited(36, 'bloc_methodology') },
    blurb: 'Remit raises target from 2% to 3%. Long-rate expectations re-price immediately.',
    citationId: 'inflation_target_review_judgement',
    controversial: true,
    special: 'raiseInflationTarget',
    onComplete: {
      log: 'Inflation target raised to 3%. Markets re-priced. MPC has more room.',
    },
    blocEffects: {
      workingClass: cited(2, 'bloc_methodology'),
      pensioners: cited(-4, 'bloc_methodology'),
      business: cited(-3, 'bloc_methodology'),
      professional: cited(-3, 'bloc_methodology'),
    },
  },
};

export const REFORM_BRANCHES = {
  revenue: 'Revenue',
  nhs: 'Health & Care',
  housing: 'Housing',
  green: 'Green & Infrastructure',
  education: 'Education & Skills',
  labour: 'Labour & Work',
  state: 'State Capacity',
};
