const defaultTheme = require('tailwindcss/defaultTheme');

module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', ...defaultTheme.fontFamily.sans],
      },
      colors: {
        dark: {
          50: 'var(--drk-50, #fafafa)',
          100: 'var(--drk-100, #f4f4f5)',
          200: 'var(--drk-200, #e4e4e7)',
          300: 'var(--drk-300, #a1a1aa)',
          400: 'var(--drk-400, #71717a)',
          500: 'var(--drk-500, #52525b)',
          600: 'var(--drk-600, #3f3f46)',
          700: 'var(--drk-700, #27272a)',
          800: 'var(--drk-800, #18181b)',
          900: 'var(--drk-900, #09090b)',
          950: 'var(--drk-950, #000000)',
        },
        brand: {
          50: '#faf5ff',
          100: '#f3e8ff',
          200: '#e9d5ff',
          300: '#d8b4fe',
          400: '#c084fc',
          500: '#a855f7',
          600: '#9333ea',
          700: '#7e22ce',
          800: '#6b21a8',
          900: '#581c87',
        },
        accent: {
          blue: '#3b82f6',
          pink: '#ec4899',
          orange: '#f97316',
          emerald: '#10b981',
        },
      },
      backgroundImage: {
        'gradient-brand': 'linear-gradient(135deg, #a855f7, #ec4899, #f97316)',
        'gradient-brand-h': 'linear-gradient(to right, #a855f7, #ec4899, #f97316)',
        'gradient-glass': 'linear-gradient(135deg, rgba(255,255,255,0.05), rgba(255,255,255,0.02))',
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'scale-in': 'scaleIn 0.2s ease-out',
        'pulse-soft': 'pulseSoft 2s ease-in-out infinite',
        'heartbeat': 'heartbeat 0.3s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        scaleIn: {
          '0%': { transform: 'scale(0.95)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        pulseSoft: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.7' },
        },
        heartbeat: {
          '0%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.3)' },
          '100%': { transform: 'scale(1)' },
        },
      },
    },
  },
  plugins: [],
}
