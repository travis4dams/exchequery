import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

// Modal — shared base for the eight in-game modals (Intro, EventModal,
// QuarterSummary, SurplusAllocModal, InspectReform, Reelect, FinalModal,
// BlocInfoModal). Bottom-sheet on mobile, centred card on sm+.
//
// Pass `onClose` to enable Escape-key dismissal + backdrop click (the latter
// can be turned off with `dismissOnBackdrop={false}` for modals that must
// resolve via an action button).

const TONE_BORDER = {
  accent:  'border-accent-700',
  good:    'border-emerald-700',
  warn:    'border-accent-700',
  bad:     'border-rose-900',
  info:    'border-sky-700',
  neutral: 'border-treasury-700',
};

const TONE_EYEBROW = {
  accent:  'text-accent-500',
  good:    'text-signal-good',
  warn:    'text-accent-400',
  bad:     'text-signal-bad',
  info:    'text-signal-info',
  neutral: 'text-stone-400',
};

const SIZE_CLS = {
  narrow: 'max-w-md',
  md:     'max-w-md sm:max-w-lg',
  wide:   'max-w-md sm:max-w-2xl',
};

export function Modal({
  tone = 'neutral',
  size = 'narrow',
  onClose,
  dismissOnBackdrop = true,
  showCloseButton = false,
  z = 50,
  className = '',
  children,
}) {
  const cardRef = useRef(null);

  useEffect(() => {
    if (!onClose) return;
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const handleBackdrop = (e) => {
    if (!dismissOnBackdrop || !onClose) return;
    if (e.target === e.currentTarget) onClose();
  };

  const borderCls = TONE_BORDER[tone] || TONE_BORDER.neutral;
  const sizeCls = SIZE_CLS[size] || SIZE_CLS.narrow;

  return (
    <div className={`fixed inset-0 bg-black/85 backdrop-blur-sm flex items-end sm:items-center justify-center p-3 sm:p-4`}
         style={{ zIndex: z }}
         onClick={handleBackdrop}>
      <div ref={cardRef}
           className={`bg-treasury-950 border-2 ${borderCls} rounded-t-2xl sm:rounded-card ${sizeCls} w-full p-5 sm:p-6 max-h-[92vh] overflow-y-auto shadow-card-elevated ${className}`.trim()}
           onClick={(e) => e.stopPropagation()}
           role="dialog"
           aria-modal="true">
        {showCloseButton && onClose && (
          <button onClick={onClose} aria-label="Close"
                  className="absolute top-3 right-3 text-stone-500 hover:text-stone-200 transition-colors">
            <X size={16} />
          </button>
        )}
        {children}
      </div>
    </div>
  );
}

function Eyebrow({ tone = 'neutral', children, className = '' }) {
  const toneCls = TONE_EYEBROW[tone] || TONE_EYEBROW.neutral;
  return (
    <div className={`text-[10px] uppercase tracking-[0.2em] mb-2 ${toneCls} ${className}`.trim()}>
      {children}
    </div>
  );
}

function Title({ tone = 'neutral', as: Tag = 'h2', children, className = '' }) {
  const TITLE_TONE = {
    accent:  'text-accent-300',
    good:    'text-emerald-300',
    warn:    'text-accent-300',
    bad:     'text-rose-300',
    info:    'text-sky-300',
    neutral: 'text-stone-100',
  };
  const toneCls = TITLE_TONE[tone] || TITLE_TONE.neutral;
  return (
    <Tag className={`font-display text-2xl sm:text-3xl font-medium italic leading-tight mb-3 ${toneCls} ${className}`.trim()}>
      {children}
    </Tag>
  );
}

function Body({ children, className = '' }) {
  return <div className={className}>{children}</div>;
}

function Footer({ children, className = '' }) {
  return (
    <div className={`mt-4 ${className}`.trim()}>
      {children}
    </div>
  );
}

Modal.Eyebrow = Eyebrow;
Modal.Title = Title;
Modal.Body = Body;
Modal.Footer = Footer;
