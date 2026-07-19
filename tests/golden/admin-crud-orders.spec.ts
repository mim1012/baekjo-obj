import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { ADMIN_EMAIL, ADMIN_PASSWORD, CRUD_ENABLED, bypassHeaders, loginAsAdmin } from './_lib/adminCrudHelpers';

// 골든플로우 #7 — 관리자 콘솔 CRUD 실구동: /shop/[id](장바구니)→/checkout(무통장입금)→/admin/orders
// (입금확인·상태 전이)→/mypage(회원 반영).
//
// ⚠️ 안전 설계(팀리드 승인, Option 2) — 실 재고를 건드리지 않기 위해 이 스펙이 직접 만든 일회용
// 상품(재고 넉넉히)을 주문 대상으로 삼는다. 주문 생성 시 재고가 즉시 차감됨(POST /api/orders,
// src/app/api/orders/route.ts)이 조사로 확인됐고, 주문에는 삭제 API가 없으며 취소만이 유일한
// 재고 복원 경로인데 취소는 금지됐다(재고 복원 RPC가 결제완료 주문엔 적용 안 됨 + 팀리드 지시로
// 취소 경로 자체를 스펙에서 안 씀) — 그래서 진짜 카탈로그 상품 대신 일회용 상품을 쓴다.
//
// ⚠️ 종료 상태 = 배송완료(팀리드 지시) — 입금대기로 남기면 추후 주문정책(자동취소) 크론과
// 상호작용할 여지가 생긴다. 배송완료는 터미널 상태라 크론이 더 이상 손대지 않는다.
//
// ⚠️ order-policy 레이스 방어(팀리드 지시) — 이 스펙은 시작 시 주문정책을 직접 조회해
// bankTransferAutoCancelEnabled가 true면 **스킵이 아니라 실패**한다(조용히 넘어가면 안전
// 전제가 깨진 채 통과한 것처럼 보이므로). CI에서는 golden-crud.yml의 각 도메인 스텝이 잡 안에서
// 순차 실행되므로(같은 잡의 스텝은 동시 실행 안 됨) order-policy 스펙과 이 스펙이 실제로 겹쳐
// 돌 일이 없다 — 유일한 위험은 로컬에서 --workers>1로 전체 그룹을 돌릴 때이므로, 이 스펙군은
// 항상 --workers=1로 실행한다(이 세션 전체의 기존 관례와 동일).
//
// 🚨 삭제 API가 주문에 없다 — 이 스펙이 만드는 E2E 주문 행은 staging에 영구히 남는다(팀리드
// 승인 — Option 2로 재고 문제는 해소됐으니 완료 상태의 E2E 마킹 주문 잔존은 허용된 잔여물).
//
// 🚨 쓰기(write) 스펙 — 실제 재고 차감·주문 생성·상태 전이를 수행한다. E2E_ADMIN_CRUD=1 로
// 명시적으로 켜지 않으면 전체 skip. 절대 production을 겨냥하지 말 것 — 대상은 Vercel Preview/
// staging뿐.
test.describe.configure({ mode: 'serial' });

test.describe('골든플로우 #7: 관리자 CRUD 실구동 — 주문(안전 전이, 일회용 상품)', () => {
  test.skip(!CRUD_ENABLED, 'E2E_ADMIN_CRUD=1 미설정 — 쓰기 스펙 skip(Preview/staging 전용)');
  test.skip(!ADMIN_EMAIL || !ADMIN_PASSWORD, 'E2E_ADMIN_* secret 미주입 — 로그인 불가로 skip');

  const MEMBER_EMAIL = process.env.E2E_MEMBER_EMAIL;
  const MEMBER_PASSWORD = process.env.E2E_MEMBER_PASSWORD;
  test.skip(!MEMBER_EMAIL || !MEMBER_PASSWORD, 'E2E_MEMBER_* secret 미주입 — 회원 로그인 불가로 skip');

  test.use({
    extraHTTPHeaders: bypassHeaders(),
  });

  const runId = Date.now();
  const productName = `E2E-주문용-일회용상품-${runId}`;
  const recipientMarker = `E2E-주문-${runId}`;
  const deliveryMemoMarker = `E2E-배송메모-${runId}`;

  const PNG_1PX_BASE64 =
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';
  const imageFilePath = path.join(os.tmpdir(), `e2e-order-product-image-${runId}.png`);

  let productId: string | undefined;
  let orderId: string | undefined;

  test.beforeAll(async ({ browser }) => {
    fs.writeFileSync(imageFilePath, Buffer.from(PNG_1PX_BASE64, 'base64'));

    // 안전 전제 확인 — 스킵이 아니라 실패. 조용히 넘어가면 "안전하게 통과했다"는 착시를 만든다.
    const page = await browser.newPage({ extraHTTPHeaders: bypassHeaders() });
    await loginAsAdmin(page);
    const policyRes = await page.request.get('/api/admin/order-policy');
    expect(policyRes.ok()).toBe(true);
    const policy = (await policyRes.json()) as { bankTransferAutoCancelEnabled: boolean };
    expect(
      policy.bankTransferAutoCancelEnabled,
      '무통장입금 자동취소(bankTransferAutoCancelEnabled)가 true로 켜져 있습니다 — 이 상태에서 ' +
        '주문을 생성하면 만료 시각이 영구히 찍혀 나중에 크론이 취소·재고를 복원할 수 있습니다. ' +
        'admin-crud-order-policy.spec.ts가 동시에 돌고 있거나(같은 잡·워커에서 겹치면 안 됨 — ' +
        '항상 --workers=1로 golden-crud를 실행할 것) 실제로 정책이 켜진 상태입니다. 원인을 ' +
        '확인한 뒤 재실행하세요 — 이 스펙은 안전을 위해 스킵이 아니라 실패합니다.',
    ).toBe(false);
    await page.close();
  });

  test.afterAll(async () => {
    fs.rmSync(imageFilePath, { force: true });
  });

  test('일회용 상품 주문 → 무통장입금 → 입금확인(부정 케이스 포함) → 배송완료 전이 → 회원 반영 → 정리', async ({
    browser,
  }) => {
    // 1) 관리자로 일회용 상품 등록 — 재고 넉넉히, 실 카탈로그 상품은 절대 건드리지 않는다.
    // 셀렉터는 admin-crud-products.spec.ts에서 이미 실측 검증된 것을 그대로 재사용한다.
    // ⚠️ 여기서 블랭킷 page.on('dialog') 핸들러를 걸지 않는다 — 아래 부정 케이스(alert)와
    // 입금확인(confirm)에서 각각 waitForEvent('dialog')로 메시지를 직접 검사해야 하는데,
    // 블랭킷 핸들러가 먼저 자동 accept해버리면 "Cannot accept dialog which is already handled"
    // 로 깨진다(실측). 마지막 상품 삭제 확인만 별도로, 그 직전에 한정해서 건다(아래 11번 참고).
    const adminPage = await browser.newPage({ extraHTTPHeaders: bypassHeaders() });
    await loginAsAdmin(adminPage);
    await adminPage.goto('/admin/products/new');

    await adminPage.locator('#product-name').fill(productName);
    await adminPage.locator('#product-brand').selectOption('b1');
    await adminPage.locator('#product-category').selectOption({ index: 1 });
    await adminPage.locator('#product-lifestyle').selectOption({ index: 1 });
    const petTypeSelect = adminPage
      .locator('select')
      .filter({ has: adminPage.locator('option[value="both"]') });
    await petTypeSelect.selectOption('dog');
    await adminPage.getByPlaceholder('상품 카드에 노출될 짧은 설명').fill('E2E 주문 테스트용 일회용 상품');

    // 재고 넉넉히(주문 생성 시 즉시 1 차감돼도 여유가 크게 남도록) — ProductForm.tsx:414-440,
    // number input 순서가 판매가(0)·할인가(1)·재고(2)로 고정이다(FormField가 htmlFor 없이 라벨을
    // 형제로만 렌더해 getByLabel이 안 먹는 함정 — products/insurance 스펙과 동일).
    const numberInputs = adminPage.locator('input[type="number"]');
    await numberInputs.nth(0).fill('10000'); // 판매가
    await numberInputs.nth(2).fill('999'); // 재고

    await adminPage.locator('input[type="file"]').setInputFiles(imageFilePath);
    await expect(adminPage.locator('img[alt="Uploaded"]')).toBeVisible({ timeout: 20_000 });

    await adminPage.getByLabel('스토어 노출').check();

    await adminPage.getByRole('button', { name: '등록 완료' }).click();
    await adminPage.waitForURL((url) => url.pathname === '/admin/products', { timeout: 20_000 });

    // 등록된 상품 id를 admin API로 확인(화면 흐름만 신뢰하지 않는다).
    const productsRes = await adminPage.request.get('/api/admin/products');
    expect(productsRes.ok()).toBe(true);
    const { products } = (await productsRes.json()) as { products: Array<{ id: string; name: string; stock: number }> };
    const createdProduct = products.find((p) => p.name === productName);
    expect(createdProduct, `${productName} 상품이 admin API 목록에 없습니다`).toBeTruthy();
    productId = createdProduct!.id;
    const stockBeforeOrder = createdProduct!.stock;

    // 2) 회원으로 로그인 → 장바구니 담기 → 무통장입금 체크아웃.
    const memberPage = await browser.newPage({ extraHTTPHeaders: bypassHeaders() });
    memberPage.on('dialog', (dialog) => {
      dialog.accept().catch(() => {});
    });
    await memberPage.goto('/login');
    await memberPage.locator('input[type="email"]').fill(MEMBER_EMAIL!);
    await memberPage.locator('input[type="password"]').fill(MEMBER_PASSWORD!);
    await memberPage.getByRole('button', { name: /로그인/ }).first().click();
    await memberPage.waitForURL((url) => !url.pathname.startsWith('/login'), { timeout: 15_000 });

    await memberPage.goto(`/shop/${productId}`);
    // 페이지 하단 "함께 보면 좋은 상품" 추천 카드(<article>)에도 동일 텍스트의 장바구니 버튼이 있어
    // strict-mode 위반이 난다(실측) — 메인 상품의 것은 article 밖에 있으므로 .first()로 특정한다.
    await memberPage.getByRole('button', { name: '장바구니' }).first().click();

    await memberPage.goto('/cart');
    await memberPage.getByRole('link', { name: /주문하기/ }).click();
    await memberPage.waitForURL(/\/checkout/, { timeout: 15_000 });

    await memberPage.locator('input[name="customerName"]').fill(recipientMarker);
    await memberPage.locator('input[name="phone"]').fill('010-1234-5678');
    await memberPage.locator('input[name="address"]').fill('서울시 테스트구 테스트로 1');
    await memberPage.locator('input[name="memo"]').fill(deliveryMemoMarker);
    // 무통장입금은 기본 선택값이지만(checkout/page.tsx 초기 state) 명시적으로 재확인.
    await memberPage.getByText('무통장입금', { exact: true }).click();

    const consentCheckbox = memberPage.locator('input[type="checkbox"]').first();
    await consentCheckbox.check();

    await memberPage.getByRole('button', { name: /결제하기/ }).click();
    await memberPage.waitForURL(/\/order-complete/, { timeout: 15_000 });
    await expect(memberPage.getByRole('heading', { name: '주문이 완료되었습니다' })).toBeVisible({
      timeout: 15_000,
    });

    // 3) 관리자 API로 방금 만든 주문을 이름 마커로 찾는다(신뢰 가능한 진실 소스).
    const ordersRes = await adminPage.request.get('/api/admin/orders');
    expect(ordersRes.ok()).toBe(true);
    const { orders } = (await ordersRes.json()) as {
      orders: Array<{ id: string; customerName: string; paymentStatus: string; orderStatus: string }>;
    };
    const createdOrder = orders.find((o) => o.customerName === recipientMarker);
    expect(createdOrder, `${recipientMarker} 주문이 admin API 목록에 없습니다`).toBeTruthy();
    orderId = createdOrder!.id;
    expect(createdOrder!.paymentStatus).toBe('입금대기');

    // 재고가 실제로 즉시 차감됐는지 확인(조사에서 확인한 내용의 실측 재확인 — 일회용 상품이라 안전).
    const stockAfterOrderRes = await adminPage.request.get('/api/admin/products');
    const stockAfterOrderData = (await stockAfterOrderRes.json()) as { products: Array<{ id: string; stock: number }> };
    const stockAfterOrder = stockAfterOrderData.products.find((p) => p.id === productId)?.stock;
    expect(stockAfterOrder).toBe(stockBeforeOrder - 1);

    // 4) 관리자 목록에서 초기(입금대기) 상태 확인 — DepositConfirmButton은 상세 페이지가 아니라
    // **목록 행에만** 렌더된다(OrderDataTable.tsx:105, OrderMobileCard.tsx:49 — OrderDetailPage.tsx엔
    // 없음, 실측으로 정정). 목록에서 빈/대기 상태가 우아하게 렌더되는지 먼저 확인한다.
    //
    // 🚨 실제 앱 버그(실측 발견, 이 스펙이 고치는 대상 아님 — mim-lane 경계 밖 src/components) —
    // OrderListPage.tsx:91-106 searchedOrders useMemo가 검색어가 비어있지 않을 때
    // `item.productName.toLowerCase()`를 무조건 호출하는데(line 102), staging에 productName이
    // undefined인 주문 항목(레거시/손상 데이터로 추정)이 하나라도 있으면 검색창에 무엇을 입력하든
    // **관리자 주문 목록 페이지 전체가 렌더 중 uncaught exception으로 백지 크래시**한다(Chrome
    // "This page couldn't load" 에러 페이지로 확인). 검색 기능 자체가 이 도메인에서 통째로
    // 깨져 있다는 뜻 — 팀리드에게 별도 보고, 여기서는 검색창을 아예 안 쓰고 정렬(최신순,
    // OrderListPage.tsx:92-94)에 의존해 방금 만든 주문을 텍스트 매칭으로 직접 찾는다.
    await adminPage.goto('/admin/orders');
    const allTab = adminPage.getByRole('tab', { name: '전체' });
    if ((await allTab.count()) > 0) await allTab.click();
    const row = adminPage.locator('tr', { hasText: recipientMarker });
    await expect(row).toBeVisible({ timeout: 15_000 });
    await expect(row).toContainText('입금대기');
    const depositConfirmButton = row.getByRole('button', { name: '입금확인' });
    await expect(depositConfirmButton).toBeVisible({ timeout: 15_000 });

    // 5) 상세 페이지로 이동해 결제 상태 select 값도 UI에서 직접 재확인.
    await row.getByRole('link', { name: '상세보기' }).click();
    await adminPage.waitForURL(new RegExp(`/admin/orders/${orderId}$`), { timeout: 15_000 });
    const paymentStatusField = adminPage.locator('div.mb-6', { hasText: '결제 상태' }).locator('select');
    await expect(paymentStatusField).toHaveValue('입금대기');

    // 6) 부정 케이스 — 화이트리스트에 없는 결제상태 전이(입금대기→환불완료, 허용은 입금대기→결제완료뿐)를
    // 시도하면 서버가 거부하고(409) 화면은 alert로 실패를 알리며, 실제 DB 값은 안 바뀐다.
    // ⚠️ 반드시 입금확인(→결제완료) 이전에 해야 한다 — 결제완료 이후엔 결제완료→환불완료가
    // 화이트리스트상 유효한 전이가 돼 더 이상 "부정 케이스"가 아니게 된다.
    const orderStatusField = adminPage.locator('div.mb-6', { hasText: '주문 상태' }).locator('select');
    await paymentStatusField.selectOption('환불완료');
    const [invalidDialog] = await Promise.all([
      adminPage.waitForEvent('dialog', { timeout: 15_000 }),
      adminPage.getByRole('button', { name: '저장하기' }).click(),
    ]);
    expect(invalidDialog.message()).toBeTruthy(); // orderUpdateErrorMessage — 정확한 문구는 구현 세부사항이라 존재만 확인.
    await invalidDialog.accept();

    // ⚠️ GET /api/admin/orders/[id] 단건 조회 라우트는 없다(route.ts는 PATCH만 export) — 목록
    // API로 재조회해 id로 찾는다.
    const rejectedListRes = await adminPage.request.get('/api/admin/orders');
    const rejectedList = (await rejectedListRes.json()) as { orders: Array<{ id: string; paymentStatus: string }> };
    expect(
      rejectedList.orders.find((o) => o.id === orderId)?.paymentStatus,
      '화이트리스트에 없는 전이가 실제로 반영됐습니다 — paymentTransition 가드가 깨졌을 수 있습니다',
    ).toBe('입금대기');

    // 7) 정상 경로 — 입금확인은 목록 행의 DepositConfirmButton으로(window.confirm 처리).
    // 검색창은 위 크래시 버그 때문에 계속 안 쓴다 — 정렬(최신순)에 의존해 텍스트로 직접 찾는다.
    // ⚠️ Promise.all([waitForEvent('dialog'), click()]) 페어링이 이 특정 클릭에서는 click() 자체가
    // 15s 타임아웃날 만큼 걸렸다(실측, 원인 불명 — 목록 재렌더 타이밍 추정). once('dialog')를 클릭
    // 전에 먼저 걸어 확실히 선점시키는 방식으로 바꾼다(kits/partners 등 다른 스펙에서 이미 쓰는
    // 안정적 패턴).
    await adminPage.goto('/admin/orders');
    adminPage.once('dialog', (dialog) => {
      dialog.accept().catch(() => {});
    });
    await adminPage.locator('tr', { hasText: recipientMarker }).getByRole('button', { name: '입금확인' }).click();
    // ⚠️ 목록 행은 raw paymentStatus 텍스트가 아니라 orderFunnel.ts가 파생한 퍼널 단계 배지를
    // 보여준다(예: 결제완료 직후엔 "발송대기") — '결제완료' 문자열이 행에 그대로 나타나지 않는다
    // (실측). 입금대기 배지가 사라진 것으로 1차 확인하고, API 재조회로 실제 값을 검증한다.
    await expect(adminPage.locator('tr', { hasText: recipientMarker })).not.toContainText('입금대기', {
      timeout: 15_000,
    });
    // ⚠️ 서버 로그로 PATCH 200 성공을 확인했는데도 곧바로 재조회하면 이전 값(입금대기)이 한 번
    // 잡히는 레이스가 실측됐다(products 가격수정 스펙의 fetch-cache 지연과 동일 계열) — 재시도로 방어.
    await expect(async () => {
      const depositVerifyRes = await adminPage.request.get('/api/admin/orders');
      const depositVerify = (await depositVerifyRes.json()) as { orders: Array<{ id: string; paymentStatus: string }> };
      expect(depositVerify.orders.find((o) => o.id === orderId)?.paymentStatus).toBe('결제완료');
    }).toPass({ timeout: 20_000 });

    // 8) 다시 상세로 이동 — 주문 상태·배송 상태를 배송완료로 전이(팀리드 지시 — 터미널 상태로 종료).
    await adminPage.locator('tr', { hasText: recipientMarker }).getByRole('link', { name: '상세보기' }).click();
    await adminPage.waitForURL(new RegExp(`/admin/orders/${orderId}$`), { timeout: 15_000 });
    await expect(adminPage.locator('div.mb-6', { hasText: '결제 상태' }).locator('select')).toHaveValue('결제완료');
    await orderStatusField.selectOption('배송완료');
    const deliveryStatusField = adminPage.locator('div.mb-6', { hasText: '배송 상태' }).locator('select');
    await deliveryStatusField.selectOption('배송완료');
    await adminPage.getByRole('button', { name: '저장하기' }).click();
    await expect(adminPage.getByRole('button', { name: '저장하기' })).toBeHidden({ timeout: 15_000 });

    // 9) 새로고침 후 영속성 확인 + API 재조회로 이중 확인.
    // ⚠️ 저장 직후 첫 새로고침이 이전 값(주문접수)을 한 번 보여주는 레이스가 실측됐다(위 입금확인·
    // 상품삭제 재조회와 동일 계열의 read-after-write 캐시 지연) — reload 자체를 재시도한다.
    await expect(async () => {
      await adminPage.reload();
      await expect(adminPage.locator('div.mb-6', { hasText: '주문 상태' }).locator('select')).toHaveValue(
        '배송완료',
        { timeout: 5_000 },
      );
    }).toPass({ timeout: 30_000 });

    const finalListRes = await adminPage.request.get('/api/admin/orders');
    const finalList = (await finalListRes.json()) as {
      orders: Array<{ id: string; orderStatus: string; paymentStatus: string; deliveryStatus: string }>;
    };
    const finalOrder = finalList.orders.find((o) => o.id === orderId);
    expect(finalOrder?.orderStatus).toBe('배송완료');
    expect(finalOrder?.paymentStatus).toBe('결제완료');
    expect(finalOrder?.deliveryStatus).toBe('배송완료');

    // 10) 회원 마이페이지 반영 확인 — 배지가 orderStatus 기준으로 배송완료를 표시하고, 배송완료
    // 전용 구매평 작성 버튼이 뜨는지까지 확인한다(OrdersSection.tsx 상태-파생 렌더).
    await memberPage.goto('/mypage?tab=orders');
    const orderCard = memberPage.locator('body');
    await expect(orderCard).toContainText(orderId!, { timeout: 15_000 });
    await expect(orderCard).toContainText('배송완료');
    await expect(memberPage.getByRole('button', { name: '구매평 작성' }).first()).toBeVisible({
      timeout: 15_000,
    });

    // 11) 정리 — 일회용 상품 teardown. 삭제 전에 먼저 "삭제해도 주문 화면이 안 깨지는지" 실측
    // 확인한다(OrderItem이 주문 생성 시점에 productName/price를 스냅샷하므로 이론상 안전 —
    // src/types/index.ts:234-251, resolveOrderItem.ts 주석 — 하지만 팀리드 지시대로 실측 우선).
    await adminPage.goto('/admin/products');
    await adminPage.getByPlaceholder('상품명 또는 상품코드 검색...').fill(productName);
    const productRow = adminPage.locator('tr', { hasText: productName });
    await expect(productRow).toBeVisible({ timeout: 15_000 });
    await productRow.locator('input[type="checkbox"]').check();
    adminPage.on('dialog', (dialog) => {
      dialog.accept().catch(() => {});
    });
    const [deleteRes] = await Promise.all([
      adminPage.waitForResponse(
        (res) => res.url().includes(`/api/admin/products/${productId}`) && res.request().method() === 'DELETE',
        { timeout: 15_000 },
      ),
      adminPage.getByRole('button', { name: '삭제' }).click(),
    ]);

    // ⚠️ DELETE가 200을 반환해도(실측 확인) 곧바로 재조회하면 여전히 존재하는 것처럼 보이는
    // 레이스가 있었다(위 입금확인 재조회와 동일 계열) — "삭제 성공 + 잠깐 캐시 지연"과 "삭제가
    // 실제로 막힘(주문이 참조 중)"을 구분하기 위해 재시도부터 한다. 재시도로도 여전히 존재하면
    // 그때 진짜로 막힌 것으로 보고 isVisible=false 대체 정리로 넘어간다.
    let stillExists = false;
    try {
      await expect(async () => {
        const productsAfterDeleteRes = await adminPage.request.get('/api/admin/products');
        const productsAfterDelete = (await productsAfterDeleteRes.json()) as { products: Array<{ id: string }> };
        expect(productsAfterDelete.products.some((p) => p.id === productId)).toBe(false);
      }).toPass({ timeout: 15_000 });
    } catch {
      stillExists = true;
      console.warn(
        `[admin-crud-orders] DELETE는 ${deleteRes.status()}을 반환했지만 재시도 후에도 상품(${productId})이 ` +
          '목록에 남아 있습니다 — 삭제가 실제로 막힌 것으로 보고 대체 정리로 전환합니다.',
      );
    }

    if (stillExists) {
      // isVisible=false로라도 정리한다(팀리드 지시 #1) — 경고 로그만 남기고 끝내지 않는다.
      const hideRes = await adminPage.request.patch(`/api/admin/products/${productId}`, {
        data: { isVisible: false },
      });
      expect(hideRes.ok(), `상품(${productId}) isVisible=false 대체 정리 PATCH 실패`).toBe(true);
    }

    // 삭제(또는 위 숨김) 이후에도 주문 상세·마이페이지가 깨지지 않는지 실측 확인.
    await adminPage.goto(`/admin/orders/${orderId}`);
    await expect(adminPage.locator('body')).toContainText(productName, { timeout: 15_000 });
    await expect(adminPage.locator('body')).not.toContainText('undefined');

    await memberPage.goto('/mypage?tab=orders');
    await expect(memberPage.locator('body')).toContainText(productName, { timeout: 15_000 });

    await adminPage.close();
    await memberPage.close();
  });
});
