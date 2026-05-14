import React from 'react';

export function EventModal({ event, onChoice }) {
  if (!event) return null;
  const tone = event.tone;
  return (
    <div className="fixed inset-0 z-40 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-3">
      <div className="bg-stone-950 border-2 rounded-t-2xl sm:rounded-2xl max-w-md w-full p-5"
           style={{borderColor: tone === 'good' ? '#15803d' : tone === 'bad' ? '#9f1239' : '#78350f'}}>
        <div className="flex items-center gap-2 mb-3">
          <div className={`w-2 h-2 rounded-full animate-pulse ${
            tone === 'good' ? 'bg-emerald-500' : tone === 'bad' ? 'bg-rose-500' : 'bg-amber-500'
          }`} />
          <div className="text-[10px] uppercase tracking-[0.2em]" style={{
            color: tone === 'good' ? '#34d399' : tone === 'bad' ? '#fb7185' : '#fbbf24'
          }}>
            {tone === 'good' ? 'Opportunity' : tone === 'bad' ? 'Crisis' : 'Dispatch'}
          </div>
        </div>
        <h2 className="display-font text-2xl font-medium leading-tight mb-3">{event.title}</h2>
        <p className="text-stone-300 text-[13px] leading-relaxed mb-5">{event.body}</p>
        <div className="space-y-2">
          {event.choices.map((c, i) => (
            <button key={i} onClick={() => onChoice(c)}
                    className="w-full text-left bg-stone-900 hover:bg-stone-800 border border-stone-700 hover:border-amber-700 transition-all p-3 rounded-md">
              <div className="text-[13px] font-medium text-stone-100">{c.label}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
