/**
 * CMS가 관리하는 이미지 필드(브랜드/페이지 편집기에서 관리자가 직접 입력)는 임의의 문자열이
 * 올 수 있다 — 쿼리스트링이 붙은 로컬 경로(`/images/foo.webp?audit=<uuid>`)나 next.config.ts의
 * `images.remotePatterns`(현재 `*.supabase.co/storage/v1/object/public/**`만 허용)에 없는
 * 외부 호스트 URL이 그 예다. next/image는 그런 src를 만나면 렌더링이 아니라 즉시 throw하므로,
 * 공개 페이지 전체가 그 순간 크래시한다(2026-09-15 /audit에서 실제 재현: "is using a query
 * string which is not configured in images.localPatterns").
 *
 * 이 헬퍼는 CMS 이미지 필드를 그대로 <Image src=... /> 에 넘기기 전에 항상 통과시켜, next/image의
 * 최적화 파이프라인이 확실히 안전한 경우(쿼리·해시 없는 순수 로컬 경로)에만 최적화를 켜고
 * 그 외에는 전부 unoptimized로 돌려 throw 경로 자체를 만나지 않게 한다. 절대 throw하지 않는다.
 */
export interface ResolvedCmsImage {
  src: string;
  unoptimized: boolean;
}

export function resolveCmsImageProps(src: unknown): ResolvedCmsImage | null {
  if (typeof src !== 'string') return null;

  const trimmed = src.trim();
  if (trimmed.length === 0) return null;

  // 쿼리·해시가 없는 순수 로컬 경로만 next/image 최적화 파이프라인을 그대로 탄다 — 지금까지
  // 시드 이미지가 전부 이 형태였기 때문에 안전이 실측돼 있다.
  const isPlainLocalPath = trimmed.startsWith('/') && !trimmed.includes('?') && !trimmed.includes('#');
  if (isPlainLocalPath) {
    return { src: trimmed, unoptimized: false };
  }

  // 그 외(쿼리/해시가 붙은 로컬 경로, http(s) 외부 URL, data: URL, 그 밖의 임의 문자열)는
  // next.config.ts의 remotePatterns/로컬 쿼리 설정과 무관하게 unoptimized로 렌더해
  // next/image의 throw 경로를 원천적으로 피한다.
  return { src: trimmed, unoptimized: true };
}
