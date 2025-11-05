/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,jsx}',
    './components/**/*.{js,jsx}',
    './app/**/*.{js,jsx}',
  ],
  theme: {
    extend: {
      keyframes: {
        scale: {
          '0%, 100%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.1)' },
        },
      },
      animation: {
        scale: 'scale 0.8s ease-in-out infinite',
      },
      colors: {
        primary: {
          50: '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#4ade80',
          500: '#00b140', // Base theme color from mary-frank-pto
          600: '#059669',
          700: '#047857',
          800: '#065f46',
          900: '#064e3b',
          950: '#022c22',
        },
      },
    },
  },
  plugins: [require('daisyui')],
  daisyui: {
    themes: [
      {
        auction: {
          primary: '#00b140',
          'primary-focus': '#059669',
          'primary-content': '#ffffff',
          secondary: '#059669',
          'secondary-focus': '#047857',
          'secondary-content': '#ffffff',
          accent: '#4ade80',
          'accent-focus': '#22c55e',
          'accent-content': '#ffffff',
          neutral: '#3d4451',
          'base-100': '#ffffff',
          'base-200': '#f5f5f5',
          'base-300': '#e5e5e5',
          info: '#38bdf8',
          success: '#00b140',
          warning: '#f59e0b',
          error: '#ef4444',
        },
      },
    ],
  },
};
