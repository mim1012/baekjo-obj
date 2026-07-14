/**
 * 서버 로그에 외부 에러 객체(특히 Supabase/Postgrest 에러)를 통째로 남기지 않는 안전 로거.
 * Postgrest 에러의 detail/hint 필드에는 제약을 위반한 행의 실제 값(이메일 등 개인정보)이
 * 포함될 수 있으므로, code/message만 추출해서 남긴다.
 */
export function logServerError(context: string, error: unknown): void {
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
