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
