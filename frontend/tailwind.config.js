/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        wine: {
          50: "#fdf2f2",
          100: "#fde8e8",
          500: "#9b1c1c",
          600: "#771d1d",
          700: "#5c1010",
          900: "#2d0707",
        },
      },
    },
  },
  plugins: [],
};
