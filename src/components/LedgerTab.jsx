import React from 'react';
import { Card } from './primitives/Card.jsx';
import { Stack, TwoCol } from './primitives/Layout.jsx';

const fmtSigned = (n) => (n >= 0 ? '+' : '−') + (Math.abs(n) >= 1000 ? `£${(Math.abs(n)/1000).toFixed(1)}tn` : `£${Math.abs(n).toFixed(0)}bn`);

function LedgerTable({ eyebrow, rows, total, totalColor, negativeRows, committed }) {
  return (
    <Card variant="raised" padding="md" className="h-full">
      <Card.Header>
        <Card.Eyebrow>{eyebrow}</Card.Eyebrow>
        {committed && <Card.Meta>Last Q → Now</Card.Meta>}
      </Card.Header>
      <div className="space-y-1.5 text-[12px] font-mono">
        {rows.filter(([_, cur]) => cur > 0).map(([label, cur, prev]) => {
          const labelClass = negativeRows?.includes(label) ? 'text-signal-bad' : 'text-stone-400';
          const valueDelta = prev !== undefined && cur !== prev;
          const valueClass = valueDelta
            ? (negativeRows?.includes(label)
                ? (cur > prev ? 'text-signal-bad' : 'text-signal-good')
                : (cur > prev ? 'text-signal-good' : 'text-signal-bad'))
            : '';
          return (
            <div key={label} className="flex justify-between items-baseline">
              <span className={labelClass}>{label}</span>
              <div className="flex items-baseline gap-2">
                {prev !== undefined && Math.abs(cur - prev) >= 0.5 && (
                  <span className="text-stone-600 text-[10px] tabular-nums">{prev.toFixed(0)} →</span>
                )}
                <span className={`tabular-nums ${valueClass}`}>{cur.toFixed(0)}</span>
              </div>
            </div>
          );
        })}
        <div className="flex justify-between items-baseline border-t border-treasury-800 pt-1.5 mt-1.5 font-semibold">
          <span className="text-stone-200">Total</span>
          <div className="flex items-baseline gap-2">
            {total.prev !== undefined && Math.abs(total.cur - total.prev) >= 0.5 && (
              <span className="text-stone-600 text-[10px] tabular-nums">{total.prev.toFixed(0)} →</span>
            )}
            <span className={`tabular-nums ${totalColor}`}>{total.cur.toFixed(0)}</span>
          </div>
        </div>
      </div>
    </Card>
  );
}

function BalanceCard({ game, balance, deficitGDP, balanceDiff }) {
  const tone = balance >= 0 ? 'good' : deficitGDP < 2 ? 'warn' : 'bad';
  const valueColor = balance >= 0 ? 'text-signal-good' : deficitGDP < 2 ? 'text-accent-300' : 'text-signal-bad';
  const labelColor = balance >= 0 ? 'text-signal-good' : deficitGDP < 2 ? 'text-accent-400' : 'text-signal-bad';
  const heading = balance >= 0 ? 'Surplus' : deficitGDP < 2 ? 'Sustainable Deficit' : 'Deficit';
  return (
    <Card variant="signal" tone={tone} padding="md">
      <div className={`text-[10px] uppercase tracking-wider flex justify-between mb-1 ${labelColor}`}>
        <span>{heading}</span>
        {balanceDiff !== null && Math.abs(balanceDiff) >= 0.5 && (
          <span className={`font-mono tabular-nums ${balanceDiff > 0 ? 'text-signal-good' : 'text-signal-bad'}`}>
            {balanceDiff > 0 ? '+' : ''}{balanceDiff.toFixed(0)} vs Q{game.quarter - 1}
          </span>
        )}
      </div>
      <div className={`font-display text-3xl md:text-4xl font-medium tabular-nums ${valueColor}`}>
        {fmtSigned(balance)}
      </div>
      <div className="text-[10px] text-stone-500 mt-1.5">
        {deficitGDP.toFixed(1)}% of GDP · GDP £{(game.gdp/1000).toFixed(2)}tn
        {deficitGDP < 2 && balance < 0 && ' · OBR-sustainable'}
      </div>
    </Card>
  );
}

function DebtCard({ game, spending, debtRatio }) {
  return (
    <Card variant="raised" padding="md">
      <Card.Header>
        <Card.Eyebrow>National Debt</Card.Eyebrow>
      </Card.Header>
      <div className="space-y-1.5 text-[12px] font-mono">
        <div className="flex justify-between">
          <span className="text-stone-400">Outstanding debt</span>
          <span className="text-stone-200 tabular-nums">
            £{(game.debt/1000).toFixed(2)}tn ({debtRatio}% GDP)
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-stone-400">Gilt yield (market)</span>
          <span className="text-stone-200 tabular-nums">{game.bondYield.toFixed(2)}%</span>
        </div>
        <div className="flex justify-between">
          <span className="text-stone-400">Effective rate on stock</span>
          <span className="text-stone-200 tabular-nums">{game.effectiveServicingRate.toFixed(2)}%</span>
        </div>
        <div className="flex justify-between">
          <span className="text-stone-400">Annual interest cost</span>
          <span className="text-signal-bad tabular-nums">£{spending.debtInterest.toFixed(0)}bn</span>
        </div>
        {game.pendingSurplus > 0 && (
          <div className="flex justify-between border-t border-treasury-800 pt-1.5 mt-1.5">
            <span className="text-signal-good">Pending surplus (unallocated)</span>
            <span className="text-signal-good tabular-nums">£{game.pendingSurplus.toFixed(0)}bn</span>
          </div>
        )}
      </div>
      <div className="text-[10px] text-stone-500 mt-3 leading-snug">
        Interest cost is driven by the effective rate paid on the existing debt stock ({game.effectiveServicingRate.toFixed(1)}%), not the live gilt yield. Each £1bn of debt costs £{(game.effectiveServicingRate*10).toFixed(0)}m pa at the current effective rate. The effective rate drifts toward the market yield as gilts mature and are re-issued.
      </div>
    </Card>
  );
}

export function LedgerTab({ game, revenue, spending, balance, deficitGDP, balanceDiff, committed, debtRatio }) {
  const revenueRows = [
    ['Income tax',         revenue.incomeTax,   committed?.revenue.incomeTax],
    ['National Insurance', revenue.ni,          committed?.revenue.ni],
    ['Corporation tax',    revenue.corpTax,     committed?.revenue.corpTax],
    ['VAT',                revenue.vat,         committed?.revenue.vat],
    ['Other',              revenue.other,       committed?.revenue.other],
    ['Reform receipts',    revenue.reformBonus, committed?.revenue.reformBonus],
  ];
  const spendingRows = [
    ['Departmental',     spending.departmental,  committed?.spending.departmental],
    ['Pensions + locked', spending.fixed,         committed?.spending.fixed],
    ['Reform ongoing',   spending.reformOngoing, committed?.spending.reformOngoing],
    ['Debt interest',    spending.debtInterest,  committed?.spending.debtInterest],
  ];
  return (
    <Stack gap="lg">
      <div>
        <h2 className="font-display text-2xl md:text-3xl font-medium italic text-stone-100 mb-1">Fiscal Position</h2>
        <p className="text-[12px] text-stone-500">Annualised. Revenue scales with nominal GDP.</p>
      </div>

      <TwoCol
        ratio="even"
        gap="md"
        main={
          <LedgerTable
            eyebrow="Revenue (£bn pa)"
            rows={revenueRows}
            total={{ cur: revenue.total, prev: committed?.revenue.total }}
            totalColor="text-signal-good"
            committed={committed}
          />
        }
        side={
          <LedgerTable
            eyebrow="Spending (£bn pa)"
            rows={spendingRows}
            total={{ cur: spending.total, prev: committed?.spending.total }}
            totalColor="text-signal-bad"
            negativeRows={['Debt interest']}
            committed={committed}
          />
        }
      />

      <BalanceCard game={game} balance={balance} deficitGDP={deficitGDP} balanceDiff={balanceDiff} />

      <DebtCard game={game} spending={spending} debtRatio={debtRatio} />
    </Stack>
  );
}
