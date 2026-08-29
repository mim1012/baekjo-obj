// sweepOrphanUploads.ts의 순수 판단 로직만 분리한 파일.
//
// 이 파일은 절대 '@/lib/supabase/server'(= 'server-only')를 import하지 않는다 — 그걸 import하면
// 이 파일을 불러오는 즉시 "This module cannot be imported from a Client Component module" 가드에
// 걸려, DB 없이 순수 함수만 검증하려는 단위 테스트(tests/security/sweep-orphan-uploads.spec.ts)가
// 아예 로드조차 되지 않는다. DB/스토리지를 실제로 만지는 효과는 sweepOrphanUploads.ts에만 둔다.

const ORPHAN_MIN_AGE_MS = 24 * 60 * 60 * 1000;

export interface SweepCandidate {
  /** 버킷 내 전체 경로 (예: 'partner/<uuid>-file.pdf'). */
  path: string;
  /** Supabase Storage가 보고하는 생성 시각(ISO). 파싱 불가 시 안전하게 스킵한다. */
  createdAt: string | null | undefined;
}

/**
 * 나열된 오브젝트 중 "24시간 이상 지났고, 어떤 members.signup_data.attachedFiles에도
 * 참조되지 않은" 것만 삭제 대상으로 고른다. 순수 함수 — DB/스토리지를 전혀 건드리지 않는다.
 */
export function selectOrphanPaths(
  candidates: readonly SweepCandidate[],
  referencedPaths: ReadonlySet<string>,
  now: number,
): string[] {
  const orphans: string[] = [];
  for (const candidate of candidates) {
    if (referencedPaths.has(candidate.path)) continue;
    const createdAtMs = candidate.createdAt ? Date.parse(candidate.createdAt) : NaN;
    // 생성 시각을 알 수 없으면(파싱 실패) 신선한 업로드일 가능성을 배제할 수 없으므로
    // 삭제하지 않는다 — "모르면 지우지 않는다"가 안전한 기본값이다.
    if (!Number.isFinite(createdAtMs)) continue;
    if (now - createdAtMs < ORPHAN_MIN_AGE_MS) continue;
    orphans.push(candidate.path);
  }
  return orphans;
}

/** signup_data 행들에서 attachedFiles가 참조하는 storage path 전체를 모은다. */
export function collectReferencedPaths(rows: readonly { signup_data: unknown }[]): Set<string> {
  const referenced = new Set<string>();
  for (const row of rows) {
    const signupData = row.signup_data;
    if (!signupData || typeof signupData !== 'object' || Array.isArray(signupData)) continue;
    const attachedFiles = (signupData as Record<string, unknown>).attachedFiles;
    if (!Array.isArray(attachedFiles)) continue;
    for (const entry of attachedFiles) {
      if (typeof entry === 'string') {
        referenced.add(entry);
        continue;
      }
      if (entry && typeof entry === 'object' && !Array.isArray(entry)) {
        const path = (entry as Record<string, unknown>).path;
        if (typeof path === 'string' && path.length > 0) referenced.add(path);
      }
    }
  }
  return referenced;
}
