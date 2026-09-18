// refund-policy(배송·교환·환불 안내) 페이지의 소스 매퍼 — commerceLegal.ts/company.ts 상수를
// 원본으로, page-texts(site_settings id='page-texts')의 'refundPolicy.*' 관리자 덮어쓰기
// (eyebrow/title/4개 조항 제목)를 적용해 현재 화면과 동일한 콘텐츠를 계산한다(D3/D4, terms.ts/
// privacy.ts와 동일 패턴). 회사 정보는 {{company.*}} 토큰으로 남기고 렌더링 시점에
// substituteCompanyTokensDeep이 치환한다.
//
// B3: siteSettingIds:[]였을 때는 이 매퍼가 page-texts를 전혀 읽지 않아, 활성화("현재 값
// 가져오기") 순간 관리자가 옛 환경설정(공통 페이지 문구) 편집기에서 저장해둔 덮어쓰기가 조용히
// 사라지고 이 파일의 하드코딩 상수로 되돌아갔다. siteSettingIds:['page-texts']로 그 값을 읽어
// 반영해야 활성화가 기존 문구를 보존한다.
//
// 고객센터 블록은 실제 화면에서 <ul> 불릿 목록이 아니라 테두리 있는 안내 상자다. legalPage()
// 스키마의 조항 body(textarea 한 칸)로는 "박스" 스타일과 "실제 <ul><li>" 을 구분해서 재현할 수
// 없어(둘 다 텍스트 블록으로 뭉개짐), article 항목에 noticeLines 필드를 별도로 둔다
// (StaticLegalDocument가 노출 여부에 따라 박스로 렌더링). 고객센터 본문(noticeLines) 자체는
// page-texts에 대응 필드가 없어(공통 문구가 아니라 조항 제목 6개만 관리) 그대로 상수를 쓴다.
//
// 'server-only'를 import하지 않는다 — cms-source-mapper-contract.spec.ts가 이 파일을 그대로
// 로드해 normalize(build(...))를 검증한다.
import {
  COMMERCE_LEGAL_EFFECTIVE_DATE,
  NONCONFORMING_WITHDRAWAL_PERIOD,
  STANDARD_WITHDRAWAL_PERIOD,
} from '@/data/commerceLegal';
import { DEFAULT_COMMERCE_POLICY } from '@/data/company';
import {
  defaultPageTextSettings,
  normalizePageTextSettings,
  type PageTextSettings,
} from '@/data/pageTextContent';
import { normalizeCmsPageContent } from '@/lib/cms/normalize';
import { getCmsPageDefinition } from '@/lib/cms/pageDefinitions';
import type { CmsSourceMapper, CmsSourceRow } from '@/lib/cms/source/registry';

/** terms.ts/privacy.ts와 동일한 이유(주석 참조) — page-texts 자체 기본값과 같으면(=관리자가
 * 손댄 적 없음) currentValue(오늘 화면 상수)를 그대로 쓴다. */
function overridden(settings: PageTextSettings, key: string, currentValue: string): string {
  const stored = settings.values[key];
  if (typeof stored !== 'string' || stored.length === 0) return currentValue;
  const pristineDefault = defaultPageTextSettings.values[key];
  if (pristineDefault !== undefined && stored === pristineDefault) return currentValue;
  return stored;
}

export interface RefundPolicyArticle {
  readonly title: string;
  readonly body: string;
  readonly visible: boolean;
  readonly bulletList?: boolean;
  readonly noticeLines?: readonly string[];
}

export interface RefundPolicyContent extends Record<string, unknown> {
  readonly visible: boolean;
  readonly eyebrow: string;
  readonly title: string;
  readonly effectiveDate: string;
  readonly introduction: string;
  readonly articles: readonly RefundPolicyArticle[];
  readonly footerNote: string;
  readonly companyBoxVisible: boolean;
  readonly companyBoxTitle: string;
}

function bulletBody(lines: readonly string[]): string {
  return lines.map((line) => `- ${line}`).join('\n');
}

export function refundPolicyContent(
  settings: PageTextSettings = defaultPageTextSettings,
): RefundPolicyContent {
  return {
    visible: true,
    eyebrow: overridden(settings, 'refundPolicy.eyebrow', 'Commerce Policy'),
    title: overridden(settings, 'refundPolicy.title', '배송·교환·환불 안내'),
    effectiveDate: COMMERCE_LEGAL_EFFECTIVE_DATE,
    introduction: '',
    articles: [
      {
        title: overridden(settings, 'refundPolicy.shippingTitle', '1. 배송 안내'),
        body: bulletBody([
          '배송지역: 대한민국 전 지역으로 배송합니다. 단, 도서·산간 지역은 배송 기간이 추가로 소요되거나 추가 배송비가 발생할 수 있습니다.',
          `배송비: ${DEFAULT_COMMERCE_POLICY.shippingLabel}. 상품별 배송비가 다른 경우 각 상품 상세 페이지의 안내를 우선합니다.`,
          `출고 일정: ${DEFAULT_COMMERCE_POLICY.deliveryEstimate}`,
          '배송조회: 상품 발송 후 마이페이지 또는 고객센터를 통해 운송장 번호와 배송 진행 상황을 확인할 수 있습니다.',
        ]),
        visible: true,
        bulletList: true,
      },
      {
        title: overridden(settings, 'refundPolicy.returnTitle', '2. 교환·반품 안내'),
        body: bulletBody([
          `청약철회 및 교환·반품 신청기간: ${STANDARD_WITHDRAWAL_PERIOD}`,
          NONCONFORMING_WITHDRAWAL_PERIOD,
          '단순 변심에 따른 교환·반품 배송비는 고객 부담입니다. 상품 불량 또는 오배송의 경우 배송비는 판매자가 부담합니다.',
          '반품 주소는 교환·반품 접수 시 고객센터에서 개별 안내합니다.',
          '상품을 사용했거나 훼손·오염된 경우, 구성품이 누락된 경우 등 관계 법령상 청약철회 제한 사유에 해당하면 교환·반품이 제한될 수 있습니다. 맞춤제작 상품은 사전 고지와 별도 동의 등 관계 법령에서 정한 요건을 갖춘 경우에만 제한됩니다.',
        ]),
        visible: true,
        bulletList: true,
      },
      {
        title: overridden(settings, 'refundPolicy.refundTitle', '3. 환불 안내'),
        body: bulletBody([
          '반품 상품 회수 및 검수 완료 후 결제수단에 따라 환불이 진행됩니다.',
          '신용카드 결제 취소는 카드사 정책에 따라 영업일 기준 3–7일 정도 소요될 수 있습니다.',
          '무통장입금 주문은 환불 계좌 확인 후 영업일 기준 3일 이내 환불 처리합니다.',
          '판매자 또는 회사의 책임이 있는 상품 불량·오배송·계약내용 불일치의 경우 관계 법령과 이용약관에 따라 환불하며, 소비자의 법정 권리를 제한하지 않습니다.',
        ]),
        visible: true,
        bulletList: true,
      },
      {
        title: overridden(settings, 'refundPolicy.supportTitle', '4. 고객센터'),
        body: '',
        visible: true,
        noticeLines: [
          '고객센터: {{company.tel}}',
          '이메일: {{company.email}}',
          '운영시간: {{company.supportHours}}',
        ],
      },
    ],
    footerNote: '',
    companyBoxVisible: false,
    companyBoxTitle: '사업자 정보',
  };
}

export function selectRefundPolicyContent(
  published: RefundPolicyContent | null,
  settings: PageTextSettings = defaultPageTextSettings,
): RefundPolicyContent {
  return published ?? refundPolicyContent(settings);
}

export const refundPolicySourceMapper: CmsSourceMapper = {
  siteSettingIds: ['page-texts'],
  bootstrapReady: true,
  build(sources: Record<string, CmsSourceRow | null>): Record<string, unknown> {
    const definition = getCmsPageDefinition('refund-policy');
    if (!definition) throw new Error('cms-source-mapper-definition-missing:refund-policy');
    const rawPageTexts = sources['page-texts']?.value ?? defaultPageTextSettings;
    return normalizeCmsPageContent(
      definition,
      refundPolicyContent(normalizePageTextSettings(rawPageTexts)),
    );
  },
};
