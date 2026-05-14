# Classification Log

This file records every borderline classification decision made while building
`src/model/citations.js`, so the chain of reasoning is preserved for future
contributors. Entries are added when the model assigning a confidence level
flags a non-obvious case for user review and the user issues a final call.

The three confidence levels are:

- **sourced** — directly verified against the cited publication.
- **extrapolated** — sourced reasoning applied / consistent with source but not
  verbatim, or a derived calculation from a sourced parameter.
- **judgement** — designer judgement with documented reasoning. Includes
  designer overrides of source-implied figures.

Format for each entry:

- **Parameter**: which parameter (path in `params.js` / `reforms.js`)
- **Value used**: simulation value (kept as-is per the refactor brief's no-balance-change rule)
- **Source candidate**: the publication consulted
- **What source says**: the figure or framing the source actually supports
- **What sim uses**: the simulation's value or framing
- **Discrepancy**: how they differ
- **Final classification**: the agreed confidence level
- **Decided by**: who made the call
- **Reasoning**: why that classification fits

---

## Initial verification round (2026-05-14)

WebFetch verification was performed by four parallel research agents covering
HMRC tax figures, reform-specific economist papers, public-services / housing
research, and infrastructure / banking citations. Most gov.uk and academic-
publisher endpoints returned HTTP 403 to direct WebFetch; figures were
triangulated from secondary citations (Commons Library, HMRC bulletins,
university working-paper PDFs, OBR boxes, news summaries that quote the
source). Where verification is indirect, citation notes say so.

Bias guards followed: do not over-classify as `sourced` to look more rigorous;
do not over-classify as `judgement` to dodge verification work. When in doubt,
flag for user review.

---

### Group A — Material magnitude divergence

#### `hmrc_higher_rate` — Higher-rate income tax £/pp

- **Parameter**: `revenue.incomeTax.higherRatePerPP`
- **Value used**: £4.5bn pa per 1pp
- **Source candidate**: HMRC, *Direct effects of illustrative tax changes*
  (Ready Reckoner), June 2025 bulletin. https://www.gov.uk/government/statistics/direct-effects-of-illustrative-tax-changes
- **What source says**: Oxford Department of Economics commentary on the bulletin
  notes that basic-rate yield is **>4× higher-rate yield**. With basic rate
  ≈ £8bn (year-1/steady-state range £6.9-£8.2bn), higher rate is ≈ £2bn.
- **What sim uses**: £4.5bn — roughly **2× the HMRC-implied figure**.
- **Final classification**: **judgement**
- **Decided by**: user, batch 1, 2026-05-14
- **Reasoning**: The simulation value is a designer override of the
  source-implied figure, not a derivation. The Ready Reckoner publication
  exists and is real, but the value the simulation uses is not what the
  source supports. "Judgement" is the most honest tag.
- **Action**: Number kept as-is per refactor brief's no-balance-change rule.
  Flagged for a follow-up rebalancing PR.

#### `diamond_saez_top_rate` — Additional-rate income tax £/pp

- **Parameter**: `revenue.incomeTax.additionalRatePerPP`
- **Value used**: £0.9bn pa per 1pp
- **Source candidate**: Diamond & Saez (2011), *The Case for a Progressive
  Tax*, Journal of Economic Perspectives 25(4).
  https://www.aeaweb.org/articles?id=10.1257/jep.25.4.165
- **What source says**: Revenue-maximising top combined rate ≈ 73% (Pareto
  parameter 1.5 + ETI 0.25). Verified directly. **The paper does NOT compute
  a UK-specific £/pp figure.** A UK-specific cross-walk applying ETI 0.25 to
  HMRC additional-rate base would give roughly £0.5-1.0bn per pp on a
  mechanical basis. HMRC June 2025 ratio (per Oxford commentary) implies
  basic-rate yield ~47× additional-rate yield — so additional rate ≈ £8bn/47
  ≈ **£0.17bn per pp**.
- **What sim uses**: £0.9bn per pp — roughly **5× the HMRC-implied figure**.
- **Final classification**: **judgement**
- **Decided by**: user, batch 1, 2026-05-14
- **Reasoning**: Same as above. Diamond-Saez 73% revenue-maximising rate and
  ETI 0.25 are sourced (and remain referenced in the citation note), but the
  £0.9bn value is a designer override of what HMRC currently implies.
- **Action**: Number kept as-is per refactor brief. Flagged for rebalancing.

---

### Group B — Methodological divergence (source structure ≠ sim usage)

#### `wealth_tax_commission` — Annual 2% wealth tax revenue

- **Parameter**: `wealthTax` reform `revBonus`
- **Value used**: £24bn pa
- **Source candidate**: Wealth Tax Commission (2020), *A Wealth Tax for the
  UK*. Advani, Chamberlain & Summers. https://www.wealthandpolicy.com/
- **What source says**: The Commission explicitly recommended a **ONE-OFF
  5% levy** on wealth >£500k (~£260bn revenue). Annual rates are noted but
  not the Commission's headline recommendation. Annual variants in subsequent
  commentary range from ~£12bn pa to ~£24bn pa (2% above £10m), with the
  £24bn figure at the top of that contested range.
- **What sim uses**: £24bn pa from a 2%-above-£10m annual tax.
- **Final classification**: **judgement**
- **Decided by**: user, batch 2, 2026-05-14
- **Reasoning**: The simulation's annual-tax framing is structurally different
  from what the source proposes. The £24bn figure also sits at the top of a
  contested derived range, not in the Commission's body of work. Calling
  this "extrapolated" overcredits the Commission as an authority for an
  annual rate they didn't recommend.
- **Action**: Migration response (<0.1) framing remains consistent with
  Young et al. (2016) and is cited separately under
  `young_millionaire_migration` (sourced).

#### `dilnot_social_care` — Social care reform ongoing cost

- **Parameter**: `socialCareReform` reform `ongoingCost`
- **Value used**: £5bn pa
- **Source candidate**: Department of Health & Social Care (2021),
  *Build Back Better* / OBR / HoC Library briefings.
- **What source says**: The frequently-cited "£3.6bn" figure was the
  3-year package total (2022/23–2024/25), **not £3.6bn per annum**.
  Projected annual costs: £1.42bn (2023/24) rising to £4.74bn (2031/32) in
  2021/22 prices. Reform itself was abandoned July 2024.
- **What sim uses**: £5bn pa ongoing — at the upper end of out-year
  projections.
- **Final classification**: **extrapolated**
- **Decided by**: user, batch 2, 2026-05-14
- **Reasoning**: The sim figure does sit within a defensible derived range
  for a more generous Dilnot variant in inflation-adjusted out-years. The
  source supports a Dilnot-style framing even though the original costing was
  a 3-year-package number. "Extrapolated" with the corrected note (the
  refactor explicitly fixed the previous "£3.6bn pa" misreading) is fair.

---

### Group C — Edge-of-range cases

#### `centax_nondom` — Non-dom abolition revenue

- **Parameter**: `nondomEnd` reform `revBonus`
- **Value used**: £4bn pa
- **Source candidate**: Advani, Burgherr & Summers (2025), *The UK Non-Dom
  Regime: Implications of Reform*, CenTax / LSE / Warwick.
- **What source says**: Verified: 2017 reform → -4.9% departures (stock
  elasticity 0.26); receipts +>150%. CenTax/LSE non-dom abolition headline
  revenue estimate is **£3.2bn pa** (CAGE variant £3.6bn).
- **What sim uses**: £4bn pa — **11% above the CAGE variant**.
- **Final classification**: **extrapolated** (kept as-is)
- **Decided by**: user, batch 3, 2026-05-14
- **Reasoning**: £4bn is within or just above the source's published range
  and represents a small designer uplift, not a fundamentally different
  framing. The 4.9% / +150% figures used in the simulation's completion log
  are sourced exactly from the paper.

#### `ifs_cgt_alignment` — CGT alignment revenue

- **Parameter**: `cgtAlign` reform `revBonus`
- **Value used**: £13bn pa
- **Source candidate**: Adam, Advani, Miller & Summers (2024), *Capital
  Gains Tax Reform*, IFS / CenTax.
- **What source says**: Source range is **£9.6-14bn** for the **FULL
  reform package** (rate alignment + uplift-at-death + base reform).
  £13bn falls in this range — but the simulation labels the reform as
  "rate alignment" alone, which is one component of the package.
- **What sim uses**: £13bn pa for "rate alignment" specifically.
- **Final classification**: **extrapolated** (kept as-is)
- **Decided by**: user, batch 3, 2026-05-14
- **Reasoning**: Value sits in the source's published range. The framing
  caveat (package vs alignment-only) is documented in the citation note,
  so users drilling in see the issue.

#### `hmrc_baseline_income_tax` — UK income tax base

- **Parameter**: `revenue.incomeTax.base`
- **Value used**: £280bn pa
- **Source candidate**: HMRC tax receipts bulletin / OBR EFO.
- **What source says**: 2024-25 outturn is **£302.7bn (OBR)** / £306bn (HMRC).
- **What sim uses**: £280bn — ~8% below current outturn (older snapshot).
- **Final classification**: **judgement**
- **Decided by**: user, batch 3, 2026-05-14
- **Reasoning**: The value is no longer source-supported — it's stale data.
  Per the brief's no-balance-change rule, the value is kept; but calling it
  "extrapolated" overcredits the source. "Judgement" with a "stale, flagged
  for refresh" note is honest.
- **Action**: Flagged for follow-up rebalancing PR (revenue baseline refresh).

---

### Notes on entries NOT requiring user adjudication

The following figures were verified by the research agents and clearly
matched their sources within reasonable tolerance, so they were classified
unambiguously:

- **Hope & Limberg (2022)** → `sourced`. 50 years OECD data, no growth
  effect from top-rate cuts — confirmed directly from search snippets and
  the paper's abstract.
- **Diamond, McQuade & Qian (2019)** rent control → `sourced`. SF study:
  20% mobility reduction; 15% supply contraction; 5.1% citywide rent rise.
  All matched.
- **Marmot 2024** ~148k excess deaths → `sourced` (timeframe slightly
  re-described as 2011-pandemic instead of 2010-2019).
- **CEBR Full Fibre** £59bn GVA → `sourced`. CEBR for Openreach study
  matches exactly.
- **Young et al. (2016)** millionaire migration → `sourced`. 45m records,
  η ≈ 0.1.
- **HMRC tax gap £39.8bn (2022-23)** and **£18:£1 compliance ROI** →
  `sourced` (figures as-published; both have since been revised by HMRC).

The following were classified as `judgement` from the start because the
underlying parameter is intrinsically a designer call, not a published
estimate:

- All bloc-response coefficients (`bloc_response_*`)
- All risk-register base rates (`*_base`) and modifier coefficients
- Surplus-allocation divisors
- Honeymoon-reset weight, bloc-drift coefficient
- Coalition floor (22%), bond-yield ceiling (8%), reelection threshold (38%)
- Forecast-noise base ±25% / ±10%
- Policy thresholds (corp 22%/28%, NHS-boost £210bn, infra-surge £45bn etc.)
- All event-resolution payouts
- Designer-derived non-numeric framings (e.g. cgt_gini_judgement)

---

### Pending follow-up (suggested for a separate PR)

1. **Revenue rebalancing**: update `hmrc_higher_rate` to ~£2bn,
   `diamond_saez_top_rate` to ~£0.17bn, `hmrc_baseline_income_tax` to
   ~£302bn. Each individually is a balance change; doing them together as
   a "revenue refresh" PR keeps the model self-consistent.
2. **Wealth tax reframing**: decide whether to model the Wealth Tax
   Commission's actual one-off proposal (~£260bn revenue, single payment)
   or keep the annual framing with a clearer "designer-set rate" label.
3. **Direct PDF/ODS verification**: when WebFetch / network access
   permits, retrieve the actual HMRC Ready Reckoner ODS spreadsheet to
   confirm year-1 vs steady-state figures and resolve all `extrapolated`
   tags currently held by HMRC entries.
