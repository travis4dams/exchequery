import React from 'react';
import { Clock } from 'lucide-react';
import { REFORMS, PARAMS } from '../model/index.js';
import { Sparkline } from './Sparkline.jsx';

const v = (leaf) => (leaf && typeof leaf === 'object' && 'value' in leaf) ? leaf.value : leaf;
const TERM_LENGTH = v(PARAMS.termLength);

function fmtSignedPp(d, decimals = 1) {
  const sign = d >= 0 ? '+' : '−';
  return `${sign}${Math.abs(d).toFixed(decimals)}`;
}

// Caret with last-quarter delta vs committed snapshot.
// `worseUp` flips the colour for metrics where higher = bad (gini, debt, unemployment).
function Delta({ value, threshold = 0.1, worseUp = false, decimals = 1, suffix = '' }) {
  if (value === null || value === undefined || Number.isNaN(value)) return null;
  if (Math.abs(value) < threshold) return null;
  const positive = value > 0;
  const good = worseUp ? !positive : positive;
  return (
    <span className={`text-[9px] ${good ? 'text-emerald-400' : 'text-rose-400'}`}
          style={{fontFamily: 'IBM Plex Mono'}}>
      {fmtSignedPp(value, decimals)}{suffix}
    </span>
  );
}

function MetricCell({ label, value, delta, deltaProps, color, points, sparkColor }) {
  return (
    <div className="bg-stone-900/40 border border-stone-800 rounded p-2">
      <div className="text-[9px] uppercase tracking-wider text-stone-500 mb-0.5 flex items-center gap-1">
        {label}
        {delta !== undefined && <Delta value={delta} {...(deltaProps || {})} />}
      </div>
      <div className="flex items-center justify-between gap-2">
        <div className={`text-[13px] font-semibold tabular-nums ${color || 'text-stone-200'}`}
             style={{fontFamily: 'IBM Plex Mono'}}>
          {value}
        </div>
        {points && <Sparkline points={points} width={80} height={22} color={sparkColor || '#fbbf24'} />}
      </div>
    </div>
  );
}

// Larger trajectory chart for the headline GDP figure. Reuses Sparkline at
// panel scale; the viewBox lets it scale fluidly with the column width.
function GdpChart({ points, current }) {
  const first = points && points.length > 0 ? points[0] : null;
  const pctChange = first && first !== 0 ? ((current - first) / first) * 100 : null;
  return (
    <div className="p-4 bg-stone-900/40 border border-stone-800 rounded-lg">
      <div className="flex items-baseline justify-between mb-2">
        <div className="text-[10px] uppercase tracking-wider text-stone-500">Nominal GDP (£bn)</div>
        <div className="flex items-baseline gap-2">
          <div className="text-stone-200 text-[15px] font-semibold tabular-nums"
               style={{fontFamily: 'IBM Plex Mono'}}>
            {current.toFixed(0)}
          </div>
          {pctChange !== null && <Delta value={pctChange} threshold={0.05} suffix="%" />}
        </div>
      </div>
      <div className="w-full">
        <svg viewBox="0 0 600 140" preserveAspectRatio="none" width="100%" height="140">
          <Sparkline points={points} width={600} height={140} color="#fbbf24" />
        </svg>
      </div>
      <div className="flex justify-between text-[9px] text-stone-500 mt-1 tabular-nums"
           style={{fontFamily: 'IBM Plex Mono'}}>
        <span>{first !== null ? `start ${first.toFixed(0)}` : ''}</span>
        <span>now {current.toFixed(0)}</span>
      </div>
    </div>
  );
}

export function OverviewTab({ game, committed, deficitGDP, debtRatio }) {
  const yearQ = ((game.quarter - 1) % 4) + 1;
  const yearInTerm = Math.ceil(game.quarter / 4);
  const qToElection = Math.max(0, TERM_LENGTH - game.quarter + 1);
  const termProgress = Math.min(100, (game.quarter / TERM_LENGTH) * 100);

  const popM = game.population;
  const popDelta = committed ? popM - committed.population : null;
  const unempDelta = committed ? game.unemployment - committed.unemployment : null;
  const healthDelta = committed ? game.healthIndex - committed.healthIndex : null;
  const hpiDelta = committed ? game.housePriceIndex - committed.housePriceIndex : null;
  const energyDelta = committed ? game.energyPriceIndex - committed.energyPriceIndex : null;
  const bankRateDelta = committed ? game.bankRate - committed.bankRate : null;
  const debtRatioNum = game.debt / game.gdp * 100;
  const debtRatioDelta = committed
    ? debtRatioNum - (committed.debt / committed.gdp * 100)
    : null;
  const deficitDelta = committed
    ? deficitGDP - (-committed.balance / committed.gdp * 100)
    : null;

  // Reforms-at-a-glance: combine in-flight and queued into a single list.
  const inFlight = Object.entries(game.reforms)
    .filter(([_, r]) => r.status === 'inProgress')
    .map(([id, r]) => {
      const reform = REFORMS[id];
      const remaining = Math.max(0, r.completesQ - game.globalQuarter);
      const progress = reform ? ((reform.quarters - remaining) / reform.quarters) * 100 : 0;
      return {
        id, name: reform?.name || id,
        remaining,
        total: reform?.quarters || 1,
        progress,
        queued: false,
      };
    });
  const queued = game.proposedReforms.map((id) => {
    const reform = REFORMS[id];
    return {
      id, name: reform?.name || id,
      remaining: reform?.quarters || 0,
      total: reform?.quarters || 1,
      progress: 0,
      queued: true,
    };
  });
  const allReforms = [...inFlight, ...queued];

  return (
    <div className="space-y-4">
      <div className="p-3 bg-stone-900/40 border border-stone-800 rounded-lg">
        <div className="flex items-center justify-between mb-2">
          <div>
            <div className="text-[10px] uppercase tracking-wider text-stone-500">Term {game.term}</div>
            <div className="display-font text-lg font-medium leading-none text-stone-100">
              Year {yearInTerm}, Q{yearQ}
            </div>
          </div>
          <div className="text-right">
            <div className="text-[10px] uppercase tracking-wider text-stone-500">To election</div>
            <div className="display-font text-lg font-medium leading-none text-amber-400">
              {qToElection}Q
            </div>
          </div>
        </div>
        <div className="h-1 bg-stone-800 rounded-full overflow-hidden">
          <div className="h-full bg-amber-500 transition-all" style={{width: `${termProgress}%`}} />
        </div>
        <div className="text-[10px] text-stone-500 mt-1">Quarter {game.quarter} of {TERM_LENGTH}</div>
      </div>

      <GdpChart points={game.gdpPath || []} current={game.gdp} />

      <div>
        <div className="text-[10px] uppercase tracking-wider text-stone-500 mb-2">Headline Metrics</div>
        <div className="grid grid-cols-2 gap-2">
          <MetricCell
            label="Debt / GDP"
            value={`${debtRatio}%`}
            delta={debtRatioDelta}
            deltaProps={{ worseUp: true, threshold: 0.5 }}
            color={debtRatioNum < 90 ? 'text-emerald-400' : debtRatioNum < 110 ? 'text-stone-200' : 'text-rose-400'}
            points={game.debtRatioPath}
          />
          <MetricCell
            label="Deficit / GDP"
            value={`${deficitGDP.toFixed(1)}%`}
            delta={deficitDelta}
            deltaProps={{ worseUp: true, threshold: 0.2 }}
            color={deficitGDP < 2 ? 'text-emerald-400' : deficitGDP < 4 ? 'text-amber-400' : 'text-rose-400'}
            points={game.deficitRatioPath}
          />
          <MetricCell
            label="Bank Rate"
            value={`${game.bankRate.toFixed(2)}%`}
            delta={bankRateDelta}
            deltaProps={{ worseUp: true, threshold: 0.1 }}
            color={game.bankRate < 4 ? 'text-emerald-400' : game.bankRate < 6 ? 'text-stone-200' : 'text-rose-400'}
            points={game.bankRatePath}
          />
          <MetricCell
            label="Unemployment"
            value={`${game.unemployment.toFixed(1)}%`}
            delta={unempDelta}
            deltaProps={{ worseUp: true, threshold: 0.1 }}
            color={game.unemployment < 4.5 ? 'text-emerald-400' : game.unemployment < 6 ? 'text-stone-200' : 'text-rose-400'}
            points={game.unemploymentPath}
          />
          <MetricCell
            label="Health Index"
            value={game.healthIndex.toFixed(0)}
            delta={healthDelta}
            deltaProps={{ threshold: 0.3 }}
            color={game.healthIndex >= 55 ? 'text-emerald-400' : game.healthIndex >= 45 ? 'text-stone-200' : 'text-rose-400'}
            points={game.healthIndexPath}
          />
          <MetricCell
            label="Population"
            value={`${popM.toFixed(1)}m`}
            delta={popDelta !== null ? popDelta * 1000 : null}
            deltaProps={{ threshold: 5, decimals: 0, suffix: 'k' }}
            points={game.populationPath}
          />
          <MetricCell
            label="Housing Index"
            value={game.housePriceIndex.toFixed(0)}
            delta={hpiDelta}
            deltaProps={{ threshold: 0.5 }}
            points={game.housePricePath}
          />
          <MetricCell
            label="Energy Index"
            value={game.energyPriceIndex.toFixed(0)}
            delta={energyDelta}
            deltaProps={{ worseUp: true, threshold: 0.5 }}
            points={game.energyPricePath}
          />
        </div>
      </div>

      <div className="p-3 bg-stone-900/40 border border-stone-800 rounded-lg">
        <div className="text-[10px] uppercase tracking-wider text-stone-500 mb-2 flex items-center justify-between">
          <span>Reforms Underway</span>
          <span className="text-stone-600">→ Reforms tab</span>
        </div>
        {allReforms.length === 0 ? (
          <div className="text-[11px] text-stone-500 italic">No reforms in flight or queued.</div>
        ) : (
          <div className="space-y-2">
            {allReforms.map((r) => (
              <div key={r.id}>
                <div className="flex items-center justify-between mb-0.5 text-[11px]">
                  <span className={r.queued ? 'text-sky-300' : 'text-stone-300'}>{r.name}</span>
                  <span className="text-[10px] text-stone-500" style={{fontFamily: 'IBM Plex Mono'}}>
                    {r.queued ? `${r.total}Q · queued` : `${r.remaining}Q remaining`}
                  </span>
                </div>
                <div className="h-1 bg-stone-800 rounded-full overflow-hidden">
                  <div className={`h-full ${r.queued ? 'bg-sky-500/50' : 'bg-amber-500'}`}
                       style={{width: `${r.progress}%`}} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="p-4 bg-stone-900/40 border border-stone-800 rounded-lg">
        <div className="text-[10px] uppercase tracking-wider text-stone-500 mb-2">Recent Events</div>
        {game.log.length === 0 ? (
          <div className="text-[11px] text-stone-500 italic">No events yet — the country watches.</div>
        ) : (
          <div className="space-y-1.5">
            {game.log.slice(-8).reverse().map((l, i) => (
              <div key={i} className="text-[11px] text-stone-400 leading-snug">
                <span className="text-amber-500 mr-2" style={{fontFamily: 'IBM Plex Mono'}}>Q{l.q}</span>{l.text}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
