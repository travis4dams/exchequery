import React from 'react';
import { Landmark, TrendingUp, Briefcase, Banknote, Home, Flame, LineChart } from 'lucide-react';
import { CitationLink } from './primitives/CitationLink.jsx';
import { Sparkline } from './Sparkline.jsx';

function Panel({ icon: Icon, title, children, badge }) {
  return (
    <div className="bg-stone-900/40 border border-stone-800 rounded-lg p-4 mb-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Icon size={13} className="text-amber-500" />
          <div className="text-[10px] uppercase tracking-wider text-stone-400">{title}</div>
        </div>
        {badge}
      </div>
      {children}
    </div>
  );
}

export function MarketsTab({ game, spending }) {
  const inflGap = game.inflation - game.inflationTarget;
  const unempGap = game.unemployment - game.naturalUnemployment;
  const realRate = game.bankRate - game.inflation;
  const mandateLabel = game.boeMandate === 'dual' ? 'Dual mandate' : 'Inflation-only';
  const hpi = game.housePriceIndex ?? 100;
  const energy = game.energyPriceIndex ?? 100;
  const housingCpiPp = 0.16 * (hpi / 100 - 1) * 10;
  const energyCpiPp = 0.04 * (energy / 100 - 1) * 10;
  const supplyKpa = Math.round(game.housingSupply ?? 220);
  const equity = game.equityIndex ?? 100;
  const riskPremium = game.riskPremium ?? 0;
  const peNarrative = game.taxCorp >= 28 ? 'P/E compressed: corp tax hostile'
    : game.growth >= 2 ? 'P/E expanding: growth tailwind'
    : 'P/E neutral';

  return (
    <div>
      <div className="mb-5">
        <h2 className="display-font text-xl font-medium italic text-stone-100 mb-1">Markets &amp; Money</h2>
        <p className="text-[11px] text-stone-500">
          Set independently of the Treasury. Your reforms can shift the BoE's mandate but not its hand.
        </p>
      </div>

      <Panel
        icon={Landmark}
        title="Bank Rate"
        badge={<span className="text-[9px] text-stone-500 uppercase tracking-wider">{mandateLabel}</span>}
      >
        <div className="flex items-end justify-between mb-2">
          <div>
            <div className="display-font text-3xl font-medium tabular-nums leading-none text-stone-100">
              {game.bankRate.toFixed(2)}%
            </div>
            <div className="text-[10px] text-stone-500 mt-1">
              Target {game.inflationTarget.toFixed(1)}% · Real rate {realRate.toFixed(2)}%
            </div>
          </div>
          <Sparkline points={game.bankRatePath || []} color="#fbbf24" />
        </div>
        <div className="text-[10px] text-stone-500 leading-snug">
          The MPC sets Bank Rate by Taylor-rule reaction to inflation
          {game.boeMandate === 'dual' && ' and unemployment'}. Your Treasury cannot
          override it. <CitationLink id="taylor_rule_classic" label="reference" />
        </div>
      </Panel>

      <Panel icon={TrendingUp} title="Inflation">
        <div className="flex items-end justify-between mb-2">
          <div>
            <div className={`display-font text-3xl font-medium tabular-nums leading-none ${
              Math.abs(inflGap) < 0.5 ? 'text-emerald-400' :
              Math.abs(inflGap) < 1.5 ? 'text-amber-400' : 'text-rose-400'
            }`}>
              {game.inflation.toFixed(2)}%
            </div>
            <div className="text-[10px] text-stone-500 mt-1">
              Target {game.inflationTarget.toFixed(1)}% · Gap {inflGap >= 0 ? '+' : ''}{inflGap.toFixed(1)}pp
            </div>
          </div>
          <div className="text-right text-[11px]" style={{fontFamily: 'IBM Plex Mono'}}>
            <div className="text-stone-500 text-[9px] uppercase tracking-wider">Drivers</div>
            <div className="text-stone-400">VAT · wages · growth</div>
          </div>
        </div>
        <div className="text-[10px] text-stone-500 leading-snug">
          Inflation is sticky (persistence ~0.85). Sudden tax cuts feed prices;
          a hot labour market and growth above trend push it up.{' '}
          <CitationLink id="phillips_demand_judgement" label="reference" />
        </div>
      </Panel>

      <Panel icon={Briefcase} title="Labour Market">
        <div className="flex items-end justify-between mb-2">
          <div>
            <div className={`display-font text-3xl font-medium tabular-nums leading-none ${
              Math.abs(unempGap) < 0.3 ? 'text-emerald-400' :
              unempGap > 0 ? 'text-rose-400' : 'text-amber-400'
            }`}>
              {game.unemployment.toFixed(2)}%
            </div>
            <div className="text-[10px] text-stone-500 mt-1">
              NAIRU {game.naturalUnemployment.toFixed(1)}% · Gap {unempGap >= 0 ? '+' : ''}{unempGap.toFixed(1)}pp
            </div>
          </div>
          <div className="text-right text-[11px]" style={{fontFamily: 'IBM Plex Mono'}}>
            <div className="text-stone-500 text-[9px] uppercase tracking-wider">Phillips</div>
            <div className={unempGap < 0 ? 'text-rose-400' : 'text-emerald-400'}>
              {unempGap < 0 ? 'Wage pressure' : 'Slack'}
            </div>
          </div>
        </div>
        <div className="text-[10px] text-stone-500 leading-snug">
          Below NAIRU and the labour market is hot — wages and prices push up.
          Above NAIRU and you have slack — inflation cools.{' '}
          <CitationLink id="okun_uk_estimate" label="Okun" />{' · '}
          <CitationLink id="boe_phillips_slope" label="Phillips" />
        </div>
      </Panel>

      <Panel icon={Home} title="Housing Market">
        <div className="flex items-end justify-between mb-2">
          <div>
            <div className={`display-font text-3xl font-medium tabular-nums leading-none ${
              hpi > 130 ? 'text-rose-400' : hpi > 115 ? 'text-amber-400' : 'text-stone-100'
            }`}>
              {hpi.toFixed(1)}
            </div>
            <div className="text-[10px] text-stone-500 mt-1">
              HPI · Supply {supplyKpa}k pa · CPI feed {housingCpiPp >= 0 ? '+' : ''}{housingCpiPp.toFixed(2)}pp
            </div>
          </div>
          <Sparkline points={game.housePricePath || []} color="#a78bfa" />
        </div>
        <div className="text-[10px] text-stone-500 leading-snug">
          House prices respond to wages, real rates, and supply. When HPI runs
          hot it bleeds into CPI via the housing weight.{' '}
          <CitationLink id="ons_cpih_weights" label="CPIH weights" />{' · '}
          <CitationLink id="barker_review" label="Barker" />
        </div>
      </Panel>

      <Panel icon={Flame} title="Energy Market">
        <div className="flex items-end justify-between mb-2">
          <div>
            <div className={`display-font text-3xl font-medium tabular-nums leading-none ${
              energy > 140 ? 'text-rose-400' : energy > 115 ? 'text-amber-400' : 'text-stone-100'
            }`}>
              {energy.toFixed(1)}
            </div>
            <div className="text-[10px] text-stone-500 mt-1">
              Energy index · CPI feed {energyCpiPp >= 0 ? '+' : ''}{energyCpiPp.toFixed(2)}pp
              {game.energyShockDamper && ' · Reform damper active'}
            </div>
          </div>
          <Sparkline points={game.energyPricePath || []} color="#f97316" />
        </div>
        <div className="text-[10px] text-stone-500 leading-snug">
          Energy shocks decay over ~6-8 quarters. Greener mix lowers the
          baseline; reforms also damp incoming shocks.{' '}
          <CitationLink id="imf_energy_shock_persistence" label="persistence" />{' · '}
          <CitationLink id="ccc_seventh_carbon_budget" label="CCC" />
        </div>
      </Panel>

      <Panel icon={LineChart} title="Equity Market">
        <div className="flex items-end justify-between mb-2">
          <div>
            <div className={`display-font text-3xl font-medium tabular-nums leading-none ${
              equity > 130 ? 'text-rose-400' : equity > 115 ? 'text-amber-400' : equity < 85 ? 'text-rose-400' : 'text-stone-100'
            }`}>
              {equity.toFixed(1)}
            </div>
            <div className="text-[10px] text-stone-500 mt-1">
              Equity index · {peNarrative}
            </div>
          </div>
          <Sparkline points={game.equityPath || []} color="#34d399" />
        </div>
        <div className="text-[10px] text-stone-500 leading-snug">
          Equities respond to growth, corp-tax stance, real rates, business
          sentiment, and noise. Wealth effect feeds back into growth (capped
          ±0.1pp/qtr).{' '}
          <CitationLink id="equity_index_methodology" label="methodology" />{' · '}
          <CitationLink id="damodaran_equity_risk_premium" label="wealth effect" />
        </div>
      </Panel>

      <Panel icon={Banknote} title="Debt Service">
        <div className="space-y-1.5 text-[12px]" style={{fontFamily: 'IBM Plex Mono'}}>
          <div className="flex justify-between">
            <span className="text-stone-400">Short rate (Bank Rate)</span>
            <span className="text-stone-200">{game.bankRate.toFixed(2)}%</span>
          </div>
          <div className="flex justify-between">
            <span className="text-stone-400">Gilt yield (market)</span>
            <span className={game.bondYield < 4.5 ? 'text-emerald-400' : game.bondYield < 6 ? 'text-stone-200' : 'text-rose-400'}>
              {game.bondYield.toFixed(2)}%
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-stone-400">Risk premium</span>
            <span className={riskPremium < 1 ? 'text-emerald-400' : riskPremium < 2 ? 'text-amber-400' : 'text-rose-400'}>
              {riskPremium.toFixed(2)}pp
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-stone-400">Effective rate on stock</span>
            <span className="text-stone-200">{game.effectiveServicingRate.toFixed(2)}%</span>
          </div>
          <div className="flex justify-between">
            <span className="text-stone-400">Annual interest cost</span>
            <span className="text-rose-400">£{spending.debtInterest.toFixed(0)}bn</span>
          </div>
        </div>
        <div className="mt-2 w-full h-1 bg-stone-800 rounded-full overflow-hidden">
          <div className={`h-full ${riskPremium < 1 ? 'bg-emerald-500' : riskPremium < 2 ? 'bg-amber-500' : 'bg-rose-500'}`}
               style={{width: `${Math.min(100, riskPremium / 4 * 100)}%`}} />
        </div>
        <div className="text-[10px] text-stone-500 leading-snug mt-3">
          Long yield = Bank Rate + term premium + deficit kicker + risk premium.
          Risk premium widens with debt over 100% of GDP and with cohesion
          volatility.{' '}
          <CitationLink id="boe_term_premium" label="term premium" />{' · '}
          <CitationLink id="reinhart_rogoff_sovereign_premium" label="sovereign spread" />
        </div>
      </Panel>
    </div>
  );
}
