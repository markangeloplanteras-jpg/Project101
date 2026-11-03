/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter Variable', 'Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['Manrope Variable', 'Manrope', 'Inter Variable', 'sans-serif'],
      },
      colors: {
        accent: {
          50: '#f2f0ff',
          100: '#e8e5ff',
          200: '#d4ceff',
          300: '#b5a9ff',
          400: '#927dff',
          500: '#7857f6',
          600: '#6840e8',
          700: '#5730cd',
          800: '#492ba6',
          900: '#3d2785',
          950: '#251654',
        },
        canvas: {
          light: '#f6f7fb',
          dark: '#090d16',
        },
      },
      boxShadow: {
        card: '0 1px 2px rgba(16, 24, 40, 0.04), 0 8px 24px -12px rgba(16, 24, 40, 0.08)',
        'card-dark': '0 1px 2px rgba(0, 0, 0, 0.3), 0 12px 32px -16px rgba(0, 0, 0, 0.6)',
        glow: '0 0 0 1px rgba(120,87,246,.15), 0 18px 40px -16px rgba(120,87,246,.4)',
      },
      keyframes: {
        'fade-up': {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        'scale-in': {
          from: { opacity: '0', transform: 'scale(.97)' },
          to: { opacity: '1', transform: 'scale(1)' },
        },
        shimmer: {
          '100%': { transform: 'translateX(100%)' },
        },
        'slide-in-right': {
          from: { transform: 'translateX(100%)' },
          to: { transform: 'translateX(0)' },
        },
        float: {
          '0%,100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-8px)' },
        },
      },
      animation: {
        'fade-up': 'fade-up .4s cubic-bezier(.22,1,.36,1) both',
        'fade-in': 'fade-in .25s ease both',
        'scale-in': 'scale-in .2s cubic-bezier(.22,1,.36,1) both',
        shimmer: 'shimmer 1.8s infinite',
        'slide-in-right': 'slide-in-right .28s cubic-bezier(.22,1,.36,1) both',
        float: 'float 6s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
