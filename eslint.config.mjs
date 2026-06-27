import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // Our realtime views intentionally kick off an async poll on mount, which
      // setStates from inside the fetch callback. That is the documented
      // "subscribe to an external system" pattern, so relax this strict rule.
      "react-hooks/set-state-in-effect": "off",
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // generated/throwaway demo-video assets and scripts (gitignored)
    "demo-output/**",
  ]),
]);

export default eslintConfig;
