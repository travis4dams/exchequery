import React, { useState, useEffect, useMemo } from 'react';
import { Crown, ChevronRight, RotateCcw, Receipt, Hammer, Calendar, BookOpen, LineChart, Landmark } from 'lucide-react';

import {
  PARAMS,
  INITIAL_BLOC_SUPPORT,
  INITIAL_BLOC_WEIGHTS,
  REFORMS,
  EVENT_DEFINITIONS,
  calcCoalitionCohesion,
  calcOverallApproval,
  calcRevenue,
  calcSpending,
  calcBalance,
  quarterlyBlocDelta,
  computeRiskMods,
  makeInitialState,
  reformCapacityLoad,
  calcReformCapacity,
  calcReformLoadInFlight,
  pcCostBreakdown,
  stepQuarter,
  resolveEvent as modelResolveEvent,
  dismissSummary as modelDismissSummary,
  commitSurplusAllocation as modelCommitSurplusAllocation,
  continueAfterElection as modelContinueAfterElection,
  cancelReform as modelCancelReform,
  projectNextQuarter,
} from './model/index.js';

import { Intro } from './components/modals/Intro.jsx';
import { EventModal } from './components/modals/EventModal.jsx';
import { QuarterSummary } from './components/modals/QuarterSummary.jsx';
import { SurplusAllocModal } from './components/modals/SurplusAllocModal.jsx';
import { InspectReform } from './components/modals/InspectReform.jsx';
import { LedgerDetail } from './components/modals/LedgerDetail.jsx';
import { Reelect } from './components/modals/Reelect.jsx';
import { FinalModal } from './components/modals/FinalModal.jsx';

import { OverviewTab } from './components/OverviewTab.jsx';
import { BudgetTab } from './components/BudgetTab.jsx';
import { ReformsTab } from './components/ReformsTab.jsx';
import { MarketsTab } from './components/MarketsTab.jsx';
import { AboutTab } from './components/AboutTab.jsx';
import { PoliticsTab } from './components/PoliticsTab.jsx';

import { Container } from './components/primitives/Layout.jsx';
import { Stat, ProjectionCaret } from './components/primitives/Stat.jsx';
import { MeterBar } from './components/primitives/MeterBar.jsx';

const v = (leaf) => (leaf && typeof leaf === 'object' && 'value' in leaf) ? leaf.value : leaf;

const TERM_LENGTH = v(PARAMS.termLength);
const COALITION_FLOOR = v(PARAMS.coalitionFloor);
const BOND_YIELD_CEILING = v(PARAMS.bondYieldCeiling);
const REELECT_THRESHOLD = v(PARAMS.reelectionCoalitionThreshold);

const INITIAL = makeInitialState({
  initialBlocSupport: INITIAL_BLOC_SUPPORT,
  initialBlocWeights: INITIAL_BLOC_WEIGHTS,
});

const fmtSigned = (n) => (n >= 0 ? '+' : '−') + (Math.abs(n) >= 1000 ? `£${(Math.abs(n)/1000).toFixed(1)}tn` : `£${Math.abs(n).toFixed(0)}bn`);

export default function ChancellorSim() {
  const [game, setGame] = useState(INITIAL);
  const [tab, setTab] = useState('overview');
  const [showIntro, setShowIntro] = useState(true);
  const [showFinal, setShowFinal] = useState(false);
  const [showReelect, setShowReelect] = useState(false);
  const [inspectReform, setInspectReform] = useState(null);
  const [showSurplusAlloc, setShowSurplusAlloc] = useState(false);
  const [showLedgerDetail, setShowLedgerDetail] = useState(false);
  const [surplusAllocations, setSurplusAllocations] = useState({});

  useEffect(() => {
    try {
      // v7 is the current save shape. v6 saves predate BoE + Parliament state
      // and would NaN-cascade on the first quarter; drop them rather than
      // attempt migration.
      localStorage.removeItem('chancellor_v6_save');
      const saved = localStorage.getItem('chancellor_v7_save');
      if (saved) {
        const parsed = JSON.parse(saved);
        // Migrate legacy saves: pendingEvent (object) → pendingEvents (queue).
        if (!Array.isArray(parsed.pendingEvents)) {
          parsed.pendingEvents = parsed.pendingEvent?.id ? [parsed.pendingEvent.id] : [];
        }
        if (parsed.pandemicDamper == null) parsed.pandemicDamper = 1;
        setGame(parsed);
        setShowIntro(false);
      }
    } catch (e) {}
  }, []);

  useEffect(() => {
    if (game.quarter > 1 || Object.keys(game.reforms).length > 0 || game.proposedReforms.length > 0) {
      try { localStorage.setItem('chancellor_v7_save', JSON.stringify(game)); } catch (e) {}
    }
  }, [game]);

  const overallApproval = useMemo(() => calcOverallApproval(game.blocSupport, game.blocWeights), [game.blocSupport, game.blocWeights]);
  const coalitionCohesion = useMemo(() => calcCoalitionCohesion(game.blocSupport, game.blocWeights), [game.blocSupport, game.blocWeights]);
  const balance = useMemo(() => calcBalance(game), [game]);
  const revenue = useMemo(() => calcRevenue(game), [game]);
  const spending = useMemo(() => calcSpending(game), [game]);
  const riskMods = useMemo(() => computeRiskMods(game), [game]);
  const projectedDeltas = useMemo(() => quarterlyBlocDelta(game), [game]);
  const reformCapacity = useMemo(() => calcReformCapacity(game), [game]);
  const reformLoadInFlight = useMemo(() => calcReformLoadInFlight(game), [game]);
  const queuedPcCost = useMemo(
    () => game.proposedReforms.reduce(
      (s, id) => s + (REFORMS[id] ? pcCostBreakdown(REFORMS[id], { ...game, coalitionCohesion }).total : 0),
      0,
    ),
    [game.proposedReforms, game, coalitionCohesion],
  );
  const projection = useMemo(() => projectNextQuarter(game), [game]);
  const projectedCohesion = useMemo(
    () => calcCoalitionCohesion(projection.blocSupport, projection.blocWeights),
    [projection],
  );
  const projectedBalance = useMemo(() => calcBalance(projection), [projection]);
  const dCohesion = projectedCohesion - coalitionCohesion;
  const dGDP = projection.gdp - game.gdp;
  const dGilts = projection.bondYield - game.bondYield;
  const dInflation = projection.inflation - game.inflation;
  const dGini = projection.gini - game.gini;
  const dPC = projection.politicalCapital - game.politicalCapital;
  const dHealth = projection.healthIndex - game.healthIndex;
  const inflationTowardTarget =
    Math.abs(projection.inflation - game.inflationTarget) < Math.abs(game.inflation - game.inflationTarget);
  const deficit = -balance;
  const deficitGDP = deficit / game.gdp * 100;
  const debtRatio = (game.debt / game.gdp * 100).toFixed(0);
  const committed = game.committed;
  // Top-bar Balance is the *live* slider-affected figure; the caret then
  // shows next-quarter projection drift relative to it. The stable
  // committed-books reading lives on the Overview's fiscal panel.
  const dBalance = projectedBalance - balance;
  const yearQ = ((game.quarter - 1) % 4) + 1;
  const yearInTerm = Math.ceil(game.quarter / 4);

  function set(patch) { setGame(g => ({ ...g, ...patch })); }
  function proposeReform(id) { setGame(g => ({ ...g, proposedReforms: [...g.proposedReforms, id] })); }
  function unproposeReform(id) { setGame(g => ({ ...g, proposedReforms: g.proposedReforms.filter(rid => rid !== id) })); }

  function cancelReform(id) {
    setGame(g => modelCancelReform(g, id));
  }

  const pendingEventCount = (game.pendingEvents || []).length;
  const currentPendingEventDef = pendingEventCount > 0
    ? EVENT_DEFINITIONS[game.pendingEvents[0]]
    : null;
  const currentPendingEvent = currentPendingEventDef
    ? { id: game.pendingEvents[0], ...currentPendingEventDef }
    : null;
  const initialBriefCount = game.pendingSummary?.eventQueueLength ?? pendingEventCount;
  const briefIndex = Math.max(1, initialBriefCount - pendingEventCount + 1);

  function advanceQuarter() {
    if (pendingEventCount > 0 || game.pendingSummary || showReelect || showSurplusAlloc) return;
    setGame(g => stepQuarter(g));
  }

  useEffect(() => {
    const eventsClear = pendingEventCount === 0;
    if (game.status === 'election' && !game.pendingSummary && eventsClear && !showReelect) setShowReelect(true);
    if (['collapsed', 'lost-markets', 'lost-election'].includes(game.status) && !game.pendingSummary && eventsClear && !showFinal) setShowFinal(true);
  }, [game.status, game.pendingSummary, pendingEventCount, showFinal, showReelect]);

  function continueAfterElection() {
    setGame(g => modelContinueAfterElection(g));
    setShowReelect(false);
  }

  function resolveEvent(choice) {
    setGame(g => modelResolveEvent(g, choice, { eventDef: currentPendingEventDef }));
  }

  function dismissSummary() {
    const { state, needsSurplusAllocation } = modelDismissSummary(game);
    if (needsSurplusAllocation) {
      setSurplusAllocations({ debt: state.pendingSurplus, services: 0, taxCut: 0 });
    }
    setGame(state);
    if (needsSurplusAllocation) setShowSurplusAlloc(true);
  }

  function commitSurplusAllocation() {
    setGame(g => modelCommitSurplusAllocation(g, surplusAllocations));
    setShowSurplusAlloc(false);
    setSurplusAllocations({});
  }

  function reset() {
    try { localStorage.removeItem('chancellor_v7_save'); } catch (e) {}
    setGame(INITIAL); setShowIntro(true); setShowFinal(false); setShowReelect(false); setTab('overview');
  }

  function canStartReform(id) {
    const reform = REFORMS[id];
    if (game.reforms[id]) return false;
    if (game.proposedReforms.includes(id)) return false;
    if (!reform.prereq.every(p => game.reforms[p]?.status === 'complete')) return false;
    return reformLoadInFlight + reformCapacityLoad(reform) <= reformCapacity;
  }

  const balanceDiff = committed ? balance - committed.balance : null;

  return (
    <div className="min-h-screen text-stone-100 font-sans app-background">
      {showIntro && <Intro onDismiss={() => setShowIntro(false)} />}
      {inspectReform && <InspectReform reform={inspectReform} forecastMultiplier={game.forecastNoiseMultiplier ?? 1} onClose={() => setInspectReform(null)} />}
      {showLedgerDetail && (
        <LedgerDetail
          game={game} revenue={revenue} spending={spending}
          balance={balance} balanceDiff={balanceDiff}
          deficitGDP={deficitGDP} debtRatio={debtRatio}
          committed={committed}
          onClose={() => setShowLedgerDetail(false)}
        />
      )}
      {game.pendingSummary && !showIntro && (
        <QuarterSummary summary={game.pendingSummary} growth={game.growth} population={game.population} onContinue={dismissSummary} />
      )}
      {currentPendingEvent && !showIntro && !game.pendingSummary && !showSurplusAlloc && (
        <EventModal
          event={currentPendingEvent}
          onChoice={resolveEvent}
          briefIndex={briefIndex}
          briefTotal={initialBriefCount}
        />
      )}
      {showReelect && (
        <Reelect term={game.term} coalitionCohesion={coalitionCohesion} balance={balance} deficitGDP={deficitGDP}
          reformsDelivered={Object.values(game.reforms).filter(r => r.status === 'complete').length}
          onContinue={continueAfterElection} />
      )}
      {showSurplusAlloc && (
        <SurplusAllocModal pendingSurplus={game.pendingSurplus}
          allocations={surplusAllocations} setAllocations={setSurplusAllocations}
          onCommit={commitSurplusAllocation} />
      )}
      {showFinal && (
        <FinalModal game={game} balance={balance} coalitionCohesion={coalitionCohesion} onReset={reset} />
      )}

      <div className="sticky top-0 z-30 backdrop-blur-md border-b border-treasury-800/60 bg-treasury-900/90">
        <Container size="wide" className="pt-3 pb-3">
          {/* Top strip — Term n (left) · progress bar (middle) · Y/Q + election countdown + reset (right). */}
          <div className="flex items-center gap-3 mb-2">
            <div className="flex items-center gap-2 flex-shrink-0">
              <Crown size={14} className="text-accent-500" />
              <div className="text-[10px] uppercase tracking-[0.22em] text-stone-400 font-sans whitespace-nowrap">
                Term {game.term}
              </div>
            </div>
            <div className="flex-1 min-w-[60px]" title={`Q${game.quarter} of ${TERM_LENGTH}`}>
              <MeterBar value={(game.quarter / TERM_LENGTH) * 100} tone="accent" size="xs" />
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <div className="text-[10px] uppercase tracking-[0.22em] text-stone-400 font-sans whitespace-nowrap">
                Y{yearInTerm} Q{yearQ}
                <span className="hidden sm:inline"> · {Math.max(0, TERM_LENGTH - game.quarter + 1)}Q to Election</span>
              </div>
              <button onClick={reset} aria-label="Reset game"
                      className="text-stone-500 hover:text-stone-200 transition-colors p-1 -m-1">
                <RotateCcw size={13} />
              </button>
            </div>
          </div>

          {/* Hero figures: cohesion / GDP / balance. Mobile: 3-col compact.
              Desktop: same 3 columns, more breathing room and a brass rule
              between this row and the secondary stats below. */}
          <div className="grid grid-cols-3 gap-3 md:gap-6 items-end pb-3 border-b border-treasury-800/70 relative">
            <span aria-hidden className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-accent-600/40 to-transparent" />

            <div>
              <div className="text-[10px] uppercase tracking-wider text-stone-500 mb-0.5 flex items-center gap-1.5 flex-wrap">
                Cohesion
                <ProjectionCaret value={dCohesion} threshold={0.1} decimals={1} worseUp={false} />
              </div>
              <div className={`font-display text-2xl md:text-3xl font-medium tabular-nums leading-none ${
                coalitionCohesion >= REELECT_THRESHOLD ? 'text-signal-good' : coalitionCohesion >= 28 ? 'text-accent-400' : 'text-signal-bad'
              }`}>{coalitionCohesion.toFixed(0)}%</div>
              <div className="text-[10px] text-stone-500 mt-1">Overall {overallApproval.toFixed(0)}% · Floor {COALITION_FLOOR}%</div>
            </div>

            <div className="text-center">
              <div className="text-[10px] uppercase tracking-wider text-stone-500 mb-0.5 flex items-center justify-center gap-1.5 flex-wrap">
                GDP
                <ProjectionCaret value={dGDP} threshold={1} decimals={0} worseUp={false} suffix="bn" />
              </div>
              <div className="font-display text-2xl md:text-3xl font-medium tabular-nums leading-none text-stone-100">
                £{(game.gdp/1000).toFixed(2)}tn
              </div>
              <div className={`text-[10px] mt-1 ${game.growth > 1.5 ? 'text-signal-good' : game.growth > 0 ? 'text-stone-400' : 'text-signal-bad'}`}>
                {game.growth.toFixed(1)}% growth
              </div>
            </div>

            <div className="text-right">
              <div className="text-[10px] uppercase tracking-wider text-stone-500 mb-0.5 flex items-center justify-end gap-1.5 flex-wrap">
                <ProjectionCaret value={dBalance} threshold={0.5} decimals={0} worseUp={false} />
                Balance
              </div>
              <div className={`font-display text-2xl md:text-3xl font-medium tabular-nums leading-none ${balance >= 0 ? 'text-signal-good' : 'text-signal-bad'}`}>
                {fmtSigned(balance)}
              </div>
              <div className={`text-[10px] mt-1 ${deficitGDP < 2 ? 'text-signal-good' : deficitGDP < 4 ? 'text-accent-400' : 'text-signal-bad'}`}>
                {balance >= 0 ? 'Surplus' : `${deficitGDP.toFixed(1)}% deficit · Debt ${debtRatio}%`}
              </div>
            </div>
          </div>

          {/* Secondary metrics: Growth is already implied under GDP above,
              so this strip carries Health (the social proxy), Gini, Inflation,
              Gilts, and PC. */}
          <div className="grid grid-cols-5 gap-2 pt-3">
            <Stat label="Health" value={game.healthIndex.toFixed(0)}
                  color={game.healthIndex >= 55 ? 'text-signal-good' : game.healthIndex >= 45 ? 'text-stone-200' : 'text-signal-bad'}
                  delta={dHealth} deltaThreshold={0.3} decimals={1} />
            <Stat label="Gini" value={game.gini.toFixed(1)}
                  color={game.gini < 34 ? 'text-signal-good' : game.gini < 36 ? 'text-stone-200' : 'text-signal-bad'}
                  delta={dGini} deltaThreshold={0.1} decimals={2} worseUp />
            <Stat label="Inflation" value={`${game.inflation.toFixed(1)}%`}
                  color={Math.abs(game.inflation - game.inflationTarget) < 0.5 ? 'text-signal-good' : Math.abs(game.inflation - game.inflationTarget) < 1.5 ? 'text-accent-400' : 'text-signal-bad'}
                  delta={dInflation} deltaThreshold={0.1} decimals={2} deltaGood={inflationTowardTarget} />
            <Stat label="Gilts" value={`${game.bondYield.toFixed(1)}%`}
                  color={game.bondYield < 4 ? 'text-signal-good' : game.bondYield < 5.5 ? 'text-stone-200' : 'text-signal-bad'}
                  delta={dGilts} deltaThreshold={0.1} decimals={2} worseUp />
            <Stat label="PC" value={game.politicalCapital.toFixed(0)}
                  color={game.politicalCapital >= 50 ? 'text-accent-400' : game.politicalCapital >= 25 ? 'text-stone-200' : 'text-signal-bad'}
                  delta={dPC} deltaThreshold={0.5} decimals={0} />
          </div>
        </Container>

        {/* Tab strip — icons-only on mobile to save width, icons+labels on md+.
            With 6 tabs the strip now fits 360px-wide phones without scrolling. */}
        <Container size="wide" className="!px-1 md:!px-5">
          <div className="flex border-t border-treasury-800/60">
            {[
              {id: 'overview', label: 'Overview', icon: Calendar},
              {id: 'budget', label: 'Budget', icon: Receipt},
              {id: 'reforms', label: 'Reforms', icon: Hammer},
              {id: 'politics', label: 'Politics', icon: Landmark},
              {id: 'markets', label: 'Markets', icon: LineChart},
              {id: 'about', label: 'About', icon: BookOpen},
            ].map(t => {
              const active = tab === t.id;
              return (
                <button key={t.id} onClick={() => setTab(t.id)} aria-pressed={active}
                        aria-label={t.label} title={t.label}
                        className={`flex-1 py-2.5 md:py-3 text-[11px] md:text-[12px] font-medium flex items-center justify-center gap-1.5 transition-colors border-b-2 ${
                          active
                            ? 'border-accent-500 text-accent-400'
                            : 'border-transparent text-stone-500 hover:text-stone-300 hover:border-treasury-700'
                        }`}>
                  <t.icon size={14} />
                  <span className="hidden md:inline whitespace-nowrap">{t.label}</span>
                </button>
              );
            })}
          </div>
        </Container>
      </div>

      <Container size="wide" className="pt-5 md:pt-8 pb-32 md:pb-28">
        {tab === 'overview' && (
          <OverviewTab
            game={game} committed={committed}
            deficitGDP={deficitGDP} debtRatio={debtRatio}
            revenue={revenue} spending={spending}
            balance={balance} balanceDiff={balanceDiff}
            riskMods={riskMods}
            onOpenLedger={() => setShowLedgerDetail(true)}
          />
        )}
        {tab === 'budget' && <BudgetTab game={game} committed={committed} set={set} />}
        {tab === 'reforms' && (
          <ReformsTab game={game} coalitionCohesion={coalitionCohesion}
            canStartReform={canStartReform} proposeReform={proposeReform}
            unproposeReform={unproposeReform} cancelReform={cancelReform}
            reformCapacity={reformCapacity} reformLoadInFlight={reformLoadInFlight}
            onInspect={setInspectReform} />
        )}
        {tab === 'politics' && <PoliticsTab game={game} projectedDeltas={projectedDeltas} />}
        {tab === 'markets' && <MarketsTab game={game} spending={spending} />}
        {tab === 'about' && <AboutTab />}
      </Container>

      {!showIntro && !showFinal && !showReelect && !showSurplusAlloc && pendingEventCount === 0 && !game.pendingSummary && (
        <div className="fixed bottom-0 left-0 right-0 z-20 backdrop-blur-md border-t border-treasury-800/80 bg-treasury-900/92">
          <Container size="wide" className="py-3">
            <div className="flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <div className="text-[9px] uppercase tracking-wider text-stone-500">Quarter Status</div>
                <div className="text-[11px] md:text-[12px] text-stone-300 truncate">
                  {game.proposedReforms.length > 0 && (
                    <span className="text-signal-info">
                      {game.proposedReforms.length} queued ({queuedPcCost.toFixed(0)} PC) ·{' '}
                    </span>
                  )}
                  {Object.values(game.reforms).filter(r => r.status === 'inProgress').length} in flight ·
                  {' '}<span className={reformLoadInFlight >= reformCapacity ? 'text-accent-400' : 'text-stone-400'}>Cap {reformLoadInFlight}/{reformCapacity}</span>
                </div>
              </div>
              <button onClick={advanceQuarter}
                      className="bg-accent-600 hover:bg-accent-500 active:bg-accent-700 text-treasury-950 font-semibold px-5 py-2.5 md:px-6 md:py-3 rounded-md flex items-center gap-1.5 text-sm md:text-base shadow-glow-amber transition-all">
                Next Quarter <ChevronRight size={15} />
              </button>
            </div>
          </Container>
        </div>
      )}
    </div>
  );
}
