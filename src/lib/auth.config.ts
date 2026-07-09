import type { NextAuthConfig } from 'next-auth';
import Kakao from 'next-auth/providers/kakao';
import Naver from 'next-auth/providers/naver';

/**
 * Edge(미들웨어)와 Node(auth.ts) 양쪽에서 공유하는 설정.
 * Supabase/bcrypt 등 Node 전용 모듈은 여기 들여오지 않는다 — 미들웨어가 edge 런타임에서 깨진다.
 */
export const authConfig: NextAuthConfig = {
  providers: [Kakao, Naver],
  session: { strategy: 'jwt' },
  // 검증 실패(PKCE 등) 시 Auth.js 기본 영문 에러 페이지 대신 로그인 화면으로 돌려보낸다.
  pages: { error: '/login' },
  callbacks: {
    session({ session, token }) {
      if (typeof token.provider === 'string') {
        session.provider = token.provider;
      }
      if (session.user) {
        session.user.role = token.role;
        session.user.memberId = token.memberId;
      }
      return session;
    },
  },
};
