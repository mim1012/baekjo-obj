-- 보험 증권 업로드용 비공개 스토리지 버킷. §10-3 은행 창구 패턴 — service-role 서버만 쓰고,
-- 공개 URL 없이 관리자만 signed URL로 열람한다(U16). 경로는 서버가 UUID로 새로 발급해
-- 열거(enumeration)를 막는다(U14).
insert into storage.buckets (id, name, public)
values ('insurance-docs', 'insurance-docs', false)
on conflict (id) do nothing;
