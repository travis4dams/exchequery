// =============================================================================
// PARAMS — every tunable numeric constant in the simulation.
//
// All values are wrapped via `cited(value, citationId)` so each parameter
// carries its provenance. The engine reads `.value` for calculations; the
// UI reads `.citationId` to render <CitationLink>.
//
// To tune a parameter: change the first argument of cited(). To add a new
// parameter: add an entry here and a corresponding citation in citations.js.
// =============================================================================

import { CITATIONS } from './citations.js';

// Helper: asserts every value points to a valid citation, returns wrapped leaf.
const cited = (value, citationId) => {
  if (!CITATIONS[citationId]) {
    throw new Error(`params.js references missing citation: ${citationId}`);
  }
  return { value, citationId };
};

export const PARAMS = {
  // ===========================================================================
  // Term & end-state thresholds
  // ===========================================================================
  termLength: cited(20, 'uk_election_cycle'),                       // quarters
  coalitionFloor: cited(22, 'coalition_floor_judgement'),           // %
  bondYieldCeiling: cited(8, 'bond_yield_ceiling_judgement'),       // %
  reelectionCoalitionThreshold: cited(38, 'reelection_threshold_judgement'),
  honeymoonResetWeight: cited(0.7, 'honeymoon_reset_judgement'),    // 0.7 current + 0.3 base
  blocDriftToBaseline: cited(0.05, 'bloc_drift_judgement'),         // fraction per quarter (pre /4)

  // ===========================================================================
  // Forecast noise
  // ===========================================================================
  forecastNoise: {
    base: cited(0.25, 'forecast_noise_methodology'),
    afterObr: cited(0.10, 'forecast_noise_methodology'),
  },

  // ===========================================================================
  // Initial macro state
  // ===========================================================================
  initial: {
    gdp: cited(3100, 'initial_nominal_gdp'),                        // £bn nominal
    realGDP: cited(3100, 'initial_nominal_gdp'),
    population: cited(67.5, 'initial_population'),                  // millions
    debt: cited(2950, 'obr_baseline_deficit'),                      // £bn
    deficit: cited(133, 'obr_baseline_deficit'),                    // £bn pa (PSNB at start; surfaced in AboutTab intro)
    growth: cited(1.1, 'obr_growth_baseline'),                      // % pa
    inflation: cited(2.8, 'ons_inflation_baseline'),                // % pa
    unemployment: cited(4.4, 'ons_unemployment_baseline'),          // %
    bondYield: cited(5.0, 'bond_yield_baseline'),                   // % (market gilt yield; drives sentiment / endgame ceiling)
    effectiveServicingRate: cited(3.7, 'effective_servicing_rate_baseline'), // % (effective rate paid on debt stock; drives debt-interest cost)
    healthIndex: cited(68, 'health_index_baseline'),                // 0-100
    gini: cited(33.0, 'ons_gini_baseline'),                         // Gini index
    taxIncomeAdd: cited(45, 'diamond_saez_top_rate'),               // % (anchor for delta calcs)
    taxIncomeHigh: cited(40, 'hmrc_higher_rate'),
    taxIncomeBasic: cited(20, 'hmrc_basic_rate'),
    taxCorp: cited(25, 'hmrc_corp_rate'),
    taxVAT: cited(20, 'hmrc_vat_rate'),
    spendNHS: cited(204, 'obr_nhs_baseline'),                       // £bn pa (baseline)
    spendEdu: cited(95, 'obr_edu_baseline'),
    spendWelfare: cited(187, 'obr_welfare_baseline'),
    spendDefence: cited(39, 'obr_defence_baseline'),
    spendInfra: cited(90, 'obr_infra_baseline'),
    spendLocal: cited(140, 'obr_local_baseline'),
    bankRate: cited(4.5, 'boe_current_bank_rate'),                  // %
    inflationTarget: cited(2.0, 'boe_inflation_target_remit'),       // % (mandated)
    naturalUnemployment: cited(4.0, 'boe_nairu_estimate'),           // % (NAIRU)
    politicalCapitalStart: cited(60, 'pc_regen_methodology'),       // honeymoon-but-not-full
    pmRelationshipStart: cited(60, 'pm_relationship_methodology'),  // honeymoon
    pmRelationshipReelectReset: cited(60, 'pm_relationship_methodology'),
    politicalCapitalReelectReset: cited(70, 'pc_regen_methodology'),
  },

  // ===========================================================================
  // Revenue model (calcRevenue)
  // ===========================================================================
  revenue: {
    incomeTax: {
      base: cited(330, 'hmrc_baseline_income_tax'),                 // £bn pa at baseline rates
      additionalRatePerPP: cited(0.16, 'diamond_saez_top_rate'),    // HMRC June 2025 RR (asymmetric: £145m yield / £175m cost; sim uses midpoint)
      higherRatePerPP: cited(1.6, 'hmrc_higher_rate'),              // HMRC June 2025 RR (FY 2026-27)
      basicRatePerPP: cited(6.9, 'hmrc_basic_rate'),                // HMRC June 2025 RR (FY 2026-27)
    },
    corpTax: {
      base: cited(96, 'hmrc_baseline_corp'),
      perPP: cited(3.6, 'hmrc_corp_rate'),                          // HMRC June 2025 RR (onshore main + small profits, FY 2026-27)
      curvatureAbove30: cited(0.5, 'corp_elasticity_curve'),        // quadratic penalty
      curvatureThreshold: cited(30, 'corp_elasticity_curve'),       // headline rate above which penalty applies
    },
    vat: {
      base: cited(181, 'hmrc_baseline_vat'),
      perPP: cited(8.8, 'hmrc_vat_rate'),                           // HMRC June 2025 RR (standard rate, FY 2026-27)
    },
    ni: cited(205, 'hmrc_baseline_ni'),
    other: cited(423, 'hmrc_other_baseline'),
    gdpScaleAnchor: cited(3100, 'initial_nominal_gdp'),             // revenue scales with GDP/anchor
  },

  // ===========================================================================
  // Spending model (calcSpending)
  // ===========================================================================
  spending: {
    fixedCosts: {
      pensions: cited(146, 'dwp_state_pensions'),
      justice: cited(55, 'moj_baseline'),
      otherDept: cited(302, 'whole_govt_residual'),
    },
    populationScaleAnchor: cited(67.5, 'initial_population'),
    effectiveRateDriftPerQuarter: cited(0.05, 'effective_servicing_rate_baseline'), // fraction of (marketYield - effectiveRate) gap closed per quarter
  },

  // ===========================================================================
  // Bond yield — anchored to Bank Rate plus a deficit kicker. Replaces the
  // pure-band model that drove yields independently of monetary policy.
  // bondYield = bankRate + termPremium + deficitYieldCoef × max(0, -annualBalance)
  // smoothed by yieldSmooth toward last quarter's value.
  // ===========================================================================
  bondYield: {
    floor: cited(2, 'bond_yield_response_judgement'),
    ceiling: cited(10, 'bond_yield_response_judgement'),
  },

  // ===========================================================================
  // Monetary policy — Bank of England reaction function (Taylor rule)
  // ===========================================================================
  monetary: {
    neutralRate: cited(3.5, 'boe_neutral_rate'),                   // % nominal anchor
    taylorInflationCoef: cited(1.5, 'taylor_rule_classic'),         // pp Bank Rate per pp inflation gap
    taylorUnempCoefDual: cited(0.5, 'taylor_rule_classic'),         // pp Bank Rate per pp unemployment gap (only under dual mandate)
    bankRateInertia: cited(0.5, 'boe_smoothing_methodology'),       // weight on prior-quarter Bank Rate
    bankRateClampLow: cited(0, 'boe_rate_history'),                 // % floor
    bankRateClampHigh: cited(12, 'boe_rate_history'),               // % ceiling
    termPremium: cited(0.3, 'boe_term_premium'),                    // pp added to Bank Rate to derive base bond yield
    deficitYieldCoef: cited(0.003, 'monetary_deficit_yield_judgement'), // pp on yield per £bn annual deficit
    yieldSmooth: cited(0.5, 'boe_smoothing_methodology'),           // weight on prior-quarter yield
    raisedInflationTarget: cited(3.0, 'inflation_target_review_judgement'), // value used by inflationTargetReview reform
    inflationTargetReviewYieldShock: cited(0.3, 'inflation_target_review_judgement'), // pp on bondYield on commit
  },

  // ===========================================================================
  // Phillips curve — inflation reaction to slack and demand
  // ===========================================================================
  phillips: {
    persistence: cited(0.85, 'obr_inflation_persistence'),          // weight on prior-quarter inflation
    slope: cited(0.3, 'boe_phillips_slope'),                        // pp inflation per pp (NAIRU − unemployment)
    vatImpulseCoef: cited(-0.6, 'phillips_demand_judgement'),       // pp inflation per pp VAT (negative = cut adds inflation)
    basicImpulseCoef: cited(-0.05, 'phillips_demand_judgement'),    // pp inflation per pp basic-rate
    growthDriftCoef: cited(0.05, 'phillips_demand_judgement'),      // pp inflation per pp (growth − trend)
  },

  // ===========================================================================
  // Okun's law — unemployment reaction to growth and real rates
  // ===========================================================================
  okun: {
    coefficient: cited(0.4, 'okun_uk_estimate'),                    // pp unemployment per pp growth gap (annual)
    trendGrowth: cited(1.5, 'okun_uk_estimate'),                    // %, anchor for output gap
    rateChannel: cited(0.1, 'okun_rate_channel_judgement'),         // pp unemployment per pp real-rate gap (annual)
    neutralRealRate: cited(1.5, 'okun_rate_channel_judgement'),     // %, anchor for real rate
  },

  // ===========================================================================
  // Growth drag from real interest rates
  // ===========================================================================
  growthDrag: {
    realRateCoef: cited(0.05, 'growth_drag_real_rate'),             // pp growth per pp real rate above neutral, per quarter
  },

  // ===========================================================================
  // Policy / spending thresholds at which bloc reactions and risk modifiers
  // kick in. Anchored on baseline policy levels but each threshold can shift
  // independently of the anchor for game-design reasons.
  // ===========================================================================
  thresholds: {
    corpHighRate: cited(28, 'policy_threshold_judgement'),         // > → business hostile
    corpLowRate: cited(22, 'policy_threshold_judgement'),          // < → working-class/public-sector hostile
    nhsBoostFloor: cited(214, 'policy_threshold_judgement'),       // > → bloc rewards (£10bn over £204 baseline)
    welfareCutFloor: cited(177, 'policy_threshold_judgement'),     // < → bloc hostility (£10bn below £187 baseline)
    eduCutFloor: cited(90, 'policy_threshold_judgement'),          // £5bn below £95 baseline
    localCutFloor: cited(135, 'policy_threshold_judgement'),       // £5bn below £140 baseline
    infraBoostFloor: cited(95, 'policy_threshold_judgement'),      // bloc rewards (£5bn over £90 baseline)
    infraInvestmentSurgeFloor: cited(100, 'policy_threshold_judgement'), // risk modifier (£10bn over baseline)
    basicRateGeneralStrikeFloor: cited(22, 'policy_threshold_judgement'),
    vatGeneralStrikeFloor: cited(22, 'policy_threshold_judgement'),
  },

  // ===========================================================================
  // Bloc-response coefficients (quarterlyBlocDelta)
  // All judgement; share the bloc_methodology citation for the overall framing
  // and a specific citation per response axis.
  //
  // Each entry below is a per-pp / per-£bn coefficient. Positive values mean
  // the bloc reacts positively to a rise in the policy variable; negative
  // values mean it reacts negatively. The engine applies sign conventions
  // appropriate to each lever (e.g., basic-rate CUTS produce positive bloc
  // responses on the working class).
  // ===========================================================================
  blocResponses: {
    // Income-tax additional rate (>45% baseline). All judgement.
    additionalRateAbove45: {
      workingClass: cited(0.4, 'bloc_response_additional_rate'),
      northern: cited(0.3, 'bloc_response_additional_rate'),
      business: cited(-0.6, 'bloc_response_additional_rate'),
      professional: cited(-0.5, 'bloc_response_additional_rate'),
    },
    higherRateAbove40: {
      middleClass: cited(-1.5, 'bloc_response_higher_rate'),
      professional: cited(-1.2, 'bloc_response_higher_rate'),
      publicSector: cited(-0.5, 'bloc_response_higher_rate'),
    },
    basicRateBelow20: {
      // Coefficient applied to (20 - taxIncomeBasic) — positive means bloc rewards a cut.
      workingClass: cited(1.8, 'bloc_response_basic_rate'),
      youth: cited(1.2, 'bloc_response_basic_rate'),
      pensioners: cited(0.6, 'bloc_response_basic_rate'),
      middleClass: cited(1.0, 'bloc_response_basic_rate'),
      northern: cited(1.5, 'bloc_response_basic_rate'),
      ethnicMinority: cited(1.3, 'bloc_response_basic_rate'),
    },
    basicRateAbove20: {
      // Applied to (taxIncomeBasic - 20) — positive means bloc penalises a rise.
      workingClass: cited(2.5, 'bloc_response_basic_rate'),
      middleClass: cited(1.8, 'bloc_response_basic_rate'),
      pensioners: cited(1.0, 'bloc_response_basic_rate'),
      northern: cited(2.0, 'bloc_response_basic_rate'),
      ethnicMinority: cited(1.5, 'bloc_response_basic_rate'),
    },
    vatAbove20: {
      workingClass: cited(2.2, 'bloc_response_vat'),
      pensioners: cited(1.5, 'bloc_response_vat'),
      northern: cited(1.8, 'bloc_response_vat'),
      ethnicMinority: cited(1.6, 'bloc_response_vat'),
      middleClass: cited(1.0, 'bloc_response_vat'),
    },
    vatBelow20: {
      workingClass: cited(2.5, 'bloc_response_vat'),
      pensioners: cited(1.8, 'bloc_response_vat'),
      northern: cited(2.0, 'bloc_response_vat'),
      middleClass: cited(1.2, 'bloc_response_vat'),
    },
    corpAbove28: {
      business: cited(-1.5, 'bloc_response_corp_rate'),
      professional: cited(-0.4, 'bloc_response_corp_rate'),
    },
    corpBelow22: {
      workingClass: cited(-0.8, 'bloc_response_corp_rate'),
      publicSector: cited(-0.6, 'bloc_response_corp_rate'),
    },
    nhsCutBelow200: {
      // Applied to (200 - spendNHS).
      pensioners: cited(0.4, 'bloc_response_nhs_spend'),
      publicSector: cited(0.5, 'bloc_response_nhs_spend'),
      workingClass: cited(0.3, 'bloc_response_nhs_spend'),
      northern: cited(0.3, 'bloc_response_nhs_spend'),
    },
    nhsBoostAbove210: {
      publicSector: cited(0.3, 'bloc_response_nhs_spend'),
      pensioners: cited(0.25, 'bloc_response_nhs_spend'),
      middleClass: cited(0.15, 'bloc_response_nhs_spend'),
    },
    welfareCutBelow290: {
      workingClass: cited(0.4, 'bloc_response_welfare_spend'),
      northern: cited(0.3, 'bloc_response_welfare_spend'),
      ethnicMinority: cited(0.3, 'bloc_response_welfare_spend'),
      youth: cited(0.2, 'bloc_response_welfare_spend'),
    },
    eduCutBelow85: {
      youth: cited(0.5, 'bloc_response_edu_spend'),
      publicSector: cited(0.4, 'bloc_response_edu_spend'),
      workingClass: cited(0.2, 'bloc_response_edu_spend'),
    },
    localCutBelow60: {
      publicSector: cited(0.4, 'bloc_response_local_spend'),
      middleClass: cited(0.3, 'bloc_response_local_spend'),
      workingClass: cited(0.3, 'bloc_response_local_spend'),
    },
    infraAbove40: {
      business: cited(0.2, 'bloc_response_infra_spend'),
      northern: cited(0.15, 'bloc_response_infra_spend'),
    },
    // Cost-of-living: per-pp coefficient applied to max(0, inflation − target).
    inflationAboveTarget: {
      pensioners: cited(6.0, 'cost_of_living_bloc_judgement'),
      workingClass: cited(4.5, 'cost_of_living_bloc_judgement'),
      ethnicMinority: cited(3.5, 'cost_of_living_bloc_judgement'),
      northern: cited(3.5, 'cost_of_living_bloc_judgement'),
      middleClass: cited(2.5, 'cost_of_living_bloc_judgement'),
      youth: cited(3.0, 'cost_of_living_bloc_judgement'),
      publicSector: cited(2.0, 'cost_of_living_bloc_judgement'),
    },
    // Jobs damage: per-pp coefficient applied to max(0, unemployment − NAIRU).
    unemploymentAboveNAIRU: {
      youth: cited(3.0, 'cost_of_living_bloc_judgement'),
      workingClass: cited(2.5, 'cost_of_living_bloc_judgement'),
      ethnicMinority: cited(2.0, 'cost_of_living_bloc_judgement'),
      northern: cited(2.0, 'cost_of_living_bloc_judgement'),
    },
  },

  // ===========================================================================
  // Risk register — base annual probabilities and per-quarter coefficients
  // ===========================================================================
  risks: {
    nhsStrike: {
      base: cited(25, 'nhs_strike_base'),
      perBnUnderfunded: cited(1.5, 'nhs_strike_funding_response'),
    },
    energyShock: { base: cited(18, 'energy_shock_base') },
    fuelPoverty: {
      base: cited(15, 'fuel_poverty_base'),
      perBnWelfareUnderfunded: cited(0.3, 'fuel_poverty_welfare_response'),
    },
    housingCrisis: { base: cited(22, 'housing_crisis_base') },
    councilBankruptcy: {
      base: cited(12, 'council_bankruptcy_base'),
      perBnLocalUnderfunded: cited(1.8, 'council_bankruptcy_local_response'),
    },
    financialCrisis: { base: cited(6, 'financial_crisis_base') },
    generalStrike: {
      base: cited(8, 'general_strike_base'),
      basicRateRiseKick: cited(8, 'general_strike_tax_response'),    // applied if taxIncomeBasic > 22
      vatRiseKick: cited(6, 'general_strike_tax_response'),         // applied if taxVAT > 22
    },
    careCrisis: {
      base: cited(14, 'care_crisis_base'),
      localUnderfundedKick: cited(5, 'council_bankruptcy_carecrisis_response'),
    },
    flood: { base: cited(10, 'flood_base') },
    heatwave: { base: cited(8, 'heatwave_base') },
    tradeDeal: { base: cited(5, 'trade_deal_base') },
    allyCrisis: { base: cited(7, 'ally_crisis_base') },
    investmentSurge: {
      base: cited(8, 'investment_surge_base'),
      perBnInfraOverbaseline: cited(0.3, 'investment_surge_infra_response'),
    },
    exportBoom: { base: cited(6, 'export_boom_base') },
    productivityJump: { base: cited(5, 'productivity_jump_base') },
    taxBeats: { base: cited(7, 'tax_beats_base') },
    demographicDividend: { base: cited(4, 'demographic_dividend_base') },
    labourShortage: { base: cited(0, 'labour_shortage_base') },     // triggered only by reforms
    rateHikeShock: {
      base: cited(4, 'monetary_event_methodology'),
      perRateRise: cited(8, 'monetary_event_methodology'),          // per pp 4Q rise in Bank Rate
    },
    wagePriceSpiral: {
      base: cited(3, 'monetary_event_methodology'),
      perGapProduct: cited(6, 'monetary_event_methodology'),        // per (pp hot labour × pp inflation gap)
    },
    monetaryPolicyError: {
      base: cited(2, 'monetary_event_methodology'),
      perDivergencePP: cited(4, 'monetary_event_methodology'),      // per pp |actual Bank Rate − Taylor| above 1pp
    },
    clampMin: cited(1, 'risk_caps_judgement'),
    clampMax: cited(90, 'risk_caps_judgement'),
  },

  // ===========================================================================
  // Population dynamics
  // ===========================================================================
  population: {
    quarterlyBaseline: cited(0.15, 'ons_baseline_quarterly_pop'),   // % per quarter
    immigrationCapDelta: cited(-0.4, 'obr_migration_cap'),          // per quarter when capped
    childcareDelta: cited(0.05, 'resolution_childcare'),            // per quarter when free childcare
  },

  // ===========================================================================
  // Reform capacity — limits how many reforms can run simultaneously
  // ===========================================================================
  reformCapacity: {
    deptBudgetAnchor: cited(605, 'reform_capacity_judgement'),     // £bn; baseline departmental total minus 5 slots' worth (755 − 150 = 605)
    deptBudgetPerSlot: cited(30, 'reform_capacity_judgement'),     // £bn of departmental spend per capacity point
    civilServiceBonus: cited(2, 'reform_capacity_judgement'),      // extra slots once civilService completes
    cancelBlocPenalty: cited(-3, 'reform_capacity_judgement'),     // applied to publicSector + professional on cancel
  },

  // ===========================================================================
  // Political capital — single 0-100 currency. Spent on proposing reforms;
  // regenerates each quarter from base + parliament mood + PM relationship.
  // ===========================================================================
  politicalCapital: {
    max: cited(100, 'pc_regen_methodology'),
    baseRegen: cited(8, 'pc_regen_methodology'),                  // per quarter at neutral mood + PM
    parliamentAlpha: cited(6, 'pc_regen_methodology'),            // contribution scaled by (mood-50)/50
    pmBeta: cited(4, 'pc_regen_methodology'),                     // contribution scaled by (pm-50)/50
    softCap: cited(80, 'pc_regen_methodology'),                   // above this, decay applies
    softCapDecay: cited(0.20, 'pc_regen_methodology'),            // fraction of (PC - softCap) lost per quarter
    defaultReformCost: cited(10, 'political_capital_authoring_methodology'),
    cancelPenalty: cited(10, 'pc_regen_methodology'),             // PC deducted on cancelReform
  },

  // ===========================================================================
  // Parliament — 632 GB constituencies modelled from ralphascott Census +
  // 2024 GE bundle. Each MP has a (econ, social) ideology vector anchored to
  // their party (CHES 2024) and adjusted by Hanretty 2016 Brexit (social) and
  // 2024 vote-share (econ) per-seat signals. Quarterly mood updates from
  // bloc-weighted constituent opinion, with inertia + per-seat noise.
  // ===========================================================================
  parliament: {
    inertia: cited(0.80, 'parliament_mood_methodology'),           // mood persistence per quarter
    seatMoodNoise: cited(3.0, 'parliament_mood_methodology'),      // ± points uniform per seat
    oppositionThreshold: cited(0.5, 'parliament_opposition_methodology'),  // free zone (dist - this = residual)
    strongOppositionCutoff: cited(0.5, 'parliament_opposition_methodology'),  // residual above this = "opposed MP"
    oppositionMult: cited(1.5, 'parliament_opposition_methodology'),
    cohesionPenaltyMult: cited(1.5, 'parliament_opposition_methodology'),
  },

  // ===========================================================================
  // PM relationship — 0-100 score. Modifies PC regen; gates a few reforms via
  // optional reform.requiresPmTrust. Updated each quarter from completed
  // reforms (ideological alignment with PM) and economic-stewardship events.
  // ===========================================================================
  pmRelationship: {
    max: cited(100, 'pm_relationship_methodology'),
    deltaAlignedScale: cited(4, 'pm_relationship_methodology'),    // multiplied by cosine alignment (signed)
    deltaCancel: cited(-5, 'pm_relationship_methodology'),
    cohesionLowThreshold: cited(30, 'pm_relationship_methodology'),
    deltaCohesionLow: cited(-1, 'pm_relationship_methodology'),
    yieldBreachThreshold: cited(5.5, 'pm_relationship_methodology'),
    deltaYieldBreach: cited(-4, 'pm_relationship_methodology'),
    surplusPayDownThreshold: cited(20, 'pm_relationship_methodology'),  // £bn
    deltaSurplusPayDown: cited(2, 'pm_relationship_methodology'),
    highParlMoodThreshold: cited(60, 'pm_relationship_methodology'),
    deltaHighParlMood: cited(1, 'pm_relationship_methodology'),
    meanReversionRate: cited(0.05, 'pm_relationship_methodology'),
    meanReversionTarget: cited(50, 'pm_relationship_methodology'),
  },

  // ===========================================================================
  // Surplus allocation effects (designer-set ratios)
  // ===========================================================================
  surplusAllocation: {
    servicesHealthDivisor: cited(8, 'surplus_allocation_judgement'),
    servicesWorkingClassDivisor: cited(10, 'surplus_allocation_judgement'),
    servicesPublicSectorDivisor: cited(12, 'surplus_allocation_judgement'),
    servicesPensionersDivisor: cited(14, 'surplus_allocation_judgement'),
    taxCutMiddleDivisor: cited(8, 'surplus_allocation_judgement'),
    taxCutBusinessDivisor: cited(6, 'surplus_allocation_judgement'),
    taxCutProfessionalDivisor: cited(10, 'surplus_allocation_judgement'),
    surplusAllocPromptThreshold: cited(10, 'surplus_allocation_judgement'),  // £bn
  },
};

// =============================================================================
// Helper: walk PARAMS depth-first and yield every cited leaf. Used by the
// confidence-summary view and to validate that every citationId resolves.
// =============================================================================
export function* walkParams(node = PARAMS, path = []) {
  if (node && typeof node === 'object' && 'citationId' in node && 'value' in node) {
    yield { path, ...node };
    return;
  }
  if (node && typeof node === 'object') {
    for (const [k, v] of Object.entries(node)) {
      yield* walkParams(v, [...path, k]);
    }
  }
}

// Validate at module load: throws if any cited reference is dangling.
for (const leaf of walkParams()) {
  if (!CITATIONS[leaf.citationId]) {
    throw new Error(`params.js: dangling citation "${leaf.citationId}" at ${leaf.path.join('.')}`);
  }
}
