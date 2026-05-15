# Patch Notes

Game-dev style changelog for Chancellor Sim. Each release lists what's new,
what got rebalanced, what was fixed, and any known issues. The `[Unreleased]`
section accumulates on the `dev` branch between releases.

---

## [Unreleased]

### New
- **Parliament** — all 632 GB Westminster constituencies, real Census + 2024 election data. Each MP has demographics, a 2-axis ideology vector, and a mood that drifts with their constituents.
- **Political Capital** — a 0–100 currency you spend to propose reforms. Regenerates each quarter; rises with happy MPs and a friendly PM, falls with backbench rebellion.
- **PM relationship** — separate 0–100 score, tracks how much the Prime Minister backs you. Modulates capital regeneration; can gate ideologically distant reforms entirely.
- **Parliament tab** — Westminster hemicycle showing all 632 seats, happiest/unhappiest government MPs, PC log, searchable seat list.
- **Reform cards** show political-capital cost up front, with hover breakdown explaining base × rebellion × cohesion factors.
- About tab: new "Parliament methodology" section with citation links to CHES 2024, ONS Census 2021, Hanretty 2016 Brexit notionals, and the Ralph Scott constituency bundle.

### Balance
- Coalition cohesion `passReq` is now a **soft** gate, not a wall: under-threshold reforms cost 1.5× political capital (backbench arm-twisting) but still pass.
- Reforms with insufficient capital are **deferred** to next quarter (retained in the queue), not discarded. Capacity overflow still discards as before.
- Cancelling a reform docks 10 PC and -5 PM relationship in addition to the existing bloc penalty.

### Fixes
### Known Issues
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
