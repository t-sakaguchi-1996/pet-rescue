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
          50:  '#fff0f5',
          100: '#ffd6e8',
          200: '#ffadd2',
          300: '#ff85bc',
          400: '#f45f8d',
          500: '#e8547a',
          600: '#d03d66',
          700: '#b02952',
          800: '#8e183d',
          900: '#700b2c',
        },
        peach: {
          50:  '#fff6f0',
          100: '#ffe9d9',
          200: '#ffd2b3',
          300: '#ffb88a',
          400: '#ff9a62',
          500: '#ff7e42',
        },
        cream: '#fff6f8',
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
        '4xl': '2rem',
      },
      boxShadow: {
        'soft':  '0 4px 24px rgba(232, 84, 122, 0.08)',
        'card':  '0 2px 12px rgba(200, 80, 110, 0.07)',
        'card-hover': '0 8px 30px rgba(200, 80, 110, 0.15)',
      },
    },
  },
  plugins: [],
}

export default config
