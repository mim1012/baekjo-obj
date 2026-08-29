// Auth.js v5 타입 확장 — 세션/토큰에 provider(kakao/naver)와 회원 식별자(role/memberId)를 실어 나른다.
// (콘센트 규칙: 공용 데이터 모양은 src/types에만 정의)
import type { DefaultSession } from 'next-auth';

declare module 'next-auth' {
  interface Session {
    /** 소셜 로그인 제공자 식별자 (jwt/session 콜백에서 주입) */
    provider?: string;
    user?: DefaultSession['user'] & {
      /** members 테이블의 role — 관리자 화면 접근 가드(미들웨어)에 사용 */
      role?: 'user' | 'admin';
      /** members 테이블 PK. 이메일/소셜 로그인 모두 이 값으로 회원을 조회한다. */
      memberId?: string;
    };
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    /** account.provider 를 세션까지 전달하기 위한 저장 필드 */
    provider?: string;
    /** members 테이블의 role */
    role?: 'user' | 'admin';
    /** members 테이블 PK */
    memberId?: string;
  }
}

// next-auth/jwt는 '@auth/core/jwt'를 `export *`로 재노출할 뿐이라, 콜백 타입이 실제로 참조하는
// 원본 모듈(@auth/core/jwt)에도 같은 필드를 선언해야 declaration merging이 적용된다.
declare module '@auth/core/jwt' {
  interface JWT {
    provider?: string;
    role?: 'user' | 'admin';
    memberId?: string;
  }
}
