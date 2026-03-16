/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: 'var(--color-brand, #1E2D4E)',
        navy:  '#0F1E30',
        gold:  '#C9A84C',
      },
    },
  },
  plugins: [],
};
