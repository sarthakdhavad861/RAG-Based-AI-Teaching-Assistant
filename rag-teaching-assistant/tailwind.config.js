/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Sora', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
        display: ['Cabinet Grotesk', 'Sora', 'sans-serif'],
      },
      colors: {
        obsidian: {
          950: '#050508',
          900: '#0a0a12',
          800: '#10101e',
          700: '#18182a',
          600: '#1e1e34',
          500: '#26263e',
          400: '#3a3a58',
        },
        aurora: {
          blue:   '#4f8ef7',
          indigo: '#7c5cfc',
          violet: '#a855f7',
          cyan:   '#22d3ee',
          green:  '#34d399',
          amber:  '#fbbf24',
          red:    '#f87171',
        },
      },
      animation: {
        'pulse-slow': 'pulse 2.5s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'slide-in':   'slideIn 0.3s ease-out',
        'fade-up':    'fadeUp 0.4s ease-out',
        'glow':       'glow 2s ease-in-out infinite alternate',
        'typing':     'typing 1.2s steps(3, end) infinite',
      },
      keyframes: {
        slideIn:  { from: { transform: 'translateX(-100%)' }, to: { transform: 'translateX(0)' } },
        fadeUp:   { from: { opacity: 0, transform: 'translateY(12px)' }, to: { opacity: 1, transform: 'translateY(0)' } },
        glow:     { from: { boxShadow: '0 0 5px #4f8ef720' }, to: { boxShadow: '0 0 20px #7c5cfc40' } },
        typing:   { '0%,100%': { opacity: 1 }, '50%': { opacity: 0.2 } },
      },
      backdropBlur: { xs: '2px' },
    },
  },
  plugins: [],
}
