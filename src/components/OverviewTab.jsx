import React from 'react';
import { REFORMS, PARAMS } from '../model/index.js';
import { Sparkline } from './primitives/Sparkline.jsx';
import { Card } from './primitives/Card.jsx';
import { Grid, Stack, TwoCol } from './primitives/Layout.jsx';

const v = (leaf) => (leaf && typeof leaf === 'object' && 'value' in leaf) ? leaf.value : leaf;
const TERM_LENGTH = v(PARAMS.termLength);

function fmtSignedPp(d, decimals = 1) {
  const sign = d >= 0 ? '+' : '−';
  return `${sign}${Math.abs(d).toFixed(decimals)}`;
}

// Caret with last-quarter delta vs committed snapshot.
// worseUp flips the colour for metrics where higher = bad (gini, debt, unemployment).
function Delta({ value, threshold = 0.1, worseUp = false, decimals = 1, suffix = '' }) {
  if (value === null || value === undefined || Number.isNaN(value)) return null;
  if (Math.abs(value) < threshold) return null;
  const positive = value > 0;
  const good = worseUp ? !positive : positive;
  return (
    <span className={`text-[9px] font-mono tabular-nums ${good ? 'text-signal-good' : 'text-signal-bad'}`}>
      {fmtSignedPp(value, decimals)}{suffix}
    </span>
  );
}

function MetricCell({ label, value, delta, deltaProps, color, points, sparkColor }) {
  return (
    <Card variant="raised" padding="sm" radius="lg">
      <div className="text-[9px] uppercase tracking-wider text-stone-500 mb-1 flex items-center gap-1.5">
        {label}
        {delta !== undefined && <Delta value={delta} {...(deltaProps || {})} />}
      </div>
      <div className="flex items-center justify-between gap-2">
        <div className={`text-[13px] md:text-[14px] font-mono font-semibold tabular-nums ${color || 'text-stone-200'}`}>
          {value}
        </div>
        {points && (
          <Sparkline points={points} width={80} height={22} color={sparkColor || 'var(--accent-400)'} />
        )}
      </div>
    </Card>
  );
}

// Larger trajectory chart for the headline GDP figure. Uses the Sparkline
// primitive's responsive mode so it fills the column at any width.
function GdpChart({ points, current }) {
  const first = points && points.length > 0 ? points[0] : null;
  const pctChange = first && first !== 0 ? ((current - first) / first) * 100 : null;
  return (
    <Card variant="raised" padding="md">
      <Card.Header>
        <Card.Eyebrow>Nominal GDP (£bn)</Card.Eyebrow>
        <div className="flex items-baseline gap-2">
          <div className="text-stone-100 text-[15px] md:text-[17px] font-mono font-semibold tabular-nums">
            {current.toFixed(0)}
          </div>
          {pctChange !== null && <Delta value={pctChange} threshold={0.05} suffix="%" />}
        </div>
      </Card.Header>
      <div className="w-full">
        <Sparkline points={points} width={600} height={140} responsive
                   color="var(--accent-400)" strokeWidth={2} dotRadius={3} />
      </div>
      <div className="flex justify-between text-[9px] text-stone-500 mt-1 font-mono tabular-nums">
        <span>{first !== null ? `start ${first.toFixed(0)}` : ''}</span>
        <span>now {current.toFixed(0)}</span>
      </div>
    </Card>
  );
}

// Hero card: term/year/quarter + a progress bar. Elevated variant gives it
// the most visual weight on the page.
function TermHero({ term, yearInTerm, yearQ, qToElection, quarter, termProgress }) {
  return (
    <Card variant="elevated" padding="md">
      <div className="flex items-end justify-between mb-3">
        <div>
          <Card.Eyebrow>Term {term}</Card.Eyebrow>
          <div className="font-display text-xl md:text-2xl font-medium leading-none text-stone-100 mt-0.5">
            Year {yearInTerm}, Q{yearQ}
          </div>
        </div>
        <div className="text-right">
          <Card.Eyebrow>To election</Card.Eyebrow>
          <div className="font-display text-xl md:text-2xl font-medium leading-none text-accent-400 mt-0.5 tabular-nums">
            {qToElection}Q
          </div>
        </div>
      </div>
      <div className="h-1.5 bg-treasury-950 rounded-pill overflow-hidden shadow-inset-well">
        <div className="h-full bg-gradient-to-r from-accent-600 to-accent-400 transition-all duration-500"
             style={{width: `${termProgress}%`}} />
      </div>
      <div className="text-[10px] text-stone-500 mt-1.5 font-mono tabular-nums">
        Quarter {quarter} of {TERM_LENGTH}
      </div>
    </Card>
  );
}

function ReformsCard({ allReforms, term, qToElection }) {
  return (
    <Card variant="raised" padding="md" className="h-full">
      <Card.Header>
        <Card.Eyebrow>Reforms Underway</Card.Eyebrow>
        <Card.Meta>→ Reforms tab</Card.Meta>
      </Card.Header>
      {allReforms.length === 0 ? (
        <div className="text-[11px] text-stone-500 italic">No reforms in flight or queued.</div>
      ) : (
        <div className="space-y-2.5">
          {allReforms.map((r) => (
            <div key={r.id}>
              <div className="flex items-center justify-between mb-1 text-[11px]">
                <span className={r.queued ? 'text-signal-info' : 'text-stone-200'}>{r.name}</span>
                <span className="text-[10px] text-stone-500 font-mono tabular-nums">
                  {r.queued ? `${r.total}Q · queued` : `${r.remaining}Q remaining`}
                </span>
              </div>
              <div className="h-1.5 bg-treasury-950 rounded-pill overflow-hidden shadow-inset-well">
                <div className={`h-full transition-all duration-500 ${r.queued ? 'bg-sky-500/50' : 'bg-gradient-to-r from-accent-600 to-accent-400'}`}
                     style={{width: `${r.progress}%`}} />
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

function EventsCard({ log }) {
  return (
    <Card variant="raised" padding="md" className="h-full">
      <Card.Header>
        <Card.Eyebrow>Recent Events</Card.Eyebrow>
      </Card.Header>
      {log.length === 0 ? (
        <div className="text-[11px] text-stone-500 italic">No events yet — the country watches.</div>
      ) : (
        <div className="space-y-1.5">
          {log.slice(-8).reverse().map((l, i) => (
            <div key={i} className="text-[11px] text-stone-400 leading-snug">
              <span className="text-accent-500 mr-2 font-mono tabular-nums">Q{l.q}</span>{l.text}
            </div>
          ))}
        </div>
      )}
    </Card>
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
    <Stack gap="lg">
      {/* Hero + GDP chart sit side-by-side on desktop, stack on mobile. */}
      <TwoCol
        ratio="even"
        gap="lg"
        main={<TermHero term={game.term} yearInTerm={yearInTerm} yearQ={yearQ}
                        qToElection={qToElection} quarter={game.quarter} termProgress={termProgress} />}
        side={<GdpChart points={game.gdpPath || []} current={game.gdp} />}
      />

      <div>
        <div className="text-[10px] uppercase tracking-wider text-stone-500 mb-2 px-1">Headline Metrics</div>
        <Grid cols={{ base: 2, md: 4 }} gap="sm">
          <MetricCell
            label="Debt / GDP"
            value={`${debtRatio}%`}
            delta={debtRatioDelta}
            deltaProps={{ worseUp: true, threshold: 0.5 }}
            color={debtRatioNum < 90 ? 'text-signal-good' : debtRatioNum < 110 ? 'text-stone-200' : 'text-signal-bad'}
            points={game.debtRatioPath}
          />
          <MetricCell
            label="Deficit / GDP"
            value={`${deficitGDP.toFixed(1)}%`}
            delta={deficitDelta}
            deltaProps={{ worseUp: true, threshold: 0.2 }}
            color={deficitGDP < 2 ? 'text-signal-good' : deficitGDP < 4 ? 'text-accent-400' : 'text-signal-bad'}
            points={game.deficitRatioPath}
          />
          <MetricCell
            label="Bank Rate"
            value={`${game.bankRate.toFixed(2)}%`}
            delta={bankRateDelta}
            deltaProps={{ worseUp: true, threshold: 0.1 }}
            color={game.bankRate < 4 ? 'text-signal-good' : game.bankRate < 6 ? 'text-stone-200' : 'text-signal-bad'}
            points={game.bankRatePath}
          />
          <MetricCell
            label="Unemployment"
            value={`${game.unemployment.toFixed(1)}%`}
            delta={unempDelta}
            deltaProps={{ worseUp: true, threshold: 0.1 }}
            color={game.unemployment < 4.5 ? 'text-signal-good' : game.unemployment < 6 ? 'text-stone-200' : 'text-signal-bad'}
            points={game.unemploymentPath}
          />
          <MetricCell
            label="Health Index"
            value={game.healthIndex.toFixed(0)}
            delta={healthDelta}
            deltaProps={{ threshold: 0.3 }}
            color={game.healthIndex >= 55 ? 'text-signal-good' : game.healthIndex >= 45 ? 'text-stone-200' : 'text-signal-bad'}
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
        </Grid>
      </div>

      {/* Reforms + Events: stack on mobile, side-by-side on desktop. */}
      <TwoCol
        ratio="even"
        gap="lg"
        main={<ReformsCard allReforms={allReforms} />}
        side={<EventsCard log={game.log} />}
      />
    </Stack>
  );
}
