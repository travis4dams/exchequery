# Roadmap

A numbered backlog of future-work ideas for Chancellor Sim. Each item is a
self-contained ticket: an agent (or a human) can pick "item #7" and have
enough scope, file pointers, and acceptance criteria to start work without
re-reading the rest of this file.

`PATCH_NOTES.md` remains the source of truth for in-flight and shipped
work. This file is strictly for ideas that haven't started yet.

## Conventions

- Items are numbered. Numbering is stable until an item ships — when it
  ships, delete the bullet (don't renumber the rest). Append new items at
  the end of the relevant priority bucket.
- Each item has **Why**, **Touch points**, and **Acceptance** lines, plus
  a `Source:` pointer for provenance.
- Priority buckets: **P0** (next pick — unblocks downstream work), **P1**
  (clear value, ready to spec), **P2** (good ideas, more design needed).
- Bucket ≠ size. A P0 may be days of engineering; a P2 may be an hour.
  Buckets reflect *what should be picked next*, not *what is small*.

To land an idea: delete its bullet in the same PR that ships it, and move
its summary into the appropriate `## [Unreleased]` section of
`PATCH_NOTES.md`.

---

## P0 — Next picks (unblock downstream work)

### 1. Revenue/spend baseline rebalancing — close the debt-to-GDP skip

The do-nothing fiscal path drives debt-to-GDP strongly negative across
all four OBR/HMRC benchmark scenarios. `finalDebtToGDP` is in
`SKIP_METRICS` for every scenario, and the model produces persistent
surpluses where OBR projects continued deficit. Closing this gap is a
prerequisite for tighter dominant-strategy testing.

- **Why:** Without a credible do-nothing baseline, every balance test is
  measuring against a moving target; the cheese-strategy assertions can't
  tighten until the baseline is right.
- **Touch points:** `src/model/params.js` (revenue/spending baselines,
  `gdpScaleAnchor`, `wageBillAnchor`), `tests/playtest/obr-hmrc-scenarios.spec.js`
  (`SKIP_METRICS` set), `CLASSIFICATION_LOG.md` "Initial-state
  recalibration" section as the prior anchor.
- **Acceptance:** `finalDebtToGDP` removed from `SKIP_METRICS`; all four
  scenarios pass the ±25% tolerance band; Q1 readings unchanged within
  rounding; `npm test` green at 500 seeds.
- **Source:** `PATCH_NOTES.md:101`, `tests/playtest/obr-hmrc-scenarios.spec.js:65`.

### 2. Refresh OBR benchmarks against post-audit macro — close the NAIRU / Bank Rate skips

`obrCentralPath.finalBankRate` (sim ~4.11% vs OBR 3.25% target) and
`obrCentralPath.finalUnemployment` (sim ~5.17% vs OBR 4.1%) are both
skipped because the OBR benchmark targets predate the May 2026
realism-audit revisions (Mercatus 2025 r* lifting neutral rate; BoE
Nov-2025 MPR Box F lifting NAIRU). Either refresh the benchmark targets
against a post-audit-consistent OBR EFO, or document the divergence
permanently and remove the skip noise.

- **Why:** The PATCH_NOTES known-issue note explicitly says "The skip
  list MUST shrink to zero in the next PR — refresh `BENCHMARKS` against
  an OBR EFO that uses post-audit-consistent neutral-rate and NAIRU
  assumptions; do not let the skip list accumulate."
- **Touch points:** the `BENCHMARKS` registry referenced by
  `tests/playtest/obr-hmrc-scenarios.spec.js`, `SKIP_SCENARIO_METRICS`
  set, optionally a note in About → Browse by source.
- **Acceptance:** `SKIP_SCENARIO_METRICS` is empty (or contains only a
  single, well-documented permanent divergence with an explicit `Why`
  comment); all four scenarios green at 500 seeds.
- **Source:** `PATCH_NOTES.md:102`, `tests/playtest/obr-hmrc-scenarios.spec.js:73-94`.

---

## P1 — Player-facing content (ready to spec)

### 3. Scottish Independence reform

State branch, controversial. −GDP / +debt / +bondYield shock; floors
`spendDevolved` lower. The `independenceMovement` event already in
v0.2.0+ is the groundwork; the citation note on `event_independence`
explicitly flags this reform as the planned follow-up.

- **Why:** Closes the loop on a live event that currently has no
  policy-side counter-move; gives the player a one-shot constitutional
  lever to argue over.
- **Touch points:** `src/model/reforms.js` (new state-branch entry with
  `controversial: true`), `src/model/citations.js` (per-leaf citations
  for the GDP/debt/bondYield/spendDevolved effects), `src/model/events.js`
  (consider gating the `independenceMovement` event probability once the
  reform passes).
- **Acceptance:** Reform appears in state branch; passes the
  citation-drift test; `npm test` green; About-tab confidence breakdown
  unchanged or improved.
- **Source:** PR #21 body, `src/model/citations.js:852` note ("Lays the
  groundwork for a Scottish Independence reform planned in a follow-up
  branch").

### 4. Dedicated R&D reform

Convert the current per-quarter R&D growth nudge into a permanent
supply-side lever via `permanentGrowthShift`. The productivity drivers
PR (post-audit) already wires R&D spend into `updateProductivityIndex`,
so this reform now lifts both the headline-growth anchor and the
productivity index — making it considerably more attractive than when
this was first scoped.

- **Why:** Today's Science slider only nudges current-quarter growth
  via `spendingHooks.rndPerBnAboveBaseline`; the citation note on
  `dept_spending_growth_inflation_hooks` flags the coefficient as the
  lower bound of social-return estimates pending this reform.
- **Touch points:** `src/model/reforms.js` (new revenue-or-supply-side
  reform with `growthBonusPermanent: true`), `src/model/citations.js`
  (per-leaf citations; reuse `oecd_uk_productivity` and `bloom_van_reenen_management`
  if they're a fit), reform-completion bump in `updateProductivityIndex`.
- **Acceptance:** Reform proposable; `permanentGrowthShift` rises on
  completion; productivity index trajectory bends up vs control runs;
  playtests still pass.
- **Source:** `src/model/citations.js:864`, `src/model/params.js:1057`.

### 5. Equal Regional Investment reform

State branch, +growth, reduces the devolved-need anchor (so the
"Devolution Funding Row" event probability drops). Pairs naturally with
the new departmental-slider split (Devolved Transfers is now its own
line) and the productivity-drivers wiring.

- **Why:** Currently the player can throw money at devolved transfers
  but can't make a structural commitment; this reform turns the slider
  movement into a permanent floor.
- **Touch points:** `src/model/reforms.js`, `src/model/params.js`
  (devolved-need anchor that the reform shifts), event-probability hook
  in `events.js` for `devolutionFundingRow`.
- **Acceptance:** Reform passes citation-drift test; devolved-funding-row
  event probability measurably lower in playtests post-completion.
- **Source:** PR #21 body.

### 6. Four-day week / hours-worked reform

`hours.initial = 32` is now a state variable (R11 from the audit) but
no reform moves it. Add a reform that multiplicatively shifts the
hours-worked margin without changing headcount, plus a paired
statutory-leave-expansion reform with a smaller drag in the same channel.

- **Why:** The hours margin was added explicitly to make these reforms
  modellable; the citation note on `ons_lfs_hours_baseline` flags both
  as the intended consumers.
- **Touch points:** `src/model/reforms.js` (two new entries), the
  `labourInput = employment × hours / hoursBaseline` plumbing in
  `engine.js`, citations for the hours-effect magnitudes (TUC 4DW pilot
  results 2023, ONS short-hours bulletin).
- **Acceptance:** Reform completion measurably shifts wage-bill receipts
  and CPI in playtests via the labour-input channel; no double-count
  with existing labour-supply reforms.
- **Source:** `src/model/citations.js:2791` (the hours-margin note
  explicitly names this reform); audit Finding 10 R11.

### 7. Threshold-uprate reform (turn off fiscal drag)

`PARAMS.frozenThresholds.enabled = 1` is the current UK reality a 2026
chancellor inherits (R13 from the audit). A reform that uprates
thresholds with inflation flips this to 0, nulling the fiscal-drag yield
in exchange for an immediate revenue hit. Pairs as a sibling to the
existing tax-rate levers.

- **Why:** Without a reform that turns the drag off, the player can't
  argue against it; it's a one-sided mechanic. Citation note on
  `frozen_thresholds_yield` flags this as the intended escape hatch.
- **Touch points:** `src/model/reforms.js` (revenue branch), reform
  effect that sets `frozenThresholds.enabled = 0` (or uses a more
  granular `frozenThresholds.upliftFactor`).
- **Acceptance:** Reform passes; income-tax wage-bill scaling no longer
  inflates with nominal wages post-completion; playtests still pass.
- **Source:** `src/model/citations.js:2758`, audit Finding 10 R13.

### 8. Brexit-handle reforms (re-join Single Market, etc.)

`PARAMS.brexit.productivityDragPp` (default 0) and
`PARAMS.brexit.phillipsSlopeMultiplier` (default 1.0) are exposed but
no reform moves them. Add one or two reforms that toggle the drag
(e.g. "Re-join Single Market" reduces both; a heavyweight, controversial,
high-PC reform with mutual-exclusion against any future "Leave more"
reform via `excludesComplete`).

- **Why:** Brexit handles were exposed in R12 precisely so a reform
  could toggle them; without that reform, the parameters are dead.
- **Touch points:** `src/model/reforms.js`, citations for the OBR 4%
  long-run drag and OMFIF Phillips-steepening that motivate the handles.
- **Acceptance:** Reform passes citation-drift test; playtest with the
  reform completed shows the expected productivity and wage-Phillips
  shifts; mutual-exclusion track wired via `excludesComplete`.
- **Source:** `PATCH_NOTES.md:22` ("Brexit handles exposed"), audit
  Finding 10 R12.

### 9. Wealth tax reframing

Decide between modelling the Wealth Tax Commission's actual one-off
proposal (~£260bn revenue, single payment) and keeping the annual
framing with a clearer "designer-set rate" label. Today's framing is an
annual flow at a designer-set rate — defensible but doesn't match the
WTC's headline proposal, which is what most players will have read about.

- **Why:** Either choice is fine; the *open question* is what's
  blocking citation-confidence improvement. Once decided, the
  `wealth_tax_commission` citation can move from `judgement` to
  `sourced`.
- **Touch points:** `src/model/reforms.js` (the wealth-tax reform
  effect — if reframing as one-off, change schema to a single-quarter
  revenue spike), `src/model/citations.js`
  (`wealth_tax_commission` note).
- **Acceptance:** Citation upgrades to `sourced`; About-tab confidence
  breakdown reflects the move; reform effect matches the chosen framing.
- **Source:** `CLASSIFICATION_LOG.md:232-234`.

---

## P1 — Calibration & realism gaps

### 10. First-term cheese-strategy survival

Cheese still survives the first term in most games — the inflation
buildup takes 8–12 quarters and the term-1 honeymoon protects against
early collapse. Subsequent terms reliably collapse, so this is
first-term-specific. Likely fix is in the honeymoon dynamics or the
inflation buildup pace, not in the cheese strategy itself.

- **Why:** The dominant-strategy assertions in
  `tests/playtest/dominant-strategy.spec.js` are weaker than they
  should be because cheese's first-term survival rate makes win-rate
  averages noisy.
- **Touch points:** `src/model/params.js` (`politicalCapital.initial`
  honeymoon value, `phillips.*` slope), `src/model/parliament.js`
  (honeymoon decay), `tests/playtest/dominant-strategy.spec.js`
  (tighten thresholds once fix lands).
- **Acceptance:** Cheese strategy's first-term win rate drops to
  comparable with other strategies; subsequent-term collapse
  unchanged; dominant-strategy thresholds tightened.
- **Source:** `PATCH_NOTES.md:159`.

### 11. Bifurcated migration fiscal contribution (skilled vs low-skill)

Aggregate migration→GDP elasticity is wired (OBR EFO March 2024) and
the immigrant-productivity ramp is applied (Bell-Johnson / Hall-Manning),
but the skill-mix split is collapsed into a single average. A future
visa-policy reform would adjust the skill mix, but it can't yet because
the model only tracks one composite migrant.

- **Why:** Per Dustmann-Frattini *Economic Journal* 2014, skilled and
  low-skill migrants have materially different fiscal contributions.
  Without this split, "skilled-only visa" and "low-skill-only visa"
  reforms can't be distinguished.
- **Touch points:** `src/model/engine.js` (`computeNetMigration` and
  the migration→GDP elasticity wiring in `gameStep.js`),
  `src/model/params.js` (new `migration.skilledShare` state variable
  with default = current effective average).
- **Acceptance:** State tracks a skilled share; the elasticity scales
  by composition; default behaviour bit-identical to today; a stub
  visa-mix reform can shift the share.
- **Source:** `PATCH_NOTES.md:104`.

### 12. Sovereign-bank doom-loop

Bank capital → lending → growth → yields → bank capital is not
modelled. Crisis events use static effect leaves rather than a
regime-dependent feedback. The LDI long-gilt demand share is
pre-staged in PARAMS for the eventual loop. This is the structurally
most ambitious item on the backlog.

- **Why:** The 2022 mini-budget LDI event is modelled but its banking-
  channel propagation isn't; sovereign-bank loops are the canonical
  failure mode in advanced-economy crises.
- **Touch points:** likely a new `src/model/banking.js` module,
  hooks into `engine.js` for the feedback wiring, citations to BIS
  Working Papers on sovereign-bank nexus.
- **Acceptance:** A bank-capital state variable that responds to bond
  yields and lends to growth; existing crises events optionally route
  through it; playtests still pass.
- **Source:** `PATCH_NOTES.md:103`.

### 13. QT-shrinking event (consume the staged `qtYieldEffectPerBn`)

`monetary.qtYieldEffectPerBn = 0.3` is in PARAMS but unused. Add an
event (or reform) that explicitly shrinks the BoE balance sheet,
mirroring the LDI doom-loop's "Emergency QE" choice in reverse.

- **Why:** Pre-staged in PARAMS exactly to be consumed by this; today
  it's documentation, not mechanic.
- **Touch points:** `src/model/events.js` (new event with three
  choices: aggressive QT, gradual QT, halt QT), `src/model/engine.js`
  (consume `qtYieldEffectPerBn` in the bond-yield update).
- **Acceptance:** Event fires; choices shift bond yields measurably
  per the staged coefficient; PATCH_NOTES Known Issues entry removed.
- **Source:** `PATCH_NOTES.md:107`, `src/model/params.js:207`.

### 14. Carbon-price → CPI pass-through

UK ETS carbon prices feed into CPI via energy and intermediate-goods
costs; today this is only modelled via the wider energy mechanics, not
as a separate ETS lever. CCC Seventh Carbon Budget (Feb 2025) is
already cited but only via the energy chain.

- **Why:** A future carbon-pricing reform (raise ETS floor, expand
  scope) has no first-order CPI channel today.
- **Touch points:** `src/model/params.js` (new `carbon.priceFloor`
  state + `carbon.cpiPassthrough` coefficient), `src/model/engine.js`
  (`updateInflation` gets a carbon-price term), `src/model/reforms.js`
  (a reform that moves the floor).
- **Acceptance:** Lifting the carbon price floor produces a visible
  CPI bump; reform passes citation-drift; PATCH_NOTES Known Issues
  entry removed.
- **Source:** `PATCH_NOTES.md:106`.

### 15. Forward-guidance shock channel

~40% of equivalent direct Bank Rate move at 2y per Joyce-Tong 2012 /
Bauer-Rudebusch. Today this is not modelled separately from Bank Rate
decisions, so the MPC's communication strategy is invisible.

- **Why:** Limits the realism of MPC events and rules out a future
  "MPC communication strategy" reform.
- **Touch points:** `src/model/engine.js` (a forward-guidance term
  that scales as a fraction of expected rate moves), citations to
  Joyce-Tong 2012 and Bauer-Rudebusch.
- **Acceptance:** Forward-guidance moves show up as a small,
  identifiable bond-yield response in playtests; PATCH_NOTES Known
  Issues entry removed.
- **Source:** `PATCH_NOTES.md:105`.

### 16. Separate wage-Phillips with `wage_price_passthrough`

Wages remain inside the unemployment-gap term of the price Phillips
curve. A clean separation (a wage Phillips that produces wage growth;
a price Phillips that takes wage growth and unemployment as inputs)
would let the wage-price spiral mechanic be tuned independently from
the headline inflation slope.

- **Why:** Today the wage block (`updateWageIndex`) and the price
  block (`updateInflation`) both reach for unemployment-gap terms;
  the structural separation would clean up the coupling.
- **Touch points:** `src/model/engine.js` (`updateInflation` reads
  wage growth instead of computing its own unemployment-gap effect
  for the wage channel), `src/model/params.js` (new
  `phillips.wagePassthrough` coefficient).
- **Acceptance:** Wage spiral mechanic still fires at the documented
  threshold; headline inflation trajectory bit-identical under default
  parameters; PATCH_NOTES Known Issues entry removed.
- **Source:** `PATCH_NOTES.md:108`, audit Finding 2.

---

## P2 — Architecture & longer arcs

### 17. Reforms vs policies split

Some passed reforms are really *policies* and belong in a policy menu
where they can be amended or repealed (wealth tax becomes a tax-menu
line item; rent controls become a repealable policy). Others — setting
the BoE inflation target — are once-a-generation and stay one-shot.
Tax rates eventually become editable tables with custom bands. The
`growthBonusPermanent` flag in `reforms.js` is the seed of this
distinction.

- **Why:** The current reform schema doesn't distinguish "lever the
  player set once" from "lever the player keeps tuning"; the player
  experience is shallower for it.
- **Touch points:** `src/model/reforms.js` (schema with a `kind:
  'reform' | 'policy'`), new `src/components/PoliciesTab.jsx` or
  Budget-tab integration for active policies, save-schema bump.
- **Acceptance:** At least one reform (wealth tax candidate; see
  item 9) becomes amendable through the new UI; save round-trip works;
  playtests pass.
- **Source:** `src/model/reforms.js:52-58`, README Architecture section.

### 18. TheyWorkForYou per-MP voting heterodoxy

Within-party spread today comes from constituency demographics and the
Brexit signal only. Folding in TWFY voting records would refine the
political-capital mechanic without changing its shape.

- **Why:** The PC mechanic currently overestimates within-party
  cohesion for rebellious individual MPs (e.g. ERG-style holdouts);
  TWFY scores would surface them.
- **Touch points:** new dataset under `data/`, `src/model/parliament.js`
  (`effectivePcCost` incorporates a per-MP heterodoxy weight).
- **Acceptance:** PC cost variance across reforms with comparable
  base costs measurably wider; happiest/unhappiest-MP lists shuffle
  in a way that matches known TWFY-flagged rebels.
- **Source:** `PATCH_NOTES.md:161`, PR #9 caveats.

### 19. Northern Ireland's 18 seats

Currently excluded — source data is Great Britain only, and no NI
party takes the Labour or Conservative whip so omission doesn't
distort PC. It's a visible 632-vs-650 data gap.

- **Why:** Cosmetic completeness more than realism; mentioned as a
  data gap in v0.2.0 Known Issues.
- **Touch points:** `data/` (new NI constituencies dataset),
  `src/model/parliament.js` (hemicycle goes 632 → 650).
- **Acceptance:** Hemicycle renders 650 seats; PC math unchanged
  for the existing 632; About-tab parliament-methodology section
  cites the NI source.
- **Source:** `PATCH_NOTES.md:160`.

### 20. Future electoral scenarios

Swap election data + governingParty + pmIdeology to run other
historicals or hypotheticals (Conservative, LibDem-led coalition,
etc.). The parliament data structure is already prepared for this.

- **Why:** Replayability and educational use cases.
- **Touch points:** `data/` (new election datasets), `src/model/parliament.js:87`
  (already flagged), `src/components/IntroModal.jsx` (scenario
  picker).
- **Acceptance:** At least one alternative scenario selectable from
  intro; full game playable on it; existing scenario unchanged.
- **Source:** `src/model/parliament.js:87`.

### 21. Skills mismatch / regional labour-market dispersion

Today the model has a single national unemployment rate. UK has
unusually high spatial dispersion of unemployment; a London-vs-rest-
of-country split would drive a lot of the political bloc reactions
more faithfully.

- **Why:** Audit Finding 10 structural gap; would route into the
  northern bloc / cohesion mechanic naturally.
- **Touch points:** `src/model/engine.js` (regional unemployment
  state), `src/model/blocs.js` (bloc reactions read regional
  unemployment).
- **Acceptance:** Regional unemployment state tracked; bloc reactions
  reference it; playtests pass.
- **Source:** Audit Finding 10 / structural gap #7.

### 22. Cohort effects in fertility and mortality

Births and deaths are flow variables responding to current state. A
more sophisticated approach would track cohorts (e.g. for the
demographic transition through retirement; for delayed cohort-
fertility responses to e.g. the social-media-ban reforms that were
retired in May 2026).

- **Why:** Audit Finding 1 / R4: would let the retired social-media-
  ban births channels be revived as long-run cohort effects rather
  than implausibly-fast current-quarter responses.
- **Touch points:** `src/model/engine.js` (cohort array as state),
  `src/model/citations.js` (revive `twenge_igen` as long-run cohort
  effect; cite Eberstadt AEI 2024).
- **Acceptance:** Cohort state tracks; pensioner-bloc math reads
  the retiring cohort; demographic transition visible over a 5-year
  game.
- **Source:** Audit Finding 10 structural gap #9.

### 23. Wage-bargaining regime as a state

Individual reform effects (livingWage, unionRights) exist but no
aggregate state-variable for collective-bargaining coverage. OECD
work (Visser 2019) shows coverage drives wage-premium magnitudes.

- **Why:** Would let union-rights reforms compound rather than each
  pushing wages independently; structural realism.
- **Touch points:** `src/model/engine.js` (new state variable),
  `src/model/reforms.js` (livingWage / unionRights effects move it).
- **Acceptance:** Coverage state tracked; wage Phillips reads it as
  a slope modifier; playtests pass.
- **Source:** Audit Finding 10 structural gap #10.

### 24. HMRC Ready Reckoner direct verification

When network access permits, retrieve the actual HMRC Ready Reckoner
ODS spreadsheet to confirm year-1 vs steady-state figures and upgrade
the remaining `extrapolated` HMRC entries to `sourced`.

- **Why:** Pure citation-confidence improvement; About-tab confidence
  breakdown gets better; no gameplay change.
- **Touch points:** `src/model/citations.js` (HMRC entries currently
  tagged `extrapolated`), `CLASSIFICATION_LOG.md` (audit-trail entry).
- **Acceptance:** All HMRC Ready Reckoner-cited entries are `sourced`;
  About-tab confidence breakdown reflects it.
- **Source:** `CLASSIFICATION_LOG.md:235-238`.
