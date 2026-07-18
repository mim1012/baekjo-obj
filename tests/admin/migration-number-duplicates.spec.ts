import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

// 마이그레이션 번호 중복 검사 — 2026-07-18 0045가 서로 다른 브랜치에서 이중 배정된 채
// 머지 시점에야 사람이 수작업으로 발견했다(§10-8). supabase/migrations/*.sql은 파일명
// 숫자 접두어 순으로만 적용되므로(scripts/apply-migrations.mjs), 같은 번호가 두 파일에
// 배정되면 어느 쪽이 먼저 적용되는지가 파일명 알파벳 순서라는 우연에 좌우된다.
// 이 스펙은 새 중복을 CI에서 즉시 잡는다(소스-계약 스타일, 항상 켜짐, tests/admin 레이어).
//
// 번호 추출 규칙: 파일명 맨 앞 숫자 뒤에 붙는 문자 접미사(0004b의 'b' 등)는 "같은 번호"로
// 취급한다 — 0004와 0004b는 번호 4로 동일 취급되어 중복으로 잡힌다(그래서 이 쌍도 아래
// LEGACY_ALLOWLIST에 명시 등록이 필요하다. 접미사가 있다고 자동 예외 처리하지 않는다).
//
// LEGACY_ALLOWLIST = 이 스펙 도입 시점(2026-07-19)에 이미 main에 존재하던 중복 번호 쌍.
// 등록된 파일 목록과 실제 디렉터리 상태가 정확히 일치할 때만 통과한다 — 같은 번호에 파일이
// 하나 더 늘어나거나 이름이 바뀌면 그것도 새 이상 상태로 실패한다.
const root = path.resolve(__dirname, '..', '..');
const MIGRATIONS_DIR = path.join(root, 'supabase/migrations');

function extractNumber(filename: string): string | null {
  const match = filename.match(/^(\d+)[a-z]?_/);
  return match ? match[1] : null;
}

const LEGACY_ALLOWLIST: Record<string, string[]> = {
  // 0004: 최초 스키마 + 시드 분리 — 문자 접미사(b) 관례의 원조 사례.
  '0004': ['0004_products_brands.sql', '0004b_seed_products_brands.sql'],
  // 0034: 카테고리 이관 SQL과 배송 스키마가 같은 번호로 독립 작성됨(병합 시 미발견, historical).
  '0034': ['0034_move_catcode_products_to_alloming.sql', '0034_shipments.sql'],
  // 0041: concerns config와 배송 확정 타임스탬프가 같은 번호로 독립 작성됨(병합 시 미발견, historical).
  '0041': ['0041_concerns_config.sql', '0041_shipments_confirm_timestamps.sql'],
};

test.describe('마이그레이션 번호 중복 검사', () => {
  test('새 중복 번호가 없어야 한다 (LEGACY_ALLOWLIST 등록분 제외)', () => {
    const files = fs.readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith('.sql'));
    const byNumber = new Map<string, string[]>();

    for (const file of files) {
      const num = extractNumber(file);
      expect(num, `파일명이 숫자로 시작하지 않음: ${file}`).not.toBeNull();
      const list = byNumber.get(num as string) ?? [];
      list.push(file);
      byNumber.set(num as string, list);
    }

    const unexpectedDuplicates: string[] = [];
    for (const [num, list] of byNumber) {
      if (list.length <= 1) continue;
      const sorted = [...list].sort();
      const allowed = LEGACY_ALLOWLIST[num];
      const allowedSorted = allowed ? [...allowed].sort() : null;
      if (!allowedSorted || JSON.stringify(allowedSorted) !== JSON.stringify(sorted)) {
        unexpectedDuplicates.push(`번호 ${num}: ${sorted.join(', ')}`);
      }
    }

    expect(
      unexpectedDuplicates,
      `새 마이그레이션 번호 중복 발견 — 번호를 다시 매겨 충돌을 해소하세요:\n${unexpectedDuplicates.join('\n')}`
    ).toEqual([]);
  });

  test('LEGACY_ALLOWLIST 항목이 실존해야 한다 (stale-allowlist 방지)', () => {
    const files = new Set(fs.readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith('.sql')));

    for (const [num, list] of Object.entries(LEGACY_ALLOWLIST)) {
      for (const file of list) {
        expect(files.has(file), `LEGACY_ALLOWLIST['${num}']에 등록됐지만 실제로 없는 파일: ${file}`).toBe(
          true
        );
      }

      const numbersMatch = list.every((file) => extractNumber(file) === num);
      expect(
        numbersMatch,
        `LEGACY_ALLOWLIST['${num}'] 항목 중 번호 추출 결과가 '${num}'과 불일치하는 파일이 있음`
      ).toBe(true);
    }
  });
});
