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
          tooltip="HMRC: 1pp ≈ £7.2bn. Hits ~30m taxpayers; major bloc impact."
          citationId="hmrc_basic_rate" />
        <Slider label="Higher rate (£50,270+)" value={game.taxIncomeHigh} min={38} max={50} step={1}
          baseline={40} committed={committed?.taxIncomeHigh} onChange={(v) => set({taxIncomeHigh: v})} unit="%"
          tooltip="1pp ≈ £4.5bn (sim) vs HMRC implied ~£2bn — see citation. Middle class & professionals."
          citationId="hmrc_higher_rate" />
        <Slider label="Additional rate (above £125,140)" value={game.taxIncomeAdd} min={40} max={60} step={1}
          baseline={45} committed={committed?.taxIncomeAdd} onChange={(v) => set({taxIncomeAdd: v})} unit="%"
          tooltip="1pp ≈ £0.9bn (sim) vs HMRC implied ~£0.17bn — see citation. Diamond-Saez revenue-max rate ≈ 73%."
          citationId="diamond_saez_top_rate" />
      </div>
      <div className="bg-stone-900/40 rounded-lg border border-stone-800 p-4 mb-4">
        <div className="text-[10px] uppercase tracking-wider text-stone-500 mb-3">Corporation Tax & VAT</div>
        <Slider label="Corporation Tax" value={game.taxCorp} min={19} max={35} step={1}
          baseline={25} committed={committed?.taxCorp} onChange={(v) => set({taxCorp: v})} unit="%"
          tooltip="1pp ≈ £4bn. Hope-Limberg (2022): cuts produce no growth over 50y."
          citationId="hmrc_corp_rate" />
        <Slider label="VAT" value={game.taxVAT} min={15} max={25} step={1}
          baseline={20} committed={committed?.taxVAT} onChange={(v) => set({taxVAT: v})} unit="%"
          tooltip="1pp ≈ £8.5bn. Highly regressive."
          citationId="hmrc_vat_rate" />
      </div>
      <div className="bg-stone-900/40 rounded-lg border border-stone-800 p-4">
        <div className="text-[10px] uppercase tracking-wider text-stone-500 mb-3">Departmental Spending</div>
        <Slider label="NHS & Health" value={game.spendNHS} min={170} max={240} step={5}
          baseline={200} committed={committed?.spendNHS} onChange={(v) => set({spendNHS: v})} unit="bn" format={(v)=>`£${v}`}
          tooltip="Below £200bn: strike risk + Marmot mortality effects."
          citationId="marmot_preventative" />
        <Slider label="Welfare" value={game.spendWelfare} min={260} max={330} step={5}
          baseline={300} committed={committed?.spendWelfare} onChange={(v) => set({spendWelfare: v})} unit="bn" format={(v)=>`£${v}`}
          tooltip="DWP ~£300bn (pensions + benefits)." />
        <Slider label="Education" value={game.spendEdu} min={75} max={110} step={5}
          baseline={90} committed={committed?.spendEdu} onChange={(v) => set({spendEdu: v})} unit="bn" format={(v)=>`£${v}`}
          citationId="ifs_fe_funding" />
        <Slider label="Local Gov" value={game.spendLocal} min={45} max={75} step={5}
          baseline={60} committed={committed?.spendLocal} onChange={(v) => set({spendLocal: v})} unit="bn" format={(v)=>`£${v}`}
          tooltip="Below £60bn: Section 114 risk."
          citationId="ifs_local_gov" />
        <Slider label="Defence" value={game.spendDefence} min={45} max={80} step={5}
          baseline={55} committed={committed?.spendDefence} onChange={(v) => set({spendDefence: v})} unit="bn" format={(v)=>`£${v}`} />
        <Slider label="Infrastructure" value={game.spendInfra} min={20} max={70} step={5}
          baseline={35} committed={committed?.spendInfra} onChange={(v) => set({spendInfra: v})} unit="bn" format={(v)=>`£${v}`}
          tooltip="High multiplier (~1.4 per OBR)." />
      </div>
    </div>
  );
}
