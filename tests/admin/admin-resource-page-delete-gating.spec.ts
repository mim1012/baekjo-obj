import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

// wave-4 클래스 스윕(2026-07-19) — B2B 제휴 문의 삭제 버그(가짜 삭제: 화면에서만 지워지고 DB엔
// 반영 안 됨)의 근본 원인은 AdminResourcePage.tsx의 `canDeleteRows = onDeleteRow != null ||
// onSave == null` 조건이었다. batch save(onSave)를 안 쓰는 화면(즉시저장 전환 이후 전부)은
// onDeleteRow 없이도 삭제 버튼이 보였다 — 같은 조건을 쓰는 모든 AdminResourcePage 호출부가
// 잠재적으로 같은 버그를 갖고 있었다는 뜻이다. 조건 자체를 `onDeleteRow != null`로 고쳐 클래스를
// 구조적으로 없앴지만(§AdminResourcePage.tsx의 onDeleteRow JSDoc 참고), "그래서 delete 버튼이
// 없어진 화면"이 조용히 늘어나는 것도 막아야 한다 — 이 스펙이 그 게이트다.
//
// 규칙: src/app/admin/**/page.tsx 중 AdminResourcePage를 쓰는 모든 파일을 훑어 onDeleteRow= 유무로
// 분류한다. onDeleteRow가 없는 파일은 반드시 아래 NO_DELETE_ALLOWLIST에 사유와 함께 등록해야
// 한다 — 등록 없이 새로 생기면(또는 등록된 화면이 사라지면) 이 스펙이 실패한다(golden-crud-coverage.
// spec.ts·migration-number-duplicates.spec.ts와 동일한 "소스-계약 + allowlist" 패턴).

const root = path.resolve(__dirname, '..', '..');
const ADMIN_APP_DIR = path.join(root, 'src/app/admin');

/** 삭제 버튼이 의도적으로 없는 화면. 새로 추가하려면 "왜 안전한지"를 반드시 적는다. */
const NO_DELETE_ALLOWLIST: Record<string, string> = {
  'inquiries/page.tsx':
    '상품 Q&A(ProductInquiry)는 공개 답변 이력이 남는 고객 문의라 관리자가 임의 삭제하는 게 ' +
    '도메인상 맞지 않다고 판단(wave-4 스윕 결정). 실제 삭제 경로는 회원 본인 삭제' +
    '(DELETE /api/inquiries/[id], deleteInquiryByOwner) 하나뿐 — /mypage?tab=inquiries에서만 가능.',
};

function findAdminResourcePagesRecursively(dir: string): string[] {
  const results: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...findAdminResourcePagesRecursively(fullPath));
      continue;
    }
    if (entry.name === 'page.tsx') {
      const content = fs.readFileSync(fullPath, 'utf8');
      if (content.includes('AdminResourcePage')) {
        results.push(fullPath);
      }
    }
  }
  return results;
}

test.describe('AdminResourcePage 삭제 버튼 배선 게이트 (wave-4 클래스 스윕)', () => {
  test('onDeleteRow 없는 화면은 전부 NO_DELETE_ALLOWLIST에 사유와 함께 등록돼 있다', () => {
    const pages = findAdminResourcePagesRecursively(ADMIN_APP_DIR);
    expect(pages.length).toBeGreaterThan(0);

    const unregisteredNoDelete: string[] = [];
    for (const pagePath of pages) {
      const relative = path.relative(path.join(root, 'src/app/admin'), pagePath).replace(/\\/g, '/');
      const source = fs.readFileSync(pagePath, 'utf8');
      const hasDeleteRow = /onDeleteRow=/.test(source);
      if (!hasDeleteRow && !NO_DELETE_ALLOWLIST[relative]) {
        unregisteredNoDelete.push(relative);
      }
    }

    expect(
      unregisteredNoDelete,
      `삭제 버튼 배선 없이(onDeleteRow 미지정) NO_DELETE_ALLOWLIST에도 없는 화면 발견 — ` +
        `삭제가 도메인상 안전한지 판단해 onDeleteRow를 배선하거나, 의도적이면 사유와 함께 ` +
        `allowlist에 등록하세요:\n${unregisteredNoDelete.join('\n')}`,
    ).toEqual([]);
  });

  test('NO_DELETE_ALLOWLIST 항목이 실존해야 한다(stale-allowlist 방지)', () => {
    for (const relative of Object.keys(NO_DELETE_ALLOWLIST)) {
      const fullPath = path.join(ADMIN_APP_DIR, relative);
      expect(fs.existsSync(fullPath), `NO_DELETE_ALLOWLIST 등록된 파일이 실제로 없음: ${relative}`).toBe(true);
      const source = fs.readFileSync(fullPath, 'utf8');
      expect(
        source.includes('AdminResourcePage'),
        `NO_DELETE_ALLOWLIST 등록된 ${relative}가 더 이상 AdminResourcePage를 쓰지 않음 — allowlist에서 제거하세요.`,
      ).toBe(true);
      expect(
        /onDeleteRow=/.test(source),
        `NO_DELETE_ALLOWLIST 등록된 ${relative}가 이제 onDeleteRow를 배선함 — allowlist에서 제거하세요.`,
      ).toBe(false);
    }
  });

  test('AdminResourcePage의 canDeleteRows 조건은 onDeleteRow 유무로만 판정한다(폴백 재발 방지)', () => {
    const resourcePageSource = fs.readFileSync(
      path.join(root, 'src/components/admin/AdminResourcePage.tsx'),
      'utf8',
    );
    // 정확히 이 한 줄만 검사한다 — onSave==null은 다른 곳(등록/수정 모달의 안내 카피 분기)에서
    // 여전히 정당하게 쓰이므로 파일 전체에서 그 문자열을 금지하면 안 된다.
    expect(resourcePageSource).toContain('const canDeleteRows = !readOnly && onDeleteRow != null;');
  });
});
