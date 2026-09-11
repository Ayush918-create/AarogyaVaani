import type { Config } from 'tailwindcss';
const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: { extend: { colors: { ink: '#131b2e', calm: '#00647c', mist: '#f2f3ff' }, fontFamily: { clinical: ['var(--font-clinical)', 'Arial', 'sans-serif'], body: ['var(--font-body)', 'Arial', 'sans-serif'] }, boxShadow: { soft: '0 1px 3px rgba(15,23,42,.05), 0 1px 2px rgba(15,23,42,.03)' } } },
  plugins: [],
};
export default config;
