import React, { useState, useEffect, useMemo } from 'react';
import { Crown, ChevronRight, RotateCcw, Receipt, Hammer, FileText, Calendar, AlertTriangle, BookOpen, LineChart, Landmark } from 'lucide-react';

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
import { Reelect } from './components/modals/Reelect.jsx';
import { FinalModal } from './components/modals/FinalModal.jsx';

import { OverviewTab } from './components/OverviewTab.jsx';
import { BudgetTab } from './components/BudgetTab.jsx';
import { ReformsTab } from './components/ReformsTab.jsx';
import { RisksTab } from './components/RisksTab.jsx';
import { LedgerTab } from './components/LedgerTab.jsx';
import { MarketsTab } from './components/MarketsTab.jsx';
import { AboutTab } from './components/AboutTab.jsx';
import { PoliticsTab } from './components/PoliticsTab.jsx';

const v = (leaf) => (leaf && typeof leaf === 'object' && 'value' in leaf) ? leaf.value : leaf;

const FONT_LINK = `@import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600;9..144,700&family=IBM+Plex+Sans:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600&display=swap');`;

const TERM_LENGTH = v(PARAMS.termLength);
const COALITION_FLOOR = v(PARAMS.coalitionFloor);
const BOND_YIELD_CEILING = v(PARAMS.bondYieldCeiling);
const REELECT_THRESHOLD = v(PARAMS.reelectionCoalitionThreshold);

const INITIAL = makeInitialState({
  initialBlocSupport: INITIAL_BLOC_SUPPORT,
  initialBlocWeights: INITIAL_BLOC_WEIGHTS,
});

const fmtSigned = (n) => (n >= 0 ? '+' : '−') + (Math.abs(n) >= 1000 ? `£${(Math.abs(n)/1000).toFixed(1)}tn` : `£${Math.abs(n).toFixed(0)}bn`);

// Projected-delta caret. `worseUp` flips the favourability sense for metrics
// where higher = bad (gilts, gini). `deltaGood` lets callers override the
// sign-based judgement entirely (used for inflation, which is favourable when
// moving toward the target regardless of sign).
function ProjectionCaret({ value, threshold = 0.1, decimals = 1, worseUp = false, deltaGood, suffix = '' }) {
  if (value === null || value === undefined || Number.isNaN(value)) return null;
  if (Math.abs(value) < threshold) return null;
  const good = deltaGood !== undefined ? deltaGood : (worseUp ? value < 0 : value > 0);
  const sign = value > 0 ? '+' : '−';
  return (
    <span className={`text-[9px] ${good ? 'text-emerald-400' : 'text-rose-400'}`}
          style={{fontFamily: 'IBM Plex Mono'}}>
      {sign}{Math.abs(value).toFixed(decimals)}{suffix}
    </span>
  );
}

function StatCell({ label, value, color, delta, deltaThreshold, decimals, worseUp, deltaGood }) {
  return (
    <div>
      <div className="text-[9px] uppercase tracking-wider text-stone-500 flex items-center justify-center gap-1">
        {label}
        <ProjectionCaret value={delta} threshold={deltaThreshold} decimals={decimals}
                         worseUp={worseUp} deltaGood={deltaGood} />
      </div>
      <div className={`text-[11px] font-semibold ${color}`}
           style={{fontFamily: 'IBM Plex Mono'}}>{value}</div>
    </div>
  );
}

export default function ChancellorSim() {
  const [game, setGame] = useState(INITIAL);
  const [tab, setTab] = useState('overview');
  const [showIntro, setShowIntro] = useState(true);
  const [showFinal, setShowFinal] = useState(false);
  const [showReelect, setShowReelect] = useState(false);
  const [inspectReform, setInspectReform] = useState(null);
  const [showSurplusAlloc, setShowSurplusAlloc] = useState(false);
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
  const dBalance = projectedBalance - balance;
  const dGDP = projection.gdp - game.gdp;
  const dGrowth = projection.growth - game.growth;
  const dGilts = projection.bondYield - game.bondYield;
  const dInflation = projection.inflation - game.inflation;
  const dGini = projection.gini - game.gini;
  const dPC = projection.politicalCapital - game.politicalCapital;
  const inflationTowardTarget =
    Math.abs(projection.inflation - game.inflationTarget) < Math.abs(game.inflation - game.inflationTarget);
  const deficit = -balance;
  const deficitGDP = deficit / game.gdp * 100;
  const debtRatio = (game.debt / game.gdp * 100).toFixed(0);
  const committed = game.committed;
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
    <div className="min-h-screen text-stone-100" style={{
      background: 'radial-gradient(ellipse at top, #2a2418 0%, #14110c 60%, #0d0b08 100%)',
      fontFamily: 'IBM Plex Sans, sans-serif'
    }}>
      <style>{FONT_LINK}</style>
      <style>{`
        input[type=range]::-webkit-slider-thumb {
          appearance: none; width: 18px; height: 18px; border-radius: 50%;
          background: #d97706; cursor: pointer; border: 2px solid #1c1a14;
        }
        input[type=range]::-moz-range-thumb {
          width: 18px; height: 18px; border-radius: 50%;
          background: #d97706; cursor: pointer; border: 2px solid #1c1a14;
        }
        .display-font { font-family: 'Fraunces', Georgia, serif; }
      `}</style>

      {showIntro && <Intro onDismiss={() => setShowIntro(false)} />}
      {inspectReform && <InspectReform reform={inspectReform} forecastNoise={game.forecastNoise} onClose={() => setInspectReform(null)} />}
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

      <div className="sticky top-0 z-30 backdrop-blur-md border-b border-stone-800/60"
           style={{background: 'rgba(20, 17, 12, 0.92)'}}>
        <div className="max-w-md mx-auto px-4 pt-3 pb-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Crown size={14} className="text-amber-500" />
              <div className="text-[10px] uppercase tracking-[0.18em] text-stone-400">
                Term {game.term} · Y{yearInTerm} Q{yearQ} · {Math.max(0, TERM_LENGTH - game.quarter + 1)}Q to Election
              </div>
            </div>
            <button onClick={reset} className="text-stone-500 hover:text-stone-300"><RotateCcw size={13} /></button>
          </div>
          <div className="grid grid-cols-3 gap-2 items-end mb-3">
            <div>
              <div className="text-[10px] uppercase tracking-wider text-stone-500 mb-0.5 flex items-center gap-1.5 flex-wrap">
                Cohesion
                <ProjectionCaret value={dCohesion} threshold={0.1} decimals={1} worseUp={false} />
              </div>
              <div className={`display-font text-3xl font-medium tabular-nums leading-none ${
                coalitionCohesion >= REELECT_THRESHOLD ? 'text-emerald-400' : coalitionCohesion >= 28 ? 'text-amber-400' : 'text-rose-400'
              }`}>{coalitionCohesion.toFixed(0)}%</div>
              <div className="text-[10px] text-stone-500 mt-1">Overall {overallApproval.toFixed(0)}% · Floor {COALITION_FLOOR}%</div>
            </div>
            <div className="text-center">
              <div className="text-[10px] uppercase tracking-wider text-stone-500 mb-0.5 flex items-center justify-center gap-1.5 flex-wrap">
                GDP
                <ProjectionCaret value={dGDP} threshold={1} decimals={0} worseUp={false} suffix="bn" />
              </div>
              <div className="display-font text-2xl font-medium tabular-nums leading-none text-stone-100">
                £{(game.gdp/1000).toFixed(2)}tn
              </div>
              <div className={`text-[10px] mt-1 flex items-center justify-center gap-1.5 ${game.growth > 1.5 ? 'text-emerald-400' : game.growth > 0 ? 'text-stone-400' : 'text-rose-400'}`}>
                {game.growth.toFixed(1)}% growth
              </div>
            </div>
            <div className="text-right">
              <div className="text-[10px] uppercase tracking-wider text-stone-500 mb-0.5 flex items-center justify-end gap-1.5 flex-wrap">
                <ProjectionCaret value={dBalance} threshold={0.5} decimals={0} worseUp={false} />
                Balance
              </div>
              <div className={`text-xl font-bold tabular-nums ${balance >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}
                   style={{fontFamily: 'IBM Plex Mono'}}>{fmtSigned(balance)}</div>
              <div className={`text-[10px] mt-0.5 ${deficitGDP < 2 ? 'text-emerald-400' : deficitGDP < 4 ? 'text-amber-400' : 'text-rose-400'}`}>
                {balance >= 0 ? 'Surplus' : `${deficitGDP.toFixed(1)}% deficit · Debt ${debtRatio}%`}
              </div>
            </div>
          </div>
          <div className="grid grid-cols-5 gap-1 text-center">
            <StatCell label="Growth" value={`${game.growth.toFixed(1)}%`}
                      color={game.growth > 1.5 ? 'text-emerald-400' : game.growth > 0 ? 'text-stone-200' : 'text-rose-400'}
                      delta={dGrowth} deltaThreshold={0.1} decimals={1} worseUp={false} />
            <StatCell label="Gilts" value={`${game.bondYield.toFixed(1)}%`}
                      color={game.bondYield < 4 ? 'text-emerald-400' : game.bondYield < 5.5 ? 'text-stone-200' : 'text-rose-400'}
                      delta={dGilts} deltaThreshold={0.1} decimals={2} worseUp={true} />
            <StatCell label="Inflation" value={`${game.inflation.toFixed(1)}%`}
                      color={Math.abs(game.inflation - game.inflationTarget) < 0.5 ? 'text-emerald-400' : Math.abs(game.inflation - game.inflationTarget) < 1.5 ? 'text-amber-400' : 'text-rose-400'}
                      delta={dInflation} deltaThreshold={0.1} decimals={2}
                      deltaGood={inflationTowardTarget} />
            <StatCell label="Gini" value={game.gini.toFixed(1)}
                      color={game.gini < 34 ? 'text-emerald-400' : game.gini < 36 ? 'text-stone-200' : 'text-rose-400'}
                      delta={dGini} deltaThreshold={0.1} decimals={2} worseUp={true} />
            <StatCell label="PC" value={game.politicalCapital.toFixed(0)}
                      color={game.politicalCapital >= 50 ? 'text-amber-400' : game.politicalCapital >= 25 ? 'text-stone-200' : 'text-rose-400'}
                      delta={dPC} deltaThreshold={0.5} decimals={0} worseUp={false} />
          </div>
        </div>
        <div className="max-w-md mx-auto px-1 flex border-t border-stone-800/60 overflow-x-auto">
          {[
            {id: 'overview', label: 'Overview', icon: Calendar},
            {id: 'budget', label: 'Budget', icon: Receipt},
            {id: 'reforms', label: 'Reforms', icon: Hammer},
            {id: 'politics', label: 'Politics', icon: Landmark},
            {id: 'markets', label: 'Markets', icon: LineChart},
            {id: 'risks', label: 'Risks', icon: AlertTriangle},
            {id: 'ledger', label: 'Ledger', icon: FileText},
            {id: 'about', label: 'About', icon: BookOpen},
          ].map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
                    className={`flex-1 py-2.5 text-[11px] font-medium flex items-center justify-center gap-1 transition-colors border-b-2 ${
                      tab === t.id ? 'border-amber-500 text-amber-400' : 'border-transparent text-stone-500'
                    }`}>
              <t.icon size={11} /> {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 pt-5 pb-28">
        {tab === 'overview' && <OverviewTab game={game} committed={committed}
          deficitGDP={deficitGDP} debtRatio={debtRatio} />}
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
        {tab === 'risks' && <RisksTab riskMods={riskMods} />}
        {tab === 'ledger' && (
          <LedgerTab game={game} revenue={revenue} spending={spending} balance={balance}
            deficitGDP={deficitGDP} balanceDiff={balanceDiff} committed={committed} debtRatio={debtRatio} />
        )}
        {tab === 'about' && <AboutTab />}
      </div>

      {!showIntro && !showFinal && !showReelect && !showSurplusAlloc && pendingEventCount === 0 && !game.pendingSummary && (
        <div className="fixed bottom-0 left-0 right-0 z-20 backdrop-blur-md border-t border-stone-800/80 p-3"
             style={{background: 'rgba(20, 17, 12, 0.92)'}}>
          <div className="max-w-md mx-auto flex items-center gap-3">
            <div className="flex-1">
              <div className="text-[9px] uppercase tracking-wider text-stone-500">Quarter Status</div>
              <div className="text-[11px] text-stone-300">
                {game.proposedReforms.length > 0 && (
                  <span className="text-sky-400">
                    {game.proposedReforms.length} queued ({queuedPcCost.toFixed(0)} PC) ·{' '}
                  </span>
                )}
                {Object.values(game.reforms).filter(r => r.status === 'inProgress').length} in flight ·
                {' '}<span className={reformLoadInFlight >= reformCapacity ? 'text-amber-400' : 'text-stone-400'}>Cap {reformLoadInFlight}/{reformCapacity}</span>
              </div>
            </div>
            <button onClick={advanceQuarter}
                    className="bg-amber-600 hover:bg-amber-500 active:bg-amber-700 text-stone-950 font-semibold px-4 py-2.5 rounded-md flex items-center gap-1.5 text-sm">
              Next Quarter <ChevronRight size={15} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
