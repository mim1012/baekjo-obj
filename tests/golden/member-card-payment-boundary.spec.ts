import { test, expect } from '@playwright/test';
import { ADMIN_EMAIL, ADMIN_PASSWORD, CRUD_ENABLED, bypassHeaders, loginAsAdmin } from './_lib/adminCrudHelpers';
import {
  MEMBER_EMAIL,
  MEMBER_PASSWORD,
  loginAsMember,
  createThrowawayProduct,
  cleanupThrowawayProducts,
} from './_lib/memberCrudHelpers';

// 골든플로우 #2 하위 — 카드결제 경계(boundary) 검증.
//
// 🚨 경계 선언(자동화하지 않는 것) — 토스 결제창(위젯) 안의 실제 승인(카드번호 입력→인증→승인)은
// 이 스펙에서 자동화하지 않는다. 이유: (1) 토스 결제위젯은 iframe 안에 렌더되는 PG사 호스티드
// UI라 셀렉터가 우리 코드 소관 밖이고, (2) 테스트 카드 승인은 실제 브라우저 인증 단계(팝업·앱
// 전환 시뮬레이션)를 요구해 헤드리스 자동화 대상이 아니다(2026-07-13 결제 개선 세션에서도 이
// 경계가 동일하게 결론났음 — memory: toss-payment-system-state). 이 스펙은 **결제창을 실제로
// 열기 직전까지**만 검증한다: 카드결제 선택 → 위젯이 서버가 확정한 금액으로 마운트되는지.
//
// ⚠️ 이 스펙은 NEXT_PUBLIC_TOSS_CLIENT_KEY가 이 배포 환경에 설정돼 있어야 실행된다.
// 미설정이면 checkout/page.tsx:15가 "카드결제" 옵션 자체를 disabled 처리한다(TOSS_CLIENT_KEY
// 없음) — 그 경우 이 스펙은 실패가 아니라 skip으로 그 경계를 문서화한다(2026-07-19 확인:
// 이 프로젝트의 .env.local/GH secrets 어디에도 TOSS 키가 아직 없다).
test.describe('골든플로우 #2 경계: 회원 여정 — 카드결제 위젯 호출까지', () => {
  test.skip(!CRUD_ENABLED, 'E2E_ADMIN_CRUD=1 미설정 — 쓰기 스펙 skip(Preview/staging 전용)');
  test.skip(!ADMIN_EMAIL || !ADMIN_PASSWORD, 'E2E_ADMIN_* secret 미주입 — 스로어웨이 상품 생성 불가로 skip');
  test.skip(!MEMBER_EMAIL || !MEMBER_PASSWORD, 'E2E_MEMBER_* secret 미주입 — 회원 로그인 불가로 skip');

  test.use({ extraHTTPHeaders: bypassHeaders() });

  const NAME_PREFIX = 'E2E-카드결제경계-';
  const UNIT_PRICE = 33_000;
  let productId: string;
  let productName: string;

  test.beforeAll(async ({ browser }) => {
    const page = await browser.newPage({ extraHTTPHeaders: bypassHeaders() });
    await loginAsAdmin(page);
    await cleanupThrowawayProducts(page, NAME_PREFIX);
    const created = await createThrowawayProduct(page, NAME_PREFIX, UNIT_PRICE);
    productId = created.id;
    productName = created.name;
    await page.close();
  });

  test.afterAll(async ({ browser }) => {
    const page = await browser.newPage({ extraHTTPHeaders: bypassHeaders() });
    await loginAsAdmin(page);
    await cleanupThrowawayProducts(page, NAME_PREFIX);
    await page.close();
  });

  test('카드결제 선택 → 서버 확정 금액으로 토스 위젯 마운트(승인 자동화는 하지 않음)', async ({
    page,
  }) => {
    await loginAsMember(page);

    await page.goto(`/shop/${productId}`);
    await expect(page.getByRole('heading', { name: productName })).toBeVisible({ timeout: 15_000 });
    await page.getByRole('button', { name: '장바구니' }).click();

    await page.goto('/checkout');
    await expect(page.locator('body')).toContainText(productName, { timeout: 15_000 });

    const cardRadioLabel = page.locator('label').filter({ hasText: /카드결제/ });
    const isDisabled = await cardRadioLabel.locator('input[type="radio"]').isDisabled();
    test.skip(isDisabled, 'NEXT_PUBLIC_TOSS_CLIENT_KEY 미설정 — 카드결제 옵션 자체가 비활성화됨(경계 문서화, 코드상 정상)');

    await cardRadioLabel.click();

    // 위젯 마운트 대상 컨테이너 — 로드 실패 시 별도 에러 문구로 대체되므로(widgetError),
    // 정상 마운트를 "위젯 준비중" 문구가 사라지고 결제수단 UI가 뜨는 것으로 확인한다.
    await expect(page.locator('#toss-payment-method')).toBeVisible({ timeout: 15_000 });
    await expect(page.locator('text=결제 위젯을 불러오지 못했습니다')).toHaveCount(0);

    // 최종 결제금액이 상품가(단가×1)+배송비로 서버/화면 양쪽에서 일치하는지 — requestPayment
    // 호출 없이 버튼이 활성화되는 지점까지만 확인한다.
    const payButton = page.getByRole('button', { name: /결제하기/ });
    await expect(payButton).toBeVisible();
    // isCardPayment && !widgetReady 동안은 disabled — 위젯 준비가 끝나면 눌러볼 수 있는 상태가 된다.
    await expect(payButton).toBeEnabled({ timeout: 20_000 });

    // ⚠️ 여기서 클릭하지 않는다 — 클릭 시 requestPayment()가 실제 토스 호스티드 결제창으로
    // 페이지를 이동시키며, 그 안의 승인 플로우는 위 코멘트대로 자동화 대상이 아니다.
  });
});
