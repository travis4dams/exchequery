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
      { title: 'OBR Economic & Fiscal Outlook — March 2024', sub: 'Office for Budget Responsibility', note: 'Migration box: net migration of 200k above/below the 315k ONS projection raises/lowers GDP by ~1.5% in 2028-29 (≈ 0.0075pp per 1k migrants). Source of the migration→growth elasticity.', url: 'https://obr.uk/efo/economic-and-fiscal-outlook-march-2024/' },
      { title: 'OBR Dynamic Scoring of Policy Measures', sub: 'OBR (November 2023)', note: 'First-year real-GDP multipliers: CDEL 1.0, RDEL 0.6 (1.1 nominal), AME 0.6, VAT 0.35, income tax/NICs 0.3. Multipliers taper to zero over five years.', url: 'https://obr.uk/' },
      { title: 'IFS Green Budget', sub: 'Institute for Fiscal Studies (annual)', note: 'The most-cited UK fiscal policy analysis.', url: 'https://ifs.org.uk/green-budget' },
      { title: 'Public Spending Statistics', sub: 'HM Treasury', note: 'Departmental spending baselines.', url: 'https://www.gov.uk/government/collections/public-spending-statistics' },
    ],
  },
  {
    section: 'Macroeconomics & monetary policy',
    items: [
      { title: 'How Curvy is the Phillips Curve?', sub: 'Bunn, Anayi, Barnes, Bloom, Mizen, Thwaites & Yotzov, BoE Staff WP 1107 / NBER WP 33234 (October 2025)', note: 'Cross-country macro Phillips slope = 0.19 (positive output gap) vs 0.06 (negative) — 3.2× asymmetry. Covid natural experiment: inflation 5× more sensitive to demand when growing than falling. Convexity stronger when trend inflation is high (menu-cost mechanism).', url: 'https://www.bankofengland.co.uk/working-paper/2025/how-curvy-is-the-phillips-curve' },
      { title: 'Why Are Target Interest Rate Changes So Persistent?', sub: 'Coibion & Gorodnichenko, AEJ: Macroeconomics 4(4) (2012)', note: 'Quarterly Taylor-rule smoothing coefficient empirically 0.7–0.8 in advanced economies. FRB/US default 0.85. Justifies raising the simulation\'s bankRateInertia from 0.5 to 0.75.', url: 'https://www.aeaweb.org/articles?id=10.1257/mac.4.4.126' },
      { title: 'Discretion versus Policy Rules in Practice', sub: 'John B. Taylor, Carnegie-Rochester Conference Series on Public Policy 39 (1993)', note: 'Canonical inflation-and-output-gap reaction function: rate = neutral + 1.5 × (inflation − target) + 0.5 × output gap. Sim uses the inflation coefficient directly; dual-mandate adaptation activates the unemployment-gap term.', url: 'https://web.stanford.edu/~johntayl/Papers/Discretion.PDF' },
      { title: 'Measuring the Natural Rate of Interest after COVID-19', sub: 'Holston, Laubach & Williams, FRB NY Staff Report 1063 (2023)', note: 'NY Fed has explicitly discontinued HLW UK estimates as the model "does not provide a good fit for the data". Sim now relies on survey-based UK r* estimates instead.', url: 'https://www.newyorkfed.org/research/staff_reports/sr1063' },
      { title: 'Survey Measures of the Natural Rate of Interest', sub: 'Mercatus Center (2025)', note: 'Survey-based UK r* clusters around 1.5–2.0% real. With a 2% inflation target this implies ≈3.5–4.0% nominal neutral. Sim now uses 4.0%.', url: 'https://www.mercatus.org/' },
      { title: 'Measuring the Output Responses to Fiscal Policy', sub: 'Auerbach & Gorodnichenko, AEJ: Economic Policy 4(2) (2012)', note: '"GDP multipliers of government purchases are larger in recession." State-dependent fiscal multiplier ≈1.7× when output gap < −2pp. Drives the recession-amplification factor in applyFiscalMultipliers.', url: 'https://www.aeaweb.org/articles?id=10.1257/pol.4.2.1' },
      { title: 'Fiscal Positions and Government Bond Yields in OECD Countries', sub: 'Federal Reserve International Finance Discussion Paper 1011 (2010)', note: 'G-7 panel: a 1pp rise in the structural fiscal deficit/GDP ratio boosts long bond yields by ~15 basis points. Used to recalibrate the simulation\'s deficit-yield kicker from 0.003 → 0.006 pp/£bn.', url: 'https://www.federalreserve.gov/pubs/ifdp/2010/1011/' },
      { title: 'The UK\'s Quantitative Easing Policy: Design, Operation and Impact', sub: 'Joyce, Tong & Woods, BoE Quarterly Bulletin 2011 Q3', note: 'First £200bn UK QE programme lowered medium-to-long gilt yields by ~100bp. Sim uses 0.5bp per £bn of QE; asymmetric 0.3bp per £bn QT.', url: 'https://www.bankofengland.co.uk/quarterly-bulletin/2011/q3/the-uks-quantitative-easing-policy-design-operation-and-impact' },
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
      { title: 'Using a Temporary Indirect Tax Cut as a Fiscal Stimulus', sub: 'Crossley, Low & Sleeman, IFS WP W14/16 (2014)', note: 'UK 2008–09 VAT cut: central pass-through ≈75%; volume of retail sales rose ~1% → +0.4% total expenditure. Anchors the simulation\'s VAT-CPI passthrough.', url: 'https://ifs.org.uk/publications/using-temporary-indirect-tax-cut-fiscal-stimulus-evidence-uk' },
      { title: 'Updating and Critiquing HMRC\'s Analysis of the UK\'s 50% Top Rate of Tax', sub: 'Browne & Phillips, IFS WP 17/12 (2017)', note: 'ETI on the additional rate ≈ 0.31 once fuller post-reform data and forestalling allocation are accounted for. Refines Brewer-Saez-Shephard (Mirrlees) midpoint of 0.46.', url: 'https://ifs.org.uk/' },
      { title: 'The Elasticity of Corporate Taxable Income: New Evidence from UK Tax Records', sub: 'Devereux, Maffini & Liu, Oxford CBT WP 12/23 (2012)', note: 'UK elasticity of corporate taxable income wrt (1 − statutory rate) ≈ 0.13–0.17 from bunching at kinks 2001–2008. Justifies replacing the existing quadratic Laffer penalty above 30% with a constant ETI plus a separate profit-shifting term.', url: 'https://oxfordtax.sbs.ox.ac.uk/' },
    ],
  },
  {
    section: 'Migration & tax flight',
    items: [
      { title: 'Millionaire Migration and Taxation of the Elite', sub: 'Young, Varner, Lurie & Prisinzano, ASR (2016)', note: '45m IRS records — migration elasticity η ≈ 0.1.', url: 'https://journals.sagepub.com/doi/10.1177/0003122416639625' },
      { title: 'UK non-dom departure data', sub: 'HMRC / Tax Justice Network', note: 'Post-reform statistics consistently below forecast departures.', url: 'https://taxjustice.net/' },
      { title: 'OBR Migration Box (Nov 2023)', sub: 'Office for Budget Responsibility', note: '~100k net migration adds ~0.5% real GDP over 5 years (analyst back-calculation from OBR scenarios).', url: 'https://obr.uk/efo/economic-and-fiscal-outlook-november-2023/' },
      { title: 'The Fiscal Effects of Immigration to the UK', sub: 'Dustmann & Frattini, Economic Journal (2014)', note: 'EEA migrants 1995–2011 made a positive net fiscal contribution; non-EEA broadly negative. Skilled migration ~£40k/yr net positive; low-skill ~–£10k/yr. Pre-staged for bifurcated migration fiscal contribution (deferred).', url: 'https://onlinelibrary.wiley.com/doi/10.1111/ecoj.12181' },
    ],
  },
  {
    section: 'Public services & austerity',
    items: [
      { title: 'Marmot Review at 10 / Marmot 2024', sub: 'Institute of Health Equity, UCL', note: '~148,000 excess deaths attributed to austerity 2011–pandemic.', url: 'https://www.instituteofhealthequity.org/' },
      { title: 'Walsh, McCartney et al. (2022)', sub: 'Excess mortality in England & Scotland 2012–2019', note: '', url: 'https://pubmed.ncbi.nlm.nih.gov/' },
      { title: 'Loopstra, Reeves et al. (2016)', sub: 'Journal of the Royal Society of Medicine', note: 'Pension Credit cuts associated with rise in mortality (85+).', url: 'https://journals.sagepub.com/home/jrs' },
      { title: 'Public Service Productivity Review (revised March 2025)', sub: 'Office for National Statistics', note: 'Total public-service productivity rose ≈0.5% pa on average 2010–2019 (≈5% cumulative). Education productivity is more volatile but not declining — contrary to popular narrative.', url: 'https://www.ons.gov.uk/economy/economicoutputandproductivity/publicservicesproductivity' },
    ],
  },
  {
    section: 'Housing',
    items: [
      { title: 'Building the Homes We Need', sub: 'Shelter (2024)', note: '~£10-12.8bn/year for 90k social homes/year.', url: 'https://england.shelter.org.uk/professional_resources/policy_and_research' },
      { title: 'Effects of Rent Control Expansion', sub: 'Diamond, McQuade & Qian, AER (2019)', note: 'Reduces renter mobility 20%; rental supply -15%; citywide rents +5.1%.', url: 'https://www.aeaweb.org/articles?id=10.1257/aer.20181289' },
      { title: 'Housebuilding Market Study', sub: 'CMA (2024)', note: 'Planning identified as root cause of UK housing under-supply.', url: 'https://www.gov.uk/cma-cases/housebuilding-market-study' },
      { title: 'UK House Prices and Three Decades of Decline in the Risk-Free Real Interest Rate', sub: 'Miles & Monro, BoE Staff WP 837 (2019)', note: '~80% of the 170% real UK HPI rise since 1985 attributed to a ~5pp fall in real rates. Implies long-run semi-elasticity ~−16pp per 1pp; 3-year adjustment captures ~−6pp. Justifies the simulation\'s shift from −2.0 → −6.0 elasticity.', url: 'https://www.bankofengland.co.uk/working-paper/2019/uk-house-prices-and-three-decades-of-decline-in-the-risk-free-real-interest-rate' },
      { title: 'The Impact of Supply Constraints on House Prices in England', sub: 'Hilber & Vermeulen, Economic Journal 126(591) (2016)', note: 'UK long-run housing supply price elasticity ≈ 0.4 nationally; near zero in the most-constrained Local Planning Authorities. Regulatory constraints have a substantive positive impact on the house-price-earnings elasticity.', url: 'https://onlinelibrary.wiley.com/doi/10.1111/ecoj.12213' },
    ],
  },
  {
    section: 'Labour & wages',
    items: [
      { title: 'Low Pay Commission Annual Report', sub: 'LPC', note: 'NLW / Living Wage employment effects evidence.', url: 'https://www.gov.uk/government/organisations/low-pay-commission' },
      { title: 'Labor in the Boardroom', sub: 'Jäger, Schoefer & Heining, QJE (2021)', note: 'German codetermination raises long-term capital stock 40-50%; null wage/labour-share effects.', url: 'https://academic.oup.com/qje/article/136/2/669/6041122' },
      { title: 'The Elusive Employment Effect of the Minimum Wage', sub: 'Manning, Journal of Economic Perspectives (2021)', note: 'UK NLW employment elasticity near zero (-0.05 to +0.05) across recent meta-analyses.', url: 'https://www.aeaweb.org/articles?id=10.1257/jep.35.1.3' },
      { title: 'The Effect of Immigration along the Distribution of Wages', sub: 'Dustmann, Frattini & Preston, Review of Economic Studies (2013)', note: 'Immigration depresses wages below the 20th percentile (~-0.7p/hr at 10th percentile per pp migrant labour share) but raises wages at median and above (+1.5p/hr at median, +2p at 90th).', url: 'https://academic.oup.com/restud/article-abstract/80/1/145/1525810' },
      { title: 'Letter to TSC Chair on UK Equilibrium Unemployment', sub: 'Mark Carney, Treasury Select Committee (2017)', note: 'Long-run UK equilibrium unemployment ≈ 4.5%. Resolution Foundation 2024 and BoE MPR November 2025 cluster at 4.0–4.5%. Sim uses 4.25% as the central estimate.', url: 'https://www.parliament.uk/business/committees/committees-a-z/commons-select/treasury-committee/' },
    ],
  },
  {
    section: 'Green & climate',
    items: [
      { title: 'CCC Net Zero / Carbon Budgets', sub: 'Climate Change Committee', note: 'Retrofit programme — government Warm Homes Plan ~£15bn/5y; ~£300/yr savings/home.', url: 'https://www.theccc.org.uk/' },
      { title: 'The Seventh Carbon Budget — Advice for the UK Government', sub: 'Climate Change Committee (26 February 2025)', note: 'Budget 2038–2042: 535 MtCO2e (87% below 1990). Net cost of Net Zero ≈ 0.2% of UK GDP per year on average; required investment averages ~£26bn/yr to 2050.', url: 'https://www.theccc.org.uk/publication/the-seventh-carbon-budget/' },
      { title: 'Full Fibre: Economic Impact', sub: 'CEBR (2022) for Openreach', note: 'Full-fibre adds £59bn GVA by 2025; £70bn by 2038.', url: 'https://cebr.com/' },
    ],
  },
  {
    section: 'Banking & financial stability',
    items: [
      { title: 'Basel Committee on Banking Supervision (BCBS)', sub: 'BIS', note: 'LEI assessment: capital-requirement crisis-probability reduction 0.03-1.7pp per 1pp.', url: 'https://www.bis.org/bcbs/' },
      { title: 'Systemic Banking Crises Database II', sub: 'Laeven & Valencia, IMF Economic Review 68(2): 307–361 (2020)', note: 'Catalogue of 151 systemic crises 1970–2017; UK sub-systemic stress every 5–7 years. Justifies raising the simulation\'s financial-crisis base rate from 6%/yr → 8%/yr.', url: 'https://link.springer.com/article/10.1057/s41308-020-00107-3' },
      { title: 'An Anatomy of the 2022 Gilt Market Crisis', sub: 'BoE Staff WP 1019 (2023)', note: '30-year gilt yield rose 120bp over 3 days post-mini-budget; LDI / pension-investor sector forced selling drove an additional 50–80bp. Cunliffe: pension funds were "hours from being wound up". Anchors the simulation\'s LDI doom-loop trigger.', url: 'https://www.bankofengland.co.uk/working-paper/2023/an-anatomy-of-the-2022-gilt-market-crisis' },
      { title: 'UK Pension Market Stress in 2022', sub: 'Federal Reserve Bank of Chicago, Chicago Fed Letter No. 480 (2023)', note: 'UK DB pension schemes hold ~28% of long-end gilts; LDI gross interest-rate derivatives exposure is large. Used to size the simulation\'s LDI passive-demand discount on the term premium.', url: 'https://www.chicagofed.org/publications/chicago-fed-letter/2023/480' },
      { title: 'Measuring the Macroeconomic Costs and Benefits of Higher UK Bank Capital Requirements', sub: 'Brooke et al., BoE Financial Stability Paper No. 35 (2015)', note: 'Each 1pp higher CET1 reduces UK crisis probability by ~5% at current capital levels.', url: 'https://www.bankofengland.co.uk/financial-stability-paper/2015/measuring-the-macroeconomic-costs-and-benefits' },
    ],
  },
  {
    section: 'Risk events & base rates',
    items: [
      { title: 'Pandemics: Risks, Impacts, and Mitigation', sub: 'Madhav et al., Disease Control Priorities (3rd ed., 2017)', note: '3 influenza pandemics in the 20th century. Long-run base rate ~5%/yr — lower than the peak-Covid figure of 6%/yr the simulation used previously.', url: 'https://www.ncbi.nlm.nih.gov/books/NBK525302/' },
      { title: 'NHS Industrial Action in England (2022–2024)', sub: 'House of Commons Library briefing CBP-9775 (2024)', note: 'ONS reports 1.16m working days lost to NHS strikes June–October 2022 alone. Justifies a 10%/yr baseline, 30%/yr in pay-round-dispute years.', url: 'https://commonslibrary.parliament.uk/research-briefings/cbp-9775/' },
      { title: 'UKHSA Excess Mortality Reports', sub: 'UK Health Security Agency', note: '2022 had ~2,985 excess heat deaths. Heatwave base rate trending up with climate.', url: 'https://www.gov.uk/government/organisations/uk-health-security-agency' },
      { title: 'Postwar UK Business Cycle Duration', sub: 'Broadberry, Chadha, Lennard & Thomas, Economic History Review (2023)', note: 'Average postwar UK business cycle length ≈ 16 years → recession onset ≈ 6.25%/yr ≈ 1.6%/quarter. Refines the simulation\'s recession base hazard.', url: 'https://onlinelibrary.wiley.com/journal/14680289' },
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
