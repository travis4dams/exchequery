import React from 'react';

// SegmentedControl — single-select tab switcher used by AboutTab. Each option
// is { id, label }. The active option gets a brass fill; others stay quiet.
export function SegmentedControl({ value, onChange, options, className = '' }) {
  return (
    <div className={`flex gap-1 bg-treasury-900/50 rounded-lg p-1 border border-treasury-800 ${className}`.trim()}
         role="tablist">
      {options.map((opt) => {
        const active = value === opt.id;
        return (
          <button
            key={opt.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(opt.id)}
            className={`flex-1 text-[11px] sm:text-[12px] px-2 py-1.5 rounded transition-colors ${
              active
                ? 'bg-accent-600 text-treasury-950 font-semibold shadow-card'
                : 'text-stone-400 hover:text-stone-200'
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
