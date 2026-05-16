import React from 'react';

// Card primitive — replaces the bg-stone-900/40 + border-stone-800 pattern
// repeated across the app. Variant controls surface + shadow; tone tints
// the border for signal cards (deficit, blocked reform, etc).

const VARIANT_CLASSES = {
  raised:   'bg-treasury-900/55 border border-treasury-800 shadow-card',
  sunken:   'bg-treasury-950/65 border border-treasury-900 shadow-inset-well',
  elevated: 'bg-gradient-to-b from-treasury-800/60 to-treasury-900/55 border border-treasury-700/70 shadow-card-elevated',
  signal:   'bg-treasury-900/55 border-2 shadow-card',
  ghost:    'bg-transparent border border-treasury-800/60',
};

const TONE_BORDER = {
  neutral: 'border-treasury-800',
  good:    'border-emerald-500/60',
  warn:    'border-amber-500/60',
  bad:     'border-rose-500/60',
  info:    'border-sky-500/60',
};

const PADDING = {
  none: '',
  sm: 'p-2',
  md: 'p-4',
  lg: 'p-5',
};

const RADIUS = {
  card: 'rounded-card',
  lg:   'rounded-lg',
  none: '',
};

export function Card({
  variant = 'raised',
  tone = 'neutral',
  padding = 'md',
  radius = 'card',
  as: Tag = 'div',
  className = '',
  children,
  ...rest
}) {
  const variantCls = VARIANT_CLASSES[variant] || VARIANT_CLASSES.raised;
  const toneCls = variant === 'signal' ? (TONE_BORDER[tone] || TONE_BORDER.neutral) : '';
  const padCls = PADDING[padding] ?? PADDING.md;
  const radiusCls = RADIUS[radius] ?? RADIUS.card;
  return (
    <Tag className={`${variantCls} ${toneCls} ${padCls} ${radiusCls} ${className}`.trim()} {...rest}>
      {children}
    </Tag>
  );
}

function Header({ className = '', children, ...rest }) {
  return (
    <div className={`flex items-baseline justify-between gap-2 mb-2 ${className}`.trim()} {...rest}>
      {children}
    </div>
  );
}

function Eyebrow({ className = '', children, ...rest }) {
  return (
    <div className={`text-[10px] uppercase tracking-wider text-stone-500 ${className}`.trim()} {...rest}>
      {children}
    </div>
  );
}

function Title({ className = '', as: Tag = 'div', children, ...rest }) {
  return (
    <Tag className={`text-[13px] font-semibold text-stone-100 ${className}`.trim()} {...rest}>
      {children}
    </Tag>
  );
}

function Meta({ className = '', children, ...rest }) {
  return (
    <div className={`text-[10px] text-stone-500 ${className}`.trim()} {...rest}>
      {children}
    </div>
  );
}

function Body({ className = '', children, ...rest }) {
  return (
    <div className={className} {...rest}>
      {children}
    </div>
  );
}

function Footer({ className = '', children, ...rest }) {
  return (
    <div className={`mt-3 pt-2 border-t border-treasury-800/60 ${className}`.trim()} {...rest}>
      {children}
    </div>
  );
}

Card.Header = Header;
Card.Eyebrow = Eyebrow;
Card.Title = Title;
Card.Meta = Meta;
Card.Body = Body;
Card.Footer = Footer;
