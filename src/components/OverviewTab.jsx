import React, { useState } from 'react';
import { AlertTriangle, ExternalLink } from 'lucide-react';
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

// UI copy — short driver hint that points the player at the lever they
// can pull. Not in the model: this is presentation, not calculation.
const EVENT_DRIVER_HINT = {
  nhsStrike: 'NHS underfunded',
  teacherStrike: 'Education underfunded',
  councilBankruptcy: 'Local Gov underfunded',
  civilUnrest: 'Justice underfunded',
  diplomaticIsolation: 'FCDO underfunded',
  independenceMovement: 'Devolved transfers squeezed',
  fuelPoverty: 'Welfare squeezed',
  careCrisis: 'Welfare squeezed',
  housingCrisis: 'Welfare / planning gap',
  recession: 'Cycle late',
  financialCrisis: 'Bond markets stressed',
  giltStrike: 'Gilt yields spiking',
  sovereignRatingAction: 'Debt sustainability eroded',
  ldiDoomLoop: 'LDI demand fragile',
  pensionFundCrisis: 'DB pension stress',
  sterlingSlide: 'Sterling under pressure',
  equityCrash: 'Equity overheated',
  commercialPropertyCrash: 'Property prices stretched',
  rateHikeShock: 'Tightening cycle',
  monetaryPolicyError: 'MPC misstep',
  wagePriceSpiral: 'Wage-price feedback',
  inflationSurprise: 'Inflation upside',
  cabinetScandal: 'Government discipline',
  devolutionDispute: 'Devolved transfers squeezed',
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

// === Row A: Fiscal triptych =================================================

function DebtPanel({ game, debtRatio, spending }) {
  return (
    <Card variant="raised" padding="md" className="h-full">
      <Card.Header>
        <Card.Eyebrow>National Debt</Card.Eyebrow>
        <Card.Meta>{debtRatio}% GDP</Card.Meta>
      </Card.Header>
      <div className="font-display text-2xl md:text-3xl font-medium tabular-nums text-stone-100 leading-none">
        £{(game.debt/1000).toFixed(2)}tn
      </div>
      <div className="mt-2 text-[10px] text-stone-500 font-mono space-y-0.5">
        <div className="flex justify-between">
          <span>Gilt yield (market)</span>
          <span className="text-stone-300 tabular-nums">{game.bondYield.toFixed(2)}%</span>
        </div>
        <div className="flex justify-between">
          <span>Effective rate on stock</span>
          <span className="text-stone-300 tabular-nums">{game.effectiveServicingRate.toFixed(2)}%</span>
        </div>
        <div className="flex justify-between">
          <span>Annual interest cost</span>
          <span className="text-signal-bad tabular-nums">£{spending.debtInterest.toFixed(0)}bn</span>
        </div>
      </div>
      {(game.debtRatioPath || []).length >= 2 && (
        <div className="w-full mt-3">
          <Sparkline points={game.debtRatioPath} width={400} height={48} responsive
                     color="var(--accent-400)" strokeWidth={1.75} dotRadius={2.5} />
          <div className="flex justify-between text-[9px] text-stone-500 mt-0.5 font-mono tabular-nums">
            <span>start</span>
            <span>now {debtRatio}%</span>
          </div>
        </div>
      )}
    </Card>
  );
}

function DeficitPanel({ game, balance, deficitGDP, balanceDiff, spending }) {
  const tone = balance >= 0 ? 'good' : deficitGDP < 2 ? 'warn' : 'bad';
  const valueColor = balance >= 0 ? 'text-signal-good' : deficitGDP < 2 ? 'text-accent-300' : 'text-signal-bad';
  const heading = balance >= 0 ? 'Surplus' : deficitGDP < 2 ? 'Sustainable Deficit' : 'Deficit';
  // Top 3 spending categories driving the bottom line.
  const drivers = [
    ['Departmental', spending.departmental],
    ['Pensions & locked', spending.fixed],
    ['Reform ongoing', spending.reformOngoing],
    ['Debt interest', spending.debtInterest],
  ].filter(([_, v]) => v > 0).sort((a, b) => b[1] - a[1]).slice(0, 3);
  return (
    <Card variant="signal" tone={tone} padding="md" className="h-full">
      <Card.Header>
        <Card.Eyebrow className={tone === 'good' ? 'text-signal-good' : tone === 'warn' ? 'text-accent-400' : 'text-signal-bad'}>
          {heading}
        </Card.Eyebrow>
        {balanceDiff !== null && Math.abs(balanceDiff) >= 0.5 && (
          <Card.Meta className={`font-mono tabular-nums ${balanceDiff > 0 ? 'text-signal-good' : 'text-signal-bad'}`}>
            {balanceDiff > 0 ? '+' : ''}{balanceDiff.toFixed(0)} vs Q{game.quarter - 1}
          </Card.Meta>
        )}
      </Card.Header>
      <div className={`font-display text-2xl md:text-3xl font-medium tabular-nums leading-none ${valueColor}`}>
        {fmtSigned(balance)}
      </div>
      <div className="text-[10px] text-stone-500 mt-1">
        {deficitGDP.toFixed(1)}% of GDP
        {deficitGDP < 2 && balance < 0 && ' · OBR-sustainable'}
      </div>
      {(game.deficitRatioPath || []).length >= 2 && (
        <div className="w-full mt-3">
          <Sparkline points={game.deficitRatioPath} width={400} height={42} responsive
                     color="var(--accent-400)" strokeWidth={1.75} dotRadius={2.5} />
        </div>
      )}
      <div className="mt-3 pt-2 border-t border-treasury-800/70 space-y-0.5 text-[10px] font-mono">
        <div className="text-stone-500 uppercase tracking-wider mb-0.5">Top spend lines</div>
        {drivers.map(([label, value]) => (
          <div key={label} className="flex justify-between">
            <span className="text-stone-400">{label}</span>
            <span className="text-stone-300 tabular-nums">£{value.toFixed(0)}bn</span>
          </div>
        ))}
      </div>
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

function RiskBadge({ id, probability }) {
  const critical = probability >= RISK_CRITICAL;
  const tone = critical ? 'bad' : 'warn';
  const labelColor = critical ? 'text-signal-bad' : 'text-accent-400';
  const iconCls = critical ? 'text-signal-bad animate-pulse-soft' : 'text-accent-400';
  const title = EVENT_DEFINITIONS[id]?.title || id;
  const hint = EVENT_DRIVER_HINT[id];
  return (
    <Card variant="signal" tone={tone} padding="sm">
      <div className="flex items-center gap-2.5">
        <AlertTriangle size={14} className={`flex-shrink-0 ${iconCls}`} />
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2">
            <span className="text-[12px] font-semibold text-stone-100 truncate">{title}</span>
            <span className={`text-[10px] uppercase tracking-wider font-semibold ${labelColor} flex-shrink-0`}>
              {critical ? 'Critical' : 'Watch'}
            </span>
          </div>
          {hint && <div className="text-[10px] text-stone-500 mt-0.5 truncate">{hint}</div>}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <MeterBar value={Math.min(100, probability * 1.5)}
                    tone={critical ? 'bad' : 'warn'} size="xs"
                    className="w-16" />
          <span className="text-[11px] font-mono tabular-nums text-stone-300 w-10 text-right">
            {Math.round(probability)}%
          </span>
        </div>
      </div>
    </Card>
  );
}

function ImpendingRisks({ riskMods }) {
  const items = CRISIS_EVENTS
    .filter(k => (riskMods[k] || 0) >= RISK_WARN)
    .sort((a, b) => (riskMods[b] || 0) - (riskMods[a] || 0));
  if (items.length === 0) return null;
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-stone-500 mb-2 px-1 flex items-center gap-2">
        <AlertTriangle size={10} className="text-accent-500" />
        Impending Risks
      </div>
      <Stack gap="sm">
        {items.map(id => <RiskBadge key={id} id={id} probability={riskMods[id]} />)}
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
      {/* Row A — Fiscal triptych */}
      <div>
        <Grid cols={{ base: 1, lg: 3 }} gap="md">
          <DebtPanel game={game} debtRatio={debtRatio} spending={spending} />
          <DeficitPanel game={game} balance={balance} deficitGDP={deficitGDP}
                        balanceDiff={balanceDiff} spending={spending} />
          <GdpChart game={game} />
        </Grid>
        <div className="mt-2 flex justify-end">
          <button onClick={onOpenLedger}
                  className="inline-flex items-center gap-1 text-[11px] text-accent-400 hover:text-accent-300 transition-colors">
            View full ledger <ExternalLink size={11} />
          </button>
        </div>
      </div>

      {/* Row B — Impending risks (only renders when something is pending) */}
      <ImpendingRisks riskMods={riskMods || {}} />

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
