import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(__dirname, '..', '..');
const src = (...parts: string[]) => fs.readFileSync(path.join(root, ...parts), 'utf8');

test.describe('토스페이먼츠 심사 법정 고지 표면', () => {
  test('푸터에 약관, 개인정보, 배송·교환·환불, 사업자정보확인 링크를 노출한다', () => {
    // Footer.tsx는 PR2에서 site-shell CMS 소비로 전환됐다 — 링크·회사정보 리터럴은 이제 이 파일에
    // 하드코딩되지 않고 siteShell prop(게시본이 있으면 그 값, 없으면 이 파일의 기본값)으로 렌더된다.
    // 그래서 "어떤 링크가 뜨는가"의 검증 대상도 site-shell 소스 매퍼(정본)로 옮기고, Footer.tsx는
    // 그 매퍼가 만든 값을 실제로 소비하는지(siteShell prop 타입·필드 접근)만 확인한다.
    const footer = src('src', 'components', 'common', 'Footer.tsx');
    const company = src('src', 'data', 'company.ts');
    const siteShellSource = src('src', 'lib', 'cms', 'source', 'siteShell.ts');

    expect(footer).toContain('siteShell?: SiteShellContent | null');
    expect(footer).toContain('siteShell.navigation.footerLinks');
    expect(footer).toContain('company.businessLookupUrl');
    expect(footer).toContain('사업자정보');

    // B3: 라벨은 이제 page-texts('common.*') 덮어쓰기를 반영하는 overridden() 호출로 계산된다
    // (기본값은 아래 리터럴과 동일 — buildSiteShellContent()/cms-site-shell-consumer.spec.ts가
    // 이 등가성을 계약으로 고정한다). href/visible은 상수 그대로다.
    expect(siteShellSource).toContain("overridden(settings, 'common.footerTerms', '이용약관')");
    expect(siteShellSource).toContain("overridden(settings, 'common.footerPrivacy', '개인정보처리방침')");
    expect(siteShellSource).toContain("overridden(settings, 'common.footerRefund', '배송·교환·환불')");
    expect(siteShellSource).toContain('company: { ...COMPANY }');
    expect(company).toContain('https://www.ftc.go.kr/bizCommPop.do?wrkr_no=5240503658');
  });

  test('checkout에서 주문 전 개인정보 고지와 판매정책 확인을 요구한다', () => {
    const checkout = src('src', 'app', 'checkout', 'page.tsx');

    expect(checkout).toContain("import Link from 'next/link'");
    expect(checkout).toContain('주문 전 확인');
    expect(checkout).toContain('주문·배송·결제 처리를 위해');
    expect(checkout).toContain('href="/refund-policy"');
    expect(checkout).toContain('ORDER_TERMS_CONTENT');
    expect(checkout).toContain('실제 판매자');
    expect(checkout).toContain('<input required type="checkbox" checked={orderTermsAgreed}');
    expect(checkout).toContain('thirdPartyConsentContent(group.seller)');
    expect(checkout).toContain('madeToOrderConsentContent(product)');
  });

  test('약관·개인정보·배송환불 페이지가 토스 심사 핵심 문구를 포함한다', () => {
    // refund-policy는 PR2에서 CMS 소비로 전환됐다 — 하드코딩 JSX가 사라지고 문구 정본이
    // src/lib/cms/source/refundPolicy.ts(소스 매퍼)로 옮겨졌으므로 검증 대상도 그쪽으로 옮긴다.
    const legalContent = src('src', 'data', 'legalContent.ts');
    const privacy = legalContent;
    const terms = legalContent;
    const refundPolicy = src('src', 'lib', 'cms', 'source', 'refundPolicy.ts');

    expect(privacy).toContain('토스페이먼츠(주)');
    expect(terms).toContain('청약철회·교환·반품·환급');
    expect(refundPolicy).toContain('배송지역: 대한민국 전 지역');
    expect(refundPolicy).toContain('교환·반품 신청기간');
    expect(refundPolicy).toContain('무통장입금 주문은 환불 계좌 확인 후');
  });

  test('통신판매중개 안내를 주요 고객 화면에 같은 문구로 노출한다', () => {
    const notice = src('src', 'components', 'common', 'MarketplaceNotice.tsx');
    const noticeCopy = src('src', 'data', 'customerNotices.ts');
    const placements = [
      ['src', 'components', 'common', 'Footer.tsx'],
      ['src', 'components', 'home', 'HomeClient.tsx'],
      ['src', 'components', 'shop', 'ProductDetailClient.tsx'],
      ['src', 'app', 'cart', 'page.tsx'],
      ['src', 'app', 'checkout', 'page.tsx'],
      ['src', 'app', 'order-complete', 'page.tsx'],
      ['src', 'app', 'mypage', 'components', 'OrdersSection.tsx'],
    ];

    expect(notice).toContain('MARKETPLACE_NOTICE');
    expect(notice).toContain('이용약관에서 자세히 보기');
    expect(noticeCopy).toContain('통신판매중개자로서 통신판매의 당사자가 아닙니다');
    expect(noticeCopy).toContain('관계 법령에 따라 백조 오브제가 부담하는 책임은 제외되지 않습니다');
    for (const placement of placements) {
      expect(src(...placement)).toContain('<MarketplaceNotice');
    }
  });

  test('브랜드·BEST·케어가이드 문구를 과장 없이 안내한다', () => {
    // BrandsContent.tsx는 PR2에서 CMS 소비로 전환됐다 — 히어로·기준 카드 문구는 이제 컴포넌트에
    // 하드코딩되지 않고 pageDefinitions.ts의 brands defaultContent(D3: 정의가 화면과 다르면
    // 화면이 정답으로 정정됨)에서 props로 내려온다. 그래서 이 검증도 그 정본으로 옮긴다.
    const brands = src('src', 'components', 'brands', 'BrandsContent.tsx');
    const brandsDefinition = src('src', 'lib', 'cms', 'pageDefinitions.ts');
    const brandsPage = src('src', 'app', 'brands', 'page.tsx');
    const card = src('src', 'components', 'common', 'ProductCard.tsx');
    const concern = src('src', 'app', 'concerns', '[slug]', 'page.tsx');
    const diagnosis = src('src', 'app', 'diagnosis', 'result', 'page.tsx');

    expect(brandsDefinition).toContain('곳의 큐레이션 브랜드');
    expect(brandsDefinition).toContain('공개 자료와 브랜드 제출 자료');
    expect(brandsDefinition).toContain('안전 관련 표시·인증 자료와 사용상 주의사항을 확인합니다');
    expect(brandsDefinition).not.toContain('검증 브랜드 수');
    expect(brandsDefinition).not.toContain('안심하고 선택할 수 있는 안전성을 갖춘 브랜드');
    expect(brands).not.toContain('검증 브랜드 수');
    expect(brands).not.toContain('안심하고 선택할 수 있는 안전성을 갖춘 브랜드');
    expect(brandsPage).toContain("title: '큐레이션 브랜드'");
    expect(card).toContain('자체 큐레이션 · 기준 보기');
    expect(card).toContain('href={brandAuditHref}');
    expect(card).toContain('#brand-audit');
    expect(card).not.toContain('href="/audit"');
    expect(card).toContain('실제 판매자');
    expect(card).toContain('판매 준비 중');
    expect((concern.match(/<CareGuideDisclaimer/g) ?? [])).toHaveLength(2);
    expect(diagnosis).not.toContain('가장 효과적인 라인업입니다');
  });

  test('환불정책 시행일·청약철회 기간과 개인정보 연락처를 통일한다', () => {
    const legalContent = src('src', 'data', 'legalContent.ts');
    const refundPolicy = src('src', 'lib', 'cms', 'source', 'refundPolicy.ts');
    const commerceLegal = src('src', 'data', 'commerceLegal.ts');

    expect(commerceLegal).toContain("COMMERCE_LEGAL_EFFECTIVE_DATE = '2026년 9월 1일'");
    expect(commerceLegal).toContain('서면 또는 전자문서를 받은 날부터 7일 이내');
    expect(commerceLegal).toContain('상품을 공급받은 날부터 3개월 이내 또는 그 사실을 안 날이나 알 수 있었던 날부터 30일 이내');
    expect(refundPolicy).toContain('STANDARD_WITHDRAWAL_PERIOD');
    expect(refundPolicy).toContain('NONCONFORMING_WITHDRAWAL_PERIOD');
    expect(legalContent).toContain('STANDARD_WITHDRAWAL_PERIOD');
    expect(legalContent).toContain('NONCONFORMING_WITHDRAWAL_PERIOD');
    expect(legalContent).toContain('${COMPANY.tel}');
    expect(legalContent).not.toContain('010-5683-1725');
  });

  test('회원가입 필수 동의에 전문 링크와 수집 요약을 표시한다', () => {
    const signup = src('src', 'app', 'signup', 'page.tsx');

    expect(signup).toContain('맞춤 큐레이션 제공을 위해 이름, 이메일, 비밀번호, 연락처');
    expect(signup).toContain('href="/terms"');
    expect(signup).toContain('href="/privacy"');
  });
});
