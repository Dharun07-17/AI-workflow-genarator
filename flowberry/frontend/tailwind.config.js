/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        berry: {
          900: "#2e1f38",
          800: "#4a305d",
          700: "#5a3b6f"
        }
      }
    },
  },
  plugins: [],
};
