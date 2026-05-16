# Roadmap

Future-work ideas for Chancellor Sim that have been raised — in code
comments, PR descriptions, or known-issue lists — but that nobody is
actively working on. This is a backlog, not a commitment, and the order
within each theme is incidental except where called out.

`PATCH_NOTES.md` remains the source of truth for in-flight work on `dev`
and for shipped features. This file is strictly for ideas that haven't
started yet.

To add an idea: append one bullet under the right theme with a one-line
summary and a `Source:` line pointing at the file and line where the
idea was raised (or the PR / issue number). To land an idea: delete its
bullet here in the same PR that ships it, and move its summary into the
appropriate `## [Unreleased]` section of `PATCH_NOTES.md`.

---

## Recommended next pick

**Revenue/spend baseline rebalancing — debt-to-GDP convergence.**

The do-nothing fiscal path drives debt-to-GDP strongly negative across
all OBR/HMRC benchmark scenarios; the `finalDebtToGDP` benchmark
assertion in the playtest harness is currently skipped pending this
recalibration. Fixing it is a prerequisite for tighter dominant-strategy
testing and unlocks downstream calibration work. Verification path is
the existing OBR/HMRC scenario strategies under `tests/playtest/`
against the do-nothing baseline.

Source: `PATCH_NOTES.md:35` (Unreleased / Known Issues).

---

## Backlog

### Architecture

- **Reforms vs policies split.** Some passed reforms are really
  *policies* and belong in a policy menu where they can be amended or
  repealed (wealth tax becomes a tax-menu line item; rent controls
  become a repealable policy). Others — setting the BoE inflation
  target — are once-a-generation and stay one-shot. Tax rates
  eventually become editable tables with custom bands. The
  `growthBonusPermanent` flag in `reforms.js` is the seed of this
  distinction.
  Source: `src/model/reforms.js:52-58`, `README.md` Architecture section.

- **Future electoral scenarios.** Swap election data + governingParty +
  pmIdeology to run other historicals or hypotheticals (Conservative,
  LibDem-led coalition, etc.). The parliament data structure is
  already prepared for this.
  Source: `src/model/parliament.js:87`.

### New reforms (player-facing content)

- **Scottish Independence reform.** State branch, controversial. −GDP /
  +debt / +bondYield shock; floors `spendDevolved` lower. The
  `independenceMovement` event already in v0.2.0+ is the groundwork.
  Source: PR #21 body, `src/model/citations.js:842`.

- **Equal Regional Investment reform.** State branch, +growth, reduces
  the devolved-need anchor.
  Source: PR #21 body.

- **Dedicated R&D reform.** Convert the current transient growth hook
  on the Science slider into a permanent supply-side lever via
  `permanentGrowthShift`. Today's Science slider only nudges
  current-quarter growth; the coefficient is deliberately at the lower
  bound of social-return estimates pending this reform.
  Source: `src/model/citations.js:854`, `src/model/params.js:752-756`.

### Parliament realism

- **TheyWorkForYou per-MP voting heterodoxy.** Within-party spread
  today comes from constituency demographics and the Brexit signal
  only. Folding in TWFY voting records would refine the political-
  capital mechanic without changing its shape.
  Source: `PATCH_NOTES.md:88`, PR #9 caveats.

- **Northern Ireland's 18 seats.** Currently excluded — source data is
  Great Britain only, and no NI party takes the Labour or Conservative
  whip so omission doesn't distort PC. It's a visible 632-vs-650 data
  gap.
  Source: `PATCH_NOTES.md:87`.

### Calibration & balance

- **Revenue/spend baseline rebalancing.** See "Recommended next pick"
  above.
  Source: `PATCH_NOTES.md:35`.

- **First-term cheese-strategy survival.** Cheese still survives the
  first term in most games — the inflation buildup takes 8–12 quarters
  and the term-1 honeymoon protects against early collapse. Subsequent
  terms reliably collapse, so this is a first-term-only issue.
  Source: `PATCH_NOTES.md:86`.

- **Wealth tax reframing.** Decide whether to model the Wealth Tax
  Commission's actual one-off proposal (~£260bn revenue, single
  payment) or keep the annual framing with a clearer "designer-set
  rate" label.
  Source: `CLASSIFICATION_LOG.md:232-234`.

### Data quality

- **HMRC Ready Reckoner direct verification.** When network access
  permits, retrieve the actual HMRC Ready Reckoner ODS spreadsheet to
  confirm year-1 vs steady-state figures and upgrade `extrapolated`
  HMRC entries to `sourced`.
  Source: `CLASSIFICATION_LOG.md:235-238`.

- **Frozen tax-thresholds mechanic.** The `hmrcFrozenThresholds`
  scenario in the playtest harness was deliberately kept distinct so a
  dedicated frozen-thresholds mechanic could be wired in later without
  re-cutting the scenario.
  Source: PR #18 body.
