// Auth.js v5 타입 확장 — 세션/토큰에 provider(kakao/naver)를 실어 나른다.
// (콘센트 규칙: 공용 데이터 모양은 src/types에만 정의)
import type { DefaultSession } from 'next-auth';

declare module 'next-auth' {
  interface Session {
    /** 소셜 로그인 제공자 식별자 (jwt/session 콜백에서 주입) */
    provider?: string;
    user?: DefaultSession['user'];
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    /** account.provider 를 세션까지 전달하기 위한 저장 필드 */
    provider?: string;
  }
}
