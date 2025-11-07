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
          400: '#34d399',
          500: '#047857',
          600: '#036149',
          700: '#024434',
          800: '#043024',
          900: '#021b14',
          950: '#010f0b',
        },
      },
    },
  },
  plugins: [require('daisyui')],
  daisyui: {
    themes: [
      {
        auction: {
          primary: '#047857',
          'primary-focus': '#036149',
          'primary-content': '#ffffff',
          secondary: '#048047',
          'secondary-focus': '#036149',
          'secondary-content': '#ffffff',
          accent: '#10b981',
          'accent-focus': '#0d9667',
          'accent-content': '#ffffff',
          neutral: '#3d4451',
          'base-100': '#ffffff',
          'base-200': '#f5f5f5',
          'base-300': '#e5e5e5',
          info: '#38bdf8',
          success: '#047857',
          warning: '#b45309',
          error: '#ef4444',
        },
      },
    ],
  },
};
