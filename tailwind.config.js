/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Treasury: warmer-stone scale tuned to the body radial-gradient stops.
        // 900/950 match #14110c/#0d0b08 used in ChancellorSim background.
        treasury: {
          50:  '#f7f5f0',
          100: '#ebe6db',
          200: '#d7cdb9',
          300: '#bdae8f',
          400: '#9c8a68',
          500: '#7d6c4c',
          600: '#5f5238',
          700: '#433926',
          800: '#2a2418',
          900: '#14110c',
          950: '#0d0b08',
        },
        // Accent: today's amber, exposed as a semantic alias so future hue
        // shifts (brass, gilt) happen in one place.
        accent: {
          300: '#fcd34d',
          400: '#fbbf24',
          500: '#f59e0b',
          600: '#d97706',
          700: '#b45309',
        },
        // Signal: status colours (kept as Tailwind palette echoes for
        // recognisability). Use these instead of raw emerald/rose/sky/amber.
        signal: {
          good: '#34d399',
          warn: '#fbbf24',
          bad:  '#fb7185',
          info: '#7dd3fc',
        },
        // Surface: three card backgrounds for hierarchy. The repeated
        // bg-stone-900/40 today maps to surface.raised.
        surface: {
          raised:   'rgba(28, 25, 20, 0.55)',
          sunken:   'rgba(13, 11, 8, 0.65)',
          elevated: 'rgba(48, 41, 28, 0.60)',
        },
      },
      fontFamily: {
        display: ['Fraunces', 'Georgia', 'serif'],
        sans:    ['"IBM Plex Sans"', 'system-ui', 'sans-serif'],
        mono:    ['"IBM Plex Mono"', 'ui-monospace', 'monospace'],
      },
      boxShadow: {
        card:          '0 1px 0 rgba(255,255,255,0.03) inset, 0 8px 24px -12px rgba(0,0,0,0.6)',
        'card-elevated': '0 1px 0 rgba(255,255,255,0.05) inset, 0 12px 32px -10px rgba(0,0,0,0.7)',
        'glow-amber':  '0 0 0 1px rgba(217,119,6,0.4), 0 8px 28px -8px rgba(217,119,6,0.35)',
        'inset-well':  'inset 0 1px 3px rgba(0,0,0,0.5)',
      },
      borderRadius: {
        card: '10px',
        pill: '999px',
      },
      spacing: {
        header: '11rem', // tracks the sticky header height; for scroll-mt
      },
      keyframes: {
        'pulse-soft': {
          '0%, 100%': { opacity: '0.85' },
          '50%':      { opacity: '0.55' },
        },
        'caret-fade-in': {
          '0%':   { opacity: '0', transform: 'translateY(-2px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'progress-shimmer': {
          '0%':   { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
      animation: {
        'pulse-soft':      'pulse-soft 2.4s ease-in-out infinite',
        'caret-fade-in':   'caret-fade-in 200ms ease-out',
        'progress-shimmer':'progress-shimmer 2.8s linear infinite',
      },
    },
  },
  plugins: [],
}
