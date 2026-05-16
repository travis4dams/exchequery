// =============================================================================
// EVENT_DEFINITIONS — quarterly random events.
//
// Each event has a title, body, tone, citationId, and an array of player
// choices. Each numeric effect leaf (debt, growth, inflation, healthIndex,
// bondYield, blocs.*) is wrapped via cited() so its source is traceable in
// the UI just like reform and param leaves. Base probabilities live in
// PARAMS.risks; reform/state modifiers are applied via computeRiskMods.
// =============================================================================

import { CITATIONS } from './citations.js';

const cited = (value, citationId, opts) => {
  if (!CITATIONS[citationId]) throw new Error(`event effect references missing citation: ${citationId}`);
  const leaf = { value, citationId };
  if (opts && opts.band) {
    const b = opts.band;
    const low = typeof b.low === 'number' ? b.low : -(b.width ?? 0);
    const high = typeof b.high === 'number' ? b.high : (b.width ?? 0);
    if (!(low <= 0 && high >= 0)) {
      throw new Error(`events.js: band at ${citationId} must straddle zero (got low=${low}, high=${high})`);
    }
    leaf.band = { low, high, dist: b.dist || 'triangular' };
  }
  return leaf;
};

const blocs = (id, deltas) => {
  const out = {};
  for (const [k, n] of Object.entries(deltas)) out[k] = cited(n, id);
  return out;
};

export const EVENT_DEFINITIONS = {
  nhsStrike: {
    title: 'NHS Strike Action',
    body: 'RCN and BMA announce coordinated strike action.',
    tone: 'bad',
    citationId: 'event_nhs_strike',
    choices: [
      { label: 'Emergency pay negotiations', effect: { debt: cited(3, 'event_nhs_strike'), blocs: blocs('event_nhs_strike', { publicSector: 6, workingClass: 3 }), log: 'Emergency pay deal halted strikes.' } },
      { label: 'Anti-strike legislation',    effect: { blocs: blocs('event_nhs_strike', { publicSector: -12, workingClass: -8, business: 5 }), log: 'Anti-strike laws passed.' } },
      { label: 'Wait it out',                effect: { healthIndex: cited(-3, 'event_nhs_strike'), blocs: blocs('event_nhs_strike', { pensioners: -5, publicSector: -4 }), log: 'Strikes dragged on.' } },
    ],
  },
  energyShock: {
    title: 'Global Energy Price Shock',
    body: 'Gas prices surged 60% on geopolitical instability.',
    tone: 'bad',
    citationId: 'event_energy_shock',
    choices: [
      { label: 'Energy Price Guarantee (£12bn)', effect: { debt: cited(12, 'event_energy_shock'), energyPriceIndex: cited(20, 'event_energy_shock'), blocs: blocs('event_energy_shock', { workingClass: 5, pensioners: 6, northern: 4 }), log: 'Bills capped through winter.' } },
      { label: 'Targeted support + windfall tax', effect: { debt: cited(3, 'event_energy_shock'), energyPriceIndex: cited(35, 'event_energy_shock'), blocs: blocs('event_energy_shock', { workingClass: 6, pensioners: 4, business: -5 }), log: 'Targeted help funded by windfall.' } },
      { label: 'Let the market clear',           effect: { inflation: cited(1.5, 'event_energy_shock'), energyPriceIndex: cited(50, 'event_energy_shock'), healthIndex: cited(-2, 'event_energy_shock'), blocs: blocs('event_energy_shock', { workingClass: -10, pensioners: -8, northern: -6 }), log: 'Fuel poverty spiked.' } },
      { label: 'Nationalise wholesale gas trading', effect: { debt: cited(8, 'event_energy_shock'), energyPriceIndex: cited(15, 'event_energy_shock'), blocs: blocs('event_energy_shock', { workingClass: 8, pensioners: 5, business: -10, professional: -4 }), log: 'Wholesale gas brought into public hands. Markets aghast.' } },
    ],
  },
  fuelPoverty: {
    title: 'Winter Fuel Poverty Crisis',
    body: 'Age UK reports record pensioners unable to heat homes.',
    tone: 'bad',
    citationId: 'event_fuel_poverty',
    choices: [
      { label: 'Emergency winter payments',     effect: { debt: cited(4, 'event_fuel_poverty'), blocs: blocs('event_fuel_poverty', { pensioners: 8, workingClass: 3 }), log: 'Winter payments delivered.' } },
      { label: 'Direct payments via councils',  effect: { debt: cited(2, 'event_fuel_poverty'), blocs: blocs('event_fuel_poverty', { pensioners: 4, publicSector: 2 }), log: 'Council-delivered support reached the most vulnerable.' } },
      { label: 'Refuse to act',                 effect: { healthIndex: cited(-3, 'event_fuel_poverty'), blocs: blocs('event_fuel_poverty', { pensioners: -12, workingClass: -5 }), log: 'Excess winter deaths spiked.' } },
    ],
  },
  housingCrisis: {
    title: 'Homelessness Surge',
    body: 'Rough sleeping up 35%. Shelter demands action.',
    tone: 'bad',
    citationId: 'event_housing_crisis',
    choices: [
      { label: 'Emergency homelessness fund', effect: { debt: cited(2, 'event_housing_crisis'), blocs: blocs('event_housing_crisis', { youth: 5, workingClass: 4, ethnicMinority: 4 }), log: 'Emergency hostels funded.' } },
      { label: 'Acquire empty properties',    effect: { debt: cited(1, 'event_housing_crisis'), blocs: blocs('event_housing_crisis', { youth: 4, workingClass: 5, business: -4 }), log: 'CPO programme on empty properties.' } },
      { label: 'Tough on rough sleeping',     effect: { blocs: blocs('event_housing_crisis', { youth: -8, workingClass: -6, ethnicMinority: -5, middleClass: 2 }), log: 'You criminalised it.' } },
    ],
  },
  councilBankruptcy: {
    title: 'Council Issues Section 114',
    body: 'A metropolitan council has declared bankruptcy.',
    tone: 'bad',
    citationId: 'event_council_bankruptcy',
    choices: [
      { label: 'Direct bailout + funding review', effect: { debt: cited(3, 'event_council_bankruptcy'), blocs: blocs('event_council_bankruptcy', { publicSector: 5, northern: 6, workingClass: 3 }), log: 'You bailed out the council.' } },
      { label: 'Government commissioners',        effect: { debt: cited(1, 'event_council_bankruptcy'), blocs: blocs('event_council_bankruptcy', { publicSector: -3, northern: -4 }), log: 'Local democracy suspended.' } },
    ],
  },
  financialCrisis: {
    title: 'Banking Sector Stress',
    body: 'A mid-size lender has failed.',
    tone: 'bad',
    citationId: 'event_financial_crisis',
    choices: [
      { label: 'Coordinated rescue package', effect: { debt: cited(15, 'event_financial_crisis'), bondYield: cited(-0.3, 'event_financial_crisis'), blocs: blocs('event_financial_crisis', { business: 6, professional: 3, workingClass: -4 }), log: 'You stabilised the system.' } },
      { label: 'Bail-in instead of bailout', effect: { debt: cited(4, 'event_financial_crisis'),  bondYield: cited(0.2, 'event_financial_crisis'),  blocs: blocs('event_financial_crisis', { workingClass: 5, business: -8 }), log: 'Senior creditors took the loss.' } },
    ],
  },
  generalStrike: {
    title: 'Cross-Sector Strike Wave',
    body: 'TUC coordinates general day of action.',
    tone: 'bad',
    citationId: 'event_general_strike',
    choices: [
      { label: 'Sit down with the TUC',           effect: { debt: cited(2, 'event_general_strike'), blocs: blocs('event_general_strike', { workingClass: 8, publicSector: 6, business: -4 }), log: 'You negotiated.' } },
      { label: 'Refuse to negotiate under duress', effect: { growth: cited(-0.3, 'event_general_strike'), blocs: blocs('event_general_strike', { workingClass: -8, publicSector: -10, business: 4 }), log: 'Strikes continued.' } },
    ],
  },
  careCrisis: {
    title: 'Care Sector Collapse',
    body: 'Major care operator bust. 14,000 residents may lose homes.',
    tone: 'bad',
    citationId: 'event_care_crisis',
    choices: [
      { label: 'Take into public ownership', effect: { debt: cited(4, 'event_care_crisis'), blocs: blocs('event_care_crisis', { pensioners: 8, publicSector: 5, business: -3 }), log: 'Care homes taken into public hands.' } },
      { label: 'Broker private rescue',      effect: { debt: cited(1, 'event_care_crisis'), blocs: blocs('event_care_crisis', { pensioners: 3, business: 2 }), log: 'Private rescue brokered.' } },
    ],
  },
  flood: {
    title: 'Severe Flooding',
    body: 'Storm flooding hit multiple regions.',
    tone: 'bad',
    citationId: 'event_flood',
    choices: [
      { label: 'Reconstruction + flood defences', effect: { debt: cited(6, 'event_flood'), blocs: blocs('event_flood', { northern: 5, workingClass: 3 }), log: 'New flood defences commissioned.' } },
      { label: 'Reconstruction only',             effect: { debt: cited(3, 'event_flood'), blocs: blocs('event_flood', { northern: 2 }), log: 'Patched up.' } },
    ],
  },
  heatwave: {
    title: 'Record Heatwave',
    body: 'Temperatures exceeded 40°C for three days.',
    tone: 'bad',
    citationId: 'event_heatwave',
    choices: [
      { label: 'Climate adaptation package',  effect: { debt: cited(3, 'event_heatwave'),   blocs: blocs('event_heatwave', { youth: 4, professional: 3, ethnicMinority: 3 }), log: 'Adaptation funding announced.' } },
      { label: 'Public information campaign', effect: { debt: cited(0.2, 'event_heatwave'), blocs: blocs('event_heatwave', { youth: -2 }), log: 'Just an information campaign.' } },
    ],
  },
  allyCrisis: {
    title: 'International Crisis',
    body: 'NATO ally requesting military and financial support.',
    tone: 'neutral',
    citationId: 'event_ally_crisis',
    choices: [
      { label: 'Full support package',    effect: { debt: cited(4, 'event_ally_crisis'), blocs: blocs('event_ally_crisis', { middleClass: 2, business: 2, youth: -3 }), log: 'Full support extended.' } },
      { label: 'Diplomatic support only', effect: { blocs: blocs('event_ally_crisis', { professional: -2 }), log: 'Moral support only.' } },
    ],
  },
  labourShortage: {
    title: 'Severe Labour Shortages',
    body: 'Care, hospitality, agriculture and construction report critical vacancies.',
    tone: 'bad',
    citationId: 'event_labour_shortage',
    choices: [
      { label: 'Temporary visa scheme',         effect: { growth: cited(0.2, 'event_labour_shortage'),  blocs: blocs('event_labour_shortage', { business: 6, northern: -4 }), log: 'Targeted visas eased pressure.' } },
      { label: 'Hold the line on immigration',  effect: { growth: cited(-0.3, 'event_labour_shortage'), blocs: blocs('event_labour_shortage', { workingClass: -3, business: -8 }), log: 'Shortages persisted.' } },
    ],
  },
  investmentSurge: {
    title: 'Foreign Investment Surge',
    body: 'EU pension funds commit £40bn to UK infrastructure.',
    tone: 'good',
    citationId: 'event_investment_surge',
    choices: [
      { label: 'Direct to priority projects', effect: { growth: cited(0.3, 'event_investment_surge'), blocs: blocs('event_investment_surge', { business: 6, professional: 4, northern: 4 }), log: 'Investment to rail, grid, housing.' } },
    ],
  },
  exportBoom: {
    title: 'Export Surge',
    body: 'UK clean-tech exports hit a record.',
    tone: 'good',
    citationId: 'event_export_boom',
    choices: [
      { label: 'Capitalise on the moment', effect: { growth: cited(0.2, 'event_export_boom'), blocs: blocs('event_export_boom', { business: 5, workingClass: 3, northern: 3 }), log: 'Trade boost feeding GDP.' } },
    ],
  },
  productivityJump: {
    title: 'Productivity Surprise',
    body: 'ONS reports unexpected 1.2% productivity jump.',
    tone: 'good',
    citationId: 'event_productivity_jump',
    choices: [
      { label: 'Bank the windfall', effect: { growth: cited(0.4, 'event_productivity_jump'), blocs: blocs('event_productivity_jump', { professional: 5, business: 4, middleClass: 3 }), log: 'Productivity gains feeding wages.' } },
    ],
  },
  taxBeats: {
    title: 'Tax Receipts Beat Forecast',
    body: 'HMRC reports compliance improvement.',
    tone: 'good',
    citationId: 'event_tax_beats',
    choices: [
      { label: 'Apply to deficit reduction', effect: { debt: cited(-4, 'event_tax_beats'),       blocs: blocs('event_tax_beats', { business: 2, professional: 2 }), log: 'Windfall to deficit.' } },
      { label: 'Apply to public services',   effect: { healthIndex: cited(1, 'event_tax_beats'), blocs: blocs('event_tax_beats', { workingClass: 4, publicSector: 4, ethnicMinority: 3 }), log: 'Windfall to services.' } },
    ],
  },
  demographicDividend: {
    title: 'Workforce Participation Up',
    body: 'Female labour participation at record high.',
    tone: 'good',
    citationId: 'event_demographic_dividend',
    choices: [
      { label: 'Recognise and extend', effect: { growth: cited(0.2, 'event_demographic_dividend'), blocs: blocs('event_demographic_dividend', { workingClass: 4, professional: 5, youth: 4 }), log: 'Childcare model extended.' } },
    ],
  },
  tradeDeal: {
    title: 'Major Trade Agreement',
    body: 'A new trade agreement signed.',
    tone: 'good',
    citationId: 'event_trade_deal',
    choices: [
      { label: 'Celebrate', effect: { growth: cited(0.2, 'event_trade_deal'), blocs: blocs('event_trade_deal', { business: 6, professional: 4, middleClass: 3 }), log: 'Trade deal boosting confidence.' } },
    ],
  },
  rateHikeShock: {
    title: 'Rate Hike Hits Households',
    body: 'Mortgage holders re-fixing at sharply higher rates. Repossession risk creeping up.',
    tone: 'bad',
    citationId: 'event_rate_hike_shock',
    choices: [
      { label: 'Mortgage protection scheme', effect: { debt: cited(6, 'event_rate_hike_shock'), blocs: blocs('event_rate_hike_shock', { middleClass: 6, workingClass: 4, business: -2 }), log: 'Mortgage protection scheme launched.' } },
      { label: 'Counter with fiscal stimulus', effect: { debt: cited(12, 'event_rate_hike_shock'), growth: cited(0.2, 'event_rate_hike_shock'), bondYield: cited(0.2, 'event_rate_hike_shock'), blocs: blocs('event_rate_hike_shock', { workingClass: 5, business: 3, professional: -3 }), log: 'Stimulus package announced. Markets twitchy.' } },
      { label: 'Blame the Bank publicly',     effect: { blocs: blocs('event_rate_hike_shock', { workingClass: 3, professional: -5, business: -3 }), log: 'You picked a fight with the Governor. Markets noticed.' } },
    ],
  },
  wagePriceSpiral: {
    title: 'Wage-Price Spiral Warning',
    body: 'Settlements running 6%+ across multiple sectors. BoE signals further hikes.',
    tone: 'bad',
    citationId: 'event_wage_price_spiral',
    choices: [
      { label: 'Pay restraint guidance to public sector', effect: { inflation: cited(-0.4, 'event_wage_price_spiral'), blocs: blocs('event_wage_price_spiral', { publicSector: -6, business: 4 }), log: 'Public-sector pay anchored below private. Unions furious.' } },
      { label: 'Accept higher settlements', effect: { inflation: cited(0.6, 'event_wage_price_spiral'), growth: cited(-0.1, 'event_wage_price_spiral'), blocs: blocs('event_wage_price_spiral', { workingClass: 5, publicSector: 6, business: -4 }), log: 'You let the wage round run. CPI ticked up.' } },
      { label: 'Blame markets, change nothing', effect: { inflation: cited(0.3, 'event_wage_price_spiral'), blocs: blocs('event_wage_price_spiral', { workingClass: -2, business: -2 }), log: 'You did nothing. Settlements continued.' } },
    ],
  },
  housePriceCorrection: {
    title: 'House-Price Correction Warning',
    body: 'Major lenders signal a sharp re-pricing. HPI has run hot; mortgage approvals tumbling.',
    tone: 'bad',
    citationId: 'event_house_price_correction',
    choices: [
      { label: 'Stamp-duty holiday', effect: { debt: cited(6, 'event_house_price_correction'), housePriceIndex: cited(-5, 'event_house_price_correction'), blocs: blocs('event_house_price_correction', { middleClass: 4, business: 3, youth: -2 }), log: 'Stamp duty suspended. Transactions revived.' } },
      { label: 'Targeted FTB scheme', effect: { debt: cited(3, 'event_house_price_correction'), housePriceIndex: cited(-3, 'event_house_price_correction'), blocs: blocs('event_house_price_correction', { youth: 6, workingClass: 3 }), log: 'First-time buyer scheme launched.' } },
      { label: 'Let it correct',     effect: { growth: cited(-0.4, 'event_house_price_correction'), housePriceIndex: cited(-10, 'event_house_price_correction'), blocs: blocs('event_house_price_correction', { business: -6, middleClass: -4, youth: 3 }), log: 'You let it correct. Negative equity for some.' } },
    ],
  },
  equityCrash: {
    title: 'Equity Market Crash',
    body: 'FTSE down 18% in three sessions. Pension funds taking a haircut.',
    tone: 'bad',
    citationId: 'event_equity_crash',
    choices: [
      { label: 'Targeted asset purchases', effect: { debt: cited(8, 'event_equity_crash'), equityIndex: cited(-12, 'event_equity_crash'), blocs: blocs('event_equity_crash', { business: 4, professional: 3, workingClass: -2 }), log: 'Coordinated purchases calmed markets.' } },
      { label: 'Let the market clear',     effect: { growth: cited(-0.3, 'event_equity_crash'), equityIndex: cited(-25, 'event_equity_crash'), blocs: blocs('event_equity_crash', { business: -6, professional: -4 }), log: 'You stood back. Pension hits flowed through to consumption.' } },
      { label: 'Interest-rate jawboning',  effect: { bondYield: cited(-0.2, 'event_equity_crash'), equityIndex: cited(-18, 'event_equity_crash'), blocs: blocs('event_equity_crash', { professional: -5, workingClass: 2 }), log: 'You leaned on the Governor publicly. Markets stabilised; bond market noted.' } },
    ],
  },
  giltStrike: {
    title: 'Gilt-Market Strike',
    body: 'Auction undersubscribed. DMO struggling to place tomorrow\'s tranche. Pound under pressure.',
    tone: 'bad',
    citationId: 'event_gilt_strike',
    choices: [
      { label: 'Emergency budget',    effect: { debt: cited(-8, 'event_gilt_strike'), growth: cited(-0.4, 'event_gilt_strike'), riskPremium: cited(-0.8, 'event_gilt_strike'), blocs: blocs('event_gilt_strike', { workingClass: -4, professional: 5, business: 3 }), log: 'Emergency budget signed. Spending cut to placate markets.' } },
      { label: 'IMF precautionary facility', effect: { debt: cited(4, 'event_gilt_strike'), riskPremium: cited(-1.2, 'event_gilt_strike'), blocs: blocs('event_gilt_strike', { workingClass: -3, professional: -3, business: 2 }), log: 'IMF backstop announced. Sovereignty optics ugly; spreads tightened.' } },
      { label: 'Stand pat',           effect: { bondYield: cited(0.5, 'event_gilt_strike'), riskPremium: cited(0.4, 'event_gilt_strike'), blocs: blocs('event_gilt_strike', { professional: -8, business: -5, workingClass: 2 }), log: 'You stood pat. Spreads widened further.' } },
    ],
  },
  sovereignRatingAction: {
    title: 'Sovereign Rating Downgrade',
    body: 'Moody\'s cut UK by one notch. S&P signalled it would follow if no consolidation in the next budget.',
    tone: 'bad',
    citationId: 'event_sovereign_rating_action',
    choices: [
      { label: 'Defy the agencies',    effect: { bondYield: cited(0.5, 'event_sovereign_rating_action'), riskPremium: cited(0.3, 'event_sovereign_rating_action'), blocs: blocs('event_sovereign_rating_action', { workingClass: 3, professional: -6, business: -4 }), log: 'You called the downgrade unjust. Yields widened.' } },
      { label: 'Statement of intent to consolidate', effect: { bondYield: cited(0.2, 'event_sovereign_rating_action'), riskPremium: cited(0.1, 'event_sovereign_rating_action'), blocs: blocs('event_sovereign_rating_action', { professional: 2 }), log: 'Statement of intent issued. Markets sceptical but calmer.' } },
      { label: 'Consolidation package', effect: { debt: cited(-6, 'event_sovereign_rating_action'), growth: cited(-0.2, 'event_sovereign_rating_action'), riskPremium: cited(-0.4, 'event_sovereign_rating_action'), blocs: blocs('event_sovereign_rating_action', { workingClass: -5, professional: 4, business: 3 }), log: 'Spending cuts unveiled. Yields tightened; coalition wobbled.' } },
    ],
  },
  planningRevolt: {
    title: 'Planning Revolt',
    body: 'Shire councils and pensioner groups protesting development imposed under the supply target.',
    tone: 'bad',
    citationId: 'event_planning_revolt',
    choices: [
      { label: 'Concede ground (slow programme)', effect: { housePriceIndex: cited(3, 'event_planning_revolt'), blocs: blocs('event_planning_revolt', { northern: 4, pensioners: 5, youth: -3 }), log: 'Programme slowed. Targets pushed back.' } },
      { label: 'Hold the line',                    effect: { blocs: blocs('event_planning_revolt', { northern: -6, pensioners: -8, youth: 3, business: 3 }), log: 'You held the line. Pensioners furious.' } },
      { label: 'Community infrastructure premium', effect: { debt: cited(2, 'event_planning_revolt'), blocs: blocs('event_planning_revolt', { northern: 2, pensioners: 2, workingClass: 3 }), log: 'Local areas bought off with new schools and surgeries.' } },
    ],
  },
  recession: {
    title: 'Recession Hits',
    body: 'Overheated economy tipping into contraction. Quarterly output forecast to fall sharply; jobless claims rising.',
    tone: 'bad',
    citationId: 'recession_business_cycle_judgement',
    choices: [
      { label: 'Fiscal stimulus package', effect: { debt: cited(15, 'recession_business_cycle_judgement'), growth: cited(0.6, 'recession_business_cycle_judgement'), bondYield: cited(0.2, 'recession_business_cycle_judgement'), blocs: blocs('recession_business_cycle_judgement', { workingClass: 5, business: 3, professional: -3 }), log: 'Stimulus announced. Markets digesting wider deficit.' } },
      { label: 'Austerity to defend gilts', effect: { debt: cited(-8, 'recession_business_cycle_judgement'), growth: cited(-1.0, 'recession_business_cycle_judgement'), riskPremium: cited(-0.3, 'recession_business_cycle_judgement'), blocs: blocs('recession_business_cycle_judgement', { workingClass: -6, professional: 4, business: 2 }), log: 'Spending cuts to reassure markets. Coalition strained.' } },
      { label: 'Ride it out', effect: { growth: cited(-1.5, 'recession_business_cycle_judgement'), unemployment: cited(0.5, 'recession_business_cycle_judgement'), blocs: blocs('recession_business_cycle_judgement', { workingClass: -3, business: -2 }), log: 'You stood back. Output contracted; unemployment ticked up.' } },
    ],
  },
  monetaryPolicyError: {
    title: 'MPC Out of Step',
    body: 'Commentators argue the MPC is materially off the right rate path. Volatility rising.',
    tone: 'bad',
    citationId: 'event_monetary_policy_error',
    choices: [
      { label: 'Issue supportive remit clarification', effect: { bondYield: cited(-0.2, 'event_monetary_policy_error'), blocs: blocs('event_monetary_policy_error', { professional: 3, business: 2 }), log: 'Clarification calmed markets.' } },
      { label: 'Public Treasury critique', effect: { bondYield: cited(0.4, 'event_monetary_policy_error'), blocs: blocs('event_monetary_policy_error', { workingClass: 2, professional: -4, business: -3 }), log: 'You broke convention and criticised the Bank publicly.' } },
    ],
  },
  civilUnrest: {
    title: 'Disorder on the Streets',
    body: 'Underfunded courts and thinned police lines have flashed over. Cities report coordinated disorder over consecutive nights.',
    tone: 'bad',
    citationId: 'event_civil_unrest',
    choices: [
      { label: 'Emergency policing surge + mutual aid', effect: { debt: cited(2, 'event_civil_unrest'), blocs: blocs('event_civil_unrest', { workingClass: 4, pensioners: 5, northern: 3, business: 2 }), log: 'Reinforcements deployed. Streets quietened within a week.' } },
      { label: 'Public inquiry + community spending', effect: { debt: cited(4, 'event_civil_unrest'), blocs: blocs('event_civil_unrest', { youth: 6, ethnicMinority: 7, publicSector: 3, business: -3 }), log: 'Inquiry announced; investment promised in worst-hit areas.' } },
      { label: 'Iron-fist response', effect: { healthIndex: cited(-2, 'event_civil_unrest'), blocs: blocs('event_civil_unrest', { pensioners: 4, northern: 3, youth: -10, ethnicMinority: -12, professional: -5 }), log: 'Mass arrests, fast-track sentencing. Polarising response.' } },
    ],
  },
  diplomaticIsolation: {
    title: 'Allies Step Back',
    body: 'The US State Department and EU EEAS have quietly downgraded UK engagement after sharp cuts to the FCDO. Trade partners are reassessing.',
    tone: 'bad',
    citationId: 'event_diplomatic_isolation',
    choices: [
      { label: 'Emergency ODA top-up + ministerial tour', effect: { debt: cited(5, 'event_diplomatic_isolation'), blocs: blocs('event_diplomatic_isolation', { business: 5, professional: 4, workingClass: -2 }), log: 'Top-up announced; allies thaw.' } },
      { label: 'Bilateral trade-deal sprint', effect: { debt: cited(2, 'event_diplomatic_isolation'), blocs: blocs('event_diplomatic_isolation', { business: 4, northern: 2, professional: -1 }), log: 'Trade officials redeployed; some bilateral wins.' } },
      { label: 'Wear the isolation', effect: { growth: cited(-0.3, 'event_diplomatic_isolation'), blocs: blocs('event_diplomatic_isolation', { business: -8, professional: -6, workingClass: 3, northern: 3 }), log: 'You doubled down on the cuts. Exporters furious.' } },
    ],
  },
  independenceMovement: {
    title: 'Devolution in Revolt',
    body: 'After cuts to the block grant, Holyrood and Cardiff Bay are demanding emergency talks. Independence polling has ticked up sharply.',
    tone: 'bad',
    citationId: 'event_independence_movement',
    choices: [
      { label: 'Emergency Barnett top-up', effect: { debt: cited(5, 'event_independence_movement'), blocs: blocs('event_independence_movement', { northern: 5, publicSector: 4, ethnicMinority: 2 }), log: 'Top-up announced. Holyrood backed off.' } },
      { label: 'Devolution settlement review', effect: { debt: cited(1, 'event_independence_movement'), blocs: blocs('event_independence_movement', { northern: 2, publicSector: 2, business: -1 }), log: 'Review commissioned; tempers cooled, fix deferred.' } },
      { label: 'Refuse to negotiate', effect: { bondYield: cited(0.3, 'event_independence_movement'), blocs: blocs('event_independence_movement', { northern: -8, publicSector: -5, ethnicMinority: -3, business: -3 }), log: 'You held the line. Constitutional pressure now rising.' } },
    ],
  },

  // ===========================================================================
  // Red Box expansion: public health & social
  // ===========================================================================
  pandemic: {
    title: 'Pandemic Outbreak',
    body: 'A novel respiratory pathogen is spreading rapidly. SAGE is convened; ICU pressure climbing.',
    tone: 'bad',
    citationId: 'event_pandemic',
    pandemicEffect: true,
    choices: [
      { label: 'Mass testing + PPE surge (£25bn)', effect: { debt: cited(25, 'event_pandemic'), healthIndex: cited(-3, 'event_pandemic'), growth: cited(-0.3, 'event_pandemic'), unemployment: cited(0.2, 'event_pandemic'), blocs: blocs('event_pandemic', { publicSector: 6, workingClass: 4, pensioners: 5, business: -3 }), log: 'Mass testing and PPE rolled out. Outbreak contained but bill steep.' } },
      { label: 'Lockdown + furlough (£60bn)', effect: { debt: cited(60, 'event_pandemic'), healthIndex: cited(-2, 'event_pandemic'), growth: cited(-1.2, 'event_pandemic'), unemployment: cited(0.4, 'event_pandemic'), blocs: blocs('event_pandemic', { workingClass: 6, publicSector: 5, business: -10, professional: 2 }), log: 'Lockdown imposed; CJRS-style furlough underwrites wages.' } },
      { label: 'Let it run', effect: { debt: cited(8, 'event_pandemic'), healthIndex: cited(-10, 'event_pandemic'), growth: cited(-0.6, 'event_pandemic'), unemployment: cited(0.3, 'event_pandemic'), blocs: blocs('event_pandemic', { workingClass: -8, publicSector: -10, pensioners: -12, business: 4 }), log: 'You stood back. Excess deaths surged; public fury.' } },
    ],
  },
  teacherStrike: {
    title: 'Teacher & Civil-Service Strike Wave',
    body: 'NEU, NASUWT and PCS announce coordinated action. Schools shut; passport queues lengthening.',
    tone: 'bad',
    citationId: 'event_teacher_strike',
    choices: [
      { label: 'Pay settlement (£4bn)', effect: { debt: cited(4, 'event_teacher_strike'), blocs: blocs('event_teacher_strike', { publicSector: 7, workingClass: 4, youth: 3 }), log: 'Pay deal signed across schools and civil service.' } },
      { label: 'Extend anti-strike legislation', effect: { blocs: blocs('event_teacher_strike', { publicSector: -14, workingClass: -8, business: 5, professional: -4 }), log: 'Minimum Service Levels extended to schools.' } },
      { label: 'Hold the line', effect: { growth: cited(-0.2, 'event_teacher_strike'), healthIndex: cited(-1, 'event_teacher_strike'), blocs: blocs('event_teacher_strike', { publicSector: -6, workingClass: -4, middleClass: -3 }), log: 'Strikes dragged on. GCSE/A-level disruption.' } },
    ],
  },
  droughtStress: {
    title: 'Reservoir Crisis',
    body: 'Three consecutive low-rainfall quarters; aquifers at record lows. Environment Agency requests action.',
    tone: 'bad',
    citationId: 'event_drought_stress',
    choices: [
      { label: 'Emergency extraction permits', effect: { debt: cited(1, 'event_drought_stress'), blocs: blocs('event_drought_stress', { business: 3, northern: -2, youth: -4 }), log: 'Temporary abstraction licences issued. Environmentalists furious.' } },
      { label: 'Hosepipe ban + relief fund', effect: { debt: cited(2, 'event_drought_stress'), blocs: blocs('event_drought_stress', { northern: 3, workingClass: 2, business: -3 }), log: 'Statutory bans plus £2bn relief for affected farms.' } },
      { label: 'Special administration: water co.', effect: { debt: cited(8, 'event_drought_stress'), blocs: blocs('event_drought_stress', { workingClass: 6, publicSector: 5, business: -8, professional: -3 }), log: 'Failing water company taken into special administration.' } },
    ],
  },

  // ===========================================================================
  // Red Box expansion: industrial / supply / technology
  // ===========================================================================
  supplyChainShock: {
    title: 'Global Supply-Chain Shock',
    body: 'Container rates have tripled. Semiconductor lead times back at pandemic peaks. Industry warns of stockouts.',
    tone: 'bad',
    citationId: 'event_supply_chain_shock',
    choices: [
      { label: 'Import diversification programme', effect: { debt: cited(3, 'event_supply_chain_shock'), inflation: cited(0.2, 'event_supply_chain_shock'), blocs: blocs('event_supply_chain_shock', { business: 4, professional: 2 }), log: 'Alternative supplier routing subsidised; CPI pass-through smaller.' } },
      { label: 'Strategic reshoring scheme (£8bn)', effect: { debt: cited(8, 'event_supply_chain_shock'), growth: cited(0.1, 'event_supply_chain_shock'), blocs: blocs('event_supply_chain_shock', { business: 6, workingClass: 4, northern: 5, professional: -2 }), log: 'Reshoring grants tilt key industries homeward.' } },
      { label: 'Let market clear', effect: { inflation: cited(0.6, 'event_supply_chain_shock'), growth: cited(-0.4, 'event_supply_chain_shock'), blocs: blocs('event_supply_chain_shock', { business: -6, workingClass: -3, professional: -2 }), log: 'Shortages bit through prices. Manufacturers furloughed.' } },
    ],
  },
  cyberAttack: {
    title: 'Cyber Attack on Critical Infrastructure',
    body: 'Ransomware has hit NHS pathology and major utility systems. National emergency declared.',
    tone: 'bad',
    citationId: 'event_cyber_attack',
    choices: [
      { label: 'Emergency cyber-budget surge (£3bn)', effect: { debt: cited(3, 'event_cyber_attack'), healthIndex: cited(-1, 'event_cyber_attack'), blocs: blocs('event_cyber_attack', { professional: 4, business: 3, publicSector: 2 }), log: 'NCSC and contractors stood up at scale. Systems restored within weeks.' } },
      { label: 'Public-private response taskforce', effect: { debt: cited(1, 'event_cyber_attack'), healthIndex: cited(-2, 'event_cyber_attack'), blocs: blocs('event_cyber_attack', { business: 5, professional: 2, workingClass: -2 }), log: 'Industry leads recovery alongside government. Cheaper, slower.' } },
      { label: 'Minimal central response', effect: { healthIndex: cited(-5, 'event_cyber_attack'), growth: cited(-0.3, 'event_cyber_attack'), blocs: blocs('event_cyber_attack', { professional: -6, business: -5, publicSector: -4 }), log: 'Outage dragged on. Patient harm reported.' } },
    ],
  },
  coldSnap: {
    title: 'Severe Cold Snap',
    body: 'Sustained sub-zero temperatures forecast for two weeks. Gas system at margin; NHS bed-block warning.',
    tone: 'bad',
    citationId: 'event_cold_snap',
    choices: [
      { label: 'Emergency wholesale gas buy (£3bn)', effect: { debt: cited(3, 'event_cold_snap'), energyPriceIndex: cited(8, 'event_cold_snap'), blocs: blocs('event_cold_snap', { pensioners: 5, workingClass: 3, business: 2 }), log: 'National Gas balanced via Centrica purchases.' } },
      { label: 'Demand-reduction campaign (£0.5bn)', effect: { debt: cited(0.5, 'event_cold_snap'), energyPriceIndex: cited(12, 'event_cold_snap'), blocs: blocs('event_cold_snap', { youth: 3, professional: 2, pensioners: -3 }), log: 'Demand Flexibility Service scaled; nudge campaign launched.' } },
      { label: 'Ride it out', effect: { energyPriceIndex: cited(18, 'event_cold_snap'), healthIndex: cited(-3, 'event_cold_snap'), inflation: cited(0.3, 'event_cold_snap'), blocs: blocs('event_cold_snap', { pensioners: -10, workingClass: -6, northern: -5 }), log: 'Cold homes; excess winter mortality flagged by ONS.' } },
    ],
  },
  aiDisplacement: {
    title: 'AI Displacement Shock',
    body: 'Major firms announce 20-30% headcount reductions in legal, finance and customer service.',
    tone: 'bad',
    citationId: 'event_ai_displacement',
    choices: [
      { label: 'National retraining programme (£6bn)', effect: { debt: cited(6, 'event_ai_displacement'), growth: cited(0.1, 'event_ai_displacement'), unemployment: cited(0.2, 'event_ai_displacement'), blocs: blocs('event_ai_displacement', { workingClass: 4, professional: 4, youth: 5, business: -2 }), log: 'Major reskilling fund stood up. Adjustment cushioned.' } },
      { label: 'Hard regulation + work councils', effect: { growth: cited(-0.3, 'event_ai_displacement'), unemployment: cited(0.1, 'event_ai_displacement'), blocs: blocs('event_ai_displacement', { workingClass: 6, professional: 3, business: -8, youth: -2 }), log: 'Strict deployment rules; consultation required pre-redundancy.' } },
      { label: 'Embrace fully', effect: { growth: cited(0.4, 'event_ai_displacement'), unemployment: cited(0.6, 'event_ai_displacement'), blocs: blocs('event_ai_displacement', { business: 8, professional: -5, workingClass: -6, youth: -4 }), log: 'No friction. Productivity surged; redundancies followed.' } },
    ],
  },
  scientificBreakthrough: {
    title: 'UK Scientific Breakthrough',
    body: 'A British lab has announced a commercially-credible advance. International press coverage intense.',
    tone: 'good',
    citationId: 'event_scientific_breakthrough',
    choices: [
      { label: 'Back commercialisation (£2bn)', effect: { debt: cited(2, 'event_scientific_breakthrough'), growth: cited(0.3, 'event_scientific_breakthrough'), blocs: blocs('event_scientific_breakthrough', { business: 5, professional: 6, youth: 4 }), log: 'ARIA-route commercialisation funded. UK retains IP and scale-up.' } },
      { label: 'Academic-led, light touch', effect: { growth: cited(0.1, 'event_scientific_breakthrough'), blocs: blocs('event_scientific_breakthrough', { professional: 5, youth: 3 }), log: 'Universities continue at their own pace.' } },
      { label: 'Sell to highest international bidder', effect: { debt: cited(-3, 'event_scientific_breakthrough'), blocs: blocs('event_scientific_breakthrough', { business: 4, professional: -8, youth: -4, workingClass: -2 }), log: 'IP licensed abroad. One-off receipt; loss of strategic capability.' } },
    ],
  },

  // ===========================================================================
  // Red Box expansion: markets & finance
  // ===========================================================================
  sterlingSlide: {
    title: 'Sterling Under Pressure',
    body: 'Cable down 7% in 48 hours; gilt yields spiking. Markets demand a clear signal.',
    tone: 'bad',
    citationId: 'event_sterling_slide',
    choices: [
      { label: 'Jawbone alongside Bank', effect: { bondYield: cited(-0.2, 'event_sterling_slide'), riskPremium: cited(-0.3, 'event_sterling_slide'), blocs: blocs('event_sterling_slide', { professional: 4, business: 3 }), log: 'Coordinated statement from Chancellor and Governor.' } },
      { label: 'Active intervention (£15bn)', effect: { debt: cited(15, 'event_sterling_slide'), bondYield: cited(-0.4, 'event_sterling_slide'), riskPremium: cited(-0.6, 'event_sterling_slide'), blocs: blocs('event_sterling_slide', { professional: 2, business: -2, workingClass: -2 }), log: 'BoE intervention deployed; reserves drawn.' } },
      { label: 'Let it float', effect: { inflation: cited(0.5, 'event_sterling_slide'), bondYield: cited(0.4, 'event_sterling_slide'), riskPremium: cited(0.4, 'event_sterling_slide'), blocs: blocs('event_sterling_slide', { professional: -6, business: -5, workingClass: -2 }), log: 'You let the pound find a level. Imported inflation followed.' } },
    ],
  },
  commercialPropertyCrash: {
    title: 'Commercial Property Crash',
    body: 'CBRE flags 30% writedowns across secondary office stock. Pension funds with sector exposure under pressure.',
    tone: 'bad',
    citationId: 'event_commercial_property_crash',
    choices: [
      { label: 'Business-rates relief (£3bn)', effect: { debt: cited(3, 'event_commercial_property_crash'), growth: cited(-0.1, 'event_commercial_property_crash'), blocs: blocs('event_commercial_property_crash', { business: 5, professional: 3, northern: 2 }), log: 'Rates holiday for affected commercial premises.' } },
      { label: 'Office-to-residential conversion grants', effect: { debt: cited(2, 'event_commercial_property_crash'), housePriceIndex: cited(-2, 'event_commercial_property_crash'), blocs: blocs('event_commercial_property_crash', { youth: 5, professional: 3, business: 2 }), log: 'Conversion grants accelerate office repurposing.' } },
      { label: 'Let it clear', effect: { growth: cited(-0.4, 'event_commercial_property_crash'), equityIndex: cited(-8, 'event_commercial_property_crash'), blocs: blocs('event_commercial_property_crash', { business: -8, professional: -4 }), log: 'You stood back. Pension fund writedowns followed.' } },
    ],
  },
  pensionFundCrisis: {
    title: 'Pension Fund Crisis',
    body: 'Major DB scheme on the brink. LDI strategies failing in sympathy. TPR demanding action.',
    tone: 'bad',
    citationId: 'event_pension_fund_crisis',
    pandemicEffect: false,
    choices: [
      { label: 'PPF backstop + BoE liquidity (£5bn)', effect: { debt: cited(5, 'event_pension_fund_crisis'), bondYield: cited(-0.2, 'event_pension_fund_crisis'), equityIndex: cited(-4, 'event_pension_fund_crisis'), blocs: blocs('event_pension_fund_crisis', { pensioners: 6, business: 3, professional: 3 }), log: 'PPF stepped in; BoE provided liquidity backstop.' } },
      { label: 'Tighten TPR regulation', effect: { debt: cited(1, 'event_pension_fund_crisis'), equityIndex: cited(-6, 'event_pension_fund_crisis'), blocs: blocs('event_pension_fund_crisis', { pensioners: 4, professional: 2, business: -4 }), log: 'New TPR rules on liquidity buffers and LDI exposure.' } },
      { label: 'Let the scheme fail', effect: { equityIndex: cited(-12, 'event_pension_fund_crisis'), riskPremium: cited(0.3, 'event_pension_fund_crisis'), blocs: blocs('event_pension_fund_crisis', { pensioners: -14, professional: -6, business: -4 }), log: 'Scheme into PPF assessment. Pensioner uproar.' } },
    ],
  },
  fintechIpo: {
    title: 'Fintech IPO Boom',
    body: 'Three major UK fintechs filed for IPO this quarter. LSE bookrunners say demand is strong.',
    tone: 'good',
    citationId: 'event_fintech_ipo',
    choices: [
      { label: 'Fast-track listings reforms', effect: { equityIndex: cited(6, 'event_fintech_ipo'), growth: cited(0.2, 'event_fintech_ipo'), blocs: blocs('event_fintech_ipo', { business: 6, professional: 5 }), log: 'FCA-route listings expedited.' } },
      { label: 'Fintech-bond programme (£1bn)', effect: { debt: cited(1, 'event_fintech_ipo'), equityIndex: cited(4, 'event_fintech_ipo'), growth: cited(0.1, 'event_fintech_ipo'), blocs: blocs('event_fintech_ipo', { business: 4, professional: 4, youth: 2 }), log: 'BBB-backed bond programme launched.' } },
      { label: 'Hold the line', effect: { blocs: blocs('event_fintech_ipo', { business: -3, professional: -2 }), log: 'No action. Founders muttered about Amsterdam.' } },
    ],
  },
  inflationSurprise: {
    title: 'Inflation Surprise to the Downside',
    body: 'ONS CPI undershoots forecast by 0.5pp. Bond yields ticking down; mortgage approvals up.',
    tone: 'good',
    citationId: 'event_inflation_surprise',
    choices: [
      { label: 'Claim credit publicly', effect: { inflation: cited(-0.2, 'event_inflation_surprise'), blocs: blocs('event_inflation_surprise', { middleClass: 4, business: 3, workingClass: 2 }), log: 'Press round on disinflation. Approval ticks up.' } },
      { label: 'Hold rates, take the win quietly', effect: { inflation: cited(-0.3, 'event_inflation_surprise'), bondYield: cited(-0.15, 'event_inflation_surprise'), blocs: blocs('event_inflation_surprise', { professional: 4, business: 2 }), log: 'No fanfare. Markets reward steadiness.' } },
      { label: 'Encourage pre-emptive cuts', effect: { inflation: cited(0.1, 'event_inflation_surprise'), bondYield: cited(-0.3, 'event_inflation_surprise'), growth: cited(0.2, 'event_inflation_surprise'), blocs: blocs('event_inflation_surprise', { workingClass: 4, middleClass: 3, professional: -3 }), log: 'You leaned for rate cuts. Bank moved earlier; growth tracked higher.' } },
    ],
  },

  // ===========================================================================
  // Red Box expansion: political & institutional
  // ===========================================================================
  cabinetScandal: {
    title: 'Cabinet Scandal',
    body: 'A senior colleague is in the papers. The PM is on the phone.',
    tone: 'bad',
    citationId: 'event_cabinet_scandal',
    choices: [
      { label: 'Defend the minister publicly', effect: { blocs: blocs('event_cabinet_scandal', { professional: -4, middleClass: -3, business: 2 }), politicalCapital: -8, pmRelationship: 2, log: 'You went to the despatch box. The story dragged on.' } },
      { label: 'Accept the resignation', effect: { blocs: blocs('event_cabinet_scandal', { professional: 3, middleClass: 2 }), politicalCapital: -4, pmRelationship: -4, log: 'The minister resigned. Reshuffle pencilled in.' } },
      { label: 'Demand a formal inquiry', effect: { blocs: blocs('event_cabinet_scandal', { professional: 5, publicSector: 3, workingClass: 2 }), politicalCapital: -6, pmRelationship: -8, log: 'You set the ethics machinery moving. PM unhappy.' } },
    ],
  },
  devolutionDispute: {
    title: 'Devolution Funding Row',
    body: 'Edinburgh and Cardiff have escalated a block-grant dispute. NI Executive watching closely.',
    tone: 'neutral',
    citationId: 'event_devolution_dispute',
    choices: [
      { label: 'Concede uplift (£3bn)', effect: { debt: cited(3, 'event_devolution_dispute'), blocs: blocs('event_devolution_dispute', { northern: 4, publicSector: 3, workingClass: 2 }), log: 'Block-grant uplift agreed. Devolved governments calmed.' } },
      { label: 'Hold firm', effect: { blocs: blocs('event_devolution_dispute', { northern: -6, publicSector: -3, business: 2 }), log: 'You held the Barnett line. Intergovernmental relations strained.' } },
      { label: 'Negotiate targeted package (£1bn)', effect: { debt: cited(1, 'event_devolution_dispute'), blocs: blocs('event_devolution_dispute', { northern: 2, publicSector: 2 }), log: 'Targeted package agreed: NHS Wales, ferries, hospitals.' } },
    ],
  },
  ldiDoomLoop: {
    title: 'LDI Doom Loop',
    body: 'A sharp move higher in long gilt yields has triggered collateral calls across DB pension liability-driven-investment funds. Pension trustees are forced sellers; the BoE\'s Financial Policy Committee is convening hourly. Echoes of 28 September 2022 — 30-year yields rose 120bp in 3 days post-mini-budget; pension funds were "hours from being wound up" (Cunliffe).',
    tone: 'bad',
    citationId: 'event_ldi_doom_loop',
    choices: [
      {
        label: 'Emergency BoE QE (£100bn temporary purchase programme)',
        effect: {
          // bondYield delta = -(qeYieldEffectPerBn × qeSize / 100). With defaults
          // 0.5 × 100 / 100 = 0.5pp compression. Cited via Joyce-Tong-Woods 2011.
          bondYield: cited(-0.5, 'event_ldi_doom_loop_qe'),
          // BoE QE expands the central-bank balance sheet, not PSND. Debt
          // impact is zero by design — the log message explains this so
          // players don't think debt-not-moving is a bug.
          equityIndex: cited(2, 'event_ldi_doom_loop'),
          riskPremium: cited(-0.3, 'event_ldi_doom_loop'),
          blocs: blocs('event_ldi_doom_loop', { business: 1, professional: 1 }),
          log: 'Emergency QE programme of £100bn launched (off-balance-sheet; PSND unchanged). Long gilt yields fell sharply. Pension trustees relieved.',
        },
      },
      {
        label: 'Emergency fiscal retrench (signal credible consolidation)',
        effect: {
          growth: cited(-0.8, 'event_ldi_doom_loop'),
          bondYield: cited(-0.2, 'event_ldi_doom_loop'),
          blocs: blocs('event_ldi_doom_loop', { workingClass: -2, middleClass: -1, pensioners: -1, business: 1 }),
          log: 'Spending review pulled forward and tax thresholds frozen on the spot. Markets calmed; voters did not.',
        },
      },
      {
        label: 'Let the market clear',
        effect: {
          bondYield: cited(0.5, 'event_ldi_doom_loop'),
          riskPremium: cited(1.0, 'event_ldi_doom_loop'),
          blocs: blocs('event_ldi_doom_loop', { business: -2, professional: -2, pensioners: -1 }),
          log: 'You let the dust settle. Some LDI funds wound up; pension trustees furious; risk premium widened.',
        },
      },
    ],
  },
};

// Reform-driven risk modifiers that aren't expressible declaratively on a
// single reform (e.g. skillsBudget boosts investment surge, greenInvest cuts
// energy shock). These are special-case wirings consumed by engine.js.
export const REFORM_RISK_MODS = {
  skillsBudget: {
    investmentSurge: { value: 6, citationId: 'ifs_fe_funding' },
    supplyChainShock: { value: -2, citationId: 'event_supply_chain_shock' },
    aiDisplacement: { value: -2, citationId: 'event_ai_displacement' },
    scientificBreakthrough: { value: 3, citationId: 'event_scientific_breakthrough' },
  },
  greenInvest: {
    exportBoom: { value: 4, citationId: 'gb_energy_grid' },
    energyShock: { value: -10, citationId: 'gb_energy_grid' },
    coldSnap: { value: -3, citationId: 'event_cold_snap' },
    droughtStress: { value: -2, citationId: 'event_drought_stress' },
  },
  insulationScheme: {
    energyShock: { value: -6, citationId: 'ccc_insulation' },
    fuelPoverty: { value: -10, citationId: 'ccc_insulation' },
    coldSnap: { value: -4, citationId: 'event_cold_snap' },
  },
  freeChildcare: {
    productivityJump: { value: 4, citationId: 'resolution_childcare' },
    demographicDividend: { value: 3, citationId: 'resolution_childcare' },
  },
  preventativeHealth: {
    productivityJump: { value: 4, citationId: 'marmot_preventative' },
    pandemic: { value: -3, citationId: 'event_pandemic' },
  },
  hmrcCapacity: {
    taxBeats: { value: 6, citationId: 'nao_hmrc_compliance' },
  },
  socialHousing: {
    housingCrisis: { value: -15, citationId: 'shelter_social_housing' },
  },
  planningReform: {
    housingCrisis: { value: -5, citationId: 'planning_friction' },
    commercialPropertyCrash: { value: -2, citationId: 'event_commercial_property_crash' },
  },
  socialCareReform: {
    careCrisis: { value: -12, citationId: 'dilnot_social_care' },
  },

  // ---- Red Box expansion mitigations ----
  socialCareSystemic: {
    pandemic: { value: -2, citationId: 'event_pandemic' },
  },
  digitalInfra: {
    cyberAttack: { value: -10, citationId: 'event_cyber_attack' },
    supplyChainShock: { value: -3, citationId: 'event_supply_chain_shock' },
    scientificBreakthrough: { value: 2, citationId: 'event_scientific_breakthrough' },
  },
  uniReform: {
    aiDisplacement: { value: -2, citationId: 'event_ai_displacement' },
    scientificBreakthrough: { value: 3, citationId: 'event_scientific_breakthrough' },
  },
  energyMixReform: {
    coldSnap: { value: -5, citationId: 'event_cold_snap' },
  },
  realLivingWage: {
    teacherStrike: { value: -4, citationId: 'event_teacher_strike' },
  },
  civilService: {
    teacherStrike: { value: -3, citationId: 'event_teacher_strike' },
    cabinetScandal: { value: -3, citationId: 'event_cabinet_scandal' },
  },
  obrIndependence: {
    sterlingSlide: { value: -4, citationId: 'event_sterling_slide' },
  },
  amendBoeMandate: {
    sterlingSlide: { value: -3, citationId: 'event_sterling_slide' },
  },
  pensionConsolidation: {
    pensionFundCrisis: { value: -4, citationId: 'event_pension_fund_crisis' },
  },
  cityRegulation: {
    fintechIpo: { value: 3, citationId: 'event_fintech_ipo' },
    pensionFundCrisis: { value: -2, citationId: 'event_pension_fund_crisis' },
  },
  banking: {
    fintechIpo: { value: 2, citationId: 'event_fintech_ipo' },
  },
  localGov: {
    devolutionDispute: { value: -3, citationId: 'event_devolution_dispute' },
  },
};
