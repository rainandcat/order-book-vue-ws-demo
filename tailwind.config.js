/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './index.html',
    './src/**/*.{vue,js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        deep: '#131B29',
        textMain: '#F0F4F8',
        textSecondary: '#8698aa',
        buy: '#00b15d',
        sell: '#FF5B5A',
        hover: '#1E3059',
        buyBar: 'rgba(16, 186, 104, 0.12)',
        sellBar: 'rgba(255, 90, 90, 0.12)',
        flashGreen: 'rgba(0, 177, 93, 0.5)',
        flashRed: 'rgba(255, 91, 90, 0.5)',
      },
    },
  },
  plugins: [],
}
