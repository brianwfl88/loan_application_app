/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        rhb: {
          blue: '#0054A6',
          darkBlue: '#003366',
          lightBlue: '#E6F0FA',
          accent: '#0072CE',
          gold: '#FFB81C',
        }
      }
    },
  },
  plugins: [],
}
