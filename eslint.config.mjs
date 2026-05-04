import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import react from "eslint-plugin-react";
import tseslint from "typescript-eslint";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // k6 load test scripts are plain JS — skip linting
    "load-tests/**",
    // Node CJS one-off scripts (require() is intentional)
    "scripts/**",
  ]),
  {
    files: ["**/*.{js,jsx,mjs,cjs,ts,tsx}"],
    plugins: {
      react,
      "@typescript-eslint": tseslint.plugin,
    },
    // Bypass react version auto-detect (breaks on ESLint 10 + older eslint-plugin-react).
    settings: {
      react: { version: "19.2" },
    },
    rules: {
      // Relax to only forbid chars that actually break JSX parsing (> and }).
      // Apostrophes (') and quotes (") in prose text are cosmetically imperfect
      // but never cause parse errors or XSS — enforcing them in blog/marketing
      // pages with heavy prose creates excessive noise.
      "react/no-unescaped-entities": ["error", { forbid: [">", "}"] }],
      // Parameters prefixed with _ are intentionally unused stubs.
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
    },
  },
]);

export default eslintConfig;
