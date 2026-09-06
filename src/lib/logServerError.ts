/**
 * 서버 로그에 외부 에러 객체(특히 Supabase/Postgrest 에러)를 통째로 남기지 않는 안전 로거.
 * Postgrest 에러의 detail/hint 필드에는 제약을 위반한 행의 실제 값(이메일 등 개인정보)이
 * 포함될 수 있으므로, code/message만 추출해서 남긴다.
 */
export const MISSING_SUPABASE_ENV_MESSAGE =
  'SUPABASE_URL / SUPABASE_SECRET_KEY 환경변수가 설정되지 않았습니다.';

export function isMissingSupabaseEnvironmentError(error: unknown): boolean {
  return error instanceof Error && error.message === MISSING_SUPABASE_ENV_MESSAGE;
}

export function logServerError(context: string, error: unknown): void {
  // 로컬 개발에서 DB 환경파일을 아직 받지 못한 상태는 애플리케이션 결함이 아니다.
  // Next 개발 오버레이가 console.error를 런타임 오류처럼 표시하지 않도록 warn으로 남긴다.
  // production/test에서는 기존 error 레벨을 유지해 설정 누락이 조용히 묻히지 않게 한다.
  if (process.env.NODE_ENV === 'development' && isMissingSupabaseEnvironmentError(error)) {
    logServerWarn(context, error);
    return;
  }

  if (error && typeof error === 'object' && 'message' in error) {
    const code = 'code' in error ? (error as { code?: unknown }).code : undefined;
    console.error(context, { code, message: (error as { message?: unknown }).message });
    return;
  }
  console.error(context, { message: String(error) });
}

/**
 * warn 레벨 로거 — 오류가 아니라 "알림성" 상태(예: repo LIST_CAP 도달로 인한 모집단 절삭)를
 * 매 요청 error 레벨로 찍어 알람 피로를 유발하지 않기 위함. logServerError와 동일한 안전 추출
 * 규칙(Postgrest 에러의 detail/hint에 개인정보가 실릴 수 있어 code/message만 추출)을 따른다.
 */
export function logServerWarn(context: string, detail: unknown): void {
  if (detail && typeof detail === 'object' && 'message' in detail) {
    const code = 'code' in detail ? (detail as { code?: unknown }).code : undefined;
    console.warn(context, { code, message: (detail as { message?: unknown }).message });
    return;
  }
  console.warn(context, { message: String(detail) });
}
