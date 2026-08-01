import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import {
  createPublicRateLimiter,
  requestClientIpKey,
} from '@/lib/security/publicRateLimit';

const root = path.resolve(__dirname, '..', '..');

function read(...segments: string[]): string {
  return fs.readFileSync(path.join(root, ...segments), 'utf8');
}

test.describe('공개 쓰기 레이트리밋 회귀 계약', () => {
  test('한도를 넘기면 차단하고 창이 지나면 다시 허용한다', () => {
    const limiter = createPublicRateLimiter(60_000, 5);
    const start = 10_000;

    for (let index = 0; index < 5; index += 1) {
      expect(limiter.check('member:qa', start)).toBe(true);
    }
    expect(limiter.check('member:qa', start)).toBe(false);
    expect(limiter.check('member:qa', start + 60_000)).toBe(true);
  });

  test('플랫폼 IP 헤더를 우선하고 forwarded 체인은 폴백으로 사용한다', () => {
    expect(
      requestClientIpKey({
        headers: new Headers({
          'x-real-ip': '203.0.113.10',
          'x-forwarded-for': '198.51.100.20',
        }),
      }),
    ).toBe('ip:203.0.113.10');

    expect(
      requestClientIpKey({
        headers: new Headers({ 'x-forwarded-for': '198.51.100.20, 192.0.2.1' }),
      }),
    ).toBe('ip:198.51.100.20');
  });

  test('공개 쓰기 엔드포인트가 각자의 남용 키를 적용한다', () => {
    const inquiries = read('src', 'app', 'api', 'inquiries', 'route.ts');
    const partnerInquiries = read('src', 'app', 'api', 'partner-inquiries', 'route.ts');
    const reviews = read('src', 'app', 'api', 'reviews', 'route.ts');

    expect(inquiries).toContain("rateLimiter.check(`member:${activeMember.memberId}`)");
    expect(partnerInquiries).toContain('rateLimiter.check(requestClientIpKey(request))');
    expect(reviews).toContain("rateLimiter.check(`member:${memberId}`)");
    for (const source of [inquiries, partnerInquiries, reviews]) {
      expect(source).toContain("return tooManyRequests()");
    }
  });
});
