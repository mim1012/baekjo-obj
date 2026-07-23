import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

// 골든플로우 #7 커버리지 감사 — 새 admin API 도메인이 실구동(golden-crud) 검증 없이
// 조용히 늘어나는 것을 막는다. 이 스펙은 소스-계약 스타일(항상 켜짐, tests/admin 레이어)이라
// E2E_ADMIN_CRUD나 실 staging 없이도 CI에서 항상 돈다.
//
// 검사 대상: src/app/api/admin/* 의 각 하위 디렉터리(= 도메인 하나). 새 디렉터리가 생기면
// 아래 LIVE_COVERED/EXCLUDED 둘 중 하나에 명시적으로 등록해야 한다 — 안 하면 이 스펙이
// 실패한다("새 API를 추가했는데 e2e 테스트를 깜빡함"을 사람 기억이 아니라 기계가 잡는다).
//
// LIVE_COVERED = tests/golden/admin-crud-*.spec.ts가 실제로 브라우저로 등록→검증→삭제까지
// 구동하고, golden-crud.yml의 변경-경로 매핑에도 그 도메인 경로가 등록된 도메인.
// EXCLUDED = 의도적으로 실구동 스펙을 안 만든 도메인. 이유를 반드시 적는다(다음 세션이
// "왜 없지?"를 또 조사하지 않게).

const root = path.resolve(__dirname, '..', '..');
const ADMIN_API_DIR = path.join(root, 'src/app/api/admin');
const GOLDEN_CRUD_YML = path.join(root, '.github/workflows/golden-crud.yml');
const GOLDEN_SPEC_DIR = path.join(root, 'tests/golden');

function listAdminApiDomains(): string[] {
  return fs
    .readdirSync(ADMIN_API_DIR, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
}

interface LiveCoverage {
  /** tests/golden/ 기준 상대 파일명. */
  spec: string;
  /** golden-crud.yml의 grep -qE 경로 패턴 안에 이 문자열이 그대로 있어야 한다. */
  pathNeedle: string;
}

/**
 * 실구동(golden-crud) 스펙이 있는 도메인. spec 파일 존재 + golden-crud.yml 경로 매핑
 * 등록 여부를 아래에서 기계로 재확인한다 — 스펙을 지우거나 이름을 바꾸고 이 맵을
 * 갱신하지 않으면 실패한다.
 */
const LIVE_COVERED: Record<string, LiveCoverage> = {
  brands: { spec: 'admin-crud-brands.spec.ts', pathNeedle: 'src/app/api/admin/brands/' },
  'category-settings': {
    spec: 'admin-crud-category-settings.spec.ts',
    pathNeedle: 'src/app/api/admin/category-settings/',
  },
  concerns: { spec: 'admin-crud-concerns.spec.ts', pathNeedle: 'src/app/api/admin/concerns/' },
  inquiries: { spec: 'admin-crud-qna-inquiries.spec.ts', pathNeedle: 'src/app/api/admin/inquiries/' },
  insurance: { spec: 'admin-crud-insurance.spec.ts', pathNeedle: 'src/app/api/admin/insurance/' },
  'insurance-content': {
    spec: 'admin-crud-insurance-content.spec.ts',
    pathNeedle: 'src/app/api/admin/insurance-content/',
  },
  kits: { spec: 'admin-crud-kits-partners.spec.ts', pathNeedle: 'src/app/api/admin/kits/' },
  members: { spec: 'admin-crud-members.spec.ts', pathNeedle: 'src/app/api/admin/members/' },
  notices: { spec: 'admin-crud-notices.spec.ts', pathNeedle: 'src/app/api/admin/notices/' },
  'order-policy': { spec: 'admin-crud-order-policy.spec.ts', pathNeedle: 'src/app/api/admin/order-policy/' },
  orders: { spec: 'admin-crud-orders.spec.ts', pathNeedle: 'src/app/api/admin/orders/' },
  'partner-inquiries': {
    spec: 'admin-crud-partner-inquiries.spec.ts',
    pathNeedle: 'src/app/api/admin/partner-inquiries/',
  },
  partners: { spec: 'admin-crud-kits-partners.spec.ts', pathNeedle: 'src/app/api/admin/partners/' },
  products: { spec: 'admin-crud-products.spec.ts', pathNeedle: 'src/app/api/admin/products/' },
  qna: { spec: 'admin-crud-qna-config.spec.ts', pathNeedle: 'src/app/api/admin/qna/' },
  settings: { spec: 'admin-crud-home-settings.spec.ts', pathNeedle: 'src/app/api/admin/settings/' },
  'showcase-reviews': {
    spec: 'admin-crud-showcase-reviews.spec.ts',
    pathNeedle: 'src/app/api/admin/showcase-reviews/',
  },
  survey: { spec: 'admin-crud-survey.spec.ts', pathNeedle: 'src/app/api/admin/survey/' },
};

/** 실구동 스펙이 의도적으로 없는 도메인 — 사유를 반드시 적는다. */
const EXCLUDED: Record<string, string> = {
  dashboard: '조회 전용 통계 집계 — GET만 존재, 쓰기 동작 없음.',
  upload:
    '업로드 유틸리티(ImageUploader가 쓰는 공용 엔드포인트) — 그 자체가 CRUD 리소스가 아니며, ' +
    'brands/products 실구동 스펙의 이미지 업로드 스텝에서 이미 간접적으로 실행된다.',
  reviews:
    '구매평(product_reviews) moderation 전용 — showcase-reviews(전시 후기, 관리자가 직접 CRUD 생성)와 ' +
    '달리 관리자가 새 행을 만들지 않고 회원이 실제 구매 후 작성한 리뷰의 노출/숨김·삭제만 다룬다. ' +
    '실구동으로 등록 단계를 재현하려면 체크아웃(주문 생성→배송완료→구매확정) 전체를 먼저 선행해야 해 ' +
    '이 PR 범위 밖 — 대신 tests/admin/admin-reviews-moderation-contract.spec.ts가 가드·화이트리스트· ' +
    '집계 트리거(0070)를 소스-계약으로 검증한다.',
};

test.describe('골든플로우 #7 커버리지 감사 — 새 admin 도메인 누락 방지', () => {
  const domains = listAdminApiDomains();
  const ymlContent = fs.readFileSync(GOLDEN_CRUD_YML, 'utf8');

  test('src/app/api/admin/* 의 모든 도메인이 LIVE_COVERED 또는 EXCLUDED로 분류돼 있다', () => {
    const unclassified = domains.filter((d) => !(d in LIVE_COVERED) && !(d in EXCLUDED));
    expect(
      unclassified,
      `신규 admin 도메인 [${unclassified.join(', ')}] 이 golden-crud 커버리지 분류에 없습니다. ` +
        '실구동 스펙을 추가하고 golden-crud.yml 경로 매핑에 등록하거나(LIVE_COVERED), ' +
        '명시적 EXCLUDED 사유를 tests/admin/golden-crud-coverage.spec.ts에 적으세요.',
    ).toEqual([]);
  });

  for (const [domain, coverage] of Object.entries(LIVE_COVERED)) {
    test(`LIVE_COVERED: ${domain} — 스펙 파일이 실존하고 golden-crud.yml 경로 매핑에 등록돼 있다`, () => {
      const specPath = path.join(GOLDEN_SPEC_DIR, coverage.spec);
      expect(
        fs.existsSync(specPath),
        `${coverage.spec} 파일이 없습니다 — 스펙을 삭제·이름변경한 뒤 이 커버리지 맵을 갱신하는 걸 잊었을 수 있습니다.`,
      ).toBe(true);
      expect(
        ymlContent.includes(coverage.pathNeedle),
        `golden-crud.yml에 ${domain} 도메인 경로(${coverage.pathNeedle})가 매핑돼 있지 않습니다.`,
      ).toBe(true);
    });
  }

  test('EXCLUDED 목록의 모든 도메인이 여전히 src/app/api/admin/*에 실존한다', () => {
    const staleExclusions = Object.keys(EXCLUDED).filter((d) => !domains.includes(d));
    expect(
      staleExclusions,
      `EXCLUDED 목록에 있지만 더 이상 존재하지 않는 도메인: [${staleExclusions.join(', ')}] — ` +
        '목록에서 지워도 되는지 확인하세요(도메인 자체가 삭제됐다면 정리 대상).',
    ).toEqual([]);
  });

  // LIVE_COVERED 쪽의 대칭 검사(리뷰 LOW-A) — 위 EXCLUDED 잔존 검사는 삭제된 도메인이 EXCLUDED에
  // 남아 있는 것만 잡는다. domain 디렉터리가 지워졌는데 LIVE_COVERED 맵에는 그대로 남아 있으면
  // 위 루프(104-116)는 domains 목록과 무관하게 spec 파일·yml 경로 존재만 확인하므로 조용히 통과할
  // 수 있다 — 이 검사가 그 비대칭을 메운다.
  test('LIVE_COVERED 목록의 모든 도메인이 여전히 src/app/api/admin/*에 실존한다', () => {
    const staleLiveCovered = Object.keys(LIVE_COVERED).filter((d) => !domains.includes(d));
    expect(
      staleLiveCovered,
      `LIVE_COVERED 목록에 있지만 더 이상 존재하지 않는 도메인: [${staleLiveCovered.join(', ')}] — ` +
        '도메인 디렉터리가 삭제됐다면 이 맵에서도 지우고 해당 실구동 스펙 처리 여부를 확인하세요.',
    ).toEqual([]);
  });

  // golden-crud.yml은 스펙을 파일 경로 명시로 실행하므로(--project testMatch 자동 수집이 아님),
  // 스펙 파일을 새로 만들어도 yml에 실행 스텝을 추가하지 않으면 CI에서 영원히 돌지 않는다 —
  // PR #203에서 실제로 발생(codex 리뷰 CRITICAL: admin-crud-insurance-cert.spec.ts가 스텝 없이
  // 죽은 코드가 될 뻔). 도메인 단위 맵(LIVE_COVERED)은 도메인당 대표 스펙 1개만 가리켜 이
  // 실패모드를 못 잡으므로, 파일 단위로 전수 검사한다.
  // member-* 포함(2026-07-23 확장) — 이 감사가 admin-crud-*만 보던 동안 member-inquiry-edit-save·
  // member-password-change·member-social-login-contract 3개가 실행 스텝 없이 잠들어 있었다
  // (golden-crud 프로젝트 testMatch는 member-*도 수집하지만 yml은 파일 경로 명시 실행이라 무관).
  test('tests/golden의 모든 admin-crud-*·member-*.spec.ts가 golden-crud.yml 실행 스텝에 등록돼 있다', () => {
    const crudSpecs = fs
      .readdirSync(GOLDEN_SPEC_DIR)
      .filter((f) => /^(admin-crud|member)-.*\.spec\.ts$/.test(f));
    const unwired = crudSpecs.filter((spec) => !ymlContent.includes(spec));
    expect(
      unwired,
      `golden-crud.yml에 실행 스텝이 없는 스펙: [${unwired.join(', ')}] — ` +
        '해당 도메인 스텝 옆에 이 파일을 실행하는 스텝을 추가하세요(파일 경로 명시 실행이라 자동 수집되지 않습니다).',
    ).toEqual([]);
  });
});
