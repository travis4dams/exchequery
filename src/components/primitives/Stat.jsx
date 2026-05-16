import React from 'react';

// Projected-delta caret. worseUp flips favourability for metrics where
// higher = bad (gilts, gini, debt, unemployment). deltaGood overrides the
// sign-based judgement (used for inflation, which is favourable when
// moving toward the target regardless of sign).
export function ProjectionCaret({
  value,
  threshold = 0.1,
  decimals = 1,
  worseUp = false,
  deltaGood,
  suffix = '',
  size = 'xs',
}) {
  if (value === null || value === undefined || Number.isNaN(value)) return null;
  if (Math.abs(value) < threshold) return null;
  const good = deltaGood !== undefined ? deltaGood : (worseUp ? value < 0 : value > 0);
  const sign = value > 0 ? '+' : '−';
  const sizeCls = size === 'sm' ? 'text-[10px]' : 'text-[9px]';
  return (
    <span className={`${sizeCls} font-mono tabular-nums animate-caret-fade-in ${good ? 'text-signal-good' : 'text-signal-bad'}`}>
      {sign}{Math.abs(value).toFixed(decimals)}{suffix}
    </span>
  );
}

const ALIGN_CLS = {
  left:   'items-start text-left',
  center: 'items-center text-center',
  right:  'items-end text-right',
};

// Stat — a label + value with an optional projected-delta caret beside the
// label. Used by the header strip and by OverviewTab's metric grid.
export function Stat({
  label,
  value,
  color = 'text-stone-200',
  delta,
  deltaThreshold,
  decimals,
  worseUp,
  deltaGood,
  suffix,
  align = 'center',
  size = 'sm',
}) {
  const alignCls = ALIGN_CLS[align] || ALIGN_CLS.center;
  const justifyCls = align === 'left' ? 'justify-start' : align === 'right' ? 'justify-end' : 'justify-center';
  const valueSize = size === 'lg' ? 'text-[15px]' : size === 'md' ? 'text-[13px]' : 'text-[11px]';
  return (
    <div className={`flex flex-col gap-0.5 ${alignCls}`}>
      <div className={`text-[9px] uppercase tracking-wider text-stone-500 flex items-center gap-1 ${justifyCls}`}>
        {label}
        <ProjectionCaret
          value={delta}
          threshold={deltaThreshold}
          decimals={decimals}
          worseUp={worseUp}
          deltaGood={deltaGood}
          suffix={suffix}
        />
      </div>
      <div className={`${valueSize} font-mono font-semibold tabular-nums ${color}`}>{value}</div>
    </div>
  );
}
