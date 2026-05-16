import React from 'react';

// Layout primitives — single mechanism for breaking out of the historical
// max-w-md mobile width on desktop. Below md, Container collapses to today's
// layout. Above md, opt-in to wider widths and two-column treatments.

const CONTAINER_SIZE = {
  narrow:   'max-w-md',                              // modals, narrow forms
  standard: 'max-w-md md:max-w-3xl',                 // tab content, default
  wide:     'max-w-md md:max-w-3xl lg:max-w-6xl',    // dashboards, parliament
};

const GAP = {
  none: 'gap-0',
  xs:   'gap-1',
  sm:   'gap-2',
  md:   'gap-3',
  lg:   'gap-4',
  xl:   'gap-6',
};

const STACK_GAP = {
  none: 'space-y-0',
  xs:   'space-y-1',
  sm:   'space-y-2',
  md:   'space-y-3',
  lg:   'space-y-4',
  xl:   'space-y-6',
};

export function Container({ size = 'standard', className = '', children, ...rest }) {
  const sizeCls = CONTAINER_SIZE[size] || CONTAINER_SIZE.standard;
  return (
    <div className={`${sizeCls} mx-auto px-3 md:px-5 ${className}`.trim()} {...rest}>
      {children}
    </div>
  );
}

// Responsive grid. cols defaults to single column on mobile; pass an object
// keyed by Tailwind breakpoint to opt-in to multi-column at larger sizes.
// Class strings are static lookups — never construct grid-cols-${n} dynamically.
const COLS_BASE = { 1: 'grid-cols-1', 2: 'grid-cols-2', 3: 'grid-cols-3', 4: 'grid-cols-4', 5: 'grid-cols-5', 6: 'grid-cols-6' };
const COLS_MD   = { 1: 'md:grid-cols-1', 2: 'md:grid-cols-2', 3: 'md:grid-cols-3', 4: 'md:grid-cols-4', 5: 'md:grid-cols-5', 6: 'md:grid-cols-6' };
const COLS_LG   = { 1: 'lg:grid-cols-1', 2: 'lg:grid-cols-2', 3: 'lg:grid-cols-3', 4: 'lg:grid-cols-4', 5: 'lg:grid-cols-5', 6: 'lg:grid-cols-6' };

export function Grid({ cols = { base: 1 }, gap = 'md', className = '', children, ...rest }) {
  const baseCls = COLS_BASE[cols.base] || COLS_BASE[1];
  const mdCls   = cols.md ? (COLS_MD[cols.md] || '') : '';
  const lgCls   = cols.lg ? (COLS_LG[cols.lg] || '') : '';
  const gapCls  = GAP[gap] ?? GAP.md;
  return (
    <div className={`grid ${baseCls} ${mdCls} ${lgCls} ${gapCls} ${className}`.trim()} {...rest}>
      {children}
    </div>
  );
}

export function Stack({ gap = 'md', className = '', children, ...rest }) {
  const gapCls = STACK_GAP[gap] ?? STACK_GAP.md;
  return (
    <div className={`${gapCls} ${className}`.trim()} {...rest}>
      {children}
    </div>
  );
}

// TwoCol — main + side rail on lg+. Below lg, stacks main then side.
// ratio: '2-1' (main 2fr / side 1fr) or '3-2' or 'even'.
const TWO_COL_RATIO = {
  '2-1':  'lg:grid-cols-[2fr_1fr]',
  '3-2':  'lg:grid-cols-[3fr_2fr]',
  '3-1':  'lg:grid-cols-[3fr_1fr]',
  'even': 'lg:grid-cols-2',
};

export function TwoCol({ ratio = '2-1', gap = 'lg', className = '', main, side, sideFirst = false, ...rest }) {
  const ratioCls = TWO_COL_RATIO[ratio] || TWO_COL_RATIO['2-1'];
  const gapCls = GAP[gap] ?? GAP.lg;
  return (
    <div className={`grid grid-cols-1 ${ratioCls} ${gapCls} ${className}`.trim()} {...rest}>
      <div className={sideFirst ? 'order-2 lg:order-2' : ''}>{main}</div>
      <div className={sideFirst ? 'order-1 lg:order-1' : ''}>{side}</div>
    </div>
  );
}
