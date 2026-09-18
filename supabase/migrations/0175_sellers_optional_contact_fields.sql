-- 판매자 필수값을 3개 개념(사업자등록번호, 브랜드&상호명, 대표자)만 남기고 나머지를 선택으로 완화한다.
-- dispatch_estimate·return_policy(0158에서 not null default '')와 shipping_fee(0158에서 not null default 3000)는
-- 이미 부재를 DB 기본값으로 흡수하므로 그대로 둔다. 여기서는 0151에서 NOT NULL이고 기본값이 없던
-- 3개 컬럼만 NOT NULL을 해제한다. 운영 sellers 테이블은 비어 있어 기존 행에 대한 백필이 필요 없다.
--
-- 법무 참고: 통신판매업신고번호(mail_order_registration_number)·사업장주소(business_address)·
-- 전화(phone)는 전자상거래법상 통신판매중개 고지 항목이나, 요청에 따라 선택 입력으로 완화하고
-- 공개 화면에서는 값이 있을 때만 노출한다.
alter table public.sellers
  alter column mail_order_registration_number drop not null,
  alter column business_address drop not null,
  alter column phone drop not null;
