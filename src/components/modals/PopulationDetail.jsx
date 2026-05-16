import React from 'react';
import { Modal } from '../primitives/Modal.jsx';
import { Card } from '../primitives/Card.jsx';

// Stub population-detail modal — the births / deaths / net-migration
// decomposition isn't tracked in `game` state yet. Once the model exposes
// those components, replace the placeholder with the real breakdown.
export function PopulationDetail({ game, populationChange, onClose }) {
  const popM = game.population;
  // Annualised pop-growth rate from the net quarterly change (4× the
  // quarter's rate as a percent of current population). Approximation;
  // ignores compounding within the year.
  const qRate = popM > 0 ? (populationChange / popM) * 100 : 0;
  const annualRate = qRate * 4;
  return (
    <Modal tone="neutral" size="md" onClose={onClose} showCloseButton className="relative">
      <div className="mb-4 pr-6">
        <Card.Eyebrow>Population</Card.Eyebrow>
        <h2 className="font-display text-xl md:text-2xl font-medium italic text-stone-100 mt-1">
          {popM.toFixed(2)} million
        </h2>
        <p className="text-[12px] text-stone-500 mt-1">UK resident population. Q-on-Q net change.</p>
      </div>

      <div className="bg-treasury-900/60 rounded-md p-3 mb-3 space-y-1.5 text-[12px] font-mono">
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

      <Card variant="signal" tone="info" padding="md">
        <Card.Eyebrow className="text-signal-info">Breakdown coming soon</Card.Eyebrow>
        <p className="text-[12px] text-stone-300 leading-relaxed mt-1">
          Births, deaths, and net migration aren't yet tracked separately —
          the simulation models the net only. A future update will surface
          the decomposition here so you can see which channel is driving the
          shift.
        </p>
      </Card>
    </Modal>
  );
}
