import React from 'react';
import { AlertCircle, CheckCircle2, ChevronDown, Eye, Undo2 } from 'lucide-react';
import { REFORMS, REFORM_BRANCHES, reformCapacityLoad, pcCostBreakdown } from '../model/index.js';
import { ReformCard } from './primitives/ReformCard.jsx';
import { CitationLink } from './primitives/CitationLink.jsx';
import { Card } from './primitives/Card.jsx';
import { MeterBar } from './primitives/MeterBar.jsx';
import { Stack, TwoCol } from './primitives/Layout.jsx';

const unwrap = (leaf) => (leaf && typeof leaf === 'object' && 'value' in leaf) ? leaf.value : leaf;

function CapacityCard({ reformLoadInFlight, reformCapacity }) {
  const pct = reformCapacity > 0 ? (reformLoadInFlight / reformCapacity) * 100 : 0;
  const full = reformLoadInFlight >= reformCapacity;
  return (
    <Card variant="raised" padding="md">
      <Card.Header>
        <Card.Eyebrow>Reform Capacity</Card.Eyebrow>
        <span className={`text-[11px] font-mono tabular-nums ${full ? 'text-accent-400' : 'text-stone-300'}`}>
          {reformLoadInFlight} / {reformCapacity} used
        </span>
      </Card.Header>
      <MeterBar value={pct} tone={full ? 'warn' : 'good'} />
      <div className="text-[10px] text-stone-500 mt-2 leading-snug">
        Scales with departmental spending. Civil Service Rebuild adds +2.
      </div>
      {full && (
        <div className="mt-2 text-[11px] text-accent-300">
          Capacity full — cancel or complete a reform to start another.
        </div>
      )}
    </Card>
  );
}

function QueuedSummary({ proposedReforms, game, coalitionCohesion, onUnpropose }) {
  if (proposedReforms.length === 0) return null;
  const rows = proposedReforms.map((id) => {
    const reform = REFORMS[id];
    const pc = pcCostBreakdown(reform, { ...game, coalitionCohesion }).total;
    return { id, name: reform.name, cost: unwrap(reform.cost), pc };
  });
  const totalCost = rows.reduce((s, r) => s + r.cost, 0);
  const totalPc = rows.reduce((s, r) => s + r.pc, 0);
  return (
    <Card variant="signal" tone="info" padding="md">
      <Card.Header>
        <Card.Eyebrow className="text-signal-info">
          Queued · {proposedReforms.length} reform{proposedReforms.length === 1 ? '' : 's'}
        </Card.Eyebrow>
        <Card.Meta>starts next quarter</Card.Meta>
      </Card.Header>
      <div className="space-y-1.5">
        {rows.map((r) => (
          <div key={r.id} className="flex items-center gap-2 text-[11px]">
            <span className="text-sky-200 flex-1 truncate">{r.name}</span>
            <span className="text-signal-info font-mono tabular-nums w-12 text-right">£{r.cost}bn</span>
            <span className="text-accent-300 font-mono tabular-nums w-10 text-right">{r.pc.toFixed(0)} PC</span>
            <button onClick={() => onUnpropose(r.id)}
                    className="text-signal-info hover:text-sky-100 transition-colors"
                    title="Remove from queue">
              <Undo2 size={11} />
            </button>
          </div>
        ))}
      </div>
      <div className="border-t border-sky-900/60 mt-2 pt-1.5 flex items-center gap-2 text-[11px]">
        <span className="text-signal-info flex-1 uppercase tracking-wider text-[10px]">Total on commit</span>
        <span className="text-sky-200 font-mono tabular-nums w-12 text-right font-semibold">£{totalCost.toFixed(1)}bn</span>
        <span className="text-accent-300 font-mono tabular-nums w-10 text-right font-semibold">{totalPc.toFixed(0)} PC</span>
        <span className="w-[14px]" />
      </div>
    </Card>
  );
}

function CompletedReformRow({ id, reform, status, onInspect }) {
  const startedQ = status?.startedQ;
  const completesQ = status?.completesQ;
  return (
    <div className="flex items-center gap-2 text-[11px] py-1 border-b border-treasury-800/60 last:border-0">
      <CheckCircle2 size={11} className="text-signal-good flex-shrink-0" />
      <span className="text-stone-300 flex-1 truncate">{reform.name}</span>
      {startedQ != null && completesQ != null && (
        <span className="text-[10px] text-stone-500 font-mono tabular-nums">
          Q{startedQ}–Q{completesQ}
        </span>
      )}
      {reform.citationId && <CitationLink id={reform.citationId} />}
      {onInspect && (
        <button onClick={() => onInspect(reform)}
                className="text-stone-500 hover:text-stone-200 transition-colors"
                title="Inspect reform">
          <Eye size={11} />
        </button>
      )}
    </div>
  );
}

export function ReformsTab({
  game, coalitionCohesion, canStartReform, proposeReform, unproposeReform,
  cancelReform, reformCapacity, reformLoadInFlight, onInspect,
}) {
  const completedEntries = Object.entries(game.reforms)
    .filter(([_, r]) => r.status === 'complete')
    .map(([id, r]) => ({ id, reform: REFORMS[id], status: r }))
    .filter((x) => x.reform);

  const obrIndependent = (game.forecastNoiseMultiplier ?? 1) < 1;

  // Main column: branch-grouped reform cards.
  const branchesContent = Object.keys(REFORM_BRANCHES).map(branch => {
    const branchReforms = Object.entries(REFORMS)
      .filter(([_, r]) => r.branch === branch)
      .filter(([id]) => game.reforms[id]?.status !== 'complete');
    if (branchReforms.length === 0) return null;
    return (
      <div key={branch}>
        <div className="text-[10px] uppercase tracking-wider text-accent-500 mb-2 font-semibold">
          {REFORM_BRANCHES[branch]}
        </div>
        {branchReforms.map(([id, r]) => {
          const prereqMet = r.prereq.every(p => game.reforms[p]?.status === 'complete');
          const fitsCapacity = reformLoadInFlight + reformCapacityLoad(r) <= reformCapacity;
          const pcBreakdown = pcCostBreakdown(r, { ...game, coalitionCohesion });
          const canAffordPc = pcBreakdown.total <= game.politicalCapital;
          return (
            <ReformCard key={id} id={id} reform={r}
                        status={game.reforms[id]}
                        isProposed={game.proposedReforms.includes(id)}
                        onPropose={() => proposeReform(id)}
                        onUnpropose={() => unproposeReform(id)}
                        onCancel={() => cancelReform(id)}
                        canStart={canStartReform(id)}
                        prereqMet={prereqMet}
                        fitsCapacity={fitsCapacity}
                        load={reformCapacityLoad(r)}
                        currentQ={game.globalQuarter}
                        coalitionCohesion={coalitionCohesion}
                        pcBreakdown={pcBreakdown}
                        canAffordPc={canAffordPc}
                        availablePc={game.politicalCapital}
                        onInspect={() => onInspect(r)} />
          );
        })}
      </div>
    );
  });

  // Side rail on lg+: capacity meter, queued summary, and the OBR hint.
  // On mobile / md these stack on top of the branches.
  const sideRail = (
    <Stack gap="md">
      <CapacityCard reformLoadInFlight={reformLoadInFlight} reformCapacity={reformCapacity} />
      <QueuedSummary
        proposedReforms={game.proposedReforms}
        game={game}
        coalitionCohesion={coalitionCohesion}
        onUnpropose={unproposeReform}
      />
      {!obrIndependent && (
        <Card variant="signal" tone="warn" padding="md">
          <div className="text-[11px] text-accent-300 leading-snug">
            Each reform carries its own forecast band (see Inspect). Pass{' '}
            <strong>OBR Independence</strong> to narrow every band by 60%.
          </div>
        </Card>
      )}
    </Stack>
  );

  return (
    <Stack gap="lg">
      <div>
        <h2 className="font-display text-2xl md:text-3xl font-medium italic text-stone-100 mb-1">
          Reform Programme
        </h2>
        <p className="text-[12px] text-stone-500">
          Tap eye icon for full details + uncertainty bands.{' '}
          <AlertCircle size={10} className="inline text-accent-500" /> marks contested evidence.
        </p>
      </div>

      <TwoCol
        ratio="3-1"
        gap="lg"
        main={<Stack gap="lg">{branchesContent}</Stack>}
        side={sideRail}
      />

      {completedEntries.length > 0 && (
        <Card variant="raised" padding="md" as="details" className="group">
          <summary className="text-[11px] uppercase tracking-wider text-signal-good cursor-pointer flex items-center gap-1.5 list-none font-semibold">
            <ChevronDown size={11} className="transition-transform group-open:rotate-0 -rotate-90" />
            Completed Reform Projects · {completedEntries.length} delivered
          </summary>
          <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-x-4">
            {completedEntries.map(({ id, reform, status }) => (
              <CompletedReformRow key={id} id={id} reform={reform} status={status}
                                  onInspect={onInspect} />
            ))}
          </div>
        </Card>
      )}
    </Stack>
  );
}
