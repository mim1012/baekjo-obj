import { test, expect } from '@playwright/test';
import { validateProductFields, toInsertInput } from '@/lib/products/validate';

// 상품 입력 검증 순수 함수 스펙 — DB/브라우저/네트워크 불필요.
// 회귀 배경: detailBlocks 분기 누락 → 상세 에디터 PATCH가 빈 객체가 되어 400 (상세 본문 영구 미저장),
// description 필수 완화, 구매 정보 3종(deliveryEstimate/returnNotice/sellerName) 화이트리스트 누락.

function minimalRequiredBody(): Record<string, unknown> {
  return {
    brandId: 'b1',
    name: '상품명',
    price: 10000,
    category: '사료',
    lifestyleCategory: '실내',
    petType: 'dog',
    ageGroup: 'adult',
    image: '/products/p1.webp',
    stock: 10,
  };
}

test.describe('detailBlocks (핵심 회귀)', () => {
  test('text+image 블록이 있으면 통과하고 detailBlocks가 결과에 담긴다', () => {
    const result = validateProductFields(
      {
        detailBlocks: [
          { type: 'text', content: '본문' },
          { type: 'image', src: '/a.webp', alt: '대체' },
        ],
      },
      false,
    );
    expect(result).not.toBeNull();
    expect(Object.keys(result!).length).toBeGreaterThan(0);
    expect(result!.detailBlocks).toHaveLength(2);
  });

  test('빈 배열이면 통과하고 detailBlocks가 []로 담긴다 (전체 삭제 가능)', () => {
    const result = validateProductFields({ detailBlocks: [] }, false);
    expect(result).not.toBeNull();
    expect(result!.detailBlocks).toEqual([]);
  });

  test('image 블록에 src가 없으면 거부된다', () => {
    const result = validateProductFields(
      { detailBlocks: [{ type: 'image' }] },
      false,
    );
    expect(result).toBeNull();
  });

  test('알 수 없는 type이면 거부된다', () => {
    const result = validateProductFields(
      { detailBlocks: [{ type: 'video', url: 'https://example.com/v.mp4' }] },
      false,
    );
    expect(result).toBeNull();
  });

  test('블록이 61개면 상한 초과로 거부된다', () => {
    const blocks = Array.from({ length: 61 }, () => ({ type: 'text', content: 'x' }));
    const result = validateProductFields({ detailBlocks: blocks }, false);
    expect(result).toBeNull();
  });

  test('블록이 60개면 상한 이내로 통과한다', () => {
    const blocks = Array.from({ length: 60 }, () => ({ type: 'text', content: 'x' }));
    const result = validateProductFields({ detailBlocks: blocks }, false);
    expect(result).not.toBeNull();
    expect(result!.detailBlocks).toHaveLength(60);
  });

  test('text content가 2001자면 거부된다', () => {
    const result = validateProductFields(
      { detailBlocks: [{ type: 'text', content: 'a'.repeat(2001) }] },
      false,
    );
    expect(result).toBeNull();
  });

  test('detailBlocks 총 직렬화 바이트가 상한(256KB)을 넘으면 거부된다', () => {
    // 60블록 × 2000자 한글 = 120,000자 → UTF-8 360,000바이트 > 256KB.
    // 블록 수·개별 길이는 전부 상한 이내지만 합계가 넘는 케이스.
    const blocks = Array.from({ length: 60 }, () => ({ type: 'text', content: '가'.repeat(2000) }));
    const result = validateProductFields({ detailBlocks: blocks }, false);
    expect(result).toBeNull();
  });

  test('블록의 잉여 키는 결과에 담기지 않는다 (mass-assignment 차단)', () => {
    const result = validateProductFields(
      { detailBlocks: [{ type: 'text', content: 'a', evil: 'x' }] },
      false,
    );
    expect(result).not.toBeNull();
    expect(result!.detailBlocks![0]).toEqual({ type: 'text', content: 'a' });
    expect(result!.detailBlocks![0]).not.toHaveProperty('evil');
  });

  test('requireAll=true 생성 바디에 detailBlocks가 함께 와도 통과한다', () => {
    const body = {
      ...minimalRequiredBody(),
      detailBlocks: [{ type: 'text', content: '본문' }],
    };
    const result = validateProductFields(body, true);
    expect(result).not.toBeNull();
    expect(result!.detailBlocks).toHaveLength(1);
    expect(toInsertInput(result!)).not.toBeNull();
  });
});

// text content는 sanitize하지 않는다 — 공개 상세(shop/[id]/page.tsx)와 에디터 미리보기 둘 다
// {block.content} 평문 렌더라 HTML 파싱 경로가 없다(= 저장형 XSS 싱크 없음). 그 전제는
// tests/products/no-html-sink.spec.ts가 src/ 트리의 dangerouslySetInnerHTML 0건으로 기계 강제한다.
// 과거의 태그 거부 정규식(/<[a-zA-Z/!]/)은 `<A/S 안내>`·`<NEW>` 같은 정당한 커머스 문구를 막으면서
// 인코딩 우회는 못 막는 새는 방어였으므로 제거했다. 아래는 "이제 통과가 맞다"를 잠그는 스펙이다.
test.describe('text 블록 content — 평문 저장(태그 거부 없음)', () => {
  test('`<A/S 안내> 1588-0000` 같은 정당한 문구가 통과한다 (오탐 제거)', () => {
    const content = '<A/S 안내> 1588-0000 <NEW> 신제품, x<y 인 경우 교환';
    const result = validateProductFields({ detailBlocks: [{ type: 'text', content }] }, false);
    expect(result).not.toBeNull();
    expect(result!.detailBlocks![0]).toEqual({ type: 'text', content });
  });

  test('<script> 문자열도 저장은 통과한다 (렌더가 평문이라 안전 — no-html-sink 스펙이 전제를 강제)', () => {
    const content = '앞말<script>alert(1)</script>뒷말';
    const result = validateProductFields({ detailBlocks: [{ type: 'text', content }] }, false);
    expect(result).not.toBeNull();
    expect(result!.detailBlocks![0]).toEqual({ type: 'text', content });
  });

  test('길이 상한(2000자)은 그대로 유지된다', () => {
    const result = validateProductFields(
      { detailBlocks: [{ type: 'text', content: '<b>'.repeat(1000) }] },
      false,
    );
    expect(result).toBeNull(); // 3000자 > MAX_BLOCK_TEXT
  });

  test('태그 없는 평문(한글·줄바꿈·부등호)은 통과한다', () => {
    const content = '우리 아이에게 정말 필요한 선택만.\n무게 < 5kg 권장\n\n하루 2회 급여하세요.';
    const result = validateProductFields({ detailBlocks: [{ type: 'text', content }] }, false);
    expect(result).not.toBeNull();
    expect(result!.detailBlocks![0]).toEqual({ type: 'text', content });
  });
});

test.describe('image 블록 src 오리진 화이트리스트', () => {
  test('외부 오리진(https://evil.example/x.gif)은 거부된다', () => {
    const result = validateProductFields(
      { detailBlocks: [{ type: 'image', src: 'https://evil.example/x.gif' }] },
      false,
    );
    expect(result).toBeNull();
  });

  test('javascript: 스킴은 거부된다', () => {
    const result = validateProductFields(
      { detailBlocks: [{ type: 'image', src: 'javascript:alert(1)' }] },
      false,
    );
    expect(result).toBeNull();
  });

  test('프로토콜 상대 URL(//evil.example/x.gif)은 거부된다', () => {
    const result = validateProductFields(
      { detailBlocks: [{ type: 'image', src: '//evil.example/x.gif' }] },
      false,
    );
    expect(result).toBeNull();
  });

  // 브라우저 URL 파서는 special scheme에서 백슬래시를 '/'로 정규화하고 탭·개행을 제거한다.
  // → `/\evil.example/x.gif`, `/<TAB>/evil.example/x.gif`가 `//evil.example/x.gif`와 동치가 되어
  //   외부 오리진을 로드한다. 접두사 검사만으로는 못 막으므로 URL 파서로 오리진을 확인한다.
  test('백슬래시 우회(/\\evil.example/x.gif)는 거부된다', () => {
    const result = validateProductFields(
      { detailBlocks: [{ type: 'image', src: '/\\evil.example/x.gif' }] },
      false,
    );
    expect(result).toBeNull();
  });

  test('탭 삽입 우회(/<TAB>/evil.example/x.gif)는 거부된다', () => {
    const result = validateProductFields(
      { detailBlocks: [{ type: 'image', src: '/\t/evil.example/x.gif' }] },
      false,
    );
    expect(result).toBeNull();
  });

  test('개행 삽입 우회(/<LF>/evil.example/x.gif)는 거부된다', () => {
    const result = validateProductFields(
      { detailBlocks: [{ type: 'image', src: '/\n/evil.example/x.gif' }] },
      false,
    );
    expect(result).toBeNull();
  });

  test('캐리지리턴 삽입 우회(/<CR>/evil.example/x.gif)는 거부된다', () => {
    const result = validateProductFields(
      { detailBlocks: [{ type: 'image', src: '/\r/evil.example/x.gif' }] },
      false,
    );
    expect(result).toBeNull();
  });

  test('시드 상세 경로(/products/detail/penefit-palette/01.webp)는 통과한다 (회귀 방지)', () => {
    const src = '/products/detail/penefit-palette/01.webp';
    const result = validateProductFields({ detailBlocks: [{ type: 'image', src }] }, false);
    expect(result).not.toBeNull();
    expect(result!.detailBlocks![0]).toEqual({ type: 'image', src });
  });

  test('시드 썸네일 경로(/products/p1.webp)는 통과한다 (회귀 방지)', () => {
    const src = '/products/p1.webp';
    const result = validateProductFields({ detailBlocks: [{ type: 'image', src }] }, false);
    expect(result).not.toBeNull();
    expect(result!.detailBlocks![0]).toEqual({ type: 'image', src });
  });

  test('자사 상대경로(/products/detail/a/01.webp)는 통과한다', () => {
    const result = validateProductFields(
      { detailBlocks: [{ type: 'image', src: '/products/detail/a/01.webp' }] },
      false,
    );
    expect(result).not.toBeNull();
    expect(result!.detailBlocks![0]).toEqual({ type: 'image', src: '/products/detail/a/01.webp' });
  });

  test('alt 없는 image 블록은 통과하고 결과에 alt 키가 없다', () => {
    const result = validateProductFields(
      { detailBlocks: [{ type: 'image', src: '/a.webp' }] },
      false,
    );
    expect(result).not.toBeNull();
    expect(result!.detailBlocks![0]).not.toHaveProperty('alt');
  });
});

test.describe('description 완화', () => {
  test('생성 시 description을 빼도 통과하고 결과 description은 빈 문자열이다', () => {
    const body = minimalRequiredBody();
    const result = validateProductFields(body, true);
    expect(result).not.toBeNull();
    expect(result!.description).toBe('');
  });

  test('최소 필수 바디는 toInsertInput()이 null을 반환하지 않는다 (실제 생성 경로 통과)', () => {
    const body = minimalRequiredBody();
    const result = validateProductFields(body, true);
    expect(result).not.toBeNull();
    const insertInput = toInsertInput(result!);
    expect(insertInput).not.toBeNull();
  });

  test('lifestyleCategory가 빈 문자열이면 여전히 거부된다', () => {
    const body = { ...minimalRequiredBody(), lifestyleCategory: '' };
    const result = validateProductFields(body, true);
    expect(result).toBeNull();
  });

  test('image가 빈 문자열이면 여전히 거부된다', () => {
    const body = { ...minimalRequiredBody(), image: '' };
    const result = validateProductFields(body, true);
    expect(result).toBeNull();
  });
});

test.describe('구매 정보 3종', () => {
  test('deliveryEstimate, returnNotice, sellerName 모두 결과에 담긴다', () => {
    const result = validateProductFields(
      {
        deliveryEstimate: '결제 후 2~3일',
        returnNotice: '수령 후 7일',
        sellerName: '백조오브제',
      },
      false,
    );
    expect(result).not.toBeNull();
    expect(result!.deliveryEstimate).toBe('결제 후 2~3일');
    expect(result!.returnNotice).toBe('수령 후 7일');
    expect(result!.sellerName).toBe('백조오브제');
  });
});

test.describe('가격 교차검증', () => {
  test('salePrice가 price보다 크면 거부된다', () => {
    const result = validateProductFields({ price: 10000, salePrice: 20000 }, false);
    expect(result).toBeNull();
  });

  test('price=null + salePrice=null 은 통과한다 (가격 미정 시드 상품 수정 시나리오)', () => {
    const result = validateProductFields({ price: null, salePrice: null, name: '상품' }, false);
    expect(result).not.toBeNull();
    expect(result!.price).toBeNull();
    expect(result!.salePrice).toBeNull();
  });

  test('price=null 인데 salePrice만 있으면 거부된다 (정가 없는 세일가)', () => {
    const result = validateProductFields({ price: null, salePrice: 5000 }, false);
    expect(result).toBeNull();
  });
});

test.describe('폼 부분수정 계약 (ProductForm 화이트리스트 회귀 방지)', () => {
  // 배경: ProductForm이 `...formData`(페이지 로드 시점 스냅샷)를 통째로 PATCH에 실어 보내면
  // 상세 에디터가 그 사이 저장한 detailBlocks가 낡은 값으로 덮어써진다. 폼은 이제 자기가
  // 편집하는 필드만 명시적으로 보낸다 — 서버 계약도 "안 보낸 필드는 유지"임을 여기서 잠근다.
  test('PATCH에 detailBlocks가 없으면 결과에 detailBlocks 키가 없다 (기존 값 보존)', () => {
    const result = validateProductFields({ name: '재고만 수정' }, false);
    expect(result).not.toBeNull();
    expect('detailBlocks' in result!).toBe(false);
  });

  test('생성(requireAll=true)에서 ageGroup이 빠지면 거부된다 (폼이 반드시 보내야 함)', () => {
    const body = minimalRequiredBody();
    delete (body as Record<string, unknown>).ageGroup;
    const result = validateProductFields(body, true);
    expect(result).toBeNull();
  });
});

test.describe('적립금 설정 (pointsEnabled/pointsRate)', () => {
  test('pointsRate 경계값 0, 100 은 통과한다', () => {
    expect(validateProductFields({ pointsRate: 0 }, false)!.pointsRate).toBe(0);
    expect(validateProductFields({ pointsRate: 100 }, false)!.pointsRate).toBe(100);
  });

  test('pointsRate 가 -1, 101, 문자열이면 거부된다', () => {
    expect(validateProductFields({ pointsRate: -1 }, false)).toBeNull();
    expect(validateProductFields({ pointsRate: 101 }, false)).toBeNull();
    expect(validateProductFields({ pointsRate: 'abc' }, false)).toBeNull();
  });

  test('pointsEnabled 가 boolean 이 아니면 거부된다', () => {
    expect(validateProductFields({ pointsEnabled: 'yes' }, false)).toBeNull();
    expect(validateProductFields({ pointsEnabled: 1 }, false)).toBeNull();
  });

  test('pointsEnabled 가 boolean 이면 통과한다', () => {
    expect(validateProductFields({ pointsEnabled: true }, false)!.pointsEnabled).toBe(true);
    expect(validateProductFields({ pointsEnabled: false }, false)!.pointsEnabled).toBe(false);
  });
});

test.describe('기존 계약 회귀 방지', () => {
  test('salePrice가 price보다 크면 거부된다', () => {
    const result = validateProductFields({ price: 1000, salePrice: 2000 }, false);
    expect(result).toBeNull();
  });

  test('알 수 없는 필드(id, createdAt)는 결과에서 드롭된다 (mass-assignment 차단)', () => {
    const result = validateProductFields(
      { name: '상품', id: '해커가_지정한_id', createdAt: '2020-01-01' },
      false,
    );
    expect(result).not.toBeNull();
    expect(result).not.toHaveProperty('id');
    expect(result).not.toHaveProperty('createdAt');
  });
});
