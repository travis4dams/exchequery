// =============================================================================
// EVENT_DEFINITIONS — quarterly random events.
//
// Each event has a title, body, tone, and an array of player choices. Each
// choice's effect carries deltas to debt / growth / inflation / health /
// bondYield / bloc-support, all of which are designer-set magnitudes
// (see event_payouts_judgement citation for the methodology framing).
//
// Base probabilities for each event live in PARAMS.risks; reform/state
// modifiers are applied via computeRiskMods in engine.js.
// =============================================================================

export const EVENT_DEFINITIONS = {
  nhsStrike: {
    title: 'NHS Strike Action',
    body: 'RCN and BMA announce coordinated strike action.',
    tone: 'bad',
    citationId: 'event_payouts_judgement',
    choices: [
      { label: 'Emergency pay negotiations', effect: { debt: 3, blocs: { publicSector: 6, workingClass: 3 }, log: 'Emergency pay deal halted strikes.' } },
      { label: 'Anti-strike legislation', effect: { blocs: { publicSector: -12, workingClass: -8, business: 5 }, log: 'Anti-strike laws passed.' } },
      { label: 'Wait it out', effect: { healthIndex: -3, blocs: { pensioners: -5, publicSector: -4 }, log: 'Strikes dragged on.' } },
    ],
  },
  energyShock: {
    title: 'Global Energy Price Shock',
    body: 'Gas prices surged 60% on geopolitical instability.',
    tone: 'bad',
    citationId: 'event_payouts_judgement',
    choices: [
      { label: 'Energy Price Guarantee (£12bn)', effect: { debt: 12, blocs: { workingClass: 5, pensioners: 6, northern: 4 }, log: 'Bills capped through winter.' } },
      { label: 'Targeted support + windfall tax', effect: { debt: 3, blocs: { workingClass: 6, pensioners: 4, business: -5 }, log: 'Targeted help funded by windfall.' } },
      { label: 'Let the market clear', effect: { inflation: 1.5, healthIndex: -2, blocs: { workingClass: -10, pensioners: -8, northern: -6 }, log: 'Fuel poverty spiked.' } },
    ],
  },
  fuelPoverty: {
    title: 'Winter Fuel Poverty Crisis',
    body: 'Age UK reports record pensioners unable to heat homes.',
    tone: 'bad',
    citationId: 'event_payouts_judgement',
    choices: [
      { label: 'Emergency winter payments', effect: { debt: 4, blocs: { pensioners: 8, workingClass: 3 }, log: 'Winter payments delivered.' } },
      { label: 'Direct payments via councils', effect: { debt: 2, blocs: { pensioners: 4, publicSector: 2 }, log: 'Council-delivered support reached the most vulnerable.' } },
      { label: 'Refuse to act', effect: { healthIndex: -3, blocs: { pensioners: -12, workingClass: -5 }, log: 'Excess winter deaths spiked.' } },
    ],
  },
  housingCrisis: {
    title: 'Homelessness Surge',
    body: 'Rough sleeping up 35%. Shelter demands action.',
    tone: 'bad',
    citationId: 'event_payouts_judgement',
    choices: [
      { label: 'Emergency homelessness fund', effect: { debt: 2, blocs: { youth: 5, workingClass: 4, ethnicMinority: 4 }, log: 'Emergency hostels funded.' } },
      { label: 'Acquire empty properties', effect: { debt: 1, blocs: { youth: 4, workingClass: 5, business: -4 }, log: 'CPO programme on empty properties.' } },
      { label: 'Tough on rough sleeping', effect: { blocs: { youth: -8, workingClass: -6, ethnicMinority: -5, middleClass: 2 }, log: 'You criminalised it.' } },
    ],
  },
  councilBankruptcy: {
    title: 'Council Issues Section 114',
    body: 'A metropolitan council has declared bankruptcy.',
    tone: 'bad',
    citationId: 'event_payouts_judgement',
    choices: [
      { label: 'Direct bailout + funding review', effect: { debt: 3, blocs: { publicSector: 5, northern: 6, workingClass: 3 }, log: 'You bailed out the council.' } },
      { label: 'Government commissioners', effect: { debt: 1, blocs: { publicSector: -3, northern: -4 }, log: 'Local democracy suspended.' } },
    ],
  },
  financialCrisis: {
    title: 'Banking Sector Stress',
    body: 'A mid-size lender has failed.',
    tone: 'bad',
    citationId: 'event_payouts_judgement',
    choices: [
      { label: 'Coordinated rescue package', effect: { debt: 15, bondYield: -0.3, blocs: { business: 6, professional: 3, workingClass: -4 }, log: 'You stabilised the system.' } },
      { label: 'Bail-in instead of bailout', effect: { debt: 4, bondYield: 0.2, blocs: { workingClass: 5, business: -8 }, log: 'Senior creditors took the loss.' } },
    ],
  },
  generalStrike: {
    title: 'Cross-Sector Strike Wave',
    body: 'TUC coordinates general day of action.',
    tone: 'bad',
    citationId: 'event_payouts_judgement',
    choices: [
      { label: 'Sit down with the TUC', effect: { debt: 2, blocs: { workingClass: 8, publicSector: 6, business: -4 }, log: 'You negotiated.' } },
      { label: 'Refuse to negotiate under duress', effect: { growth: -0.3, blocs: { workingClass: -8, publicSector: -10, business: 4 }, log: 'Strikes continued.' } },
    ],
  },
  careCrisis: {
    title: 'Care Sector Collapse',
    body: 'Major care operator bust. 14,000 residents may lose homes.',
    tone: 'bad',
    citationId: 'event_payouts_judgement',
    choices: [
      { label: 'Take into public ownership', effect: { debt: 4, blocs: { pensioners: 8, publicSector: 5, business: -3 }, log: 'Care homes taken into public hands.' } },
      { label: 'Broker private rescue', effect: { debt: 1, blocs: { pensioners: 3, business: 2 }, log: 'Private rescue brokered.' } },
    ],
  },
  flood: {
    title: 'Severe Flooding',
    body: 'Storm flooding hit multiple regions.',
    tone: 'bad',
    citationId: 'event_payouts_judgement',
    choices: [
      { label: 'Reconstruction + flood defences', effect: { debt: 6, blocs: { northern: 5, workingClass: 3 }, log: 'New flood defences commissioned.' } },
      { label: 'Reconstruction only', effect: { debt: 3, blocs: { northern: 2 }, log: 'Patched up.' } },
    ],
  },
  heatwave: {
    title: 'Record Heatwave',
    body: 'Temperatures exceeded 40°C for three days.',
    tone: 'bad',
    citationId: 'event_payouts_judgement',
    choices: [
      { label: 'Climate adaptation package', effect: { debt: 3, blocs: { youth: 4, professional: 3, ethnicMinority: 3 }, log: 'Adaptation funding announced.' } },
      { label: 'Public information campaign', effect: { debt: 0.2, blocs: { youth: -2 }, log: 'Just an information campaign.' } },
    ],
  },
  allyCrisis: {
    title: 'International Crisis',
    body: 'NATO ally requesting military and financial support.',
    tone: 'neutral',
    citationId: 'event_payouts_judgement',
    choices: [
      { label: 'Full support package', effect: { debt: 4, blocs: { middleClass: 2, business: 2, youth: -3 }, log: 'Full support extended.' } },
      { label: 'Diplomatic support only', effect: { blocs: { professional: -2 }, log: 'Moral support only.' } },
    ],
  },
  labourShortage: {
    title: 'Severe Labour Shortages',
    body: 'Care, hospitality, agriculture and construction report critical vacancies.',
    tone: 'bad',
    citationId: 'event_payouts_judgement',
    choices: [
      { label: 'Temporary visa scheme', effect: { growth: 0.2, blocs: { business: 6, northern: -4 }, log: 'Targeted visas eased pressure.' } },
      { label: 'Hold the line on immigration', effect: { growth: -0.3, blocs: { workingClass: -3, business: -8 }, log: 'Shortages persisted.' } },
    ],
  },
  investmentSurge: {
    title: 'Foreign Investment Surge',
    body: 'EU pension funds commit £40bn to UK infrastructure.',
    tone: 'good',
    citationId: 'event_payouts_judgement',
    choices: [
      { label: 'Direct to priority projects', effect: { growth: 0.3, blocs: { business: 6, professional: 4, northern: 4 }, log: 'Investment to rail, grid, housing.' } },
    ],
  },
  exportBoom: {
    title: 'Export Surge',
    body: 'UK clean-tech exports hit a record.',
    tone: 'good',
    citationId: 'event_payouts_judgement',
    choices: [
      { label: 'Capitalise on the moment', effect: { growth: 0.2, blocs: { business: 5, workingClass: 3, northern: 3 }, log: 'Trade boost feeding GDP.' } },
    ],
  },
  productivityJump: {
    title: 'Productivity Surprise',
    body: 'ONS reports unexpected 1.2% productivity jump.',
    tone: 'good',
    citationId: 'event_payouts_judgement',
    choices: [
      { label: 'Bank the windfall', effect: { growth: 0.4, blocs: { professional: 5, business: 4, middleClass: 3 }, log: 'Productivity gains feeding wages.' } },
    ],
  },
  taxBeats: {
    title: 'Tax Receipts Beat Forecast',
    body: 'HMRC reports compliance improvement.',
    tone: 'good',
    citationId: 'event_payouts_judgement',
    choices: [
      { label: 'Apply to deficit reduction', effect: { debt: -4, blocs: { business: 2, professional: 2 }, log: 'Windfall to deficit.' } },
      { label: 'Apply to public services', effect: { healthIndex: 1, blocs: { workingClass: 4, publicSector: 4, ethnicMinority: 3 }, log: 'Windfall to services.' } },
    ],
  },
  demographicDividend: {
    title: 'Workforce Participation Up',
    body: 'Female labour participation at record high.',
    tone: 'good',
    citationId: 'event_payouts_judgement',
    choices: [
      { label: 'Recognise and extend', effect: { growth: 0.2, blocs: { workingClass: 4, professional: 5, youth: 4 }, log: 'Childcare model extended.' } },
    ],
  },
  tradeDeal: {
    title: 'Major Trade Agreement',
    body: 'A new trade agreement signed.',
    tone: 'good',
    citationId: 'event_payouts_judgement',
    choices: [
      { label: 'Celebrate', effect: { growth: 0.2, blocs: { business: 6, professional: 4, middleClass: 3 }, log: 'Trade deal boosting confidence.' } },
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
