// vitest.config.ts
import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    // Default: keep tests fast and deterministic.
    environment: "node",
    globals: true,

    // Match common test file patterns.
    include: ["**/*.{test,spec}.ts", "**/*.{test,spec}.tsx"],

    // Avoid scanning Next build output etc.
    exclude: [
      "**/node_modules/**",
      "**/.next/**",
      "**/dist/**",
      "**/build/**",
      "**/out/**",
      "**/coverage/**",
      "**/.turbo/**",
      "**/.vercel/**",
    ],
  },

  resolve: {
    // Matches your codebase convention: "@/..." => "src/..."
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
});