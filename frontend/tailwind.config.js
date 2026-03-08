/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        background: "rgb(var(--color-background) / <alpha-value>)",
        surface: "rgb(var(--color-surface) / <alpha-value>)",
        ink: "rgb(var(--color-ink) / <alpha-value>)",
        muted: "rgb(var(--color-muted) / <alpha-value>)",
        accent: "rgb(var(--color-accent) / <alpha-value>)",
        stroke: "rgb(var(--color-stroke) / <alpha-value>)",
      },
      boxShadow: {
        panel: "0 10px 30px rgba(0, 0, 0, 0.08)",
      },
    },
  },
  plugins: [],
};
