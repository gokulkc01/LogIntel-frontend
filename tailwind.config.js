/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'Courier New', 'monospace'],
      },
      colors: {
        bg: {
          primary:   '#0f1117',
          secondary: '#131720',
          tertiary:  '#161b27',
          border:    '#1e2433',
          hover:     '#1a2035',
        },
        risk: {
          critical: '#ef4444',
          high:     '#f59e0b',
          medium:   '#f97316',
          low:      '#64748b',
        }
      },
      animation: {
        'pulse-dot': 'pulse-dot 1.4s ease-in-out infinite',
        'slide-in':  'slide-in 0.2s ease-out',
        'fade-in':   'fade-in 0.3s ease-out',
      },
      keyframes: {
        'pulse-dot': {
          '0%,100%': { opacity: 1 },
          '50%':     { opacity: 0.2 },
        },
        'slide-in': {
          from: { opacity: 0, transform: 'translateY(6px)' },
          to:   { opacity: 1, transform: 'translateY(0)' },
        },
        'fade-in': {
          from: { opacity: 0 },
          to:   { opacity: 1 },
        }
      }
    },
  },
  plugins: [],
}