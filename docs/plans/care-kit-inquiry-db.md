# 케어 키트 B2B 제휴 문의 DB화 (1.B)

브랜치: feat/care-kit-inquiry-db (main에서 분기)

## 목표
현재 mailto 링크뿐인 케어키트 랜딩(`src/app/landing/care-kit/page.tsx:91-96`)에
제휴 문의 폼을 추가하고, 제출을 DB에 누적 저장하며, 관리자 화면(/admin/partner-inquiries)에서
접수/처리 상태를 관리한다.

## 아키텍처 결정
싱글턴 config가 아니라 "제출 레코드 누적" 형태이므로, kits/partners가 아닌
**insurance applications 패턴**(storage.ts:59-168)을 템플릿으로 삼는다.
- 공개 POST(게스트 허용), id/createdAt/status는 서버가 결정(mass-assignment 차단)
- 관리자 GET 목록 + PATCH 상태변경
- 기존 admin/partners(제휴처 마스터)와는 별개 테이블 — 혼동 금지

## Ralph 실행 단계 (각 단계 = 1 커밋, 앞 단계 산출물만 의존)

### R1. 타입 + 마이그레이션
- `src/types/index.ts`: `PartnerInquiry` 인터페이스 추가
  { id, companyName, contactPerson, phone, email, partnerType('hospital'|'funeral'|'brand'|'petshop'|'hotel'|'etc'),
    message, status('접수'|'상담중'|'완료'|'보류'), memo?, createdAt }
- `supabase/migrations/0037_partner_inquiries.sql`: 0007_insurance.sql을 템플릿으로
  create table public.partner_inquiries (id uuid pk default gen_random_uuid(), ...컬럼..., created_at timestamptz default now());
  enable row level security;  -- 서버 secret key만 접근, 정책 없음

### R2. repo 계층
- `src/lib/partnerInquiries/repo.ts`: getSupabase()로
  listPartnerInquiries()(admin, created_at desc), createPartnerInquiry(input),
  updatePartnerInquiryStatus(id, status, memo?)
  → insurance repo 시그니처 그대로 모방

### R3. API 라우트
- `src/app/api/partner-inquiries/route.ts`: POST(공개). 서버가 id/createdAt/status='접수' 결정.
  런타임 검증 isPartnerInquiryInput (partners route.ts:19-51의 isPartner 검증 스타일).
- `src/app/api/admin/partner-inquiries/route.ts`: GET. requireAdmin 가드.
- `src/app/api/admin/partner-inquiries/[id]/route.ts`: PATCH(status/memo). requireAdmin.

### R4. storage 콘센트
- `src/lib/storage.ts`에 insurance 블록(59-168) 미러링:
  addPartnerInquiry(input)  // POST, 201 아니면 throw
  getAdminPartnerInquiries()  // 실패 시 []
  updatePartnerInquiryStatus(id, status, memo?)  // 실패 시 throw

### R5. 공개 랜딩 폼
- `src/app/landing/care-kit/page.tsx`의 #partner 섹션(79-101)을 폼으로 교체.
  - mailto 안내문/링크 제거, <form onSubmit> 추가, addPartnerInquiry 호출
  - 제출 성공/실패 토스트. 'use client' 분리 컴포넌트로 폼만 클라이언트화(page는 서버 유지 권장)
  - 주의: partner-binding-flow.spec.ts:148-161이 "폼 없음/mailto 있음"을 강제하므로
    그 테스트를 이 브랜치에서 갱신해야 한다(아래 테스트 계획 참조)

### R6. 관리자 화면
- `src/app/admin/partner-inquiries/page.tsx`: 'use client', AdminResourcePage 사용.
  insurance 관리자 화면과 동일하게 목록+status PATCH(customActions 또는 formFields).
  - 좌측 네비 등록: admin 레이아웃/네비 파일에 항목 추가(admin-nav.spec.ts 참조)

## 테스트 계획
1. 정적 계약 테스트(신규) `tests/admin/partner-inquiry-binding-flow.spec.ts`
   - partner-binding-flow.spec.ts를 복제해 문자열 계약 검증:
     랜딩이 addPartnerInquiry를 콘센트로 호출 / route가 requireAdmin+검증 / repo가 partner_inquiries 접근
2. 기존 테스트 갱신(필수) `tests/admin/partner-binding-flow.spec.ts:148-161`
   - "공개 케어키트 랜딩은 저장되지 않는 제휴 폼 대신 읽기 전용 문의 경로를 제공한다" 테스트가
     이제 반대가 되므로, 폼/onSubmit 존재를 허용하도록 수정. (이 테스트를 안 고치면 CI red)
3. 라우트 검증 테스트 `tests/payments/payment-routes.spec.ts` 스타일로
   - POST 잘못된 body → 400, status 위조 무시, GET admin 비인증 → 401
4. Golden E2E `tests/golden/care-kit.spec.ts` 확장
   - 폼 채우고 제출 → 성공 메시지. (DB 없는 CI면 route mock 또는 db 스펙 태그)
5. 회귀: `npm run build` + 전체 playwright. mailto 제거로 깨지는 스냅샷(visual.spec) 확인.

## 리스크 / 주의
- PII(연락처/이메일) 저장 — RLS on + 서버 secret key 전용, 공개 GET 없음.
- 스팸: 공개 POST라 rate-limit 또는 캡차 고려(후속).
- partner-binding-flow.spec.ts 기존 단언과 정면 충돌 → 반드시 동일 브랜치에서 갱신.

## 병합 주의(두 계획 공통)
- `care-kit-inquiry-db`와 `concerns-db` 두 브랜치 모두 마이그레이션 0037을 쓰므로,
  나중에 병합되는 쪽을 0038로 리넘버.
- 두 브랜치 모두 storage.ts / admin 네비 / partner-binding-flow.spec.ts 인접 영역을 건드려
  머지 충돌 가능 — 순차 병합 권장(어느 쪽 먼저인지 명시).
