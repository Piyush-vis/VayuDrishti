/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          900: "#0f172a",
          950: "#090d16"
        },
        slate: {
          800: "#1e293b",
          850: "#161f30",
          900: "#0f172a"
        },
        aqi: {
          good: "#00b050",
          satisfactory: "#92d050",
          moderate: "#ffff00",
          poor: "#ff9900",
          verypoor: "#ff0000",
          severe: "#990000"
        }
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        display: ['Outfit', 'sans-serif']
      },
      backdropBlur: {
        xs: '2px',
      }
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
  ],
}
