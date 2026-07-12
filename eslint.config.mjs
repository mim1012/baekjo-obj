import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    ".claude/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  {
    files: ["src/components/**/*.{js,jsx,ts,tsx}", "src/app/**/*Client.{js,jsx,ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@/data/products", "@/data/brands"],
              message:
                "실시간 데이터는 콘센트(storage) 또는 repo 로만 읽으세요 — 컴포넌트 직접 import 금지(AGENTS.md §4).",
            },
          ],
        },
      ],
    },
  },
]);

export default eslintConfig;
