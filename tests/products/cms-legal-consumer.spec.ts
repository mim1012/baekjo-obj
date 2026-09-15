import { expect, test } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { PRIVACY_CONTENT, TERMS_CONTENT } from '@/data/legalContent';
import { defaultPageTextSettings } from '@/data/pageTextContent';
import { substituteCompanyTokensDeep } from '@/lib/cms/companyTokens';
import { normalizeCmsPageContent } from '@/lib/cms/normalize';
import { getCmsPageDefinition } from '@/lib/cms/pageDefinitions';
import { privacyContentFromSettings } from '@/lib/cms/source/privacy';
import { refundPolicyContent } from '@/lib/cms/source/refundPolicy';
import { termsContentFromSettings } from '@/lib/cms/source/terms';

// terms/privacy/refund-policy 3개 법무 페이지의 정의(pageDefinitions.ts)·소스 매퍼
// (source/terms.ts, source/privacy.ts, source/refundPolicy.ts)가 서로 정확히 일치하고, 원본
// 법정 문구(legalContent.ts / refund-policy JSX에서 추출한 조항)를 한 글자도 잃지 않는지
// 검증하는 순수 계약 스펙이다. 브라우저·DB 불필요(products 프로젝트).

test.describe('terms/privacy/refund-policy CMS 정의 ↔ 소스 매퍼 계약', () => {
  test('terms: 매퍼(기본 page-texts) 결과가 정의의 defaultContent와 정규화 후 완전히 같다', () => {
    const definition = getCmsPageDefinition('terms');
    expect(definition).not.toBeNull();
    if (!definition) return;
    const built = termsContentFromSettings(defaultPageTextSettings);
    expect(normalizeCmsPageContent(definition, built)).toEqual(
      normalizeCmsPageContent(definition, definition.defaultContent),
    );
  });

  test('privacy: 매퍼(기본 page-texts) 결과가 정의의 defaultContent와 정규화 후 완전히 같다', () => {
    const definition = getCmsPageDefinition('privacy');
    expect(definition).not.toBeNull();
    if (!definition) return;
    const built = privacyContentFromSettings(defaultPageTextSettings);
    expect(normalizeCmsPageContent(definition, built)).toEqual(
      normalizeCmsPageContent(definition, definition.defaultContent),
    );
  });

  test('refund-policy: 매퍼 결과가 정의의 defaultContent와 정규화 후 완전히 같다', () => {
    const definition = getCmsPageDefinition('refund-policy');
    expect(definition).not.toBeNull();
    if (!definition) return;
    const built = refundPolicyContent();
    expect(normalizeCmsPageContent(definition, built)).toEqual(
      normalizeCmsPageContent(definition, definition.defaultContent),
    );
  });

  test('terms: TERMS_CONTENT의 조항 수·제목·본문 줄이 렌더 콘텐츠에서 모두 손실 없이 발견된다', () => {
    const rendered = substituteCompanyTokensDeep(termsContentFromSettings(defaultPageTextSettings));
    expect(rendered.articles).toHaveLength(TERMS_CONTENT.articles.length);
    TERMS_CONTENT.articles.forEach((source, index) => {
      const target = rendered.articles[index];
      expect(target?.title, `article[${index}].title`).toBe(source.title);
      for (const line of source.body.split('\n').filter((line) => line.length > 0)) {
        expect(target?.body, `article[${index}].body에 "${line}" 없음`).toContain(line);
      }
    });
  });

  test('privacy: PRIVACY_CONTENT의 조항 수(16)·제목·본문 줄이 렌더 콘텐츠에서 모두 손실 없이 발견된다', () => {
    expect(PRIVACY_CONTENT.articles).toHaveLength(16);
    const rendered = substituteCompanyTokensDeep(privacyContentFromSettings(defaultPageTextSettings));
    expect(rendered.articles).toHaveLength(16);
    PRIVACY_CONTENT.articles.forEach((source, index) => {
      const target = rendered.articles[index];
      expect(target?.title, `article[${index}].title`).toBe(source.title);
      for (const line of source.body.split('\n').filter((line) => line.length > 0)) {
        // article 12(개인정보 보호책임자)는 화면이 COMPANY.tel/email을 실시간 참조하므로 원문의
        // 고정 전화번호 문자열이 아니라 토큰 치환 후 값(=현재 COMPANY.tel)과 같아야 한다.
        if (source.title.startsWith('12.') && (line.includes('1544-9883') || line.includes('thebaekjo@naver.com'))) {
          continue;
        }
        expect(target?.body, `article[${index}].body에 "${line}" 없음`).toContain(line);
      }
    });
    // article 12는 토큰 치환 후에도 정확한 연락처를 보여줘야 한다(§0-1 stale phone 회귀 방지).
    const officerArticle = rendered.articles.find((article) => article.title.startsWith('12.'));
    expect(officerArticle?.body).toContain('전화: 1544-9883');
    expect(officerArticle?.body).toContain('전자우편: thebaekjo@naver.com');
  });

  test('refund-policy: 화면(JSX)에서 추출한 4개 조항 문구가 렌더 콘텐츠에서 모두 손실 없이 발견된다', () => {
    // src/app/refund-policy/page.tsx가 CMS 소비로 전환되기 전 렌더하던 원문(.omx/notes/
    // pr2-prep-shop-legal.md Part 2 추출 목록과 동일)을 그대로 옮겨와 고정한다 — 이 페이지는
    // legalContent.ts 같은 단일 상수 객체가 없어(하드코딩 JSX였다) 여기 직접 명시한다.
    const expectedArticles: ReadonlyArray<{ title: string; lines: readonly string[] }> = [
      {
        title: '1. 배송 안내',
        lines: [
          '배송지역: 대한민국 전 지역으로 배송합니다. 단, 도서·산간 지역은 배송 기간이 추가로 소요되거나 추가 배송비가 발생할 수 있습니다.',
          '배송비: 3,000원 (5만원 이상 구매 시 무료배송). 상품별 배송비가 다른 경우 각 상품 상세 페이지의 안내를 우선합니다.',
          '출고 일정: 결제 확인 후 1–2 영업일 이내 출고되며, 도서·산간 지역은 배송이 1–2일 더 소요될 수 있어요.',
          '배송조회: 상품 발송 후 마이페이지 또는 고객센터를 통해 운송장 번호와 배송 진행 상황을 확인할 수 있습니다.',
        ],
      },
      {
        title: '2. 교환·반품 안내',
        lines: [
          '청약철회 및 교환·반품 신청기간: 계약내용에 관한 서면 또는 전자문서를 받은 날부터 7일 이내에 청약철회할 수 있습니다.',
          '상품이 표시·광고와 다르거나 계약내용과 다르게 이행된 경우에는 상품을 공급받은 날부터 3개월 이내 또는 그 사실을 안 날이나 알 수 있었던 날부터 30일 이내에 청약철회할 수 있습니다.',
          '단순 변심에 따른 교환·반품 배송비는 고객 부담입니다. 상품 불량 또는 오배송의 경우 배송비는 판매자가 부담합니다.',
          '반품 주소는 교환·반품 접수 시 고객센터에서 개별 안내합니다.',
          '상품을 사용했거나 훼손·오염된 경우, 구성품이 누락된 경우 등 관계 법령상 청약철회 제한 사유에 해당하면 교환·반품이 제한될 수 있습니다.',
        ],
      },
      {
        title: '3. 환불 안내',
        lines: [
          '반품 상품 회수 및 검수 완료 후 결제수단에 따라 환불이 진행됩니다.',
          '신용카드 결제 취소는 카드사 정책에 따라 영업일 기준 3–7일 정도 소요될 수 있습니다.',
          '무통장입금 주문은 환불 계좌 확인 후 영업일 기준 3일 이내 환불 처리합니다.',
          '판매자 또는 회사의 책임이 있는 상품 불량·오배송·계약내용 불일치의 경우 관계 법령과 이용약관에 따라 환불하며, 소비자의 법정 권리를 제한하지 않습니다.',
        ],
      },
      {
        title: '4. 고객센터',
        lines: ['고객센터: 1544-9883', '이메일: thebaekjo@naver.com', '운영시간: 평일 10:00 – 17:00 (점심 12:00 – 13:00) · 주말/공휴일 휴무'],
      },
    ];

    const rendered = substituteCompanyTokensDeep(refundPolicyContent());
    expect(rendered.articles).toHaveLength(expectedArticles.length);
    expectedArticles.forEach((expected, index) => {
      const target = rendered.articles[index];
      expect(target?.title, `article[${index}].title`).toBe(expected.title);
      const haystack = target?.noticeLines?.join('\n') ?? target?.body ?? '';
      for (const line of expected.lines) {
        expect(haystack, `article[${index}]에 "${line}" 없음`).toContain(line);
      }
    });
    expect(rendered.effectiveDate).toBe('2026년 9월 1일');
    expect(rendered.eyebrow).toBe('Commerce Policy');
  });

  test('긴 반복 본문(90회)과 ①·- 불릿이 섞인 본문이 매퍼·정규화·토큰치환을 거쳐도 한 글자도 안 변한다', () => {
    const repeatedLine = '반복 확인용 문장입니다. 백조오브제 이용약관 조항 본문 손실 없음 검증. ';
    const longBody = Array.from({ length: 90 }, (_, index) => `${index + 1}. ${repeatedLine}`).join('\n');
    const bulletBody = [
      '① 첫 번째 원문자 항목입니다.',
      '② 두 번째 원문자 항목입니다.',
      '· 가운뎃점 불릿 항목입니다.',
      '- 하이픈 불릿 항목입니다.',
      '③ 세 번째 원문자 항목입니다.',
    ].join('\n');

    const settings = {
      ...defaultPageTextSettings,
      values: {
        ...defaultPageTextSettings.values,
        'terms.article2Body': longBody,
        'terms.article3Body': bulletBody,
      },
    };

    const built = termsContentFromSettings(settings);
    expect(built.articles[1]?.body).toBe(longBody);
    expect(built.articles[2]?.body).toBe(bulletBody);

    const definition = getCmsPageDefinition('terms');
    expect(definition).not.toBeNull();
    if (!definition) return;
    const normalized = normalizeCmsPageContent(definition, built);
    const normalizedArticles = normalized.articles as ReadonlyArray<{ body: string }>;
    expect(normalizedArticles[1]?.body).toBe(longBody);
    expect(normalizedArticles[2]?.body).toBe(bulletBody);

    const afterTokens = substituteCompanyTokensDeep(normalized) as { articles: ReadonlyArray<{ body: string }> };
    expect(afterTokens.articles[1]?.body).toBe(longBody);
    expect(afterTokens.articles[2]?.body).toBe(bulletBody);
  });

  test('세 정의 어디에도 stale 전화번호(010-5683-1725) 리터럴이 남아있지 않다', () => {
    const root = path.resolve(__dirname, '..', '..');
    const pageDefinitionsSrc = fs.readFileSync(
      path.join(root, 'src', 'lib', 'cms', 'pageDefinitions.ts'),
      'utf8',
    );
    expect(pageDefinitionsSrc).not.toContain('010-5683-1725');

    for (const key of ['terms', 'privacy', 'refund-policy'] as const) {
      const definition = getCmsPageDefinition(key);
      expect(definition).not.toBeNull();
      if (!definition) continue;
      expect(JSON.stringify(definition.defaultContent)).not.toContain('010-5683-1725');
    }
  });
});
