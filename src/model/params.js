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
// Optional third arg `{ band }` declares per-leaf forecast uncertainty —
// `{ low, high }` relative multipliers (asymmetric allowed); see
// src/model/uncertainty.js. Mode of the sampling distribution stays at `value`.
const cited = (value, citationId, opts) => {
  if (!CITATIONS[citationId]) {
    throw new Error(`params.js references missing citation: ${citationId}`);
  }
  const leaf = { value, citationId };
  if (opts && opts.band) {
    const b = opts.band;
    const low = typeof b.low === 'number' ? b.low : -(b.width ?? 0);
    const high = typeof b.high === 'number' ? b.high : (b.width ?? 0);
    if (!(low <= 0 && high >= 0)) {
      throw new Error(`params.js: band at ${citationId} must straddle zero (got low=${low}, high=${high})`);
    }
    leaf.band = { low, high, dist: b.dist || 'triangular' };
  }
  return leaf;
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
  //
  // `bandFallback` is the symmetric relative band applied to a reform/event
  // leaf when its `cited()` site hasn't declared a per-field band yet. Once
  // every leaf is authored, this fallback can be retired.
  //
  // `obrMultiplier` scales the width of every band (both authored and
  // fallback) after the OBR Independence reform completes — the single
  // global narrowing knob.
  //
  // `eventDefaultBand` is the default magnitude band on event effects (the
  // central effect value is what the player sees in the modal; the realised
  // magnitude is sampled inside this band).
  // ===========================================================================
  forecastNoise: {
    bandFallback: cited(0.25, 'forecast_noise_methodology'),
    obrMultiplier: cited(0.4, 'forecast_noise_methodology'),
    eventDefaultBand: cited(0.15, 'event_magnitude_default'),
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
    spendJustice: cited(55, 'moj_baseline'),                        // MoJ + Home Office + courts
    spendFCDO: cited(15, 'fcdo_baseline'),                          // ODA + diplomatic
    spendDEFRA: cited(8, 'defra_baseline'),                         // Environment, flood, rural
    spendRnD: cited(18, 'rnd_baseline'),                            // UKRI + dept R&D + tax credits
    spendDevolved: cited(71, 'devolved_block_grant_baseline'),      // Scotland + Wales + NI
    bankRate: cited(4.5, 'boe_current_bank_rate'),                  // %
    inflationTarget: cited(2.0, 'boe_inflation_target_remit'),       // % (mandated)
    naturalUnemployment: cited(4.25, 'boe_nairu_estimate'),          // % (NAIRU — Carney TSC 2017, ResFound 2024)
    politicalCapitalStart: cited(60, 'pc_regen_methodology'),       // honeymoon-but-not-full
    pmRelationshipStart: cited(60, 'pm_relationship_methodology'),  // honeymoon
    pmRelationshipReelectReset: cited(60, 'pm_relationship_methodology'),
    politicalCapitalReelectReset: cited(70, 'pc_regen_methodology'),
    housePriceIndex: cited(100, 'housing_index_methodology'),       // index, baseline 100
    energyPriceIndex: cited(100, 'energy_mix_methodology'),         // index, baseline 100
    housingSupply: cited(220, 'mhclg_housing_starts'),              // k new dwellings pa (England net additions)
    equityIndex: cited(100, 'equity_index_methodology'),            // FTSE-style aggregate, baseline 100
    riskPremium: cited(0, 'reinhart_rogoff_sovereign_premium'),     // pp on bondYield
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

    // Income tax + NI partial scaling against the wage bill (wageIndex/100
    // × employment). VAT, corp tax, and "other" continue to scale entirely
    // with GDP. wageBillAnchor is the Q1 wageIndex/100 × employment product
    // (= 1.0 × population × workingAgeShare × participationRate × (1 −
    // unemployment/100) ≈ 33.04); pinning it here keeps wageScale=1 at
    // game start so Q1 revenue matches the prior pure-GDP scaling to
    // within ~0.002% (fp slack vs the rounded anchor).
    incomeTaxWageShare: cited(0.70, 'hmrc_wage_share_of_it'),
    niWageShare:        cited(0.95, 'hmrc_ni_wage_base'),
    wageBillAnchor:     cited(33.04, 'ons_compensation_employees'),
  },

  // ===========================================================================
  // Spending model (calcSpending)
  // ===========================================================================
  spending: {
    fixedCosts: {
      pensions: cited(146, 'dwp_state_pensions'),
      otherDept: cited(190, 'whole_govt_residual'),
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
    neutralRate: cited(4.0, 'boe_neutral_rate'),                   // % nominal anchor (Mercatus 2025 survey-based UK r*)
    taylorInflationCoef: cited(1.5, 'taylor_rule_classic'),         // pp Bank Rate per pp inflation gap
    taylorUnempCoefDual: cited(0.5, 'taylor_rule_classic'),         // pp Bank Rate per pp unemployment gap (only under dual mandate)
    bankRateInertia: cited(0.75, 'coibion_gorodnichenko_inertia_2012'), // weight on prior-quarter Bank Rate (Coibion-Gorodnichenko 2012)
    bankRateClampLow: cited(0, 'boe_rate_history'),                 // % floor
    bankRateClampHigh: cited(12, 'boe_rate_history'),               // % ceiling
    termPremium: cited(0.3, 'boe_term_premium'),                    // pp added to Bank Rate to derive base bond yield
    deficitYieldCoef: cited(0.006, 'monetary_deficit_yield_judgement'), // pp on yield per £bn annual deficit (Fed IFDP 1011 2010)
    yieldSmooth: cited(0.5, 'boe_smoothing_methodology'),           // weight on prior-quarter yield
    raisedInflationTarget: cited(3.0, 'inflation_target_review_judgement'), // value used by inflationTargetReview reform
    inflationTargetReviewYieldShock: cited(0.3, 'inflation_target_review_judgement'), // pp on bondYield on commit

    // Passive-demand discount on term premium (Chicago Fed Letter 480, 2023).
    // effectiveTermPremium = termPremium - passiveDemandWeight × equity.ldi.longGiltDemandShare.
    passiveDemandWeight: cited(0.5, 'chicago_fed_480_ldi_2023'),     // judgement; halves the maximal LDI-demand discount

    // QE/QT yield-effect coefficients. qeYieldEffectPerBn is consumed by the
    // LDI doom-loop "Emergency QE" choice; qtYieldEffectPerBn is staged for a
    // future QT-shrinking event.
    qeYieldEffectPerBn: cited(0.5, 'joyce_tong_woods_qe_2011'),     // bp gilt yield per £bn of QE
    qtYieldEffectPerBn: cited(0.3, 'boe_qb_2022_q1_qt'),            // bp gilt yield per £bn of QT (asymm; not yet consumed)

    // Mortgage pass-through lag — house prices read s.mortgageRate, not s.bankRate.
    // updateMortgageRate(s) = fixedShare × bankRate + (1−fixedShare) × bankRate from
    // lagQuarters ago + wedgeBps / 100. With UK 86% fixed-rate share (BoE MLAR Q3 2022)
    // and 2-year dominant fix, lag=8 quarters captures the dominant maturity.
    mortgagePassthrough: {
      lagQuarters: cited(8,   'boe_mlar_mortgage_fixing_2022'),
      wedgeBps:    cited(30,  'boe_mpr_mortgage_wedge_2025'),
      fixedShare:  cited(0.5, 'boe_mlar_mortgage_fixing_2022'),
    },
  },

  // ===========================================================================
  // Phillips curve — inflation reaction to slack and demand.
  // Asymmetric slope per Bunn et al. (BoE WP 1107, 2025): hot-labour-market
  // slope ~3× the slack-side slope. Trend-inflation modifier amplifies the
  // Phillips term when CPI exceeds threshold (menu-cost mechanism).
  // engine.js updateInflation branches on (NAIRU − unemployment) sign.
  // ===========================================================================
  phillips: {
    persistence: cited(0.85, 'obr_inflation_persistence'),          // weight on prior-quarter inflation
    slopePositive: cited(0.19, 'bunn_phillips_curvature_2025'),     // pp inflation per pp slack when unemployment < NAIRU (hot)
    slopeNegative: cited(0.06, 'bunn_phillips_curvature_2025'),     // pp inflation per pp slack when unemployment > NAIRU (slack)
    trendInflationModifier: cited(1.5, 'bunn_phillips_curvature_2025'), // multiplier on Phillips term when inflation > threshold
    trendInflationThreshold: cited(4.0, 'bunn_phillips_curvature_2025'), // % CPI above which modifier activates
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
    neutralRealRate: cited(2.0, 'okun_rate_channel_judgement'),     // %, anchor for real rate (4.0% nominal neutral − 2% target)
  },

  // ===========================================================================
  // Growth dynamics — real-rate drag, Laffer drag, mean reversion, noise
  // ===========================================================================
  growthDrag: {
    realRateCoef:        cited(0.05, 'growth_drag_real_rate'),       // pp growth per pp real rate above neutral, per quarter
    topIncomeLafferCoef: cited(0.04, 'diamond_saez_top_rate'),       // pp growth per pp top-rate above topIncomeLafferRate, per quarter
    corpLafferCoef:      cited(0.06, 'corp_elasticity_curve'),       // pp growth per pp corp tax above corpHighRate, per quarter
  },
  potentialGrowth: cited(1.5, 'obr_growth_baseline'),                // % pa anchor for mean reversion
  growthReversion: {
    rate: cited(0.15, 'growth_mean_reversion_judgement'),            // fraction of gap to anchor closed per quarter
  },
  growthNoise: {
    sigma: cited(0.2, 'growth_noise_judgement'),                     // pp stdev per quarter (Box-Muller)
  },

  // ===========================================================================
  // Housing market — index dynamics + CPI feed-through
  //   HPI evolves as: persistence × HPI_{t-1} + (1 − persistence) × forcing
  //   forcing = 100 + priceWageElasticity × wageGrowthSignal
  //                 + priceRateElasticity × realRateGap
  //                 + supplyResponsePerKpa × (housingSupply − baseSupplyKpa)
  //   housingInflationContribution = cpiWeight × (HPI/100 − 1) × 10  (pp into CPI forcing)
  // ===========================================================================
  housing: {
    cpiWeight: cited(0.16, 'ons_cpih_weights'),                     // CPIH housing weight
    priceWageElasticity: cited(0.4, 'ifs_housing_wages'),           // pp HPI per pp wage growth signal
    priceRateElasticity: cited(-6.0, 'boe_housing_rates'),          // pp HPI per pp real-rate gap (Miles-Monro BoE WP 837 2019)
    supplyResponsePerKpa: cited(-0.1, 'barker_review'),             // pp HPI per k pa supply above baseline
    baseSupplyKpa: cited(220, 'mhclg_housing_starts'),              // baseline net additions pa
    supplyReformBoostKpa: cited(60, 'barker_review'),               // additional pa once housingSupplyTarget completes
    persistence: cited(0.8, 'housing_index_methodology'),           // weight on prior-quarter HPI
    cpiContributionScale: cited(10, 'housing_index_methodology'),   // scales (HPI/100 − 1) into pp-CPI; tunable
  },

  // ===========================================================================
  // Energy market — index dynamics + CPI feed-through
  //   energyPriceIndex evolves as: shockDecay × (index − 100) + 100 + drift terms
  // ===========================================================================
  energy: {
    cpiWeight: cited(0.04, 'ons_cpih_weights'),                     // CPIH energy weight
    shockDecay: cited(0.85, 'imf_energy_shock_persistence'),        // per-quarter decay of shock toward baseline
    baselineDrift: cited(0.5, 'ofgem_cap_trend'),                   // pp on index per quarter
    greenInvestDampener: cited(-0.3, 'gb_energy_grid'),             // pp on index per quarter once greenInvest complete
    importDependenceFloor: cited(0.4, 'energy_mix_methodology'),    // floor after energyMixReform
    cpiContributionScale: cited(10, 'energy_mix_methodology'),      // scales (idx/100 − 1) into pp-CPI; tunable
    shockReformDamper: cited(0.5, 'ccc_seventh_carbon_budget'),     // multiplier applied to energyShock injections once energyMixReform complete

    // Ofgem cap dynamics — consumed by updateEnergyPriceIndex via the
    // energyShockBuffer (FIFO, oldest at index 0). cap contribution at quarter T
    // reads buffer[length − lagQuarters], scaled by passthrough. Gas-import-
    // dependence scales incoming shock magnitudes in resolveEvent.
    cap: {
      passthrough:         cited(0.85, 'ofgem_cap_passthrough'),    // fraction of wholesale shock passing through cap
      lagQuarters:         cited(2,    'ofgem_cap_passthrough'),    // 6-month Ofgem lookback
      gasImportDependence: cited(0.5,  'desnz_dukes_2024'),         // fraction of UK gas demand met by imports
    },
  },

  // ===========================================================================
  // Equity market — index dynamics + wealth effect on growth
  //   equityIndex evolves toward forcing = 100 + earningsCoef*growth_gap
  //                  − taxCorpDrag*(taxCorp − corpAnchor)
  //                  − rateSensitivity*realRateGap
  //                  + businessSentiment*(blocSupport.business − 50)/50 * scale
  //                  − regulationDrag*regulationIndex
  //                  + sentimentNoise*Math.random()
  //   wealthEffectOnGrowth = 0.05 × (equityIndex/100 − 1), capped ±0.1pp
  // ===========================================================================
  equity: {
    persistence: cited(0.7, 'equity_index_methodology'),            // weight on prior-quarter equity index
    earningsCoef: cited(3.0, 'ofs_buyback_methodology'),            // pp index per pp growth gap
    taxCorpDrag: cited(1.2, 'ofs_buyback_methodology'),             // pp index per pp corp tax above anchor
    rateSensitivity: cited(3.0, 'equity_index_methodology'),        // pp index per pp real rate above neutral
    businessSentimentScale: cited(8.0, 'equity_index_methodology'), // pp index per unit (business bloc - 50)/50
    sentimentNoiseScale: cited(3.0, 'ofs_buyback_methodology'),     // ± pp uniform per quarter
    wealthEffectCoef: cited(0.05, 'damodaran_equity_risk_premium'), // pp growth per pp index above 100
    wealthEffectCap: cited(0.1, 'damodaran_equity_risk_premium'),   // pp growth cap per quarter
    pensionDamper: cited(0.7, 'pensions_dashboards_methodology'),   // multiplier on equity-shock injections once pensionConsolidation completes
    cityRegulationDamper: cited(0.6, 'bcbs_macroprudential_capital'), // multiplier on cohesion-volatility coef once cityRegulation completes

    // LDI / DB-pension structural demand for long-end gilts. Consumed in two
    // places: (1) the LDI doom-loop event gate in computeRiskMods; (2) the
    // passive-demand discount on the term premium in bondYieldFromBankRate.
    ldi: {
      longGiltDemandShare:       cited(0.28, 'chicago_fed_480_ldi_2023'),  // share of long-end gilt market
      doomLoopYieldDeltaTrigger: cited(150,  'event_ldi_doom_loop'),       // bp/quarter trigger threshold
    },
  },

  // ===========================================================================
  // Health — pandemic damper multipliers (mirror energy.shockReformDamper)
  // ===========================================================================
  health: {
    pandemicDamperPreventative: cited(0.7, 'pandemic_damper_judgement'),  // multiplier applied to pandemic effect magnitudes when preventativeHealth complete
    pandemicDamperSocialCare:   cited(0.8, 'pandemic_damper_judgement'),  // additional multiplier when socialCareSystemic complete (compounds with preventative)
  },

  // ===========================================================================
  // Risk premium — sovereign spread above the term-premium-anchored target
  // ===========================================================================
  riskPremium: {
    debtThreshold: cited(100, 'reinhart_rogoff_sovereign_premium'), // % debt-to-GDP above which spread starts widening
    debtCoef: cited(0.01, 'reinhart_rogoff_sovereign_premium'),     // pp premium per pp debt-to-GDP above threshold
    volatilityCoef: cited(0.1, 'imf_cohesion_volatility_premium'),  // pp premium per pp stdev of cohesion history
    floor: cited(0, 'reinhart_rogoff_sovereign_premium'),
    ceiling: cited(4, 'reinhart_rogoff_sovereign_premium'),
  },

  // ===========================================================================
  // Policy / spending thresholds at which bloc reactions and risk modifiers
  // kick in. Anchored on baseline policy levels but each threshold can shift
  // independently of the anchor for game-design reasons.
  // ===========================================================================
  thresholds: {
    topIncomeLafferRate: cited(50, 'diamond_saez_top_rate'),       // > → growth drag (Laffer)
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
    // New departmental sliders — cut/boost floors. See policy_threshold_dept_judgement.
    justiceCutFloor: cited(50, 'policy_threshold_dept_judgement'),
    justiceBoostFloor: cited(65, 'policy_threshold_dept_judgement'),
    fcdoCutFloor: cited(10, 'policy_threshold_dept_judgement'),
    fcdoBoostFloor: cited(20, 'policy_threshold_dept_judgement'),
    defraCutFloor: cited(6, 'policy_threshold_dept_judgement'),
    defraBoostFloor: cited(12, 'policy_threshold_dept_judgement'),
    rndCutFloor: cited(15, 'policy_threshold_dept_judgement'),
    rndBoostFloor: cited(25, 'policy_threshold_dept_judgement'),
    devolvedCutFloor: cited(65, 'policy_threshold_dept_judgement'),
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
    // Justice & Home Affairs (£55bn baseline; cut floor 50, boost floor 65)
    justiceCutBelowFloor: {
      // Applied to (justiceCutFloor - spendJustice)
      workingClass: cited(0.20, 'bloc_response_justice_spend'),
      pensioners: cited(0.15, 'bloc_response_justice_spend'),
      northern: cited(0.15, 'bloc_response_justice_spend'),
      ethnicMinority: cited(-0.10, 'bloc_response_justice_spend'),  // negative = relief from Home Office cuts
    },
    justiceBoostAboveFloor: {
      // Applied to (spendJustice - justiceBoostFloor)
      youth: cited(0.10, 'bloc_response_justice_spend'),
      ethnicMinority: cited(0.15, 'bloc_response_justice_spend'),
      professional: cited(0.05, 'bloc_response_justice_spend'),
    },
    // FCDO / Foreign Aid (£15bn baseline; cut floor 10, boost floor 20)
    fcdoCutBelowFloor: {
      business: cited(0.40, 'bloc_response_fcdo_spend'),
      professional: cited(0.30, 'bloc_response_fcdo_spend'),
      workingClass: cited(-0.20, 'bloc_response_fcdo_spend'),
      northern: cited(-0.20, 'bloc_response_fcdo_spend'),
    },
    fcdoBoostAboveFloor: {
      business: cited(0.20, 'bloc_response_fcdo_spend'),
      professional: cited(0.15, 'bloc_response_fcdo_spend'),
      workingClass: cited(0.15, 'bloc_response_fcdo_spend'),
      northern: cited(0.15, 'bloc_response_fcdo_spend'),
    },
    // DEFRA (£8bn baseline; cut floor 6, boost floor 12)
    defraCutBelowFloor: {
      youth: cited(0.40, 'bloc_response_defra_spend'),
      professional: cited(0.30, 'bloc_response_defra_spend'),
      northern: cited(-0.10, 'bloc_response_defra_spend'),
      business: cited(-0.15, 'bloc_response_defra_spend'),
    },
    defraBoostAboveFloor: {
      youth: cited(0.20, 'bloc_response_defra_spend'),
      professional: cited(0.15, 'bloc_response_defra_spend'),
      northern: cited(0.10, 'bloc_response_defra_spend'),
    },
    // R&D (£18bn baseline; cut floor 15, boost floor 25)
    rndCutBelowFloor: {
      professional: cited(0.50, 'bloc_response_rnd_spend'),
      business: cited(0.40, 'bloc_response_rnd_spend'),
      youth: cited(0.30, 'bloc_response_rnd_spend'),
    },
    rndBoostAboveFloor: {
      professional: cited(0.30, 'bloc_response_rnd_spend'),
      business: cited(0.25, 'bloc_response_rnd_spend'),
      youth: cited(0.15, 'bloc_response_rnd_spend'),
    },
    // Devolved transfers (£71bn baseline; cut floor 65, no symmetric boost)
    devolvedCutBelowFloor: {
      northern: cited(0.30, 'bloc_response_devolved_spend'),
      publicSector: cited(0.25, 'bloc_response_devolved_spend'),
      ethnicMinority: cited(0.10, 'bloc_response_devolved_spend'),
      workingClass: cited(0.20, 'bloc_response_devolved_spend'),
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
    financialCrisis: { base: cited(8, 'financial_crisis_base') },
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
    housePriceCorrection: {
      base: cited(2, 'housing_market_methodology'),
      perHpiAboveThreshold: cited(5, 'housing_market_methodology'), // per pp HPI above 120
    },
    planningRevolt: {
      base: cited(0, 'housing_supply_politics_judgement'),          // 0 until housingSupplyTarget completes
      postReformBase: cited(15, 'housing_supply_politics_judgement'),
    },
    equityCrash: {
      base: cited(2, 'equity_index_methodology'),
      perEquityAboveThreshold: cited(4, 'equity_index_methodology'), // per pp equity index above 130
    },
    giltStrike: {
      base: cited(0, 'event_gilt_strike'),                          // gated on riskPremium > 2.5
      whenPremiumAbove: cited(2.5, 'event_gilt_strike'),
      activeBase: cited(40, 'event_gilt_strike'),
    },
    sovereignRatingAction: {
      base: cited(0, 'event_sovereign_rating_action'),              // gated on debt > 110 + premium > 1.5
      whenPremiumAbove: cited(1.5, 'event_sovereign_rating_action'),
      whenDebtAbove: cited(110, 'event_sovereign_rating_action'),
      activeBase: cited(25, 'event_sovereign_rating_action'),
    },
    recession: {
      base:            cited(1.6, 'recession_business_cycle_judgement'),  // % per quarter baseline (Broadberry et al. EHR 2023: 16-yr cycle ≈ 6.25%/yr)
      overheatingCoef: cited(4,   'recession_business_cycle_judgement'),  // % per (growthGap × inflGap) pp-product
    },
    civilUnrest: {
      base: cited(2, 'civil_unrest_base'),
      perBnJusticeUnderfunded: cited(1.5, 'civil_unrest_justice_response'),  // per £bn below justiceCutFloor
    },
    diplomaticIsolation: {
      base: cited(2, 'diplomatic_isolation_base'),
      perBnFcdoUnderfunded: cited(2.0, 'diplomatic_isolation_fcdo_response'),  // per £bn below fcdoCutFloor
    },
    independenceMovement: {
      base: cited(3, 'independence_movement_base'),
      perBnDevolvedUnderfunded: cited(1.2, 'independence_movement_devolved_response'),  // per £bn below devolvedCutFloor
    },

    // Red Box expansion events
    pandemic: {
      base: cited(5, 'event_pandemic'),                               // ~5%/yr long-run hazard per Madhav et al. (2017)
      perBnNhsUnderfunded: cited(0.4, 'event_pandemic'),              // pp probability per £bn NHS spend under anchor
    },
    teacherStrike: {
      base: cited(12, 'event_teacher_strike'),
      perBnEduUnderfunded: cited(1.2, 'event_teacher_strike'),
    },
    droughtStress: {
      base: cited(6, 'event_drought_stress'),
      summerKick: cited(8, 'event_drought_stress'),                   // additional pp probability in Q3 (summer)
    },
    supplyChainShock: {
      base: cited(10, 'event_supply_chain_shock'),
      perPpRiskPremium: cited(3, 'event_supply_chain_shock'),         // pp probability per pp riskPremium
    },
    cyberAttack: {
      base: cited(8, 'event_cyber_attack'),
    },
    coldSnap: {
      base: cited(12, 'event_cold_snap'),
      winterKick: cited(6, 'event_cold_snap'),                        // additional pp probability in Q1 or Q4
    },
    aiDisplacement: {
      base: cited(5, 'event_ai_displacement'),
      perGlobalQuarter: cited(0.2, 'event_ai_displacement'),          // pp probability per globalQuarter (rises over time)
    },
    scientificBreakthrough: { base: cited(5, 'event_scientific_breakthrough') },
    sterlingSlide: {
      base: cited(0, 'event_sterling_slide'),                         // gated on combined market stress
      whenStressAbove: cited(6.5, 'event_sterling_slide'),            // bondYield + riskPremium threshold
      activeBase: cited(20, 'event_sterling_slide'),
    },
    commercialPropertyCrash: {
      base: cited(3, 'event_commercial_property_crash'),
      perEquityAboveThreshold: cited(3, 'event_commercial_property_crash'),  // pp prob per pp equity above 130
    },
    pensionFundCrisis: {
      base: cited(4, 'event_pension_fund_crisis'),
      perEquityBelowThreshold: cited(3, 'event_pension_fund_crisis'),  // pp prob per pp equity below 85
    },
    fintechIpo: { base: cited(4, 'event_fintech_ipo') },
    inflationSurprise: {
      base: cited(5, 'event_inflation_surprise'),
      perPpAboveTarget: cited(3, 'event_inflation_surprise'),         // pp probability per pp inflation above target (capped via clampMax)
    },
    cabinetScandal: {
      base: cited(10, 'event_cabinet_scandal'),
      perPpMoodDeficit: cited(0.5, 'event_cabinet_scandal'),          // pp probability per pp of parliamentMood < 0
    },
    devolutionDispute: {
      base: cited(6, 'event_devolution_dispute'),
      perBnLocalUnderfunded: cited(0.5, 'event_devolution_dispute'),
    },

    // LDI doom-loop (BoE Staff WP 1019, 2023). Gated event: activates when
    // (currentBondYield − previousQuarterBondYield) × 100 > yieldDeltaTrigger
    // AND longGiltDemandShare × 100 > ldiShareThreshold. The 30-year gilt rose
    // 120bp over 3 days post-2022 mini-budget — sim uses 150bp/quarter as a
    // conservative trigger to filter routine yield moves.
    ldiDoomLoop: {
      base:               cited(0,   'event_ldi_doom_loop'),
      yieldDeltaTrigger:  cited(150, 'event_ldi_doom_loop'),       // bp/quarter rise threshold
      ldiShareThreshold:  cited(25,  'event_ldi_doom_loop'),       // % of long-end gilt market
      activeBase:         cited(40,  'event_ldi_doom_loop'),       // pp/yr when active
      qeSize:             cited(100, 'joyce_tong_woods_qe_2011'),  // £bn — representative BoE QE round size
    },

    clampMin: cited(1, 'risk_caps_judgement'),
    clampMax: cited(90, 'risk_caps_judgement'),
  },

  // ===========================================================================
  // Population dynamics
  // ===========================================================================
  population: {
    // Legacy aggregate growth — retained for backward compatibility while the
    // births/deaths/migration decomposition is the active path. Removed once
    // nothing reads quarterlyPopulationGrowth().
    quarterlyBaseline: cited(0.15, 'ons_baseline_quarterly_pop'),   // % per quarter
    immigrationCapDelta: cited(-0.4, 'obr_migration_cap'),          // per quarter when capped (legacy)
    childcareDelta: cited(0.05, 'resolution_childcare'),            // per quarter when free childcare (legacy)

    // Decomposition baselines — sum to ~25k/q so Q1 reproduces the legacy
    // aggregate trajectory.
    birthsBaselineQ:         cited(148, 'ons_births_2024'),         // thousand / quarter
    deathsBaselineQ:         cited(140, 'ons_deaths_2024'),         // thousand / quarter
    netMigrationBaselineQ:   cited(17,  'ons_lts_migration_2024'),  // thousand / quarter

    // Driver coefficients.
    birthsHealthCoef:        cited(0.5,  'wellings_birth_drivers'),         // k/q per healthIndex pp above 50
    deathsHealthCoef:        cited(-1.2, 'marmot_austerity_mortality'),     // k/q per healthIndex pp above 50
    deathsNHSCoef:           cited(-0.4, 'marmot_austerity_mortality'),     // k/q per £bn NHS above baseline
    migrationUnempCoef:      cited(-12.0, 'mac_unemployment_push'),         // k/q per pp unemployment above NAIRU

    // Per-reform deltas wired through the new channels (rather than the
    // legacy aggregate). Magnitudes preserve the legacy headline net.
    childcareBirthsBoostQ:              cited(8.5,  'childcare_births_judgement'),
    immigrationCapMigrationDeltaQ:      cited(-68,  'immigration_cap_migration_judgement'),
    openMigrationMigrationDeltaQ:       cited(60,   'obr_open_migration'),
    integrationMigrationDeltaQ:         cited(8,    'mac_integration_2024'),
    socialMediaBanBirthCoefQ:           cited(2.5,  'twenge_haidt_smartphone'),
    socialMediaAlgoBanBirthCoefQ:       cited(5.0,  'haidt_anxious_generation'),

    // Labour-supply identity: workforce = pop × workingAgeShare × participationRate.
    workingAgeShare:    cited(0.640, 'ons_working_age_pop_2024'),    // fraction
    participationRate:  cited(0.80,  'ons_inactivity_2025'),         // fraction of working-age
  },

  // ===========================================================================
  // Wages — index dynamics, asymmetric Phillips, productivity passthrough,
  // education premium, mean reversion. Updated each quarter in stepQuarter
  // AFTER unemployment but BEFORE inflation (so the spiral contribution can
  // feed into the CPI forcing term).
  // ===========================================================================
  wages: {
    initial:                 cited(100,  'ons_ashe_wage_anchor'),
    persistence:             cited(0.85, 'gali_wage_persistence'),
    phillipsCoef:            cited(0.35, 'haldane_wages_phillips'),
    productivityPassthrough: cited(0.6,  'oecd_productivity_passthrough'),
    educationCoef:           cited(0.02, 'devereux_uk_skill_premium'),
    livingWageBump:          cited(1.5,  'lpc_living_wage_wageindex'),
    unionRightsBump:         cited(1.2,  'oecd_sectoral_bargaining_wageindex'),
    meanReversionToNominal:  cited(0.10, 'wage_mean_reversion_judgement'),
    // Wage-price spiral fires only at sustained overheating (wage growth
    // > nominalTrend + 4pp ≈ above 6.6%/yr). Calibrated so routine UK
    // Phillips firings stay quiet but 1970s-style spirals bite. Each pp
    // above the trigger adds 0.10pp to inflation that quarter.
    spiralCoef:              cited(0.10, 'wage_spiral_judgement'),
    spiralTriggerGap:        cited(4.0,  'wage_spiral_judgement'),
  },

  // ===========================================================================
  // Education — 0-100 attainment / skill index. Lifted by schools spending
  // above baseline; mean reverts toward 60. Feeds the wage update via an
  // education premium term. Reform-completion bumps applied through the
  // engine's onComplete handler (educationIndexBump leaf).
  // ===========================================================================
  education: {
    initial:                 cited(62,   'oecd_pisa_uk_2022'),
    persistence:             cited(0.90, 'education_index_methodology'),
    spendCoef:               cited(0.20, 'ifs_education_spend_attainment'),
    skillsBumpOnComplete:    cited(2.0,  'education_index_methodology'),
    uniReformBumpOnComplete: cited(1.5,  'education_index_methodology'),
    childcareBumpOnComplete: cited(1.0,  'education_index_methodology'),
    meanReversionTo:         cited(60,   'education_index_methodology'),
    meanReversionRate:       cited(0.05, 'education_index_methodology'),
  },

  // ===========================================================================
  // GDP decomposition — feeds composedGrowth = productivityGrowth +
  // employmentGrowth, exposed on the Markets tab. Does NOT rewrite
  // headline GDP; the structural line shows what trend growth would be
  // under just the labour-supply identity.
  // ===========================================================================
  gdpDecomposition: {
    productivityTrend:         cited(0.6,  'obr_productivity_trend'),       // pp/yr
  },

  // ===========================================================================
  // Migration → GDP elasticity.
  // Consumed by gameStep.js growth block: labour-supply impulse =
  // popDeltaThousands × gdpElasticityPer1k. Replaces the prior implicit channel
  // (population scaling fixed-cost spending only, no growth response) with an
  // explicit elastic channel per OBR EFO March 2024.
  // ===========================================================================
  migration: {
    gdpElasticityPer1k: cited(0.0075, 'obr_efo_march_2024_migration'),  // pp GDP per 1k net migrants
  },

  // ===========================================================================
  // State-dependent fiscal multipliers (OBR dynamic scoring + Auerbach-Gorodnichenko).
  // Consumed by engine.js applyFiscalMultipliers — level-deviation interpretation.
  // Each quarter the growth impulse for spending category X is:
  //   multiplier × (currentSpend − baselineSpend) / nominalGDP × 100 / taperHorizonQuarters
  // Categories covered: NHS, Education, Welfare, Local, Infra, Defence (via CDEL/
  // RDEL/AME assignment), plus VAT and income tax (sign reversed for tax rises).
  // R&D, FCDO, DEFRA, Justice, Devolved continue through deptSliderHooks — the
  // partition is enforced by an allowlist assertion in applyFiscalMultipliers.
  // Recession amplification: at output gap < recessionGapThreshold, multiply
  // the per-quarter impulse by recessionModifier.
  // ===========================================================================
  fiscalMultipliers: {
    cdel:                  cited(1.0,  'obr_dynamic_scoring_2023'),
    rdel:                  cited(0.6,  'obr_dynamic_scoring_2023'),
    ame:                   cited(0.6,  'obr_dynamic_scoring_2023'),
    vat:                   cited(0.35, 'obr_june_2010_multipliers'),
    incomeTax:             cited(0.3,  'obr_june_2010_multipliers'),
    recessionModifier:     cited(1.7,  'auerbach_gorodnichenko_multipliers_2012'),
    recessionGapThreshold: cited(-2.0, 'auerbach_gorodnichenko_multipliers_2012'),  // pp output gap below which recession amp activates
    taperHorizonQuarters:  cited(20,   'obr_dynamic_scoring_2023'),
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

  // ===========================================================================
  // Slider ranges — UI affordance bounds for BudgetTab levers.
  //   base:         default range available from quarter 1.
  //   taxExtreme:   replaces base bounds for tax sliders once the
  //                 taxCodeRewrite reform completes.
  //   spendExtreme: replaces base bounds for spending sliders once the
  //                 spendingReviewOverride reform completes.
  // Baselines (PARAMS.initial.*) must sit inside every range here.
  // ===========================================================================
  sliderRanges: {
    base: {
      taxIncomeBasic: { min: cited(10, 'slider_range_judgement'), max: cited(30, 'slider_range_judgement') },   // baseline 20
      taxIncomeHigh:  { min: cited(30, 'slider_range_judgement'), max: cited(55, 'slider_range_judgement') },   // baseline 40
      taxIncomeAdd:   { min: cited(35, 'slider_range_judgement'), max: cited(65, 'slider_range_judgement') },   // baseline 45
      taxCorp:        { min: cited(15, 'slider_range_judgement'), max: cited(40, 'slider_range_judgement') },   // baseline 25
      taxVAT:         { min: cited(10, 'slider_range_judgement'), max: cited(30, 'slider_range_judgement') },   // baseline 20
      spendNHS:       { min: cited(140, 'slider_range_judgement'), max: cited(280, 'slider_range_judgement') }, // baseline 204
      spendWelfare:   { min: cited(120, 'slider_range_judgement'), max: cited(280, 'slider_range_judgement') }, // baseline 187
      spendEdu:       { min: cited(60,  'slider_range_judgement'), max: cited(145, 'slider_range_judgement') }, // baseline 95
      spendLocal:     { min: cited(90,  'slider_range_judgement'), max: cited(190, 'slider_range_judgement') }, // baseline 140
      spendDefence:   { min: cited(20,  'slider_range_judgement'), max: cited(125, 'slider_range_judgement') }, // baseline 39
      spendInfra:     { min: cited(40,  'slider_range_judgement'), max: cited(160, 'slider_range_judgement') }, // baseline 90
      spendJustice:   { min: cited(25,  'slider_range_judgement'), max: cited(95,  'slider_range_judgement') }, // baseline 55
      spendFCDO:      { min: cited(0,   'slider_range_judgement'), max: cited(30,  'slider_range_judgement') }, // baseline 15
      spendDEFRA:     { min: cited(0,   'slider_range_judgement'), max: cited(25,  'slider_range_judgement') }, // baseline 8
      spendRnD:       { min: cited(5,   'slider_range_judgement'), max: cited(40,  'slider_range_judgement') }, // baseline 18
      spendDevolved:  { min: cited(50,  'slider_range_judgement'), max: cited(110, 'slider_range_judgement') }, // baseline 71
    },
    taxExtreme: {
      taxIncomeBasic: { min: cited(0, 'slider_range_judgement'), max: cited(50, 'slider_range_judgement') },
      taxIncomeHigh:  { min: cited(0, 'slider_range_judgement'), max: cited(80, 'slider_range_judgement') },
      taxIncomeAdd:   { min: cited(0, 'slider_range_judgement'), max: cited(90, 'slider_range_judgement') },
      taxCorp:        { min: cited(0, 'slider_range_judgement'), max: cited(60, 'slider_range_judgement') },
      taxVAT:         { min: cited(0, 'slider_range_judgement'), max: cited(50, 'slider_range_judgement') },
    },
    spendExtreme: {
      spendNHS:     { min: cited(50, 'slider_range_judgement'), max: cited(400, 'slider_range_judgement') },
      spendWelfare: { min: cited(40, 'slider_range_judgement'), max: cited(400, 'slider_range_judgement') },
      spendEdu:     { min: cited(20, 'slider_range_judgement'), max: cited(220, 'slider_range_judgement') },
      spendLocal:   { min: cited(30, 'slider_range_judgement'), max: cited(280, 'slider_range_judgement') },
      spendDefence: { min: cited(0,  'slider_range_judgement'), max: cited(200, 'slider_range_judgement') },
      spendInfra:   { min: cited(0,  'slider_range_judgement'), max: cited(250, 'slider_range_judgement') },
      spendJustice: { min: cited(0,  'slider_range_judgement'), max: cited(200, 'slider_range_judgement') },
      spendFCDO:    { min: cited(0,  'slider_range_judgement'), max: cited(50,  'slider_range_judgement') },
      spendDEFRA:   { min: cited(0,  'slider_range_judgement'), max: cited(50,  'slider_range_judgement') },
      spendRnD:     { min: cited(0,  'slider_range_judgement'), max: cited(100, 'slider_range_judgement') },
      spendDevolved:{ min: cited(0,  'slider_range_judgement'), max: cited(150, 'slider_range_judgement') },
    },
  },

  // ===========================================================================
  // Growth & inflation hooks for the new departmental sliders.
  // All current-quarter only (no permanentGrowthShift contribution in this
  // branch — that comes with the R&D/regional-investment reforms in a planned
  // follow-up). Coefficients are deliberately small versus Laffer/real-rate
  // drag so the hooks nudge rather than dominate.
  // ===========================================================================
  growthHooks: {
    rndPerBnAboveBaseline: cited(0.005, 'rnd_growth_methodology'),       // +pp growth per £bn above baseline (symmetric: cuts subtract more)
    rndPerBnBelowBaseline: cited(0.010, 'rnd_growth_methodology'),       // larger penalty per £bn below baseline
    fcdoPerBnAboveBaseline: cited(0.002, 'fcdo_export_channel_judgement'),
    fcdoPerBnBelowBaseline: cited(0.004, 'fcdo_export_channel_judgement'),
    defraPerBnBelowBaseline: cited(0.010, 'defra_food_inflation_judgement'),  // +pp INFLATION per £bn below baseline
    justicePerBnBelowCutFloor: cited(0.004, 'justice_growth_judgement'),     // -pp growth per £bn below cut floor
    devolvedPerBnBelowBaseline: cited(0.003, 'devolved_growth_drag_judgement'),
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

// Validate at module load: throws if any cited reference is dangling, and
// asserts any declared band has a sensible shape.
for (const leaf of walkParams()) {
  if (!CITATIONS[leaf.citationId]) {
    throw new Error(`params.js: dangling citation "${leaf.citationId}" at ${leaf.path.join('.')}`);
  }
  if (leaf.band) {
    const { low, high } = leaf.band;
    if (!(typeof low === 'number' && typeof high === 'number' && low <= 0 && high >= 0)) {
      throw new Error(`params.js: invalid band at ${leaf.path.join('.')}`);
    }
  }
}
