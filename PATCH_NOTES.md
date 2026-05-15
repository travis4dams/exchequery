# Patch Notes

Game-dev style changelog for Chancellor Sim. Each release lists what's new,
what got rebalanced, what was fixed, and any known issues. The `[Unreleased]`
section accumulates on the `dev` branch between releases.

---

## [Unreleased]

### New
- **Overview tab charts.** A nominal-GDP trajectory chart now anchors the Overview tab, with start-of-term and current-quarter readings. Each headline metric (Debt/GDP, Deficit/GDP, Bank Rate, Unemployment, Health, Population, Housing, Energy) gets its own inline sparkline so you can see whether the line is bending the right way at a glance. History windows extend across a full five-year term.
- **The Chancellor's Red Box.** Multiple events can now fire in a single quarter and surface as a queue of briefing papers. Each briefing is its own modal with full multi-choice agency — no event auto-resolves. A "Brief X of Y" counter shows how many remain in the box.
- **15 new events** spanning public health, supply chains, technology, markets and politics:
  - Public health: Pandemic, Teacher & Civil-Service Strike, Reservoir Crisis.
  - Supply / tech: Global Supply-Chain Shock, Cyber Attack on Critical Infrastructure, Severe Cold Snap, AI Displacement Shock, UK Scientific Breakthrough.
  - Markets: Sterling Under Pressure, Commercial Property Crash, Pension Fund Crisis, Fintech IPO Boom, Inflation Surprise (Downside).
  - Political: Cabinet Scandal, Devolution Funding Row.
- **Pandemic-severity damper.** Completing Preventative Health and Social Care Systemic Reform compounds a multiplier on pandemic effect magnitudes — health, growth, debt and unemployment hits all shrink. Mirrors the existing energy-shock and equity-shock dampers.
- Playtest harness now runs four OBR/HMRC scenario strategies (EFO central, EFO downside, FRS long-run, HMRC frozen thresholds) and asserts mean outcomes land within ±25% of the published forecast figures. Catches drift in judgement-tier model parameters when balance is tuned.
- Two new structural reforms: **Tax Code Rewrite** (revenue branch, follows HMRC Modernisation) unlocks extreme tax-rate ranges; **Spending Review Override** (state branch, follows Rebuild Civil Service) unlocks extreme departmental budget ranges. Both are heavyweight (6 quarters, capacity load 6, 20 PC, 40 coalition).
- **Five new spending sliders** carved out of the previous "Other" residual: Justice & Home Affairs (£55bn), Foreign Aid / FCDO (£15bn), Environment / DEFRA (£8bn), Science & R&D (£18bn), and Devolved Transfers to Scotland/Wales/NI (£71bn). Each ships with bloc reactions calibrated to who actually cares, plus growth/inflation hooks (R&D nudges growth, DEFRA cuts nudge inflation, Justice/Devolved cuts drag growth, FCDO opens an export channel).
- Three new events triggered by the new sliders: **Civil Unrest** (gutted Justice/Home Office), **Diplomatic Isolation** (gutted FCDO), **Independence Movement** (squeezed devolved transfers). Each with three choices and full citation coverage.

### Balance
- Budget Levers sliders now have much more headroom from the jump — e.g. VAT goes 10-30% (was 15-25%), Defence £20-125bn (was £35-95bn). Existing strike/Laffer/Section 114 thresholds are unchanged, so pushing past them still hurts.
- The two new reforms above push the ranges further still: VAT all the way down to 0%, NHS up to £400bn, etc. Baselines (and their citations) are unchanged.
- "Other" residual line drops from £302bn to £190bn after the five carve-outs above. Total government spending baseline is unchanged.
- Event probabilities are now reform- and state-driven across all new events. Pandemics rise when NHS spend is below anchor; teacher strikes rise when education spend lags; cold snaps and droughts have seasonal kicks; sterling slides activate only when bond-yield + risk-premium stress crosses a threshold; AI displacement grows over time. Reform mitigations are wired through `REFORM_RISK_MODS`.
- Per-quarter event cap of 3 to keep the Red Box manageable.
- Playtest seed library shifts: the new shuffle consumes more Math.random() draws than the legacy single-pick. Existing seed-based tests still pass but headline numbers (event counts) will diverge from prior runs.

### Fixes
### Known Issues
- The do-nothing fiscal path drives debt-to-GDP strongly negative across all OBR/HMRC benchmark scenarios (model produces persistent surpluses where OBR projects continued deficit). The `finalDebtToGDP` benchmark assertions are skipped pending revenue/spend baseline recalibration; other metrics (inflation, bond yield, unemployment, Bank Rate) converge inside the ±25% tolerance.

---

## [v0.2.0] — 2026-05-15

### New
- **Equity market.** Aggregate equity index responds to growth, corp-tax stance, real rates, and business sentiment. A small wealth-effect feeds back into growth, capped at ±0.1pp/qtr.
- **Risk premium on gilts.** Long yield now adds a sovereign risk premium that widens with debt-to-GDP above 100% and with coalition cohesion volatility. Markets tab gauges it.
- Markets tab gains an Equity panel and the Bond panel now breaks out short rate, gilt yield, and risk premium separately.
- New state-branch reforms: "Pension Consolidation (Mansion House)" damps equity-shock blowback; "City Regulation Tightening" lowers the cohesion-volatility coefficient on the risk premium (controversial).
- Three new events: Equity Market Crash (fires when equity > 130); Gilt-Market Strike (fires when risk premium > 2.5pp); Sovereign Rating Downgrade (fires when debt > 110% AND risk premium > 1.5pp).
- **Housing market.** House Price Index now evolves quarter-by-quarter, driven by nominal-income growth, real rates, and supply. It feeds CPI via the CPIH housing weight.
- **Energy market.** Energy Price Index with shock decay and baseline drift. Shocks now persist over 6–8 quarters before unwinding; reforms damp incoming shocks.
- Markets tab gains Housing and Energy panels with sparklines and live CPI contributions.
- New supply-side reform path: "Housing Supply Target (300k pa)" follows on from Planning Reform and pulls HPI down via 60k pa of extra supply.
- New green reform: "Domestic Energy Mix Reform" — follow-on to GB Energy + Grid, halves gas-import exposure.
- New controversial labour reform: "Labour Market Flexibility Package" — flattens the Phillips slope at heavy bloc cost.
- Two new events: a house-price correction warning when HPI runs hot, and a planning revolt after housing-supply reform lands.
- The legacy energy shock event now actually moves the energy index (used to only move CPI directly). Choice menu adds a fourth option: nationalising wholesale gas trading.
- New "Markets" tab. The Bank of England now sets interest rates independently of you, by Taylor-rule reaction to inflation (and, optionally, unemployment).
- Inflation and unemployment finally evolve quarter-by-quarter — Phillips curve for inflation, Okun's law for unemployment, real-rate drag on growth.
- Header strip shows Bank Rate and CPI alongside GDP, Growth, Gilts and Gini.
- Two new state-branch reforms: "Amend BoE to Dual Mandate" (MPC weighs employment alongside inflation) and "Raise Inflation Target to 3%" (more room for the MPC, but markets re-price long rates immediately).
- Three new monetary events: rate-hike shock, wage-price spiral, MPC out-of-step.
- Quarter Summary now shows inflation, unemployment, and Bank Rate moves.
- **Parliament** — all 632 GB Westminster constituencies, real Census + 2024 election data. Each MP has demographics, a 2-axis ideology vector, and a mood that drifts with their constituents.
- **Political Capital** — a 0–100 currency you spend to propose reforms. Regenerates each quarter; rises with happy MPs and a friendly PM, falls with backbench rebellion.
- **PM relationship** — separate 0–100 score, tracks how much the Prime Minister backs you. Modulates capital regeneration; can gate ideologically distant reforms entirely.
- **Parliament tab** — Westminster hemicycle showing all 632 seats, happiest/unhappiest government MPs, PC log, searchable seat list.
- **Reform cards** show political-capital cost up front, with hover breakdown explaining base × rebellion × cohesion factors.
- About tab: new "Parliament methodology" section with citation links to CHES 2024, ONS Census 2021, Hanretty 2016 Brexit notionals, and the Ralph Scott constituency bundle.

### Balance
- **Growth realism.** Growth no longer ratchets upward indefinitely — each quarter it mean-reverts to potential (~1.5%) at ~15% of the gap, with a small Gaussian shock (±0.2pp). Transient reform bonuses (childcare, apprenticeships, FE funding, etc.) fade over about a year; supply-side reforms flagged `growthBonusPermanent` (NPR Rail, Social Housing, Green Investment, Planning Reform, Full Fibre, Housing Supply Target) raise the long-run anchor permanently. Immigration Cap and Rent Controls permanently lower it.
- **Laffer drag.** Top income rate above 50% and corporation tax above 28% now directly slow growth (0.04 and 0.06pp per pp respectively). The cheese strategy no longer escapes a growth penalty.
- **Recession event.** New `recession` event fires probabilistically when growth runs above potential AND inflation above target — base 1%/qtr plus an overheating coefficient. Three choices: stimulus, austerity to defend gilts, or ride it out.
- Gilts now carry a sovereign risk premium that punishes volatile coalitions. Strategies that churn the coalition (including Labour Flexibility on a cheese baseline) frequently lose markets in the medium term.
- Equity index consumes seeded RNG before the event roll. Existing playtest seeds remain stable.
- House prices feed CPI directly (housing weight ~0.16), so building (or failing to build) now bites at the inflation channel as well as the bloc channel.
- Energy shocks stay around longer — wholesale gas spikes ripple through gilts and CPI for two years, not one quarter. GB Energy and Insulation reforms compound to keep the baseline lower.
- New "planning revolt" risk only activates after Housing Supply Target completes — supply-side reform now has a coalition cost, not a free pass.
- Bond yields are now anchored to Bank Rate plus a term premium plus a deficit kicker, replacing the old pure deficit-band drift. Slamming taxes no longer self-finances — sudden VAT cuts stoke inflation, the MPC hikes, gilts re-price and debt service follows.
- New cost-of-living bloc damage: when CPI runs above target, pensioners, working-class, ethnic-minority and northern blocs penalise the government. Above-NAIRU unemployment damages youth, working class, ethnic minority and northern blocs.
- The "dominantCheese" exploit no longer dominates: cheese now lags the do-nothing baseline on coalition cohesion at game end, and wins fewer terms on average.
- Coalition cohesion `passReq` is now a **soft** gate, not a wall: under-threshold reforms cost 1.5× political capital (backbench arm-twisting) but still pass.
- Reforms with insufficient capital are **deferred** to next quarter (retained in the queue), not discarded. Capacity overflow still discards as before.
- Cancelling a reform docks 10 PC and -5 PM relationship in addition to the existing bloc penalty.

### Fixes
### Known Issues
- Cheese strategy still survives the first term in most games (the inflation buildup takes 8–12 quarters and the term-1 honeymoon protects against early collapse). Subsequent terms reliably collapse.
- Northern Ireland's 18 seats are not modelled (source data is Great Britain only); none take the Labour or Conservative whip so it doesn't affect the political-capital mechanic.
- Per-MP voting-record heterodoxy (TheyWorkForYou) is not yet folded in — the within-party spread comes from constituency demographics and Brexit signal only. Planned for a follow-up.

---

## [v0.1.2] — 2026-05-15

### New
- Event payouts now each carry their own citation. Tapping a choice's details panel surfaces a per-event source note explaining the magnitudes, not a generic methodology stub.
- About tab intro and README "How to play" now pull live deficit, debt-to-GDP, coalition floor, bond ceiling, term length and forecast-noise band from PARAMS instead of hardcoded prose. `npm run sync-docs` regenerates the README block; CI fails if it drifts.

### Balance
- Replaced shared `event_payouts_judgement` citation with 18 per-event citations, each documenting the scale-of-event reasoning for that scenario.

### Fixes
- Inherited-deficit text updated to £133bn (OBR Nov-2025 EFO) — was lingering at the older £132bn round-down.

---

## [v0.1.1] — 2026-05-15

### New
- Game-dev branching workflow: `feature/*` → `dev` → `main`, with `hotfix/*` for emergencies.
- Release-readiness CI gate on `dev` → `main` PRs (requires version bump + matching patch notes section).
- 500-seed extended playtest job on release PRs to catch balance regressions across many games.
- `release.yml` GitHub Actions workflow: tag `v*` push creates a GitHub Release with parsed patch notes and a `dist.zip` asset.
- In-game version footer in the About tab, sourced from `package.json` via Vite's `define`.
- `CONTRIBUTING.md` and `CLAUDE.md` documenting the workflow for humans and future AI sessions.

### Balance
- Versioning reset to `0.x.x` to better reflect that this is pre-1.0 development.

---

## [v0.1.0] — 2026-05-15

### New
- Initial public release: 20-quarter Chancellor of the Exchequer simulation.
- Tax band, corporation tax, VAT, and departmental spending controls.
- Multi-quarter reform queue with coalition bang-per-buck ranking.
- Risk register with event-driven modifiers (energy shocks, gilt strikes, etc.).
- Citation-backed parameters (117+ entries) with live confidence breakdown in the About tab.

### Balance
- Reform revenue/cost estimates carry ±25% noise (±10% after passing OBR Independence).
- Coalition cohesion floor: 40%. Bond yield ceiling: 8%.

### Fixes
- Dominant-strategy "cheese" exploit identified and tracked by automated playtest harness (`tests/playtest/dominant-strategy.spec.js`).

### Known Issues
- Cheese strategy currently survives >90% of games; fix in flight on a future branch.
