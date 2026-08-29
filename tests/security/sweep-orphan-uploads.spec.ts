import { test, expect } from '@playwright/test';
import { selectOrphanPaths, type SweepCandidate } from '@/lib/members/sweepOrphanUploadsPure';

// 고아 첨부파일 스윕(sweepOrphanUploads)의 순수 판단부만 검증한다 — DB/스토리지 접근은 없음
// (security project). 실제 list()/remove() 배선은 로컬 Supabase Management API 토큰이 만료돼
// 여기서 테스트하지 않는다(작업 지시 §Task 2 — DB를 건드리는 부분은 미검증으로 남긴다).

const DAY_MS = 24 * 60 * 60 * 1000;
const NOW = Date.parse('2026-08-29T12:00:00.000Z');

function candidate(path: string, hoursAgo: number): SweepCandidate {
  return { path, createdAt: new Date(NOW - hoursAgo * 60 * 60 * 1000).toISOString() };
}

test.describe('selectOrphanPaths — 고아 업로드 삭제 대상 판정', () => {
  test('24시간 미만인 업로드는 참조 여부와 무관하게 절대 지우지 않는다', () => {
    const candidates = [candidate('partner/fresh-unreferenced.pdf', 1)];
    expect(selectOrphanPaths(candidates, new Set(), NOW)).toEqual([]);
  });

  test('24시간 이상 지났어도 members.signup_data에 참조된 path는 지우지 않는다', () => {
    const candidates = [candidate('partner/old-referenced.pdf', 48)];
    const referenced = new Set(['partner/old-referenced.pdf']);
    expect(selectOrphanPaths(candidates, referenced, NOW)).toEqual([]);
  });

  test('24시간 이상 지났고 참조되지 않은 path만 고아로 판정한다', () => {
    const candidates = [
      candidate('partner/old-orphan.pdf', 25),
      candidate('partner/old-referenced.pdf', 72),
      candidate('partner/fresh-orphan.pdf', 2),
    ];
    const referenced = new Set(['partner/old-referenced.pdf']);
    expect(selectOrphanPaths(candidates, referenced, NOW)).toEqual(['partner/old-orphan.pdf']);
  });

  test('생성 시각을 파싱할 수 없으면(null/깨진 값) 안전하게 건너뛴다 — "모르면 지우지 않는다"', () => {
    const candidates: SweepCandidate[] = [
      { path: 'partner/no-created-at.pdf', createdAt: null },
      { path: 'partner/garbage-date.pdf', createdAt: 'not-a-date' },
    ];
    expect(selectOrphanPaths(candidates, new Set(), NOW)).toEqual([]);
  });

  test('경계값 — 정확히 24시간이면 지우지 않고, 24시간+1ms부터 대상이 된다', () => {
    const exactlyBoundary: SweepCandidate = {
      path: 'partner/boundary.pdf',
      createdAt: new Date(NOW - DAY_MS).toISOString(),
    };
    const pastBoundary: SweepCandidate = {
      path: 'partner/past-boundary.pdf',
      createdAt: new Date(NOW - DAY_MS - 1).toISOString(),
    };
    expect(selectOrphanPaths([exactlyBoundary], new Set(), NOW)).toEqual(['partner/boundary.pdf']);
    expect(selectOrphanPaths([pastBoundary], new Set(), NOW)).toEqual(['partner/past-boundary.pdf']);
  });
});
