// signup-docs 버킷의 고아 첨부파일 기회적 정리.
//
// POST /api/members/business/upload는 회원 row가 생기기 전에 파일부터 signup-docs
// private 버킷(partner/<uuid>-<파일명>)에 올린다. 그 뒤 사용자가 가입을 끝내지 않고
// 이탈하거나 실패하면(네트워크 오류, 브라우저 닫기 등) 그 파일은 어떤 members row에서도
// 참조되지 않은 채 영구히 남는다.
//
// Vercel Hobby 플랜의 크론 예산이 이미 빠듯해 이 정리를 위한 새 크론은 만들지 않는다
// (project-memory: vercel-transfer-dksk 참고). 대신 사업자 가입이 하나 성공할 때마다
// after()로 응답 이후에만 기회적으로(best-effort) 스윕을 한 번 시도한다 — 트래픽이 없으면
// 스윕도 없지만, 사업자 가입 자체가 크론이 필요할 만큼 빈번하지 않은 흐름이라 허용 가능한
// 절충이다.
//
// 이 파일의 모든 단계는 실패를 삼키고 로그만 남긴다 — 스윕이 실패하거나 느려져도 가입 응답
// 자체에는 절대 영향을 주면 안 된다(after() 안에서 실행되므로 응답 이후이긴 하지만, throw가
// 새어나가면 서버리스 런타임 경고/재시도를 유발할 수 있다).
//
// 순수 판단 로직(selectOrphanPaths/collectReferencedPaths)은 sweepOrphanUploadsPure.ts에
// 분리돼 있다 — 이 파일이 import하는 '@/lib/supabase/server'는 'server-only'를 로드해,
// 같은 파일에 두면 DB 없이 순수 함수만 검증하려는 단위 테스트가 아예 로드되지 못한다.
import { getSupabase } from '@/lib/supabase/server';
import { logServerError } from '@/lib/logServerError';
import {
  selectOrphanPaths,
  collectReferencedPaths,
  type SweepCandidate,
} from '@/lib/members/sweepOrphanUploadsPure';

export type { SweepCandidate } from '@/lib/members/sweepOrphanUploadsPure';
export { selectOrphanPaths } from '@/lib/members/sweepOrphanUploadsPure';

const BUCKET = 'signup-docs';
// upload route(src/app/api/members/business/upload/route.ts)가 실제로 쓰는 유일한 prefix.
const SWEEP_PREFIX = 'partner/';
// 한 번의 스윕에서 처리할 오브젝트 상한 — 무제한 list()/remove()로 스윕 자체가 무거워지거나
// 응답 지연을 유발하지 않도록 캡을 둔다.
const MAX_OBJECTS_PER_SWEEP = 200;
// 첨부서류를 signup_data에 담아 보내는 세 역할만 조회 대상으로 좁혀 불필요하게 넓은 조회를
// 피한다(일반 소비자 회원은 signup-docs를 참조하지 않는다).
const BUSINESS_ROLES = ['partner', 'b2b', 'insurance'] as const;

/**
 * 사업자 가입 성공 응답 뒤 after()로 기회적으로 호출한다(라우트에서 직접 배선). 이 함수 자체는
 * 절대 throw하지 않는다 — 모든 단계가 실패-시-로그-후-반환이다.
 */
export async function sweepOrphanUploads(): Promise<void> {
  try {
    const supabase = getSupabase();

    const { data: objects, error: listError } = await supabase.storage
      .from(BUCKET)
      .list(SWEEP_PREFIX.replace(/\/$/, ''), {
        limit: MAX_OBJECTS_PER_SWEEP,
        sortBy: { column: 'created_at', order: 'asc' },
      });
    if (listError) {
      logServerError('[sweepOrphanUploads] 오브젝트 목록 조회 실패', listError);
      return;
    }
    if (!objects || objects.length === 0) return;

    const candidates: SweepCandidate[] = objects
      // Supabase Storage list()는 "폴더" 자체도 항목으로 섞어 줄 수 있는데, 실제 파일 오브젝트만
      // id를 갖는다 — 폴더 placeholder를 삭제 대상 계산에 섞지 않는다.
      .filter((object) => typeof object?.name === 'string' && object.id)
      .map((object) => ({
        path: `${SWEEP_PREFIX}${object.name}`,
        createdAt: object.created_at ?? object.updated_at ?? null,
      }));
    if (candidates.length === 0) return;

    const { data: rows, error: queryError } = await supabase
      .from('members')
      .select('signup_data')
      .in('role', BUSINESS_ROLES);
    if (queryError) {
      logServerError('[sweepOrphanUploads] signup_data 조회 실패', queryError);
      return;
    }

    const referenced = collectReferencedPaths((rows ?? []) as { signup_data: unknown }[]);
    const orphanPaths = selectOrphanPaths(candidates, referenced, Date.now());
    if (orphanPaths.length === 0) return;

    const { error: removeError } = await supabase.storage.from(BUCKET).remove(orphanPaths);
    if (removeError) {
      logServerError('[sweepOrphanUploads] 고아 파일 삭제 실패', removeError);
    }
  } catch (error) {
    logServerError('[sweepOrphanUploads] 스윕 실패', error);
  }
}
