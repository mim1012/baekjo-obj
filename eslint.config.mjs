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
    // page.tsx·비-Client 파일명이 규칙을 우회하던 사각지대 봉합(2026-07-13 opus 리뷰 H1).
    // 서버 wrapper도 @/data/products·brands 는 repo 경유가 원칙이라 예외가 필요 없다.
    files: ["src/app/**/*.{js,jsx,ts,tsx}", "src/components/**/*.{js,jsx,ts,tsx}"],
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
            {
              group: ["@/data/concerns"],
              message:
                "고민 콘텐츠는 콘센트(storage) 또는 concerns repo 로만 읽으세요 — 정적 파일 재도입 금지(AGENTS.md §4 원칙 0).",
            },
            {
              group: ["@/data/notices"],
              message:
                "공지 콘텐츠는 콘센트(storage) 또는 notices repo 로만 읽으세요 — 정적 파일 재도입 금지(AGENTS.md §4 원칙 0).",
            },
          ],
        },
      ],
    },
  },
]);

export default eslintConfig;
