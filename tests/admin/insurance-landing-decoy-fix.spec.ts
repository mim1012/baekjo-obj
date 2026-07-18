import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

// 골든플로우 #3 회귀 방지 — 보험 랜딩(/insurance) 폼이 이름/전화/반려동물 정보 없이
// saveInsuranceApplication을 직접 호출해 고정 mock 값('사용자'·'010-0000-0000' 등)으로
// 유령 신청 레코드를 쌓던 디코이 폼 사고(2026-07-19)의 재발을 막는다. 랜딩은 더 이상
// 자체 접수하지 않고 /insurance/apply(실제 폼)로 프리필해 넘긴다 — 실 저장은 apply
// 페이지 한 곳에서만 일어나야 한다.

const root = path.resolve(__dirname, '..', '..');
const src = (...segments: string[]) => fs.readFileSync(path.join(root, ...segments), 'utf8');

test.describe('보험 랜딩 폼 → 실제 신청서 리다이렉트 (디코이 폼 수정 고정)', () => {
  test('랜딩(/insurance)은 saveInsuranceApplication을 더 이상 직접 호출하지 않는다', () => {
    const landingSource = src('src', 'app', 'insurance', 'page.tsx');
    // 재발 배경 설명은 주석으로 남아 있을 수 있으므로 "호출"(함수 콜 구문)만 정확히 잡는다.
    expect(landingSource).not.toMatch(/saveInsuranceApplication\(/);
    expect(landingSource).not.toMatch(/from '@\/lib\/storage'.*saveInsuranceApplication|saveInsuranceApplication.*from '@\/lib\/storage'/);
    // mock 고정값으로 신원 필드를 채우던 예전 패턴이 되살아나지 않는지도 함께 고정.
    expect(landingSource).not.toMatch(/name:\s*'사용자'/);
    expect(landingSource).not.toMatch(/phone:\s*'010-0000-0000'/);
  });

  test('랜딩의 handleSubmit은 /insurance/apply로 이동한다', () => {
    const landingSource = src('src', 'app', 'insurance', 'page.tsx');
    expect(landingSource).toMatch(/router\.push\(`\/insurance\/apply/);
  });

  test('/insurance/apply는 랜딩에서 넘어온 쿼리(hasCurrentInsurance·currentInsuranceName·message)로 프리필한다', () => {
    const applySource = src('src', 'app', 'insurance', 'apply', 'page.tsx');
    expect(applySource).toContain('useSearchParams');
    expect(applySource).toContain("searchParams.get('hasCurrentInsurance')");
    expect(applySource).toContain("searchParams.get('currentInsuranceName')");
    expect(applySource).toContain("searchParams.get('message')");
  });

  test('/insurance/apply는 useSearchParams를 Suspense 경계 안에서 사용한다(빌드 안전)', () => {
    const applySource = src('src', 'app', 'insurance', 'apply', 'page.tsx');
    expect(applySource).toContain('<Suspense');
    expect(applySource).toContain('<InsuranceApplyForm');
  });

  test('실제 신청 접수(saveInsuranceApplication 호출)는 /insurance/apply 한 곳에만 남아 있다', () => {
    const applySource = src('src', 'app', 'insurance', 'apply', 'page.tsx');
    expect(applySource).toContain('saveInsuranceApplication');
  });

  test('랜딩의 개인정보 보호 안내 바는 실제로 안 하는 저장을 했다고 주장하지 않는다', () => {
    const landingSource = src('src', 'app', 'insurance', 'page.tsx');
    // opus 리뷰 MEDIUM(#166) — 랜딩은 파일을 저장하지 않는데(위쪽 업로드 패널 문구가 이미
    // "실제 첨부·접수는 다음 단계에서"로 정직화됨) 안내 바는 여전히 "암호화되어 저장"이라고
    // 주장해 서로 모순됐다. 그 허위 문구가 되살아나지 않는지 고정한다.
    expect(landingSource).not.toContain('업로드된 증권과 개인정보는 암호화되어 저장되며');
  });
});
