import React from 'react';

const fmtSigned = (n) => (n >= 0 ? '+' : '−') + (Math.abs(n) >= 1000 ? `£${(Math.abs(n)/1000).toFixed(1)}tn` : `£${Math.abs(n).toFixed(0)}bn`);

export function LedgerTab({ game, revenue, spending, balance, deficitGDP, balanceDiff, committed, debtRatio }) {
  return (
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
          <div className="flex justify-between"><span className="text-stone-400">Gilt yield (market)</span><span className="text-stone-200">{game.bondYield.toFixed(2)}%</span></div>
          <div className="flex justify-between"><span className="text-stone-400">Effective rate on stock</span><span className="text-stone-200">{game.effectiveServicingRate.toFixed(2)}%</span></div>
          <div className="flex justify-between"><span className="text-stone-400">Annual interest cost</span><span className="text-rose-400">£{spending.debtInterest.toFixed(0)}bn</span></div>
          {game.pendingSurplus > 0 && (
            <div className="flex justify-between border-t border-stone-700 pt-1.5 mt-1.5"><span className="text-emerald-400">Pending surplus (unallocated)</span><span className="text-emerald-400">£{game.pendingSurplus.toFixed(0)}bn</span></div>
          )}
        </div>
        <div className="text-[10px] text-stone-500 mt-2 leading-snug">
          Interest cost is driven by the effective rate paid on the existing debt stock ({game.effectiveServicingRate.toFixed(1)}%), not the live gilt yield. Each £1bn of debt costs £{(game.effectiveServicingRate*10).toFixed(0)}m pa at the current effective rate. The effective rate drifts toward the market yield as gilts mature and are re-issued.
        </div>
      </div>
    </div>
  );
}
