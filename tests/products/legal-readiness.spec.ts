import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(__dirname, '..', '..');
const src = (...parts: string[]) => fs.readFileSync(path.join(root, ...parts), 'utf8');

test.describe('토스페이먼츠 심사 법정 고지 표면', () => {
  test('푸터에 약관, 개인정보, 배송·교환·환불, 사업자정보확인 링크를 노출한다', () => {
    const footer = src('src', 'components', 'common', 'Footer.tsx');
    const company = src('src', 'data', 'company.ts');

    expect(footer).toContain("href: '/terms'");
    expect(footer).toContain("href: '/privacy'");
    expect(footer).toContain("href: '/refund-policy'");
    expect(footer).toContain('사업자정보');
    expect(footer).toContain('COMPANY.businessLookupUrl');
    expect(footer).toContain('전화 {COMPANY.tel}');
    expect(footer).toContain('영업시간 {COMPANY.supportHours}');
    expect(company).toContain("tel: '1544-9883'");
    expect(company).toContain("supportHours: '평일 10:00 ~ 17:00");
    expect(company).toContain('https://www.ftc.go.kr/bizCommPop.do?wrkr_no=5240503658');
  });

  test('checkout에서 주문 전 개인정보 고지와 판매정책 확인을 요구한다', () => {
    const checkout = src('src', 'app', 'checkout', 'page.tsx');

    expect(checkout).toContain("import Link from 'next/link'");
    expect(checkout).toContain('주문 전 확인');
    expect(checkout).toContain('주문·배송·결제 처리를 위해');
    expect(checkout).toContain('href="/refund-policy"');
    expect(checkout).toContain('주문 정보, 결제 금액, 배송·교환·환불 기준 및 개인정보 수집·이용 안내를 확인했습니다');
    expect(checkout).toContain('<input required type="checkbox"');
  });

  test('약관·개인정보·배송환불 페이지가 토스 심사 핵심 문구를 포함한다', () => {
    const legalContent = src('src', 'data', 'legalContent.ts');
    const privacy = legalContent;
    const terms = legalContent;
    const refundPolicy = src('src', 'app', 'refund-policy', 'page.tsx');

    expect(privacy).toContain('토스페이먼츠(주)');
    expect(terms).toContain('청약철회·교환·반품·환급');
    expect(refundPolicy).toContain('배송지역: 대한민국 전 지역');
    expect(refundPolicy).toContain('교환·반품 신청기간');
    expect(refundPolicy).toContain('무통장입금 주문은 환불 계좌 확인 후');
  });

  test('회원가입 필수 동의에 전문 링크와 수집 요약을 표시한다', () => {
    const signup = src('src', 'app', 'signup', 'page.tsx');

    expect(signup).toContain('맞춤 큐레이션 제공을 위해 이름, 이메일, 비밀번호, 연락처');
    expect(signup).toContain('href="/terms"');
    expect(signup).toContain('href="/privacy"');
  });
});
