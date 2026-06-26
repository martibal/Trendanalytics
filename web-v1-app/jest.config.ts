// jest.config.ts
import nextJest from "next/jest.js";
import type { Config } from "jest";

const createJestConfig = nextJest({
  dir: "./",
});

const config: Config = {
  testEnvironment: "jsdom",
  setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],
  testMatch: [
    "<rootDir>/src/**/*.test.ts",
    "<rootDir>/src/**/*.test.tsx",
    "<rootDir>/tests/**/*.test.ts",
    "<rootDir>/tests/**/*.test.tsx",
  ],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
  },
  collectCoverageFrom: [
    "src/**/*.{ts,tsx}",
    "!src/**/*.d.ts",
    "!src/app/**/page.tsx",
    "!src/app/**/layout.tsx",
    "!src/app/**/loading.tsx",
    "!src/app/**/not-found.tsx",
    "!src/app/**/error.tsx",
    "!src/proxy.ts",
  ],
  coverageThreshold: {
    global: {
      statements: 25,
      branches: 22,
      functions: 20,
      lines: 27,
    },
  },
  moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json", "mjs"],
  testPathIgnorePatterns: [
    "<rootDir>/.next/",
    "<rootDir>/node_modules/",
    "<rootDir>/playwright-report/",
    "<rootDir>/test-results/",
  ],
  transformIgnorePatterns: [
    "/node_modules/(?!(uncrypto|@upstash/redis|@upstash/ratelimit)/)",
  ],
  clearMocks: true,
};

export default createJestConfig(config);