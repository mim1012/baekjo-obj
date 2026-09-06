import MypageClient from './MypageClient';

// 회원 전용 문서는 로그아웃 직후 이전 인증 화면을 304로 재사용하면 안 된다.
export const dynamic = 'force-dynamic';

export default function MyPage() {
  return <MypageClient />;
}
