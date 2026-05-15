# Patch Notes

Game-dev style changelog for Chancellor Sim. Each release lists what's new,
what got rebalanced, what was fixed, and any known issues. The `[Unreleased]`
section accumulates on the `dev` branch between releases.

---

## [Unreleased]

### New
### Balance
### Fixes
### Known Issues

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
