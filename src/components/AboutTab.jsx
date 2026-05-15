import React, { useMemo, useState } from 'react';
import { ExternalLink } from 'lucide-react';
import { PARAMS, CITATIONS, confidenceSummary, SOURCES } from '../model/index.js';
import { CitationLink, ConfidenceBadge, CONFIDENCE_STYLES } from './primitives/CitationLink.jsx';

const unwrap = (leaf) => (leaf && typeof leaf === 'object' && 'value' in leaf) ? leaf.value : leaf;

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
    <div>
      <div className="mb-5">
        <h2 className="display-font text-xl font-medium italic text-stone-100 mb-1">About this simulation</h2>
        <p className="text-[11px] text-stone-500">A serious game about UK public finance. Numbers grounded where possible; designer judgement where not.</p>
      </div>

      <div className="flex gap-1 mb-4 bg-stone-900/40 rounded-lg p-1 border border-stone-800">
        {[
          {id: 'intro', label: 'Intro'},
          {id: 'parameters', label: 'By parameter'},
          {id: 'sources', label: 'By source'},
        ].map(t => (
          <button key={t.id} onClick={() => setView(t.id)}
            className={`flex-1 text-[11px] px-2 py-1.5 rounded transition-colors ${view === t.id ? 'bg-amber-600 text-stone-950 font-semibold' : 'text-stone-400 hover:text-stone-200'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {view === 'intro' && (
        <>
          <div className="bg-stone-900/40 border border-stone-800 rounded-lg p-4 mb-4">
            <div className="text-[10px] uppercase tracking-wider text-amber-500 mb-2">The premise</div>
            <p className="text-[12px] text-stone-300 leading-relaxed mb-2">
              You inherit the UK with a £{INITIAL_DEFICIT}bn annual deficit ({DEFICIT_PCT_GDP}% of GDP) and debt at {DEBT_PCT_GDP}% of GDP. Twenty quarters (five years) to the next election. Coalition cohesion is your binding constraint — fall below {COALITION_FLOOR}% and the government collapses. Bond yields above {BOND_YIELD_CEILING}% and the markets take the keys.
            </p>
            <p className="text-[12px] text-stone-300 leading-relaxed">
              Three win conditions: an annual surplus, a deficit below 2% of GDP, or simply hold the coalition through the election. Re-elected Chancellors continue into a new term.
            </p>
          </div>

          <div className="bg-stone-900/40 border border-stone-800 rounded-lg p-4 mb-4">
            <div className="text-[10px] uppercase tracking-wider text-amber-500 mb-2">Methodological note</div>
            <p className="text-[12px] text-stone-300 leading-relaxed mb-2">
              Reform revenue and cost estimates carry ±25% noise (reduced to ±10% after passing OBR Independence) to reflect genuine forecasting uncertainty. Bloc reactions and event probabilities are designer judgements calibrated to feel right, not estimated from data.
            </p>
            <p className="text-[12px] text-stone-300 leading-relaxed">
              Where the literature is contested — rent controls, top-rate effects, immigration — the simulation reflects the contestation rather than picking a side.
            </p>
          </div>

          <div className="bg-stone-900/40 border border-stone-800 rounded-lg p-4 mb-4">
            <div className="text-[10px] uppercase tracking-wider text-amber-500 mb-2">Confidence summary</div>
            <p className="text-[11px] text-stone-400 leading-relaxed mb-3">
              Across {confSummary.total} parameter-level citations:
            </p>
            <div className="space-y-2">
              {(['sourced', 'extrapolated', 'judgement']).map(level => {
                const pct = Math.round(confSummary.pct[level] * 100);
                const s = CONFIDENCE_STYLES[level];
                return (
                  <div key={level}>
                    <div className="flex justify-between text-[11px] mb-1">
                      <span className={s.text}>{level}</span>
                      <span className="text-stone-400" style={{fontFamily: 'IBM Plex Mono'}}>{confSummary.counts[level]} · {pct}%</span>
                    </div>
                    <div className="h-1.5 bg-stone-800 rounded-full overflow-hidden">
                      <div className={`h-full ${level === 'sourced' ? 'bg-emerald-500' : level === 'extrapolated' ? 'bg-amber-500' : 'bg-stone-500'}`} style={{width: `${pct}%`}} />
                    </div>
                  </div>
                );
              })}
            </div>
            <p className="text-[10px] text-stone-500 leading-relaxed mt-3">
              Sourced = directly verified against publication. Extrapolated = sourced reasoning / consistent-but-not-verbatim. Judgement = designer call with documented reasoning.
            </p>
          </div>
        </>
      )}

      {view === 'parameters' && (
        <div>
          <p className="text-[11px] text-stone-500 mb-3">Every numeric parameter in the simulation, with its citation. Tap the ⓘ for details.</p>
          <div className="space-y-1.5">
            {parameterRows.map((r, i) => (
              <div key={i} className="bg-stone-900/40 border border-stone-800 rounded p-2 text-[11px]">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="font-mono text-stone-300 text-[10px] truncate">{r.path.join('.')}</div>
                    <div className="text-stone-500 text-[10px] mt-0.5">{r.citation?.title}</div>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <span className="font-semibold text-amber-300" style={{fontFamily: 'IBM Plex Mono'}}>{r.value}</span>
                    {r.citation && <ConfidenceBadge confidence={r.citation.confidence} />}
                    <CitationLink id={r.citationId} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {view === 'sources' && (
        <div>
          <div className="mb-3">
            <h3 className="display-font text-lg font-medium italic text-stone-100">Bibliography</h3>
          </div>

          {SOURCES.map(group => (
            <div key={group.section} className="mb-5">
              <div className="text-[10px] uppercase tracking-wider text-amber-500 mb-2 font-semibold">{group.section}</div>
              <div className="space-y-2">
                {group.items.map((s, i) => (
                  <a key={i} href={s.url} target="_blank" rel="noopener noreferrer"
                     className="block bg-stone-900/40 hover:bg-stone-900/70 border border-stone-800 hover:border-amber-900/40 rounded-md p-3 transition-colors">
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
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-6 p-3 bg-stone-900/40 border border-stone-800 rounded text-[11px] text-stone-500 leading-relaxed">
        This is a game that tries to be informative, not a forecasting tool. If you want forecasts, the <a href="https://obr.uk/" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:underline">OBR</a> is real and free.
      </div>

      <div className="mt-3 text-center text-[10px] text-stone-600" style={{fontFamily: 'IBM Plex Mono'}}>
        v{__APP_VERSION__}
      </div>
    </div>
  );
}
