import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./lib/**/*.{js,ts,jsx,tsx}",

    // If you also use /src (harmless even if not)
    "./src/app/**/*.{js,ts,jsx,tsx}",
    "./src/components/**/*.{js,ts,jsx,tsx}",
    "./src/lib/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        ui: {
          bg: "rgb(var(--bg) / <alpha-value>)",
          surface: "rgb(var(--surface) / <alpha-value>)",
          surface2: "rgb(var(--surface-2) / <alpha-value>)",

          border: "rgb(var(--border) / <alpha-value>)",
          borderSoft: "rgb(var(--border-soft) / <alpha-value>)",

          text: "rgb(var(--text) / <alpha-value>)",
          muted: "rgb(var(--text-muted) / <alpha-value>)",
          faint: "rgb(var(--text-faint) / <alpha-value>)",

          accent: "rgb(var(--accent) / <alpha-value>)",
          accent2: "rgb(var(--accent-2) / <alpha-value>)",

          ok: "rgb(var(--ok) / <alpha-value>)",
          warn: "rgb(var(--warn) / <alpha-value>)",
          bad: "rgb(var(--bad) / <alpha-value>)",
        },

        chart: {
          daily: "rgb(var(--chart-daily) / <alpha-value>)",
          ma7: "rgb(var(--chart-ma7) / <alpha-value>)",
          ma30: "rgb(var(--chart-ma30) / <alpha-value>)",
        },
      },
      borderRadius: {
        "2xl": "1rem",
        "3xl": "1.5rem",
      },
    },
  },
  plugins: [],
};

export default config;
