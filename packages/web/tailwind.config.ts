import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#fef3f2',
          100: '#fee4e2',
          200: '#fecdca',
          300: '#fdaaa6',
          400: '#f97970',
          500: '#ef4444',
          600: '#dc2626',
          700: '#b91c1c',
          800: '#991b1b',
          900: '#7f1d1d',
        },
        brand: {
          orange: '#f97316',
          coral: '#ef4444',
        },
      },
    },
  },
  plugins: [],
}

export default config
