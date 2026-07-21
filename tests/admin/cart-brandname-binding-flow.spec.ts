import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

// 장바구니 브랜드명 표시 회귀 가드 — wave-5 필드 커버리지 매트릭스 검증이 발견한 버그(카트 행이
// 브랜드명 대신 내부 코드 brandId(예 'b2')를 그대로 노출)의 재발 방지. 순수 소스 문자열 검증
// (브라우저·DB 불필요, tests/admin 레이어 — 항상 켜짐).
//
// product.brandName 은 admin이 detail jsonb에 직접 입력했을 때만 채워지는 선택 필드라 대부분의
// 상품에서 비어 있다(src/lib/products/repo.ts rowToProduct 참고, brands 테이블과 실조인하지 않음).
// 그래서 신뢰 가능한 순서는 product.brandName(있으면) → 공개 브랜드 목록(getPublicBrands)에서
// brandId로 조회한 name → 최후 폴백 brandId 순이다. OrdersSection.tsx(src/app/mypage/components/)가
// 같은 패턴(주문 번들의 brandId를 getPublicBrands 결과에서 조회)을 이미 쓰고 있어 이를 미러링한다.

const root = path.resolve(__dirname, '..', '..');
const src = (...segments: string[]) => fs.readFileSync(path.join(root, ...segments), 'utf8');

test.describe('장바구니 브랜드명 표시', () => {
  test('cart 페이지는 getPublicBrands 로 브랜드 목록을 조회해 brandId 를 이름으로 해석한다', () => {
    const pageSource = src('src', 'app', 'cart', 'page.tsx');

    // getPublicProducts → getPublicProductsOrNull 전환(2026-07-19, CRITICAL 수정 PR #173) —
    // 조회 실패(null)와 진짜 노출상품 0건([])을 구분해 자가치유 프루닝이 실패 시 카트를
    // 지워버리지 않게 한다. 브랜드명 해석 로직 자체는 무변경.
    const storageImport = pageSource.match(/import \{([^}]+)\} from '@\/lib\/storage';/);
    expect(storageImport?.[1]).toContain('getPublicProductsOrNull');
    expect(storageImport?.[1]).toContain('getPublicBrands');
    expect(pageSource).toContain('const [brands, setBrands] = useState<Brand[]>([]);');
    // 상품 목록과 브랜드 목록을 같은 마운트 이펙트에서 함께 가져온다 — 행마다 개별 fetch 금지.
    expect(pageSource).toContain('Promise.all([getPublicProductsOrNull(), getPublicBrands()])');

    // 해석 순서: brandName(선택 필드) → 브랜드 목록 조회 → 최후 폴백 brandId.
    expect(pageSource).toContain(
      "const brandName = product?.brandName || brands.find(b => b.id === product?.brandId)?.name || product?.brandId;",
    );

    // 회귀 가드 — 카트 행 라벨이 다시 brandId 원값을 직접 렌더하지 않는다.
    expect(pageSource).not.toContain('{item.product?.brandId}</div>');
    expect(pageSource).toContain('{item.brandName}</div>');
  });
});
