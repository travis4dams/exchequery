# Raw source data

This directory contains the committed source CSVs that the build script
(`scripts/buildConstituencies.js`) reads to produce `src/data/*.json`.

Data is committed (not fetched at build time) so the bundle is reproducible
regardless of network state.

## Files

### `ralphascott-census-2024.csv`

Per-constituency Census 2021 + 2024 election results + 2016 Brexit Leave/Remain
notional for all 632 Great Britain Westminster constituencies (2024 boundaries).

- Maintainer: Ralph Scott, University of Manchester
- Repo: https://github.com/ralphascott/UKGE24_wpc_census_summaries
- Direct file: `2024-UK-General-Election-Census-Constituency-Summaries-File-v1.1.csv`
- File version: v1.1

#### What it bundles, with original sources

1. **Census 2021 summaries (England + Wales)** — derived from ONS Census 2021
   tables via the Nomis API and ONS custom dataset tool. **Open Government
   Licence v3.0** (OGL).
2. **Census 2022 summaries (Scotland)** — Scotland's Census website custom
   dataset tool. OGL.
3. **2024 General Election results** — House of Commons Library briefing
   CBP-10009. OGL.
4. **2016 EU referendum notionals (Hanretty Leave/Remain estimates remapped
   to 2024 boundaries)** — Chris Hanretty (University of London). Released
   under a permissive academic-use licence; cited in About tab.
5. **2014 Scottish independence referendum notionals** — Marta Miori
   (doi.org/10.48420/26340568).

#### Limitations

- **Northern Ireland is excluded** (18 seats). The Census 2021 and election
  result aggregations in this file cover Great Britain only. The game models
  the 632 GB seats; the 18 NI seats are noted in the About tab but not
  rendered in the parliament systems (none take the Labour or Conservative
  whip anyway, so they're irrelevant to the political-capital mechanic).

## Refreshing data

To pick up an updated version of this file:

```sh
curl -L "https://raw.githubusercontent.com/ralphascott/UKGE24_wpc_census_summaries/main/2024-UK-General-Election-Census-Constituency-Summaries-File-v1.1.csv" \
  -o data/raw/ralphascott-census-2024.csv
npm run build:data
```

If Ralph Scott publishes a v1.2+, bump the filename and version note in
`scripts/buildConstituencies.js`.

## Party ideology anchors (CHES 2024)

The build script hardcodes party-level (econ, social) anchors derived from
the **Chapel Hill Expert Survey 2024 (UK extract)**. These are cited in
`src/model/citations.js` under `ches_2024_party_ideology`. CHES is free,
academically licensed; redistribution of derived per-party numbers (a handful
of scalars) is permitted with citation.

Upstream: https://www.chesdata.eu/2024-chapel-hill-expert-survey-ches
