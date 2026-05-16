import React, { useState, useEffect } from 'react';
import { AlertTriangle, ExternalLink, X } from 'lucide-react';
import { REFORMS, PARAMS, EVENT_DEFINITIONS } from '../model/index.js';
import { Sparkline } from './primitives/Sparkline.jsx';
import { Card } from './primitives/Card.jsx';
import { Grid, Stack, TwoCol } from './primitives/Layout.jsx';
import { MeterBar } from './primitives/MeterBar.jsx';
import { PopulationDetail } from './modals/PopulationDetail.jsx';

const v = (leaf) => (leaf && typeof leaf === 'object' && 'value' in leaf) ? leaf.value : leaf;
const TERM_LENGTH = v(PARAMS.termLength);

// Crisis-only event whitelist — opportunities are folded into the relevant
// tabs (Reforms / Budget) in a follow-up PR. This list mirrors the old
// TailRisksCard's CRISIS_EVENTS, minus none.
const CRISIS_EVENTS = [
  'nhsStrike', 'energyShock', 'fuelPoverty', 'housingCrisis', 'councilBankruptcy',
  'financialCrisis', 'generalStrike', 'careCrisis', 'flood', 'heatwave', 'allyCrisis',
  'labourShortage', 'rateHikeShock', 'wagePriceSpiral', 'monetaryPolicyError',
  'housePriceCorrection', 'planningRevolt', 'equityCrash', 'giltStrike', 'sovereignRatingAction',
  'recession',
  'pandemic', 'teacherStrike', 'droughtStress', 'supplyChainShock', 'cyberAttack',
  'coldSnap', 'aiDisplacement', 'sterlingSlide', 'commercialPropertyCrash',
  'pensionFundCrisis', 'cabinetScandal', 'devolutionDispute',
];

// UI copy — what the player can do to mitigate. Concrete in-game levers.
// Not in the model: this is presentation, not calculation.
const EVENT_MITIGATION = {
  // Department under-funding risks → raise the slider above its baseline.
  nhsStrike:             'Raise NHS spending above £204bn baseline.',
  teacherStrike:         'Raise Education spending above £95bn baseline.',
  councilBankruptcy:     'Raise Local Gov spending above £140bn baseline.',
  civilUnrest:           'Raise Justice spending above £55bn baseline.',
  diplomaticIsolation:   'Raise FCDO spending above £15bn baseline.',
  independenceMovement:  'Raise Devolved transfers above £71bn baseline.',
  fuelPoverty:           'Raise Welfare spending; consider energy reforms.',
  careCrisis:            'Raise Welfare spending and NHS; consider Social Care reform.',
  housingCrisis:         'Pass Planning Reform or raise Welfare; address supply.',
  generalStrike:         'Complete Civil Service Rebuild reform; ease pay pressure.',
  pandemic:              'Complete Preventative Health to halve pandemic impact.',
  energyShock:           'Pass energy-mix reforms; build the shock damper.',
  aiDisplacement:        'Pass Skills Budget reform to retrain workers.',
  // Macro-financial risks → fiscal discipline.
  recession:             'Cut deficit; rebuild buffers before the cycle turns.',
  financialCrisis:       'Reduce deficit; pass OBR Independence; calm gilts.',
  giltStrike:            'Cut deficit; pass OBR Independence to narrow premium.',
  sovereignRatingAction: 'Reduce debt/GDP trajectory and deficit.',
  ldiDoomLoop:           'Avoid sudden rate hikes; build pension regulatory damper.',
  pensionFundCrisis:     'Pass pension-stability reform; stabilise long-gilts.',
  sterlingSlide:         'Hold rates steady; calm bond markets.',
  equityCrash:           'Pass equity-stability reform; avoid corp tax shocks.',
  commercialPropertyCrash:'Steady real rates; pass property-market reforms.',
  rateHikeShock:         'Keep inflation near target; let MPC stay on glide path.',
  monetaryPolicyError:   'Pass BoE-mandate reforms; reduce inflation volatility.',
  wagePriceSpiral:       'Pass labour-flexibility reforms; cool the labour market.',
  inflationSurprise:     'Keep fiscal stance neutral; let MPC respond.',
  // Political risks.
  cabinetScandal:        'Manage parliament mood; cancel divisive reforms in flight.',
  devolutionDispute:     'Raise Devolved transfers; engage with the nations.',
  // Climate / external.
  flood:                 'Raise DEFRA spending; flood-defence reforms.',
  heatwave:              'Raise NHS spending; pass climate-adaptation reforms.',
  droughtStress:         'Raise DEFRA; infrastructure for water resilience.',
  supplyChainShock:      'Pass trade-resilience reforms; maintain reserves.',
  cyberAttack:           'Raise Justice/cyber-security spending.',
  coldSnap:              'Raise Welfare (fuel poverty buffer) and NHS.',
  // Internal political mechanics.
  housePriceCorrection:  'Stabilise real rates; calm housing supply policy.',
  planningRevolt:        'Pass planning reform with bloc buy-in.',
  allyCrisis:            'Manage coalition cohesion; recalibrate concessions.',
  labourShortage:        'Pass immigration / skills reforms.',
};

const RISK_WARN = 15;
const RISK_CRITICAL = 30;

function fmtSignedPp(d, decimals = 1) {
  const sign = d >= 0 ? '+' : '−';
  return `${sign}${Math.abs(d).toFixed(decimals)}`;
}

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

const fmtSigned = (n) => (n >= 0 ? '+' : '−') + (Math.abs(n) >= 1000 ? `£${(Math.abs(n)/1000).toFixed(1)}tn` : `£${Math.abs(n).toFixed(0)}bn`);

// === Row A: Fiscal panel (debt + deficit combined) + GDP chart ==============

function DebtPanel({ game, debtRatio, balance, deficitGDP, spending, committed, onOpenLedger }) {
  // Debt-ratio delta vs prior committed value, for the "vs last Q" caret.
  const debtRatioNum = (game.debt / game.gdp) * 100;
  const debtRatioDelta = committed
    ? debtRatioNum - (committed.debt / committed.gdp * 100)
    : null;
  const deficitColor = balance >= 0
    ? 'text-signal-good'
    : deficitGDP < 2 ? 'text-accent-300' : 'text-signal-bad';
  const deficitLabel = balance >= 0
    ? 'Surplus'
    : deficitGDP < 2 ? 'Sustainable deficit' : 'Deficit';
  return (
    <Card variant="raised" padding="md" className="h-full">
      <Card.Header>
        <Card.Eyebrow>National Debt</Card.Eyebrow>
        <div className="flex items-baseline gap-1.5">
          <span className="text-stone-300 text-[11px] font-mono tabular-nums">{debtRatio}% GDP</span>
          <Delta value={debtRatioDelta} worseUp threshold={0.1} suffix="pp" decimals={1} />
        </div>
      </Card.Header>
      <div className="font-display text-2xl md:text-3xl font-medium tabular-nums text-stone-100 leading-none">
        £{(game.debt/1000).toFixed(2)}tn
      </div>
      {(game.debtRatioPath || []).length >= 2 && (
        <div className="w-full mt-3">
          <Sparkline points={game.debtRatioPath} width={400} height={48} responsive
                     color="var(--accent-400)" strokeWidth={1.75} dotRadius={2.5} />
          <div className="flex justify-between text-[9px] text-stone-500 mt-0.5 font-mono tabular-nums">
            <span>start {game.debtRatioPath[0].toFixed(0)}%</span>
            <span>now {debtRatio}% debt</span>
          </div>
        </div>
      )}
      {/* Balance / GDP chart — plotted with a centered zero rule so the
          line trends up toward zero as the deficit closes. Surplus shows
          above the rule, deficit below (negative). */}
      {(game.deficitRatioPath || []).length >= 2 && (
        <div className="w-full mt-2">
          <Sparkline
            points={game.deficitRatioPath.map(v => -v)}
            width={400} height={36} responsive
            color={balance >= 0 ? 'var(--signal-good)' : 'var(--signal-bad)'}
            strokeWidth={1.5} dotRadius={2.5}
            zeroAxis zeroAxisFloor={1}
          />
          <div className="flex justify-between text-[9px] text-stone-500 mt-0.5 font-mono tabular-nums">
            <span>Balance / GDP</span>
            <span className={balance >= 0 ? 'text-signal-good' : 'text-signal-bad'}>
              now {(-deficitGDP).toFixed(1)}%
            </span>
          </div>
        </div>
      )}
      <div className="mt-3 pt-3 border-t border-treasury-800/70 space-y-0.5 text-[10px] font-mono">
        <div className="flex justify-between">
          <span className="text-stone-400">{deficitLabel}</span>
          <span className={`tabular-nums ${deficitColor}`}>
            {fmtSigned(balance)} · {deficitGDP.toFixed(1)}% GDP
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-stone-400">Gilt yield (market)</span>
          <span className="text-stone-300 tabular-nums">{game.bondYield.toFixed(2)}%</span>
        </div>
        <div className="flex justify-between">
          <span className="text-stone-400">Effective rate on stock</span>
          <span className="text-stone-300 tabular-nums">{game.effectiveServicingRate.toFixed(2)}%</span>
        </div>
        <div className="flex justify-between">
          <span className="text-stone-400">Annual interest cost</span>
          <span className="text-signal-bad tabular-nums">£{spending.debtInterest.toFixed(0)}bn</span>
        </div>
      </div>
      <button onClick={onOpenLedger}
              className="mt-3 inline-flex items-center gap-1 text-[11px] text-accent-400 hover:text-accent-300 transition-colors">
        View full ledger <ExternalLink size={11} />
      </button>
    </Card>
  );
}

function GdpChart({ game }) {
  const points = game.gdpPath || [];
  const current = game.gdp;
  const first = points.length > 0 ? points[0] : null;
  const pctChange = first && first !== 0 ? ((current - first) / first) * 100 : null;
  return (
    <Card variant="raised" padding="md" className="h-full">
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

// === Row B: Impending risks =================================================

function RiskBadge({ id, probability, onDismiss }) {
  const critical = probability >= RISK_CRITICAL;
  const tone = critical ? 'bad' : 'warn';
  const iconCls = critical ? 'text-signal-bad animate-pulse-soft' : 'text-accent-400';
  const title = EVENT_DEFINITIONS[id]?.title || id;
  const mitigation = EVENT_MITIGATION[id];
  return (
    <Card variant="signal" tone={tone} padding="sm">
      <div className="flex items-start gap-2.5">
        <AlertTriangle size={14} className={`flex-shrink-0 mt-0.5 ${iconCls}`} />
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-[12px] font-semibold text-stone-100 truncate">{title}</span>
            <span className="text-[11px] font-mono tabular-nums text-stone-300 flex-shrink-0">
              {Math.round(probability)}%
            </span>
          </div>
          {mitigation && (
            <div className="text-[10px] text-stone-400 mt-1 leading-snug">{mitigation}</div>
          )}
          <div className="mt-1.5">
            <MeterBar value={Math.min(100, probability * 1.5)}
                      tone={critical ? 'bad' : 'warn'} size="xs" />
          </div>
        </div>
        {onDismiss && (
          <button onClick={onDismiss}
                  aria-label="Dismiss until next quarter"
                  title="Dismiss until next quarter"
                  className="text-stone-500 hover:text-stone-200 transition-colors flex-shrink-0 p-1 -m-1">
            <X size={12} />
          </button>
        )}
      </div>
    </Card>
  );
}

function ImpendingRisks({ riskMods, quarter }) {
  // Per-quarter dismissals — reset whenever the quarter rolls over so a
  // dismissed risk re-surfaces if it's still impending next time.
  const [dismissed, setDismissed] = useState(() => new Set());
  useEffect(() => { setDismissed(new Set()); }, [quarter]);

  const items = CRISIS_EVENTS
    .filter(k => (riskMods[k] || 0) >= RISK_WARN && !dismissed.has(k))
    .sort((a, b) => (riskMods[b] || 0) - (riskMods[a] || 0));
  if (items.length === 0) return null;
  const criticalCount = items.filter(k => riskMods[k] >= RISK_CRITICAL).length;
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-stone-500 mb-2 px-1 flex items-center gap-2">
        <AlertTriangle size={10} className={criticalCount > 0 ? 'text-signal-bad' : 'text-accent-500'} />
        Impending Risks
        <span className="text-stone-400 font-mono tabular-nums">
          {items.length}
          {criticalCount > 0 && <span className="text-signal-bad"> · {criticalCount} critical</span>}
        </span>
      </div>
      <Stack gap="sm">
        {items.map(id => (
          <RiskBadge
            key={id}
            id={id}
            probability={riskMods[id]}
            onDismiss={() => setDismissed(prev => {
              const next = new Set(prev);
              next.add(id);
              return next;
            })}
          />
        ))}
      </Stack>
    </div>
  );
}

// === Row C: Whole-economy context ===========================================

function MetricPanel({ label, value, delta, deltaProps, color, points, sparkColor, onClick }) {
  const interactive = typeof onClick === 'function';
  const Tag = interactive ? 'button' : 'div';
  return (
    <Tag
      onClick={onClick}
      className={`block w-full text-left bg-treasury-900/55 border border-treasury-800 shadow-card rounded-lg p-2.5 ${interactive ? 'hover:border-accent-700/40 transition-colors cursor-pointer' : ''}`}>
      <div className="text-[9px] uppercase tracking-wider text-stone-500 mb-1 flex items-center gap-1.5">
        {label}
        {delta !== undefined && <Delta value={delta} {...(deltaProps || {})} />}
      </div>
      <div className="flex items-center justify-between gap-2">
        <div className={`text-[13px] md:text-[14px] font-mono font-semibold tabular-nums ${color || 'text-stone-200'}`}>
          {value}
        </div>
        {points && points.length >= 2 && (
          <Sparkline points={points} width={80} height={22} color={sparkColor || 'var(--accent-400)'} />
        )}
      </div>
    </Tag>
  );
}

function WholeEconomyStrip({ game, committed, onPopulationClick }) {
  const popM = game.population;
  const popDelta = committed ? popM - committed.population : null;
  const unempDelta = committed ? game.unemployment - committed.unemployment : null;
  const hpiDelta = committed ? game.housePriceIndex - committed.housePriceIndex : null;
  const energyDelta = committed ? game.energyPriceIndex - committed.energyPriceIndex : null;
  const inflationDelta = committed ? game.inflation - committed.inflation : null;
  const equityDelta = committed ? (game.equityIndex ?? 100) - (committed.equityIndex ?? 100) : null;
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-stone-500 mb-2 px-1">Wider Economy</div>
      <Grid cols={{ base: 2, md: 3, lg: 6 }} gap="sm">
        <MetricPanel
          label="Unemployment"
          value={`${game.unemployment.toFixed(1)}%`}
          delta={unempDelta}
          deltaProps={{ worseUp: true, threshold: 0.1 }}
          color={game.unemployment < 4.5 ? 'text-signal-good' : game.unemployment < 6 ? 'text-stone-200' : 'text-signal-bad'}
          points={game.unemploymentPath}
        />
        <MetricPanel
          label="Population"
          value={`${popM.toFixed(1)}m`}
          delta={popDelta !== null ? popDelta * 1000 : null}
          deltaProps={{ threshold: 5, decimals: 0, suffix: 'k' }}
          points={game.populationPath}
          onClick={onPopulationClick}
        />
        <MetricPanel
          label="Housing Index"
          value={game.housePriceIndex.toFixed(0)}
          delta={hpiDelta}
          deltaProps={{ threshold: 0.5 }}
          color={game.housePriceIndex > 130 ? 'text-signal-bad' : game.housePriceIndex > 115 ? 'text-accent-400' : 'text-stone-200'}
          points={game.housePricePath}
          sparkColor="#a78bfa"
        />
        <MetricPanel
          label="Energy Index"
          value={game.energyPriceIndex.toFixed(0)}
          delta={energyDelta}
          deltaProps={{ worseUp: true, threshold: 0.5 }}
          color={game.energyPriceIndex > 140 ? 'text-signal-bad' : game.energyPriceIndex > 115 ? 'text-accent-400' : 'text-stone-200'}
          points={game.energyPricePath}
          sparkColor="#f97316"
        />
        <MetricPanel
          label="Inflation"
          value={`${game.inflation.toFixed(1)}%`}
          delta={inflationDelta}
          deltaProps={{ worseUp: true, threshold: 0.1, decimals: 2 }}
          color={Math.abs(game.inflation - game.inflationTarget) < 0.5 ? 'text-signal-good' : Math.abs(game.inflation - game.inflationTarget) < 1.5 ? 'text-accent-400' : 'text-signal-bad'}
          points={game.inflationPath}
        />
        <MetricPanel
          label="Equities"
          value={(game.equityIndex ?? 100).toFixed(0)}
          delta={equityDelta}
          deltaProps={{ threshold: 0.5 }}
          color={(game.equityIndex ?? 100) > 130 ? 'text-signal-bad' : (game.equityIndex ?? 100) > 115 ? 'text-accent-400' : (game.equityIndex ?? 100) < 85 ? 'text-signal-bad' : 'text-stone-200'}
          points={game.equityPath}
          sparkColor="#34d399"
        />
      </Grid>
    </div>
  );
}

// === Row D: Reforms underway + Recent events (preserved) ====================

function ReformsCard({ allReforms }) {
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
              <MeterBar value={r.progress} tone={r.queued ? 'info' : 'accent'} />
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

// === Tab body ==============================================================

export function OverviewTab({
  game, committed, deficitGDP, debtRatio,
  revenue, spending, balance, balanceDiff, riskMods,
  onOpenLedger,
}) {
  const [showPopDetail, setShowPopDetail] = useState(false);

  // Reform list (unchanged from prior version).
  const inFlight = Object.entries(game.reforms)
    .filter(([_, r]) => r.status === 'inProgress')
    .map(([id, r]) => {
      const reform = REFORMS[id];
      const remaining = Math.max(0, r.completesQ - game.globalQuarter);
      const progress = reform ? ((reform.quarters - remaining) / reform.quarters) * 100 : 0;
      return {
        id, name: reform?.name || id,
        remaining, total: reform?.quarters || 1, progress, queued: false,
      };
    });
  const queued = game.proposedReforms.map((id) => {
    const reform = REFORMS[id];
    return {
      id, name: reform?.name || id,
      remaining: reform?.quarters || 0,
      total: reform?.quarters || 1,
      progress: 0, queued: true,
    };
  });
  const allReforms = [...inFlight, ...queued];

  // Last-quarter net population change for the modal.
  const popDelta = committed ? game.population - committed.population : 0;

  return (
    <Stack gap="lg">
      {/* Row A — fiscal panel + GDP. The fiscal panel leads with debt; deficit
          sits as a secondary line within it. View-full-ledger lives on the
          fiscal panel; GDP gets the right column. */}
      <Grid cols={{ base: 1, lg: 2 }} gap="md">
        <DebtPanel
          game={game} debtRatio={debtRatio}
          balance={balance} deficitGDP={deficitGDP}
          spending={spending} committed={committed}
          onOpenLedger={onOpenLedger}
        />
        <GdpChart game={game} />
      </Grid>

      {/* Row B — Impending risks (only renders when something is pending) */}
      <ImpendingRisks riskMods={riskMods || {}} quarter={game.quarter} />

      {/* Row C — Whole-economy context */}
      <WholeEconomyStrip
        game={game}
        committed={committed}
        onPopulationClick={() => setShowPopDetail(true)}
      />

      {/* Row D — Reforms + Recent events */}
      <TwoCol
        ratio="even"
        gap="lg"
        main={<ReformsCard allReforms={allReforms} />}
        side={<EventsCard log={game.log} />}
      />

      {showPopDetail && (
        <PopulationDetail
          game={game}
          populationChange={popDelta}
          onClose={() => setShowPopDetail(false)}
        />
      )}
    </Stack>
  );
}
