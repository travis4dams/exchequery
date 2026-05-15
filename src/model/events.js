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

const cited = (value, citationId) => {
  if (!CITATIONS[citationId]) throw new Error(`event effect references missing citation: ${citationId}`);
  return { value, citationId };
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
      { label: 'Energy Price Guarantee (£12bn)', effect: { debt: cited(12, 'event_energy_shock'), blocs: blocs('event_energy_shock', { workingClass: 5, pensioners: 6, northern: 4 }), log: 'Bills capped through winter.' } },
      { label: 'Targeted support + windfall tax', effect: { debt: cited(3, 'event_energy_shock'), blocs: blocs('event_energy_shock', { workingClass: 6, pensioners: 4, business: -5 }), log: 'Targeted help funded by windfall.' } },
      { label: 'Let the market clear',           effect: { inflation: cited(1.5, 'event_energy_shock'), healthIndex: cited(-2, 'event_energy_shock'), blocs: blocs('event_energy_shock', { workingClass: -10, pensioners: -8, northern: -6 }), log: 'Fuel poverty spiked.' } },
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
};

// Reform-driven risk modifiers that aren't expressible declaratively on a
// single reform (e.g. skillsBudget boosts investment surge, greenInvest cuts
// energy shock). These are special-case wirings consumed by engine.js.
export const REFORM_RISK_MODS = {
  skillsBudget: {
    investmentSurge: { value: 6, citationId: 'ifs_fe_funding' },
  },
  greenInvest: {
    exportBoom: { value: 4, citationId: 'gb_energy_grid' },
    energyShock: { value: -10, citationId: 'gb_energy_grid' },
  },
  insulationScheme: {
    energyShock: { value: -6, citationId: 'ccc_insulation' },
    fuelPoverty: { value: -10, citationId: 'ccc_insulation' },
  },
  freeChildcare: {
    productivityJump: { value: 4, citationId: 'resolution_childcare' },
    demographicDividend: { value: 3, citationId: 'resolution_childcare' },
  },
  preventativeHealth: {
    productivityJump: { value: 4, citationId: 'marmot_preventative' },
  },
  hmrcCapacity: {
    taxBeats: { value: 6, citationId: 'nao_hmrc_compliance' },
  },
  socialHousing: {
    housingCrisis: { value: -15, citationId: 'shelter_social_housing' },
  },
  planningReform: {
    housingCrisis: { value: -5, citationId: 'planning_friction' },
  },
  socialCareReform: {
    careCrisis: { value: -12, citationId: 'dilnot_social_care' },
  },
};
