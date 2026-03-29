import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,

  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",

    // Generated / artifact folders that should never participate in CI lint
    "chain_depth_bundle/**",
    "playwright-report/**",
    "test-results/**",
    ".runtime-logs/**",

    // Common local/generated noise
    "coverage/**",
    "dist/**",
    "tmp/**",
  ]),

  {
    files: [
      "src/app/api-docs/page.tsx",
      "src/app/status/page.tsx",
      "src/app/thresholds/page.tsx",
      "src/components/DriverExplanation.tsx",
      "src/lib/chains/pageExplanations.tsx",
      "src/lib/content/**/*.tsx",
      "src/lib/content/*.tsx",
    ],
    rules: {
      // Content-heavy explanatory surfaces legitimately contain natural quoted text.
      "react/no-unescaped-entities": "off",
    },
  },

  {
    files: ["src/app/chains/[chain]/history/page.test.tsx"],
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          varsIgnorePattern: "^(React|_)",
          argsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
    },
  },

  {
    files: [
      "src/components/glossary/GlossaryFilter.tsx",
      "src/lib/glossary/entries.ts",
    ],
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          varsIgnorePattern: "^(state|extractEntries|_)",
          argsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
    },
  },
]);

export default eslintConfig;