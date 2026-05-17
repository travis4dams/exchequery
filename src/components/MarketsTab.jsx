import React from 'react';
import { Landmark, TrendingUp, Briefcase, Banknote, Home, Flame, LineChart } from 'lucide-react';
import { CitationLink } from './primitives/CitationLink.jsx';
import { Sparkline } from './primitives/Sparkline.jsx';
import { Card } from './primitives/Card.jsx';
import { Grid, Stack } from './primitives/Layout.jsx';

// Market panel — icon + title header, big metric, optional sparkline that
// fills the column width on desktop, narrative footer.
function Panel({ icon: Icon, title, badge, metric, secondary, sparklinePoints, sparklineColor, footer }) {
  return (
    <Card variant="raised" padding="md" className="h-full flex flex-col">
      <Card.Header>
        <div className="flex items-center gap-2 min-w-0">
          <Icon size={13} className="text-accent-500 flex-shrink-0" />
          <div className="text-[10px] uppercase tracking-wider text-stone-400 truncate">{title}</div>
        </div>
        {badge && <div className="text-[9px] text-stone-500 uppercase tracking-wider flex-shrink-0">{badge}</div>}
      </Card.Header>

      <div className="flex items-end justify-between gap-3 mb-2">
        <div className="min-w-0">{metric}</div>
        {secondary && <div className="text-right text-[11px] font-mono flex-shrink-0">{secondary}</div>}
      </div>

      {sparklinePoints && (
        <div className="w-full -mx-1 mb-2">
          <Sparkline points={sparklinePoints} width={400} height={42} responsive
                     color={sparklineColor || 'var(--accent-400)'} strokeWidth={1.5} dotRadius={2.5} />
        </div>
      )}

      {footer && (
        <div className="text-[10px] text-stone-500 leading-snug mt-auto">
          {footer}
        </div>
      )}
    </Card>
  );
}

function Metric({ value, color = 'text-stone-100', sub }) {
  return (
    <>
      <div className={`font-display text-3xl md:text-4xl font-medium tabular-nums leading-none ${color}`}>
        {value}
      </div>
      {sub && <div className="text-[10px] text-stone-500 mt-1.5">{sub}</div>}
    </>
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

  const inflColor = Math.abs(inflGap) < 0.5 ? 'text-signal-good'
    : Math.abs(inflGap) < 1.5 ? 'text-accent-400' : 'text-signal-bad';
  const unempColor = Math.abs(unempGap) < 0.3 ? 'text-signal-good'
    : unempGap > 0 ? 'text-signal-bad' : 'text-accent-400';
  const hpiColor = hpi > 130 ? 'text-signal-bad' : hpi > 115 ? 'text-accent-400' : 'text-stone-100';
  const energyColor = energy > 140 ? 'text-signal-bad' : energy > 115 ? 'text-accent-400' : 'text-stone-100';
  const equityColor = equity > 130 ? 'text-signal-bad' : equity > 115 ? 'text-accent-400' : equity < 85 ? 'text-signal-bad' : 'text-stone-100';

  return (
    <Stack gap="lg">
      <div>
        <h2 className="font-display text-2xl md:text-3xl font-medium italic text-stone-100 mb-1">Markets &amp; Money</h2>
        <p className="text-[12px] text-stone-500">
          Set independently of the Treasury. Your reforms can shift the BoE's mandate but not its hand.
        </p>
      </div>

      <Grid cols={{ base: 1, md: 2 }} gap="md">
        <Panel
          icon={Landmark}
          title="Bank Rate"
          badge={mandateLabel}
          metric={
            <Metric value={`${game.bankRate.toFixed(2)}%`} color="text-stone-100"
                    sub={`Target ${game.inflationTarget.toFixed(1)}% · Real rate ${realRate.toFixed(2)}%`} />
          }
          sparklinePoints={game.bankRatePath || []}
          sparklineColor="var(--accent-400)"
          footer={<>
            The MPC sets Bank Rate by Taylor-rule reaction to inflation
            {game.boeMandate === 'dual' && ' and unemployment'}. Your Treasury cannot
            override it. <CitationLink id="taylor_rule_classic" label="reference" />
          </>}
        />

        <Panel
          icon={TrendingUp}
          title="Inflation"
          metric={
            <Metric value={`${game.inflation.toFixed(2)}%`} color={inflColor}
                    sub={`Target ${game.inflationTarget.toFixed(1)}% · Gap ${inflGap >= 0 ? '+' : ''}${inflGap.toFixed(1)}pp`} />
          }
          secondary={<>
            <div className="text-stone-500 text-[9px] uppercase tracking-wider">Drivers</div>
            <div className="text-stone-400">VAT · wages · growth</div>
          </>}
          footer={<>
            Inflation is sticky (persistence ~0.85). Sudden tax cuts feed prices;
            a hot labour market and growth above trend push it up.{' '}
            <CitationLink id="phillips_demand_judgement" label="reference" />
          </>}
        />

        <Panel
          icon={Briefcase}
          title="Labour Market"
          metric={
            <Metric value={`${game.unemployment.toFixed(2)}%`} color={unempColor}
                    sub={`NAIRU ${game.naturalUnemployment.toFixed(1)}% · Gap ${unempGap >= 0 ? '+' : ''}${unempGap.toFixed(1)}pp · Jobs ${game.employment != null ? game.employment.toFixed(2) + 'm' : '—'}`} />
          }
          secondary={<>
            <div className="text-stone-500 text-[9px] uppercase tracking-wider">Phillips</div>
            <div className={unempGap < 0 ? 'text-signal-bad' : 'text-signal-good'}>
              {unempGap < 0 ? 'Wage pressure' : 'Slack'}
            </div>
          </>}
          footer={<>
            Below NAIRU and the labour market is hot — wages and prices push up.
            Above NAIRU and you have slack — inflation cools.{' '}
            <CitationLink id="okun_uk_estimate" label="Okun" />{' · '}
            <CitationLink id="boe_phillips_slope" label="Phillips" />
          </>}
        />

        {game.wageIndex != null && (
          <Panel
            icon={Banknote}
            title="Wages &amp; Productivity"
            metric={
              <Metric value={(game.realWageIndex ?? 100).toFixed(0)}
                      color={
                        (game.realWageIndex ?? 100) > 105 ? 'text-signal-good'
                        : (game.realWageIndex ?? 100) < 95 ? 'text-signal-bad'
                        : 'text-stone-100'
                      }
                      sub={<>Real-wage index · Nominal {Math.round(game.wageIndex)} · Productivity {Math.round(game.productivityIndex ?? 100)}</>} />
            }
            sparklinePoints={game.realWageIndexPath || []}
            sparklineColor="#fbbf24"
            footer={<>
              Wages respond to hot labour markets (asymmetric Phillips),
              productivity passthrough, and an education premium. Real wages
              deflate by cumulative CPI — when the spiral activates, the
              nominal index pulls ahead while real stays put.{' '}
              <CitationLink id="gali_wage_persistence" label="Galí" />{' · '}
              <CitationLink id="oecd_productivity_passthrough" label="OECD" />
            </>}
          />
        )}

        {game.composedGrowth != null && (
          <Panel
            icon={TrendingUp}
            title="Structural growth"
            metric={
              <Metric value={`${game.composedGrowth.toFixed(2)}%`}
                      color={game.composedGrowth > game.growth ? 'text-signal-good' : 'text-stone-100'}
                      sub={<>Productivity {(game.productivityGrowthAnn ?? 0).toFixed(2)}pp · Employment {(game.employmentGrowthAnn ?? 0).toFixed(2)}pp · Headline {game.growth.toFixed(2)}%</>} />
            }
            sparklinePoints={game.composedGrowthPath || []}
            sparklineColor="#22d3ee"
            footer={<>
              Productivity trend + employment growth (annualised). The
              structural line ignores cyclical drags / fiscal-multiplier
              hooks / mean-reversion — it shows what trend growth would
              be under just the labour-supply identity.{' '}
              <CitationLink id="obr_productivity_trend" label="OBR" />
            </>}
          />
        )}

        <Panel
          icon={Home}
          title="Housing Market"
          metric={
            <Metric value={hpi.toFixed(1)} color={hpiColor}
                    sub={`HPI · Supply ${supplyKpa}k pa · CPI feed ${housingCpiPp >= 0 ? '+' : ''}${housingCpiPp.toFixed(2)}pp`} />
          }
          sparklinePoints={game.housePricePath || []}
          sparklineColor="#a78bfa"
          footer={<>
            House prices respond to wages, real rates, and supply. When HPI runs
            hot it bleeds into CPI via the housing weight.{' '}
            <CitationLink id="ons_cpih_weights" label="CPIH weights" />{' · '}
            <CitationLink id="barker_review" label="Barker" />
          </>}
        />

        <Panel
          icon={Flame}
          title="Energy Market"
          metric={
            <Metric value={energy.toFixed(1)} color={energyColor}
                    sub={<>Energy index · CPI feed {energyCpiPp >= 0 ? '+' : ''}{energyCpiPp.toFixed(2)}pp
                      {game.energyShockDamper && ' · Reform damper active'}</>} />
          }
          sparklinePoints={game.energyPricePath || []}
          sparklineColor="#f97316"
          footer={<>
            Energy shocks decay over ~6-8 quarters. Greener mix lowers the
            baseline; reforms also damp incoming shocks.{' '}
            <CitationLink id="imf_energy_shock_persistence" label="persistence" />{' · '}
            <CitationLink id="ccc_seventh_carbon_budget" label="CCC" />
          </>}
        />

        <Panel
          icon={LineChart}
          title="Equity Market"
          metric={
            <Metric value={equity.toFixed(1)} color={equityColor}
                    sub={<>Equity index · {peNarrative}</>} />
          }
          sparklinePoints={game.equityPath || []}
          sparklineColor="#34d399"
          footer={<>
            Equities respond to growth, corp-tax stance, real rates, business
            sentiment, and noise. Wealth effect feeds back into growth (capped
            ±0.1pp/qtr).{' '}
            <CitationLink id="equity_index_methodology" label="methodology" />{' · '}
            <CitationLink id="damodaran_equity_risk_premium" label="wealth effect" />
          </>}
        />
      </Grid>

      {/* Debt Service — full-width on desktop. Dense table; no sparkline. */}
      <Card variant="raised" padding="md">
        <Card.Header>
          <div className="flex items-center gap-2">
            <Banknote size={13} className="text-accent-500" />
            <div className="text-[10px] uppercase tracking-wider text-stone-400">Debt Service</div>
          </div>
        </Card.Header>
        <div className="space-y-1.5 text-[12px] font-mono">
          <div className="flex justify-between">
            <span className="text-stone-400">Short rate (Bank Rate)</span>
            <span className="text-stone-200 tabular-nums">{game.bankRate.toFixed(2)}%</span>
          </div>
          <div className="flex justify-between">
            <span className="text-stone-400">Gilt yield (market)</span>
            <span className={`tabular-nums ${game.bondYield < 4.5 ? 'text-signal-good' : game.bondYield < 6 ? 'text-stone-200' : 'text-signal-bad'}`}>
              {game.bondYield.toFixed(2)}%
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-stone-400">Risk premium</span>
            <span className={`tabular-nums ${riskPremium < 1 ? 'text-signal-good' : riskPremium < 2 ? 'text-accent-400' : 'text-signal-bad'}`}>
              {riskPremium.toFixed(2)}pp
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-stone-400">Effective rate on stock</span>
            <span className="text-stone-200 tabular-nums">{game.effectiveServicingRate.toFixed(2)}%</span>
          </div>
          <div className="flex justify-between">
            <span className="text-stone-400">Annual interest cost</span>
            <span className="text-signal-bad tabular-nums">£{spending.debtInterest.toFixed(0)}bn</span>
          </div>
        </div>
        <div className="mt-3 w-full h-1.5 bg-treasury-950 rounded-pill overflow-hidden shadow-inset-well">
          <div className={`h-full transition-all duration-500 ${riskPremium < 1 ? 'bg-signal-good' : riskPremium < 2 ? 'bg-accent-500' : 'bg-signal-bad'}`}
               style={{width: `${Math.min(100, riskPremium / 4 * 100)}%`}} />
        </div>
        <div className="text-[10px] text-stone-500 leading-snug mt-3">
          Long yield = Bank Rate + term premium + deficit kicker + risk premium.
          Risk premium widens with debt over 100% of GDP and with cohesion
          volatility.{' '}
          <CitationLink id="boe_term_premium" label="term premium" />{' · '}
          <CitationLink id="reinhart_rogoff_sovereign_premium" label="sovereign spread" />
        </div>
      </Card>
    </Stack>
  );
}
