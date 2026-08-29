import NextAuth from 'next-auth';
import { CredentialsSignin } from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { authConfig } from '@/lib/auth.config';
import { findMemberByEmail, upsertSocialMember } from '@/lib/members/repo';
import { verifyPassword } from '@/lib/members/password';
import { checkAuthRateLimit, resetAuthRateLimit } from '@/lib/security/authRateLimit';

// 타이밍 오라클 방지용 더미 해시 — 실제 회원 비밀번호와 무관한 상수 bcrypt 해시.
// 이메일이 없거나(가입 안 됨) 소셜 전용 계정이라 비밀번호 해시가 없어도 verifyPassword를
// 항상 한 번 실행해, "회원 없음"/"비밀번호 없음"/"비밀번호 오답" 세 분기의 응답 시간을 맞춘다.
const DUMMY_PASSWORD_HASH = '$2b$10$i2b5w49ImCKbBpSb38axye9XEMPOGaJHg.2NXwSG4o9laUb4nNKsW';

/**
 * 자격 증명이 맞음이 확인된 후 상태로만 차단되는 경우 — null 반환(단순 실패) 대신
 * 코드를 담은 CredentialsSignin을 던져 클라이언트가 상황별 안내를 할 수 있게 한다.
 * 이 분기는 비밀번호 검증이 끝난 뒤에 도달하므로 "존재하지 않는 이메일" 열거 수단이 되지 않는다.
 */
class PendingApprovalError extends CredentialsSignin {
  code = 'pending-approval';
}
class MemberRejectedError extends CredentialsSignin {
  code = 'member-rejected';
}
class MemberInactiveError extends CredentialsSignin {
  code = 'member-inactive';
}

/**
 * Node 전용 인증 설정. Supabase/bcrypt를 쓰는 이메일 로그인(Credentials)과 소셜 계정 upsert가
 * 여기 있다 — 미들웨어(edge 런타임)는 이 파일이 아니라 auth.config.ts만 참조한다.
 */
export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    ...authConfig.providers,
    Credentials({
      id: 'credentials',
      name: '이메일',
      credentials: {
        email: { label: '이메일', type: 'email' },
        password: { label: '비밀번호', type: 'password' },
      },
      async authorize(credentials) {
        const email = typeof credentials?.email === 'string' ? credentials.email : '';
        const password = typeof credentials?.password === 'string' ? credentials.password : '';
        if (!email || !password) return null;

        const normalizedEmail = email.trim().toLowerCase();
        if (!checkAuthRateLimit('login', normalizedEmail)) return null;

        const member = await findMemberByEmail(normalizedEmail);
        const isValid = await verifyPassword(password, member?.passwordHash ?? DUMMY_PASSWORD_HASH);
        if (!member || !member.passwordHash || !isValid) return null;
        // bcrypt는 이미 위에서 실행됐으므로 이 분기는 타이밍 오라클과 무관하다.
        // active만 로그인 허용 — pending(승인대기)/rejected(반려)/inactive(휴면)/withdrawn(탈퇴)는
        // 차단하되, 올바른 자격 증명으로 확인된 경우엔 코드를 던져 상황에 맞는 안내를 제공한다
        // (pending에게 "비밀번호가 틀렸다"고 오인시키던 문제 해소).
        if (member.status !== 'active') {
          if (member.status === 'pending') throw new PendingApprovalError();
          if (member.status === 'rejected') throw new MemberRejectedError();
          throw new MemberInactiveError();
        }

        resetAuthRateLimit('login', normalizedEmail);

        // 반환값을 변수에 먼저 담아 반환한다 — 리턴문에서 바로 리터럴을 넘기면
        // next-auth의 User 타입(id/name/email/image)에 없는 role 필드가 excess-property로 막힌다.
        const authorizedUser = {
          id: member.id,
          email: member.email,
          name: member.name,
          role: member.role,
        };
        return authorizedUser;
      },
    }),
  ],
  callbacks: {
    ...authConfig.callbacks,
    /**
     * 소셜(카카오/네이버) 로그인 게이트 — credentials authorize()의 status==='active' 화이트리스트와
     * 동일 기준을 여기서도 적용한다(§10-7 보안장치 3종 중 하나, §CRITICAL-1 — opus 리뷰).
     * 이전에는 이 체크가 없어서 jwt 콜백이 정지·탈퇴 회원에게도 memberId를 세팅해 유효 세션을
     * 재발급했다 — signIn에서 false를 반환하면 next-auth가 세션 생성 자체를 중단한다(jwt 콜백은
     * 아예 호출되지 않음). user.email/name/image는 provider.profile()이 이미 정규화한 표준 필드.
     */
    async signIn({ user, account }) {
      if (account?.provider === 'kakao' || account?.provider === 'naver') {
        const member = await upsertSocialMember({
          provider: account.provider,
          providerId: account.providerAccountId,
          email: typeof user.email === 'string' ? user.email : null,
          name: typeof user.name === 'string' ? user.name : null,
          profileImage: typeof user.image === 'string' ? user.image : null,
        });
        if (member.status !== 'active') return false;
      }
      return true;
    },
    async jwt({ token, account, user }) {
      if (account?.provider === 'kakao' || account?.provider === 'naver') {
        // signIn 콜백이 이미 upsert+active 검증을 통과시켰다 — 여기서 다시 upsert해도 멱등이라
        // 안전하지만(같은 값 재기록), 이미 active로 확인된 행이므로 name/image 갱신 로직도 다시 탄다.
        const member = await upsertSocialMember({
          provider: account.provider,
          providerId: account.providerAccountId,
          email: typeof token.email === 'string' ? token.email : null,
          name: typeof token.name === 'string' ? token.name : null,
          profileImage: typeof token.picture === 'string' ? token.picture : null,
        });
        token.memberId = member.id;
        // 소셜 로그인은 관리자 승격 경로가 아니다 — 항상 'user'로 고정.
        token.role = 'user';
        token.provider = account.provider;
      } else if (user) {
        token.memberId = user.id;
        token.role = (
          user as { role?: 'user' | 'admin' | 'b2b' | 'insurance' | 'partner' }
        ).role;
        token.provider = 'email';
      }
      return token;
    },
  },
});
