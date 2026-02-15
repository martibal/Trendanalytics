// tailwind.config.ts
import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./lib/**/*.{js,ts,jsx,tsx}",
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
          surface3: "rgb(var(--surface-3) / <alpha-value>)",

          border: "rgb(var(--border) / <alpha-value>)",
          "border-soft": "rgb(var(--border-soft) / <alpha-value>)",

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

      // Web2-intent: consistent typography across OS + clear mono for audit IDs/keys.
      fontFamily: {
        sans: [
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Roboto",
          "Helvetica",
          "Arial",
          "Apple Color Emoji",
          "Segoe UI Emoji",
        ],
        mono: [
          "ui-monospace",
          "SFMono-Regular",
          "Menlo",
          "Monaco",
          "Consolas",
          "Liberation Mono",
          "Courier New",
          "monospace",
        ],
      },

      borderRadius: {
        "2xl": "1rem",
        "3xl": "1.5rem",
      },

      // Web2-intent: premium dark surfaces with subtle depth (not “glowy”).
      boxShadow: {
        "ui-sm": "0 1px 3px rgba(0,0,0,0.30)",
        "ui-md": "0 6px 16px rgba(0,0,0,0.40)",
        "ui-lg": "0 18px 45px rgba(0,0,0,0.42)",
      },
    },
  },
  plugins: [],
};

export default config;