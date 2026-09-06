-- 배송비·출고·교환반품 조건의 정본을 브랜드가 아니라 실제 판매자에 둔다.
-- 기존 중간 작업 데이터는 임의 정책으로 공개되지 않도록 텍스트 기본값을 비워 둔다.
alter table public.sellers
  add column if not exists shipping_fee int not null default 3000
    check (shipping_fee >= 0),
  add column if not exists free_shipping_threshold int
    check (free_shipping_threshold is null or free_shipping_threshold >= 0),
  add column if not exists dispatch_estimate text not null default '',
  add column if not exists return_policy text not null default '';

comment on column public.sellers.shipping_fee is
  '판매자 주문 묶음당 기본 배송비. 같은 판매자의 여러 상품에는 한 번 적용한다.';
comment on column public.sellers.free_shipping_threshold is
  '판매자 묶음 상품합계가 이 금액 이상이면 무료배송. null이면 자동 무료배송 없음.';
comment on column public.sellers.dispatch_estimate is
  '판매자 기준 출고 예정 안내.';
comment on column public.sellers.return_policy is
  '판매자 기준 교환·반품 신청기간·비용·제한 조건.';
