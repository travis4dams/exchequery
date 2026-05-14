import React, { useState, useEffect, useMemo } from 'react';
import { Crown, ChevronRight, RotateCcw, Info, AlertTriangle, CheckCircle2, Receipt, Banknote, Hammer, FileText, Users, Calendar, Lock, X, Clock, Undo2, ArrowRight, Eye, AlertCircle, TrendingUp, BookOpen, ExternalLink } from 'lucide-react';

import {
  PARAMS,
  CITATIONS,
  confidenceSummary,
  BLOCS,
  COALITION,
  INITIAL_BLOC_SUPPORT,
  INITIAL_BLOC_WEIGHTS,
  REFORMS,
  REFORM_BRANCHES,
  EVENT_DEFINITIONS,
  SOURCES,
  calcCoalitionCohesion,
  calcOverallApproval,
  calcRevenue,
  calcSpending,
  calcBalance,
  quarterlyBlocDelta,
  applyPopulationDynamics,
  quarterlyPopulationGrowth,
  computeRiskMods,
  projectReformOutcome,
  sampleReformOutcome,
  rollEvents,
  makeCommittedSnapshot,
  makeInitialState,
} from './model/index.js';

// Unwrap a { value, citationId } leaf to its scalar (no-op if already scalar).
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

// =============================================================================
// Citation drill-down primitives
// =============================================================================

const CONFIDENCE_STYLES = {
  sourced: { label: 'sourced', bg: 'bg-emerald-950/40', border: 'border-emerald-800/60', text: 'text-emerald-300' },
  extrapolated: { label: 'extrapolated', bg: 'bg-amber-950/40', border: 'border-amber-800/60', text: 'text-amber-300' },
  judgement: { label: 'judgement', bg: 'bg-stone-800/60', border: 'border-stone-700', text: 'text-stone-300' },
};

function ConfidenceBadge({ confidence }) {
  const s = CONFIDENCE_STYLES[confidence] || CONFIDENCE_STYLES.judgement;
  return (
    <span className={`inline-block px-1.5 py-0.5 rounded text-[9px] font-semibold uppercase tracking-wider ${s.bg} ${s.text} border ${s.border}`}>
      {s.label}
    </span>
  );
}

function CitationLink({ id, label, className }) {
  const [open, setOpen] = useState(false);
  const c = CITATIONS[id];
  if (!c) return null;
  return (
    <>
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); setOpen(true); }}
        className={`inline-flex items-center text-stone-500 hover:text-amber-400 transition-colors ${className || ''}`}
        title={`Show citation: ${c.title}`}
      >
        {label ? <span className="text-[10px] underline-offset-2 hover:underline">{label}</span> : <Info size={11} />}
      </button>
      {open && (
        <div className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-3"
             onClick={() => setOpen(false)}>
          <div className="bg-stone-950 border-2 border-stone-700 rounded-t-2xl sm:rounded-2xl max-w-md w-full p-5 max-h-[90vh] overflow-y-auto"
               onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between mb-3 gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <ConfidenceBadge confidence={c.confidence} />
                  {c.year && <span className="text-[10px] text-stone-500" style={{fontFamily: 'IBM Plex Mono'}}>{c.year}</span>}
                </div>
                <h3 className="display-font text-lg font-medium leading-tight">{c.title}</h3>
                {c.publisher && <div className="text-[11px] text-stone-400 italic mt-0.5">{c.publisher}</div>}
                {c.authors && <div className="text-[10px] text-stone-500 mt-0.5">{c.authors.join(', ')}</div>}
              </div>
              <button onClick={() => setOpen(false)} className="text-stone-500"><X size={16} /></button>
            </div>
            {c.parameter && (
              <div className="bg-stone-900/60 rounded p-2 mb-3">
                <div className="text-[9px] uppercase tracking-wider text-stone-500 mb-1">Parameter</div>
                <div className="text-[11px] text-stone-200" style={{fontFamily: 'IBM Plex Mono'}}>{c.parameter}</div>
                {c.value !== undefined && (
                  <div className="text-[11px] text-amber-300 mt-1" style={{fontFamily: 'IBM Plex Mono'}}>
                    {c.value}{c.unit ? ` ${c.unit}` : ''}
                  </div>
                )}
              </div>
            )}
            {c.quote && (
              <div className="bg-amber-950/15 border-l-2 border-amber-700/50 rounded-r p-2 mb-3">
                <div className="text-[9px] uppercase tracking-wider text-amber-500 mb-1">Quote</div>
                <div className="text-[11px] text-stone-300 italic leading-relaxed">{c.quote}</div>
              </div>
            )}
            {c.note && (
              <div className="mb-3">
                <div className="text-[9px] uppercase tracking-wider text-stone-500 mb-1">Note</div>
                <div className="text-[11px] text-stone-300 leading-relaxed">{c.note}</div>
              </div>
            )}
            {c.url && (
              <a href={c.url} target="_blank" rel="noopener noreferrer"
                 className="inline-flex items-center gap-1.5 text-[11px] text-amber-400 hover:underline">
                Open source <ExternalLink size={10} />
              </a>
            )}
          </div>
        </div>
      )}
    </>
  );
}

// =============================================================================
// UI primitives
// =============================================================================

function Slider({ label, value, min, max, step, onChange, format, tooltip, baseline, committed, unit, citationId }) {
  const isChanged = value !== baseline;
  const diff = committed !== undefined && value !== committed ? value - committed : null;
  return (
    <div className="mb-4">
      <div className="flex justify-between items-baseline mb-1.5">
        <label className="text-[13px] font-medium text-stone-200 flex items-center gap-1">
          {label}
          {citationId && <CitationLink id={citationId} />}
        </label>
        <div className="flex items-baseline gap-2">
          <span className={`text-sm font-semibold tabular-nums ${isChanged ? 'text-amber-400' : 'text-stone-400'}`}
                style={{fontFamily: 'IBM Plex Mono'}}>
            {format ? format(value) : value}{unit}
          </span>
          {diff !== null && diff !== 0 && (
            <span className={`text-[10px] tabular-nums ${diff > 0 ? 'text-amber-400' : 'text-sky-400'}`}
                  style={{fontFamily: 'IBM Plex Mono'}}>
              ({diff > 0 ? '+' : ''}{diff})
            </span>
          )}
        </div>
      </div>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full h-1.5 bg-stone-700 rounded-full appearance-none cursor-pointer" />
      {tooltip && <div className="text-[11px] text-stone-500 mt-1 leading-snug">{tooltip}</div>}
    </div>
  );
}

function BlocBar({ blocId, support, isCoalition, weight, projectedDelta }) {
  const bloc = BLOCS[blocId];
  const color = support > 50 ? 'bg-emerald-500' : support > 35 ? 'bg-amber-500' : 'bg-rose-500';
  return (
    <div className={`p-2 rounded ${isCoalition ? 'bg-amber-950/20 border border-amber-900/30' : 'bg-stone-900/30'}`}>
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-1.5 min-w-0">
          {isCoalition && <div className="w-1.5 h-1.5 rounded-full bg-amber-500 flex-shrink-0" />}
          <span className="text-[11px] text-stone-300 truncate">{bloc.name}</span>
          <span className="text-[9px] text-stone-600" style={{fontFamily: 'IBM Plex Mono'}}>{(weight*100).toFixed(0)}%</span>
        </div>
        <div className="flex items-baseline gap-1.5 flex-shrink-0">
          <span className="text-[11px] text-stone-400" style={{fontFamily: 'IBM Plex Mono'}}>{Math.round(support)}%</span>
          {projectedDelta !== undefined && Math.abs(projectedDelta) >= 0.3 && (
            <span className={`text-[9px] ${projectedDelta > 0 ? 'text-emerald-400' : 'text-rose-400'}`} style={{fontFamily: 'IBM Plex Mono'}}>
              {projectedDelta > 0 ? '↗' : '↘'}{Math.abs(projectedDelta).toFixed(1)}
            </span>
          )}
        </div>
      </div>
      <div className="h-1 bg-stone-800 rounded-full overflow-hidden">
        <div className={`h-full ${color} transition-all`} style={{width: `${support}%`}} />
      </div>
    </div>
  );
}

function ReformCard({ id, reform, status, isProposed, onPropose, onUnpropose, canStart, currentQ, coalitionCohesion, onInspect }) {
  const isInProgress = status?.status === 'inProgress';
  const isComplete = status?.status === 'complete';
  const progress = isInProgress ? ((currentQ - status.startedQ) / reform.quarters) : 0;
  const passReqCoal = v(reform.passReq?.coalition) || 0;
  const meetsCoal = coalitionCohesion >= passReqCoal;
  const ctrl = reform.controversial;
  const cost = v(reform.cost);

  return (
    <div className={`p-3 rounded-md border mb-2 transition-colors ${
      isComplete ? 'border-emerald-700/50 bg-emerald-950/15' :
      isInProgress ? 'border-amber-700/50 bg-amber-950/15' :
      isProposed ? 'border-sky-700/60 bg-sky-950/20' :
      canStart && meetsCoal ? 'border-stone-700 bg-stone-900/40' :
      'border-stone-800 bg-stone-950/40 opacity-60'
    }`}>
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5">
            {isComplete && <CheckCircle2 size={11} className="text-emerald-500 flex-shrink-0" />}
            {isInProgress && <Clock size={11} className="text-amber-500 flex-shrink-0" />}
            {isProposed && <ArrowRight size={11} className="text-sky-400 flex-shrink-0" />}
            {!isComplete && !isInProgress && !isProposed && !canStart && <Lock size={11} className="text-stone-600 flex-shrink-0" />}
            {ctrl && !isComplete && !isInProgress && !isProposed && <AlertCircle size={10} className="text-amber-500 flex-shrink-0" title="Contested policy" />}
            <span className={`text-[12px] font-semibold ${
              isComplete ? 'text-emerald-300' :
              isInProgress ? 'text-amber-300' :
              isProposed ? 'text-sky-300' : 'text-stone-200'
            }`}>{reform.name}</span>
          </div>
          <div className="text-[10px] text-stone-500 leading-snug">{reform.blurb}</div>
        </div>
      </div>
      {isInProgress && (
        <div className="mb-2">
          <div className="h-1 bg-stone-800 rounded-full overflow-hidden">
            <div className="h-full bg-amber-500" style={{width: `${progress * 100}%`}} />
          </div>
          <div className="text-[10px] text-stone-500 mt-1">
            {reform.quarters - (currentQ - status.startedQ)}Q remaining of {reform.quarters}Q
          </div>
        </div>
      )}
      {isProposed && (
        <div className="mb-2 flex items-center justify-between bg-sky-950/30 rounded px-2 py-1">
          <span className="text-[10px] text-sky-300">Queued — starts next quarter</span>
          <button onClick={onUnpropose} className="text-[10px] text-sky-300 hover:text-sky-200 flex items-center gap-1">
            <Undo2 size={9} /> Undo
          </button>
        </div>
      )}
      {!isComplete && !isInProgress && !isProposed && (
        <div className="flex items-center justify-between mt-2 pt-2 border-t border-stone-800">
          <div className="text-[10px] text-stone-500">
            £{cost}bn · {reform.quarters}Q
            {passReqCoal > 0 && (
              <span className={meetsCoal ? 'text-stone-500 ml-2' : 'text-rose-500 ml-2'}>
                · {passReqCoal}% coal.
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            <button onClick={onInspect} className="text-stone-500 hover:text-stone-300">
              <Eye size={12} />
            </button>
            <button onClick={onPropose} disabled={!canStart || !meetsCoal}
              className="text-[11px] font-semibold px-3 py-1 rounded bg-amber-600 hover:bg-amber-500 disabled:bg-stone-800 disabled:text-stone-600 text-stone-950">
              Propose
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// =============================================================================
// MAIN
// =============================================================================

export default function ChancellorSim() {
  const [game, setGame] = useState(INITIAL);
  const [tab, setTab] = useState('overview');
  const [aboutView, setAboutView] = useState('intro');
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

  const fmtSigned = (n) => (n >= 0 ? '+' : '−') + (Math.abs(n) >= 1000 ? `£${(Math.abs(n)/1000).toFixed(1)}tn` : `£${Math.abs(n).toFixed(0)}bn`);

  function canStartReform(id) {
    const reform = REFORMS[id];
    if (game.reforms[id]) return false;
    if (game.proposedReforms.includes(id)) return false;
    return reform.prereq.every(p => game.reforms[p]?.status === 'complete');
  }

  const balanceDiff = committed ? balance - committed.balance : null;
  const cohesionDiff = committed ? coalitionCohesion - committed.coalitionCohesion : null;

  const inspectProjection = inspectReform ? projectReformOutcome(inspectReform, game.forecastNoise) : null;
  const inspectCitations = useMemo(() => {
    if (!inspectReform) return [];
    const ids = new Set();
    if (inspectReform.citationId) ids.add(inspectReform.citationId);
    const walk = (node) => {
      if (!node || typeof node !== 'object') return;
      if ('citationId' in node) ids.add(node.citationId);
      if (Array.isArray(node)) { for (const x of node) walk(x); return; }
      for (const x of Object.values(node)) walk(x);
    };
    walk(inspectReform.cost);
    walk(inspectReform.passReq);
    walk(inspectReform.onComplete);
    walk(inspectReform.blocEffects);
    walk(inspectReform.riskMods);
    return Array.from(ids);
  }, [inspectReform]);

  // Browse-by-parameter view data
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

      {showIntro && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-end sm:items-center justify-center p-4">
          <div className="bg-stone-950 border border-amber-900/40 rounded-t-2xl sm:rounded-2xl max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center gap-2 mb-3">
              <Crown size={20} className="text-amber-500" />
              <div className="text-[10px] uppercase tracking-[0.2em] text-amber-500">HM Treasury · Q1 2026</div>
            </div>
            <h1 className="display-font text-3xl font-medium leading-tight mb-3">
              You are the<br/><span className="italic text-amber-400">Chancellor</span>.
            </h1>
            <p className="text-stone-300 text-[13px] leading-relaxed mb-3">
              Twenty quarters (5 years) to the next election. Win it and continue. Lose your coalition, and resign.
            </p>
            <div className="space-y-2 text-[12px] text-stone-400 mb-5">
              <div className="flex gap-2"><span className="text-amber-500">·</span> <strong>Three win paths:</strong> annual surplus, deficit below 2% of GDP, or hold the coalition through the election.</div>
              <div className="flex gap-2"><span className="text-amber-500">·</span> Reform projections come with <strong>±25% uncertainty</strong>. Pass OBR Independence early to narrow the bands.</div>
              <div className="flex gap-2"><span className="text-amber-500">·</span> Voter bloc populations <strong>shift over time</strong> based on demographics and immigration policy.</div>
              <div className="flex gap-2"><span className="text-amber-500">·</span> Watch for <AlertCircle size={11} className="inline text-amber-500" /> — contested policies with disputed evidence.</div>
            </div>
            <button onClick={() => setShowIntro(false)}
                    className="w-full bg-amber-600 hover:bg-amber-500 text-stone-950 font-semibold py-3 rounded-md flex items-center justify-center gap-2">
              Take Office <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}

      {inspectReform && (
        <div className="fixed inset-0 z-40 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-3"
             onClick={() => setInspectReform(null)}>
          <div className="bg-stone-950 border-2 border-stone-700 rounded-t-2xl sm:rounded-2xl max-w-md w-full p-5 max-h-[90vh] overflow-y-auto"
               onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between mb-3">
              <div>
                <div className="text-[10px] uppercase tracking-[0.2em] text-amber-500 mb-1">{REFORM_BRANCHES[inspectReform.branch]}</div>
                <div className="flex items-center gap-1.5">
                  <h2 className="display-font text-xl font-medium leading-tight">{inspectReform.name}</h2>
                  {inspectReform.controversial && <AlertCircle size={14} className="text-amber-500" />}
                </div>
              </div>
              <button onClick={() => setInspectReform(null)} className="text-stone-500"><X size={16} /></button>
            </div>
            <p className="text-stone-300 text-[12px] leading-relaxed mb-3">{inspectReform.blurb}</p>
            {inspectReform.citationId && CITATIONS[inspectReform.citationId] && (
              <div className="bg-stone-900/60 rounded p-2 mb-3">
                <div className="text-[9px] uppercase tracking-wider text-stone-500 mb-1 flex items-center justify-between">
                  <span>Evidence Base</span>
                  <ConfidenceBadge confidence={CITATIONS[inspectReform.citationId].confidence} />
                </div>
                <div className="text-[11px] text-stone-300 italic leading-snug">{CITATIONS[inspectReform.citationId].note || CITATIONS[inspectReform.citationId].title}</div>
                <div className="mt-1.5"><CitationLink id={inspectReform.citationId} label="Full citation →" /></div>
              </div>
            )}
            <div className="grid grid-cols-2 gap-2 mb-3">
              <div className="bg-stone-900/40 rounded p-2">
                <div className="text-[9px] uppercase tracking-wider text-stone-500">Upfront</div>
                <div className="text-sm font-semibold text-stone-200 flex items-center gap-1" style={{fontFamily: 'IBM Plex Mono'}}>
                  £{v(inspectReform.cost)}bn
                  {inspectReform.cost?.citationId && <CitationLink id={inspectReform.cost.citationId} />}
                </div>
              </div>
              <div className="bg-stone-900/40 rounded p-2">
                <div className="text-[9px] uppercase tracking-wider text-stone-500">Duration</div>
                <div className="text-sm font-semibold text-stone-200" style={{fontFamily: 'IBM Plex Mono'}}>{inspectReform.quarters}Q</div>
              </div>
            </div>
            {inspectProjection && Object.keys(inspectProjection).length > 0 && (
              <div className="mb-3">
                <div className="text-[9px] uppercase tracking-wider text-stone-500 mb-1.5">Projected Outcome <span className="text-stone-600 normal-case">(±{(game.forecastNoise*100).toFixed(0)}% uncertainty)</span></div>
                <div className="space-y-1 text-[11px]" style={{fontFamily: 'IBM Plex Mono'}}>
                  {inspectProjection.revBonus && <div><span className="text-stone-400">Revenue:</span> <span className="text-emerald-400">+£{inspectProjection.revBonus.low.toFixed(1)} to +£{inspectProjection.revBonus.high.toFixed(1)}bn pa</span> {inspectReform.onComplete?.revBonus?.citationId && <CitationLink id={inspectReform.onComplete.revBonus.citationId} className="ml-1" />}</div>}
                  {inspectProjection.ongoingRev && <div><span className="text-stone-400">Ongoing revenue:</span> <span className={inspectProjection.ongoingRev.mid > 0 ? 'text-emerald-400' : 'text-rose-400'}>{inspectProjection.ongoingRev.low.toFixed(1)} to {inspectProjection.ongoingRev.high.toFixed(1)}bn pa</span> {inspectReform.onComplete?.ongoingRev?.citationId && <CitationLink id={inspectReform.onComplete.ongoingRev.citationId} className="ml-1" />}</div>}
                  {inspectProjection.ongoingCost && <div><span className="text-stone-400">Ongoing cost:</span> <span className="text-rose-400">£{inspectProjection.ongoingCost.low.toFixed(1)} to £{inspectProjection.ongoingCost.high.toFixed(1)}bn pa</span> {inspectReform.onComplete?.ongoingCost?.citationId && <CitationLink id={inspectReform.onComplete.ongoingCost.citationId} className="ml-1" />}</div>}
                  {inspectProjection.growthBonus && <div><span className="text-stone-400">Growth:</span> <span className={inspectProjection.growthBonus.mid > 0 ? 'text-emerald-400' : 'text-rose-400'}>{inspectProjection.growthBonus.low.toFixed(2)} to {inspectProjection.growthBonus.high.toFixed(2)}pp</span> {inspectReform.onComplete?.growthBonus?.citationId && <CitationLink id={inspectReform.onComplete.growthBonus.citationId} className="ml-1" />}</div>}
                  {inspectProjection.gini && <div><span className="text-stone-400">Gini:</span> <span className={inspectProjection.gini.mid < 0 ? 'text-emerald-400' : 'text-rose-400'}>{inspectProjection.gini.low.toFixed(2)} to {inspectProjection.gini.high.toFixed(2)}</span> {inspectReform.onComplete?.gini?.citationId && <CitationLink id={inspectReform.onComplete.gini.citationId} className="ml-1" />}</div>}
                  {inspectProjection.healthBoost && <div><span className="text-stone-400">Health Index:</span> <span className={inspectProjection.healthBoost.mid > 0 ? 'text-emerald-400' : 'text-rose-400'}>{inspectProjection.healthBoost.low.toFixed(1)} to {inspectProjection.healthBoost.high.toFixed(1)}</span> {inspectReform.onComplete?.healthBoost?.citationId && <CitationLink id={inspectReform.onComplete.healthBoost.citationId} className="ml-1" />}</div>}
                </div>
              </div>
            )}
            {inspectReform.onComplete?.populationEffects && (
              <div className="mb-3">
                <div className="text-[9px] uppercase tracking-wider text-stone-500 mb-1.5">Demographic Effects</div>
                <div className="space-y-1">
                  {Object.entries(inspectReform.onComplete.populationEffects).map(([bloc, leaf]) => {
                    const rate = v(leaf);
                    return (
                      <div key={bloc} className="flex justify-between text-[11px]" style={{fontFamily: 'IBM Plex Mono'}}>
                        <span className="text-stone-400">{BLOCS[bloc].name}</span>
                        <span className={rate > 0 ? 'text-emerald-400' : 'text-rose-400'}>{rate > 0 ? '+' : ''}{rate}% / quarter</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            {inspectReform.blocEffects && (
              <div>
                <div className="text-[9px] uppercase tracking-wider text-stone-500 mb-1.5">Immediate Bloc Reactions</div>
                <div className="space-y-1">
                  {Object.entries(inspectReform.blocEffects)
                    .map(([bloc, leaf]) => [bloc, v(leaf)])
                    .sort((a,b) => b[1] - a[1])
                    .map(([bloc, delta]) => (
                      <div key={bloc} className="flex justify-between text-[11px]" style={{fontFamily: 'IBM Plex Mono'}}>
                        <span className="text-stone-400">{BLOCS[bloc].name}</span>
                        <span className={delta > 0 ? 'text-emerald-400' : 'text-rose-400'}>{delta > 0 ? '+' : ''}{delta}</span>
                      </div>
                    ))}
                </div>
              </div>
            )}
            {inspectCitations.length > 1 && (
              <div className="mt-3 pt-3 border-t border-stone-800">
                <div className="text-[9px] uppercase tracking-wider text-stone-500 mb-1.5">All citations for this reform</div>
                <div className="flex flex-wrap gap-1.5">
                  {inspectCitations.map(id => (
                    <CitationLink key={id} id={id} label={CITATIONS[id]?.title || id} />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {game.pendingSummary && !showIntro && (
        <div className="fixed inset-0 z-40 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-3">
          <div className="bg-stone-950 border-2 border-amber-900/60 rounded-t-2xl sm:rounded-2xl max-w-md w-full p-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center gap-2 mb-2">
              <Calendar size={14} className="text-amber-500" />
              <div className="text-[10px] uppercase tracking-[0.2em] text-amber-500">Quarter {game.pendingSummary.quarter} · Closing Report</div>
            </div>
            <h2 className="display-font text-2xl font-medium leading-tight mb-4"><span className="italic">A quarter, in review.</span></h2>

            <div className="space-y-2 mb-4">
              <div className="text-[10px] uppercase tracking-wider text-stone-500 mb-1">Economy</div>
              <div className="bg-stone-900/40 rounded p-3 space-y-2 text-[12px]" style={{fontFamily: 'IBM Plex Mono'}}>
                <div className="flex justify-between"><span className="text-stone-400">Real GDP change</span>
                  <span className={game.pendingSummary.realGDPChange > 0 ? 'text-emerald-400' : 'text-rose-400'}>
                    {game.pendingSummary.realGDPChange > 0 ? '+' : ''}£{game.pendingSummary.realGDPChange.toFixed(0)}bn
                  </span></div>
                <div className="flex justify-between"><span className="text-stone-400">Real growth</span>
                  <span className={game.growth > 1.5 ? 'text-emerald-400' : game.growth > 0 ? 'text-stone-300' : 'text-rose-400'}>
                    {game.growth.toFixed(2)}% pa
                  </span></div>
                <div className="flex justify-between"><span className="text-stone-400">Population</span>
                  <span className="text-stone-300">{game.population.toFixed(1)}m ({game.pendingSummary.populationChange > 0 ? '+' : ''}{(game.pendingSummary.populationChange * 1000).toFixed(0)}k)</span></div>
                <div className="flex justify-between"><span className="text-stone-400">Deficit / GDP</span>
                  <span className={game.pendingSummary.deficitGDP > 2 ? 'text-rose-400' : 'text-emerald-400'}>{game.pendingSummary.deficitGDP.toFixed(1)}%</span></div>
                <div className="flex justify-between"><span className="text-stone-400">Balance change</span>
                  <span className={game.pendingSummary.balanceChange > 0 ? 'text-emerald-400' : 'text-rose-400'}>
                    {game.pendingSummary.balanceChange > 0 ? '+' : ''}{game.pendingSummary.balanceChange.toFixed(0)}bn
                  </span></div>
                <div className="flex justify-between"><span className="text-stone-400">Coalition cohesion</span>
                  <span className={game.pendingSummary.cohesionChange > 0 ? 'text-emerald-400' : 'text-rose-400'}>
                    {game.pendingSummary.cohesionChange > 0 ? '+' : ''}{game.pendingSummary.cohesionChange.toFixed(1)}pp
                  </span></div>
                <div className="flex justify-between"><span className="text-stone-400">Health / Gini</span>
                  <span className="text-stone-300">
                    <span className={game.pendingSummary.healthChange > 0 ? 'text-emerald-400' : game.pendingSummary.healthChange < 0 ? 'text-rose-400' : ''}>{game.pendingSummary.healthChange > 0 ? '+' : ''}{game.pendingSummary.healthChange.toFixed(1)}</span>
                    {' / '}
                    <span className={game.pendingSummary.giniChange < 0 ? 'text-emerald-400' : game.pendingSummary.giniChange > 0 ? 'text-rose-400' : ''}>{game.pendingSummary.giniChange > 0 ? '+' : ''}{game.pendingSummary.giniChange.toFixed(2)}</span>
                  </span></div>
              </div>
            </div>

            {game.pendingSummary.blocChanges.length > 0 && (
              <div className="mb-4">
                <div className="text-[10px] uppercase tracking-wider text-stone-500 mb-2">Biggest Bloc Support Movements</div>
                <div className="space-y-1.5">
                  {game.pendingSummary.blocChanges.map(([id, change]) => (
                    <div key={id} className="flex items-center justify-between bg-stone-900/40 rounded px-2 py-1.5">
                      <span className="text-[11px] text-stone-300">{BLOCS[id].name}</span>
                      <span className={`text-[11px] font-mono ${change > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {change > 0 ? '+' : ''}{change.toFixed(1)}pp
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {game.pendingSummary.weightChanges.length > 0 && (
              <div className="mb-4">
                <div className="text-[10px] uppercase tracking-wider text-stone-500 mb-2">Demographic Shifts</div>
                <div className="space-y-1.5">
                  {game.pendingSummary.weightChanges.map(([id, change]) => (
                    <div key={id} className="flex items-center justify-between bg-stone-900/40 rounded px-2 py-1.5">
                      <span className="text-[11px] text-stone-300">{BLOCS[id].name}</span>
                      <span className={`text-[11px] font-mono ${change > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {change > 0 ? '+' : ''}{(change*100).toFixed(2)}% share
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {(game.pendingSummary.startedReforms.length > 0 || game.pendingSummary.completedReforms.length > 0) && (
              <div className="mb-4">
                <div className="text-[10px] uppercase tracking-wider text-stone-500 mb-2">Reform Programme</div>
                <div className="space-y-1">
                  {game.pendingSummary.completedReforms.map(name => (
                    <div key={name} className="flex items-center gap-1.5 text-[11px] text-emerald-300">
                      <CheckCircle2 size={10} /> Delivered: {name}
                    </div>
                  ))}
                  {game.pendingSummary.startedReforms.map(name => (
                    <div key={name} className="flex items-center gap-1.5 text-[11px] text-sky-300">
                      <ArrowRight size={10} /> Started: {name}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {game.pendingSummary.eventPending && (
              <div className="bg-rose-950/30 border border-rose-900/40 rounded p-2 mb-4">
                <div className="text-[11px] text-rose-300 flex items-center gap-1.5">
                  <AlertTriangle size={11} /> A situation requires your attention.
                </div>
              </div>
            )}

            <button onClick={dismissSummary}
                    className="w-full bg-amber-600 hover:bg-amber-500 text-stone-950 font-semibold py-2.5 rounded-md flex items-center justify-center gap-2 text-sm">
              Continue <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}

      {game.pendingEvent && !showIntro && !game.pendingSummary && !showSurplusAlloc && (
        <div className="fixed inset-0 z-40 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-3">
          <div className="bg-stone-950 border-2 rounded-t-2xl sm:rounded-2xl max-w-md w-full p-5"
               style={{borderColor: game.pendingEvent.tone === 'good' ? '#15803d' : game.pendingEvent.tone === 'bad' ? '#9f1239' : '#78350f'}}>
            <div className="flex items-center gap-2 mb-3">
              <div className={`w-2 h-2 rounded-full animate-pulse ${
                game.pendingEvent.tone === 'good' ? 'bg-emerald-500' : game.pendingEvent.tone === 'bad' ? 'bg-rose-500' : 'bg-amber-500'
              }`} />
              <div className="text-[10px] uppercase tracking-[0.2em]" style={{
                color: game.pendingEvent.tone === 'good' ? '#34d399' : game.pendingEvent.tone === 'bad' ? '#fb7185' : '#fbbf24'
              }}>
                {game.pendingEvent.tone === 'good' ? 'Opportunity' : game.pendingEvent.tone === 'bad' ? 'Crisis' : 'Dispatch'}
              </div>
            </div>
            <h2 className="display-font text-2xl font-medium leading-tight mb-3">{game.pendingEvent.title}</h2>
            <p className="text-stone-300 text-[13px] leading-relaxed mb-5">{game.pendingEvent.body}</p>
            <div className="space-y-2">
              {game.pendingEvent.choices.map((c, i) => (
                <button key={i} onClick={() => resolveEvent(c)}
                        className="w-full text-left bg-stone-900 hover:bg-stone-800 border border-stone-700 hover:border-amber-700 transition-all p-3 rounded-md">
                  <div className="text-[13px] font-medium text-stone-100">{c.label}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {showReelect && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-end sm:items-center justify-center p-4">
          <div className="bg-stone-950 border-2 border-amber-700 rounded-t-2xl sm:rounded-2xl max-w-md w-full p-6">
            <div className="text-[10px] uppercase tracking-[0.2em] text-amber-500 mb-2">Election Night</div>
            <h2 className="display-font text-3xl font-medium italic mb-3 text-amber-300">Returned with a mandate.</h2>
            <p className="text-stone-300 text-[13px] leading-relaxed mb-4">
              Your coalition held. Term {game.term + 1} begins. Markets ease on the honeymoon.
            </p>
            <div className="bg-stone-900 rounded-md p-3 mb-4 space-y-1 text-[12px]" style={{fontFamily: 'IBM Plex Mono'}}>
              <div className="flex justify-between"><span className="text-stone-500">Coalition</span><span>{coalitionCohesion.toFixed(0)}%</span></div>
              <div className="flex justify-between"><span className="text-stone-500">Annual balance</span><span>{fmtSigned(balance)}</span></div>
              <div className="flex justify-between"><span className="text-stone-500">Deficit / GDP</span><span>{deficitGDP.toFixed(1)}%</span></div>
              <div className="flex justify-between"><span className="text-stone-500">Reforms delivered</span><span>{Object.values(game.reforms).filter(r => r.status === 'complete').length}</span></div>
            </div>
            {deficitGDP < 2 && balance < 0 && (
              <div className="bg-emerald-950/30 border border-emerald-800 rounded p-2 mb-4">
                <div className="text-[11px] text-emerald-300">🏛️ Deficit below 2% of GDP — sustainable territory.</div>
              </div>
            )}
            {balance > 0 && (
              <div className="bg-emerald-950/30 border border-emerald-800 rounded p-2 mb-4">
                <div className="text-[11px] text-emerald-300">📈 Annual surplus. The books are in the black.</div>
              </div>
            )}
            <button onClick={continueAfterElection}
                    className="w-full bg-amber-600 hover:bg-amber-500 text-stone-950 font-semibold py-3 rounded-md flex items-center justify-center gap-2">
              Begin Term {game.term + 1} <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}

      {showSurplusAlloc && (
        <div className="fixed inset-0 z-45 bg-black/85 backdrop-blur-sm flex items-end sm:items-center justify-center p-4">
          <div className="bg-stone-950 border-2 border-emerald-800 rounded-t-2xl sm:rounded-2xl max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="text-[10px] uppercase tracking-[0.2em] text-emerald-400 mb-2">Treasury Allocation</div>
            <h2 className="display-font text-2xl font-medium italic mb-2 text-emerald-300">A surplus of £{game.pendingSurplus.toFixed(0)}bn.</h2>
            <p className="text-stone-300 text-[12px] leading-relaxed mb-4">
              You closed the quarter in surplus. How do you want to allocate it? Drag the sliders — total must equal £{game.pendingSurplus.toFixed(0)}bn.
            </p>

            <div className="space-y-4 mb-4">
              <div>
                <div className="flex justify-between mb-1">
                  <label className="text-[12px] text-stone-200">Pay down debt</label>
                  <span className="text-[12px] font-semibold text-emerald-400" style={{fontFamily: 'IBM Plex Mono'}}>£{(surplusAllocations.debt || 0).toFixed(0)}bn</span>
                </div>
                <input type="range" min={0} max={game.pendingSurplus} step={1}
                  value={surplusAllocations.debt || 0}
                  onChange={(e) => {
                    const newDebt = parseFloat(e.target.value);
                    const remaining = game.pendingSurplus - newDebt;
                    const cur = surplusAllocations;
                    const totalOther = (cur.services || 0) + (cur.taxCut || 0);
                    if (totalOther > 0.01) {
                      const r = (cur.services || 0) / totalOther;
                      setSurplusAllocations({ debt: newDebt, services: remaining * r, taxCut: remaining * (1 - r) });
                    } else {
                      setSurplusAllocations({ debt: newDebt, services: remaining, taxCut: 0 });
                    }
                  }}
                  className="w-full h-1.5 bg-stone-700 rounded-full appearance-none cursor-pointer" />
                <div className="text-[10px] text-stone-500 mt-1">Reduces debt 1:1. Lowers ongoing interest costs. Markets approve.</div>
              </div>

              <div>
                <div className="flex justify-between mb-1">
                  <label className="text-[12px] text-stone-200">Boost public services (one-off)</label>
                  <span className="text-[12px] font-semibold text-sky-400" style={{fontFamily: 'IBM Plex Mono'}}>£{(surplusAllocations.services || 0).toFixed(0)}bn</span>
                </div>
                <input type="range" min={0} max={game.pendingSurplus} step={1}
                  value={surplusAllocations.services || 0}
                  onChange={(e) => {
                    const newServ = parseFloat(e.target.value);
                    const remaining = game.pendingSurplus - newServ;
                    const cur = surplusAllocations;
                    const totalOther = (cur.debt || 0) + (cur.taxCut || 0);
                    if (totalOther > 0.01) {
                      const r = (cur.debt || 0) / totalOther;
                      setSurplusAllocations({ services: newServ, debt: remaining * r, taxCut: remaining * (1 - r) });
                    } else {
                      setSurplusAllocations({ services: newServ, debt: remaining, taxCut: 0 });
                    }
                  }}
                  className="w-full h-1.5 bg-stone-700 rounded-full appearance-none cursor-pointer" />
                <div className="text-[10px] text-stone-500 mt-1">One-time boost to health & service-using blocs. Doesn't reduce debt.</div>
              </div>

              <div>
                <div className="flex justify-between mb-1">
                  <label className="text-[12px] text-stone-200">Permanent tax cuts</label>
                  <span className="text-[12px] font-semibold text-amber-400" style={{fontFamily: 'IBM Plex Mono'}}>£{(surplusAllocations.taxCut || 0).toFixed(0)}bn</span>
                </div>
                <input type="range" min={0} max={game.pendingSurplus} step={1}
                  value={surplusAllocations.taxCut || 0}
                  onChange={(e) => {
                    const newCut = parseFloat(e.target.value);
                    const remaining = game.pendingSurplus - newCut;
                    const cur = surplusAllocations;
                    const totalOther = (cur.debt || 0) + (cur.services || 0);
                    if (totalOther > 0.01) {
                      const r = (cur.debt || 0) / totalOther;
                      setSurplusAllocations({ taxCut: newCut, debt: remaining * r, services: remaining * (1 - r) });
                    } else {
                      setSurplusAllocations({ taxCut: newCut, debt: remaining, services: 0 });
                    }
                  }}
                  className="w-full h-1.5 bg-stone-700 rounded-full appearance-none cursor-pointer" />
                <div className="text-[10px] text-stone-500 mt-1">⚠ Permanent revenue reduction — eats into future surpluses. Business & middle class approve.</div>
              </div>
            </div>

            <div className="bg-stone-900 rounded-md p-2 mb-3 text-[11px]" style={{fontFamily: 'IBM Plex Mono'}}>
              <div className="flex justify-between"><span className="text-stone-500">Total allocated</span><span>£{((surplusAllocations.debt||0)+(surplusAllocations.services||0)+(surplusAllocations.taxCut||0)).toFixed(1)}bn</span></div>
              <div className="flex justify-between"><span className="text-stone-500">Surplus available</span><span>£{game.pendingSurplus.toFixed(1)}bn</span></div>
            </div>

            <button onClick={commitSurplusAllocation}
                    className="w-full bg-amber-600 hover:bg-amber-500 text-stone-950 font-semibold py-3 rounded-md flex items-center justify-center gap-2">
              Commit Allocation <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}

      {showFinal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-end sm:items-center justify-center p-4">
          <div className="bg-stone-950 border-2 rounded-t-2xl sm:rounded-2xl max-w-md w-full p-6" style={{borderColor: '#9f1239'}}>
            <div className="text-[10px] uppercase tracking-[0.2em] mb-2 text-rose-400">Out of Office</div>
            <h2 className="display-font text-3xl font-medium italic mb-4 text-rose-300">
              {game.status === 'lost-election' ? 'Defeated at the Ballot.' :
               game.status === 'collapsed' ? 'Coalition Collapsed.' :
               game.status === 'lost-markets' ? 'Markets Revolted.' : 'A Difficult End.'}
            </h2>
            <p className="text-stone-300 text-[13px] leading-relaxed mb-4">
              {game.status === 'lost-election' && `Election night. Your coalition fragmented (${coalitionCohesion.toFixed(0)}%, needed ${REELECT_THRESHOLD}%).`}
              {game.status === 'collapsed' && 'Your coalition has lost confidence.'}
              {game.status === 'lost-markets' && 'Bond yields surged past 8%.'}
            </p>
            <div className="bg-stone-900 rounded-md p-3 mb-4 space-y-1 text-[12px]" style={{fontFamily: 'IBM Plex Mono'}}>
              <div className="flex justify-between"><span className="text-stone-500">Terms served</span><span>{game.termsWon}</span></div>
              <div className="flex justify-between"><span className="text-stone-500">Quarters in office</span><span>{game.termsWon * TERM_LENGTH + game.quarter - 1}</span></div>
              <div className="flex justify-between"><span className="text-stone-500">Final balance</span><span>{fmtSigned(balance)}</span></div>
              <div className="flex justify-between"><span className="text-stone-500">Reforms delivered</span><span>{Object.values(game.reforms).filter(r => r.status === 'complete').length}</span></div>
            </div>
            <button onClick={reset}
                    className="w-full bg-amber-600 hover:bg-amber-500 text-stone-950 font-semibold py-3 rounded-md flex items-center justify-center gap-2">
              <RotateCcw size={16} /> Begin Again
            </button>
          </div>
        </div>
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
        {tab === 'overview' && (
          <div>
            <div className="mb-5">
              <h2 className="display-font text-xl font-medium italic text-stone-100 mb-1">Voter Blocs</h2>
              <p className="text-[11px] text-stone-500">Population share (small grey) shifts each quarter. Arrows show projected support drift.</p>
            </div>
            <div className="space-y-1.5 mb-5">
              {Object.keys(BLOCS).map(id => (
                <BlocBar key={id} blocId={id} support={game.blocSupport[id]}
                         weight={game.blocWeights[id]}
                         isCoalition={COALITION.includes(id)}
                         projectedDelta={projectedDeltas[id]} />
              ))}
            </div>

            <div className="mb-5 p-3 bg-stone-900/40 border border-stone-800 rounded-lg">
              <div className="text-[10px] uppercase tracking-wider text-stone-500 mb-2">Bloc Notes</div>
              <div className="space-y-2">
                {Object.entries(BLOCS).map(([id, b]) => (
                  <div key={id} className="text-[11px]">
                    <span className="text-stone-300 font-medium">{b.name}:</span>
                    <span className="text-stone-500 ml-1">{b.note}</span>
                  </div>
                ))}
              </div>
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
        )}

        {tab === 'budget' && (
          <div>
            <div className="mb-5">
              <h2 className="display-font text-xl font-medium italic text-stone-100 mb-1">Budget Levers</h2>
              <p className="text-[11px] text-stone-500">Revenue figures scale with GDP. Source IFS/HMRC ready-reckoner.</p>
            </div>
            <div className="bg-stone-900/40 rounded-lg border border-stone-800 p-4 mb-4">
              <div className="text-[10px] uppercase tracking-wider text-stone-500 mb-3">Income Tax</div>
              <Slider label="Basic rate" value={game.taxIncomeBasic} min={15} max={25} step={1}
                baseline={20} committed={committed?.taxIncomeBasic} onChange={(v) => set({taxIncomeBasic: v})} unit="%"
                tooltip="HMRC: 1pp ≈ £7.2bn. Hits ~30m taxpayers; major bloc impact."
                citationId="hmrc_basic_rate" />
              <Slider label="Higher rate (£50,270+)" value={game.taxIncomeHigh} min={38} max={50} step={1}
                baseline={40} committed={committed?.taxIncomeHigh} onChange={(v) => set({taxIncomeHigh: v})} unit="%"
                tooltip="1pp ≈ £4.5bn (sim) vs HMRC implied ~£2bn — see citation. Middle class & professionals."
                citationId="hmrc_higher_rate" />
              <Slider label="Additional rate (above £125,140)" value={game.taxIncomeAdd} min={40} max={60} step={1}
                baseline={45} committed={committed?.taxIncomeAdd} onChange={(v) => set({taxIncomeAdd: v})} unit="%"
                tooltip="1pp ≈ £0.9bn (sim) vs HMRC implied ~£0.17bn — see citation. Diamond-Saez revenue-max rate ≈ 73%."
                citationId="diamond_saez_top_rate" />
            </div>
            <div className="bg-stone-900/40 rounded-lg border border-stone-800 p-4 mb-4">
              <div className="text-[10px] uppercase tracking-wider text-stone-500 mb-3">Corporation Tax & VAT</div>
              <Slider label="Corporation Tax" value={game.taxCorp} min={19} max={35} step={1}
                baseline={25} committed={committed?.taxCorp} onChange={(v) => set({taxCorp: v})} unit="%"
                tooltip="1pp ≈ £4bn. Hope-Limberg (2022): cuts produce no growth over 50y."
                citationId="hmrc_corp_rate" />
              <Slider label="VAT" value={game.taxVAT} min={15} max={25} step={1}
                baseline={20} committed={committed?.taxVAT} onChange={(v) => set({taxVAT: v})} unit="%"
                tooltip="1pp ≈ £8.5bn. Highly regressive."
                citationId="hmrc_vat_rate" />
            </div>
            <div className="bg-stone-900/40 rounded-lg border border-stone-800 p-4">
              <div className="text-[10px] uppercase tracking-wider text-stone-500 mb-3">Departmental Spending</div>
              <Slider label="NHS & Health" value={game.spendNHS} min={170} max={240} step={5}
                baseline={200} committed={committed?.spendNHS} onChange={(v) => set({spendNHS: v})} unit="bn" format={(v)=>`£${v}`}
                tooltip="Below £200bn: strike risk + Marmot mortality effects."
                citationId="marmot_preventative" />
              <Slider label="Welfare" value={game.spendWelfare} min={260} max={330} step={5}
                baseline={300} committed={committed?.spendWelfare} onChange={(v) => set({spendWelfare: v})} unit="bn" format={(v)=>`£${v}`}
                tooltip="DWP ~£300bn (pensions + benefits)." />
              <Slider label="Education" value={game.spendEdu} min={75} max={110} step={5}
                baseline={90} committed={committed?.spendEdu} onChange={(v) => set({spendEdu: v})} unit="bn" format={(v)=>`£${v}`}
                citationId="ifs_fe_funding" />
              <Slider label="Local Gov" value={game.spendLocal} min={45} max={75} step={5}
                baseline={60} committed={committed?.spendLocal} onChange={(v) => set({spendLocal: v})} unit="bn" format={(v)=>`£${v}`}
                tooltip="Below £60bn: Section 114 risk."
                citationId="ifs_local_gov" />
              <Slider label="Defence" value={game.spendDefence} min={45} max={80} step={5}
                baseline={55} committed={committed?.spendDefence} onChange={(v) => set({spendDefence: v})} unit="bn" format={(v)=>`£${v}`} />
              <Slider label="Infrastructure" value={game.spendInfra} min={20} max={70} step={5}
                baseline={35} committed={committed?.spendInfra} onChange={(v) => set({spendInfra: v})} unit="bn" format={(v)=>`£${v}`}
                tooltip="High multiplier (~1.4 per OBR)." />
            </div>
          </div>
        )}

        {tab === 'reforms' && (
          <div>
            <div className="mb-5">
              <h2 className="display-font text-xl font-medium italic text-stone-100 mb-1">Reform Programme</h2>
              <p className="text-[11px] text-stone-500">Tap eye icon for full details + uncertainty bands. <AlertCircle size={10} className="inline text-amber-500" /> marks contested evidence.</p>
            </div>
            {game.forecastNoise > 0.15 && (
              <div className="mb-4 p-2 bg-amber-950/20 border border-amber-900/30 rounded text-[11px] text-amber-300">
                Forecast uncertainty: ±{(game.forecastNoise*100).toFixed(0)}%. Pass <strong>OBR Independence</strong> to narrow this.
              </div>
            )}
            {game.proposedReforms.length > 0 && (
              <div className="mb-4 p-3 bg-sky-950/30 border border-sky-900/50 rounded-md">
                <div className="text-[10px] uppercase tracking-wider text-sky-400 mb-2">Queued for Next Quarter</div>
                <div className="text-[11px] text-sky-200">
                  Cost on commit: £{game.proposedReforms.reduce((sum, id) => sum + v(REFORMS[id].cost), 0).toFixed(1)}bn
                </div>
              </div>
            )}
            {Object.keys(REFORM_BRANCHES).map(branch => {
              const branchReforms = Object.entries(REFORMS).filter(([_, r]) => r.branch === branch);
              return (
                <div key={branch} className="mb-5">
                  <div className="text-[10px] uppercase tracking-wider text-amber-500 mb-2 font-semibold">{REFORM_BRANCHES[branch]}</div>
                  {branchReforms.map(([id, r]) => (
                    <ReformCard key={id} id={id} reform={r}
                                status={game.reforms[id]}
                                isProposed={game.proposedReforms.includes(id)}
                                onPropose={() => proposeReform(id)}
                                onUnpropose={() => unproposeReform(id)}
                                canStart={canStartReform(id)}
                                currentQ={game.globalQuarter}
                                coalitionCohesion={coalitionCohesion}
                                onInspect={() => setInspectReform(r)} />
                  ))}
                </div>
              );
            })}
          </div>
        )}

        {tab === 'risks' && (
          <div>
            <div className="mb-5">
              <h2 className="display-font text-xl font-medium italic text-stone-100 mb-1">Risk & Opportunity Register</h2>
              <p className="text-[11px] text-stone-500">Annual probabilities. Reforms and spending move these.</p>
            </div>
            <div className="mb-4">
              <div className="text-[10px] uppercase tracking-wider text-rose-400 mb-2">Crisis Risks</div>
              <div className="space-y-1.5">
                {['nhsStrike', 'energyShock', 'fuelPoverty', 'housingCrisis', 'councilBankruptcy', 'financialCrisis', 'generalStrike', 'careCrisis', 'flood', 'heatwave', 'allyCrisis', 'labourShortage']
                  .filter(k => riskMods[k] > 1).sort((a, b) => riskMods[b] - riskMods[a]).map(k => (
                  <div key={k} className="flex items-center justify-between bg-stone-900/40 rounded p-2">
                    <span className="text-[12px] text-stone-300">{EVENT_DEFINITIONS[k]?.title || k}</span>
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-1 bg-stone-800 rounded-full overflow-hidden">
                        <div className={`h-full ${riskMods[k] > 30 ? 'bg-rose-500' : riskMods[k] > 15 ? 'bg-amber-500' : 'bg-stone-600'}`}
                             style={{width: `${Math.min(100, riskMods[k] * 1.5)}%`}} />
                      </div>
                      <span className="text-[11px] font-mono text-stone-400 w-8 text-right">{Math.round(riskMods[k])}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wider text-emerald-400 mb-2">Opportunity Probabilities</div>
              <div className="space-y-1.5">
                {['investmentSurge', 'exportBoom', 'productivityJump', 'taxBeats', 'demographicDividend', 'tradeDeal']
                  .filter(k => riskMods[k] > 1).map(k => (
                  <div key={k} className="flex items-center justify-between bg-stone-900/40 rounded p-2">
                    <span className="text-[12px] text-stone-300">{EVENT_DEFINITIONS[k]?.title || k}</span>
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-1 bg-stone-800 rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-500" style={{width: `${Math.min(100, riskMods[k] * 1.5)}%`}} />
                      </div>
                      <span className="text-[11px] font-mono text-stone-400 w-8 text-right">{Math.round(riskMods[k])}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {tab === 'ledger' && (
          <div>
            <div className="mb-5">
              <h2 className="display-font text-xl font-medium italic text-stone-100 mb-1">Fiscal Position</h2>
              <p className="text-[11px] text-stone-500">Annualised. Revenue scales with nominal GDP.</p>
            </div>
            <div className="bg-stone-900/40 border border-stone-800 rounded-lg p-4 mb-4">
              <div className="text-[10px] uppercase tracking-wider text-stone-500 mb-3 flex justify-between">
                <span>Revenue (£bn pa)</span>
                {committed && <span className="text-stone-600">Last Q → Now</span>}
              </div>
              <div className="space-y-1.5 text-[12px]" style={{fontFamily: 'IBM Plex Mono'}}>
                {[
                  ['Income tax', revenue.incomeTax, committed?.revenue.incomeTax],
                  ['National Insurance', revenue.ni, committed?.revenue.ni],
                  ['Corporation tax', revenue.corpTax, committed?.revenue.corpTax],
                  ['VAT', revenue.vat, committed?.revenue.vat],
                  ['Other', revenue.other, committed?.revenue.other],
                  ['Reform receipts', revenue.reformBonus, committed?.revenue.reformBonus],
                ].filter(([_, vv]) => vv > 0).map(([label, cur, prev]) => (
                  <div key={label} className="flex justify-between">
                    <span className="text-stone-400">{label}</span>
                    <div className="flex items-baseline gap-2">
                      {prev !== undefined && Math.abs(cur - prev) >= 0.5 && (
                        <span className="text-stone-600 text-[10px]">{prev.toFixed(0)} →</span>
                      )}
                      <span className={cur !== prev && prev !== undefined ? (cur > prev ? 'text-emerald-400' : 'text-rose-400') : ''}>
                        {cur.toFixed(0)}
                      </span>
                    </div>
                  </div>
                ))}
                <div className="flex justify-between border-t border-stone-700 pt-1.5 mt-1.5 font-semibold">
                  <span>Total</span>
                  <div className="flex items-baseline gap-2">
                    {committed && Math.abs(revenue.total - committed.revenue.total) >= 0.5 && (
                      <span className="text-stone-600 text-[10px]">{committed.revenue.total.toFixed(0)} →</span>
                    )}
                    <span className="text-emerald-400">{revenue.total.toFixed(0)}</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="bg-stone-900/40 border border-stone-800 rounded-lg p-4 mb-4">
              <div className="text-[10px] uppercase tracking-wider text-stone-500 mb-3 flex justify-between">
                <span>Spending (£bn pa)</span>
                {committed && <span className="text-stone-600">Last Q → Now</span>}
              </div>
              <div className="space-y-1.5 text-[12px]" style={{fontFamily: 'IBM Plex Mono'}}>
                {[
                  ['Departmental', spending.departmental, committed?.spending.departmental],
                  ['Pensions + locked', spending.fixed, committed?.spending.fixed],
                  ['Reform ongoing', spending.reformOngoing, committed?.spending.reformOngoing],
                  ['Debt interest', spending.debtInterest, committed?.spending.debtInterest],
                ].filter(([_, vv]) => vv > 0).map(([label, cur, prev]) => (
                  <div key={label} className="flex justify-between">
                    <span className={label === 'Debt interest' ? 'text-rose-400' : 'text-stone-400'}>{label}</span>
                    <div className="flex items-baseline gap-2">
                      {prev !== undefined && Math.abs(cur - prev) >= 0.5 && (
                        <span className="text-stone-600 text-[10px]">{prev.toFixed(0)} →</span>
                      )}
                      <span className={cur !== prev && prev !== undefined ? (cur > prev ? 'text-rose-400' : 'text-emerald-400') : ''}>
                        {cur.toFixed(0)}
                      </span>
                    </div>
                  </div>
                ))}
                <div className="flex justify-between border-t border-stone-700 pt-1.5 mt-1.5 font-semibold">
                  <span>Total</span>
                  <div className="flex items-baseline gap-2">
                    {committed && Math.abs(spending.total - committed.spending.total) >= 0.5 && (
                      <span className="text-stone-600 text-[10px]">{committed.spending.total.toFixed(0)} →</span>
                    )}
                    <span className="text-rose-400">{spending.total.toFixed(0)}</span>
                  </div>
                </div>
              </div>
            </div>
            <div className={`border-2 rounded-lg p-4 ${balance >= 0 ? 'border-emerald-700 bg-emerald-950/20' : deficitGDP < 2 ? 'border-amber-700 bg-amber-950/20' : 'border-rose-900 bg-rose-950/20'}`}>
              <div className="text-[10px] uppercase tracking-wider mb-1 flex justify-between" style={{color: balance >= 0 ? '#34d399' : deficitGDP < 2 ? '#fbbf24' : '#fb7185'}}>
                <span>{balance >= 0 ? 'Surplus' : deficitGDP < 2 ? 'Sustainable Deficit' : 'Deficit'}</span>
                {balanceDiff !== null && Math.abs(balanceDiff) >= 0.5 && (
                  <span style={{color: balanceDiff > 0 ? '#34d399' : '#fb7185', fontFamily: 'IBM Plex Mono'}}>
                    {balanceDiff > 0 ? '+' : ''}{balanceDiff.toFixed(0)} vs Q{game.quarter - 1}
                  </span>
                )}
              </div>
              <div className={`display-font text-2xl font-medium ${balance >= 0 ? 'text-emerald-300' : deficitGDP < 2 ? 'text-amber-300' : 'text-rose-300'}`}>
                {fmtSigned(balance)}
              </div>
              <div className="text-[10px] text-stone-500 mt-1">
                {deficitGDP.toFixed(1)}% of GDP · GDP £{(game.gdp/1000).toFixed(2)}tn
                {deficitGDP < 2 && balance < 0 && ' · OBR-sustainable'}
              </div>
            </div>

            <div className="mt-4 bg-stone-900/40 border border-stone-800 rounded-lg p-4">
              <div className="text-[10px] uppercase tracking-wider text-stone-500 mb-3">National Debt</div>
              <div className="space-y-1.5 text-[12px]" style={{fontFamily: 'IBM Plex Mono'}}>
                <div className="flex justify-between"><span className="text-stone-400">Outstanding debt</span><span className="text-stone-200">£{(game.debt/1000).toFixed(2)}tn ({debtRatio}% GDP)</span></div>
                <div className="flex justify-between"><span className="text-stone-400">Gilt yield</span><span className="text-stone-200">{game.bondYield.toFixed(2)}%</span></div>
                <div className="flex justify-between"><span className="text-stone-400">Annual interest cost</span><span className="text-rose-400">£{spending.debtInterest.toFixed(0)}bn</span></div>
                {game.pendingSurplus > 0 && (
                  <div className="flex justify-between border-t border-stone-700 pt-1.5 mt-1.5"><span className="text-emerald-400">Pending surplus (unallocated)</span><span className="text-emerald-400">£{game.pendingSurplus.toFixed(0)}bn</span></div>
                )}
              </div>
              <div className="text-[10px] text-stone-500 mt-2 leading-snug">
                Every £1bn of debt at {game.bondYield.toFixed(1)}% gilt yield costs £{(game.bondYield*10).toFixed(0)}m in annual interest. Paying down debt reduces this drag on future budgets.
              </div>
            </div>
          </div>
        )}

        {tab === 'about' && (
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
                <button key={t.id} onClick={() => setAboutView(t.id)}
                  className={`flex-1 text-[11px] px-2 py-1.5 rounded transition-colors ${aboutView === t.id ? 'bg-amber-600 text-stone-950 font-semibold' : 'text-stone-400 hover:text-stone-200'}`}>
                  {t.label}
                </button>
              ))}
            </div>

            {aboutView === 'intro' && (
              <>
                <div className="bg-stone-900/40 border border-stone-800 rounded-lg p-4 mb-4">
                  <div className="text-[10px] uppercase tracking-wider text-amber-500 mb-2">The premise</div>
                  <p className="text-[12px] text-stone-300 leading-relaxed mb-2">
                    You inherit the UK with a £140bn annual deficit and debt at 100% of GDP. Twenty quarters (five years) to the next election. Coalition cohesion is your binding constraint — fall below {COALITION_FLOOR}% and the government collapses. Bond yields above {BOND_YIELD_CEILING}% and the markets take the keys.
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

            {aboutView === 'parameters' && (
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

            {aboutView === 'sources' && (
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
          </div>
        )}
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
