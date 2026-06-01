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
        brand: {
          cream:  '#FFEED1',
          yellow: '#FFC96B',
          'yellow-dark': '#E8A93A',
          blue:   '#D1E2FF',
          'blue-dark': '#6B9FE8',
          brown:  '#5A3A1A',
          'brown-light': '#8B6340',
        },
      },
      borderRadius: {
        '3xl': '1.5rem',
        '4xl': '2rem',
      },
      boxShadow: {
        soft:        '0 4px 24px rgba(90, 58, 26, 0.08)',
        card:        '0 2px 12px rgba(90, 58, 26, 0.07)',
        'card-hover':'0 8px 32px rgba(90, 58, 26, 0.14)',
        'yellow':    '0 4px 16px rgba(255, 201, 107, 0.45)',
      },
    },
  },
  plugins: [],
}

export default config
