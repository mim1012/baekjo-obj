// 메일 링크에 쓸 base URL. request.headers.get('host')/X-Forwarded-Host는 클라이언트가
// 조작할 수 있어(포워딩 프록시 신뢰 설정에 따라 request.nextUrl.origin도 영향을 받음),
// 그 값을 그대로 메일 링크에 넣으면 공격자 도메인 링크가 피해자 메일함에 실리는 계정 탈취
// 벡터가 된다. 프로덕션은 반드시 APP_BASE_URL(고정 환경변수)을 쓰고, 로컬 dev 편의를 위해서만
// request.nextUrl.origin으로 폴백한다.
import 'server-only';
import type { NextRequest } from 'next/server';

export function getBaseUrl(request: NextRequest): string {
  const configured = process.env.APP_BASE_URL;
  if (configured) return configured.replace(/\/+$/, '');
  return request.nextUrl.origin;
}
