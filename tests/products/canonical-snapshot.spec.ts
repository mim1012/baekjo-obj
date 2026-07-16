import { test, expect } from '@playwright/test';
import { products } from '@/data/products';

// ⭐ 정본(src/data/products.ts) ↔ prod DB drift 재발 방지 스냅샷 — 순수 데이터, 브라우저·DB 불필요.
//
// 배경(2026-07-16~17 감사): 정본이 prod 현실을 모른 채 조용히 갈라져 있었다(22개 중 21개 drift).
//   실판매 상품의 가격·세일가·썸네일이 정본에서는 플레이스홀더(.svg)·옛 값이었고, 그 정본으로
//   재시드를 돌리면 **prod 의 실판매 데이터를 파괴**하는 상태였다. 아무도 그걸 몰랐던 이유는
//   단순하다 — 갈라짐을 재확인하는 장치가 아무 데도 없었다.
//
// 이 스펙이 그 장치다. 아래 기대값은 **prod 실측(2026-07-17) 기준**이며, PR #94 에서 정본을
// 이 값으로 역기입했다. 즉 이 스펙이 GREEN = "정본이 그 시점 prod 와 일치한다".
//
// ⚠️ 이 테스트가 RED 로 바뀌었다면 둘 중 하나다:
//   (a) 정본을 의도치 않게 바꿨다 → 코드를 되돌려라.
//   (b) prod 를 **관리자 화면에서 의도적으로 바꿨다**(가격·재고·썸네일 등) → 정본과 이 스냅샷을
//       **함께** 갱신하라. 스냅샷만 맞추고 정본을 안 고치면 재시드가 다시 prod 를 파괴한다.
//   어느 쪽이든 "테스트를 통과시키려고 기대값만 고치는" 것은 금지다 — 그게 바로 drift 의 시작이다.
//
// prod 를 CI 에서 직접 조회하지 않는 이유: 서비스 키가 필요하고 무겁다. 대신 **정본 자체를 잠가**
// 정본이 조용히 움직이는 것을 막는다(prod 쪽 변경은 위 (b) 규율로 사람이 동기화한다).

type Expected = {
  id: string;
  name: string;
  price: number | null;
  stock: number;
  brandId: string;
  isVisible: boolean;
};

// 상품 22개 — id·name·price·stock·brandId·isVisible (prod 실측 2026-07-17).
const EXPECTED: Expected[] = [
  { id: 'p1', name: '페네핏 팔레트파우더 2.0 루틴 케어 5종', price: 138000, stock: 999, brandId: 'b1', isVisible: true },
  { id: 'p2', name: '페네핏 팔레트파우더 2.0 올인원 케어 박스', price: 245000, stock: 999, brandId: 'b1', isVisible: true },
  { id: 'p3', name: '페네핏 팔레트파우더 2.0 30일 스타터 키트', price: 43000, stock: 999, brandId: 'b1', isVisible: true },
  { id: 'p4', name: '오미프로 OMIPRO-D 강아지용 230g', price: null, stock: 999, brandId: 'b2', isVisible: true },
  { id: 'p5', name: '오미프로 OMIPRO-C 고양이용 230g', price: null, stock: 999, brandId: 'b2', isVisible: true },
  { id: 'p6', name: '오미프로 반려동물 냄새 케어 세트', price: 125000, stock: 200, brandId: 'b2', isVisible: false },
  { id: 'p7', name: '노블독 냥치하개 뿌리는 치약 100ml', price: 25000, stock: 999, brandId: 'b3', isVisible: true },
  { id: 'p8', name: '노블독 구강 청결 스프레이 100ml', price: 99000, stock: 999, brandId: 'b3', isVisible: false },
  // p9~p11·p13·p14: 0035 가 폐기 브랜드('캣코드') 접두어를 '알로밍'으로 정정한 뒤의 이름이다.
  { id: 'p9', name: '알로밍 고양이 브러쉬', price: 99000, stock: 999, brandId: 'b5', isVisible: false },
  { id: 'p10', name: '알로밍 브러싱 케어 오브제', price: null, stock: 150, brandId: 'b5', isVisible: false },
  { id: 'p11', name: '알로밍 고양이 마사지 브러쉬', price: null, stock: 400, brandId: 'b5', isVisible: false },
  { id: 'p12', name: '알로밍 트루그루밍 브러시 단모용 그립 모듈', price: 32200, stock: 999, brandId: 'b5', isVisible: true },
  { id: 'p13', name: '알로밍 트루그루밍 브러시', price: 109000, stock: 120, brandId: 'b5', isVisible: false },
  { id: 'p14', name: '알로밍 트루그루밍 브러시 다크그레이', price: 99000, stock: 100, brandId: 'b5', isVisible: false },
  { id: 'p15', name: '[for ur dog] Bamboo Cardigan', price: 98000, stock: 0, brandId: 'b7', isVisible: true },
  { id: 'p16', name: '메종슈슈 Gold Ops', price: 98000, stock: 0, brandId: 'b7', isVisible: true },
  { id: 'p17', name: '차콜프레시 그레인 고양이 모래 탈취제 500g', price: 30000, stock: 0, brandId: 'b8', isVisible: true },
  { id: 'p18', name: '차콜프레시 참숯 탈취 매트', price: 36000, stock: 0, brandId: 'b8', isVisible: true },
  { id: 'p19', name: 'RE:펫 우리아이 입체 맞춤 양모 초상화', price: 250000, stock: 1, brandId: 'b6', isVisible: true },
  { id: 'p20', name: 'RePet 강아지·고양이 약용·진정 샴푸 400ml', price: null, stock: 0, brandId: 'b6', isVisible: false },
  { id: 'p21', name: '애니마크 반려동물 피부 연고', price: 8000, stock: 98, brandId: 'b9', isVisible: true },
  { id: 'p22', name: '퍼르르펙트 고양이 캣닢 향수', price: 40000, stock: 0, brandId: 'b9', isVisible: true },
];

// 실판매 12건 — salePrice·image (prod 실측 2026-07-17).
// image 4건(p15·p16·p17·p19)은 **.jpg 실사진**이다. 과거 정본은 여기가 플레이스홀더 .svg 였고
// 그 상태로 재시드하면 실사진이 날아갔다 — 확장자까지 명시적으로 잠근다.
const EXPECTED_SELLING: { id: string; salePrice: number | undefined; image: string }[] = [
  { id: 'p1', salePrice: 109900, image: '/products/p1.webp' },
  { id: 'p2', salePrice: 199000, image: '/products/p2.webp' },
  { id: 'p3', salePrice: 34900, image: '/products/p3.webp' },
  { id: 'p7', salePrice: 21890, image: '/products/p7.webp' },
  { id: 'p12', salePrice: 24200, image: '/products/p12.webp' },
  { id: 'p15', salePrice: 68600, image: '/products/p15.jpg' },
  { id: 'p16', salePrice: 68600, image: '/products/p16.jpg' },
  { id: 'p17', salePrice: 14850, image: '/products/p17.jpg' },
  // p18: prod 에 썸네일이 아직 없다(빈 문자열). 실사진이 들어오면 정본·이 스냅샷을 함께 갱신.
  { id: 'p18', salePrice: 14900, image: '' },
  // p19: 주문제작 1점 — 세일가 없음(undefined). 이름/가격/썸네일 3종 전부 회귀 감시 대상.
  { id: 'p19', salePrice: undefined, image: '/products/p19.jpg' },
  { id: 'p21', salePrice: 5900, image: '/products/p21.webp' },
  { id: 'p22', salePrice: 18000, image: '/products/p22.webp' },
];

const byId = new Map(products.map((p) => [p.id, p]));

test.describe('정본 스냅샷 — 상품 22개 핵심 필드', () => {
  test('상품 수와 id 목록이 prod 실측과 일치한다 (추가·삭제 감시)', () => {
    expect(products).toHaveLength(EXPECTED.length);
    expect(products.map((p) => p.id)).toEqual(EXPECTED.map((e) => e.id));
  });

  for (const expected of EXPECTED) {
    test(`${expected.id} — name·price·stock·brandId·isVisible 이 prod 실측과 일치한다`, () => {
      const product = byId.get(expected.id);
      expect(product, `${expected.id} 상품이 정본에서 사라졌다`).toBeDefined();
      expect({
        id: product!.id,
        name: product!.name,
        price: product!.price ?? null,
        stock: product!.stock,
        brandId: product!.brandId,
        // isVisible 은 optional — 미지정은 노출(true)이 기본값이다.
        isVisible: product!.isVisible !== false,
      }).toEqual(expected);
    });
  }
});

test.describe('정본 스냅샷 — 실판매 12건 salePrice·image', () => {
  for (const expected of EXPECTED_SELLING) {
    test(`${expected.id} — salePrice·image 가 prod 실측과 일치한다`, () => {
      const product = byId.get(expected.id);
      expect(product, `${expected.id} 상품이 정본에서 사라졌다`).toBeDefined();
      expect(product!.salePrice ?? undefined).toBe(expected.salePrice);
      expect(product!.image).toBe(expected.image);
    });
  }

  test('실사진 4건(p15·p16·p17·p19)의 썸네일이 .jpg 다 (플레이스홀더 .svg 회귀 차단)', () => {
    for (const id of ['p15', 'p16', 'p17', 'p19']) {
      const product = byId.get(id);
      expect(product, `${id} 상품이 정본에서 사라졌다`).toBeDefined();
      expect(product!.image, `${id} 썸네일이 실사진(.jpg)이 아니다`).toMatch(/\.jpg$/);
    }
  });
});

test.describe('거짓 별점 재유입 차단 (0037)', () => {
  // 0037_remove_fake_ratings.sql 이 prod 의 가짜 별점 7건을 0 으로 지운다.
  // 정본에도 근거 없는 수치가 다시 들어오면 재시드로 prod 에 되살아난다 — 여기서 막는다.
  // 실제 리뷰 표시는 product_reviews(0029) 집계로 하며, 그때 이 스펙과 정본을 함께 갱신한다.
  test('전 상품의 rating·reviewCount 가 0 이다', () => {
    const nonZero = products
      .filter((p) => p.rating !== 0 || p.reviewCount !== 0)
      .map((p) => `${p.id}(rating=${p.rating}, reviewCount=${p.reviewCount})`);
    expect(nonZero, '근거 없는 별점·리뷰수가 정본에 들어왔다').toEqual([]);
  });
});
