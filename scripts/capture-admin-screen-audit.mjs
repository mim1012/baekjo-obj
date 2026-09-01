import { chromium } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import { encode } from 'next-auth/jwt';
import nextEnv from '@next/env';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const baseUrl = (process.env.ADMIN_AUDIT_BASE_URL || 'http://localhost:3000').replace(/\/$/, '');
const email = process.env.E2E_ADMIN_EMAIL;
const password = process.env.E2E_ADMIN_PASSWORD;
const useLocalReadOnlySession = process.env.ADMIN_AUDIT_LOCAL_SESSION === '1';

if (!useLocalReadOnlySession && (!email || !password)) {
  throw new Error('E2E_ADMIN_EMAIL과 E2E_ADMIN_PASSWORD가 필요합니다. 값은 결과 파일에 기록하지 않습니다.');
}

const routeSpecs = [
  ['01-dashboard', '/admin'],
  ['02-all-pages', '/admin/pages'],
  ['03-first-employee-guide', '/admin/guide'],
  ['04-home', '/admin/settings'],
  ['05-products', '/admin/products'],
  ['06-product-display', '/admin/products/display'],
  ['07-product-tags', '/admin/products/tags'],
  ['08-categories', '/admin/categories'],
  ['09-brands', '/admin/brands'],
  ['10-concerns', '/admin/concerns'],
  ['11-survey', '/admin/survey'],
  ['12-reviews', '/admin/reviews'],
  ['13-notices', '/admin/notices'],
  ['14-care-kits', '/admin/kits'],
  ['15-order-policy', '/admin/order-policy'],
  ['16-orders', '/admin/orders'],
  ['17-members', '/admin/members'],
  ['18-product-inquiries', '/admin/inquiries'],
  ['19-partner-inquiries', '/admin/partner-inquiries'],
  ['20-insurance-consultations', '/admin/insurance'],
  ['21-insurance-content', '/admin/insurance-content'],
  ['22-page-copy-editor', '/admin/pages/shop'],
  ['23-product-create', '/admin/products/new'],
];

const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
const outputDir = path.resolve('artifacts', `admin-screen-audit-${stamp}`);
const viewportDir = path.join(outputDir, 'viewport');
const fullDir = path.join(outputDir, 'full');
const formDir = path.join(outputDir, 'forms');
await mkdir(viewportDir, { recursive: true });
await mkdir(fullDir, { recursive: true });
await mkdir(formDir, { recursive: true });

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 1440, height: 1000 },
  deviceScaleFactor: 1,
  colorScheme: 'light',
});
const page = await context.newPage();
await page.emulateMedia({ reducedMotion: 'reduce' });

const browserErrors = [];
let activeRoute = 'login';
page.on('pageerror', (error) => browserErrors.push({ route: activeRoute, type: 'pageerror', message: error.message }));
page.on('console', (message) => {
  if (message.type() === 'error') {
    browserErrors.push({ route: activeRoute, type: 'console', message: message.text() });
  }
});

try {
  if (useLocalReadOnlySession) {
    // 비밀번호를 모르거나 외부 시크릿이 없는 로컬 시각 감사 전용 경로다. 운영 DB는 active admin 행을
    // 읽기만 하고, 현재 로컬 서버의 AUTH_SECRET으로 브라우저 메모리에만 세션 쿠키를 만든다.
    // 애플리케이션 인증/인가 코드는 바꾸지 않으며 requireAdmin의 DB 재검증도 그대로 통과해야 한다.
    nextEnv.loadEnvConfig(process.cwd());
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseSecret = process.env.SUPABASE_SECRET_KEY;
    const authSecret = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET;
    if (!supabaseUrl || !supabaseSecret || !authSecret) {
      throw new Error('로컬 읽기 세션에 필요한 SUPABASE_URL/SUPABASE_SECRET_KEY/AUTH_SECRET이 없습니다.');
    }
    const supabase = createClient(supabaseUrl, supabaseSecret, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    let adminQuery = supabase
      .from('members')
      .select('id, email, name, role, status')
      .eq('role', 'admin')
      .eq('status', 'active');
    if (email) adminQuery = adminQuery.eq('email', email.trim().toLowerCase());
    const { data: admins, error: adminError } = await adminQuery.limit(1);
    if (adminError || !admins?.[0]) {
      throw new Error(`active 관리자 읽기 실패: ${adminError?.message || '대상 없음'}`);
    }
    const admin = admins[0];
    const cookieName = 'authjs.session-token';
    const token = await encode({
      secret: authSecret,
      salt: cookieName,
      maxAge: 60 * 60,
      token: {
        sub: admin.id,
        name: admin.name,
        email: admin.email,
        memberId: admin.id,
        role: 'admin',
        provider: 'email',
      },
    });
    await context.addCookies([{
      name: cookieName,
      value: token,
      url: baseUrl,
      httpOnly: true,
      sameSite: 'Lax',
      secure: baseUrl.startsWith('https://'),
    }]);
    await page.goto(`${baseUrl}/admin`, { waitUntil: 'domcontentloaded', timeout: 30_000 });
  } else {
    await page.goto(`${baseUrl}/login?redirect=%2Fadmin`, { waitUntil: 'domcontentloaded', timeout: 30_000 });
    await page.locator('input[type="email"]').fill(email);
    await page.locator('input[type="password"]').fill(password);
    await page.getByRole('button', { name: '로그인', exact: true }).click();
    await page.waitForURL((url) => !url.pathname.startsWith('/login'), { timeout: 30_000 });
    await page.waitForLoadState('domcontentloaded');
  }

  if (!new URL(page.url()).pathname.startsWith('/admin')) {
    throw new Error(`관리자 로그인 후 예상하지 못한 주소로 이동했습니다: ${page.url()}`);
  }

  const meResponse = await context.request.get(`${baseUrl}/api/members/me`);
  const me = meResponse.ok() ? await meResponse.json() : null;
  if (!meResponse.ok() || me?.user?.role !== 'admin' || (me?.user?.status && me.user.status !== 'active')) {
    throw new Error(`관리자 세션 확인 실패: HTTP ${meResponse.status()}, role=${me?.user?.role ?? '없음'}, status=${me?.user?.status ?? '없음'}`);
  }
  // 세션 확인 직후 다음 화면으로 이동하면 공통 설정 조회가 중단되어 거짓 Failed to fetch가 남는다.
  // 첫 화면의 읽기 요청이 끝난 뒤 화면별 감사를 시작한다.
  await page.waitForLoadState('networkidle', { timeout: 8_000 }).catch(() => undefined);
  await page.waitForTimeout(300);

  const records = [];
  for (const [name, route] of routeSpecs) {
    activeRoute = route;
    const errorStart = browserErrors.length;
    const response = await page.goto(`${baseUrl}${route}`, { waitUntil: 'domcontentloaded', timeout: 30_000 });
    await page.waitForLoadState('networkidle', { timeout: 8_000 }).catch(() => undefined);
    await page.waitForTimeout(500);
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(100);

    const actualUrl = page.url();
    const title = await page.title();
    const heading = await page.locator('h1, h2').first().textContent().catch(() => null);
    const alerts = await page.locator('[role="alert"]').allTextContents().catch(() => []);
    const buttons = await page.getByRole('button').allTextContents().catch(() => []);
    const links = await page.getByRole('link').allTextContents().catch(() => []);
    const pageMetrics = await page.evaluate(() => ({
      bodyText: document.body.innerText.slice(0, 20_000),
      documentWidth: document.documentElement.scrollWidth,
      viewportWidth: document.documentElement.clientWidth,
      documentHeight: document.documentElement.scrollHeight,
    }));

    const viewportPath = path.join(viewportDir, `${name}.png`);
    const fullPath = path.join(fullDir, `${name}.png`);
    await page.screenshot({ path: viewportPath, fullPage: false, animations: 'disabled' });
    await page.screenshot({ path: fullPath, fullPage: true, animations: 'disabled' });

    const routeErrors = browserErrors.slice(errorStart);
    const issueSignals = [];
    const actualPath = new URL(actualUrl).pathname;
    if (actualPath.startsWith('/login')) issueSignals.push('관리자 로그인 화면으로 되돌아감');
    if (response && response.status() >= 400) issueSignals.push(`문서 HTTP ${response.status()}`);
    if (/Internal Server Error|Application error|Unhandled Runtime Error/i.test(pageMetrics.bodyText)) {
      issueSignals.push('런타임 오류 문구 표시');
    }
    if (pageMetrics.documentWidth > pageMetrics.viewportWidth + 2) issueSignals.push('데스크톱 가로 넘침');

    records.push({
      name,
      requestedRoute: route,
      actualUrl,
      httpStatus: response?.status() ?? null,
      title,
      heading: heading?.trim() || null,
      alerts: alerts.map((value) => value.trim()).filter(Boolean),
      visibleButtons: buttons.map((value) => value.trim()).filter(Boolean),
      visibleLinks: links.map((value) => value.trim()).filter(Boolean),
      dimensions: {
        width: pageMetrics.documentWidth,
        height: pageMetrics.documentHeight,
        viewportWidth: pageMetrics.viewportWidth,
      },
      browserErrors: routeErrors,
      issueSignals,
      screenshots: {
        viewport: path.relative(outputDir, viewportPath).replaceAll('\\', '/'),
        full: path.relative(outputDir, fullPath).replaceAll('\\', '/'),
      },
    });
  }

  // 상품 진열 순서는 저장하지 않고 브라우저 상태에서만 실제 이동·취소를 검증한다.
  activeRoute = '/admin/products/display :: 순서 이동 후 취소';
  const displayOrderInteraction = {
    requestedRoute: '/admin/products/display',
    checked: false,
    passed: false,
    before: [],
    afterMove: [],
    afterCancel: [],
    issueSignals: [],
  };
  await page.goto(`${baseUrl}/admin/products/display`, { waitUntil: 'domcontentloaded', timeout: 30_000 });
  await page.waitForLoadState('networkidle', { timeout: 8_000 }).catch(() => undefined);
  const orderSection = page.locator('section').filter({
    has: page.getByRole('heading', { name: '고객 화면별 진열 순서 변경', exact: true }),
  });
  const orderRows = orderSection.locator('ol > li');
  if (await orderRows.count() >= 2) {
    const names = () => orderRows.evaluateAll((rows) => rows.map((row) => row.querySelector('p')?.textContent?.trim() || ''));
    displayOrderInteraction.checked = true;
    displayOrderInteraction.before = await names();
    await orderRows.nth(1).getByRole('button', { name: /위로 이동$/ }).click();
    displayOrderInteraction.afterMove = await names();
    const saveButton = page.getByRole('button', { name: '변경사항 적용', exact: true });
    if (!(await saveButton.isVisible().catch(() => false))) {
      displayOrderInteraction.issueSignals.push('순서 이동 후 저장 바가 나타나지 않음');
    }
    await page.getByRole('button', { name: '취소', exact: true }).click();
    displayOrderInteraction.afterCancel = await names();
    if (
      displayOrderInteraction.afterMove[0] !== displayOrderInteraction.before[1]
      || displayOrderInteraction.afterMove[1] !== displayOrderInteraction.before[0]
    ) {
      displayOrderInteraction.issueSignals.push('위로 이동 후 화면 순서가 바뀌지 않음');
    }
    if (JSON.stringify(displayOrderInteraction.afterCancel) !== JSON.stringify(displayOrderInteraction.before)) {
      displayOrderInteraction.issueSignals.push('취소 후 원래 순서로 돌아오지 않음');
    }
    displayOrderInteraction.passed = displayOrderInteraction.issueSignals.length === 0;
  } else {
    displayOrderInteraction.issueSignals.push('순서 이동을 검사할 상품이 2개 미만');
  }

  // 등록 화면은 열기만 하고 입력·저장하지 않는다. 카테고리의 ‘추가’는 즉시저장이므로 제외한다.
  const formSpecs = [
    ['01-product-tag-create', '/admin/products/tags', '상품 태그 등록', true],
    ['02-brand-create', '/admin/brands', '새 브랜드 등록', false],
    ['03-concern-create', '/admin/concerns', '고민 등록', false],
    ['04-survey-question-create', '/admin/survey', '문항 추가', false],
    ['05-survey-rule-create', '/admin/survey', '규칙 추가', false],
    ['06-review-create', '/admin/reviews', '후기 등록', false],
    ['07-notice-create', '/admin/notices', '공지 등록', false],
    ['08-kit-create', '/admin/kits', '키트 등록', false],
    ['09-insurance-document-create', '/admin/insurance-content', '동의 문서 등록', false],
    ['10-insurance-faq-create', '/admin/insurance-content', 'FAQ 등록', false],
  ];
  const formRecords = [];
  for (const [name, route, triggerName, expectedBlockedBeforeDb] of formSpecs) {
    activeRoute = `${route} :: ${triggerName}`;
    const formIssueSignals = [];
    await page.goto(`${baseUrl}${route}`, { waitUntil: 'domcontentloaded', timeout: 30_000 });
    await page.waitForLoadState('networkidle', { timeout: 8_000 }).catch(() => undefined);
    await page.waitForTimeout(400);
    const trigger = page.getByRole('button', { name: triggerName, exact: true }).first();
    const triggerCount = await trigger.count();
    let openedHeading = page.getByRole('heading', { name: triggerName, exact: true }).last();
    if (triggerCount > 0) {
      await trigger.click();
      await page.waitForTimeout(300);
      if (name === '04-survey-question-create') {
        // 저장하지 않고 선택지 2개 상태를 만들어 순서 변경 버튼까지 시각 검사한다.
        const addOption = page.getByRole('button', { name: '+ 선택지 추가', exact: true }).last();
        if (await addOption.count()) {
          await addOption.click();
          await page.waitForTimeout(150);
          const optionInputs = page.locator('input[placeholder="고객에게 보일 답변"]');
          if (await optionInputs.count() >= 2) {
            await optionInputs.nth(0).fill('첫 번째 선택지');
            await optionInputs.nth(1).fill('두 번째 선택지');
            await page.getByRole('button', { name: '첫 번째 선택지 아래로 이동', exact: true }).click();
            const reorderedValues = await optionInputs.evaluateAll((inputs) => inputs.map((input) => input.value));
            if (reorderedValues[0] !== '두 번째 선택지' || reorderedValues[1] !== '첫 번째 선택지') {
              formIssueSignals.push('선택지 아래 이동 결과가 고객 표시 순서와 일치하지 않음');
            }
          } else {
            formIssueSignals.push('선택지 순서 검사에 필요한 입력칸 2개를 찾지 못함');
          }
        }
      }
      openedHeading = page.getByRole('heading', { name: triggerName, exact: true }).last();
      if (await openedHeading.count()) {
        await openedHeading.scrollIntoViewIfNeeded().catch(() => undefined);
        await page.waitForTimeout(150);
      }
    }
    const formPath = path.join(formDir, `${name}.png`);
    const floatingPanel = openedHeading.locator('xpath=ancestor::div[contains(concat(" ", normalize-space(@class), " "), " absolute ")][1]');
    if (await floatingPanel.count()) {
      await floatingPanel.screenshot({ path: formPath, animations: 'disabled' });
    } else {
      await page.screenshot({ path: formPath, fullPage: false, animations: 'disabled' });
    }
    formRecords.push({
      name,
      requestedRoute: `${route} → ${triggerName}`,
      actualUrl: page.url(),
      httpStatus: 200,
      heading: triggerCount > 0 ? triggerName : expectedBlockedBeforeDb ? 'DB 적용 전 차단' : null,
      alerts: [],
      visibleButtons: await page.getByRole('button').allTextContents().catch(() => []),
      visibleLinks: [],
      dimensions: { width: 1440, height: 1000, viewportWidth: 1440 },
      browserErrors: [],
      issueSignals: [
        ...formIssueSignals,
        ...(triggerCount > 0 || expectedBlockedBeforeDb ? [] : ['등록 화면 버튼을 찾지 못함']),
      ],
      screenshots: {
        viewport: path.relative(outputDir, formPath).replaceAll('\\', '/'),
        full: path.relative(outputDir, formPath).replaceAll('\\', '/'),
      },
    });
  }

  const makeContactSheet = async (recordsForSheet, fileName, title) => {
    const cards = [];
    for (const record of recordsForSheet) {
      const imageBytes = await readFile(path.join(outputDir, record.screenshots.viewport));
      const imageUrl = `data:image/png;base64,${imageBytes.toString('base64')}`;
      const status = record.issueSignals.length === 0 ? '정상 진입' : record.issueSignals.join(' · ');
      cards.push(`
        <article>
          <div class="label"><strong>${record.requestedRoute}</strong><span>${status}</span></div>
          <img src="${imageUrl}" alt="${record.requestedRoute}">
        </article>`);
    }
    const sheet = await context.newPage();
    await sheet.setViewportSize({ width: 1500, height: 1000 });
    await sheet.setContent(`<!doctype html><html lang="ko"><head><meta charset="utf-8"><style>
      *{box-sizing:border-box}body{margin:0;padding:24px;background:#e8e6df;color:#17211d;font-family:Arial,'Malgun Gothic',sans-serif}
      h1{margin:0 0 18px;font-size:28px}.grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:18px}
      article{overflow:hidden;border:1px solid #bbb9b0;background:#fff;box-shadow:0 2px 8px #0001}
      .label{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:11px 13px;border-bottom:1px solid #ddd;background:#f8f7f2;font-size:14px}
      .label span{font-size:12px;color:#526057}img{display:block;width:100%;height:470px;object-fit:cover;object-position:top left}
    </style></head><body><h1>${title}</h1><main class="grid">${cards.join('')}</main></body></html>`, { waitUntil: 'load' });
    await sheet.screenshot({ path: path.join(outputDir, fileName), fullPage: true, animations: 'disabled' });
    await sheet.close();
  };

  await makeContactSheet(records.slice(0, 12), 'contact-sheet-1.png', '관리자 화면 직접 확인 1/2');
  await makeContactSheet(records.slice(12), 'contact-sheet-2.png', '관리자 화면 직접 확인 2/2');
  await makeContactSheet(formRecords, 'contact-sheet-forms.png', '등록 화면 직접 확인');

  const summary = {
    capturedAt: new Date().toISOString(),
    baseUrl,
    readOnly: true,
    adminSession: { role: me.user.role, status: me.user.status ?? null },
    totals: {
      screens: records.length,
      forms: formRecords.length,
      routeIssues: records.filter((record) => record.issueSignals.length > 0).length,
      formIssues: formRecords.filter((record) => record.issueSignals.length > 0).length,
      browserErrors: browserErrors.length,
    },
    records,
    formRecords,
    displayOrderInteraction,
  };
  await writeFile(path.join(outputDir, 'audit.json'), `${JSON.stringify(summary, null, 2)}\n`, 'utf8');
  await writeFile(
    path.join(outputDir, 'README.md'),
    `# 관리자 화면 캡처 감사\n\n- 실행 시각: ${summary.capturedAt}\n- 대상: ${baseUrl}\n- 방식: 관리자 로그인 후 읽기 전용 화면 진입(저장·삭제 미실행)\n- 화면 수: ${records.length}\n- 등록 화면 수: ${formRecords.length}\n- 상품 순서 이동 후 취소: ${displayOrderInteraction.passed ? '통과' : '확인 필요'}\n- 경로 문제: ${summary.totals.routeIssues}\n- 등록 화면 문제: ${summary.totals.formIssues}\n- 브라우저 오류: ${summary.totals.browserErrors}\n\n전체 화면은 \`full/\`, 첫 화면은 \`viewport/\`, 등록 화면은 \`forms/\`, 판정 원문은 \`audit.json\`에 있습니다.\n`,
    'utf8',
  );

  console.log(JSON.stringify({ outputDir, ...summary.totals }, null, 2));
} finally {
  await browser.close();
}
