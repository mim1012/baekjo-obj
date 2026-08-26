This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## QA and Vercel cost guard

Automated browser QA is local-first by default. `npm run test:e2e` uses `http://127.0.0.1:3000` unless `E2E_BASE_URL` or `BASE_URL` is set, and Playwright starts the local dev server only for local targets.

Production domains are blocked by default for Playwright, release QA, layout snapshots, and manual GitHub workflow dispatches. Production QA requires explicit approval and `ALLOW_PRODUCTION_QA=I_ACCEPT_PRODUCTION_COST`; otherwise the guard exits before generating traffic. See [`docs/testing/dev-testing-guide.md`](docs/testing/dev-testing-guide.md) and [`docs/runbooks/staging-production-verification.md`](docs/runbooks/staging-production-verification.md).

`src/app/robots.ts` also blocks high-cost AI crawlers (`meta-externalagent`, Meta fetch/index agents, `GPTBot`, `Amazonbot`) while leaving normal public crawling and link previews available.

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
