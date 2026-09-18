import type { OrderActionRequestItemStatus, OrderActionRequestStatus } from './actionRequests';

/**
 * 관리자 패널(OrderActionRequestsPanel) 전용 라벨/배지 — 요청 레벨과 아이템 레벨이 같은 라벨을
 * 쓴다(아이템 배지만 상태별로 색을 구분한다). 컴포넌트 바디가 아니라 모듈 스코프에 둬 렌더마다
 * 재생성되지 않게 하고, React Testing이 없는 이 저장소에서도 렌더 없이 유닛 테스트로 직접 검증할
 * 수 있게 한다(PR4 리뷰 B2/U4 보강 — 이전 spec은 이 값이 소스 텍스트에 "존재하는지"만 grep해서
 * REJECTED 아이템의 status가 조회 경로에서 사라져도 못 잡았다).
 */
export const ADMIN_ACTION_REQUEST_STATUS_LABEL: Record<OrderActionRequestStatus, string> = {
  REQUESTED: '접수', APPROVED: '승인', REJECTED: '반려', COMPLETED: '완료',
};

export const ADMIN_ACTION_REQUEST_ITEM_LABEL: Record<OrderActionRequestItemStatus, string> = ADMIN_ACTION_REQUEST_STATUS_LABEL;

export const ADMIN_ACTION_REQUEST_ITEM_BADGE_STYLE: Record<OrderActionRequestItemStatus, string> = {
  REQUESTED: 'bg-[#F2EEE5] text-[#68716C]',
  APPROVED: 'bg-[#E4ECE6] text-[#2F3B34]',
  REJECTED: 'bg-[#F7E3DF] text-[#A65348]',
  COMPLETED: 'bg-[#2F3B34] text-white',
};

/** 마이페이지(고객) 섹션 전용 아이템 라벨 — 고객에게는 자기 행동 기준 문구("취소반려" 등)로
 *  보여준다. 관리자 라벨과 값 집합은 같지만 문구가 다르므로 별도 맵을 유지한다. */
export const MEMBER_ACTION_REQUEST_ITEM_LABEL: Record<OrderActionRequestItemStatus, string> = {
  REQUESTED: '취소요청', APPROVED: '취소승인', REJECTED: '취소반려', COMPLETED: '취소완료',
};

/**
 * 하나 이상의 액션 요청에 REJECTED 아이템이 있는지 — 마이페이지 "취소 반려" 배지 노출 조건.
 * 아이템 레벨 상태가 진실 소스이므로(요청 레벨 status는 advisory) 아이템 status만 본다.
 */
export function hasRejectedActionRequestItem(
  requests: readonly { items: readonly { status: OrderActionRequestItemStatus }[] }[],
): boolean {
  return requests.some((request) => request.items.some((item) => item.status === 'REJECTED'));
}
