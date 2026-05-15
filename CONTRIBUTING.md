# Contributing to Chancellor Sim

This project uses a game-dev style branching workflow: fast iteration on a
shared `dev` branch, gated releases to `main` with patch notes.

## Branches

- **`main`** — public release. Auto-deploys to GitHub Pages. Tagged with
  `vX.Y.Z` for each release.
- **`dev`** — integration branch. All feature work merges here first. Preview
  by opening a Codespace on `dev` and running `npm install && npm run dev`.
- **`feature/*`** or **`claude/*`** — short-lived branches that PR into `dev`.
- **`hotfix/*`** — emergency fixes branched from `main`, PR'd direct to `main`,
  then back-merged to `dev`.

```
feature/foo ──► dev ──► main ──► tag vX.Y.Z ──► GitHub Release
                ▲                   │
                └─── hotfix/* ──────┘
```

## Day-to-day flow

1. Branch from `dev`: `git checkout -b feature/<slug> dev`.
2. Commit, push, open a PR targeting `dev`.
3. CI runs `test` + `build`. No approval required — merge when green.
4. To preview the latest `dev`: open a Codespace on the `dev` branch, run
   `npm install && npm run dev`, click the forwarded-port URL.

## Releasing (dev → main)

1. On a release-prep branch off `dev`:
   - Bump `version` in `package.json` (semver: patch / minor / major).
   - In `PATCH_NOTES.md`, move the contents of `## [Unreleased]` into a new
     `## [vX.Y.Z] — YYYY-MM-DD` section. Leave a fresh empty `[Unreleased]`
     above it.
2. Open a PR from `dev` → `main`. CI now runs the full release gate:
   - `test`, `build`
   - `playtest-extended` (500-seed balance check)
   - `release-readiness` (verifies version bump + patch notes section)
3. Get the required approval. Squash-merge.
4. Tag and push:
   ```bash
   git checkout main && git pull
   git tag vX.Y.Z
   git push --tags
   ```
5. The `release.yml` workflow creates the GitHub Release with parsed patch
   notes and a built `dist.zip` asset. `deploy.yml` publishes Pages.

## Hotfix flow

1. `git checkout -b hotfix/<slug> main`
2. Fix, push, PR direct to `main`. Same release gates apply — bump version
   (patch level) and add a patch notes entry.
3. After merge + tag, back-merge so the fix carries forward:
   ```bash
   git checkout dev
   git merge main
   git push
   ```

## Branch protection settings

Configure these in GitHub → Settings → Branches. Re-apply if they get reset.

**`main`:**
- Require a pull request before merging
- Require 1 approval
- Require status checks to pass: `test`, `build`, `playtest-extended`, `release-readiness`
- Require branches to be up to date before merging
- Restrict who can push (PRs only)

**`dev`:**
- Require a pull request before merging
- Require status checks to pass: `test`, `build`
- (No approval required — fast iteration)

## Patch notes style

Game-dev tone, grouped by intent rather than file. Keep each bullet short and
player-readable. Section order in each release:

- `### New` — features players can use
- `### Balance` — tuning, parameter changes, difficulty adjustments
- `### Fixes` — bug fixes
- `### Known Issues` — things you know are broken but aren't fixing this release
