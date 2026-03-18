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

      /* Fonts: match landing-v2.html
         - Syne for base
         - Fraunces for headlines
         - DM Mono for tags/buttons/audit */
      fontFamily: {
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui", "-apple-system", "Segoe UI", "Roboto", "Helvetica", "Arial"],
        display: ["var(--font-display)", "ui-serif", "Georgia", "Cambria", "Times New Roman", "Times"],
        mono: ["var(--font-mono)", "ui-monospace", "SFMono-Regular", "Menlo", "Monaco", "Consolas", "Liberation Mono", "Courier New", "monospace"],
      },

      /* Radius parity */
      borderRadius: {
        sm: "2px",
        md: "3px",
        lg: "6px",
      },

      /* Keep shadows subtle (landing-v2 is not glowy) */
      boxShadow: {
        "ui-sm": "0 1px 0 rgba(255,255,255,0.03), 0 10px 26px rgba(0,0,0,0.45)",
        "ui-md": "0 1px 0 rgba(255,255,255,0.04), 0 18px 42px rgba(0,0,0,0.55)",
      },
    },
  },
  plugins: [],
};

export default config;