# Project guidance for Claude Code sessions

Chancellor Sim is a React 18 + Vite 5 + Tailwind UK fiscal policy simulator
deployed to GitHub Pages. The project uses a game-dev branching workflow —
read this before starting work.

## Branching rules

- **`main` is the production release branch.** Do not push to it directly.
  Only `dev` (via reviewed PR) or `hotfix/*` branches reach `main`.
- **`dev` is the integration branch.** Default target for new features.
- **Feature branches** (`claude/*` or `feature/*`) PR into `dev`. CI on the
  PR runs `test` + `build` — no approval required, merge when green.
- **Hotfixes** (`hotfix/*`) branch from `main`, PR direct to `main`. Bump
  version and update patch notes like a normal release. Back-merge `main` →
  `dev` afterwards so the fix carries forward.

## Releasing (dev → main)

A PR from `dev` to `main` runs additional CI gates that will fail unless:

1. `package.json` `version` is bumped vs `main`.
2. `PATCH_NOTES.md` contains a `## [vX.Y.Z]` section matching the new version.

Do these together in the release PR. Move accumulated content from
`## [Unreleased]` into a new dated `## [vX.Y.Z] — YYYY-MM-DD` section. Leave
an empty `## [Unreleased]` above it.

After merge, the user tags `vX.Y.Z` and pushes; `release.yml` creates the
GitHub Release, `deploy.yml` publishes Pages.

## Patch notes style (game-dev tone)

Group bullets by intent under these headings, in this order:

- `### New` — features players can use
- `### Balance` — tuning, parameter changes, difficulty
- `### Fixes` — bug fixes
- `### Known Issues` — known-broken, not fixing this release

Player-readable, one line each. Not commit-log style.

## Test commands

- `npm test` — Vitest unit tests + playtests (100 seeds on `dev`, 500 on
  release PRs via `PLAYTEST_SEEDS` env var).
- `npm test:watch` — watch mode.
- `npm run build` — production build.
- `npm run dev` — Vite dev server (used for Codespace previews of `dev`).
- `npm run sync-docs` / `npm run check-docs` — regenerate / verify the
  PARAMS-bound README blocks (see "Dynamic documentation" below).

## Project structure

- `src/model/` — pure calculation layer. UI must not contain calculation
  logic. Modules:
  - `citations.js` + `sources.js` — citation entries and the source
    database they reference.
  - `params.js` — all numeric constants (every leaf `cited()`).
  - `reforms.js`, `events.js`, `blocs.js` — game content.
  - `engine.js` — pure state-in/state-out calculations
    (`calcReformCapacity`, revenue/spending, bloc dynamics, PC regen).
  - `parliament.js` — per-seat mood model, parliament aggregation,
    `effectivePcCost()` (PC cost scaled by opposition + cohesion).
  - `projection.js` — forward forecasting used by Markets/Overview.
  - `gameStep.js` — `stepQuarter()` orchestration; the single entry point
    the UI and headless playtests both call.
  - `index.js` — re-exports.
- `src/components/` — React UI. `ChancellorSim.jsx` is the orchestrator;
  each tab is its own component.
- `tests/model/` — unit tests for the model.
- `tests/playtest/` — headless game runs that drive `stepQuarter()`
  directly (no UI). Used to catch dominant-strategy regressions. See
  "Headless playtests" below.

## Editing reforms / params / events

Every numeric leaf in `params.js`, `reforms.js`, `events.js` (effects on
choices included), and the value-bearing `REFORM_RISK_MODS` entries must be
`cited(value, citationId)`. The validator in `params.js` (and the equivalent
helper in `events.js`) throws on load if a citationId doesn't resolve.
Confidence levels: `sourced`, `extrapolated`, `judgement`. The About tab
shows the live breakdown — never let it regress toward more `judgement`.

When you change a value in PARAMS or in a reform/event effect, also update
the corresponding citation entry in `citations.js`: its `value`, `unit`, and
`note` must agree with the live number. If the source has changed (new OBR
EFO, new HMRC RR), bump `year`/`url`/`quote` too. The citation note is the
authority on *why* the number is what it is; don't let it lie.

## Reform capacity & political capital

Every reform proposal passes through two gates in `gameStep.js` (see
`stepQuarter`, lines ~130–174). Both are first-class mechanics — when
authoring reforms or playtest strategies you must reason about both.

**Reform capacity** (`calcReformCapacity` in `engine.js`):

- Capacity scales with departmental spending:
  `max(1, round((totalDept − deptBudgetAnchor) / deptBudgetPerSlot))`
  where anchor = £605bn and per-slot = £30bn (`PARAMS.reformCapacity`).
  +`civilServiceBonus` (2) once Civil Service reform completes.
- Each reform has an optional `capacityLoad` (default 1; structural
  reforms use 2+). Load is summed across in-flight reforms and the
  current quarter's proposals.
- If `inFlightLoad + load > capacity` a proposal is **discarded**
  (logged "Deferred (no capacity)") — it is not re-queued. Strategies
  must propose in priority order; the engine takes them as it can fit
  them and drops the rest.

**Political capital** (`PARAMS.politicalCapital`, gates in
`gameStep.js:148-151`):

- Single 0–100 currency; starts at 60 (post-election honeymoon, 70 on
  re-election reset). Per-quarter regen = `baseRegen` (8) plus a
  parliament-mood term and a PM-relationship term; soft-capped at 80
  with 0.20 decay above. Cancelling a reform costs `cancelPenalty` (10).
- Per-reform cost is **not** a static field — it is `effectivePcCost()`
  in `parliament.js`, which scales the reform's base cost by opposition
  strength and coalition cohesion.
- If `pcCost > n.politicalCapital`, the proposal is **deferred** —
  pushed onto next quarter's `proposedReforms` and retried automatically
  when PC regenerates. This is the opposite of the capacity gate's
  discard-on-overflow behaviour; don't conflate them.
- Behaviour is locked in by `tests/model/politicalCapital.test.js`.

**Authoring guidance**: set `capacityLoad` deliberately on new reforms
(1 = normal, 2+ = heavyweight) and verify the effective PC cost is
reachable from 60 PC plus a few quarters of regen — otherwise the reform
is effectively unreachable for the dominant-strategy playtests and will
distort their assertions.

## Headless playtests

Strategies in `tests/playtest/strategies.js` drive `stepQuarter()` the
same way the UI does (via `runGame.js`). Six strategies cover the
dominant-strategy assertions in `tests/playtest/dominant-strategy.spec.js`
(`PLAYTEST_SEEDS` controls trial count — 100 default, 500 on release CI).

When adding a strategy, follow the existing patterns:

- Filter candidates with `availableNonControversialReforms(state, cohesion)`
  — it already strips reforms whose `effectivePcCost > current PC`, so
  your strategy only proposes things it can afford this turn.
- Rank with `rankByBangPerBuck` (coalition impact per `capacityLoad`)
  or sequence a priority list (see `supplySideBuilder`).
- **Do not** pre-trim by reform capacity in the strategy — submit the
  whole ranked list and let the engine's capacity gate pick the top-N
  that fit. Pre-trimming hides bugs the playtests are supposed to catch.

## Dynamic documentation — don't hardcode prose numbers

User-visible numbers (README "How to play", AboutTab intro, future onboarding
copy) must come from PARAMS, not hand-typed strings.

- README: the block between `<!-- params:how-to-play:start -->` and
  `<!-- params:how-to-play:end -->` is regenerated by `npm run sync-docs`
  (script at `scripts/sync-readme.mjs`). Don't edit between the markers —
  change the PARAMS values and re-run the script. Same for the
  `<!-- params:architecture:start -->` block.
- AboutTab and other JSX: read live values via the `unwrap(PARAMS.x)` helper
  already in `AboutTab.jsx`; never hardcode a number that exists in PARAMS.
- The drift detector at `tests/model/citation-drift.spec.js` enforces this
  for bound values. It also asserts every event effect leaf is `cited()`
  and every citation it references exists.
- Run `npm run sync-docs` after touching any PARAMS leaf that flows into
  prose. `npm run check-docs` (CI) fails if README is out of date.

## Adding a new event

Give it its own per-event citation in `citations.js` (don't reach for a
shared bucket — `event_payouts_judgement` has been retired). Wrap every
effect leaf (`debt`, `growth`, `inflation`, `healthIndex`, `bondYield`, every
`blocs.*`) via `cited()` pointing to that citation. The event modal walks
the effect tree and renders a `<CitationLink>` per leaf.

## Things to avoid

- Don't add calculation logic inside React components — put it in `src/model/`.
- Don't push to `main` directly.
- Don't open a `dev` → `main` PR without bumping version and updating patch
  notes — CI will block it, but it wastes review cycles.
- Don't add comments that just restate what the code does (the repo's style
  is sparse and intentional).
