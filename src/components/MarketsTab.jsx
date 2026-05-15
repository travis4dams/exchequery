import React from 'react';
import { Landmark, TrendingUp, Briefcase, Banknote, Home, Flame } from 'lucide-react';
import { CitationLink } from './primitives/CitationLink.jsx';

// Inline SVG sparkline. Renders the path of `points` (numbers) within the
// box, with the latest point as a filled dot.
function Sparkline({ points, width = 120, height = 28, color = '#fbbf24' }) {
  if (!points || points.length < 2) {
    return <svg width={width} height={height} />;
  }
  const lo = Math.min(...points);
  const hi = Math.max(...points);
  const range = hi - lo || 1;
  const xs = points.map((_, i) => (i / (points.length - 1)) * width);
  const ys = points.map(p => height - ((p - lo) / range) * (height - 4) - 2);
  const d = points.map((_, i) => `${i === 0 ? 'M' : 'L'} ${xs[i].toFixed(1)} ${ys[i].toFixed(1)}`).join(' ');
  return (
    <svg width={width} height={height} className="flex-shrink-0">
      <path d={d} fill="none" stroke={color} strokeWidth="1.5" />
      <circle cx={xs[xs.length - 1]} cy={ys[ys.length - 1]} r="2.5" fill={color} />
    </svg>
  );
}

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

      <Panel icon={Banknote} title="Debt Service">
        <div className="space-y-1.5 text-[12px]" style={{fontFamily: 'IBM Plex Mono'}}>
          <div className="flex justify-between">
            <span className="text-stone-400">Gilt yield (market)</span>
            <span className={game.bondYield < 4.5 ? 'text-emerald-400' : game.bondYield < 6 ? 'text-stone-200' : 'text-rose-400'}>
              {game.bondYield.toFixed(2)}%
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
        <div className="text-[10px] text-stone-500 leading-snug mt-3">
          Yields are anchored to Bank Rate plus a term premium and a deficit
          kicker. The effective rate on existing debt drifts toward the market
          yield as gilts mature.{' '}
          <CitationLink id="boe_term_premium" label="term premium" />{' · '}
          <CitationLink id="monetary_deficit_yield_judgement" label="deficit kicker" />
        </div>
      </Panel>
    </div>
  );
}
