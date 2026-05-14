import React, { useState, useEffect, useMemo } from 'react';
import { Crown, ChevronRight, RotateCcw, Receipt, Hammer, FileText, Users, Calendar, AlertTriangle, BookOpen } from 'lucide-react';

import {
  PARAMS,
  BLOCS,
  COALITION,
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
  applyPopulationDynamics,
  quarterlyPopulationGrowth,
  computeRiskMods,
  sampleReformOutcome,
  rollEvents,
  makeCommittedSnapshot,
  makeInitialState,
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
import { AboutTab } from './components/AboutTab.jsx';

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
      const saved = localStorage.getItem('chancellor_v6_save');
      if (saved) {
        setGame(JSON.parse(saved));
        setShowIntro(false);
      }
    } catch (e) {}
  }, []);

  useEffect(() => {
    if (game.quarter > 1 || Object.keys(game.reforms).length > 0 || game.proposedReforms.length > 0) {
      try { localStorage.setItem('chancellor_v6_save', JSON.stringify(game)); } catch (e) {}
    }
  }, [game]);

  const overallApproval = useMemo(() => calcOverallApproval(game.blocSupport, game.blocWeights), [game.blocSupport, game.blocWeights]);
  const coalitionCohesion = useMemo(() => calcCoalitionCohesion(game.blocSupport, game.blocWeights), [game.blocSupport, game.blocWeights]);
  const balance = useMemo(() => calcBalance(game), [game]);
  const revenue = useMemo(() => calcRevenue(game), [game]);
  const spending = useMemo(() => calcSpending(game), [game]);
  const riskMods = useMemo(() => computeRiskMods(game), [game]);
  const projectedDeltas = useMemo(() => quarterlyBlocDelta(game), [game]);
  const deficit = -balance;
  const deficitGDP = deficit / game.gdp * 100;
  const debtRatio = (game.debt / game.gdp * 100).toFixed(0);
  const committed = game.committed;
  const yearQ = ((game.quarter - 1) % 4) + 1;
  const yearInTerm = Math.ceil(game.quarter / 4);

  function set(patch) { setGame(g => ({ ...g, ...patch })); }
  function proposeReform(id) { setGame(g => ({ ...g, proposedReforms: [...g.proposedReforms, id] })); }
  function unproposeReform(id) { setGame(g => ({ ...g, proposedReforms: g.proposedReforms.filter(rid => rid !== id) })); }

  function advanceQuarter() {
    if (game.pendingEvent || game.pendingSummary || showReelect || showSurplusAlloc) return;

    const preBlocs = { ...game.blocSupport };
    const preCohesion = calcCoalitionCohesion(game.blocSupport, game.blocWeights);
    const preDebt = game.debt, preGrowth = game.growth, preGini = game.gini, preHealth = game.healthIndex;
    const preBalance = calcBalance(game);
    const prePopulation = game.population;
    const preWeights = { ...game.blocWeights };

    setGame(g => {
      let n = { ...g };

      // 1. Commit proposed reforms
      const startedReforms = [];
      for (const id of n.proposedReforms) {
        const reform = REFORMS[id];
        if (!reform) continue;
        const cost = v(reform.cost);
        n.reforms = { ...n.reforms, [id]: { status: 'inProgress', startedQ: n.globalQuarter, completesQ: n.globalQuarter + reform.quarters, reformDef: reform } };
        n.debt = n.debt + cost;
        startedReforms.push(reform.name);
        n.log = [...n.log, { q: n.quarter, text: `Started: ${reform.name} (£${cost}bn, ${reform.quarters}Q)` }];
      }
      n.proposedReforms = [];

      // 2. Apply quarterly bloc support deltas
      const deltas = quarterlyBlocDelta(n);
      const newBlocSupport = {};
      for (const [id, s] of Object.entries(n.blocSupport)) {
        newBlocSupport[id] = Math.max(0, Math.min(100, s + deltas[id]));
      }
      n.blocSupport = newBlocSupport;

      // 3. Population dynamics — bloc weights
      n.blocWeights = applyPopulationDynamics(n.blocWeights, n.reforms);

      // 4. Overall population growth
      const popGrowthQ = quarterlyPopulationGrowth(n.reforms);
      n.population = n.population * (1 + popGrowthQ / 100);

      // 5. Fiscal flow
      const qBalance = calcBalance(n) / 4;
      if (qBalance >= 0) {
        n.pendingSurplus = (n.pendingSurplus || 0) + qBalance;
      } else {
        n.debt = n.debt - qBalance;
      }

      // 6. GDP grows
      n.gdp = n.gdp * (1 + (n.growth + n.inflation) / 100 / 4);
      n.realGDP = n.realGDP * (1 + n.growth / 100 / 4);

      // 7. Reform completions
      const completedReforms = [];
      for (const [id, r] of Object.entries(n.reforms)) {
        if (r.status === 'inProgress' && r.completesQ <= n.globalQuarter + 1) {
          const reform = REFORMS[id];
          const actual = sampleReformOutcome(reform, n.forecastNoise);
          n.reforms[id] = { ...r, status: 'complete', actualOutcome: actual };

          if (actual.revBonus) n.revBonusFromReforms = (n.revBonusFromReforms || 0) + actual.revBonus;
          if (actual.ongoingCost) n.ongoingCostFromReforms = (n.ongoingCostFromReforms || 0) + actual.ongoingCost;
          if (actual.ongoingRev) n.ongoingRevFromReforms = (n.ongoingRevFromReforms || 0) + actual.ongoingRev;
          if (actual.healthBoost) n.healthIndex = Math.max(0, Math.min(100, n.healthIndex + actual.healthBoost));
          if (actual.growthBonus) n.growth = n.growth + actual.growthBonus;
          if (actual.gini) n.gini = n.gini + actual.gini;

          if (reform.blocEffects) {
            for (const [bloc, leaf] of Object.entries(reform.blocEffects)) {
              n.blocSupport[bloc] = Math.max(0, Math.min(100, n.blocSupport[bloc] + v(leaf)));
            }
          }
          if (reform.special === 'reduceForecastNoise') n.forecastNoise = v(PARAMS.forecastNoise.afterObr);

          completedReforms.push(reform.name);
          n.log = [...n.log, { q: n.quarter + 1, text: `✓ ${actual.log}` }];
        }
      }

      // 8. Bond yield
      const BY = PARAMS.bondYield;
      const balYr = calcBalance(n);
      if (balYr < v(BY.bigDeficitThreshold)) n.bondYield = Math.min(v(BY.ceiling), n.bondYield + v(BY.bigDeficitDelta));
      else if (balYr < v(BY.midDeficitThreshold)) n.bondYield = Math.min(v(BY.ceiling), n.bondYield + v(BY.midDeficitDelta));
      else if (balYr > 0) n.bondYield = Math.max(v(BY.floor), n.bondYield + v(BY.surplusDelta));
      else if (balYr > v(BY.smallDeficitThreshold)) n.bondYield = Math.max(v(BY.floor), n.bondYield + v(BY.smallDeficitDelta));

      // 9. Events
      const newMods = computeRiskMods(n);
      const triggered = rollEvents(n, newMods);
      let eventToShow = null;
      if (triggered.length > 0) {
        const eventId = triggered[Math.floor(Math.random() * triggered.length)];
        eventToShow = { id: eventId, ...EVENT_DEFINITIONS[eventId] };
      }

      // 10. Summary
      const blocChanges = {};
      for (const id of Object.keys(BLOCS)) {
        const change = n.blocSupport[id] - preBlocs[id];
        if (Math.abs(change) >= 0.3) blocChanges[id] = change;
      }
      const blocChangeArray = Object.entries(blocChanges).sort((a,b) => Math.abs(b[1]) - Math.abs(a[1]));

      const popChange = n.population - prePopulation;
      const weightChanges = {};
      for (const id of Object.keys(BLOCS)) {
        const wc = n.blocWeights[id] - preWeights[id];
        if (Math.abs(wc) >= 0.001) weightChanges[id] = wc;
      }

      n.pendingSummary = {
        quarter: n.quarter,
        debtChange: n.debt - preDebt,
        growthChange: n.growth - preGrowth,
        giniChange: n.gini - preGini,
        healthChange: n.healthIndex - preHealth,
        cohesionChange: calcCoalitionCohesion(n.blocSupport, n.blocWeights) - preCohesion,
        balanceChange: calcBalance(n) - preBalance,
        deficitGDP: -calcBalance(n) / n.gdp * 100,
        gdpChange: n.gdp - g.gdp,
        realGDPChange: n.realGDP - g.realGDP,
        populationChange: popChange,
        blocChanges: blocChangeArray.slice(0, 4),
        weightChanges: Object.entries(weightChanges).sort((a,b) => Math.abs(b[1]) - Math.abs(a[1])).slice(0, 3),
        startedReforms,
        completedReforms,
        eventPending: !!eventToShow,
        pendingSurplus: n.pendingSurplus,
        qBalance,
      };
      n.pendingEvent = eventToShow;

      n.quarter = n.quarter + 1;
      n.globalQuarter = n.globalQuarter + 1;
      n.committed = makeCommittedSnapshot(n);

      const newCoal = calcCoalitionCohesion(n.blocSupport, n.blocWeights);
      if (newCoal < COALITION_FLOOR) n.status = 'collapsed';
      else if (n.bondYield > BOND_YIELD_CEILING) n.status = 'lost-markets';
      else if (n.quarter > TERM_LENGTH) {
        n.status = newCoal >= REELECT_THRESHOLD ? 'election' : 'lost-election';
      }

      return n;
    });
  }

  useEffect(() => {
    if (game.status === 'election' && !game.pendingSummary && !game.pendingEvent && !showReelect) setShowReelect(true);
    if (['collapsed', 'lost-markets', 'lost-election'].includes(game.status) && !game.pendingSummary && !game.pendingEvent && !showFinal) setShowFinal(true);
  }, [game.status, game.pendingSummary, game.pendingEvent, showFinal, showReelect]);

  function continueAfterElection() {
    const honeymoonW = v(PARAMS.honeymoonResetWeight);
    setGame(g => {
      const newBlocSupport = { ...g.blocSupport };
      for (const k of Object.keys(BLOCS)) {
        newBlocSupport[k] = newBlocSupport[k] * honeymoonW + BLOCS[k].base * (1 - honeymoonW);
      }
      return {
        ...g, status: 'playing', quarter: 1, term: g.term + 1, termsWon: g.termsWon + 1,
        blocSupport: newBlocSupport, bondYield: Math.max(3.5, g.bondYield - 0.5),
        log: [...g.log, { q: 1, text: `🗳️ Re-elected for Term ${g.term + 1}.` }], committed: null,
      };
    });
    setShowReelect(false);
  }

  function resolveEvent(choice) {
    setGame(g => {
      let n = { ...g, pendingEvent: null };
      const eff = choice.effect;
      if (eff.debt) n.debt = n.debt + eff.debt;
      if (eff.growth) n.growth = n.growth + eff.growth;
      if (eff.inflation) n.inflation = Math.max(0, n.inflation + eff.inflation);
      if (eff.healthIndex) n.healthIndex = Math.max(0, Math.min(100, n.healthIndex + eff.healthIndex));
      if (eff.bondYield) n.bondYield = Math.max(2, n.bondYield + eff.bondYield);
      if (eff.blocs) {
        for (const [bloc, delta] of Object.entries(eff.blocs)) {
          n.blocSupport[bloc] = Math.max(0, Math.min(100, n.blocSupport[bloc] + delta));
        }
      }
      n.log = [...n.log, { q: g.quarter, text: `[Event] ${eff.log}` }];
      n.committed = makeCommittedSnapshot(n);
      return n;
    });
  }

  function dismissSummary() {
    if (game.pendingSurplus >= v(PARAMS.surplusAllocation.surplusAllocPromptThreshold)) {
      setSurplusAllocations({ debt: game.pendingSurplus, services: 0, taxCut: 0 });
      setGame(g => ({ ...g, pendingSummary: null }));
      setShowSurplusAlloc(true);
    } else {
      setGame(g => ({ ...g, pendingSummary: null, debt: g.debt - (g.pendingSurplus || 0), pendingSurplus: 0 }));
    }
  }

  function commitSurplusAllocation() {
    const SA = PARAMS.surplusAllocation;
    setGame(g => {
      const alloc = surplusAllocations;
      let n = { ...g };
      n.debt = n.debt - (alloc.debt || 0);
      if (alloc.services > 0) {
        n.healthIndex = Math.min(100, n.healthIndex + alloc.services / v(SA.servicesHealthDivisor));
        n.blocSupport.workingClass = Math.min(100, n.blocSupport.workingClass + alloc.services / v(SA.servicesWorkingClassDivisor));
        n.blocSupport.publicSector = Math.min(100, n.blocSupport.publicSector + alloc.services / v(SA.servicesPublicSectorDivisor));
        n.blocSupport.pensioners   = Math.min(100, n.blocSupport.pensioners   + alloc.services / v(SA.servicesPensionersDivisor));
        n.log = [...n.log, { q: g.quarter, text: `Allocated £${alloc.services.toFixed(0)}bn surplus to public services.` }];
      }
      if (alloc.taxCut > 0) {
        n.ongoingRevFromReforms = (n.ongoingRevFromReforms || 0) - alloc.taxCut;
        n.blocSupport.middleClass = Math.min(100, n.blocSupport.middleClass + alloc.taxCut / v(SA.taxCutMiddleDivisor));
        n.blocSupport.business    = Math.min(100, n.blocSupport.business    + alloc.taxCut / v(SA.taxCutBusinessDivisor));
        n.blocSupport.professional= Math.min(100, n.blocSupport.professional+ alloc.taxCut / v(SA.taxCutProfessionalDivisor));
        n.log = [...n.log, { q: g.quarter, text: `Allocated £${alloc.taxCut.toFixed(0)}bn surplus to ongoing tax cuts.` }];
      }
      if (alloc.debt > 0) {
        n.log = [...n.log, { q: g.quarter, text: `Paid down £${alloc.debt.toFixed(0)}bn of national debt.` }];
      }
      n.pendingSurplus = 0;
      n.committed = makeCommittedSnapshot(n);
      return n;
    });
    setShowSurplusAlloc(false);
    setSurplusAllocations({});
  }

  function reset() {
    try { localStorage.removeItem('chancellor_v6_save'); } catch (e) {}
    setGame(INITIAL); setShowIntro(true); setShowFinal(false); setShowReelect(false); setTab('overview');
  }

  function canStartReform(id) {
    const reform = REFORMS[id];
    if (game.reforms[id]) return false;
    if (game.proposedReforms.includes(id)) return false;
    return reform.prereq.every(p => game.reforms[p]?.status === 'complete');
  }

  const balanceDiff = committed ? balance - committed.balance : null;
  const cohesionDiff = committed ? coalitionCohesion - committed.coalitionCohesion : null;

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
      {game.pendingEvent && !showIntro && !game.pendingSummary && !showSurplusAlloc && (
        <EventModal event={game.pendingEvent} onChoice={resolveEvent} />
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
          <div className="flex items-end justify-between mb-3">
            <div>
              <div className="text-[10px] uppercase tracking-wider text-stone-500 mb-0.5 flex items-center gap-2">
                Coalition Cohesion
                {cohesionDiff !== null && Math.abs(cohesionDiff) >= 0.1 && (
                  <span className={`text-[9px] ${cohesionDiff > 0 ? 'text-emerald-400' : 'text-rose-400'}`} style={{fontFamily: 'IBM Plex Mono'}}>
                    {cohesionDiff > 0 ? '+' : ''}{cohesionDiff.toFixed(1)}
                  </span>
                )}
              </div>
              <div className={`display-font text-3xl font-medium tabular-nums leading-none ${
                coalitionCohesion >= REELECT_THRESHOLD ? 'text-emerald-400' : coalitionCohesion >= 28 ? 'text-amber-400' : 'text-rose-400'
              }`}>{coalitionCohesion.toFixed(0)}%</div>
              <div className="text-[10px] text-stone-500 mt-1">Overall {overallApproval.toFixed(0)}% · Floor {COALITION_FLOOR}%</div>
            </div>
            <div className="text-right">
              <div className="text-[10px] uppercase tracking-wider text-stone-500 mb-0.5 flex items-center justify-end gap-2">
                {balanceDiff !== null && Math.abs(balanceDiff) >= 0.5 && (
                  <span className={`text-[9px] ${balanceDiff > 0 ? 'text-emerald-400' : 'text-rose-400'}`} style={{fontFamily: 'IBM Plex Mono'}}>
                    {balanceDiff > 0 ? '+' : ''}{balanceDiff.toFixed(0)}
                  </span>
                )}
                Balance (annual)
              </div>
              <div className={`text-xl font-bold tabular-nums ${balance >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}
                   style={{fontFamily: 'IBM Plex Mono'}}>{fmtSigned(balance)}</div>
              <div className={`text-[10px] mt-0.5 ${deficitGDP < 2 ? 'text-emerald-400' : deficitGDP < 4 ? 'text-amber-400' : 'text-rose-400'}`}>
                {balance >= 0 ? 'Surplus' : `${deficitGDP.toFixed(1)}% deficit · Debt ${debtRatio}%`}
              </div>
            </div>
          </div>
          <div className="grid grid-cols-5 gap-1 text-center">
            <div>
              <div className="text-[9px] uppercase tracking-wider text-stone-500">GDP</div>
              <div className="text-[11px] font-semibold text-stone-200" style={{fontFamily: 'IBM Plex Mono'}}>£{(game.gdp/1000).toFixed(2)}tn</div>
            </div>
            <div>
              <div className="text-[9px] uppercase tracking-wider text-stone-500">Growth</div>
              <div className={`text-[11px] font-semibold ${game.growth > 1.5 ? 'text-emerald-400' : game.growth > 0 ? 'text-stone-200' : 'text-rose-400'}`}
                   style={{fontFamily: 'IBM Plex Mono'}}>{game.growth.toFixed(1)}%</div>
            </div>
            <div>
              <div className="text-[9px] uppercase tracking-wider text-stone-500">Pop</div>
              <div className="text-[11px] font-semibold text-stone-200" style={{fontFamily: 'IBM Plex Mono'}}>{game.population.toFixed(1)}m</div>
            </div>
            <div>
              <div className="text-[9px] uppercase tracking-wider text-stone-500">Gilts</div>
              <div className={`text-[11px] font-semibold ${game.bondYield < 4 ? 'text-emerald-400' : game.bondYield < 5.5 ? 'text-stone-200' : 'text-rose-400'}`}
                   style={{fontFamily: 'IBM Plex Mono'}}>{game.bondYield.toFixed(1)}%</div>
            </div>
            <div>
              <div className="text-[9px] uppercase tracking-wider text-stone-500">Gini</div>
              <div className={`text-[11px] font-semibold ${game.gini < 34 ? 'text-emerald-400' : game.gini < 36 ? 'text-stone-200' : 'text-rose-400'}`}
                   style={{fontFamily: 'IBM Plex Mono'}}>{game.gini.toFixed(1)}</div>
            </div>
          </div>
        </div>
        <div className="max-w-md mx-auto px-1 flex border-t border-stone-800/60 overflow-x-auto">
          {[
            {id: 'overview', label: 'Overview', icon: Users},
            {id: 'budget', label: 'Budget', icon: Receipt},
            {id: 'reforms', label: 'Reforms', icon: Hammer},
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
        {tab === 'overview' && <OverviewTab game={game} projectedDeltas={projectedDeltas} />}
        {tab === 'budget' && <BudgetTab game={game} committed={committed} set={set} />}
        {tab === 'reforms' && (
          <ReformsTab game={game} coalitionCohesion={coalitionCohesion}
            canStartReform={canStartReform} proposeReform={proposeReform}
            unproposeReform={unproposeReform} onInspect={setInspectReform} />
        )}
        {tab === 'risks' && <RisksTab riskMods={riskMods} />}
        {tab === 'ledger' && (
          <LedgerTab game={game} revenue={revenue} spending={spending} balance={balance}
            deficitGDP={deficitGDP} balanceDiff={balanceDiff} committed={committed} debtRatio={debtRatio} />
        )}
        {tab === 'about' && <AboutTab />}
      </div>

      {!showIntro && !showFinal && !showReelect && !showSurplusAlloc && !game.pendingEvent && !game.pendingSummary && (
        <div className="fixed bottom-0 left-0 right-0 z-20 backdrop-blur-md border-t border-stone-800/80 p-3"
             style={{background: 'rgba(20, 17, 12, 0.92)'}}>
          <div className="max-w-md mx-auto flex items-center gap-3">
            <div className="flex-1">
              <div className="text-[9px] uppercase tracking-wider text-stone-500">Quarter Status</div>
              <div className="text-[11px] text-stone-300">
                {game.proposedReforms.length > 0 && <span className="text-sky-400">{game.proposedReforms.length} queued · </span>}
                {Object.values(game.reforms).filter(r => r.status === 'inProgress').length} in flight ·
                {' '}{Object.values(game.reforms).filter(r => r.status === 'complete').length} delivered
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
