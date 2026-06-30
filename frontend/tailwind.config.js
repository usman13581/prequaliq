/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#fafbfc',
        foreground: '#0b1220',
        card: '#ffffff',
        border: '#e8ecf1',
        'border-strong': '#d1dae6',
        surface: '#f4f6f9',
        'surface-dark': '#0b1220',
        muted: '#5c6b7a',
        'muted-light': '#94a3b8',
        accent: {
          DEFAULT: '#2563eb',
          hover: '#1d4ed8',
          subtle: '#eff6ff',
        },
        gold: '#c9a227',
        primary: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#2563eb',
          600: '#1d4ed8',
          700: '#1a3a5c',
          800: '#0f2744',
          900: '#0b1220',
        },
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        accent: '0 10px 25px -5px rgb(37 99 235 / 0.2)',
      },
    },
  },
  plugins: [],
}
