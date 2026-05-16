import React, { useMemo, useState } from 'react';
import { ExternalLink } from 'lucide-react';
import { PARAMS, CITATIONS, confidenceSummary, SOURCES } from '../model/index.js';
import { CitationLink, ConfidenceBadge, CONFIDENCE_STYLES } from './primitives/CitationLink.jsx';
import { Card } from './primitives/Card.jsx';
import { Stack, Grid } from './primitives/Layout.jsx';
import { SegmentedControl } from './primitives/SegmentedControl.jsx';
import { MeterBar } from './primitives/MeterBar.jsx';

const unwrap = (leaf) => (leaf && typeof leaf === 'object' && 'value' in leaf) ? leaf.value : leaf;

const VIEW_OPTIONS = [
  { id: 'intro',      label: 'Intro' },
  { id: 'parameters', label: 'By parameter' },
  { id: 'sources',    label: 'By source' },
];

const CONF_TONE = {
  sourced:      'good',
  extrapolated: 'warn',
  judgement:    'neutral',
};

export function AboutTab() {
  const [view, setView] = useState('intro');

  const parameterRows = useMemo(() => {
    const rows = [];
    const walk = (node, path) => {
      if (node && typeof node === 'object' && 'value' in node && 'citationId' in node) {
        rows.push({ path, value: node.value, citationId: node.citationId, citation: CITATIONS[node.citationId] });
        return;
      }
      if (node && typeof node === 'object') {
        for (const [k, vv] of Object.entries(node)) walk(vv, [...path, k]);
      }
    };
    walk(PARAMS, []);
    return rows;
  }, []);
  const confSummary = useMemo(() => confidenceSummary(), []);
  const COALITION_FLOOR = unwrap(PARAMS.coalitionFloor);
  const BOND_YIELD_CEILING = unwrap(PARAMS.bondYieldCeiling);
  const INITIAL_DEFICIT = unwrap(PARAMS.initial.deficit);
  const INITIAL_DEBT = unwrap(PARAMS.initial.debt);
  const INITIAL_GDP = unwrap(PARAMS.initial.gdp);
  const DEFICIT_PCT_GDP = (INITIAL_DEFICIT / INITIAL_GDP * 100).toFixed(1);
  const DEBT_PCT_GDP = Math.round(INITIAL_DEBT / INITIAL_GDP * 100);

  return (
    <Stack gap="lg">
      <div>
        <h2 className="font-display text-2xl md:text-3xl font-medium italic text-stone-100 mb-1">
          About this simulation
        </h2>
        <p className="text-[12px] text-stone-500">
          A serious game about UK public finance. Numbers grounded where possible; designer judgement where not.
        </p>
      </div>

      <SegmentedControl value={view} onChange={setView} options={VIEW_OPTIONS} />

      {view === 'intro' && (
        <Stack gap="md">
          <Card variant="raised" padding="md">
            <Card.Header>
              <Card.Eyebrow className="text-accent-500">The premise</Card.Eyebrow>
            </Card.Header>
            <div className="max-w-prose text-[13px] text-stone-300 leading-relaxed space-y-3">
              <p>
                You inherit the UK with a £{INITIAL_DEFICIT}bn annual deficit ({DEFICIT_PCT_GDP}% of GDP) and debt at {DEBT_PCT_GDP}% of GDP. Twenty quarters (five years) to the next election. Coalition cohesion is your binding constraint — fall below {COALITION_FLOOR}% and the government collapses. Bond yields above {BOND_YIELD_CEILING}% and the markets take the keys.
              </p>
              <p>
                Three win conditions: an annual surplus, a deficit below 2% of GDP, or simply hold the coalition through the election. Re-elected Chancellors continue into a new term.
              </p>
            </div>
          </Card>

          <Card variant="raised" padding="md">
            <Card.Header>
              <Card.Eyebrow className="text-accent-500">Parliament methodology</Card.Eyebrow>
            </Card.Header>
            <div className="max-w-prose text-[12px] text-stone-300 leading-relaxed space-y-3">
              <p>
                The simulator models all 632 Great Britain Westminster constituencies (2024 boundaries). Each MP carries:
              </p>
              <ul className="text-[12px] text-stone-400 leading-relaxed list-disc pl-5 space-y-1.5">
                <li><strong className="text-stone-200">Demographics</strong> — 9 bloc-share percentages computed from ONS Census 2021 tables (NS-SEC, age bands, ethnic group, public-sector industry). <CitationLink id="ralphascott_constituency_bundle" /></li>
                <li><strong className="text-stone-200">Ideology vector</strong> — 2-axis (econ, social), anchored by Chapel Hill Expert Survey 2024 party scores, adjusted per-seat using Hanretty's 2016 Brexit notionals (social) and 2024 vote shares (econ). <CitationLink id="ches_2024_party_ideology" /> <CitationLink id="parliament_ideology_blend_methodology" /></li>
                <li><strong className="text-stone-200">Mood</strong> — refreshed each quarter from the bloc-weighted average of constituent support, with 0.8 inertia and ±3pp noise per seat. <CitationLink id="parliament_mood_methodology" /></li>
              </ul>
              <p className="text-[12px] text-stone-400 leading-relaxed">
                <strong className="text-stone-200">Political Capital</strong> is a 0–100 currency the Chancellor spends to propose reforms. Regenerates each quarter from a base + parliament mood + PM relationship. Reform cost scales with intra-party opposition based on ideological distance. <CitationLink id="pc_regen_methodology" /> <CitationLink id="parliament_opposition_methodology" />
              </p>
              <p className="text-[12px] text-stone-400 leading-relaxed">
                <strong className="text-stone-200">PM Relationship</strong> tracks how much the Prime Minister backs you. Modulates capital regeneration; can gate ideologically distant reforms. <CitationLink id="pm_relationship_methodology" />
              </p>
              <p className="text-[11px] text-stone-500 leading-relaxed">
                Northern Ireland's 18 seats are excluded (the source data doesn't cover them; NI parties don't take Labour/Conservative whips, so the omission has no political-capital impact).
              </p>
            </div>
          </Card>

          <Card variant="raised" padding="md">
            <Card.Header>
              <Card.Eyebrow className="text-accent-500">Methodological note</Card.Eyebrow>
            </Card.Header>
            <div className="max-w-prose text-[13px] text-stone-300 leading-relaxed space-y-3">
              <p>
                Each reform and event effect declares its own forecast band on the cited() call (asymmetric allowed; mode stays at the central value). Leaves without an authored band fall back to ±{Math.round(unwrap(PARAMS.forecastNoise.bandFallback)*100)}%. Passing OBR Independence scales every band's width by {unwrap(PARAMS.forecastNoise.obrMultiplier)}. Bloc reactions and event probabilities are designer judgements calibrated to feel right, not estimated from data.
              </p>
              <p>
                Where the literature is contested — rent controls, top-rate effects, immigration — the simulation reflects the contestation rather than picking a side.
              </p>
            </div>
          </Card>

          <Card variant="raised" padding="md">
            <Card.Header>
              <Card.Eyebrow className="text-accent-500">Confidence summary</Card.Eyebrow>
            </Card.Header>
            <p className="text-[11px] text-stone-400 leading-relaxed mb-3">
              Across {confSummary.total} parameter-level citations:
            </p>
            <div className="space-y-2.5">
              {(['sourced', 'extrapolated', 'judgement']).map(level => {
                const pct = Math.round(confSummary.pct[level] * 100);
                const s = CONFIDENCE_STYLES[level];
                return (
                  <div key={level}>
                    <div className="flex justify-between text-[11px] mb-1">
                      <span className={s.text}>{level}</span>
                      <span className="text-stone-400 font-mono tabular-nums">{confSummary.counts[level]} · {pct}%</span>
                    </div>
                    <MeterBar value={pct} tone={CONF_TONE[level]} />
                  </div>
                );
              })}
            </div>
            <p className="text-[10px] text-stone-500 leading-relaxed mt-3">
              Sourced = directly verified against publication. Extrapolated = sourced reasoning / consistent-but-not-verbatim. Judgement = designer call with documented reasoning.
            </p>
          </Card>
        </Stack>
      )}

      {view === 'parameters' && (
        <Stack gap="md">
          <p className="text-[11px] text-stone-500">Every numeric parameter in the simulation, with its citation. Tap the ⓘ for details.</p>
          <Grid cols={{ base: 1, md: 2 }} gap="sm">
            {parameterRows.map((r, i) => (
              <Card key={i} variant="raised" padding="sm" radius="lg">
                <div className="flex items-start justify-between gap-2 text-[11px]">
                  <div className="flex-1 min-w-0">
                    <div className="font-mono text-stone-300 text-[10px] truncate">{r.path.join('.')}</div>
                    <div className="text-stone-500 text-[10px] mt-0.5 truncate">{r.citation?.title}</div>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <span className="font-mono font-semibold text-accent-300 tabular-nums">{r.value}</span>
                    {r.citation && <ConfidenceBadge confidence={r.citation.confidence} />}
                    <CitationLink id={r.citationId} />
                  </div>
                </div>
              </Card>
            ))}
          </Grid>
        </Stack>
      )}

      {view === 'sources' && (
        <Stack gap="lg">
          <h3 className="font-display text-lg md:text-xl font-medium italic text-stone-100">Bibliography</h3>
          {SOURCES.map(group => (
            <div key={group.section}>
              <div className="text-[10px] uppercase tracking-wider text-accent-500 mb-2 font-semibold">{group.section}</div>
              <Grid cols={{ base: 1, lg: 2 }} gap="sm">
                {group.items.map((s, i) => (
                  <a key={i} href={s.url} target="_blank" rel="noopener noreferrer"
                     className="block bg-treasury-900/55 hover:bg-treasury-900/80 border border-treasury-800 hover:border-accent-700/40 rounded-card p-3 transition-colors">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="text-[12px] font-medium text-stone-200 leading-snug">{s.title}</div>
                        <div className="text-[10px] text-stone-500 italic mt-0.5">{s.sub}</div>
                        {s.note && <div className="text-[11px] text-stone-400 mt-1.5 leading-snug">{s.note}</div>}
                      </div>
                      <ExternalLink size={11} className="text-stone-500 flex-shrink-0 mt-1" />
                    </div>
                  </a>
                ))}
              </Grid>
            </div>
          ))}
        </Stack>
      )}

      <Card variant="raised" padding="md">
        <p className="text-[12px] text-stone-500 leading-relaxed">
          This is a game that tries to be informative, not a forecasting tool. If you want forecasts, the{' '}
          <a href="https://obr.uk/" target="_blank" rel="noopener noreferrer"
             className="text-accent-400 hover:text-accent-300 underline-offset-2 hover:underline transition-colors">OBR</a>
          {' '}is real and free.
        </p>
      </Card>

      <div className="text-center text-[10px] text-stone-600 font-mono tabular-nums">
        v{__APP_VERSION__}
      </div>
    </Stack>
  );
}
