import { getSession, signIn, signOut } from 'next-auth/react';
import { getUsers, registerUser, setCurrentUser } from '@/lib/storage';
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
 * - 이메일이 있으면 그 이메일로 기존 회원을 찾아 현재 사용자로 설정(프로필/제공자 보강).
 * - 없으면 새 회원을 생성해 등록한다.
 */
export async function completeSocialLogin(): Promise<User | null> {
  const session = await getSession();
  if (!session?.user) return null;

  const provider: User['provider'] =
    session.provider === 'kakao' || session.provider === 'naver'
      ? session.provider
      : 'email';
  const profileImage = session.user.image ?? undefined;
  const rawEmail = session.user.email ?? '';

  const existing = rawEmail
    ? getUsers().find((user) => user.email.toLowerCase() === rawEmail.toLowerCase())
    : undefined;

  if (existing) {
    const merged: User = {
      ...existing,
      // 소셜 로그인은 관리자 권한을 부여하지 않는다. mock에 admin 계정 이메일이
      // 존재하므로(예: admin@baekjo.com), 같은 이메일의 소셜 계정으로 로그인해도
      // admin 으로 승격되지 않도록 role 을 'user' 로 강제한다. 관리자는
      // 이메일/비밀번호 경로만 사용한다.
      role: 'user',
      provider,
      ...(profileImage ? { profileImage } : {}),
    };
    setCurrentUser(merged);
    return merged;
  }

  // 카카오는 비즈앱 검수 전까지 이메일을 내려주지 않을 수 있다. 이메일이 비면
  // getUsers()의 이메일 기준 중복제거가 서로 다른 사용자를 하나로 합쳐버리므로,
  // 제공자별 고유 placeholder 이메일을 부여해 중복 병합을 막는다.
  const email = rawEmail || `social-${provider}-${Date.now()}@placeholder.baekjo`;

  const newUser: User = {
    id: `u-${Date.now()}`,
    name: session.user.name || rawEmail.split('@')[0] || '백조회원',
    email,
    phone: '',
    role: 'user',
    status: 'active',
    createdAt: new Date().toISOString(),
    provider,
    ...(profileImage ? { profileImage } : {}),
  };
  registerUser(newUser);
  return newUser;
}

/** 소셜(쿠키) 세션 종료. 페이지 리다이렉트 없이 조용히 정리한다. */
export async function logoutSocial(): Promise<void> {
  await signOut({ redirect: false });
}
