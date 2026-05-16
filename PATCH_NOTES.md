# Patch Notes

Game-dev style changelog for Chancellor Sim. Each release lists what's new,
what got rebalanced, what was fixed, and any known issues. The `[Unreleased]`
section accumulates on the `dev` branch between releases.

---

## [Unreleased]

### New
- **Markets, Budget and Ledger redesigned to match.** Markets panels now use the full panel width for their trajectory line (no more thumbnail sparklines) and pair up two-across on desktop. Budget sliders gain a baseline tick mark and a brass-filled track so you can see at a glance where the default sits; Departmental Spending splits into Core and Other on a wider grid. Ledger's Revenue and Spending tables now sit side-by-side on desktop, with a coloured Surplus/Deficit card spanning underneath.
- **Desktop layout.** The app now spreads to a wider canvas on desktop instead of staying boxed at phone width. Overview's hero card and GDP chart sit side-by-side, the 8 headline metrics flow into a 4-across grid, and Reforms/Events pair off into two columns. Mobile playability is unchanged.
- **Refined Treasury chrome.** The header gains a Fraunces display treatment for the headline figures (Cohesion, GDP, Balance), a faint brass rule under them, and a brass-glow on the Next Quarter primary action. Active tab now sits on a brass underline that adapts to the wider desktop tab strip.
- **Per-field forecast bands.** Every reform / event effect can now declare its own forecast-error band on the `cited()` call (asymmetric allowed). Realised outcomes are drawn from a triangular distribution with mode at the cited central value, so the published number is the mode, not just the midpoint. The old global ±25%/±10% knob has been retired in favour of per-leaf bands plus a single OBR multiplier; leaves without an explicit band still fall back to ±25%.
- **CGT alignment is now asymmetric on the downside.** Yield band runs from −40% to +10% — reflecting that the dominant uncertainty (realisation elasticity) cuts mostly one way. HMRC Modernisation gets a tighter symmetric ±15% band.
- **Event magnitudes vary.** Each event effect carries the same per-leaf band (or a ±15% default fallback). The published headline severity is the mode; the realised hit/boost can drift either side. Bloc-reaction deltas remain crisp so the player can still reason about coalition impact.
- **OBR Independence is now a band-width multiplier (×0.4 = 60% narrower)** that applies to every authored band and the fallback alike — same gameplay effect as the old "±25% → ±10%" flip but works cleanly with asymmetric per-field bands.
- **UK macro-realism audit integrated.** Major recalibration of the macroeconomic core against a May 2026 audit. See Balance section for parameter changes and the new "Macroeconomics & monetary policy" section in About → Browse by source for the underlying papers.
- **LDI doom-loop event** triggered when long-gilt yields rise >150bp in a quarter AND DB-pension LDI share of long-end gilts exceeds 25%. Three choices model the 2022 mini-budget response menu (emergency BoE QE — off-balance-sheet, fiscal retrench, let-it-clear). Per BoE Staff WP 1019 (2023), "An anatomy of the 2022 gilt market crisis".
- **Mortgage pass-through lag.** House prices now react to a blended effective mortgage rate (half today's Bank Rate, half the rate from 8 quarters ago, +30bp wedge) per BoE MLAR Q3 2022 (86% fixed-rate share) and BoE MPR November 2025. Surprise rate hikes now grind into HPI over years rather than landing in one quarter.
- **State-dependent OBR fiscal multipliers.** Spending categories NHS, Education, Welfare, Local, Infrastructure and Defence each generate a quarterly growth impulse computed from level deviation from baseline × multiplier × (1 / 20-quarter taper). CDEL 1.0, RDEL 0.6, AME 0.6 per OBR Dynamic Scoring (Nov 2023); VAT 0.35 and income tax 0.3 per OBR June 2010 interim table. Each impulse is multiplied by 1.7× when output gap < −2pp per Auerbach & Gorodnichenko (AEJ:Pol 4(2), 2012). R&D, FCDO, DEFRA, Justice and Devolved continue via the pre-existing dept-slider growth/inflation hooks — a runtime allowlist assertion enforces the partition (no double-counting).
- **Energy price cap dynamics.** Ofgem-style quarterly cap with 2-quarter wholesale lookback and 85% pass-through of underlying shocks per the Ofgem default-tariff cap methodology. Gas import dependence (50% per DESNZ DUKES 2024) scales incoming shock magnitudes — reform-driven reductions now propagate through the wholesale-cap chain.
- **LDI passive-demand discount on gilt term premium.** The 28% LDI / DB-pension share of long-end gilts (Chicago Fed Letter 480, 2023) acts as a passive demand sink — the effective term premium is reduced by `passiveDemandWeight × longGiltDemandShare`, deducting ~14bp from the 30bp base. Lower steady-state gilt yields; sharper response when the demand floor wobbles.
- **Migration → GDP elasticity.** Net population change now feeds growth directly via the OBR EFO March 2024 elasticity (~1.5% GDP per 200k additional annual migrants in the medium term ≈ 0.0075pp/1k, spread over the fiscal-multiplier taper). Replaces the prior implicit channel (population entered spending baselines only — no growth response).
- **Documented reference values pre-staged for future reforms.** QE yield effect (0.5bp per £bn per Joyce-Tong-Woods 2011), QT yield effect (0.3bp per £bn per BoE QB 2022 Q1), and a `qeSize` parameter (£100bn representative BoE QE round) drive the LDI doom-loop "Emergency QE" choice magnitude.
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
- **Phillips curve is asymmetric.** Slope on the hot-labour-market side is 0.19; on the slack side, 0.06 — a 3.2× asymmetry. Per Bunn, Anayi, Barnes, Bloom, Mizen, Thwaites & Yotzov, "How Curvy is the Phillips Curve?" (BoE Staff Working Paper 1107, October 2025). Trend-inflation modifier of 1.5× applies once CPI exceeds 4%, mirroring the menu-cost mechanism in that paper. The `labourFlexibility` reform's `phillipsSlopeMultiplier` continues to scale both branches.
- **MPC is stickier.** Bank Rate inertia raised from 0.5 → 0.75 per Coibion & Gorodnichenko, "Why Are Target Interest Rate Changes So Persistent?" (AEJ: Macroeconomics 4(4), 2012). Quarterly Bank Rate moves now take longer to show up — and longer to reverse.
- **Bond markets punish deficits harder.** Deficit-yield kicker doubled from 0.003 → 0.006 pp per £bn of annual deficit (≈15bp per 1pp deficit/GDP at £2.8tn nominal GDP) per Federal Reserve IFDP 1011 (2010). The Liz Truss penalty curve is now twice as steep.
- **House prices are three times more rate-sensitive.** Real-rate elasticity raised from −2.0 → −6.0 pp HPI per pp real-rate gap per Miles & Monro, "UK House Prices and Three Decades of Decline in the Risk-Free Real Interest Rate" (BoE Staff WP 837, 2019). HPI now reads a blended mortgage rate (see Mortgage pass-through lag above), so the increased sensitivity meets the dominant-fix UK structure halfway.
- **Neutral rate revised up.** Nominal BoE neutral rate raised from 3.5% → 4.0% per Mercatus 2025 survey-based UK r* (NY Fed has discontinued HLW estimates for the UK as the model "does not provide a good fit for the data"). The Okun-rate-channel `neutralRealRate` was lifted to 2.0% to maintain consistency with the new nominal anchor.
- **NAIRU revised up.** Natural unemployment 4.0% → 4.25% per Carney's 2017 TSC letter and Resolution Foundation 2024. The Phillips curve slack measure uses (NAIRU − unemployment), so the equilibrium point is now ~0.25pp higher.
- **Recession base hazard raised.** 1%/q → 1.6%/q per Broadberry, Chadha, Lennard & Thomas, "Postwar UK Business Cycle Duration" (Economic History Review, 2023): postwar UK business cycle averages 16 years from peak to peak.
- **Financial-crisis tail raised.** 6%/yr → 8%/yr per Laeven & Valencia, "Systemic Banking Crises Database II" (IMF Economic Review 68(2), 2020). 151 systemic crises 1970–2017; UK sub-systemic stress every 5–7 years.
- **Pandemic tail revised down.** 6%/yr → 5%/yr per Madhav et al., "Pandemics: Risks, Impacts, and Mitigation" (Disease Control Priorities ed. 3, 2017). Long-run rate, not peak-Covid rate — 3 influenza pandemics in the 20th century imply ~5%/yr long-run hazard.
- **Confidence promotions.** Okun's coefficient (Ball, Leigh & Loungani, IMF WP 13/10, 2013), equity wealth effect (Dimson-Marsh-Staunton UBS Yearbook 2025), IMF energy shock persistence (IMF WEO Oct 2022), and the monetary deficit-yield coefficient (Fed IFDP 1011, 2010) promoted to **sourced** with refreshed citation notes.
- Budget Levers sliders now have much more headroom from the jump — e.g. VAT goes 10-30% (was 15-25%), Defence £20-125bn (was £35-95bn). Existing strike/Laffer/Section 114 thresholds are unchanged, so pushing past them still hurts.
- The two new reforms above push the ranges further still: VAT all the way down to 0%, NHS up to £400bn, etc. Baselines (and their citations) are unchanged.
- "Other" residual line drops from £302bn to £190bn after the five carve-outs above. Total government spending baseline is unchanged.
- Event probabilities are now reform- and state-driven across all new events. Pandemics rise when NHS spend is below anchor; teacher strikes rise when education spend lags; cold snaps and droughts have seasonal kicks; sterling slides activate only when bond-yield + risk-premium stress crosses a threshold; AI displacement grows over time. Reform mitigations are wired through `REFORM_RISK_MODS`.
- Per-quarter event cap of 3 to keep the Red Box manageable.
- Playtest seed library shifts: the new shuffle consumes more Math.random() draws than the legacy single-pick. Existing seed-based tests still pass but headline numbers (event counts) will diverge from prior runs.

### Fixes
### Known Issues
- The do-nothing fiscal path drives debt-to-GDP strongly negative across all OBR/HMRC benchmark scenarios (model produces persistent surpluses where OBR projects continued deficit). The `finalDebtToGDP` benchmark assertions are skipped pending revenue/spend baseline recalibration; other metrics (inflation, bond yield, unemployment, Bank Rate) converge inside the ±25% tolerance.
- **The `BENCHMARKS` registry was calibrated against the pre-audit parameter set.** After this PR `obrCentralPath.finalBankRate` is also skipped (sim now settles at ~4.2% vs the OBR Nov-2025 EFO glide-path target of 3.25%, which itself was written before the Mercatus 2025 r* revision). The skip list MUST shrink to zero in the next PR — refresh `BENCHMARKS` against an OBR EFO that uses Mercatus-consistent neutral-rate assumptions; do not let the skip list accumulate.
- **Sovereign-bank doom-loop** (bank capital → lending → growth → yields → bank capital) is not modelled. Crisis events use static effect leaves rather than a regime-dependent feedback. The LDI long-gilt demand share is pre-staged in PARAMS for the eventual loop.
- **Bifurcated migration fiscal contribution** (skilled vs low-skill split per Dustmann-Frattini EJ 2014) is not modelled. The aggregate migration→GDP elasticity is wired (OBR EFO March 2024); the skill-mix split is reserved for a future reform that adjusts visa policy.
- **Forward-guidance shock channel** (~40% of equivalent direct Bank Rate move at 2y per Joyce-Tong 2012 / Bauer-Rudebusch) is not modelled separately from Bank Rate decisions.
- **Carbon-price → CPI pass-through** (UK ETS) is not modelled. CCC Seventh Carbon Budget (Feb 2025) cited but only via the wider energy mechanics.
- **QT yield effect** (0.3bp per £bn per BoE QB 2022 Q1) is staged in PARAMS as `monetary.qtYieldEffectPerBn` but not yet consumed by any mechanic — awaits an explicit QT-shrinking event that mirrors the LDI doom-loop QE choice in reverse.
- **Wage–price feedback loop** (separate wage Phillips with `wage_price_passthrough`) is not modelled — wages remain inside the unemployment-gap term of the Phillips curve.

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
