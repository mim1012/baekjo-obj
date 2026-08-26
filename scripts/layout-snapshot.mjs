// 레이아웃 통일 작업의 before/after 기준선 스냅샷 캡처 (재실행 가능).
// 사용: node scripts/layout-snapshot.mjs <outDir> [baseUrl]
//   baseUrl 기본값 = http://127.0.0.1:3000 (Production은 명시적 승인 환경변수 필요)
// 대표 public 페이지를 데스크톱/모바일 풀페이지로 캡처하고 index.html(대조 뷰)을 생성한다.
// 통일 전 baseline을 찍어두고, 작업 후 같은 스크립트로 다시 찍어 나란히 비교한다.
import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const outDir = process.argv[2] || 'docs/layout-baseline';
const baseUrl = (process.argv[3] || 'http://127.0.0.1:3000').replace(/\/$/, '');
const targetHost = new URL(baseUrl).hostname.toLowerCase();
const productionHosts = new Set([
  'www.baekjo-objet.com',
  'baekjo-objet.com',
  'baekjo-obj.vercel.app',
]);

if (
  productionHosts.has(targetHost) &&
  process.env.ALLOW_PRODUCTION_QA !== 'I_ACCEPT_PRODUCTION_COST'
) {
  throw new Error(
    `Production snapshot target ${targetHost} is blocked. ` +
      'Set ALLOW_PRODUCTION_QA=I_ACCEPT_PRODUCTION_COST only after explicit user approval.',
  );
}

// 레이아웃 통일 대상 대표 페이지
const PAGES = [
  ['home', '/'],
  ['list-brands', '/brands'],
  ['list-shop', '/shop'],
  ['brand-ssup', '/brands/sunny-side-up'], // 기준(reference)
  ['brand-alloming', '/brands/alloming'],
  ['brand-charcoal', '/brands/charcoal-story'],
  ['brand-nobledog', '/brands/nobledog'],
  ['product-ssup-p21', '/shop/p21'], // detailBlocks 완결형
  ['product-p1', '/shop/p1'],
];

const VIEWPORTS = [
  ['desktop', 1440, 900],
  ['mobile', 390, 844],
];

async function run() {
  await mkdir(outDir, { recursive: true });
  const browser = await chromium.launch();
  const captured = [];
  for (const [vpName, width, height] of VIEWPORTS) {
    const context = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 1 });
    const page = await context.newPage();
    for (const [name, route] of PAGES) {
      const url = `${baseUrl}${route}`;
      await page.goto(url, { waitUntil: 'load', timeout: 45000 });
      await page.waitForTimeout(1200);
      const file = `${name}-${vpName}.png`;
      await page.screenshot({ path: path.join(outDir, file), fullPage: true });
      captured.push({ name, vp: vpName, route, file });
      console.log(`captured ${file}`);
    }
    await context.close();
  }
  await browser.close();

  // 대조용 index.html — 페이지별 desktop|mobile 나란히
  const byPage = new Map();
  for (const c of captured) {
    if (!byPage.has(c.name)) byPage.set(c.name, { route: c.route, shots: {} });
    byPage.get(c.name).shots[c.vp] = c.file;
  }
  const sections = [...byPage.entries()].map(([name, { route, shots }]) => `
    <section style="margin:32px 0;border-top:1px solid #ddd;padding-top:16px">
      <h2 style="font:600 16px system-ui">${name} <span style="color:#888;font-weight:400">${route}</span></h2>
      <div style="display:flex;gap:16px;align-items:flex-start;flex-wrap:wrap">
        <figure style="margin:0"><figcaption style="font:12px system-ui;color:#666">desktop</figcaption>
          <img src="${shots.desktop || ''}" style="width:560px;border:1px solid #eee"/></figure>
        <figure style="margin:0"><figcaption style="font:12px system-ui;color:#666">mobile</figcaption>
          <img src="${shots.mobile || ''}" style="width:220px;border:1px solid #eee"/></figure>
      </div>
    </section>`).join('');
  const html = `<!doctype html><meta charset="utf-8"><title>Layout baseline — ${baseUrl}</title>
    <body style="max-width:900px;margin:24px auto;font:14px system-ui;padding:0 16px">
    <h1 style="font:700 20px system-ui">레이아웃 기준선 스냅샷</h1>
    <p style="color:#666">base: ${baseUrl}</p>${sections}</body>`;
  await writeFile(path.join(outDir, 'index.html'), html, 'utf8');
  console.log(`\n${captured.length} shots -> ${outDir}/index.html`);
}

run().catch((e) => { console.error(e); process.exit(1); });
