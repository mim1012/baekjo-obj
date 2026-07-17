/**
 * 택배사(carrier) 관련 단일 진실 소스.
 * `orders.carrier`는 자유 text 컬럼이라 서버(admin API)가 화이트리스트로 좁힌다 —
 * 화이트리스트가 두 곳(서버 검증 + 클라이언트 select)에 흩어지면 드리프트가 난다(§4).
 * 이 파일을 양쪽이 함께 import해 단일화한다.
 */

export const CARRIER_CODES = ['cj', 'hanjin', 'lotte', 'post', 'logen', 'gspostbox'] as const;

export type CarrierCode = (typeof CARRIER_CODES)[number];

export function isCarrierCode(value: string): value is CarrierCode {
  return (CARRIER_CODES as readonly string[]).includes(value);
}

export const CARRIER_LABELS: Record<CarrierCode, string> = {
  cj: 'CJ대한통운',
  hanjin: '한진택배',
  lotte: '롯데택배',
  post: '우체국택배',
  logen: '로젠택배',
  gspostbox: 'GS편의점택배',
};

/**
 * 스마트택배(sweettracker) 벤더 t_code — 2026-07-16 companylist API로 실측 검증.
 * 항상 leading zero가 붙는 문자열이라 숫자로 파싱하지 않는다.
 * 내부 코드(CarrierCode)를 DB의 진실로 두고, 벤더 API 호출 직전에만 이 맵으로 변환한다 —
 * 벤더를 교체해도 저장된 데이터를 마이그레이션하지 않아도 되도록 하기 위함.
 * `@/lib/tracking/sweettracker.ts`가 이 맵으로 CarrierCode→t_code를 변환한다.
 *
 * ⚠️ `Partial<Record<...>>`인 이유: 모든 CarrierCode가 스마트택배 t_code를 갖는 건 아니다.
 * 매핑이 없는 carrier는 여기서 빠지고(예: gspostbox — 아래 참조), 소비부는 `undefined`를
 * 만나면 스마트택배 조회 대신 우아하게 폴백해야 한다. 만약 이 타입이 `Record`(전수)라면
 * 검증 안 된 값을 억지로 채워 넣게 되므로(= 이 파일이 금지하는 "추측값 커밋"), Partial로 둔다.
 *
 * gspostbox(GS편의점택배) 누락 사유 (2026-07-17): companylist API(`GET
 * info.sweettracker.co.kr/api/v1/companylist`)는 t_key가 있어야 응답한다. 이 워크트리·메인
 * 레포 어디에도 SWEETTRACKER/SWEET_TRACKER 키가 없어(.env.local엔 SUPABASE 키만) 키 없이
 * 호출하면 404를 돌려준다. t_code를 API 응답으로 실측할 수 없어, 메모리/블로그 추측 커밋 금지
 * 규칙(이 파일 상단)에 따라 GS편의점택배는 t_code 없이 딥링크만 추가한다. 키가 등록되면
 * companylist에서 GS네트웍스(편의점택배) Code를 실측해 여기에 문자열(leading zero 유지)로 채운다.
 */
export const SWEET_TRACKER_CODES: Partial<Record<CarrierCode, string>> = {
  post: '01',
  cj: '04',
  hanjin: '05',
  logen: '06',
  lotte: '08',
};

/**
 * 각 URL 템플릿은 2026-07-16 실 HTTP 요청으로 검증됨 — 값 변경 금지.
 * lotte는 `linkView`가 아니라 `invoiceView`여야 한다: `linkView`는 파라미터를 무시하고
 * 빈 폼을 렌더한다(무응답 확인).
 *
 * gspostbox(GS편의점택배) 검증 2026-07-17: `GET
 * https://www.cvsnet.co.kr/invoice/tracking.do?invoice_no=<번호>`가
 * 없는 송장(999999999999)에 HTTP 200(9195 bytes) + 조회 페이지("운송장"·"조회결과"·"없습니다"
 * 마커 포함)를 렌더하고, 실 송장(210248544962)엔 HTTP 200(11952 bytes, 결과행 포함)을 렌더함을
 * 실 curl 요청으로 확인. `reservation-inquiry/delivery/index.do`도 200이나 invoice 파라미터
 * 딥링크가 아니라 조회 입력 폼이라 tracking.do를 채택.
 */
function buildRawUrl(carrier: CarrierCode, invoice: string): string {
  const encoded = encodeURIComponent(invoice);
  switch (carrier) {
    case 'cj':
      return `https://trace.cjlogistics.com/next/tracking.html?wblNo=${encoded}`;
    case 'hanjin':
      return `https://www.hanjin.com/kor/CMS/DeliveryMgr/WaybillResult.do?mCode=MN038&schLang=KR&wblnumText2=${encoded}`;
    case 'lotte':
      return `https://www.lotteglogis.com/home/reservation/tracking/invoiceView?InvNo=${encoded}`;
    case 'post':
      return `https://service.epost.go.kr/trace.RetrieveDomRigiTraceList.comm?sid1=${encoded}&displayHeader=N`;
    case 'logen':
      return `https://www.ilogen.com/web/personal/trace/${encoded}`;
    case 'gspostbox':
      return `https://www.cvsnet.co.kr/invoice/tracking.do?invoice_no=${encoded}`;
  }
}

/**
 * 배송조회 딥링크를 만든다. 실패(carrier 미지정/미상, 송장번호 없음, 우체국 자릿수 불일치) 시 null —
 * 호출부는 링크를 렌더하지 않고 송장번호 텍스트만 보여준다.
 */
export function buildTrackingUrl(
  carrier: string | undefined,
  trackingNumber: string | undefined,
): string | null {
  if (!carrier || !isCarrierCode(carrier)) return null;
  if (!trackingNumber) return null;

  // 관리자가 "1234-5678-9012"처럼 구분자를 섞어 입력하는 경우가 있어 숫자만 남긴다.
  const normalized = trackingNumber.replace(/\D/g, '');
  if (normalized.length === 0) return null;

  // 우체국은 등기번호가 정확히 13자리가 아니면 "등기번호 13자리를 입력하여 주십시오" alert 후
  // 빈 폼으로 떨어진다 — 링크가 오히려 혼란을 주므로 이 경우엔 아예 링크를 만들지 않는다.
  if (carrier === 'post' && normalized.length !== 13) return null;

  return buildRawUrl(carrier, normalized);
}
