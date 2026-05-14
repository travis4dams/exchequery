// =============================================================================
// SOURCES — high-level bibliography grouped by topic.
//
// Renders in the About tab's "Browse by source" view. The companion drill-down
// "Browse by parameter" view is driven off CITATIONS in citations.js — this
// file is the bibliographic surface; that file is the parameter-level surface.
// =============================================================================

export const SOURCES = [
  {
    section: 'Public finances — overall',
    items: [
      { title: 'HMRC Ready Reckoner', sub: 'Direct effects of illustrative tax changes', note: 'Per-percentage-point revenue estimates for income tax, NI, CGT, etc.', url: 'https://www.gov.uk/government/statistics/direct-effects-of-illustrative-tax-changes' },
      { title: 'OBR Economic & Fiscal Outlook', sub: 'Office for Budget Responsibility', note: 'Twice-yearly forecasts; basis for debt-sustainability framing.', url: 'https://obr.uk/efo/economic-and-fiscal-outlook/' },
      { title: 'IFS Green Budget', sub: 'Institute for Fiscal Studies (annual)', note: 'The most-cited UK fiscal policy analysis.', url: 'https://ifs.org.uk/green-budget' },
      { title: 'Public Spending Statistics', sub: 'HM Treasury', note: 'Departmental spending baselines.', url: 'https://www.gov.uk/government/collections/public-spending-statistics' },
    ],
  },
  {
    section: 'Taxation — specific reforms',
    items: [
      { title: 'Capital Gains Tax Reform', sub: 'Adam, Advani, Miller & Summers (IFS/CenTax, 2024)', note: '~£14bn pa from full CGT reform package; £13bn for rate alignment alone is in-range but conflates package vs alignment.', url: 'https://ifs.org.uk/publications/capital-gains-tax-reform' },
      { title: 'The UK Non-Dom Regime: Implications of Reform', sub: 'Advani, Burgherr & Summers (CenTax, 2025)', note: '2017 reform → -4.9% departures, receipts +150%.', url: 'https://centax.org.uk/research/' },
      { title: 'The Case for a Progressive Tax', sub: 'Diamond & Saez, JEP (2011)', note: 'Revenue-maximising top combined rate ≈ 73%; ETI = 0.25.', url: 'https://www.aeaweb.org/articles?id=10.1257/jep.25.4.165' },
      { title: 'A Wealth Tax for the UK', sub: 'Wealth Tax Commission (2020)', note: 'One-off rates costed extensively; annual rate estimates contested.', url: 'https://www.wealthandpolicy.com/' },
      { title: 'Charity Tax Relief Statistics 2024–25', sub: 'HMRC', note: 'Total reliefs £6.7bn; higher-rate Gift Aid £820m.', url: 'https://www.gov.uk/government/statistics/cost-of-tax-relief' },
      { title: 'Economic Consequences of Major Tax Cuts for the Rich', sub: 'Hope & Limberg, Socio-Economic Review (2022)', note: '50 years OECD data — no significant growth effects.', url: 'https://academic.oup.com/ser/article/20/2/539/6500315' },
    ],
  },
  {
    section: 'Migration & tax flight',
    items: [
      { title: 'Millionaire Migration and Taxation of the Elite', sub: 'Young, Varner, Lurie & Prisinzano, ASR (2016)', note: '45m IRS records — migration elasticity η ≈ 0.1.', url: 'https://journals.sagepub.com/doi/10.1177/0003122416639625' },
      { title: 'UK non-dom departure data', sub: 'HMRC / Tax Justice Network', note: 'Post-reform statistics consistently below forecast departures.', url: 'https://taxjustice.net/' },
      { title: 'OBR Migration Box (Nov 2023)', sub: 'Office for Budget Responsibility', note: '~100k net migration adds ~0.5% real GDP over 5 years (analyst back-calculation from OBR scenarios).', url: 'https://obr.uk/efo/economic-and-fiscal-outlook-november-2023/' },
    ],
  },
  {
    section: 'Public services & austerity',
    items: [
      { title: 'Marmot Review at 10 / Marmot 2024', sub: 'Institute of Health Equity, UCL', note: '~148,000 excess deaths attributed to austerity 2011–pandemic.', url: 'https://www.instituteofhealthequity.org/' },
      { title: 'Walsh, McCartney et al. (2022)', sub: 'Excess mortality in England & Scotland 2012–2019', note: '', url: 'https://pubmed.ncbi.nlm.nih.gov/' },
      { title: 'Loopstra, Reeves et al. (2016)', sub: 'Journal of the Royal Society of Medicine', note: 'Pension Credit cuts associated with rise in mortality (85+).', url: 'https://journals.sagepub.com/home/jrs' },
    ],
  },
  {
    section: 'Housing',
    items: [
      { title: 'Building the Homes We Need', sub: 'Shelter (2024)', note: '~£10-12.8bn/year for 90k social homes/year.', url: 'https://england.shelter.org.uk/professional_resources/policy_and_research' },
      { title: 'Effects of Rent Control Expansion', sub: 'Diamond, McQuade & Qian, AER (2019)', note: 'Reduces renter mobility 20%; rental supply -15%; citywide rents +5.1%.', url: 'https://www.aeaweb.org/articles?id=10.1257/aer.20181289' },
      { title: 'Housebuilding Market Study', sub: 'CMA (2024)', note: 'Planning identified as root cause of UK housing under-supply.', url: 'https://www.gov.uk/cma-cases/housebuilding-market-study' },
    ],
  },
  {
    section: 'Labour & wages',
    items: [
      { title: 'Low Pay Commission Annual Report', sub: 'LPC', note: 'NLW / Living Wage employment effects evidence.', url: 'https://www.gov.uk/government/organisations/low-pay-commission' },
      { title: 'Labor in the Boardroom', sub: 'Jäger, Schoefer & Heining, QJE (2021)', note: 'German codetermination raises long-term capital stock 40-50%; null wage/labour-share effects.', url: 'https://academic.oup.com/qje/article/136/2/669/6041122' },
    ],
  },
  {
    section: 'Green & climate',
    items: [
      { title: 'CCC Net Zero / Carbon Budgets', sub: 'Climate Change Committee', note: 'Retrofit programme — government Warm Homes Plan ~£15bn/5y; ~£300/yr savings/home.', url: 'https://www.theccc.org.uk/' },
      { title: 'Full Fibre: Economic Impact', sub: 'CEBR (2022) for Openreach', note: 'Full-fibre adds £59bn GVA by 2025; £70bn by 2038.', url: 'https://cebr.com/' },
    ],
  },
  {
    section: 'Banking & financial stability',
    items: [
      { title: 'Basel Committee on Banking Supervision (BCBS)', sub: 'BIS', note: 'LEI assessment: capital-requirement crisis-probability reduction 0.03-1.7pp per 1pp.', url: 'https://www.bis.org/bcbs/' },
    ],
  },
  {
    section: 'Fiscal/political philosophy',
    items: [
      { title: 'Just Giving', sub: 'Rob Reich (Princeton, 2018)', note: 'Foundational case against charity-as-tax-substitute.', url: 'https://press.princeton.edu/books/hardcover/9780691183497/just-giving' },
      { title: 'Winner-Take-All Politics', sub: 'Hacker & Pierson (2010)', note: 'Political economy of persistent tax cuts.', url: 'https://us.macmillan.com/books/9781416588702/winnertakeallpolitics' },
    ],
  },
];
