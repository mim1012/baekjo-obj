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
  concerns: { spec: 'admin-crud-concerns.spec.ts', pathNeedle: 'src/app/api/admin/concerns/' },
  inquiries: { spec: 'admin-crud-qna-inquiries.spec.ts', pathNeedle: 'src/app/api/admin/inquiries/' },
  'insurance-content': {
    spec: 'admin-crud-insurance-content.spec.ts',
    pathNeedle: 'src/app/api/admin/insurance-content/',
  },
  kits: { spec: 'admin-crud-kits-partners.spec.ts', pathNeedle: 'src/app/api/admin/kits/' },
  members: { spec: 'admin-crud-members.spec.ts', pathNeedle: 'src/app/api/admin/members/' },
  notices: { spec: 'admin-crud-notices.spec.ts', pathNeedle: 'src/app/api/admin/notices/' },
  partners: { spec: 'admin-crud-kits-partners.spec.ts', pathNeedle: 'src/app/api/admin/partners/' },
  products: { spec: 'admin-crud-products.spec.ts', pathNeedle: 'src/app/api/admin/products/' },
  settings: { spec: 'admin-crud-home-settings.spec.ts', pathNeedle: 'src/app/api/admin/settings/' },
  'showcase-reviews': {
    spec: 'admin-crud-showcase-reviews.spec.ts',
    pathNeedle: 'src/app/api/admin/showcase-reviews/',
  },
  survey: { spec: 'admin-crud-survey.spec.ts', pathNeedle: 'src/app/api/admin/survey/' },
};

/** 실구동 스펙이 의도적으로 없는 도메인 — 사유를 반드시 적는다. */
const EXCLUDED: Record<string, string> = {
  'category-settings': '이번 웨이브 범위 밖 — /admin/categories 실구동 스펙 미작성(wave4 후보).',
  dashboard: '조회 전용 통계 집계 — GET만 존재, 쓰기 동작 없음.',
  insurance:
    '보험 신청(상담) 상태 관리 — 골든플로우 #3, 이번 웨이브 범위 밖(wave4 후보). ' +
    'insurance-content(FAQ·동의문서)와는 다른 도메인이니 혼동 주의.',
  'order-policy': '이번 웨이브 범위 밖 — 주문 정책(무통장 자동취소 등) 실구동 스펙 미작성(wave4 후보).',
  orders:
    '결제 상태기계 + 재고 RPC — 공유 스테이징에 안전하게 자동화할 설계가 아직 없어 ' +
    '명시적으로 제외(wave3 지시사항, "안전 설계 전 제외").',
  'partner-inquiries':
    'B2B 제휴 문의 접수 — product inquiries(qna-inquiries 스펙 대상)와 다른 도메인, ' +
    '이번 웨이브 범위 밖(wave4 후보).',
  qna:
    '전시 문의 config — 공개 배선 연결됨(be/qna-public-wire, 2026-07-18): getMergedInquiries' +
    '(src/lib/adapters.ts)가 이제 정적 시드(src/data/qna.ts) 대신 storage 콘센트(getQnaConfig, ' +
    'qna_config DB)를 읽어 /admin/qna 편집이 상품상세 Q&A 탭에 실제로 반영된다. 배선은 됐지만 ' +
    '실구동 스펙은 아직 없다 — wave4 후속.',
  reviews:
    '고아 엔드포인트로 보인다 — PATCH /api/admin/reviews/[id](구매평 노출 토글, setReviewStatus)를 ' +
    '호출하는 관리자 UI를 찾지 못했다(showcase-reviews와는 다른 도메인). 별도 확인 필요.',
  upload:
    '업로드 유틸리티(ImageUploader가 쓰는 공용 엔드포인트) — 그 자체가 CRUD 리소스가 아니며, ' +
    'brands/products 실구동 스펙의 이미지 업로드 스텝에서 이미 간접적으로 실행된다.',
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
});
