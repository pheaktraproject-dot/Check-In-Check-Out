/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        forest: {
          50: "#EEF4F1",
          100: "#D6E6DD",
          400: "#3F8A72",
          600: "#1F5F4E",
          700: "#164539",
          900: "#0E2C24"
        },
        clay: {
          400: "#E2A34C",
          500: "#D4922E"
        },
        cream: "#F6F3EC",
        ink: "#1B231F"
      },
      fontFamily: {
        display: ["'Fraunces'", "serif"],
        body: ["'Inter'", "sans-serif"]
      },
      borderRadius: {
        xl2: "1.25rem"
      }
    }
  },
  plugins: []
};
