import NextAuth from 'next-auth';
import Kakao from 'next-auth/providers/kakao';
import Naver from 'next-auth/providers/naver';

// Auth.js v5 는 AUTH_KAKAO_ID/SECRET, AUTH_NAVER_ID/SECRET, AUTH_SECRET 환경변수를
// 자동으로 읽는다(zero-config). DB 도입 전이므로 세션은 JWT 전략을 사용한다.
export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [Kakao, Naver],
  session: { strategy: 'jwt' },
  // 검증 실패(PKCE 등) 시 Auth.js 기본 영문 에러 페이지 대신 로그인 화면으로 돌려보낸다.
  pages: { error: '/login' },
  callbacks: {
    jwt({ token, account }) {
      // 최초 로그인 시에만 account 가 존재한다 → 제공자를 토큰에 저장.
      if (account) {
        token.provider = account.provider;
      }
      return token;
    },
    session({ session, token }) {
      if (typeof token.provider === 'string') {
        session.provider = token.provider;
      }
      return session;
    },
  },
});
