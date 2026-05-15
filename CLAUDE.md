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

## Project structure

- `src/model/` — pure calculation layer. Citations, params, reforms, events,
  blocs, engine, gameStep. UI must not contain calculation logic.
- `src/components/` — React UI. `ChancellorSim.jsx` is the orchestrator;
  each tab is its own component.
- `tests/model/` — unit tests for the model.
- `tests/playtest/` — headless game runs that drive the same model functions
  the UI uses. Used to catch dominant-strategy regressions.

## Editing reforms / params

Every numeric parameter has a `citationId` pointing into `src/model/citations.js`.
When changing values, update or add the citation. Confidence levels:
`sourced`, `extrapolated`, `judgement`. The About tab shows the live
breakdown — never let it regress toward more `judgement`.

## Things to avoid

- Don't add calculation logic inside React components — put it in `src/model/`.
- Don't push to `main` directly.
- Don't open a `dev` → `main` PR without bumping version and updating patch
  notes — CI will block it, but it wastes review cycles.
- Don't add comments that just restate what the code does (the repo's style
  is sparse and intentional).
