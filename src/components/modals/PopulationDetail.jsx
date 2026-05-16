import React from 'react';
import { Modal } from '../primitives/Modal.jsx';
import { Card } from '../primitives/Card.jsx';
import { Sparkline } from '../primitives/Sparkline.jsx';
import { PARAMS } from '../../model/index.js';

const v = (leaf) => (leaf && typeof leaf === 'object' && 'value' in leaf) ? leaf.value : leaf;

// Cap path slice for sparklines.
const SPARK_Q = 8;

function ChannelCard({ label, valueK, path, tone, driver }) {
  const sign = valueK >= 0 ? '+' : '−';
  const colorCls = tone === 'good' ? 'text-signal-good'
                 : tone === 'bad'  ? 'text-signal-bad'
                 : 'text-stone-200';
  const recent = (path || []).slice(-SPARK_Q);
  return (
    <Card variant="raised" padding="md">
      <Card.Eyebrow>{label}</Card.Eyebrow>
      <div className={`text-[15px] font-mono font-semibold tabular-nums ${colorCls} mt-1`}>
        {sign}{Math.abs(valueK).toFixed(0)}k
        <span className="text-stone-500 text-[10px] font-normal ml-1">/q</span>
      </div>
      <div className="mt-1.5 h-[28px]">
        {recent.length >= 2 && (
          <Sparkline points={recent} width={160} height={28} responsive
                     color={tone === 'bad' ? 'var(--signal-bad)' : 'var(--signal-good)'}
                     strokeWidth={1.5} />
        )}
      </div>
      <p className="text-[11px] text-stone-400 leading-snug mt-1.5">{driver}</p>
    </Card>
  );
}

// Driver attribution — threshold-gated narrative. Reform flag is reported
// first when active, then health/labour drift if it crosses a minimum
// magnitude. Small contributions are dropped so the driver line stays a
// single sentence.
function birthsDriver(game) {
  const P = PARAMS.population;
  const I = PARAMS.initial;
  const baseline = v(P.birthsBaselineQ);
  const healthDrift = v(P.birthsHealthCoef) * (game.healthIndex - v(I.healthIndex));
  const childcareOn = game.reforms?.freeChildcare?.status === 'complete';
  const parts = [];
  if (childcareOn) parts.push('free childcare lifting fertility');
  if (Math.abs(healthDrift) >= 2) {
    parts.push(healthDrift > 0
      ? 'population health above baseline'
      : 'health pressures weighing on births');
  }
  if (!parts.length) return `Tracking baseline ~${baseline.toFixed(0)}k/q.`;
  return parts[0].charAt(0).toUpperCase() + parts[0].slice(1) + (parts[1] ? `; ${parts[1]}.` : '.');
}

function deathsDriver(game) {
  const P = PARAMS.population;
  const I = PARAMS.initial;
  const baseline = v(P.deathsBaselineQ);
  const healthDrift = v(P.deathsHealthCoef) * (game.healthIndex - v(I.healthIndex));
  const nhsDrift    = v(P.deathsNHSCoef) * (game.spendNHS - v(I.spendNHS));
  const parts = [];
  if (Math.abs(healthDrift) >= 2) {
    parts.push(healthDrift < 0  // negative coef × positive (good) health = fewer deaths
      ? 'better population health bringing deaths down'
      : 'poor health raising mortality');
  }
  if (Math.abs(nhsDrift) >= 1) {
    parts.push(nhsDrift < 0
      ? 'NHS funding above baseline'
      : 'NHS underfunding raising mortality');
  }
  if (!parts.length) return `Tracking baseline ~${baseline.toFixed(0)}k/q.`;
  return parts[0].charAt(0).toUpperCase() + parts[0].slice(1) + (parts[1] ? `; ${parts[1]}.` : '.');
}

function migrationDriver(game) {
  const P = PARAMS.population;
  const baseline = v(P.netMigrationBaselineQ);
  const unempGap = (game.unemployment ?? 0) - (game.naturalUnemployment ?? 0);
  const labourPull = v(P.migrationUnempCoef) * unempGap;
  const capOn = game.reforms?.immigrationCap?.status === 'complete';
  const parts = [];
  if (capOn) parts.push('immigration cap suppressing inflows');
  if (Math.abs(labourPull) >= 3) {
    parts.push(labourPull > 0
      ? 'tight labour market pulling workers in'
      : 'labour-market slack reducing inflows');
  }
  if (!parts.length) return `Tracking baseline ~${baseline.toFixed(0)}k/q.`;
  return parts[0].charAt(0).toUpperCase() + parts[0].slice(1) + (parts[1] ? `; ${parts[1]}.` : '.');
}

export function PopulationDetail({ game, populationChange, onClose }) {
  const popM = game.population;
  const qRate = popM > 0 ? (populationChange / popM) * 100 : 0;
  const annualRate = qRate * 4;
  const births = game.births ?? v(PARAMS.population.birthsBaselineQ);
  const deaths = game.deaths ?? v(PARAMS.population.deathsBaselineQ);
  const netMig = game.netMigration ?? v(PARAMS.population.netMigrationBaselineQ);
  return (
    <Modal tone="neutral" size="md" onClose={onClose} showCloseButton className="relative">
      <div className="mb-4 pr-6">
        <Card.Eyebrow>Population</Card.Eyebrow>
        <h2 className="font-display text-xl md:text-2xl font-medium italic text-stone-100 mt-1">
          {popM.toFixed(2)} million
        </h2>
        <p className="text-[12px] text-stone-500 mt-1">UK resident population. Q-on-Q net change.</p>
      </div>

      <div className="bg-treasury-900/60 rounded-md p-3 mb-4 space-y-1.5 text-[12px] font-mono">
        <div className="flex justify-between">
          <span className="text-stone-400">Net change last quarter</span>
          <span className={`tabular-nums ${populationChange >= 0 ? 'text-signal-good' : 'text-signal-bad'}`}>
            {populationChange >= 0 ? '+' : ''}{(populationChange * 1000).toFixed(0)}k
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-stone-400">Implied annual rate</span>
          <span className={`tabular-nums ${annualRate >= 0 ? 'text-signal-good' : 'text-signal-bad'}`}>
            {annualRate >= 0 ? '+' : ''}{annualRate.toFixed(2)}%
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
        <ChannelCard label="Births"     valueK={births}  path={game.birthsPath}        tone="good" driver={birthsDriver(game)} />
        <ChannelCard label="Deaths"     valueK={-deaths} path={game.deathsPath}        tone="bad"  driver={deathsDriver(game)} />
        <ChannelCard label="Net migration" valueK={netMig} path={game.netMigrationPath} tone={netMig >= 0 ? 'good' : 'bad'} driver={migrationDriver(game)} />
      </div>
    </Modal>
  );
}
