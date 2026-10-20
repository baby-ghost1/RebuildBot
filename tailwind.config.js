/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,jsx}',
    './lib/**/*.{js,jsx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: '#5B3DF5',
        accent: '#FF6115',
        light: '#F0F2F5',
        dark: '#23262F',
        navy: '#0B132B',
        green: '#39FF88',
        purple: '#6A00F4',
        peach: '#FFD6A5',
        lime: '#B6FF2E',
        lavender: '#E8DEFF',
        violet: '#7A35FF',
        cream: '#FFFCF4',
        forest: '#18251D',
        lime2: '#B7FF72',
      },
    },
  },
  plugins: [],
};
