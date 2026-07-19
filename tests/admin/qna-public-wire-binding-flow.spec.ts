import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(__dirname, '..', '..');
const src = (...segments: string[]) => fs.readFileSync(path.join(root, ...segments), 'utf8');

/**
 * 커버리지 감사 발견(2026-07-18, 사용자 결정 a안): /admin/qna 는 qna_config 싱글턴에 저장하지만
 * 어떤 공개 화면도 그 값을 읽지 않았다 — src/lib/adapters.ts 의 getMergedInquiries 가 정적
 * @/data/qna 의 seedQna 를 직접 merge 했다. 관리자 편집이 화면에 전혀 반영되지 않는 배선
 * 누락이었다. getMergedReviews(#140 전시후기 전환)와 동일한 패턴으로 getQnaConfig()(storage
 * 콘센트, GET /api/qna 폴백)를 읽도록 고쳤다. 이 스펙은 그 배선을 고정한다.
 */
test.describe('전시 문의(qna) 관리자 저장 → 공개 상품상세 Q&A 탭 바인딩 경로', () => {
  test('adapters.ts 의 getMergedInquiries 는 정적 seedQna 대신 storage 콘센트(getQnaConfig)를 읽는다', () => {
    const adaptersSource = src('src', 'lib', 'adapters.ts');

    expect(adaptersSource).toContain("import { getProductReviewsByProduct, getProductInquiriesByProduct, getShowcaseReviews, getQnaConfig } from './storage';");
    expect(adaptersSource).toContain('const { items: seedQna } = await getQnaConfig();');
    // 정적 파일 직접 import 는 완전히 빠졌다 — 재도입은 eslint no-restricted-imports 가 막는다.
    expect(adaptersSource).not.toMatch(/from ['"]@\/data\/qna['"]/);
    expect(adaptersSource).not.toMatch(/(?:import\s*\(|require\s*\()\s*['"]@\/data\/qna['"]/);
    // 매핑 필드는 그대로 — source: 'seed' 는 이제 "DB config 기반 전시 문의"를 뜻하도록 재해석됐다.
    expect(adaptersSource).toContain("source: 'seed'");
    // isVisible !== false 필터 — getMergedReviews(showcase 후기, 같은 파일 12번째 줄 패턴)를 그대로
    // 미러링. 관리자 /admin/qna 의 노출 체크박스(QnaDetailPanel.tsx)가 저장은 되지만 공개 병합이
    // 값을 무시해 숨김 처리한 문의도 상품상세 Q&A 탭에 계속 보이던 버그(wave-4 발견)의 수정.
    expect(adaptersSource).toContain('.filter((q) => q.productId === productId && q.isVisible !== false)');
  });

  test('공개 병합은 showcase 후기와 동일한 isVisible !== false 컨벤션을 QnA에도 적용한다', () => {
    const adaptersSource = src('src', 'lib', 'adapters.ts');

    // 두 merge 함수가 같은 컨벤션을 쓰는지 나란히 확인 — 한쪽만 고치고 다른 쪽을 깜빡하는 재발 방지.
    expect(adaptersSource).toContain('.filter((r) => r.productId === productId && r.isVisible !== false)');
    expect(adaptersSource).toContain('.filter((q) => q.productId === productId && q.isVisible !== false)');
  });

  test('관리자 목록(QnaListPage)은 isVisible 로 필터링하지 않고 숨김 항목도 그대로 보여준다', () => {
    // 관리자 표는 "숨김 처리" 요약 카드(hiddenCount)와 visibilityFilter==='hidden' 탭으로 숨김
    // 항목을 보여주는 것이 목적이라, 기본 목록(items)에서 isVisible 로 사전 제외하면 안 된다.
    const listSource = src('src', 'components', 'admin-new', 'qna', 'QnaListPage.tsx');

    expect(listSource).toContain('setItems(config.items || []);');
    expect(listSource).toContain("result = result.filter((a) => a.isVisible === false);");
    expect(listSource).toContain('const hiddenCount = items.filter((a) => a.isVisible === false).length;');
  });

  test('storage 콘센트는 공개 GET 폴백을 제공한다', () => {
    const storageSource = src('src', 'lib', 'storage.ts');

    expect(storageSource).toContain('export async function getQnaConfig(): Promise<QnaConfig>');
    expect(storageSource).toContain("fetch('/api/qna')");
    expect(storageSource).toContain('return defaultQnaConfig;');
  });

  test('관리자 API 라우트는 requireAdmin 가드와 QnaConfig 모양 검증을 거친다', () => {
    const routeSource = src('src', 'app', 'api', 'admin', 'qna', 'route.ts');

    expect(routeSource).toContain('await requireAdmin();');
    expect(routeSource).toContain('function isQnaConfig(body: unknown): body is QnaConfig');
  });

  test('공개 API 라우트는 절대 500 을 내지 않고 default 로 폴백한다', () => {
    const routeSource = src('src', 'app', 'api', 'qna', 'route.ts');

    expect(routeSource).toContain('defaultQnaConfig');
    expect(routeSource).toContain('logServerError');
  });

  test('src/data/qna.ts 는 삭제되지 않고 config 기본값 조립 용도로만 남는다', () => {
    // reviews/notices/concerns 와 달리 qna 는 정적 파일 자체를 지우지 않는다 —
    // homeContent.ts/survey.ts 와 같은 "config 기본값 전용" 예외로 남긴다(AGENTS.md §4 원칙 0).
    expect(fs.existsSync(path.join(root, 'src', 'data', 'qna.ts'))).toBe(true);

    const configSource = src('src', 'lib', 'qna', 'config.ts');
    expect(configSource).toContain("import { qnaList } from '@/data/qna';");
    expect(configSource).toContain('export const defaultQnaConfig: QnaConfig = {');

    // adapters.ts 가 마지막 비-config 소비자였다 — 이제 config.ts 만 정적 파일을 import 한다.
    const adaptersSource = src('src', 'lib', 'adapters.ts');
    expect(adaptersSource).not.toMatch(/from ['"]@\/data\/qna['"]/);
  });
});
