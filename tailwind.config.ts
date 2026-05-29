import type { Config } from 'tailwindcss'

export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        'airspace-g': '#22c55e',
        'airspace-e': '#fbbf24',
        'airspace-ctr': '#f97316',
        'airspace-tma': '#ea580c',
        'airspace-ab': '#ef4444',
        'airspace-p': '#dc2626',
        'airspace-r': '#f87171',
        'airspace-d': '#d946ef',
        'airspace-siv': '#60a5fa',
        'airspace-para': '#a855f7',
        'airspace-orni': '#15803d',
      },
    },
  },
  plugins: [],
} satisfies Config
