import React from 'react';
import { EVENT_DEFINITIONS } from '../model/index.js';

export function RisksTab({ riskMods }) {
  return (
    <div>
      <div className="mb-5">
        <h2 className="display-font text-xl font-medium italic text-stone-100 mb-1">Risk & Opportunity Register</h2>
        <p className="text-[11px] text-stone-500">Annual probabilities. Reforms and spending move these.</p>
      </div>
      <div className="mb-4">
        <div className="text-[10px] uppercase tracking-wider text-rose-400 mb-2">Crisis Risks</div>
        <div className="space-y-1.5">
          {['nhsStrike', 'energyShock', 'fuelPoverty', 'housingCrisis', 'councilBankruptcy', 'financialCrisis', 'generalStrike', 'careCrisis', 'flood', 'heatwave', 'allyCrisis', 'labourShortage', 'rateHikeShock', 'wagePriceSpiral', 'monetaryPolicyError']
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
  );
}
