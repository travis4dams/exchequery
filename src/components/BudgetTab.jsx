import React from 'react';
import { Slider } from './primitives/Slider.jsx';

export function BudgetTab({ game, committed, set }) {
  return (
    <div>
      <div className="mb-5">
        <h2 className="display-font text-xl font-medium italic text-stone-100 mb-1">Budget Levers</h2>
        <p className="text-[11px] text-stone-500">Revenue figures scale with GDP. Source IFS/HMRC ready-reckoner.</p>
      </div>
      <div className="bg-stone-900/40 rounded-lg border border-stone-800 p-4 mb-4">
        <div className="text-[10px] uppercase tracking-wider text-stone-500 mb-3">Income Tax</div>
        <Slider label="Basic rate" value={game.taxIncomeBasic} min={15} max={25} step={1}
          baseline={20} committed={committed?.taxIncomeBasic} onChange={(v) => set({taxIncomeBasic: v})} unit="%"
          tooltip="HMRC RR: 1pp ≈ £6.9bn (FY 2026-27). Hits ~30m taxpayers; major bloc impact."
          citationId="hmrc_basic_rate" />
        <Slider label="Higher rate (£50,270+)" value={game.taxIncomeHigh} min={38} max={50} step={1}
          baseline={40} committed={committed?.taxIncomeHigh} onChange={(v) => set({taxIncomeHigh: v})} unit="%"
          tooltip="HMRC RR: 1pp ≈ £1.6bn. Middle class & professionals."
          citationId="hmrc_higher_rate" />
        <Slider label="Additional rate (above £125,140)" value={game.taxIncomeAdd} min={40} max={60} step={1}
          baseline={45} committed={committed?.taxIncomeAdd} onChange={(v) => set({taxIncomeAdd: v})} unit="%"
          tooltip="HMRC RR: 1pp ≈ £0.16bn (asymmetric: £145m yield / £175m cost). Diamond-Saez revenue-max rate ≈ 73%."
          citationId="diamond_saez_top_rate" />
      </div>
      <div className="bg-stone-900/40 rounded-lg border border-stone-800 p-4 mb-4">
        <div className="text-[10px] uppercase tracking-wider text-stone-500 mb-3">Corporation Tax & VAT</div>
        <Slider label="Corporation Tax" value={game.taxCorp} min={19} max={35} step={1}
          baseline={25} committed={committed?.taxCorp} onChange={(v) => set({taxCorp: v})} unit="%"
          tooltip="HMRC RR: 1pp ≈ £3.6bn (onshore main + small profits). Hope-Limberg (2022): cuts produce no growth over 50y."
          citationId="hmrc_corp_rate" />
        <Slider label="VAT" value={game.taxVAT} min={15} max={25} step={1}
          baseline={20} committed={committed?.taxVAT} onChange={(v) => set({taxVAT: v})} unit="%"
          tooltip="HMRC RR: 1pp ≈ £8.8bn (standard rate). Highly regressive."
          citationId="hmrc_vat_rate" />
      </div>
      <div className="bg-stone-900/40 rounded-lg border border-stone-800 p-4">
        <div className="text-[10px] uppercase tracking-wider text-stone-500 mb-3">Departmental Spending</div>
        <Slider label="NHS & Health" value={game.spendNHS} min={174} max={244} step={5}
          baseline={204} committed={committed?.spendNHS} onChange={(v) => set({spendNHS: v})} unit="bn" format={(v)=>`£${v}`}
          tooltip="Below £204bn: strike risk + Marmot mortality effects."
          citationId="obr_nhs_baseline" />
        <Slider label="Welfare" value={game.spendWelfare} min={150} max={250} step={5}
          baseline={187} committed={committed?.spendWelfare} onChange={(v) => set({spendWelfare: v})} unit="bn" format={(v)=>`£${v}`}
          tooltip="DWP working-age + children + disability (state pension £146bn is locked separately)."
          citationId="obr_welfare_baseline" />
        <Slider label="Education" value={game.spendEdu} min={80} max={115} step={5}
          baseline={95} committed={committed?.spendEdu} onChange={(v) => set({spendEdu: v})} unit="bn" format={(v)=>`£${v}`}
          citationId="obr_edu_baseline" />
        <Slider label="Local Gov" value={game.spendLocal} min={120} max={160} step={5}
          baseline={140} committed={committed?.spendLocal} onChange={(v) => set({spendLocal: v})} unit="bn" format={(v)=>`£${v}`}
          tooltip="Below £135bn: Section 114 risk."
          citationId="obr_local_baseline" />
        <Slider label="Defence" value={game.spendDefence} min={35} max={95} step={5}
          baseline={39} committed={committed?.spendDefence} onChange={(v) => set({spendDefence: v})} unit="bn" format={(v)=>`£${v}`}
          tooltip="OBR DEL £39bn (2025-26). Government plan: 2.5% then 3% of GDP → £77-93bn."
          citationId="obr_defence_baseline" />
        <Slider label="Infrastructure" value={game.spendInfra} min={70} max={130} step={5}
          baseline={90} committed={committed?.spendInfra} onChange={(v) => set({spendInfra: v})} unit="bn" format={(v)=>`£${v}`}
          tooltip="High multiplier (~1.4 per OBR). Includes transport DEL + capital investment."
          citationId="obr_infra_baseline" />
      </div>
    </div>
  );
}
