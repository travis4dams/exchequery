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
    gdp: cited(2800, 'initial_nominal_gdp'),                        // £bn nominal
    realGDP: cited(2800, 'initial_nominal_gdp'),
    population: cited(67.5, 'initial_population'),                  // millions
    debt: cited(2800, 'obr_baseline_deficit'),                      // £bn
    growth: cited(1.2, 'obr_growth_baseline'),                      // % pa
    inflation: cited(2.8, 'ons_inflation_baseline'),                // % pa
    unemployment: cited(4.4, 'ons_unemployment_baseline'),          // %
    bondYield: cited(4.5, 'bond_yield_baseline'),                   // %
    healthIndex: cited(68, 'health_index_baseline'),                // 0-100
    gini: cited(35.2, 'ons_gini_baseline'),                         // Gini index
    taxIncomeAdd: cited(45, 'diamond_saez_top_rate'),               // % (anchor for delta calcs)
    taxIncomeHigh: cited(40, 'hmrc_higher_rate'),
    taxIncomeBasic: cited(20, 'hmrc_basic_rate'),
    taxCorp: cited(25, 'hmrc_corp_rate'),
    taxVAT: cited(20, 'hmrc_vat_rate'),
    spendNHS: cited(200, 'bloc_response_nhs_spend'),                // £bn pa (baseline)
    spendEdu: cited(90, 'bloc_response_edu_spend'),
    spendWelfare: cited(300, 'bloc_response_welfare_spend'),
    spendDefence: cited(55, 'whole_govt_residual'),
    spendInfra: cited(35, 'bloc_response_infra_spend'),
    spendLocal: cited(60, 'bloc_response_local_spend'),
  },

  // ===========================================================================
  // Revenue model (calcRevenue)
  // ===========================================================================
  revenue: {
    incomeTax: {
      base: cited(280, 'hmrc_baseline_income_tax'),                 // £bn pa at baseline rates
      additionalRatePerPP: cited(0.9, 'diamond_saez_top_rate'),     // ETI-derived
      higherRatePerPP: cited(4.5, 'hmrc_higher_rate'),
      basicRatePerPP: cited(7.2, 'hmrc_basic_rate'),
    },
    corpTax: {
      base: cited(100, 'hmrc_baseline_corp'),
      perPP: cited(4, 'hmrc_corp_rate'),
      curvatureAbove30: cited(0.5, 'corp_elasticity_curve'),        // quadratic penalty
      curvatureThreshold: cited(30, 'corp_elasticity_curve'),       // headline rate above which penalty applies
    },
    vat: {
      base: cited(180, 'hmrc_baseline_vat'),
      perPP: cited(8.5, 'hmrc_vat_rate'),
    },
    ni: cited(170, 'hmrc_baseline_ni'),
    other: cited(200, 'hmrc_other_baseline'),
    gdpScaleAnchor: cited(2800, 'initial_nominal_gdp'),             // revenue scales with GDP/anchor
  },

  // ===========================================================================
  // Spending model (calcSpending)
  // ===========================================================================
  spending: {
    fixedCosts: {
      pensions: cited(130, 'dwp_state_pensions'),
      justice: cited(40, 'moj_baseline'),
      otherDept: cited(110, 'whole_govt_residual'),
    },
    populationScaleAnchor: cited(67.5, 'initial_population'),
  },

  // ===========================================================================
  // Bond-yield response per quarter (calcBalance → bondYield update)
  // Thresholds are £bn ANNUAL balance; adjustments are pp on yield.
  // ===========================================================================
  bondYield: {
    floor: cited(2, 'bond_yield_response_judgement'),
    ceiling: cited(10, 'bond_yield_response_judgement'),
    bigDeficitThreshold: cited(-200, 'bond_yield_response_judgement'),
    bigDeficitDelta: cited(0.08, 'bond_yield_response_judgement'),
    midDeficitThreshold: cited(-100, 'bond_yield_response_judgement'),
    midDeficitDelta: cited(0.02, 'bond_yield_response_judgement'),
    surplusDelta: cited(-0.06, 'bond_yield_response_judgement'),    // applied when balance > 0
    smallDeficitThreshold: cited(-50, 'bond_yield_response_judgement'),
    smallDeficitDelta: cited(-0.03, 'bond_yield_response_judgement'),
  },

  // ===========================================================================
  // Policy / spending thresholds at which bloc reactions and risk modifiers
  // kick in. Anchored on baseline policy levels but each threshold can shift
  // independently of the anchor for game-design reasons.
  // ===========================================================================
  thresholds: {
    corpHighRate: cited(28, 'policy_threshold_judgement'),         // > → business hostile
    corpLowRate: cited(22, 'policy_threshold_judgement'),          // < → working-class/public-sector hostile
    nhsBoostFloor: cited(210, 'policy_threshold_judgement'),       // > → bloc rewards
    welfareCutFloor: cited(290, 'policy_threshold_judgement'),     // < → bloc hostility
    eduCutFloor: cited(85, 'policy_threshold_judgement'),
    localCutFloor: cited(60, 'policy_threshold_judgement'),
    infraBoostFloor: cited(40, 'policy_threshold_judgement'),      // bloc rewards
    infraInvestmentSurgeFloor: cited(45, 'policy_threshold_judgement'), // risk modifier
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
