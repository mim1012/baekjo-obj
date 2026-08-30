/**
 * 화면 노출 기능 플래그 — 단일 진실 공급원.
 * 각 진입점(헤더 GNB·모바일 메뉴·하단 네비·메인 배너·마이페이지 탭·미들웨어 가드)이
 * 이 값을 참조한다. 노출 복귀는 해당 값을 true로 바꿔 배포하면 된다.
 */
export const FEATURES = {
  cardPayment: process.env.NEXT_PUBLIC_CARD_PAYMENT_ENABLED === 'true',
  /**
   * 펫보험 서비스 노출 여부.
   * false: GNB·하단 네비·메인 배너·진단 결과 링크·마이페이지 '보험 분석 내역' 탭 미노출,
   *        /insurance 직접 접근은 미들웨어에서 / 로 리다이렉트.
   */
  insurance: false,
  /**
   * 전문가 칼럼 노출 여부.
   * false: 헤더(데스크톱 드롭다운·모바일 메뉴) 미노출, /experts 직접 접근은 / 로 리다이렉트.
   */
  experts: false,
} as const;
