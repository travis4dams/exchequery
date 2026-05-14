// =============================================================================
// Voter bloc definitions.
//
// Each bloc has:
//   weight   — starting share of the electorate (sums to >1 because blocs
//              overlap as identities; engine normalises drift internally)
//   base     — starting support level (0-100)
//   popGrowth — baseline annual demographic drift (%)
//   note     — short description shown in Overview tab
//
// The drift rates and base support levels are designer judgements informed by
// YouGov/BES patterns. See citations.bloc_pop_growth_judgement and
// citations.bloc_methodology for the methodology framing.
// =============================================================================

export const BLOCS = {
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

// Coalition members — used for cohesion calculation.
export const COALITION = ['workingClass', 'publicSector', 'youth', 'northern', 'ethnicMinority'];

export const INITIAL_BLOC_SUPPORT = Object.fromEntries(
  Object.entries(BLOCS).map(([k, v]) => [k, v.base])
);

export const INITIAL_BLOC_WEIGHTS = Object.fromEntries(
  Object.entries(BLOCS).map(([k, v]) => [k, v.weight])
);

// All bloc drift rates share this citation. Specific bloc reactions to policy
// are documented under bloc_methodology + the per-axis citations in
// PARAMS.blocResponses.
export const BLOC_DEMOGRAPHIC_CITATION = 'bloc_pop_growth_judgement';
