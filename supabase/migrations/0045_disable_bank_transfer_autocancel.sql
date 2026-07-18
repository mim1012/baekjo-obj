-- 0045_disable_bank_transfer_autocancel.sql — 무통장입금 자동취소 비활성화
-- (사용자 결정 2026-07-18: 무통장 자동취소 기능 미사용. 카드 10분 TTL·reclaim-stock cron 은 불변)
-- ① 정책 행(order_policy_config, id='default')을 명시적으로 비활성으로 upsert
--    (bankTransferTtlHours 72 는 재활성화 대비 보존값 — 기존 행이 있으면 저장된 ttl 을 유지한다)
-- ② 기존 입금대기 무통장 주문의 만료시각 제거 — 이미 부여된 expires_at 이 남아 있으면
--    배포 직후 크론이 과거 주문을 자동취소해 버린다(백필 없이는 끈 게 아니다)

insert into order_policy_config (id, value, updated_at)
values ('default', '{"bankTransferAutoCancelEnabled": false, "bankTransferTtlHours": 72}'::jsonb, now())
on conflict (id) do update
  set value = order_policy_config.value || '{"bankTransferAutoCancelEnabled": false}'::jsonb,
      updated_at = now();

update orders
   set expires_at = null
 where payment_method = '무통장입금'
   and payment_status = '입금대기'
   and expires_at is not null;
