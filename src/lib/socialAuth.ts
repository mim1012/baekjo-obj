import { getSession, signIn, signOut } from 'next-auth/react';
import { setCurrentUser } from '@/lib/storage';
import type { User } from '@/types';

const SOCIAL_COMPLETE_PATH = '/auth/complete';

/** 로그인 화면의 소셜 버튼 노출 여부. 키가 준비된 환경에서만 1로 켠다. */
export function isSocialLoginEnabled(): boolean {
  return process.env.NEXT_PUBLIC_SOCIAL_LOGIN === '1';
}

/** 소셜 OAuth 시작. 인증 후 브릿지 페이지(/auth/complete)로 리다이렉트된다. */
export async function loginWithProvider(provider: 'kakao' | 'naver'): Promise<void> {
  await signIn(provider, { redirectTo: SOCIAL_COMPLETE_PATH });
}

/**
 * OAuth 완료 후 Auth.js 세션을 기존 User 모델로 매핑한다.
 * 서버의 jwt 콜백이 이미 Supabase upsert(신규 가입/기존 회원 매칭)를 끝낸
 * 상태이므로, 여기서는 /api/members/me 로 최신 회원 정보만 읽어온다.
 */
export async function completeSocialLogin(): Promise<User | null> {
  const session = await getSession();
  if (!session?.user) return null;

  const response = await fetch('/api/members/me');
  if (!response.ok) return null;
  const { user } = (await response.json()) as { user: User };
  setCurrentUser(user);
  return user;
}

/** 소셜(쿠키) 세션 종료. 페이지 리다이렉트 없이 조용히 정리한다. */
export async function logoutSocial(): Promise<void> {
  await signOut({ redirect: false });
}
